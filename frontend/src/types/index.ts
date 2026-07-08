export type UserRole = 'ADMIN' | 'USER';

export interface ApiUser {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  telegramVerified?: boolean;
  telegramUsername?: string | null;
  createdAt: string;
}

export interface TelegramSendCodeResponse {
  registrationToken: string;
  codeType: string;
  message: string;
}

export interface TelegramVerifyResponse {
  status: 'verified' | 'needs_2fa';
  hint?: string | null;
  telegramUserId?: string;
  telegramUsername?: string | null;
  firstName?: string | null;
}

export interface AuthResponse {
  user: ApiUser;
  accessToken: string;
  refreshToken: string;
}

export interface Profile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone?: string | null;
  portfolio?: string | null;
  linkedin?: string | null;
  github?: string | null;
  resumeText?: string | null;
  skills: string[];
  preferredRoles: string[];
  preferredLocations: string[];
  expectedSalary?: number | null;
  minMatchScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  id: string;
  userId: string;
  automationPaused: boolean;
  autoApply: boolean;
  matchThreshold: number;
  notifyOnHighScore: boolean;
  notifyOnSent: boolean;
  notifyOnFailed: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ChannelStatus = 'ACTIVE' | 'PAUSED' | 'ERROR';

export interface TelegramChannel {
  id: string;
  channelId: string;
  title: string;
  username?: string | null;
  status: ChannelStatus;
  lastMessageAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type RemoteType = 'REMOTE' | 'ONSITE' | 'HYBRID' | 'UNKNOWN';
export type JobStatus =
  | 'DETECTED'
  | 'MATCHED'
  | 'DRAFTED'
  | 'APPLIED'
  | 'SKIPPED'
  | 'ARCHIVED';
export type MatchRecommendation =
  | 'STRONG_APPLY'
  | 'APPLY'
  | 'CONSIDER'
  | 'SKIP';

export interface JobSkill {
  id: string;
  name: string;
}

export interface JobLocation {
  id: string;
  name: string;
}

export interface JobMatch {
  id: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  reason: string;
  recommendation: MatchRecommendation;
  createdAt: string;
}

export interface Job {
  id: string;
  title: string;
  company?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  experience?: string | null;
  salary?: string | null;
  remoteType: RemoteType;
  deadline?: string | null;
  description: string;
  rawText: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  skills?: JobSkill[];
  locations?: JobLocation[];
  match?: JobMatch | null;
}

export type DraftStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SENT';

export interface ApplicationDraft {
  id: string;
  jobId: string;
  subject: string;
  body: string;
  toEmail: string;
  status: DraftStatus;
  createdAt: string;
  updatedAt: string;
  job?: Job;
}

export type ApplicationStatus =
  | 'QUEUED'
  | 'SENDING'
  | 'SENT'
  | 'FAILED'
  | 'SKIPPED';

export interface Application {
  id: string;
  jobId: string;
  toEmail: string;
  subject: string;
  body: string;
  status: ApplicationStatus;
  attempts: number;
  error?: string | null;
  sentAt?: string | null;
  createdAt: string;
  job?: Job;
}

export type NotificationType =
  | 'APPLICATION_SENT'
  | 'APPLICATION_FAILED'
  | 'HIGH_SCORE_JOB'
  | 'SYSTEM_STOPPED'
  | 'SYSTEM_STARTED';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

export type LogLevel = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
export type LogCategory =
  | 'TELEGRAM'
  | 'AI'
  | 'EMAIL'
  | 'AUTH'
  | 'SYSTEM'
  | 'ERROR';

export interface LogEntry {
  id: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  context?: Record<string, unknown> | null;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
}

export interface PaginatedData<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface DashboardSummary {
  totals: {
    jobs: number;
    matchedJobs: number;
    drafts: number;
    pendingDrafts: number;
    applications: number;
    applicationsSent: number;
    applicationsFailed: number;
    channels: number;
    unreadNotifications: number;
  };
  successRate: number;
  averageMatchScore: number;
}

export interface DashboardOverview {
  summary: DashboardSummary;
  jobsByStatus: Record<string, number>;
  recentApplications: Application[];
  pendingDrafts: ApplicationDraft[];
}

export interface ApplicationsTrendPoint {
  date: string;
  sent: number;
  failed: number;
  total: number;
}

export interface StatisticsResponse {
  summary: DashboardSummary;
  jobsByStatus: Record<string, number>;
  applicationsTrend: ApplicationsTrendPoint[];
}

export interface AutomationStatus {
  automationPaused: boolean;
  autoApply: boolean;
  matchThreshold: number;
  telegramConfigured: boolean;
  geminiConfigured: boolean;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string;
  [key: string]: unknown;
}
