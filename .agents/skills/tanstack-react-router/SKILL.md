---
name: tanstack-react-router
description: TanStack Router (React) type-safe routing: file-based routes, search/path params, data loading, auth-and-guards, navigation, SSR, code-splitting, type-safety. Official TanStack agent-skill (vendored from the TanStack/router monorepo). Use when working on routing, route guards by role, or URL state.
metadata:
  source: TanStack official monorepo (vendored)
  type: reference
---

# tanstack-react-router

Official TanStack agent-skill set, vendored from the TanStack monorepos because
the skills are **not yet shipped inside the published npm packages** (so the
`@tanstack/intent` CLI cannot auto-discover them standalone yet).

## Start here

Read the entry skill first (path relative to this file):

`../../tanstack-react/packages/react-router/skills/react-router/SKILL.md`

Its internal relative links (e.g. `../../../start-client-core/...`) resolve
because the full tree is preserved under `../../tanstack-react/packages/`.

## All bundled sub-skills

### `react-router`

- **compositions/router-query** — Integrating TanStack Router with TanStack Query: queryClient in router context, ensureQueryData/prefetchQuery in loaders, useSuspenseQuery in components, def...
  - `../../tanstack-react/packages/react-router/skills/compositions/router-query/SKILL.md`
- **lifecycle/migrate-from-react-router** — Step-by-step migration from React Router v7 to TanStack Router: route definition conversion, Link/useNavigate API differences, useSearchParams to validateSea...
  - `../../tanstack-react/packages/react-router/skills/lifecycle/migrate-from-react-router/SKILL.md`
- **react-router** — React bindings for TanStack Router: RouterProvider, useRouter, useRouterState, useMatch, useMatches, useLocation, useSearch, useParams, useNavigate, useLoade...
  - `../../tanstack-react/packages/react-router/skills/react-router/SKILL.md`

### `router-core`

- **router-core** — Framework-agnostic core concepts for TanStack Router: route trees, createRouter, createRoute, createRootRoute, createRootRouteWithContext, addChildren, Regis...
  - `../../tanstack-react/packages/router-core/skills/router-core/SKILL.md`
- **router-core/auth-and-guards** — Route protection with beforeLoad, redirect()/throw redirect(), isRedirect helper, authenticated layout routes (_authenticated), non-redirect auth (inline log...
  - `../../tanstack-react/packages/router-core/skills/router-core/auth-and-guards/SKILL.md`
- **router-core/code-splitting** — Automatic code splitting (autoCodeSplitting), .lazy.tsx convention, createLazyFileRoute, createLazyRoute, lazyRouteComponent, getRouteApi for typed hooks in ...
  - `../../tanstack-react/packages/router-core/skills/router-core/code-splitting/SKILL.md`
- **router-core/data-loading** — Route loader option, loaderDeps for cache keys, staleTime/gcTime/ defaultPreloadStaleTime SWR caching, pendingComponent/pendingMs/ pendingMinMs, errorCompone...
  - `../../tanstack-react/packages/router-core/skills/router-core/data-loading/SKILL.md`
- **router-core/navigation** — Link component, useNavigate, Navigate component, router.navigate, ToOptions/NavigateOptions/LinkOptions, from/to relative navigation, activeOptions/activePro...
  - `../../tanstack-react/packages/router-core/skills/router-core/navigation/SKILL.md`
- **router-core/not-found-and-errors** — notFound() function, notFoundComponent, defaultNotFoundComponent, notFoundMode (fuzzy/root), errorComponent, CatchBoundary, CatchNotFound, isNotFound, NotFou...
  - `../../tanstack-react/packages/router-core/skills/router-core/not-found-and-errors/SKILL.md`
- **router-core/path-params** — Dynamic path segments ($paramName), splat routes ($ / _splat), optional params ({-$paramName}), prefix/suffix patterns ({$param}.ext), useParams, params.pars...
  - `../../tanstack-react/packages/router-core/skills/router-core/path-params/SKILL.md`
- **router-core/search-params** — validateSearch, search param validation with Zod/Valibot/ArkType adapters, fallback(), search middlewares (retainSearchParams, stripSearchParams), custom ser...
  - `../../tanstack-react/packages/router-core/skills/router-core/search-params/SKILL.md`
- **router-core/ssr** — Non-streaming and streaming SSR, RouterClient/RouterServer, renderRouterToString/renderRouterToStream, createRequestHandler, defaultRenderHandler/defaultStre...
  - `../../tanstack-react/packages/router-core/skills/router-core/ssr/SKILL.md`
- **router-core/type-safety** — Full type inference philosophy (never cast, never annotate inferred values), Register module declaration, from narrowing on hooks and Link, strict:false for ...
  - `../../tanstack-react/packages/router-core/skills/router-core/type-safety/SKILL.md`
