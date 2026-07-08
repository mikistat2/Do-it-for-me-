import { http, telegramHttp } from './client';
import type {
  ApiEnvelope,
  Application,
  ApplicationDraft,
  AppNotification,
  AuthResponse,
  AutomationStatus,
  DashboardOverview,
  Job,
  ListParams,
  LogEntry,
  PaginatedData,
  Profile,
  Settings,
  StatisticsResponse,
  TelegramChannel,
  TelegramSendCodeResponse,
  TelegramVerifyResponse,
} from '@/types';

const unwrap = <T>(envelope: ApiEnvelope<T>): T => envelope.data;

const paginate = <T>(envelope: ApiEnvelope<{ items: T[] }> & ApiEnvelope<T[]>): PaginatedData<T> => {
  const data = envelope.data as unknown;
  const items = Array.isArray(data)
    ? (data as T[])
    : ((data as { items: T[] }).items ?? []);
  return {
    items,
    meta: envelope.meta ?? {
      page: 1,
      pageSize: items.length,
      total: items.length,
      totalPages: 1,
    },
  };
};

export const authApi = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await http.post<ApiEnvelope<AuthResponse>>('/auth/login', {
      email,
      password,
    });
    return unwrap(data);
  },
  async register(
    email: string,
    password: string,
    fullName: string,
    registrationToken: string,
    code: string,
    telegramPassword?: string,
  ): Promise<AuthResponse | TelegramVerifyResponse> {
    const { data } = await telegramHttp.post<
      ApiEnvelope<AuthResponse | TelegramVerifyResponse>
    >('/auth/register', {
      email,
      password,
      fullName,
      registrationToken,
      code,
      telegramPassword,
    });

    const payload = unwrap(data);
    if ((payload as TelegramVerifyResponse).status === 'needs_2fa') {
      return payload as TelegramVerifyResponse;
    }
    return payload as AuthResponse;
  },
  async sendTelegramCode(
    phone: string,
    registrationToken?: string,
  ): Promise<TelegramSendCodeResponse> {
    const { data } = await telegramHttp.post<ApiEnvelope<TelegramSendCodeResponse>>(
      '/auth/telegram/send-code',
      { phone, registrationToken },
    );
    return unwrap(data);
  },
  async verifyTelegramCode(
    registrationToken: string,
    code: string,
    password?: string,
  ): Promise<TelegramVerifyResponse> {
    const { data } = await http.post<ApiEnvelope<TelegramVerifyResponse>>(
      '/auth/telegram/verify',
      { registrationToken, code, password },
    );
    return unwrap(data);
  },
  async verifyTelegram2fa(
    registrationToken: string,
    password: string,
  ): Promise<TelegramVerifyResponse> {
    const { data } = await http.post<ApiEnvelope<TelegramVerifyResponse>>(
      '/auth/telegram/verify-2fa',
      { registrationToken, password },
    );
    return unwrap(data);
  },
  async logout(refreshToken: string): Promise<void> {
    await http.post('/auth/logout', { refreshToken });
  },
};

export const profileApi = {
  async get(): Promise<Profile> {
    const { data } = await http.get<ApiEnvelope<Profile>>('/profile');
    return unwrap(data);
  },
  async update(payload: Partial<Profile>): Promise<Profile> {
    const { data } = await http.put<ApiEnvelope<Profile>>('/profile', payload);
    return unwrap(data);
  },
};

export const settingsApi = {
  async get(): Promise<Settings> {
    const { data } = await http.get<ApiEnvelope<Settings>>('/settings');
    return unwrap(data);
  },
  async update(payload: Partial<Settings>): Promise<Settings> {
    const { data } = await http.put<ApiEnvelope<Settings>>('/settings', payload);
    return unwrap(data);
  },
};

export const automationApi = {
  async status(): Promise<AutomationStatus> {
    const { data } = await http.get<ApiEnvelope<AutomationStatus>>(
      '/automation/status',
    );
    return unwrap(data);
  },
  async pause(): Promise<void> {
    await http.post('/automation/pause');
  },
  async resume(): Promise<void> {
    await http.post('/automation/resume');
  },
};

