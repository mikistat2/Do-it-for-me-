-- ============================================================
-- JobBot initial schema migration
-- ============================================================

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');
CREATE TYPE "ChannelStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ERROR');
CREATE TYPE "JobStatus" AS ENUM ('DETECTED', 'MATCHED', 'DRAFTED', 'APPLIED', 'SKIPPED', 'ARCHIVED');
CREATE TYPE "RemoteType" AS ENUM ('REMOTE', 'ONSITE', 'HYBRID', 'UNKNOWN');
CREATE TYPE "MatchRecommendation" AS ENUM ('STRONG_APPLY', 'APPLY', 'CONSIDER', 'SKIP');
CREATE TYPE "DraftStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SENT');
CREATE TYPE "ApplicationStatus" AS ENUM ('QUEUED', 'SENDING', 'SENT', 'FAILED', 'SKIPPED');
CREATE TYPE "NotificationType" AS ENUM ('APPLICATION_SENT', 'APPLICATION_FAILED', 'HIGH_SCORE_JOB', 'SYSTEM_STOPPED', 'SYSTEM_STARTED');
CREATE TYPE "LogLevel" AS ENUM ('TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL');
CREATE TYPE "LogCategory" AS ENUM ('TELEGRAM', 'AI', 'EMAIL', 'AUTH', 'SYSTEM', 'ERROR');

-- CreateTable users
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_email_idx" ON "users"("email");
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateTable refresh_tokens
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateTable profiles
CREATE TABLE "profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "portfolio" TEXT,
    "linkedin" TEXT,
    "github" TEXT,
    "resume_text" TEXT,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferred_roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferred_locations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "expected_salary" INTEGER,
    "min_match_score" INTEGER NOT NULL DEFAULT 70,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"("user_id");
CREATE INDEX "profiles_user_id_idx" ON "profiles"("user_id");

-- CreateTable telegram_channels
CREATE TABLE "telegram_channels" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "channel_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "username" TEXT,
    "status" "ChannelStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_message_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "telegram_channels_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "telegram_channels_user_id_channel_id_key" ON "telegram_channels"("user_id", "channel_id");
CREATE INDEX "telegram_channels_user_id_idx" ON "telegram_channels"("user_id");
CREATE INDEX "telegram_channels_status_idx" ON "telegram_channels"("status");

-- CreateTable telegram_messages
CREATE TABLE "telegram_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "channel_id" UUID NOT NULL,
    "telegram_msg_id" TEXT NOT NULL,
    "raw_text" TEXT NOT NULL,
    "sender_id" TEXT,
    "is_job_post" BOOLEAN NOT NULL DEFAULT false,
    "message_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "telegram_messages_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "telegram_messages_channel_id_telegram_msg_id_key" ON "telegram_messages"("channel_id", "telegram_msg_id");
CREATE INDEX "telegram_messages_channel_id_idx" ON "telegram_messages"("channel_id");
CREATE INDEX "telegram_messages_is_job_post_idx" ON "telegram_messages"("is_job_post");
CREATE INDEX "telegram_messages_message_date_idx" ON "telegram_messages"("message_date");

-- CreateTable jobs
CREATE TABLE "jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "message_id" UUID,
    "title" TEXT NOT NULL,
    "company" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "experience" TEXT,
    "salary" TEXT,
    "remote_type" "RemoteType" NOT NULL DEFAULT 'UNKNOWN',
    "deadline" TIMESTAMP(3),
    "description" TEXT NOT NULL,
    "raw_text" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'DETECTED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "jobs_message_id_key" ON "jobs"("message_id");
CREATE UNIQUE INDEX "jobs_user_id_content_hash_key" ON "jobs"("user_id", "content_hash");
CREATE INDEX "jobs_user_id_idx" ON "jobs"("user_id");
CREATE INDEX "jobs_status_idx" ON "jobs"("status");
CREATE INDEX "jobs_company_idx" ON "jobs"("company");
CREATE INDEX "jobs_created_at_idx" ON "jobs"("created_at");

