<!-- Copyright 2026 EPAM Systems, Inc. ("EPAM") — Apache 2.0 -->
# EPMCDME-15005: View Analytics Button for Project Members

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "View analytics" icon button to each row in the Project members list that opens Analytics pre-filtered to that member, their project, and the project's current budgeting period, using a real `<Link>` so middle-click / Ctrl-click works.

**Architecture:** Two new pure utilities (`computeAnalyticsBudgetPeriod`, `getAnalyticsMemberLink`) encapsulate period resolution and URL construction. `ProjectMembersManager` fetches budget data independently for admin/project-admin and renders the button inside the existing `actions` cell using `<Link>`. A minimal `initialStickyOptions` prop threads from `AnalyticsPage` through `AnalyticsFilters` into `AnalyticsUserFilter` so the preselected member remains visible even with no activity in the chosen period.

**Tech Stack:** React 18, TypeScript 5, react-router `<Link>`, Valtio (`projectBudgetsStore`, `userStore`), `useVueRouter().resolve`, Vitest + React Testing Library.

**Commit per task using the repository's existing convention.**

## Acceptance Criteria

- Every member row shows a "View analytics" icon button in the Actions column, next to "Unassign", with `aria-label` and tooltip "View analytics for {name} in {project}".
- Button opens Analytics on the Insights tab with Project = P, User = M, and a date range spanning P's current budgeting period (longest when multiple budgets exist).
- When no period is determinable, date range falls back to Last 30 Days.
- All known filter keys (`tab`, `projects`, `users`, `time_period`, `start_date`, `end_date`) are set explicitly in the URL so no stale stored filters bleed in.
- Button renders as a real link: middle-click / Ctrl-click opens the same preselected view in a new tab.
- M remains visibly selected in the User filter even when M has no recorded activity in P during the period.
- After landing, changing or clearing filters and switching tabs behaves as today — preselection is a starting point only.
- Clicking the button does not select the row or trigger any other row action (stopPropagation).
- Button is hidden for maintainers, auditors, and regular users.
- Button is hidden when the Analytics (enterprise edition) feature is not enabled.

---

### Task 1: Period-resolution utility

**Files:**
- Create: `src/utils/analyticsBudgetPeriod.ts`
- Create: `src/utils/__tests__/analyticsBudgetPeriod.test.ts`

**Interfaces:**
- Produces: `computeAnalyticsBudgetPeriod(budgets: ProjectBudget[]): { start_date: string; end_date: string } | { time_period: TimePeriod }`

**Test-first: yes** — failing unit tests covering: daily period start (reset_at − 1 day), weekly (reset_at − 7 days), monthly (reset_at − 1 month with correct calendar boundary), multi-budget selection of the earliest start (longest period), budget with null/missing `budget_reset_at` skipped, and empty array returns `{ time_period: <30-day constant> }`. Use fixed ISO strings for determinism.

- [ ] Write the tests above in `src/utils/__tests__/analyticsBudgetPeriod.test.ts`. They should fail because the module does not exist yet.
- [ ] Run `npx vitest run --project unit src/utils/__tests__/analyticsBudgetPeriod.test.ts` and confirm failures.
- [ ] Create `src/utils/analyticsBudgetPeriod.ts` with the Apache 2.0 license header:

```typescript
import { TimePeriod } from '@/types/analytics'
import type { ProjectBudget } from '@/types/entity/projectBudget'

type PeriodResult =
  | { start_date: string; end_date: string }
  | { time_period: TimePeriod }

/** Returns the ms timestamp of the start of the current period for a single budget. */
function periodStartMs(resetAt: string, duration: string): number | null {
  const reset = new Date(resetAt).getTime()
  if (isNaN(reset)) return null
  if (duration === 'daily') return reset - 86_400_000
  if (duration === 'weekly') return reset - 7 * 86_400_000
  if (duration === 'monthly') {
    const d = new Date(resetAt)
    d.setMonth(d.getMonth() - 1)
    return d.getTime()
  }
  return null
}

/**
 * Given a project's budgets, returns {start_date, end_date} spanning the
 * longest current period (earliest computed start → its reset_at), or falls
 * back to the Last-30-Days TimePeriod constant when no valid period exists.
 *
 * Check `src/types/analytics.ts` and `src/pages/analytics/constants.ts` for
 * the correct TimePeriod enum value that represents 30 days and substitute
 * it for the placeholder below.
 */
export function computeAnalyticsBudgetPeriod(budgets: ProjectBudget[]): PeriodResult {
  let earliest: { startMs: number; resetAt: string } | null = null
  for (const b of budgets) {
    if (!b.budget_reset_at) continue
    const startMs = periodStartMs(b.budget_reset_at, b.budget_duration)
    if (startMs === null) continue
    if (!earliest || startMs < earliest.startMs) {
      earliest = { startMs, resetAt: b.budget_reset_at }
    }
  }
  if (!earliest) {
    // Replace LAST_30_DAYS with the correct TimePeriod enum member for 30 days.
    return { time_period: TimePeriod.LAST_30_DAYS }
  }
  return {
    start_date: new Date(earliest.startMs).toISOString(),
    end_date: earliest.resetAt,
  }
}
```

