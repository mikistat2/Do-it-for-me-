import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi } from '@/api';
import { tokenStorage } from '@/api/client';
import type { ApiUser, AuthResponse, TelegramVerifyResponse } from '@/types';

const USER_KEY = 'jobbot.user';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<ApiUser | null>(null);
  const initialized = ref(false);

  const isAuthenticated = computed(() => Boolean(user.value));

  const persistUser = (value: ApiUser | null): void => {
    if (value) {
      localStorage.setItem(USER_KEY, JSON.stringify(value));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  };

  const bootstrap = (): void => {
    if (initialized.value) {
      return;
    }
    const stored = localStorage.getItem(USER_KEY);
    if (stored && tokenStorage.getAccess()) {
      try {
        user.value = JSON.parse(stored) as ApiUser;
      } catch {
        user.value = null;
      }
    }
    initialized.value = true;
  };

  const login = async (email: string, password: string): Promise<void> => {
    const result = await authApi.login(email, password);
    tokenStorage.set(result.accessToken, result.refreshToken);
    user.value = result.user;
    persistUser(result.user);
  };

  const register = async (
    email: string,
    password: string,
    fullName: string,
    registrationToken: string,
    code: string,
    telegramPassword?: string,
  ): Promise<TelegramVerifyResponse | void> => {
    const result = await authApi.register(
      email,
      password,
      fullName,
      registrationToken,
      code,
      telegramPassword,
    );

    if ('status' in result && result.status === 'needs_2fa') {
      return result;
    }

    const auth = result as AuthResponse;
    tokenStorage.set(auth.accessToken, auth.refreshToken);
    user.value = auth.user;
    persistUser(auth.user);
  };

  const logout = async (): Promise<void> => {
    const refreshToken = tokenStorage.getRefresh();
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // Ignore logout API failures; clear local state regardless.
      }
    }
    clearSession();
  };

  const clearSession = (): void => {
    user.value = null;
    persistUser(null);
    tokenStorage.clear();
  };

  return {
    user,
    initialized,
    isAuthenticated,
    bootstrap,
    login,
    register,
    logout,
    clearSession,
  };
});
