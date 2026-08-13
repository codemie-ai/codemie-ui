# EPMCDME-12687: CLI Insights Repositories Table — Branch/Client Columns — Implementation Plan

**Goal:** Render the `branch` and `client` fields the backend now sends per repository row
(one row per `(repository, branch, client)`, replacing the old one-row-per-repository shape
with an array of branches) in the Repositories table of the CLI Insights user detail modal.

**Architecture:** Two cell-renderer functions (`renderBranchCell`, `renderClientCell`) added
to `helpers.tsx`, wired into `TableWidget`'s `customRenderColumns` alongside the existing
`renderRepositoryCell`/`renderClassificationCell`. `columnOrder` and `tableStyles` updated in
`CLIInsightsUserDetailsModal.tsx` to place and size the two new columns.

**Tech Stack:** React 18, TypeScript, PrimeReact (`Tooltip`), Tailwind, Vitest (no new tests
were required — `helpers.tsx` render functions have no existing unit coverage and this change
follows the file's existing pattern of manual/visual verification via the modal).

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/pages/analytics/components/cliInsights/helpers.tsx` | Modify | Simplify `renderRepositoryCell`; add `renderBranchCell`, `renderClientCell`, `CLIENT_CONFIG`; remove dead `transformRepositoriesTable` |
| `src/pages/analytics/components/cliInsights/CLIInsightsUserDetailsModal.tsx` | Modify | Add `branch`/`client` to `columnOrder`/`tableStyles`/`customRenderColumns`; mount cell tooltips once at table level |

---

## Task 1: Render `branch` and `client` columns

**Test-first: no.** `helpers.tsx` cell renderers have no existing unit test suite (they are
verified visually through the CLI Insights modal, same as the pre-existing
`renderRepositoryCell`/`renderClassificationCell`). This task follows that established
pattern rather than introducing a new test file for a single component.

**Files:**
- Modify: `src/pages/analytics/components/cliInsights/helpers.tsx`
- Modify: `src/pages/analytics/components/cliInsights/CLIInsightsUserDetailsModal.tsx`

---

- [x] **Step 1: Simplify `renderRepositoryCell`**

The backend no longer sends `item.branches: string[]` — branch is now a scalar `item.branch`
on each row. Drop the old branch-badge-list rendering from `renderRepositoryCell`, keep only
the repository name with a truncating tooltip:

```tsx
export const renderRepositoryCell = (item: Record<string, unknown>) => {
  const repo = getPrimitiveString(item.repository, '-')
  return (
    <div className="repo-cell-tooltip truncate" data-pr-tooltip={repo}>
      {repo}
    </div>
  )
}
```

- [x] **Step 2: Add `renderBranchCell`**

```tsx
export const renderBranchCell = (item: Record<string, unknown>) => {
  const branch = getPrimitiveString(item.branch)
  if (!branch) return <span className="text-text-secondary">-</span>
  return (
    <span
      className="branch-cell-tooltip inline-block max-w-full truncate rounded-full bg-surface-elevated px-3 py-1 text-sm text-text-secondary"
      data-pr-tooltip={branch}
    >
      {branch}
    </span>
  )
}
```

- [x] **Step 3: Add `CLIENT_CONFIG` and `renderClientCell`**

```tsx
const CLIENT_CONFIG: Record<
  string,
  { label: string; Icon: React.FC<React.SVGProps<SVGSVGElement>> }
> = {
  CLI: { label: 'CLI', Icon: TerminalSvg },
  'codemie-daemon': { label: 'CLI', Icon: TerminalSvg },
  'codemie-claude': { label: 'CLI', Icon: TerminalSvg },
  'codemie-claude-acp': { label: 'CLI', Icon: TerminalSvg },
  'codemie-code': { label: 'CLI', Icon: TerminalSvg },
  'claude-desktop': { label: 'Claude Desktop', Icon: ClaudeDesktopSvg },
}

export const renderClientCell = (item: Record<string, unknown>) => {
  const client = getPrimitiveString(item.client)
  if (!client) return <span className="text-text-secondary">-</span>
  const config = CLIENT_CONFIG[client]
  if (!config) return <span>{client}</span>
  const { label, Icon } = config
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </span>
  )
}
```

- [x] **Step 4: Wire the new columns into `CLIInsightsUserDetailsModal.tsx`**

```tsx
<TableWidget
  metricType={TabularMetricType.CLI_INSIGHTS_USER_REPOSITORIES}
  title={`Repositories (${repositoriesTable.data.rows.length})`}
  initialData={repositoriesTable}
  hidePagination
  columnOrder={[
    'repository',
    'branch',
    'classification',
    'client',
    'sessions',
    'cost',
    'net_lines',
  ]}
  tableStyles={{
    className: 'repositories-table',
    columnWidths: { repository: '220px', branch: '220px' },
  }}
  customRenderColumns={{
    repository: renderRepositoryCell,
    branch: renderBranchCell,
    classification: renderClassificationCell,
    client: renderClientCell,
  }}