- [ ] Run the test again and confirm all cases pass.

---

### Task 2: Analytics member link builder

**Files:**
- Create: `src/utils/getAnalyticsMemberLink.ts`
- Create: `src/utils/__tests__/getAnalyticsMemberLink.test.ts`

**Interfaces:**
- Consumes: `computeAnalyticsBudgetPeriod` (Task 1), `ANALYTICS` from `@/constants/routes`, `AnalyticsDashboard` from `@/types/analytics`
- Produces: `getAnalyticsMemberLink(router, projectName, userId, budgets): string`
  - `router` is `ReturnType<typeof useVueRouter>` — pass the hook's return value from the caller; do not call the hook inside this function.

**Test-first: yes** — failing unit tests asserting: (a) href contains `tab=insights`, `projects=<name>`, `users=<id>`; (b) when budgets yield a period, href contains `start_date` and `end_date` but not `time_period`; (c) when no period is available, href contains `time_period` but not `start_date`/`end_date`; (d) all six keys (`tab`, `projects`, `users`, `time_period`, `start_date`, `end_date`) are either present or explicitly absent — the test must assert that the three unused keys in each branch appear in the URL as empty strings (to prevent localStorage bleed). Provide a fake `router` object: `{ resolve: vi.fn(({ query }) => ({ fullPath: '?' + new URLSearchParams(query).toString() })) }`.

**On clearing unused filter keys:** `src/utils/filters.ts:getFilters` merges URL over localStorage per key — a key absent from the URL falls back to the stored value. Passing `key=''` (empty string) in the query ensures the URL value wins and the stored value is ignored. Verify that `AnalyticsFilters` treats empty-string `start_date`/`end_date` and empty-string `time_period` as "not set" (check `cleanObject` usage in `src/pages/analytics/hooks/useAnalyticsFilters.ts`). Adjust the approach if empty string is not treated as absent.

- [ ] Write tests in `src/utils/__tests__/getAnalyticsMemberLink.test.ts`. Confirm failures.
- [ ] Run `npx vitest run --project unit src/utils/__tests__/getAnalyticsMemberLink.test.ts`.
- [ ] Create `src/utils/getAnalyticsMemberLink.ts` with the Apache 2.0 header:

```typescript
import type { useVueRouter } from '@/hooks/useVueRouter'
import { ANALYTICS } from '@/constants/routes'
import { AnalyticsDashboard } from '@/types/analytics'
import type { ProjectBudget } from '@/types/entity/projectBudget'
import { computeAnalyticsBudgetPeriod } from './analyticsBudgetPeriod'

/**
 * Builds the full analytics href for a project member, setting every known
 * filter key explicitly so no stale localStorage value bleeds in.
 *
 * NOTE on userId: pass `UserListItem.id`. Verify this matches the `id` field
 * returned by `GET v1/analytics/users` (what `formatUserOptions` uses as the
 * option value). If they differ, resolve the correct id via
 * `userStore.getAnalyticsUsers` before calling this function.
 */
export function getAnalyticsMemberLink(
  router: ReturnType<typeof useVueRouter>,
  projectName: string,
  userId: string,
  budgets: ProjectBudget[],
): string {
  const period = computeAnalyticsBudgetPeriod(budgets)
  const hasBudgetPeriod = 'start_date' in period

  const query: Record<string, string> = {
    tab: AnalyticsDashboard.insights,
    projects: projectName,
    users: userId,
    start_date: hasBudgetPeriod ? period.start_date : '',
    end_date: hasBudgetPeriod ? period.end_date : '',
    time_period: hasBudgetPeriod ? '' : String(period.time_period),
  }
  return router.resolve({ name: ANALYTICS, query }).fullPath
}
```

