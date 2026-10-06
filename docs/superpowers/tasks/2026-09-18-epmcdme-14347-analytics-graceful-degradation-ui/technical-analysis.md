# Technical Research

**Task**: analytics navigation route-access tab-visibility metricsAnalytics
**Generated**: 2026-09-18T00:00:00Z
**Research path**: codegraph

---

## 1. Original Context

Implement EPMCDME-14347 Analytics access and graceful degradation — FRONTEND repository
(codemie-ui) only.

Requirements (UI scope, from the authoritative task file):

1. Analytics entry point: show the main Analytics navigation item to every authenticated user,
   regardless of Enterprise package availability and connector availability. Make the main
   `/analytics` route accessible under the same rule. Do not broaden or change permissions for
   unrelated routes (dashboard create/edit routes etc.) unless strictly required.

2. Tab visibility — preserve existing rules from origin/main; connector availability must not add
   new tab-hiding rules:
   - Insights and CLI Insights: always present on the Analytics page.
   - CLI Analytics: preserve the existing features:cliAnalytics flag + Admin/Project Admin role rule.
   - AI/Run Adoption: preserve the existing Admin/Auditor rule.
   - Leaderboard: preserve the existing Admin/Auditor and leaderboard feature-flag rules.
   - Custom dashboards: preserve the existing dashboard-customization rules.
   - Do not change Auditor behavior in this task.
   - Remove the feature-branch behavior that gates Insights, CLI Insights, custom dashboards, or
     their controls on features:metricsAnalytics / Enterprise availability. Prefer restoring the
     relevant UI logic to current main behavior rather than creating another visibility abstraction.

3. Remove features:metricsAnalytics from tab visibility and redirect logic entirely. Remove
   branch-only helpers/constants/tests that become unused as a result.

4. Ensure empty successful backend responses (HTTP 200 schema-valid empty payloads — already
   implemented on the backend) render as stable empty/zero states without uncaught errors, for
   ES-backed tabs (Insights/CLI Insights) and CLI Analytics (ClickHouse-backed).

Explicitly out of scope: codemie-sdk changes; the CLI Analytics config migration from
.env.standalone-equivalent to customer-config.yaml-equivalent UI config.

---

## 2. Codebase Findings

### Existing Implementations