/>
```

- [x] **Step 5: Verify against the backend response**

```bash
npm run dev
# Open Analytics → CLI Insights → click a user with mixed CLI + Claude Desktop activity
# Confirm: one row per (repository, branch, client); branch/client columns populated
```

- [x] **Step 6: Lint + typecheck**

```bash
npx eslint src/pages/analytics/components/cliInsights/
npx tsc --noEmit
```

---

## Task 2: Self-review fixes

**Test-first: no.** Both fixes are structural (move JSX, delete unused code); no behavior
gap that needs a regression test — verified via lint/typecheck (no dead-export references)
plus a manual check that hovering the Repositories table now shows exactly one tooltip.

**Files:**
- Modify: `src/pages/analytics/components/cliInsights/helpers.tsx`
- Modify: `src/pages/analytics/components/cliInsights/CLIInsightsUserDetailsModal.tsx`

---

- [x] **Step 1: Trace `customRenderColumns` invocation to confirm the per-row-mount bug**

```bash
grep -n "customRenderColumns\[" src/components/Table/Table.tsx
grep -n "customRender" src/components/Table/TableCell.tsx
```

Confirms `TableCell.tsx:103` calls `customRender(value, index)` once per `(row, column)` —
i.e. once per rendered cell, not once per table. A `<Tooltip>` returned from inside a cell
renderer is therefore mounted N times for an N-row table.

- [ ] **Step 2: Move both `<Tooltip>` mounts out of the cell renderers**

In `helpers.tsx`: remove the `<Tooltip target="..." />` + fragment wrapper from
`renderRepositoryCell` and `renderBranchCell`; return only the marker element
(`div.repo-cell-tooltip` / `span.branch-cell-tooltip`) with its `data-pr-tooltip` attribute.
Remove the now-unused `Tooltip` import.

In `CLIInsightsUserDetailsModal.tsx`: import `Tooltip` from `@/components/Tooltip/Tooltip`;
wrap the `repositoriesTable && (...)` block in a fragment that mounts
`<Tooltip target=".repo-cell-tooltip" appendTo={() => document.body} />` and
`<Tooltip target=".branch-cell-tooltip" appendTo={() => document.body} />` once, before
`<TableWidget>`.

- [ ] **Step 3: Delete the dead `transformRepositoriesTable`**

```bash
grep -rn "transformRepositoriesTable" src/
# confirms zero call sites outside its own definition
```

Remove the function from `helpers.tsx`. Remove the `ColumnType` / `TabularResponse` imports
it required, after confirming (`grep -n "ColumnType\|TabularResponse" helpers.tsx`) nothing
else in the file uses them.

- [x] **Step 4: Lint + typecheck**

```bash
npx eslint src/pages/analytics/components/cliInsights/
npx tsc --noEmit
```

- [x] **Step 5: Commit**

```bash
git add src/pages/analytics/components/cliInsights/
git commit -m "EPMCDME-12687: Fix duplicate tooltip mount and remove dead repositories-table code"
```
