# EPMCDME-14347 Analytics Access and Graceful Degradation (UI) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Analytics nav item/route available to every authenticated user, restore origin/main tab-visibility rules by removing the branch-only `metricsAnalytics` gate, and add regression coverage for empty/zero successful analytics responses.

**Architecture:** Collapse `isAnalyticsAccessible` to an auth-only check; strip `isMetricsAnalyticsEnabled`/`isMetricsAnalyticsLoaded` plumbing from `AnalyticsPage`/`AnalyticsDashboard` so Insights/CLI Insights render unconditionally and the other four tabs keep their existing untouched rules; delete the `METRICS_ANALYTICS` constant repo-wide; verify/harden empty-state rendering in the four ES widgets and CLI Analytics hook/view layer.

**Tech Stack:** React, TypeScript, Vitest, @testing-library/react, valtio.

**Commit per task using the repository's existing convention.** This worktree has 2 pre-existing unrelated untracked SDLC-state files — never `git add -A`/`git add .`; every commit in this plan uses explicit path-scoped `git add <files>`.

## Global Constraints

- Do not touch `FeatureGuard`-wrapped routes (`ANALYTICS_NEW_DASHBOARD`, `ANALYTICS_EDIT_DASHBOARD`) or any Schedulers-related `router.tsx` lines.
- Do not touch codemie-sdk or the CLI Analytics `.env`→`customer-config.yaml` migration.
- Do not change Auditor behavior, or the CLI Analytics / AI-Run Adoption / Leaderboard / custom-dashboard rules' logic.
- Scope requirement 4 to defensive rendering only — no visual redesign.

## Acceptance criteria

- [ ] Analytics nav item and `/analytics` route render for any authenticated user (narrowest role through Admin/Project Admin/Auditor), regardless of Enterprise/connector availability.
- [ ] `FeatureGuard`-wrapped dashboard-form routes remain gated on `ENTERPRISE_EDITION`, unchanged.
- [ ] Insights and CLI Insights tabs render unconditionally for every authenticated user.
- [ ] CLI Analytics, AI/Run Adoption, Leaderboard, and custom-dashboard tab rules are byte-for-byte the same predicate as before this change (minus the `isMetricsAnalyticsEnabled` conjunct on custom dashboards).
- [ ] `features:metricsAnalytics` / `METRICS_ANALYTICS` has zero remaining references anywhere in `src/` (source or tests), confirmed by an exhaustive case-insensitive grep.
- [ ] The stale-tab redirect effect in `AnalyticsDashboard.tsx` compiles and runs with no reference to a removed variable.
- [ ] `TableWidget`, `MetricsWidget`, `DonutChartWidget`, `BarChartWidget`, and the CLI Analytics hook/view layer each render a stable empty/zero state (no crash, no `undefined`/`NaN`) for an empty/zero-shaped 200 response, each backed by a regression test.

---

### Task 1: Collapse `isAnalyticsAccessible` to an authentication-only check

**Files:**
- Modify: `src/utils/analyticsAccess.ts:26-29`
- Test: `src/utils/__tests__/analyticsAccess.test.ts` (full rewrite)

**Interfaces:**
- Produces: `isAnalyticsAccessible(user: User | null): boolean` — drops the `configs: readonly ConfigItem[]` parameter entirely (no longer reads Enterprise/CLI-Analytics config).

- [ ] **Step 1: Rewrite the test file to assert the new predicate**

