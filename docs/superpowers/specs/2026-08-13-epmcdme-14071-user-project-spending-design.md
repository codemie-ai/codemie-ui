# User Project Spending — Design

**Date**: 2026-08-13
**Status**: Approved (design), pending implementation
**Scope**: Frontend only. Backend endpoints do not exist yet; this document defines the contract the frontend will code against (see the companion backend handoff).

---

## 1. Problem

Administrators can see *how much* a user spends, but not *where*. Two gaps:

| Page | Today | Gap |
|---|---|---|
| `/settings/administration/users` | "Budgets" column shows each user's **global** spend per category | No per-project breakdown of that spend |
| `/settings/administration/projects/:projectName` | Members table shows `allocated_max_budget` (the **limit**) | Actual spend of the member in the project is absent entirely |

Goal: surface **per-project spending for a user** on the users page (via an expandable nested table), and **the member's spend in this project** on the project details page (via a new column).

---

## 2. Constraints discovered in the codebase

These are load-bearing; the design is shaped around them.

### 2.1 The spending domain already exists — reuse it

- `BudgetCategory = 'platform' | 'cli' | 'premium_models'` — `src/types/entity/budget.ts:16`
- `BudgetAssignment` already carries `current_spending`, `max_budget`, `budget_duration`, `budget_reset_at` — `budget.ts:43`
- `BudgetSpendCell` renders per-category `spend / limit` with threshold coloring — `src/pages/settings/administration/components/BudgetSpendCell.tsx`
- `getHardLimitSpendColor(spend, limit)` / `calculateHardLimitPercentage` — `src/pages/settings/administration/projectsManagement/components/budgetSpending.ts`
- Thresholds `SPENDING_WARNING_THRESHOLD = 50`, `SPENDING_DANGER_THRESHOLD = 75` — `src/pages/settings/components/SpendingTable.tsx:23`

No new money model is introduced.

### 2.2 Stack

Valtio `proxy` stores in `src/store/` + fetch wrapper `@/utils/api`. **Not** RTK Query, not Redux, not TanStack Table. Rule from `.ai-run/guides/patterns/state-management.md`: **Component → Store → API**, responses parsed with `await response.json()`, no `api.*` calls inside components.

### 2.3 The `Table` memo comparator is a landmine

`src/components/Table/Table.tsx` is exported as `memo(Table, propsAreEqual)`. `propsAreEqual`
(`src/components/Table/utils.ts:52`) **whitelists props by name** and returns `true` (equal → skip
render) for anything it does not explicitly compare.

**Consequence**: adding `expandedRowIds` / `onToggleExpand` / `renderExpandedRow` without updating
`propsAreEqual` means expansion state changes will **not re-render the table**. The feature would
silently do nothing while all unit tests of the child components pass.

`propsAreEqual` MUST be extended in the same commit. This is the highest-risk item in the change.

### 2.4 `_meta.customRender` is dead code — do not use

`Table.tsx:174` contains `if (value._meta?.customRender) return value._meta?.customRender(value)`.
Zero call sites feed it into `<Table>` anywhere in the repo. It is untyped (relies on implicit `any`),
untested, and replaces the entire `<tr>`, which conflicts with the rounded-corner / border logic in
`TableCell.tsx`. Rejected as the expansion mechanism.

### 2.5 Precedent for a table inside a table

`UserProjectsTable` (`src/pages/settings/administration/usersManagement/components/UserProjectsTable.tsx`)
already renders `user.projects` as `<Table embedded>` inside `UserDetailsPopup`. The `embedded` prop
disables the fixed-position pagination and the min-height scroll container. The nested sub-table
follows this proven pattern.

### 2.6 Row-click vs. expand chevron

`handleRowClick` (`Table.tsx:116`) ignores clicks landing on `button, a, input, [role="button"], [role="link"]`.
An expand chevron rendered as a `<button>` therefore will **not** trigger row selection. No special
handling needed.

