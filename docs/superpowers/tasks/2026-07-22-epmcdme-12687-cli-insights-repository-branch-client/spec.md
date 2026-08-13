# Spec — EPMCDME-12687: CLI Insights Repositories Table — Branch/Client Columns

## Problem

`EPMCDME-12687` is the umbrella ticket for improving Claude Desktop data retrieval and
display across Analytics and Chats. The sub-task directly relevant to this repo:

- Analytics CLI Insights: Total cost is displayed incorrectly for Claude Desktop and does
  not match the Repositories table.

The root cause lives on the backend (`codemie` repo): before this ticket, the
`cli-insights-user-repositories` endpoint returned **one row per repository**, aggregating
all branches and clients (CLI, Claude Desktop) into a single cost/session number per repo.
This produced two visible problems in this UI:

1. A Claude Desktop session run from a directory with no folder context (`Cowork` sandbox)
   and a real CLI session on the same repository were summed into one row, so the displayed
   cost/session count did not match what a user saw when cross-checking against Top Spenders.
2. There was no way to see *which* branch or *which client* (CLI vs Claude Desktop) a given
   cost came from — the old `renderRepositoryCell` rendered repository plus a flat list of
   `branches: string[]` badges with no cost/session breakdown per branch.

The backend fix (`codemie` repo, `classification_engine.py` /
`insights_handler.py`) changed `_build_cli_repository_classifications` to group by
`(repository, branch, client)` instead of `repository` alone, and the
`cli-insights-user-repositories` response now returns one row per
`(repository, branch, client)` combination, each with its own `branch` and `client` scalar
field (not an array).

---

## Scope (this repo)

This repo's contribution is display-only: render the new `branch` and `client` fields the
backend now sends per row, in the Repositories table inside the CLI Insights user detail
modal (`CLIInsightsUserDetailsModal.tsx`).

Out of scope: any change to the "Top Spenders" / "All Users" tables — those are separate
endpoints/components and were not touched by this ticket.

---

## Change 1 — `CLIInsightsUserDetailsModal.tsx`

Add `branch` and `client` to the Repositories `TableWidget`:

- `columnOrder`: insert `'branch'` after `'repository'`, and `'client'` after
  `'classification'` — `['repository', 'branch', 'classification', 'client', 'sessions',
  'cost', 'net_lines']`.
- `tableStyles.columnWidths`: fix `repository` and `branch` to `220px` so long repo/branch
  names truncate predictably instead of pushing Cost/Sessions off-screen.
- `customRenderColumns`: wire `branch: renderBranchCell` and `client: renderClientCell`
  alongside the existing `repository`/`classification` renderers.

## Change 2 — `helpers.tsx`

- `renderRepositoryCell` — simplified. Previously rendered the repository name plus a list
  of branch badges (`item.branches: string[]`); the backend no longer sends an array, so
  this now just renders the repository name with a truncating tooltip.
- `renderBranchCell` — new. Renders `item.branch` as a pill badge (same visual style the
  old per-repo branch badges used), or `-` when empty (e.g. Claude Desktop `Cowork` rows
  with no resolvable branch).
- `renderClientCell` — new. Maps the backend's normalized client value to a label + icon:
  `CLI` variants (`CLI`, `codemie-daemon`, `codemie-claude`, `codemie-claude-acp`,
  `codemie-code` — already normalized to `CLI` server-side, kept here defensively) render a
  terminal icon; `claude-desktop` renders the Claude Desktop icon + "Claude Desktop" label.
  Unrecognized values render as plain text (forward-compatible with new client types added
  server-side before this map is updated).

---

## Review Fixes

A self-review of the initial diff found two issues, both fixed before merge:

### Fix A — Duplicate `Tooltip` mount per row

`renderRepositoryCell` and `renderBranchCell` are cell renderers, invoked once per
`(row, column)` by `Table.tsx`'s `items.map(...)` / `TableCell`'s `customRender(value,
index)` — **not** once per table. The initial diff mounted a
`<Tooltip target=".repo-cell-tooltip" />` (respectively `.branch-cell-tooltip`) **inside**
each cell renderer. With N rows, this mounted N separate PrimeReact `Tooltip` instances, all
bound to the same class selector — each instance matches *every* row with that class, not
just its own, so hovering any cell could trigger duplicate tooltip popups and each render
paid the cost of N redundant selector bindings.

Fix: mount the two `<Tooltip target=".repo-cell-tooltip" .../>` /
`<Tooltip target=".branch-cell-tooltip" .../>` once, at the `TableWidget` call site in
`CLIInsightsUserDetailsModal.tsx`, wrapped in a fragment alongside the table. The cell
renderers only render the `.repo-cell-tooltip` / `.branch-cell-tooltip` marker elements now.

### Fix B — Dead code assuming the old (pre-fix) backend contract

`transformRepositoriesTable` (`helpers.tsx`) was exported but never called anywhere in the
repo. It re-implemented row expansion client-side from a `row.branches: string[]` field —
the exact shape the backend fix replaced. Since the backend now sends one row per
`(repository, branch, client)` already, this function is not just unused but incompatible
with the current API contract; if left in place and wired up later "because it's exported,"
it would double-expand rows. Removed, along with the now-unused `ColumnType` /
`TabularResponse` imports it required.

---

## Files Changed

| File | Change |
|---|---|
| `src/pages/analytics/components/cliInsights/CLIInsightsUserDetailsModal.tsx` | Add `branch`/`client` to `columnOrder`, `tableStyles.columnWidths`, `customRenderColumns`; mount the two cell tooltips once at the table level |
| `src/pages/analytics/components/cliInsights/helpers.tsx` | Simplify `renderRepositoryCell`; add `renderBranchCell`, `renderClientCell`, `CLIENT_CONFIG`; remove dead `transformRepositoriesTable` and its now-unused imports |

---

## Acceptance Criteria

- The Repositories table in the CLI Insights user detail modal shows one row per
  `(repository, branch, client)` combination, matching the backend response.
- Branch renders as a pill badge; empty branch renders `-`.
- Client renders as an icon + label (`CLI` / `Claude Desktop`); unrecognized client values
  render as plain text rather than breaking the row.
- Hovering a truncated repository or branch cell shows exactly one tooltip, regardless of
  row count.
- No dead code exported from `helpers.tsx` that assumes the pre-fix `branches: string[]`
  response shape.
