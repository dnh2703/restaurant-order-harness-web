---
name: tanstack-react-table
description: TanStack Table (React) headless datagrids: getting-started, table-state, production-readiness, client-to-server, compose-with-query/form/store/virtual, v8->v9 migration. Official TanStack agent-skill (vendored from the TanStack/table monorepo). Use for kitchen queue, cashier bill, and admin/report tables.
metadata:
  source: TanStack official monorepo (vendored)
  type: reference
---

# tanstack-react-table

Official TanStack agent-skill set, vendored from the TanStack monorepos because
the skills are **not yet shipped inside the published npm packages** (so the
`@tanstack/intent` CLI cannot auto-discover them standalone yet).

## Start here

Read the entry skill first (path relative to this file):

`../../tanstack-react/packages/react-table/skills/react/getting-started/SKILL.md`

Its internal relative links (e.g. `../../../start-client-core/...`) resolve
because the full tree is preserved under `../../tanstack-react/packages/`.

## All bundled sub-skills

### `react-table`

- **react/client-to-server** — Convert a client-side `@tanstack/react-table` v9 table to server-side (manual modes). Pass server-paginated/sorted/filtered rows as `data`, set `manualPagina...
  - `../../tanstack-react/packages/react-table/skills/react/client-to-server/SKILL.md`
- **react/compose-with-tanstack-form** — Editable cells for `@tanstack/react-table` v9 via `@tanstack/react-form`. The table is the layout primitive; the form owns editing state. Use `createFormHook...
  - `../../tanstack-react/packages/react-table/skills/react/compose-with-tanstack-form/SKILL.md`
- **react/compose-with-tanstack-pacer** — Use `@tanstack/react-pacer` to debounce/throttle the high-frequency writes that drive an interactive `@tanstack/react-table` v9 table: column filter inputs a...
  - `../../tanstack-react/packages/react-table/skills/react/compose-with-tanstack-pacer/SKILL.md`
- **react/compose-with-tanstack-query** — Server-side / async data flow for `@tanstack/react-table` v9 with `@tanstack/react-query`. Canonical pattern: external pagination atom via `useCreateAtom<Pag...
  - `../../tanstack-react/packages/react-table/skills/react/compose-with-tanstack-query/SKILL.md`
- **react/compose-with-tanstack-store** — `@tanstack/react-table` v9 is built on TanStack Store. Each state slice (sorting, pagination, rowSelection, columnFilters, …) is a separate atom. The table e...
  - `../../tanstack-react/packages/react-table/skills/react/compose-with-tanstack-store/SKILL.md`
- **react/compose-with-tanstack-virtual** — `@tanstack/react-table` v9 does NOT include virtualization — pair with `@tanstack/react-virtual`. Standard row-virtualization pattern: get the row array from...
  - `../../tanstack-react/packages/react-table/skills/react/compose-with-tanstack-virtual/SKILL.md`
- **react/getting-started** — End-to-end first-table journey for `@tanstack/react-table` v9. Install the React adapter, declare `features` via `tableFeatures()` (row model factories and *...
  - `../../tanstack-react/packages/react-table/skills/react/getting-started/SKILL.md`
- **react/migrate-v8-to-v9** — Mechanical breaking-change migration from `@tanstack/react-table` v8 to v9. Every v8-shaped option, type, or method an agent will reproduce from muscle memor...
  - `../../tanstack-react/packages/react-table/skills/react/migrate-v8-to-v9/SKILL.md`
- **react/production-readiness** — Ship-ready optimizations for `@tanstack/react-table` v9: tree-shake the bundle by registering ONLY the `features` you actually use; memoize `features`, `data...
  - `../../tanstack-react/packages/react-table/skills/react/production-readiness/SKILL.md`
- **react/react-subscribe-compiler-compat** — React Compiler compatibility for `@tanstack/react-table` v9. When you read table state via builder APIs (`column.getIsPinned()`, `row.getIsSelected()`, `cell...
  - `../../tanstack-react/packages/react-table/skills/react/react-subscribe-compiler-compat/SKILL.md`
- **react/table-state** — Wiring reactivity for `@tanstack/react-table` v9. Covers `useTable` (and its second-argument selector), reading state via `table.state` / `table.store` / `ta...
  - `../../tanstack-react/packages/react-table/skills/react/table-state/SKILL.md`