### 2.7 Hardcoded column widths on the project page

`getColumnDefinitions` in `ProjectMembersManager.tsx:132-195` builds widths as hardcoded percentage
Tailwind classes through `if/else if` chains at `:143-159`, under `tableClassName="table-fixed"`.
Adding a column requires rebalancing those percentages by hand.

---

## 3. API contract

Reuses the existing analytics tabular shape (the same mechanism `SpendingCard` uses for personal
spending via `TabularMetricType.KEY_SPENDING`), so no new response plumbing is needed.

Transport: `GET v1/analytics/{metric}` → `TabularResponse` (`src/types/analytics.ts:176`):

```ts
interface TabularResponse {
  data: { columns: ColumnDefinition[]; rows: Record<string, unknown>[]; totals?: Record<string, unknown> | null }
  metadata: ResponseMetadata
  pagination: AnalyticsPagination
}
```

### 3.1 New metric types

Added to `TabularMetricType` (`src/types/analytics.ts:190`):

```ts
USER_PROJECT_SPENDING   = 'user-project-spending'
PROJECT_MEMBER_SPENDING = 'project-member-spending'
```

### 3.2 `user-project-spending` — users page nested rows

**Request** — `GET /v1/analytics/user-project-spending?users=<email>`

| Param | Type | Notes |
|---|---|---|
| `users` | `string[]` | Existing analytics param. Exactly one email in this use case. |

No `time_period` / `start_date` / `end_date` is sent. Spend is scoped to the **current budget cycle**
(see §3.4).

**Response** — one row per project the user belongs to:

```jsonc
{
  "data": {
    "columns": [
      { "id": "project_name",   "label": "Project",        "type": "string", "format": null },
      { "id": "platform",       "label": "Platform",       "type": "number", "format": "currency" },
      { "id": "cli",            "label": "CLI",            "type": "number", "format": "currency" },
      { "id": "premium_models", "label": "Premium models", "type": "number", "format": "currency" }
    ],
    "rows": [
      {
        "project_name": "project-6",
        "display_name": "Project 6",
        "platform": 120.50,
        "cli": 40.00,
        "premium_models": 12.50,
        "platform_limit": 500.00,
        "cli_limit": 100.00,
        "premium_models_limit": 50.00
      }
    ]
  },
  "metadata": { "timestamp": "...", "data_as_of": "..." },
  "pagination": { "page": 0, "per_page": 50, "total_count": 2, "has_more": false }
}
```

### 3.3 `project-member-spending` — project details column

**Request** — `GET /v1/analytics/project-member-spending?projects=<name>&page=<n>&per_page=<n>`

**Response** — one row per member, same category fields, keyed by `user_id`:

```jsonc
{
  "data": {
    "columns": [ /* user_id, platform, cli, premium_models */ ],
    "rows": [
      {
        "user_id": "u-1",
        "platform": 120.50, "cli": 40.00, "premium_models": 12.50,
        "platform_limit": 500.00, "cli_limit": 100.00, "premium_models_limit": 50.00
      }
    ]
  }
}
```

The frontend joins these rows onto the existing member rows by `user_id`.

### 3.4 Contract rules

1. **No `total` column.** Categories only. (Explicit product decision.)
2. **Current budget cycle only.** Values are spend since the active budget period began — the same
   window the existing "Budgets" column reflects. No period selector in this scope.
3. **`columns[]` is authoritative.** The sub-table renders generically from `columns`, so the backend
   can add a fourth category without a frontend release. `format: "currency"` drives rendering via
   the shared formatter.
4. **`*_limit` fields are optional.** `null`/absent means "no limit set" → render `-` for the limit
   and apply no threshold color (matching `getHardLimitSpendColor`, which returns `null` when
   `hardLimit == null || <= 0`).
5. **Spend of `0` is meaningful** and must be returned as `0`, not omitted — it renders `$0.00`.
   A project the user belongs to with no spend still gets a row.