export const channelApi = {
  async list(): Promise<PaginatedData<TelegramChannel>> {
    const { data } = await http.get<ApiEnvelope<TelegramChannel[]>>('/channels');
    return paginate(data as never);
  },
  async create(payload: Partial<TelegramChannel>): Promise<TelegramChannel> {
    const { data } = await http.post<ApiEnvelope<TelegramChannel>>(
      '/channels',
      payload,
    );
    return unwrap(data);
  },
  async update(
    id: string,
    payload: Partial<TelegramChannel>,
  ): Promise<TelegramChannel> {
    const { data } = await http.put<ApiEnvelope<TelegramChannel>>(
      `/channels/${id}`,
      payload,
    );
    return unwrap(data);
  },
  async remove(id: string): Promise<void> {
    await http.delete(`/channels/${id}`);
  },
  async sync(id: string): Promise<{ processed: number; jobs: number }> {
    const { data } = await http.post<ApiEnvelope<{ processed: number; jobs: number }>>(
      `/channels/${id}/sync`,
    );
    return unwrap(data);
  },
};

export const jobApi = {
  async list(params: ListParams): Promise<PaginatedData<Job>> {
    const { data } = await http.get<ApiEnvelope<Job[]>>('/jobs', { params });
    return paginate(data as never);
  },
  async get(id: string): Promise<Job> {
    const { data } = await http.get<ApiEnvelope<Job>>(`/jobs/${id}`);
    return unwrap(data);
  },
  async archive(id: string): Promise<Job> {
    const { data } = await http.post<ApiEnvelope<Job>>(`/jobs/${id}/archive`);
    return unwrap(data);
  },
};

export const draftApi = {
  async list(params: ListParams): Promise<PaginatedData<ApplicationDraft>> {
    const { data } = await http.get<ApiEnvelope<ApplicationDraft[]>>('/drafts', {
      params,
    });
    return paginate(data as never);
  },
  async get(id: string): Promise<ApplicationDraft> {
    const { data } = await http.get<ApiEnvelope<ApplicationDraft>>(
      `/drafts/${id}`,
    );
    return unwrap(data);
  },
  async update(
    id: string,
    payload: { subject?: string; body?: string; toEmail?: string },
  ): Promise<ApplicationDraft> {
    const { data } = await http.put<ApiEnvelope<ApplicationDraft>>(
      `/drafts/${id}`,
      payload,
    );
    return unwrap(data);
  },
  async approve(id: string): Promise<Application> {
    const { data } = await http.post<ApiEnvelope<Application>>(
      `/drafts/${id}/approve`,
    );
    return unwrap(data);
  },
  async reject(id: string): Promise<ApplicationDraft> {
    const { data } = await http.post<ApiEnvelope<ApplicationDraft>>(
      `/drafts/${id}/reject`,
    );
    return unwrap(data);
  },
  async regenerate(id: string): Promise<ApplicationDraft> {
    const { data } = await http.post<ApiEnvelope<ApplicationDraft>>(
      `/drafts/${id}/regenerate`,
    );
    return unwrap(data);
  },
};

export const applicationApi = {
  async list(params: ListParams): Promise<PaginatedData<Application>> {
    const { data } = await http.get<ApiEnvelope<Application[]>>(
      '/applications',
      { params },
    );
    return paginate(data as never);
  },
  async get(id: string): Promise<Application> {
    const { data } = await http.get<ApiEnvelope<Application>>(
      `/applications/${id}`,
    );
    return unwrap(data);
  },
  async manualSend(jobId: string): Promise<Application> {
    const { data } = await http.post<ApiEnvelope<Application>>(
      '/applications/send',
      { jobId },
    );
    return unwrap(data);
  },
};

export const notificationApi = {
  async list(params: ListParams): Promise<PaginatedData<AppNotification>> {
    const { data } = await http.get<ApiEnvelope<AppNotification[]>>(
      '/notifications',
      { params },
    );
    return paginate(data as never);
  },
  async markRead(id: string): Promise<void> {
    await http.post(`/notifications/${id}/read`);
  },
  async markAllRead(): Promise<void> {
    await http.post('/notifications/read-all');
  },
};

export const logApi = {
  async list(params: ListParams): Promise<PaginatedData<LogEntry>> {
    const { data } = await http.get<ApiEnvelope<LogEntry[]>>('/logs', {
      params,
    });
    return paginate(data as never);
  },
};

export const dashboardApi = {
  async overview(): Promise<DashboardOverview> {
    const { data } = await http.get<ApiEnvelope<DashboardOverview>>(
      '/dashboard/overview',
    );
    return unwrap(data);
  },
  async statistics(): Promise<StatisticsResponse> {
    const { data } = await http.get<ApiEnvelope<StatisticsResponse>>(
      '/dashboard/statistics',
    );
    return unwrap(data);
  },
};