Replace the whole file's test bodies with two cases: `isAnalyticsAccessible(user)` returns `true` for any non-null `User` (use a minimal fixture, no `isAdmin`/`projects` needed), and `false` for `null`.

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npx vitest run src/utils/__tests__/analyticsAccess.test.ts`
Expected: FAIL — current signature still takes `configs` and old predicate returns `false` for a non-Enterprise, non-admin user.

- [ ] **Step 3: Implement the collapsed predicate**

```ts
export const isAnalyticsAccessible = (user: User | null): boolean => user !== null
```
Remove the now-unused `FEATURE_FLAGS`, `ConfigItem`, `isConfigItemEnabled`, `isUserProjectAdmin` imports from this file.

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npx vitest run src/utils/__tests__/analyticsAccess.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

`git add src/utils/analyticsAccess.ts src/utils/__tests__/analyticsAccess.test.ts`

Test-first: yes — analyticsAccess.test.ts rewritten to assert `isAnalyticsAccessible(user)` is `true` for any authenticated user and `false` for `null`, failing against the old two-arg Enterprise/CLI-Analytics predicate.

---

### Task 2: Update `useAnalyticsAccessible` call site and rewrite `AnalyticsGuard.test.tsx`

**Files:**
- Modify: `src/hooks/useFeatureFlags.ts:143-148`
- Test: `src/components/__tests__/AnalyticsGuard.test.tsx` (full rewrite)

**Interfaces:**
- Consumes: `isAnalyticsAccessible(user: User | null): boolean` from Task 1.
- Produces: `useAnalyticsAccessible(): boolean` — unchanged return type, now derived from `user` alone (keeps `AnalyticsGuard`/`Navigation.tsx` call sites untouched, smallest diff; `AnalyticsGuard` stays as a thin wrapper so `router.tsx`'s `/analytics` route wiring needs no edit).

- [ ] **Step 1: Rewrite `AnalyticsGuard.test.tsx`**

Replace the four existing cases with two: a non-null `user` (any role, no Enterprise/CLI-Analytics config) renders `children` without throwing; a `null` user causes `render` to throw the existing 404-shaped `Error` (`status: 404, statusText: 'Not Found', internal: false, data: null`). Keep the existing `vi.mock('@/hooks/useFeatureFlags', ...)` / store-mocking pattern from the current file.

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npx vitest run src/components/__tests__/AnalyticsGuard.test.tsx`
Expected: FAIL — `useAnalyticsAccessible` still calls the two-arg `isAnalyticsAccessible(configs, user)`, which no longer type-checks/matches after Task 1.

- [ ] **Step 3: Update the hook**

`src/hooks/useFeatureFlags.ts:143-148` — drop the `appInfoStore` snapshot and the `configs` argument; call `isAnalyticsAccessible(user as User | null)` inside the `useMemo`, dependency array `[user]`.

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npx vitest run src/components/__tests__/AnalyticsGuard.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

`git add src/hooks/useFeatureFlags.ts src/components/__tests__/AnalyticsGuard.test.tsx`

Test-first: yes — AnalyticsGuard.test.tsx rewritten so an authenticated non-Enterprise, non-admin user passes through the guard and a null user still throws the 404 error; fails until the hook drops the Enterprise/CLI-Analytics config check.

---

### Task 3: Remove `isMetricsAnalyticsEnabled`/`isMetricsAnalyticsLoaded` from `AnalyticsPage.tsx` and `AnalyticsDashboard.tsx`

**Files:**
- Modify: `src/pages/analytics/AnalyticsPage.tsx:55-57,105,121,148-149`
- Modify: `src/pages/analytics/components/AnalyticsDashboard.tsx:36-59,108-126,155-163,166-174,176-200`
- Test: `src/pages/analytics/__tests__/AnalyticsPage.test.tsx` (remove `metricsAnalytics button gating` describe block + the `'features:metricsAnalytics'` branch in the hoisted `defaultFeatureFlagImpl` mock)
- Test: `src/pages/analytics/components/__tests__/AnalyticsDashboard.test.tsx` (full rewrite)

**Interfaces:**
- Produces: `AnalyticsDashboardProps` drops `isMetricsAnalyticsEnabled`/`isMetricsAnalyticsLoaded`; `AIAdoptionTab`/`CliAnalyticsTab`/`LeaderboardTab`/`CustomDashboard`/`isAdoptionEnabled`/`isLeaderboardEnabled`/`isCustomizationEnabled`/`isCliAnalyticsEnabled` prop names/types unchanged.

- [ ] **Step 1: Rewrite `AnalyticsDashboard.test.tsx`**

