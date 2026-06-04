# xStock — Warehouse Management System

A full-stack Warehouse Management System covering the inbound → storage → outbound flow:
master data (products, suppliers, customers, sections/locations, batches), purchase
orders & goods receipt, inventory with batch/location reservations, sales orders &
shipments, stock movements, and reporting — with JWT auth and role-based access
(ADMIN / MANAGER / STAFF / VIEWER).

## Tech stack

| Layer    | Stack                                                              |
| -------- | ----------------------------------------------------------------- |
| Backend  | NestJS 11, Prisma 6, PostgreSQL, Redis (ioredis), JWT, Resend     |
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS             |

## Repository layout

```
xstock-wms/
├─ backend/    # NestJS API + Prisma schema/migrations
├─ frontend/   # Next.js app (App Router)
└─ docs/       # project report
```

## Prerequisites

- **Node.js** 20+ and npm
- **PostgreSQL** 14+ (a database for the app)
- **Redis** 6+ (used for auth/token features)
- A **Resend** API key (optional — only needed for the email-verification flow)

## Getting started

Clone the repo, then set up the backend and frontend (two terminals).

### 1. Backend (`/backend`) — runs on http://localhost:3001

```bash
cd backend
npm install
npx prisma generate          # REQUIRED after install, generates the Prisma client
npx prisma migrate dev       # creates the schema in your database
npm run seed                 # optional: seed users + sample master data
npm run start:dev            # watch mode (or: npm run start)
```

Create `backend/.env`:

```env
# PostgreSQL connection string
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/xstock?schema=public"

# Required — the app refuses to start without it
JWT_SECRET="change-me-to-a-long-random-string"

# Redis connection
REDIS_URL="redis://localhost:6379"

# Resend API key for transactional email (registration verification)
RESEND_API_KEY="your-resend-key"

# Optional — comma-separated allowlist of frontend origins (default: http://localhost:3000)
CORS_ORIGINS="http://localhost:3000"

# Optional — API port (default: 3001)
PORT=3001

# Optional — password for all seeded accounts (default: password123)
SEED_ADMIN_PASSWORD="password123"
```

> `npm run seed` creates four role-based dev accounts plus sample suppliers,
> products, and customers. It is idempotent (safe to re-run). Default login:
> `admin@xstock.test` / `password123` (also `manager@`, `staff@`, `viewer@`).

### 2. Frontend (`/frontend`) — runs on http://localhost:3000

```bash
cd frontend
npm install
npm run dev                  # development server
```

Create `frontend/.env.local`:

```env
# Base URL of the backend API
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

Then open http://localhost:3000.

## Common scripts

**Backend**

| Command                | Description                              |
| ---------------------- | ---------------------------------------- |
| `npm run start:dev`    | Start the API in watch mode              |
| `npm run start:prod`   | Start the compiled API (`dist/`)         |
| `npm run build`        | Compile the API                          |
| `npm run seed`         | Seed the database                        |
| `npm run test`         | Unit tests                               |
| `npm run test:e2e`     | End-to-end tests (resets the test DB)    |
| `npx prisma studio`    | Browse the database in the browser       |

**Frontend**

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Development server (http://localhost:3000) |
| `npm run build`   | Production build                     |
| `npm run start`   | Serve the production build           |
| `npm run lint`    | Lint                                 |

## Notes

- Run `npx prisma generate` whenever the Prisma schema changes or right after a fresh `npm install`, otherwise the backend build fails with missing `@prisma/client` types.
- `JWT_SECRET` is mandatory — the backend fails fast on startup if it is unset.
- Make sure PostgreSQL and Redis are running before starting the backend.
