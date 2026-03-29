# Crypto Tracker — Frontend

Angular 21 single-page application for the Crypto Tracker platform. Provides a full trading dashboard with portfolio management, audit logs, P&L formulas, and user/group/role administration.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Angular 21](https://angular.dev) (standalone components, lazy-loaded routes) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com) via PostCSS |
| Charts | [Chart.js 4](https://www.chartjs.org) |
| i18n | [@ngx-translate](https://github.com/ngx-translate/core) |
| Spreadsheet export | [xlsx](https://sheetjs.com) |
| Unit tests | [Vitest](https://vitest.dev) (via `@angular/build`) |
| E2E tests | [Playwright](https://playwright.dev) (in `../e2e/`) |
| Production server | nginx (Docker multi-stage build) |

## Prerequisites

- **Node.js** 22+ and **npm** 10+
- **Angular CLI** 21: `npm install -g @angular/cli`
- Backend running on `http://localhost:3001` (see `../backend/`)

## Getting Started

### Install dependencies

```bash
npm install
```

### Start the development server

```bash
npm start
# or
ng serve
```

Open [http://localhost:4200](http://localhost:4200). The app proxies all `/api` requests to `http://localhost:3001` (configured in `proxy.conf.json`).

## Available Scripts

| Command | Description |
|---|---|
| `npm start` | Start dev server at `http://localhost:4200` |
| `npm run build` | Production build — artifacts go to `dist/` |
| `npm run watch` | Development build in watch mode |
| `npm test` | Run unit tests with Vitest |

## Application Features

| Route | Description |
|---|---|
| `/login` | Authentication — JWT-based login |
| `/register` | New account registration |
| `/dashboard` | Portfolio overview and P&L charts |
| `/trades` | Trade log — create, edit, and filter trades |
| `/audit` | Immutable audit trail of all events |
| `/master-data` | Reference data management (assets, exchanges, etc.) |
| `/formulas` | Custom P&L formula builder |
| `/admin/users` | User management |
| `/admin/groups` | Group management |
| `/admin/roles` | Role and permission management |

All routes except `/login` and `/register` are protected by `authGuard`.

## Project Structure

```
src/
├── app/
│   ├── core/
│   │   ├── guards/       # Route guards (authGuard)
│   │   ├── interceptors/ # HTTP interceptors (auth token, error handling)
│   │   ├── models/       # Shared TypeScript interfaces and types
│   │   ├── services/     # Application-wide services (auth, API, etc.)
│   │   └── shell/        # App shell (layout, navigation)
│   └── features/
│       ├── admin/        # User, group, and role administration
│       ├── audit/        # Audit log viewer
│       ├── auth/         # Login and registration pages
│       ├── dashboard/    # Portfolio dashboard
│       ├── formulas/     # P&L formula editor
│       ├── master-data/  # Reference data management
│       └── trades/       # Trade management
├── styles.css            # Global Tailwind CSS entry point
└── index.html
```

## Running Tests

### Unit tests (Vitest)

```bash
ng test
```

### End-to-end tests (Playwright)

E2E tests live in `../e2e/` and target the full stack (frontend + backend).

```bash
# From the repo root
cd ../e2e
npx playwright test
```

## Building for Production

```bash
ng build
```

Compiled output is written to `dist/frontend/browser/`. In production the app is served by nginx inside a Docker container (see [Docker](#docker) below).

## Docker

The frontend is containerised using a two-stage build:

1. **Builder** — Node 22 Alpine compiles the Angular app.
2. **Runtime** — nginx Alpine serves the static files from `dist/frontend/browser/`.

Build and run standalone:

```bash
docker build -t crypto-tracker-frontend .
docker run -p 80:80 crypto-tracker-frontend
```

Run the full stack with Docker Compose (from the repository root):

```bash
docker compose up --build
```

The frontend will be available at [http://localhost](http://localhost) and the backend at [http://localhost:3001](http://localhost:3001).

## Code Style

The project uses [Prettier](https://prettier.io) for formatting (`.prettierrc` in this directory). Run the formatter with:

```bash
npx prettier --write .
```

TypeScript strict mode is enabled along with `noImplicitOverride`, `noImplicitReturns`, and strict Angular template checks.

## Additional Resources

- [Angular CLI documentation](https://angular.dev/tools/cli)
- [Angular standalone components](https://angular.dev/guide/components)
- [Tailwind CSS docs](https://tailwindcss.com/docs)
- [Vitest docs](https://vitest.dev/guide/)