Drop the `base` fixture's `isMetricsAnalyticsEnabled`/`isMetricsAnalyticsLoaded` props and the entire `metricsAnalytics gating` describe block. Add cases proving: Insights and CLI Insights tabs render regardless of any flag; CLI Analytics/Leaderboard/Adoption/custom-dashboard tabs still gate on their own existing props exactly as before (reuse the surviving fixture props); the stale-tab redirect still fires for an `activeTab` not present in the tab list.

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npx vitest run src/pages/analytics/components/__tests__/AnalyticsDashboard.test.tsx`
Expected: FAIL — component still requires the two removed props and still gates Insights/CLI Insights on `isMetricsAnalyticsEnabled`.

- [ ] **Step 3: Update `AnalyticsDashboard.tsx`**

Remove `isMetricsAnalyticsEnabled`/`isMetricsAnalyticsLoaded` from `AnalyticsDashboardProps` and the destructured props. Lines 108-126: push the Insights/CLI Insights tab objects unconditionally (drop the `if (isMetricsAnalyticsEnabled)` wrapper). Line 155: change the custom-dashboards gate to `if (isCustomizationEnabled)`. Lines 166-174: drop `isMetricsAnalyticsEnabled` from the `useMemo` deps. Lines 176-200: delete the `if (!isMetricsAnalyticsLoaded) return` guard line and drop `isMetricsAnalyticsLoaded` from the effect's deps array (the `tabs.length === 0` branch becomes dead but harmless now that Insights/CLI Insights are unconditional — leave the redirect logic itself intact per requirement 3).

- [ ] **Step 4: Rewrite `AnalyticsPage.test.tsx`'s affected parts**

Delete the `metricsAnalytics button gating` describe block (lines 286-303) and the `'features:metricsAnalytics'` entry in the hoisted `defaultFeatureFlagImpl` mock (line 40). Add/adjust an assertion that "Edit Dashboard"/"Manage Dashboards" buttons show whenever `isCustomizationEnabled && isCustomDashboard` (and `isCustomizationEnabled` respectively), with no `metricsAnalytics` flag involved.

- [ ] **Step 5: Update `AnalyticsPage.tsx`**

Delete lines 55-57 (`useFeatureFlag(FEATURE_FLAGS.METRICS_ANALYTICS)` read). Line 105: change to `isCustomizationEnabled && isCustomDashboard`. Line 121: change to `isCustomizationEnabled`. Lines 148-149: stop passing `isMetricsAnalyticsEnabled`/`isMetricsAnalyticsLoaded` to `<AnalyticsDashboard>`.

- [ ] **Step 6: Run both test files, confirm they pass**

Run: `npx vitest run src/pages/analytics/__tests__/AnalyticsPage.test.tsx src/pages/analytics/components/__tests__/AnalyticsDashboard.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

`git add src/pages/analytics/AnalyticsPage.tsx src/pages/analytics/components/AnalyticsDashboard.tsx src/pages/analytics/__tests__/AnalyticsPage.test.tsx src/pages/analytics/components/__tests__/AnalyticsDashboard.test.tsx`

Test-first: yes — AnalyticsDashboard.test.tsx rewritten to assert Insights/CLI Insights render unconditionally and the stale-tab redirect no longer depends on a loaded-flag; AnalyticsPage.test.tsx rewritten to assert dashboard action buttons gate on `isCustomizationEnabled` alone; both fail until Task 3's prop/gate removal lands.

---

### Task 4: Delete the `METRICS_ANALYTICS` constant and verify zero remaining references

**Files:**
- Modify: `src/constants/featureFlags.ts:46`

**Interfaces:**
- None — this task only deletes a now-unused constant after Task 3 removed its last call sites.

- [ ] **Step 1: Remove the constant**

Delete `METRICS_ANALYTICS: 'features:metricsAnalytics',` (`src/constants/featureFlags.ts:46`).

- [ ] **Step 2: Type-check to catch any remaining call site**

