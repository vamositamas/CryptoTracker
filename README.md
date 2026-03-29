# CryptoTracker

Full-stack crypto trading journal and analytics platform.

CryptoTracker lets users record trades, calculate metrics using configurable formulas, review performance on dashboards, manage reference data, and maintain an audit trail. The application also includes authentication/authorization with users, groups, and roles.

## What Is In This Repository

- Frontend: Angular 21 SPA (Tailwind, Chart.js, ngx-translate)
- Backend: Node.js + Express + TypeScript REST API with JSON file storage
- E2E tests: Playwright test suite
- API docs: OpenAPI spec and markdown reference
- Docker setup: Full stack via Docker Compose

## Repository Structure

```text
crypto-tracker/
  backend/               # Express API, auth, formulas, storage, routes
  frontend/              # Angular SPA
  e2e/                   # Playwright tests
  data/                  # Shared + trader data persisted as JSON
  docs/                  # API documentation and OpenAPI spec
  docker-compose.yml     # Full stack container orchestration
  package.json           # Workspace-level scripts
```

## Architecture Overview

### Frontend

- Angular standalone components and lazy-loaded routes
- Internationalization: English and Hungarian (`public/i18n`)
- Feature modules/pages include:
  - Auth (`/login`, `/register`)
  - Dashboard (`/dashboard`)
  - Trades (`/trades`)
  - Master Data (`/master-data`)
  - Formulas (`/formulas`)
  - Audit (`/audit`)
  - Admin (`/admin/users`, `/admin/groups`, `/admin/roles`)
  - Profile (`/profile`)
- User guide pages are served as static assets:
  - `/user-guide.en.html`
  - `/user-guide.hu.html`

### Backend

- Express 5 API under `/api/v1`
- JWT authentication + role/permission checks
- JSON-file persistence in `data/`
- Optional AES-256-GCM at-rest encryption for trader data via `DATA_ENCRYPTION_KEY`
- Core route groups:
  - `auth.routes.ts`
  - `users.routes.ts`, `groups.routes.ts`, `roles.routes.ts`
  - `trades.routes.ts`
  - `dashboard.routes.ts`
  - `master-data.routes.ts`
  - `formulas.routes.ts`
  - `audit.routes.ts`

### Data Layout

```text
data/
  shared/                # Users, groups, roles, formulas, master data
  traders/               # Per-trader trades and audit files
  config/                # Supporting configuration
```

## Prerequisites

- Node.js 22+
- npm 10+
- Docker + Docker Compose (recommended for full stack)

## Quick Start (Recommended: Docker)

From repository root:

```bash
docker compose up --build
```

App URLs:

- Frontend: `http://localhost`
- Backend health: `http://localhost:3001/api/v1/health`

To run detached:

```bash
docker compose up --build -d
```

To check status:

```bash
docker compose ps
```

## Local Development (Without Docker)

Install root dependencies:

```bash
npm install
```

Install module dependencies (first time):

```bash
npm install --prefix backend
npm install --prefix frontend
```

Create backend env file:

```bash
cp backend/.env.example backend/.env
```

Set at least:

- `JWT_SECRET`

Run backend:

```bash
npm run dev --prefix backend
```

Run frontend (separate terminal):

```bash
npm run start --prefix frontend
```

Local URLs:

- Frontend: `http://localhost:4200`
- Backend: `http://localhost:3001`

Notes:

- Frontend uses `proxy.conf.json` to forward `/api` calls to `http://localhost:3001`.
- Backend `DATA_DIR` defaults to local backend data path unless overridden.

## Environment Variables (Backend)

See `backend/.env.example` for full descriptions.

Required:

- `JWT_SECRET`

Common:

- `PORT` (default `3001`)
- `DATA_DIR` (optional data directory override)
- `JWT_EXPIRES_IN` (default `24h`)

Optional encryption:

- `DATA_ENCRYPTION_KEY` (64-char hex; AES-256-GCM)

Generate encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Scripts

### Root (`package.json`)

- `npm run build` - Build frontend and backend
- `npm run test:unit:frontend` - Run frontend unit tests
- `npm run test:unit:backend` - Run backend unit tests
- `npm run test:e2e` - Run Playwright e2e tests

### Backend (`backend/package.json`)

- `npm run dev` - Start backend in watch mode (ts-node + nodemon)
- `npm run build` - TypeScript build
- `npm run start` - Run compiled backend
- `npm test` - Run backend unit tests

### Frontend (`frontend/package.json`)

- `npm run start` - Angular dev server
- `npm run build` - Production build
- `npm test` - Frontend tests

## Testing

### Backend Unit Tests

```bash
npm run test:unit:backend
```

### Frontend Unit Tests

```bash
npm run test:unit:frontend
```

### End-to-End Tests

```bash
npm run test:e2e
```

Playwright config is in `e2e/playwright.config.ts` and can auto-start frontend + backend test servers.

## API Documentation

- API markdown reference: `docs/api.md`
- OpenAPI file: `docs/openapi.yaml`

For quick health check:

```bash
curl http://localhost:3001/api/v1/health
```

## Security Notes

- API uses JWT bearer auth
- Permissions are enforced server-side by middleware
- CORS restricted to localhost origins by default
- `data/` direct path access is denied by backend guard
- Optional at-rest encryption for trader data files

## Deployment Notes

Current Docker compose setup is optimized for local/self-hosted usage:

- `backend` exposed on `3001`
- `frontend` exposed on `80`
- `./data` mounted into backend container for persistence

Before production deployment:

- Change `JWT_SECRET`
- Configure secure CORS origins
- Use HTTPS and secure reverse proxy
- Back up `data/` regularly
- If encryption is enabled, back up `DATA_ENCRYPTION_KEY` securely

## Troubleshooting

### Frontend cannot reach API

- Verify backend is running on `3001`
- Check frontend proxy config (`frontend/proxy.conf.json`) in local dev
- In Docker mode, confirm `docker compose ps` shows backend healthy

### Auth errors (401/403)

- Confirm JWT is present and not expired
- Confirm role has required permissions
- For admin routes, ensure user has `users:manage`

### Data not persisting in Docker

- Verify `./data:/data` volume mapping in `docker-compose.yml`
- Ensure write permissions on `data/` directory

## Additional Component Docs

- Frontend-focused guide: `frontend/README.md`
- Backend source and route tests: `backend/src/`
- E2E tests: `e2e/tests/`