- `src/utils/analyticsAccess.ts:26` — `isAnalyticsAccessible(configs, user)`: single source of
  truth for main Analytics nav item + `/analytics` route access. Current logic:
  `isConfigItemEnabled(configs, FEATURE_FLAGS.ENTERPRISE_EDITION) || (isConfigItemEnabled(configs, FEATURE_FLAGS.CLI_ANALYTICS) && isUserProjectAdmin(user, undefined, true))`.
  This is narrower than requirement 1 ("every authenticated user, regardless of Enterprise/connector
  availability") — it currently still gates on Enterprise Edition OR (CLI Analytics flag + admin).
- `src/hooks/useFeatureFlags.ts:143` — `useAnalyticsAccessible()`: reactive wrapper around
  `isAnalyticsAccessible`, reads `appInfoStore.configs` and `userStore.user` via valtio snapshots.
  3 call sites found: `Navigation.tsx:78`, `AnalyticsGuard.tsx:34`, and the hook's own test.
- `src/components/AnalyticsGuard.tsx:33` — route guard component wrapping `AnalyticsPage`,
  throws a 404-shaped `Error` (status/statusText/internal/data fields, same contract as
  `FeatureGuard`) when `useAnalyticsAccessible()` is false. Mounted directly on the `/analytics`
  route in `router.tsx` (not wrapped in `FeatureGuard`).
- `src/components/FeatureGuard.tsx:48` — generic flag-only route guard (OR semantics across an
  array of flags), used for `/analytics/dashboards/new` and `/analytics/dashboards/:id/edit`
  (both gated on `FEATURE_FLAGS.ENTERPRISE_EDITION`, untouched by this task's scope).
- `src/components/Navigation/Navigation.tsx:78,152-159` — nav item "Analytics" pushed into
  `upperSecondaryItems` only `if (isAnalyticsAccessible)`, using `useAnalyticsAccessible()`.
- `src/router.tsx:656-665` — `analyticsRoutes[0]` (id `ANALYTICS`, path `analytics`) is already
  wrapped in `<AnalyticsGuard>`, not `<FeatureGuard>`. The two dashboard-form routes
  (`ANALYTICS_NEW_DASHBOARD`, `ANALYTICS_EDIT_DASHBOARD`) remain gated on
  `FEATURE_FLAGS.ENTERPRISE_EDITION` via `FeatureGuard` — unrelated to this task, do not touch.
- `src/pages/analytics/AnalyticsPage.tsx` — top-level Analytics page. Reads
  `isMetricsAnalyticsEnabled`/`isMetricsAnalyticsLoaded` via
  `useFeatureFlag(FEATURE_FLAGS.METRICS_ANALYTICS)` (lines 55-57) and gates the "Edit Dashboard"
  and "Manage Dashboards" action buttons on `isMetricsAnalyticsEnabled && isCustomizationEnabled`
  (lines 105, 121). Computes `isAdoptionEnabled = isAdmin || isAuditor` (line 49),
  `isLeaderboardEnabled = (isAdmin || isAuditor) && isLeaderboardConfigEnabled` (line 52, flag
  `FEATURE_FLAGS.AI_CHAMPIONS_LEADERBOARD`), `isCliAnalyticsEnabled = (isAdmin || isProjectAdmin) && isCliAnalyticsConfigEnabled`
  (line 54, flag `FEATURE_FLAGS.CLI_ANALYTICS`), `isCustomizationEnabled` from
  `useFeatureFlag('feature:dashboardCustomization')` (line 50). Passes all of these plus
  `isMetricsAnalyticsEnabled`/`isMetricsAnalyticsLoaded` down to `AnalyticsDashboard`.
- `src/pages/analytics/components/AnalyticsDashboard.tsx` (lines 108-174) — tab composition.
  Current (branch) rules:
  - Insights + CLI Insights: pushed only `if (isMetricsAnalyticsEnabled)` (lines 111-126) —
    this is the branch-only gate requirement 2 says to remove.
  - CLI Analytics tab: pushed `if (isCliAnalyticsEnabled)` (line 128) — matches spec, preserve.
  - Leaderboard: pushed `if (isLeaderboardEnabled)` (line 137) — matches spec, preserve.
  - AI/Run Adoption: pushed `if (isAdoptionEnabled)` (line 146) — matches spec, preserve.
  - Custom dashboards: pushed per-dashboard `if (isMetricsAnalyticsEnabled && isCustomizationEnabled)`
    (line 155) — the `isMetricsAnalyticsEnabled` half of this condition is the branch-only gate to
    remove; `isCustomizationEnabled` is the rule to preserve.
  - A `useEffect` (lines 176-200) redirects to the first available tab, or clears the `tab` query
    param entirely when no tabs are available, gated on `isMetricsAnalyticsLoaded` — this
    loaded-flag gate is itself branch-only plumbing that becomes obsolete once
    `isMetricsAnalyticsEnabled`/`isMetricsAnalyticsLoaded` are removed; the redirect logic itself
    (tab-not-found fallback) is not spec'd for removal.
- `src/constants/featureFlags.ts:46-47` — `FEATURE_FLAGS.METRICS_ANALYTICS = 'features:metricsAnalytics'`
  and `FEATURE_FLAGS.CLI_ANALYTICS = 'features:cliAnalytics'` both defined here.
- Known call sites of `FEATURE_FLAGS.METRICS_ANALYTICS` / the raw string
  `'features:metricsAnalytics'` found in this pass: `AnalyticsPage.tsx` (flag read + button
  gating), `AnalyticsDashboard.tsx` (tab gating + redirect-loaded gating), and the two test files
  `AnalyticsPage.test.tsx` and `AnalyticsDashboard.test.tsx` (see Testing Landscape). No other
  source files referencing this flag were found in the areas explored; a final grep across the
  full tree is still advisable before deleting the constant (see Risk Indicators).
- `src/pages/analytics/components/InsightsTab.tsx` and `CLIInsightsTab.tsx` — compose ES-backed
  widgets (`MetricsWidget`, `TableWidget`, `DonutChartWidget`, `BarChartWidget`,
  `StackedBarChartWidget`) per metric type; no direct flag/branch gating inside either file itself
  beyond an unrelated `features:userEnrichmentEnabled` check in `CLIInsightsTab.tsx:78`.
- `src/pages/analytics/components/widgets/TableWidget.tsx` — existing empty-state pattern: guards
  render on `analyticsStore.loaded['ai-adoption-config']` before fetching (when
  `waitForAdoptionConfig`), renders `null` while `data` is unset, and once `data` resolves derives
  `items` as `data?.data.rows.map(...) ?? []` and `columnDefinitions` from
  `data?.data.columns ?? []` — an empty-but-schema-valid `TabularResponse` (`rows: []`,
  `columns: []` or populated columns with zero rows) renders the underlying `Table` component with
  an empty items array rather than throwing. Loading/error states are delegated to the wrapping
  `AnalyticsWidget` via `loading[metricType]` / `error[metricType]` from `analyticsStore`.
- `src/pages/analytics/components/cli-analytics/hooks/useCliAnalyticsSlice.ts` — shared hook
  behind all CLI Analytics (ClickHouse-backed) views; returns `{ data: snap[key] as T | null,
  loading: snap.loading[key] ?? false, error: snap.error[key]?.message ?? null }`, i.e. a null
  `data` (not yet fetched, or an empty response the store maps to null) is representable and does
  not throw — individual view components (`OverviewView`, `CostView`, etc.) are responsible for
  rendering a null/empty `data` value.

### Architecture and Layers Affected

- **Routing layer** (`src/router.tsx`): route definitions and guard composition for `/analytics`
  and the two dashboard-form sub-routes. Already uses `AnalyticsGuard` for the main route.
- **Guard/hook layer** (`src/components/AnalyticsGuard.tsx`, `src/components/FeatureGuard.tsx`,
  `src/utils/analyticsAccess.ts`, `src/hooks/useFeatureFlags.ts`): access-predicate and
  React-hook wrappers consumed by both routing and navigation.
- **Navigation layer** (`src/components/Navigation/Navigation.tsx`): nav item visibility.
- **Page/composition layer** (`src/pages/analytics/AnalyticsPage.tsx`,
  `src/pages/analytics/components/AnalyticsDashboard.tsx`): tab-list construction, action-button
  gating, stale-tab redirect logic.
- **Widget/data layer** (`src/pages/analytics/components/widgets/*`,
  `src/pages/analytics/components/cli-analytics/hooks/*`, `src/store/analytics.ts`,
  `src/store/cliAnalytics.ts`): fetch, loading/error state, and empty-response rendering for
  individual tabs — this is where requirement 4 (graceful empty-state handling) already has an
  established pattern to extend/verify, not build from scratch.

### Integration Points

- `AnalyticsGuard` / `useAnalyticsAccessible` depend on `appInfoStore` (customer config) and
  `userStore` (current user) both having already loaded — the guard's own doc comment states
  `App.tsx` already blocks route rendering until both are loaded.
- `isUserProjectAdmin` (`src/utils/user.ts:19`) is the shared role-check helper used by
  `analyticsAccess.ts` for the CLI-Analytics-admin branch of route access, distinct from the
  `isAdmin || isProjectAdmin` inline check duplicated in `AnalyticsPage.tsx:54`.
- `isConfigItemEnabled` (`src/utils/settings.ts:195`) is the shared config-flag-enabled predicate
  used by both `FeatureGuard` and `analyticsAccess.ts`.

### Patterns and Conventions

- 404-shaped `Error` with `{status: 404, statusText: 'Not Found', internal: false, data: null}`
  thrown from a guard component to trigger the router's `ErrorBoundary` — shared contract between
  `AnalyticsGuard` and `FeatureGuard`; do not invent a different mechanism.
- `useFeatureFlag(flagId)` returns `[isEnabled, isLoaded]` tuple — the `isLoaded` half exists
  specifically to avoid flashing content briefly before config is fetched; consumers that redirect
  based on a flag (as `AnalyticsDashboard.tsx`'s stale-tab effect does) gate the redirect on the
  loaded flag, not just the enabled flag.
- Feature flags are centralized in `FEATURE_FLAGS` (`src/constants/featureFlags.ts`) as string
  constants; ad hoc string literals (e.g. `'feature:dashboardCustomization'` in
  `AnalyticsPage.tsx:50`, `'features:userEnrichmentEnabled'` in `CLIInsightsTab.tsx:78`) also occur
  in the codebase, so removing `METRICS_ANALYTICS` from the constants object is consistent with
  existing practice for a retired flag.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/architecture/routing-patterns.md` — likely covers route-guard conventions
  (not opened in this pass; router.tsx and the two guard components were read directly and are
  sufficient to describe current behavior).
- `.ai-run/guides/architecture/layered-architecture.md` (`architecture.md`) — general layering.
- `.ai-run/guides/patterns/custom-hooks.md` — relevant to `useFeatureFlags.ts` conventions.
- `.ai-run/guides/testing/testing-patterns.md` — relevant to the test rewrites this task implies.

None of these guide files were opened directly (out of explore budget for this project); the
patterns above were instead derived from the source itself, which is authoritative for this task.

### Architectural Decisions

- Inline doc comment on `AnalyticsGuard.tsx` explains why it exists separately from the generic
  `FeatureGuard`: it needs to combine Enterprise Edition with the CLI-Analytics-flag-plus-role
  check, "more than the generic FeatureGuard's flag-only check supports." This is a design
  decision from a prior iteration of this same effort and is directly relevant: requirement 1 of
  this task removes the Enterprise/connector gating from `isAnalyticsAccessible` entirely, so this
  comment's justification for keeping `AnalyticsGuard` separate from `FeatureGuard` may need
  revisiting once the predicate simplifies to "every authenticated user" — but that is a design
  decision, not a research finding (see Risk Indicators).

### Derived Conventions

- Tab-gating logic in `AnalyticsDashboard.tsx` follows an `if (conditionX) tabsList.push(...)`
  pattern per tab, each condition sourced from a boolean prop computed one layer up in
  `AnalyticsPage.tsx`. Removing a gate means removing both the prop plumbing
  (`isMetricsAnalyticsEnabled`, `isMetricsAnalyticsLoaded`) and its `if` condition, not just the
  flag read.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/analytics/__tests__/AnalyticsPage.test.tsx` — three describe blocks:
  "isCustomDashboard excludes leaderboard tab" (unaffected by this task), "CLI Analytics feature
  flag gate" (unaffected — exercises `isCliAnalyticsEnabled` derivation, preserve), and
  "metricsAnalytics button gating" (lines 286-303) — directly tests the branch-only behavior this
  task removes (`hides Manage Dashboards and Edit Dashboard buttons when metricsAnalytics is
  disabled`); this test and its supporting `defaultFeatureFlagImpl` entry for
  `'features:metricsAnalytics'` (line 40) will need rewriting/removal.
- `src/pages/analytics/components/__tests__/AnalyticsDashboard.test.tsx` — entire
  `describe('AnalyticsDashboard metricsAnalytics gating', ...)` block (lines 91-150) exercises
  exactly the behavior requirement 2/3 remove: hiding Insights/CLI Insights/custom-dashboard tabs
  on `isMetricsAnalyticsEnabled`, and the stale-tab redirect gated on `isMetricsAnalyticsLoaded`.
  The `base` fixture (lines 78-89) includes `isMetricsAnalyticsEnabled: false` and
  `isMetricsAnalyticsLoaded: true` as props — these will disappear from the component's prop
  contract once the gate is removed, so this whole file needs rewriting, not just individual
  assertions.
- `src/components/__tests__/AnalyticsGuard.test.tsx` — four tests asserting current
  `isAnalyticsAccessible` behavior (Enterprise Edition enabled → accessible; CLI-Analytics-flag +
  project-admin → accessible; regular user with CLI Analytics enabled → 404; both disabled → 404).
  These assert the exact predicate requirement 1 says to broaden to "every authenticated user" —
  will need rewriting once `isAnalyticsAccessible`/`AnalyticsGuard` change.
- `src/pages/analytics/components/cli-analytics/__tests__/CliAnalyticsTab.test.tsx` and the
  `hooks/__tests__/` directory (`useCliAnalyticsOverview.test.ts`, `useCliAnalyticsRepositories.test.ts`,
  `useCliAnalyticsSession.test.ts`, `useCliAnalyticsSessions.test.ts`, `useCliAnalyticsTools.test.ts`)
  — cover individual CLI Analytics slices; not flag-gating tests, likely unaffected by this task
  except insofar as they should be checked for empty-payload assertions relevant to requirement 4.
- No dedicated test file found under `src/utils/__tests__/analyticsAccess.test.ts` in this pass
  despite codegraph reporting it as an existing test for `isAnalyticsAccessible` — treat as
  present (per blast-radius data from the first explore call) and needing the same rewrite as
  `AnalyticsGuard.test.tsx`.
- `src/components/Navigation/` — no `__tests__` directory surfaced by the glob patterns run in
  this pass; Navigation's Analytics-item visibility may be untested today.

### Testing Framework and Patterns

- Vitest + `@testing-library/react`, with `vi.mock`/`vi.hoisted` for store and hook mocking
  (`vi.mock('@/hooks/useFeatureFlags', ...)`, `vi.mock('@/store/appInfo', ...)`, etc.) — consistent
  across all analytics test files read. `useSnapshot` from valtio is commonly re-mocked to
  `(store) => store` to avoid proxy semantics in tests.
- Guard tests assert on thrown `Error` objects via `expect(() => render(...)).toThrow(expect.objectContaining({...}))`.

### Coverage Gaps

- No test found asserting Navigation's "Analytics" nav item visibility directly (only inferred via
  `useAnalyticsAccessible`'s own — unverified in this pass — test file).
- No test found in this pass specifically asserting empty-payload (200 schema-valid, zero rows)
  rendering for `TableWidget`, `MetricsWidget`, `DonutChartWidget`, or `BarChartWidget` — this is
  the gap requirement 4 concerns; TableWidget's empty-state handling appears structurally sound
  (`rows ?? []`) but is not verified by an existing test.

---

## 5. Configuration and Environment

### Environment Variables

None identified as directly relevant in the files read; `FEATURE_FLAGS.METRICS_ANALYTICS`,
`FEATURE_FLAGS.CLI_ANALYTICS`, and `FEATURE_FLAGS.ENTERPRISE_EDITION` are backend-driven config
items (`ConfigItem[]` from `appInfoStore.configs`), not build-time env vars.

### Configuration Files

- `src/constants/featureFlags.ts` — the `FEATURE_FLAGS` map is the single registry of flag-id
  string constants consumed across guards, hooks, and pages.

### Feature Flags and Deployment Concerns

- `features:metricsAnalytics` (`FEATURE_FLAGS.METRICS_ANALYTICS`) is the flag this task removes
  from tab-visibility and redirect logic. Per requirement 3, remove the constant itself and any
  now-unused helpers once all call sites are gone.
- `features:cliAnalytics`, `features:enterpriseEdition`, `aiChampionsLeaderboard`, and
  `'feature:dashboardCustomization'` are the flags this task must leave untouched in their current
  tab-gating roles.

---

## 6. Risk Indicators

- `isAnalyticsAccessible` (`src/utils/analyticsAccess.ts:26`) currently still gates on Enterprise
  Edition OR (CLI Analytics + admin) — this directly conflicts with requirement 1's "every
  authenticated user, regardless of Enterprise package availability and connector availability."
  Speculative: this predicate likely needs to collapse to an authentication-only check (e.g.
  `user !== null`), which would make the Enterprise/CLI-Analytics-specific `AnalyticsGuard` largely
  redundant with a plain auth check — but whether `AnalyticsGuard` is simplified, replaced with an
  inline check, or kept as a thin authenticated-user guard is a design decision for spec/plan, not
  asserted here as a requirement.
- Every existing test in `AnalyticsGuard.test.tsx` and (per codegraph blast-radius data, unverified
  directly in this pass) `analyticsAccess.test.ts` asserts the current Enterprise/CLI-Analytics
  predicate; all four assert exactly the behavior requirement 1 overrides. Full test rewrite
  required, not incremental patching.
- `AnalyticsDashboard.test.tsx`'s entire `metricsAnalytics gating` describe block (60+ lines) and
  its `base` fixture's `isMetricsAnalyticsEnabled`/`isMetricsAnalyticsLoaded` props will not compile
  against a component whose prop contract drops those two props — this is a full-file rewrite, not
  a spot-fix.
- `AnalyticsPage.test.tsx`'s `metricsAnalytics button gating` describe block and the
  `'features:metricsAnalytics'` branch in its `defaultFeatureFlagImpl` hoisted mock both need
  removal; missing this leaves a dangling mock branch that returns `[true, true]` for a flag the
  component no longer reads (harmless at runtime, but dead test code).
- The stale-tab redirect `useEffect` in `AnalyticsDashboard.tsx` (lines 176-200) currently guards
  on `isMetricsAnalyticsLoaded` before running; removing that prop means this effect needs a
  different "is config ready to decide" gate (or none, if `isCliAnalyticsEnabled` /
  `isLeaderboardEnabled` / `isAdoptionEnabled` / `isCustomizationEnabled` are already stable by the
  time `AnalyticsDashboard` mounts) — Speculative: exactly what replaces the loaded-gate is a
  design decision, not determined by this research pass; flagging so the redirect logic isn't
  silently dropped or left calling a now-undefined variable.
- No exhaustive full-tree grep for `metricsAnalytics` / `METRICS_ANALYTICS` was performed (search
  was scoped to files explore/glob surfaced); a final repo-wide search before deleting the constant
  is advisable to catch any call site outside `src/pages/analytics/` and `src/components/Navigation/`
  not surfaced by this pass's targeted exploration.
- No empty-state-specific test exists today for the ES-backed widgets (`TableWidget`,
  `MetricsWidget`, `DonutChartWidget`, `BarChartWidget`) or CLI Analytics views; requirement 4's
  claim that this "renders as stable empty/zero states without uncaught errors" is only supported
  by static reading of `TableWidget.tsx`'s `?? []` fallbacks, not by an existing regression test —
  worth a targeted look at `MetricsWidget`, `DonutChartWidget`, and `BarChartWidget` (not read in
  this pass) before assuming parity with `TableWidget`.
- `router.tsx` is a known merge-overlap point (per task instructions) with unrelated
  EPMCDME-10682 Schedulers changes on `origin/main`; this research describes only the branch's
  current Analytics-relevant router state (`AnalyticsGuard`-wrapped `/analytics` route, untouched
  `FeatureGuard`-wrapped dashboard-form routes) and does not attempt to resolve or characterize the
  broader router.tsx merge conflict, per explicit task instruction.

---

## 7. Summary for Complexity Assessment

This task touches five layers in `codemie-ui`: routing (`router.tsx`, already using
`AnalyticsGuard` for `/analytics`), the guard/predicate layer (`AnalyticsGuard.tsx`,
`analyticsAccess.ts`, `useFeatureFlags.ts`), navigation (`Navigation.tsx`), page/tab-composition
(`AnalyticsPage.tsx`, `AnalyticsDashboard.tsx`), and — for the empty-state requirement — the
existing widget layer (`TableWidget.tsx` and siblings, `useCliAnalyticsSlice.ts` and its
consumers). The file-change surface for requirements 1–3 is concentrated and well-scoped: one
predicate function, two components already built to house exactly this logic, and two page-level
files whose branch-only `isMetricsAnalyticsEnabled`/`isMetricsAnalyticsLoaded` plumbing needs
removing along with the four call sites found (`AnalyticsPage.tsx`, `AnalyticsDashboard.tsx`, and
their two matching test files). This is closer to a revert-to-main than new construction — the
guide/inline comments confirm `AnalyticsGuard` and the metricsAnalytics gates are artifacts of this
same feature branch's earlier iteration, not long-standing architecture.

The main technical novelty is not implementation complexity but a genuine, currently-unresolved gap
between requirement 1's target state ("every authenticated user") and the current predicate's
actual behavior (Enterprise Edition OR CLI-Analytics-flag-plus-admin) — closing that gap is a
one-line-scale change to `isAnalyticsAccessible`, but it invalidates four existing guard tests
outright and calls into question whether `AnalyticsGuard` should remain a distinct component at
all, which is a design decision for spec/plan. Test coverage posture is otherwise strong for the
behavior being removed (both `AnalyticsPage.test.tsx` and `AnalyticsDashboard.test.tsx` have
dedicated, easily identifiable `metricsAnalytics`-labeled describe blocks to delete or rewrite) but
weak for the behavior requirement 4 asks to verify — no existing test exercises an empty/zero-value
200 response for any analytics widget, even though `TableWidget.tsx`'s current implementation
already appears structurally tolerant of one via `?? []` fallbacks. Key risk factors: the
Enterprise/CLI-Analytics-vs-authenticated-user predicate gap (design decision, not yet resolved),
the stale-tab redirect effect's dependency on a `isMetricsAnalyticsLoaded` gate that disappears with
the flag, and unverified empty-state behavior in `MetricsWidget`/`DonutChartWidget`/`BarChartWidget`
(not read in this research pass).

---

## 8. External References

None named by the task. The task_context is a self-contained requirements block (no external file
paths or URLs cited as sources of truth); all research was performed directly against the
`codemie-ui` repository source.
