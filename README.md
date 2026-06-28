# Restaurant QR Ordering — Web

Web app for a restaurant where a customer scans the QR code at their table,
browses the menu, and orders; the kitchen tracks dish statuses; the cashier
settles the bill; and the admin manages the menu, tables, and reports.

This repository contains the **frontend** (TanStack Start) plus the operating
**Harness** (agent process docs + durable layer). The backend is a separate
Elysia/Bun service that this app talks to over HTTP (see [SPEC.md](./SPEC.md)
for the full product + backend design).

## Stack

- **Frontend:** [TanStack Start](https://tanstack.com/start) (React 19), Vite 7,
  Tailwind CSS v4, organized with Feature-Sliced Design (FSD).
- **Runtime / package manager:** [Bun](https://bun.sh).
- **Backend (separate service):** Elysia (Bun), Clean Architecture, JWT auth,
  SSE realtime. Consumed via `API_BASE_URL` (default `http://localhost:3000`).
- **Database (backend):** Neon serverless Postgres.
- **Tests:** Vitest (unit/component) + Playwright (e2e).
- **Quality:** oxlint, Prettier, Husky, lint-staged, commitlint (Conventional Commits).

## Getting started

Prerequisites: **Bun** installed, and the **backend running** on
`API_BASE_URL` (default `http://localhost:3000`) for any table-resolving route.

```bash
bun install
cp .env.example .env      # set API_BASE_URL if the backend is not on :3000
bun run dev               # http://localhost:3001
```

Customer flow entry point: `/t/<qrToken>` (the QR resolves a table + open
order). The home page (`/`) links to a demo table.

## Scripts

| Script | What it does |
| --- | --- |
| `bun run dev` | Dev server on port 3001 |
| `bun run build` | Production build (also generates `src/routeTree.gen.ts`) |
| `bun run start` | Serve the production build (`dist/server/server.js`) |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run test` | Vitest unit/component tests |
| `bun run test:watch` | Vitest in watch mode |
| `bun run test:e2e` | Playwright e2e (boots the dev server) |
| `bun run validate` | `typecheck` + unit tests |
| `bun run lint` / `lint:fix` | oxlint over `src` and `e2e` |
| `bun run format` / `format:check` | Prettier |

A pre-commit hook runs lint-staged (oxlint + Prettier on staged files); a
commit-msg hook enforces Conventional Commits.

## Project structure

```text
src/
  routes/        TanStack Start file-based routes (thin; delegate to pages/)
  router.tsx     router factory
  pages/         route-level screens (customer-menu, ...)
  widgets/       composite UI blocks (menu-list, ...)
  entities/      domain types/models (menu, table, ...)
  shared/        api client (server functions), config, lib helpers
  styles.css     Tailwind entry
e2e/             Playwright specs
.github/workflows/ci.yml   CI pipeline
docs/            Harness process docs, product contracts, stories, decisions
.agents/         vendored agent skills (TanStack React, web-design-guidelines)
```

Data is fetched in **server functions** (`createServerFn`, in `src/shared/api/`)
that proxy the backend server-side — the browser never calls the backend
directly, so there are no CORS concerns and the backend URL stays server-side.

## Current status

Implemented:

- **US-2.1 — Customer views the menu by category** (`/t/$qrToken`): loads table
  context + menu, groups dishes by category, dims sold-out items, shows an
  "Invalid table" screen for bad tokens. Proven by unit/component tests; the
  happy-path e2e is pending a seeded backend.

Planned (see [SPEC.md](./SPEC.md)): cart & order submission, kitchen board,
cashier & payment, admin CRUD, reports, staff auth screens, and SSE realtime.

## CI

`.github/workflows/ci.yml` runs on PRs and pushes to `main`:

- **quality:** install → build → lint → format check → typecheck → unit tests
- **e2e:** Playwright (Chromium)

## Harness

This repo uses [Harness](./docs/HARNESS.md) — an agent operating model that
records intake classifications, story packets, validation proof, decisions, and
execution traces in a local SQLite durable layer (`harness.db`, gitignored).

Agents should read `AGENTS.md`, then the docs it links
(`docs/HARNESS.md`, `docs/FEATURE_INTAKE.md`, `docs/ARCHITECTURE.md`). Operate
the durable layer with the CLI:

```bash
scripts/bin/harness-cli init          # create harness.db
scripts/bin/harness-cli query matrix  # behavior-to-proof status
```

Product contracts live in `docs/product/`, story packets in `docs/stories/`,
and decisions in `docs/decisions/`.
