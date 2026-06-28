---
name: tanstack-react-start
description: TanStack Start (React) full-stack framework: createServerFn, createMiddleware, SSR/streaming, beforeLoad auth guards, server functions & routes, deployment. Official TanStack agent-skill (vendored from the TanStack/router monorepo). Use when building/optimizing the TanStack Start frontend or its server layer.
metadata:
  source: TanStack official monorepo (vendored)
  type: reference
---

# tanstack-react-start

Official TanStack agent-skill set, vendored from the TanStack monorepos because
the skills are **not yet shipped inside the published npm packages** (so the
`@tanstack/intent` CLI cannot auto-discover them standalone yet).

## Start here

Read the entry skill first (path relative to this file):

`../../tanstack-react/packages/react-start/skills/react-start/SKILL.md`

Its internal relative links (e.g. `../../../start-client-core/...`) resolve
because the full tree is preserved under `../../tanstack-react/packages/`.

## All bundled sub-skills

### `react-start`

- **lifecycle/migrate-from-nextjs** — Step-by-step migration from Next.js App Router to TanStack Start: route definition conversion, API mapping, server function conversion from Server Actions, m...
  - `../../tanstack-react/packages/react-start/skills/lifecycle/migrate-from-nextjs/SKILL.md`
- **react-start** — React bindings for TanStack Start: createStart, StartClient, StartServer, React-specific imports, re-exports from @tanstack/react-router, full project setup ...
  - `../../tanstack-react/packages/react-start/skills/react-start/SKILL.md`
- **react-start/server-components** — Implement, review, debug, and refactor TanStack Start React Server Components in React 19 apps. Use when tasks mention @tanstack/react-start/rsc, renderServe...
  - `../../tanstack-react/packages/react-start/skills/react-start/server-components/SKILL.md`

### `start-client-core`

- **start-core** — Core overview for TanStack Start: tanstackStart() Vite plugin, getRouter() factory, root route document shell (HeadContent, Scripts, Outlet), client/server e...
  - `../../tanstack-react/packages/start-client-core/skills/start-core/SKILL.md`
- **start-core/auth-server-primitives** — Server-side authentication primitives for TanStack Start: session cookies (HttpOnly, Secure, SameSite, __Host- prefix), session read/issue/destroy via create...
  - `../../tanstack-react/packages/start-client-core/skills/start-core/auth-server-primitives/SKILL.md`
- **start-core/deployment** — Deploy to Cloudflare Workers, Netlify, Vercel, Node.js/Docker, Bun, Railway. Selective SSR (ssr option per route), SPA mode, static prerendering, ISR with Ca...
  - `../../tanstack-react/packages/start-client-core/skills/start-core/deployment/SKILL.md`
- **start-core/execution-model** — Isomorphic-by-default principle, environment boundary functions (createServerFn, createServerOnlyFn, createClientOnlyFn, createIsomorphicFn), ClientOnly comp...
  - `../../tanstack-react/packages/start-client-core/skills/start-core/execution-model/SKILL.md`
- **start-core/middleware** — createMiddleware, request middleware (.server only), server function middleware (.client + .server), context passing via next({ context }), sendContext for c...
  - `../../tanstack-react/packages/start-client-core/skills/start-core/middleware/SKILL.md`
- **start-core/server-functions** — createServerFn (GET/POST), validator (Zod or function), useServerFn hook, server context utilities (getRequest, getRequestHeader, setResponseHeader, setRespo...
  - `../../tanstack-react/packages/start-client-core/skills/start-core/server-functions/SKILL.md`
- **start-core/server-routes** — Server-side API endpoints using the server property on createFileRoute, HTTP method handlers (GET, POST, PUT, DELETE), createHandlers for per-handler middlew...
  - `../../tanstack-react/packages/start-client-core/skills/start-core/server-routes/SKILL.md`

### `start-server-core`

- **start-server-core** — Server-side runtime for TanStack Start: createStartHandler, request/response utilities (getRequest, setResponseHeader, setCookie, getCookie, useSession), thr...
  - `../../tanstack-react/packages/start-server-core/skills/start-server-core/SKILL.md`

### `router-plugin`

- **router-plugin** — TanStack Router bundler plugin for route generation and automatic code splitting. Supports Vite, Webpack, Rspack, and esbuild. Configures autoCodeSplitting, ...
  - `../../tanstack-react/packages/router-plugin/skills/router-plugin/SKILL.md`

### `virtual-file-routes`

- **virtual-file-routes** — Programmatic route tree building as an alternative to filesystem conventions: rootRoute, index, route, layout, physical, defineVirtualSubtreeConfig. Use with...
  - `../../tanstack-react/packages/virtual-file-routes/skills/virtual-file-routes/SKILL.md`