6. **A user with no projects** returns `rows: []` (HTTP 200, not 404).
7. **Amounts are numbers**, not preformatted strings. Currency is USD, consistent with the rest of
   the admin UI.
8. **Authorization** mirrors the existing Budgets column: visible only to users who pass the same
   `canManageBudgets` check (`budgetManagement` feature flag AND `isMaintainer`).

---

## 4. Fetch strategy

**Lazy, on expand, cached per user id for the page's lifetime.**

Rationale:
- The users list is paginated (20+ rows). Eagerly embedding per-project spend for every user would
  multiply the list payload for data that is collapsed by default.
- `GET v1/admin/users` stays untouched, so `ProjectMembersManager` and every other consumer are
  unaffected.
- Cost: a brief spinner inside the expanded row. Acceptable — the row is already visually distinct
  while loading.

Cache: a `Map<userEmail, rows>` module-level to the sub-table component. Re-expanding a previously
opened row is instant and issues no second request. Collapsing does not evict.

The project details page fetches its member-spending rows **once**, alongside the existing members
fetch, since that column is always visible.

---

## 5. Frontend design

### 5.1 `Table` expansion support (`src/components/Table/`)

Three additive, optional props on `TableProps<T>`:

```ts
expandedRowIds?: ReadonlyArray<string>
onToggleExpand?: (id: string) => void
renderExpandedRow?: (item: T) => React.ReactNode
```

Behavior:
- When `onToggleExpand` is provided, a leading chevron `<button>` is rendered in the first cell.
- After an expanded row's `<tr>`, a second `<tr>` is emitted containing a single
  `<td colSpan={columnDefinitions.length}>` holding `renderExpandedRow(item)` — the same `colSpan`
  mechanism `EmptyList.tsx` already uses.
- The expansion `<tr>` is excluded from the `isLastRow` rounded-corner calculation so the card's
  bottom corners stay correct.
- **`propsAreEqual` in `utils.ts` gains comparisons for all three new props** (§2.3). `expandedRowIds`
  compared with `isEqual`, the two callbacks by reference.

Accessibility: chevron button carries `aria-expanded` and an `aria-label`
(`Show projects for <user>` / `Hide projects for <user>`), per `.ai-run/guides/patterns/accessibility-patterns.md`.

### 5.2 `UserProjectSpendingTable` (new)

Nested sub-table rendered inside the expanded row. Props: `{ userEmail }` — the analytics `users[]`
param is keyed by email, not id. Renders `<Table embedded>` following the `UserProjectsTable`
precedent.

- Columns built from the response `columns[]`.
- Loading → `<Spinner />`; error → `InfoWarning`; empty → `EmptyList` ("No project spending").
- Each amount cell: shared `formatCurrency`, colored by `getHardLimitSpendColor(spend, limit)` when a
  limit exists, with the limit shown as a `react-tooltip` (`data-tooltip-id='react-tooltip'`).

### 5.3 Users page (`UsersManagementPage.tsx`)

- Local `expandedRowIds` state + `onToggleExpand` handler wired to `<Table>`.
- `renderExpandedRow={(user) => <UserProjectSpendingTable userId={user.id} />}`.
- The existing "Budgets" column is unchanged.
- Expansion is gated behind the same `canManageBudgets` check as the Budgets column.

### 5.4 Project details page (`ProjectMembersManager.tsx`)

- Rename `Budget Allocations` → **`Allocated`**.
- Add a new **`Spending`** column showing the member's per-category spend in this project.
- Rebalance the hardcoded width chains at `:143-159` (§2.7).
- The `Spending` column appears under the same `showBudgets` condition as `Allocated`.

### 5.5 Store (`src/store/analytics.ts`)

Two methods on the existing analytics store, following the established async pattern
(`loading = true` → `try` → `await response.json()` → `catch` sets `error` → `finally`):

