# JobBot 🤖

**JobBot** is an intelligent Telegram job-monitoring and automatic job-application assistant. It watches Telegram channels in real time, detects job posts, extracts structured information, matches each job against your profile with the **Gemini API**, generates personalized application emails, optionally sends them automatically, and exposes a modern Vue dashboard for monitoring and configuration.

---

## Table of contents

1. [Architecture](#architecture)
2. [Tech stack](#tech-stack)
3. [Folder structure](#folder-structure)
4. [Prerequisites](#prerequisites)
5. [Environment variables](#environment-variables)
6. [Installation (local)](#installation-local)
7. [Database migration & seed](#database-migration--seed)
8. [Running locally](#running-locally)
9. [Running with Docker](#running-with-docker)
10. [Telegram login](#telegram-login)
11. [Deployment](#deployment)
12. [API documentation](#api-documentation)
13. [License](#license)

---

## Architecture

JobBot uses a clean, layered architecture. Business logic never lives in controllers — controllers only orchestrate request/response, services hold business logic, and repositories own all database access.

```
Telegram channel → Telegram monitor (GramJS)
        → Job detector (regex / rules / keywords)
        → AI matching (Gemini)
        → Email generation (Gemini)
        → Application engine (decision rules)
        → Email sender (Nodemailer, retries)
        → Notifications + structured logs
        → REST API → Vue 3 dashboard
```

---

## Tech stack

**Backend:** Node.js, TypeScript, Express.js, Prisma ORM, PostgreSQL, GramJS, Gemini API, Nodemailer, JWT, bcrypt, Zod, Pino, dotenv.

**Frontend:** Vue 3, Vite, TypeScript, Pinia, Vue Router, Axios, Tailwind CSS, VueUse, Chart.js.

**Deployment:** Docker, Docker Compose, PM2, Nginx.

---

## Folder structure

```
jobbot/
├─ docker-compose.yml          # Postgres + backend + frontend
├─ .env.example                # Compose-level environment template
├─ README.md
├─ backend/
│  ├─ Dockerfile
│  ├─ ecosystem.config.cjs     # PM2 process definition
│  ├─ package.json
│  ├─ tsconfig.json
│  ├─ .env.example
│  ├─ prisma/
│  │  ├─ schema.prisma
│  │  ├─ seed.ts
│  │  └─ migrations/
│  └─ src/
│     ├─ config/               # env parsing + typed config
│     ├─ controllers/          # HTTP orchestration only
│     ├─ services/             # business logic
│     ├─ repositories/         # database access
│     ├─ middleware/           # auth, validation, rate limit, errors, sanitize
│     ├─ routes/               # REST route definitions
│     ├─ validators/           # Zod schemas
│     ├─ types/                # shared TypeScript interfaces
│     ├─ utils/                # logger, errors, jwt, password, retry, http, pagination
│     ├─ database/             # Prisma client lifecycle
│     ├─ telegram/             # GramJS client, monitor, session, login
│     ├─ ai/                   # Gemini client, matching, email generation
│     ├─ email/                # Nodemailer transport + email service
│     ├─ jobs/                 # job detector, decision rules, engine, scheduler
│     ├─ dashboard/            # statistics aggregation
│     ├─ app.ts                # Express app wiring
│     └─ server.ts             # bootstrap + graceful shutdown
└─ frontend/
   ├─ Dockerfile
   ├─ nginx.conf
   ├─ package.json
   ├─ vite.config.ts
   ├─ tailwind.config.js
   └─ src/
      ├─ api/                  # Axios client + endpoint modules
      ├─ components/           # reusable UI (cards, charts, table, modal…)
      ├─ composables/          # useTheme (dark mode), useToast
      ├─ layouts/              # AppLayout (sidebar + topbar)
      ├─ pages/                # Login, Dashboard, Jobs, Applications, Drafts, Profile, Settings, Notifications, Logs, Statistics
      ├─ router/               # routes + auth guards
      ├─ stores/               # Pinia stores
      ├─ types/                # shared interfaces
      └─ utils/                # formatting helpers
```

---

## Prerequisites

- **Node.js** ≥ 20
- **PostgreSQL** ≥ 14 (or use the Docker Compose stack)
- A **Telegram API ID & hash** from <https://my.telegram.org>
- A **Gemini API key** from <https://aistudio.google.com/app/apikey>
- SMTP credentials for outbound email

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Description | Default |
| --- | --- | --- |
| `NODE_ENV` | `development` / `production` | `development` |
| `PORT` | API port | `4000` |
| `API_PREFIX` | REST prefix | `/api/v1` |
| `DATABASE_URL` | PostgreSQL connection string | — |
| `JWT_ACCESS_SECRET` | Access-token signing secret | — |
| `JWT_REFRESH_SECRET` | Refresh-token signing secret | — |
| `JWT_ACCESS_EXPIRES_IN` | Access-token TTL | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh-token TTL | `7d` |
| `BCRYPT_SALT_ROUNDS` | bcrypt cost | `12` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:5173` |
| `RATE_LIMIT_WINDOW_MS` | Rate-limit window | `900000` |
| `RATE_LIMIT_MAX` | Max requests / window | `300` |
| `TELEGRAM_API_ID` | Telegram API ID | — |
| `TELEGRAM_API_HASH` | Telegram API hash | — |
| `TELEGRAM_SESSION` | Saved GramJS string session | — |
| `TELEGRAM_SESSION_PATH` | File path for session persistence | `storage/telegram.session` |
| `TELEGRAM_PHONE` | Phone for interactive login | — |
| `GEMINI_API_KEY` | Gemini API key | — |
| `GEMINI_MODEL` | Gemini model | `gemini-1.5-flash` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | SMTP transport | — |
| `SMTP_USER` / `SMTP_PASSWORD` | SMTP credentials | — |
| `EMAIL_FROM_NAME` / `EMAIL_FROM_ADDRESS` | Sender identity | — |

Copy `backend/.env.example` to `backend/.env` and fill in the values.

### Frontend (`frontend/.env`)

| Variable | Description | Default |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Base URL of the backend API | `http://localhost:4000/api/v1` |

---

## Installation (local)

```bash
# Backend
cd backend
cp .env.example .env       # then edit values
npm install
npx prisma generate

# Frontend
cd ../frontend
cp .env.example .env       # then edit values
npm install
```

---

## Database migration & seed

```bash
cd backend
# Apply migrations to your database
npx prisma migrate deploy
# (development) create/iterate a migration
npx prisma migrate dev --name init
# Seed an initial admin user, profile and settings
npm run seed
```

The seed creates an admin account from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (defaults: `admin@jobbot.local` / `ChangeMe123!`). **Change these in production.**

---

## Running locally

```bash
# Terminal 1 – backend (hot reload)
cd backend && npm run dev

# Terminal 2 – frontend (Vite dev server on http://localhost:5173)
cd frontend && npm run dev
```

Production build:

```bash
cd backend && npm run build && npm start
cd frontend && npm run build && npm run preview
```

---

## Running with Docker

```bash
cp .env.example .env       # fill in secrets at the repo root
docker compose up --build
```

- Frontend → <http://localhost:8080>
- Backend API → <http://localhost:4000/api/v1>
- PostgreSQL → `localhost:5432`

The backend container automatically runs `prisma migrate deploy` before starting. The Telegram string session is persisted in the `jobbot_session` volume.

---

## Telegram login

GramJS authenticates as a **user account**. Generate a reusable string session once:

```bash
cd backend
npm run telegram:login    # prompts for phone, code, and 2FA password
```

Copy the printed session string into `TELEGRAM_SESSION`. JobBot then connects automatically on boot, monitors every channel marked `ACTIVE`, and auto-reconnects on disconnect.

---

## Deployment

**Docker Compose (single host):** the included `docker-compose.yml` builds and runs Postgres, the API, and the Nginx-served frontend. Put it behind a TLS-terminating reverse proxy (Caddy / Traefik / Nginx) for production.

**PM2 (bare metal / VM):**

```bash
cd backend
npm run build
npx prisma migrate deploy
pm2 start ecosystem.config.cjs --env production
pm2 save
```

Serve the built frontend (`frontend/dist`) from any static host or CDN, pointing `VITE_API_BASE_URL` at your public API URL.

---

## API documentation

All routes are prefixed with `API_PREFIX` (default `/api/v1`). Authenticated routes require `Authorization: Bearer <accessToken>`.

Responses follow a consistent envelope:

```jsonc
// success
{ "success": true, "data": { /* ... */ }, "meta": { "page": 1, "pageSize": 20, "total": 42, "totalPages": 3 } }
// error
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [] } }
```

List endpoints accept `page`, `pageSize`, `search`, `sortBy`, `sortOrder`, and resource-specific filters (e.g. `status`, `level`, `category`).

### Auth

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | — | Register a new user |
| POST | `/auth/login` | — | Login, returns access + refresh tokens |
| POST | `/auth/refresh` | — | Exchange a refresh token for new tokens |
| POST | `/auth/logout` | — | Revoke a refresh token |
| GET | `/auth/me` | ✅ | Current user |

### Profile & settings

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET / PUT | `/profile` | ✅ | Get / update profile |
| GET / PUT | `/settings` | ✅ | Get / update settings |

### Automation

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/automation/status` | ✅ | Automation + integration status |
| POST | `/automation/pause` | ✅ | Pause auto-applying |
| POST | `/automation/resume` | ✅ | Resume auto-applying |

### Channels

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/channels` | ✅ | List monitored channels |
| POST | `/channels` | ✅ | Add a channel |
| PUT | `/channels/:id` | ✅ | Update a channel |
| DELETE | `/channels/:id` | ✅ | Remove a channel |

### Jobs

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/jobs` | ✅ | List/search/filter jobs |
| GET | `/jobs/:id` | ✅ | Job detail incl. AI match |
| POST | `/jobs/:id/archive` | ✅ | Archive a job |

### Drafts & applications

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/drafts` | ✅ | List drafts |
| GET | `/drafts/:id` | ✅ | Draft detail |
| PUT | `/drafts/:id` | ✅ | Edit draft subject/body/recipient |
| POST | `/drafts/:id/approve` | ✅ | Approve & queue send |
| POST | `/drafts/:id/reject` | ✅ | Reject draft |
| GET | `/applications` | ✅ | List applications |
| GET | `/applications/:id` | ✅ | Application detail |
| POST | `/applications/send` | ✅ | Manually send for a job |

### Notifications & logs

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/notifications` | ✅ | List notifications |
| POST | `/notifications/:id/read` | ✅ | Mark one read |
| POST | `/notifications/read-all` | ✅ | Mark all read |
| GET | `/logs` | ✅ | List/filter logs |

### Dashboard

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/dashboard/overview` | ✅ | Cards, recent applications, pending drafts |
| GET | `/dashboard/statistics` | ✅ | Trends + jobs-by-status |
| GET | `/health` | — | Liveness probe (outside prefix) |

---

## License

Released under the MIT License.
