# Technical Analysis — Budget Stopped Indicator

**Date:** 2026-08-25
**Feature area:** project budgets / budget-cards / inactive-budget-indicator
**Branch:** EPMCMDE-13960_inactive-projects-budget-stop

---

## Codebase Findings

### Budget card rendering pipeline

The project budget cards are rendered on the project detail page through this chain:

1. **`src/pages/settings/administration/ProjectDetailsPage.tsx`** — page entry point. Renders `<ProjectBudgetsSection>` when `canViewBudgets` is true (lines 247–255). Passes `projectName`, `spendingRows`, `onBudgetsChanged`, and `mode`.

2. **`src/pages/settings/administration/projectsManagement/ProjectBudgetsSection.tsx`** — section container. Calls `projectBudgetsStore.listProjectBudgets({ projectName })` on mount. Builds `budgetByCategory` map (keyed by `BudgetCategory`). Renders `<ProjectBudgetCard>` for each of the three categories — `variant="assigned"` when a budget exists, `variant="empty"` otherwise (lines 178–195).

3. **`src/pages/settings/administration/projectsManagement/components/ProjectBudgetCard.tsx`** — the card UI itself. Has two sub-components: `EmptyCard` (no budget) and `AssignedCard` (budget present). The `AssignedCard` is where the indicator should appear. It already shows category label, spend amount, sync-status dot, hard/soft limits, reset period, and a "View covered premium models" link.

### Budget data structure — `is_active` field

`is_active` does **not** currently exist in any budget-related TypeScript type:

- **`src/types/entity/budget.ts`** — `Budget` interface has no `is_active`
- **`src/types/entity/projectBudget.ts`** — `ProjectBudget` interface has no `is_active`
- **`src/types/entity/projectBudgetGroup.ts`** — `ProjectBudgetGroup` and `CategoryBudgetDetail` have no `is_active`

The field must be added to `ProjectBudget` (the type surfaced in budget cards). It should be typed `is_active?: boolean` (optional, to stay backward-compatible with API responses that predate the field).

### Existing budget display components

Key files:

| File | Role |
|---|---|
| `src/pages/settings/administration/projectsManagement/components/ProjectBudgetCard.tsx` | Card UI — where the indicator goes |
| `src/pages/settings/administration/projectsManagement/ProjectBudgetsSection.tsx` | Section that loads budgets and renders cards |
| `src/pages/settings/administration/projectsManagement/components/budgetSpending.ts` | Spend color helpers (`getHardLimitSpendColor`, `calculateHardLimitPercentage`) |
| `src/store/projectBudgets.ts` | Store — calls `v1/admin/project-budgets` and maps the JSON into `ProjectBudget[]` |
| `src/types/entity/projectBudget.ts` | `ProjectBudget` type — needs `is_active` added |

### Styling patterns for status indicators

Red/error text tokens already used in this codebase:

| Token | Usage context |
|---|---|
| `text-text-error` | Form errors, required-field markers, inline alerts |
| `text-failed-secondary` | Budget category-table soft-limit validation, MCP YAML errors, input error messages |
| `text-text-warning` | Budget `SyncStatusBadge` for `pending` sync status |
| `text-text-error` | Budget `SyncStatusBadge` for `failed` sync status |

The closest match already inside `ProjectBudgetCard.tsx` is `SYNC_STATUS_CONFIG.failed.className = 'text-text-error'`. For a "Budget Stopped" warning label `text-text-error` or `text-failed-secondary` are both established tokens. `text-failed-secondary` is slightly more prominent (used for inline error text on form components); `text-text-error` is the same semantic but used inline in status badges.

The `BudgetCategoryTable.tsx` pattern for an exceeded-limit inline message is:

```tsx
{condition && (
  <span className="text-xs text-failed-secondary">Label text</span>
)}
```

That is the closest existing pattern in the budget UI for a conditional red status text line.

For a compact inline badge approach, `StatusBadge` (`src/components/StatusBadge.tsx`) with `StatusEnum.Error` produces `bg-failed-tertiary text-failed-secondary border-failed-secondary` styling.

### Budget data flow from API to UI

```
GET v1/admin/project-budgets?project_name=<name>
  → ProjectBudgetListResponse { items: ProjectBudget[] }
  → projectBudgetsStore.projectBudgets (Valtio proxy)
  → ProjectBudgetsSection.loadBudgets() → local state: budgets[]
  → ProjectBudgetCard variant="assigned" receives budget: ProjectBudget
```

The store at `src/store/projectBudgets.ts` does a direct `(await response.json()) as ProjectBudgetListResponse`. No field transformation happens — every field the API returns flows straight through to the component, so adding `is_active` to the TypeScript interface is sufficient once the API sends it.

---

## Risk Indicators

1. **`is_active` not yet in the type.** The field is absent from `ProjectBudget` in `src/types/entity/projectBudget.ts`. Reading `budget.is_active` without adding it causes a TypeScript error that blocks the build.

2. **Optional vs required.** If `is_active` is typed as required (`boolean`, not `boolean | undefined`) and the existing API does not return it for every project budget, all project detail pages that render budgets will break silently (the field will be `undefined`, truthy check `is_active === false` will not fire, but strict type-check may fail during CI).

3. **`ProjectBudgetCreatePayload` / `ProjectBudgetUpdatePayload`.** These payloads in `projectBudget.ts` currently carry only the fields the user can set. If `is_active` becomes server-controlled (not user-settable), it must not be added to the payload interfaces — only to `ProjectBudget` (the response type). Adding it to payloads by mistake could cause unintended API writes.

4. **`CategoryBudgetDetail` in `projectBudgetGroup.ts`** also represents per-category budget info. If the groups API also starts returning `is_active`, the type there may need updating too — but the current feature scope is the card on `ProjectDetailsPage`, which uses `ProjectBudget`, not `CategoryBudgetDetail`.

5. **No test coverage for the card indicator.** `ProjectBudgetsSection` does not have a dedicated test file. The nearest test is `ProjectMembersSpending.test.tsx`. Adding the indicator without a test will be flagged by QA gates.

---

## Implementation Notes

### Pattern to follow

Conditional inline text alongside the existing budget header info — matching `BudgetCategoryTable`'s soft-limit exceeded message:

```tsx
{budget.is_active === false && (
  <span className="text-xs text-failed-secondary">Budget Stopped</span>
)}
```

Place this inside `AssignedCard` in `ProjectBudgetCard.tsx`, in the header row after the category label (line 172 area), or immediately below the spend line — whichever keeps the card scannable.

### Minimal changeset

1. **`src/types/entity/projectBudget.ts`** — add `is_active?: boolean` to `ProjectBudget` interface (not to the payload interfaces).

2. **`src/pages/settings/administration/projectsManagement/components/ProjectBudgetCard.tsx`** — inside `AssignedCard`, add a conditional `<span className="text-xs text-failed-secondary">Budget Stopped</span>` guarded by `budget.is_active === false`.

No store change needed (JSON pass-through). No routing change needed. No new component needed.

### Placement in `AssignedCard`

The top row of the card (lines 165–215) has the category label + spend amount on the left and action icons on the right. The most natural placement for the indicator is either:

- **Inline in the left side**, right after the category label `div` (line 172) — so the card reads "Platform · Budget Stopped"
- **Below the header row**, as a standalone text line before the grid of limits

The inline placement is the lower-risk option: it reuses existing flex layout without touching the grid below.