- [ ] Run the tests and confirm all pass.

---

### Task 3: Preselected-user sticky seed (AC 6)

**Files:**
- Modify: `src/pages/analytics/components/AnalyticsUserFilter.tsx`
- Modify: `src/pages/analytics/components/AnalyticsFilters.tsx`
- Modify: `src/pages/analytics/AnalyticsPage.tsx`
- Test: `src/pages/analytics/components/__tests__/AnalyticsUserFilter.test.tsx`

**Interfaces:**
- `AnalyticsUserFilter` gains `initialStickyOptions?: Array<{ label: string; value: string }>` prop
- `AnalyticsFilters` gains `initialUserOptions?: Array<{ label: string; value: string }>` prop

**Test-first: yes** — add a failing test to `AnalyticsUserFilter.test.tsx`: render `<AnalyticsUserFilter value={['user-xyz']} userOptions={[]} initialStickyOptions={[{ value: 'user-xyz', label: 'Jane Doe' }]} onChange={vi.fn()} />` and assert that the chip text "Jane Doe" is visible. Confirm the test fails.

- [ ] Add the failing test to `src/pages/analytics/components/__tests__/AnalyticsUserFilter.test.tsx` and run it.
- [ ] `src/pages/analytics/components/AnalyticsUserFilter.tsx`: add `initialStickyOptions` to the props interface. Add a `useEffect` with `[]` dependency that iterates `initialStickyOptions` and calls `setStickyOptions(prev => { const m = new Map(prev); opts.forEach(o => m.set(o.value, o)); return m; })` — same pattern as the existing options-sync effect at lines 119-128.
- [ ] `src/pages/analytics/components/AnalyticsFilters.tsx`: add `initialUserOptions?: Array<{ label: string; value: string }>` to `AnalyticsFiltersProps` (line 37-40). Pass it to `<AnalyticsUserFilter initialStickyOptions={initialUserOptions} ...>`.
- [ ] `src/pages/analytics/AnalyticsPage.tsx`: after `useAnalyticsFilters()` (line ~56), add a `useState<Array<{ label: string; value: string }>>([])` for `seedUserOptions` and a `useRef(false)` for a run-once guard. In a `useEffect` that depends on `[]`, when `filters.users` is non-empty on mount, call `userStore.getAnalyticsUsers({ projects: filters.projects })` (project-scoped, no time filter — broadest scope, maximising the chance M appears even with no activity in the current period). Build option objects matching `formatUserOptions` output for the matching IDs and write them to `seedUserOptions`. Pass `seedUserOptions` to `<AnalyticsFilters initialUserOptions={seedUserOptions} ...>` at line ~130.
- [ ] Run the `AnalyticsUserFilter.test.tsx` test and confirm it passes.

---

### Task 4: "View analytics" button in ProjectMembersManager

**Files:**
- Modify: `src/pages/settings/administration/projectsManagement/ProjectMembersManager.tsx`
- Create: `src/pages/settings/administration/projectsManagement/__tests__/ProjectMembersViewAnalytics.integration.test.tsx`

**Interfaces:**
- Consumes: `getAnalyticsMemberLink` (Task 2), `isEnterpriseEdition()` from `@/utils/featureFlags` (or `useFeatureFlag(FEATURE_FLAGS.ENTERPRISE_EDITION)` — use whichever pattern this file already uses for feature-flag checks), `projectBudgetsStore.listProjectBudgets`, `useVueRouter`, `<Link>` from `react-router`.
- Icon: `import AnalyticsSvg from '@/assets/icons/diagram-duotone.svg?react'` — the same SVG the sidebar nav uses (see `src/components/Navigation/NavigationSection/NavigationLink.tsx:25`). Add this import to the top of `ProjectMembersManager.tsx` alongside the other SVG imports.

**Test-first: yes** — create `ProjectMembersViewAnalytics.integration.test.tsx` with failing tests:
1. Admin + enterprise enabled: a "View analytics" `<a>` element exists in each member row.
2. Maintainer (canManageProject = false): no "View analytics" element present.
3. Admin + enterprise disabled: no "View analytics" element present.
4. Row isolation (AC 9): clicking the "View analytics" link does not call the table's `onRowClick` callback.
5. href shape: the link's `href` contains `tab=insights`, `projects=<projectName>`, `users=<memberId>`.
6. Budget fetch: `projectBudgetsStore.listProjectBudgets` is called with `{ projectName }` when viewer is admin.