```ts
fetchUserProjectSpending(userEmail: string): Promise<TabularResponse | null>
fetchProjectMemberSpending(projectName: string): Promise<TabularResponse | null>
```

Both delegate to the existing `fetchTabularData(type, params)`, so cancellation and error handling
come for free.

### 5.6 Shared `formatCurrency` (in-scope cleanup)

`formatCurrency` is duplicated in **six** files. `ProjectDetailsPage.tsx:46` is inconsistent — it uses
`toFixed(2)`, rendering `$1234.50` where every other copy renders `$1,234.50`.

Extract the canonical implementation to `src/utils/currency.ts`:

```ts
export const formatCurrency = (value: number): string =>
  `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const formatSpend = (value: number | null | undefined): string =>
  value == null ? '-' : formatCurrency(value)
```

Replace all six copies, fixing the `ProjectDetailsPage` inconsistency. Justified as targeted
improvement to code being touched: both pages in scope render currency. No unrelated refactoring.

---

## 6. Error handling

| Condition | Behavior |
|---|---|
| Spending request fails | Sub-table shows `InfoWarning`; parent row and rest of table unaffected. No global toast — a collapsed-row failure must not disrupt the page. |
| User has no projects | `EmptyList` inside the expanded row. |
| Limit absent/null | Render spend only; no threshold color. |
| Project page request fails | `Spending` cells render `-`; members table still functions. |
| Slow response | `<Spinner />` inside the expanded row; chevron stays interactive so the row can be collapsed mid-flight. |

---

## 7. Testing

Following `.ai-run/guides/testing/` and the existing integration-test precedent at
`src/pages/settings/administration/__tests__/AdminTablesPagination.integration.test.tsx`.

**`Table` expansion (unit)**
- Chevron toggles the expansion row in/out.
- **Regression guard for §2.3**: changing only `expandedRowIds` re-renders the memoized table. This
  test fails against the un-updated `propsAreEqual` and is the primary defense for the landmine.
- Chevron click does not trigger row selection.
- `colSpan` equals the column count.

**`UserProjectSpendingTable` (unit)** — loading, error, empty, populated; threshold color applied
only when a limit exists; `$0.00` renders for zero spend.

**`formatCurrency` (unit)** — thousands separators, two fraction digits, `null` → `-`.

**Users page (integration)** — expanding issues exactly one request; re-expanding issues none
(cache); two rows expand independently.

**Project page (integration)** — `Spending` column renders joined values; header reads `Allocated`
and `Spending`.

---

## 8. Out of scope

- Backend implementation (see companion handoff).
- Sorting or filtering by spending.
- Time-period selection — current budget cycle only (§3.4.2).
- A `total` column (§3.4.1).
- Drill-down from a nested row into per-assistant/per-model detail.
- Changes to how budgets are assigned or allocated.

---

## 9. Files affected

| File | Change |
|---|---|
| `src/components/Table/Table.tsx` | Add 3 optional expansion props; emit expansion `<tr>` |
| `src/components/Table/utils.ts` | **Extend `propsAreEqual`** (§2.3) |
| `src/types/analytics.ts` | 2 new `TabularMetricType` members |
| `src/types/entity/userProjectSpending.ts` | New row types |
| `src/store/analytics.ts` | 2 fetch methods + per-user cache |
| `src/utils/currency.ts` | **New** shared formatter |
| `src/pages/.../usersManagement/components/UserProjectSpendingTable.tsx` | **New** sub-table |
| `src/pages/settings/administration/UsersManagementPage.tsx` | Expansion state + wiring |
| `src/pages/.../projectsManagement/ProjectMembersManager.tsx` | Rename column, add `Spending`, rebalance widths |
| `src/pages/settings/administration/ProjectDetailsPage.tsx` | Use shared `formatCurrency` |
| + 4 files with duplicated `formatCurrency` | Replace with shared import |
