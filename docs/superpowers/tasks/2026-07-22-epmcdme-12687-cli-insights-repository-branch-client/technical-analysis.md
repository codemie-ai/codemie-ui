# Technical Research

**Task**: EPMCDME-12687 — CLI Insights Repositories table branch/client columns
**Generated**: 2026-07-22
**Research path**: filesystem (this repo) + `codemie` backend repo (cross-repo context)

---

## 1. Original Context

`EPMCDME-12687` is the parent ticket for "Improve Claude Desktop data retrieval and display
in Analytics and Chats." It spans three repos: `codemie` (backend), `codemie-code` (CLI),
and this repo (`codemie-ui`). Two sub-tasks motivate this repo's change:

- Analytics CLI does not correctly attribute Claude Desktop sessions to the right
  repository/branch — historically all Desktop sessions without a resolvable working
  directory landed in a single `Cowork` bucket, and CLI + Desktop activity on the same
  repository were aggregated into one undifferentiated row.
- Analytics CLI Insights: Total cost does not match the Repositories table for a selected
  user/time range — traced to the backend aggregating branch and client together, hiding
  which combination contributed which cost.

The backend fix changes the `cli-insights-user-repositories` response from one row per
repository (with a `branches: string[]` field aggregating all branches touched) to one row
per `(repository, branch, client)` triple, each with scalar `branch` and `client` fields and
its own `sessions`/`cost`/`net_lines`.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/analytics/components/cliInsights/CLIInsightsUserDetailsModal.tsx` — Renders the
  CLI Insights user-detail popup, including the Repositories `TableWidget`. Reads
  `repositoriesTable` from `useCliUserDetail(userName, userId, filters)` (unchanged by this
  task — the hook just forwards whatever the backend returns).
- `src/pages/analytics/components/cliInsights/helpers.tsx` — Home of all cell-renderer
  functions for this modal (`renderRepositoryCell`, `renderClassificationCell`, card-builder
  helpers). Prior to this task, `renderRepositoryCell` read `item.branches` (an array) and
  rendered a flat list of branch badges under the repository name — this is the exact shape
  the backend fix retires.
- `src/components/Table/Table.tsx` — Generic table primitive. `items.map(...)` (line ~166)
  iterates rows; for each row, `columnDefinitions.map(...)` (line ~185) renders one
  `<TableCell customRender={customRenderColumns[definition.key]} .../>` per column.
- `src/components/Table/TableCell.tsx` — `content = customRender(value, index)` (line 103):
  the function passed via `customRenderColumns[col.id]` is invoked **once per cell**, i.e.
  once per `(row, column)` pair, not once for the whole table. This was the key fact behind
  the tooltip-duplication review finding (see [Testing Landscape](#4-testing-landscape) /
  spec.md "Review Fixes").
- `src/pages/analytics/components/widgets/TableWidget.tsx` — Wraps `Table.tsx` for analytics
  use; owns `columnOrder`, `tableStyles` (including `columnWidths` → `table-layout: fixed`),
  and forwards `customRenderColumns` straight through.
- `src/components/Tooltip/Tooltip.tsx` — Thin wrapper over `primereact/tooltip`'s
  `Tooltip`. PrimeReact's `Tooltip` accepts a CSS-selector `target` and binds to *every*
  matching element in the document at mount time — a valid pattern for "mount once, apply to
  many elements," but wrong when the component producing the JSX is itself invoked once per
  matching element (as cell renderers are).

### Architecture and Layers Affected

- **Presentation layer only** (`cliInsights/helpers.tsx`, `CLIInsightsUserDetailsModal.tsx`).
  No store, hook, or API-client change — `useCliUserDetail` already forwards the backend
  response as-is; the new `branch`/`client` fields simply pass through unchanged.
- **Backend contract dependency**: this repo's change assumes the `codemie` repo's
  `cli-insights-user-repositories` endpoint returns `branch: string` and `client: string` as
  row-level scalars (not `branches: string[]`). Confirmed against
  `codemie/src/codemie/service/analytics/handlers/cli/insights_handler.py` — the response
  builder for this endpoint (`_build_cli_repository_classifications` in
  `classification_engine.py`) groups by `(repository, branch, client)` and emits one row per
  group.

### Integration Points

- `useCliUserDetail(userName, userId, filters)` → `repositoriesTable` prop → `TableWidget`
  `initialData` — no transformation layer in this repo; the backend row shape is rendered
  directly.
- `TableWidget` → `Table.tsx` → `TableCell.tsx` `customRender(value, index)` — the per-cell
  invocation boundary relevant to the tooltip fix.
- `renderClientCell`'s `CLIENT_CONFIG` map duplicates (defensively) the backend's client
  normalization (`codemie/.../classification_engine.py::_normalize_client`, which already
  collapses `codemie-daemon`/`codemie-claude`/`codemie-claude-acp`/`codemie-code` to the
  canonical `"CLI"` before the API response is built). In practice this repo will only ever
  see `"CLI"` or `"claude-desktop"` in `item.client`; the extra keys in `CLIENT_CONFIG` are
  redundant but harmless, and forward-compatible if the backend normalization set changes.

### Patterns and Conventions

- Cell renderers in this codebase (`renderRepositoryCell`, `renderClassificationCell`, and
  now `renderBranchCell`/`renderClientCell`) are pure functions
  `(item: Record<string, unknown>) => ReactNode`, using `getPrimitiveString(item.field,
  fallback)` for safe field extraction — followed exactly for the two new renderers.
- Truncating-cell-with-tooltip is an established pattern (`renderRepositoryCell` already used
  it pre-task) — the convention is a `data-pr-tooltip={value}` attribute on the truncated
  element plus a **single** `<Tooltip target=".some-class" />` mounted at a stable ancestor,
  not inside the per-row renderer. The pre-existing `renderRepositoryCell` mounted its
  `<Tooltip>` inline; this was not previously caught because the un-fixed version had a
  single class-marked element type in play (`branches` badges did not use this pattern at
  all), so the N-instances issue was latent but not yet exercised at the row counts this
  change introduces (branch expansion turns what used to be ≤1 badge-set per repo into up to
  N rows per repo).
- Badge styling (`rounded-full bg-surface-elevated px-3 py-1 text-sm text-text-secondary`)
  reused verbatim from the retired per-repo branch-badge list for `renderBranchCell`, keeping
  the visual language consistent.

---

## 3. Documentation Findings

### Guides and Architecture Docs

No `.ai-run/guides/` entry documents the CLI Insights modal's cell-renderer conventions or
the `Table.tsx` per-cell invocation model; this file is the first record of the
mount-once-per-table vs. mount-once-per-cell distinction for `Tooltip` usage in this
component family.

### Cross-Repo Findings

- `codemie` repo, `src/codemie/service/analytics/handlers/cli/insights_handler.py` /
  `classification_engine.py`: backend grouping change from `repository` to
  `(repository, branch, client)`, source of the new row shape this repo renders.

### Derived Conventions

- When a backend response shape changes (array field → per-row scalar, or vice versa), any
  frontend helper written against the old shape becomes not just unused but actively
  incompatible — `grep -rn "<exportName>" src/` across the whole repo (not just the same
  directory) is the reliable way to confirm a helper is truly dead before removing it, since
  hooks/consumers can live in unrelated directories (`src/hooks/`, `src/pages/`, etc.).

---

## 4. Testing Landscape

### Existing Coverage

- No unit tests exist for `src/pages/analytics/components/cliInsights/helpers.tsx` (verified
  via `find`/`grep` for a co-located `__tests__` directory or `*.test.tsx` file — none
  found). Cell renderers in this file are verified manually through the CLI Insights modal,
  consistent with how `renderRepositoryCell`/`renderClassificationCell` were already
  covered (or rather, not covered) before this task.
- `src/components/Table/Table.tsx` and `TableCell.tsx` (the generic table primitives this
  task's fix depends on for its root-cause trace) also have no dedicated unit suite in this
  repo at the time of this analysis.

### Gaps

- No regression test asserts "a table with N rows mounts exactly one Tooltip instance per
  `target` selector, not N." This is a generic `Table.tsx`/`TableCell.tsx`-level property
  that would be more valuable tested once at the primitive level (verifying
  `customRenderColumns` invocation count / DOM node count for a stubbed multi-row table) than
  re-tested per feature that happens to use a tooltip inside a cell renderer — out of scope
  for this task, noted for future test-infrastructure work.