Run: `npx tsc --noEmit`
Expected: no errors referencing `FEATURE_FLAGS.METRICS_ANALYTICS`. If there is one, fix that call site (it is outside this plan's researched surface) before proceeding.

- [ ] **Step 3: Exhaustive repo-wide grep verification**

Run: `grep -rniE "metricsanalytics|metrics_analytics" src/`
Expected: zero output. If any hit remains, remove it (source or test) and re-run.

- [ ] **Step 4: Commit**

`git add src/constants/featureFlags.ts`

Test-first: no — this is a deletion-only step verified by type-check + grep, not a behavioral unit under test; Task 3's rewritten test suite already exercises every remaining call site.

---

### Task 5: Regression tests + fixes for empty/zero-response rendering across analytics widgets

**Files:**
- Modify (if a gap is found): `src/pages/analytics/components/widgets/MetricsWidget.tsx`
- Modify (if a gap is found): `src/pages/analytics/components/widgets/MetricsGrid.tsx`
- Modify (if a gap is found): `src/pages/analytics/components/widgets/DonutChartWidget.tsx`
- Modify (if a gap is found): `src/pages/analytics/components/widgets/BarChartWidget.tsx`
- Modify (if a gap is found): `src/pages/analytics/components/widgets/TableWidget.tsx`
- Modify (if a gap is found): CLI Analytics hook/view files under `src/pages/analytics/components/cli-analytics/`
- Test: `src/pages/analytics/components/widgets/__tests__/MetricsWidget.test.tsx` (new)
- Test: `src/pages/analytics/components/widgets/__tests__/DonutChartWidget.test.tsx` (new)
- Test: `src/pages/analytics/components/widgets/__tests__/BarChartWidget.test.tsx` (new)
- Test: `src/pages/analytics/components/widgets/__tests__/TableWidget.test.tsx` (new, or extend existing if present)
- Test: a CLI Analytics view/hook test under `src/pages/analytics/components/cli-analytics/__tests__/` covering an empty/zero response

**Interfaces:**
- None — no public signatures change unless a widget is found to actually crash on empty data, in which case fix in place without changing its prop contract.

- [ ] **Step 1: Write failing/characterizing tests for each widget's empty-response case**

For each of `MetricsWidget`, `DonutChartWidget`, `BarChartWidget`, `TableWidget`: mock the relevant `analyticsStore` fetch to resolve an empty/zero-shaped payload (`{ data: { rows: [], columns: [] } }` for tabular widgets, an empty `SummariesResponse`/zero-valued metric for `MetricsWidget`) and assert the component renders without throwing and shows a sensible empty/zero indicator (not literal `undefined`/`NaN` text). For the CLI Analytics layer, mock `useCliAnalyticsSlice`'s underlying store slice to return `data: null` and assert the consuming view renders an empty state without throwing.

- [ ] **Step 2: Run the new tests**

Run: `npx vitest run src/pages/analytics/components/widgets/__tests__ src/pages/analytics/components/cli-analytics/__tests__`
Expected: tests for `DonutChartWidget` and `BarChartWidget` PASS immediately (both already guard via `hasData` + `?? 0`/`?? []` fallbacks, per Task 5 Step 1 read of `DonutChartWidget.tsx:99-100,191` and `BarChartWidget.tsx:132,293`); `MetricsWidget`/`MetricsGrid`, `TableWidget`, and the CLI Analytics view are unverified — record which, if any, FAIL.

- [ ] **Step 3: Fix any component that fails Step 2**

For each failing case, read the failing component (and, for `MetricsWidget`, `MetricsGrid.tsx` which it delegates rendering to) and add the minimal defensive fallback (e.g. `summaries ?? emptyDefault`, a zero-value display instead of raw `NaN`/`undefined`) needed to make its test pass — no other behavior change.

- [ ] **Step 4: Run the full new test set again, confirm all pass**

Run: `npx vitest run src/pages/analytics/components/widgets/__tests__ src/pages/analytics/components/cli-analytics/__tests__`
Expected: PASS

- [ ] **Step 5: Commit**

`git add src/pages/analytics/components/widgets src/pages/analytics/components/cli-analytics`
(scope the `git add` to exactly the files touched in Steps 1 and 3 — do not add unrelated paths)

Test-first: yes — new empty/zero-response regression tests written per widget and per the CLI Analytics view layer before any fix; any widget found to crash or render `undefined`/`NaN` is fixed only to make its own new test pass.

---

## Closing notes: manual verification checklist (for the MR)

Roles to check (create/impersonate one user per role, or use existing fixtures): plain authenticated user (no Enterprise, non-admin), Project Admin, global Admin, Auditor.

Per role, verify:
- Analytics nav item is visible and `/analytics` loads (all four roles).
- Insights and CLI Insights tabs are present (all four roles).
- CLI Analytics tab: visible only for Admin/Project Admin with `features:cliAnalytics` on.
- AI/Run Adoption and Leaderboard tabs: visible only for Admin/Auditor (Leaderboard also needs its feature flag on).
- Custom dashboard tabs: visible only when dashboard-customization is on.
- With a connector (ES/ClickHouse) returning an empty/zero 200 response: Insights, CLI Insights, and CLI Analytics tabs show a "no data" empty state or zero-valued metrics — not a blank page, spinner stuck, or console error.

Screenshots an MR would need: Analytics nav item for a plain user; `/analytics` page for a plain user showing only Insights/CLI Insights; the tab bar for an Admin showing all applicable tabs; one empty-state screenshot per widget type (metrics card, donut chart, bar chart, table) with a zero/empty backend response.