Use the integration test helpers in `src/test-utils/integration.tsx` and the same mock patterns as `ProjectMembersSpending.test.tsx` (real `ProjectMembersManager`, `vi.spyOn` on stores). Override the global `useVueRouter` mock locally to capture the `query` argument (the global mock at `src/hooks/__mocks__/useVueRouter.ts` ignores `query`).

- [ ] Write all six failing tests. Run `npx vitest run --project unit src/pages/settings/administration/projectsManagement/__tests__/ProjectMembersViewAnalytics.integration.test.tsx` and confirm failures.
- [ ] `ProjectMembersManager.tsx` — budget state (near the existing store snapshot reads, around line 250-265): add `const [memberBudgets, setMemberBudgets] = useState<ProjectBudget[]>([])`. Add a `useEffect` guarded by `canManageProject` that calls `projectBudgetsStore.listProjectBudgets({ projectName: project.name })` and writes the result to `memberBudgets`. **This state is completely independent of the `budgets` prop and must not change `showBudgets` or the budget column in any way.**
- [ ] `ProjectMembersManager.tsx` — actions cell (`customRenderColumns`, `actions` case, lines ~590-617): inside the existing `stopPropagation` wrapper div, add the link **first — before the Unassign button** (leftmost action in the cell), guarded by `isEnterpriseEdition()` (or the equivalent check already used in this file):

```tsx
{isEnterpriseEdition() && (
  <Link
    to={getAnalyticsMemberLink(router, project.name, row.id, memberBudgets)}
    aria-label={`View analytics for ${row.name ?? row.username} in ${project.name}`}
    data-tooltip-id="react-tooltip"
    data-tooltip-content={`View analytics for ${row.name ?? row.username} in ${project.name}`}
    onClick={(e) => e.stopPropagation()}
    onKeyDown={(e) => e.stopPropagation()}
    className="..."
  >
    <AnalyticsSvg className="..." />
  </Link>
)}
```

Match the sizing, spacing, and button style of the Unassign button. Call `router` from `useVueRouter()` near the top of the component (already used elsewhere in this file for navigation).

- [ ] `ProjectMembersManager.tsx` — column widths (`getColumnDefinitions`, lines 131-197): check that the `actions` column in the `canManage=true` variant is wide enough for two icon buttons. Increase only the `actions` width if needed, reducing another column proportionally so widths still sum to 100%. Do not touch the `canManage=false` path.
- [ ] Run the six integration tests and confirm all pass. Then run `npx vitest run --project unit` to confirm no regressions.

---

## Negative-constraint pass

| Constraint | Source | Honoured by |
|---|---|---|
| No "View analytics" for maintainer / auditor / regular user (AC 10) | AC 10 | Task 4: button is inside the `actions` cell that only renders when `canManageProject` (admin or project-admin). Maintainers and auditors never see it. |
| No button on non-enterprise (AC 11) | AC 11 | Task 4: additional `isEnterpriseEdition()` guard inside the cell — Unassign is unaffected. |
| Clicking button must not select row or trigger row actions (AC 9) | AC 9 | Task 4: `onClick`/`onKeyDown` stopPropagation on the `<Link>`. |
| Budget column must stay maintainer-only | Resolved research | Task 4: `memberBudgets` state is independent of the `budgets` prop, `showBudgets`, and `ProjectDetailsPage` wire-up at lines 298/312 — none of those are touched. |
| Always Insights tab — never another landing tab | Out of scope | Task 2: `tab` hardcoded to `AnalyticsDashboard.insights`. |
| No project-level analytics shortcut | Out of scope | No task adds a project-level button anywhere. |
| No shortcuts from other screens | Out of scope | Only `ProjectMembersManager` is modified in the settings layer. |
| No budget limits/spending shown in Analytics | Out of scope | No Analytics data display components are changed. |
| No multi-member selection | Out of scope | One button per row; no bulk selection added. |
| No change to backend auth / analytics data scope | Out of scope | No store write paths, API endpoints, or backend files are modified. |
| `handleTabChange` existing behaviour unchanged | Out of scope | Task 3 does not touch `AnalyticsDashboard.tsx:handleTabChange`. |

`negative-constraints: none additional — all sourced from AC 9/10/11, resolved research, and the Out-of-scope list above.`