-- CreateTable job_skills
CREATE TABLE "job_skills" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "job_skills_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "job_skills_job_id_name_key" ON "job_skills"("job_id", "name");
CREATE INDEX "job_skills_job_id_idx" ON "job_skills"("job_id");
CREATE INDEX "job_skills_name_idx" ON "job_skills"("name");

-- CreateTable job_locations
CREATE TABLE "job_locations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "job_locations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "job_locations_job_id_name_key" ON "job_locations"("job_id", "name");
CREATE INDEX "job_locations_job_id_idx" ON "job_locations"("job_id");
CREATE INDEX "job_locations_name_idx" ON "job_locations"("name");

-- CreateTable job_matches
CREATE TABLE "job_matches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "strengths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "weaknesses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reason" TEXT NOT NULL,
    "recommendation" "MatchRecommendation" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "job_matches_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "job_matches_job_id_key" ON "job_matches"("job_id");
CREATE INDEX "job_matches_user_id_idx" ON "job_matches"("user_id");
CREATE INDEX "job_matches_score_idx" ON "job_matches"("score");
CREATE INDEX "job_matches_recommendation_idx" ON "job_matches"("recommendation");

-- CreateTable application_drafts
CREATE TABLE "application_drafts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "to_email" TEXT NOT NULL,
    "status" "DraftStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "application_drafts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "application_drafts_job_id_idx" ON "application_drafts"("job_id");
CREATE INDEX "application_drafts_user_id_idx" ON "application_drafts"("user_id");
CREATE INDEX "application_drafts_status_idx" ON "application_drafts"("status");

-- CreateTable applications
CREATE TABLE "applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "draft_id" UUID,
    "to_email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "message_id" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "applications_draft_id_key" ON "applications"("draft_id");
CREATE UNIQUE INDEX "applications_user_id_job_id_key" ON "applications"("user_id", "job_id");
CREATE INDEX "applications_user_id_idx" ON "applications"("user_id");
CREATE INDEX "applications_job_id_idx" ON "applications"("job_id");
CREATE INDEX "applications_status_idx" ON "applications"("status");
CREATE INDEX "applications_sent_at_idx" ON "applications"("sent_at");

-- CreateTable notifications
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");
CREATE INDEX "notifications_type_idx" ON "notifications"("type");
CREATE INDEX "notifications_is_read_idx" ON "notifications"("is_read");
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateTable settings
CREATE TABLE "settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "automation_paused" BOOLEAN NOT NULL DEFAULT true,
    "auto_apply" BOOLEAN NOT NULL DEFAULT false,
    "match_threshold" INTEGER NOT NULL DEFAULT 70,
    "notify_on_high_score" BOOLEAN NOT NULL DEFAULT true,
    "notify_on_sent" BOOLEAN NOT NULL DEFAULT true,
    "notify_on_failed" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "settings_user_id_key" ON "settings"("user_id");
CREATE INDEX "settings_user_id_idx" ON "settings"("user_id");

-- CreateTable logs
CREATE TABLE "logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "level" "LogLevel" NOT NULL,
    "category" "LogCategory" NOT NULL,
    "message" TEXT NOT NULL,
    "context" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "logs_level_idx" ON "logs"("level");
CREATE INDEX "logs_category_idx" ON "logs"("category");
CREATE INDEX "logs_created_at_idx" ON "logs"("created_at");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "telegram_channels" ADD CONSTRAINT "telegram_channels_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "telegram_messages" ADD CONSTRAINT "telegram_messages_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "telegram_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "telegram_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "job_skills" ADD CONSTRAINT "job_skills_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_locations" ADD CONSTRAINT "job_locations_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_matches" ADD CONSTRAINT "job_matches_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_matches" ADD CONSTRAINT "job_matches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "application_drafts" ADD CONSTRAINT "application_drafts_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "application_drafts" ADD CONSTRAINT "application_drafts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "applications" ADD CONSTRAINT "applications_draft_id_fkey" FOREIGN KEY ("draft_id") REFERENCES "application_drafts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "settings" ADD CONSTRAINT "settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
