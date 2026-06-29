import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';
import type { ApiEnvelope, AuthResponse } from '@/types';

const ACCESS_TOKEN_KEY = 'jobbot.accessToken';
const REFRESH_TOKEN_KEY = 'jobbot.refreshToken';

export const tokenStorage = {
  getAccess: (): string | null => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefresh: (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY),
  set: (accessToken: string, refreshToken: string): void => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
  clear: (): void => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const http: AxiosInstance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (handler: () => void): void => {
  onUnauthorized = handler;
};

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.getAccess();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const flushQueue = (error: unknown, token: string | null): void => {
  pendingQueue.forEach((promise) => {
    if (token) {
      promise.resolve(token);
    } else {
      promise.reject(error);
    }
  });
  pendingQueue = [];
};

const refreshTokens = async (): Promise<string> => {
  const refreshToken = tokenStorage.getRefresh();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }
  const response = await axios.post<ApiEnvelope<AuthResponse>>(
    `${baseURL}/auth/refresh`,
    { refreshToken },
  );
  const { accessToken, refreshToken: newRefresh } = response.data.data;
  tokenStorage.set(accessToken, newRefresh);
  return accessToken;
};

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & {
      _retry?: boolean;
    }) | undefined;

    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !original.url?.includes('/auth/')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({
            resolve: (token: string) => {
              if (original.headers) {
                original.headers.Authorization = `Bearer ${token}`;
              }
              resolve(http(original));
            },
            reject,
          });
        });
      }

      original._retry = true;
      isRefreshing = true;
      try {
        const newToken = await refreshTokens();
        flushQueue(null, newToken);
        if (original.headers) {
          original.headers.Authorization = `Bearer ${newToken}`;
        }
        return http(original);
      } catch (refreshError) {
        flushQueue(refreshError, null);
        tokenStorage.clear();
        onUnauthorized?.();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export const extractError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as
      | { error?: ApiError }
      | undefined;
    if (body?.error) {
      return body.error;
    }
    return { code: 'NETWORK_ERROR', message: error.message };
  }
  if (error instanceof Error) {
    return { code: 'UNKNOWN', message: error.message };
  }
  return { code: 'UNKNOWN', message: 'An unexpected error occurred' };
};
