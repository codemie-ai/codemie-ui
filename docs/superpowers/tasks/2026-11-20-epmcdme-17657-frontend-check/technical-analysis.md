# Technical Research

**Task**: analytics dashboard ai-attribution auditor rbac (EPMCDME-17657, frontend check)
**Generated**: 2026-11-20
**Research path**: filesystem

---

## 1. Original Context

User question: "EPMCDME-17657 — do I need to do something here on the front side?" (this UI repo is the frontend: React/TS, Vite, Valtio).
Ticket EPMCDME-17657 (Bug, In Progress, labels Backend + Frontend): "[AI Attribution][RBAC] Auditor role cannot access AI Attribution analytics — Backend returns 403".
Description: AI Attribution (Analytics Dashboard -> AI Attribution) restricts access to Super Admin / Project Admin. Users with Auditor role (is_auditor=true, no Admin/Project Admin) get HTTP 403 "requires administrator or project administrator privileges" on the analytics endpoints. Backend findings: codemie/src/codemie/rest_api/routers/cli_analytics.py line 151 _admin_gate allows only is_admin or is_applications_admin; line 141 viewer_access gives Auditor nothing extra; /sessions is an exception (regular users get only their own). UI finding: AnalyticsDashboard.tsx — AI Attribution tab visibility depends on user permissions; unauthorized users opening the tab URL are redirected to another permitted analytics tab.
Expected: Auditor gets read-only access to AI Attribution data within authorized scope (subject to confirmation of RBAC requirements); no exposure of private user sessions/projects; UI and backend enforce consistent rules.
Acceptance criteria: 1) document expected access for Super Admin, Project Admin, Auditor, Regular User; 2) if Auditor access required, read-only access; 3) strict project/user isolation, no unauthorized session/prompt exposure; 4) align frontend visibility and backend authorization; 5) automated RBAC regression tests.
Comment: test-harness PR currently expects Auditor 403 on aggregate cost route and only own sessions — would change with the fix. Final role matrix not yet confirmed.
Goal of research: determine exactly how this repo decides AI Attribution tab visibility/redirect and API-error handling today, whether Auditor is already considered, what would have to change on the frontend if the backend grants Auditor read access, and whether anything must change if the backend does NOT change. Research only.

---

## 2. Codebase Findings

### Existing Implementations

**Purpose: decide who sees the AI Attribution tab**
- `src/pages/analytics/AnalyticsPage.tsx:~51-52` (the gate lives here, not in AnalyticsDashboard.tsx):
  `isProjectAdmin = user.projects.some(p => p.is_project_admin)`; `isCliAnalyticsEnabled = (isAdmin || isProjectAdmin) && flag 'features:cliAnalytics'`. `isAuditor` is read in the same file (line ~49) but is NOT part of this expression.
- Passed to `src/pages/analytics/components/AnalyticsDashboard.tsx:~97-103` which pushes tab `{id: 'aiAttribution', label 'AI Attribution', element <CliAnalyticsTab/>}` only when `isCliAnalyticsEnabled`.
- Enum: `src/types/analytics.ts:25` `cliAnalytics = 'aiAttribution'`. Flag: `src/constants/featureFlags.ts:50` `CLI_ANALYTICS: 'features:cliAnalytics'`.
- Redirect: effect in `AnalyticsPage.tsx:~139-170`. Legacy `?tab=cliAnalytics` is rewritten to `aiAttribution`. For a known tab whose `enabled` is false (and not a custom dashboard id), it `setSearchParams({tab: fallback}, {replace:true})`, fallback = first enabled entry in `tabFlags` (order insights, cliInsights, usageAttribution, leaderboard, cliAnalytics). The cliAnalytics entry has `loaded: true` (role-derived only).
- Frontend gate therefore mirrors the backend `_admin_gate` (admin or project admin). Auditor is not included. Backend project-admin check is `is_applications_admin`; the UI proxy is `projects[].is_project_admin` (`src/types/entity/user.ts`).

**Purpose: Auditor awareness elsewhere (reference for consistency)**
- `User.isAuditor` (`src/types/entity/user.ts:31`), populated from `apiUser.is_auditor ?? false` (`src/store/user.ts:150,187`).
- Same page: Leaderboard gate `(isAdmin || isAuditor) && flag` (AnalyticsPage ~line 53); Usage Attribution gate `(isAdmin || isMaintainer || isAuditor) && flag` (~line 60), with a role matrix test.
- `src/utils/permissions.ts:24` `canAccessUsersTab`; `src/pages/settings/tabs.tsx:126,168,180`; `src/store/user.ts:364` `getProjects` gives auditors the all-projects list (`getAdminProjects`) unless `adminOnly`.

**Purpose: API-error handling for AI Attribution data**
- `src/store/cliAnalytics.ts` (~140-180): generic fetch helper calls `api.get('v1/analytics/cli-analytics/<overview|users|tools|activity|...>', {skipErrorHandling: true})`; on failure stores `store.error[key] = parseErrorResponse(error, fallback)` (uses `parsedError.message`, falls back to `Failed to fetch <key>`). No global toast, no special 403 branch, no role-based redirect. A 403 therefore shows as a per-section error message (backend text) inside the tab. Views consume it through `components/cli-analytics/hooks/useCliAnalytics*.ts`.
- Section nav inside the tab (`cli-analytics/CliAnalyticsTab.tsx:35-110`) is fixed: Overview, Users, Repositories, Tools & Models, Activity, Efficiency, Cost, Sessions; no per-role hiding of sections.
- User/project filter options: `AnalyticsFilters.tsx:~123` -> `userStore.getAnalyticsUsers`; project options via `useCliAnalyticsProjects.ts`. Not examined for role-specific scoping; the backend decides scope.

### Decisions Already in the Code
- Tab visibility is role-derived on the client and duplicated per tab (no shared permission helper); each tab has its own inline expression in AnalyticsPage.tsx. Comment at Usage Attribution gate documents "project admins and other users never see the tab".
- Redirect for unauthorized tabs is silent fallback (no 403 page).
- Errors in AI Attribution are `skipErrorHandling: true` and surfaced inline.

### Task Statements Checked Against the Code
- "AI Attribution tab visibility depends on user permissions; unauthorized users are redirected": holds (AnalyticsPage.tsx effect). Note it is AnalyticsPage.tsx, not AnalyticsDashboard.tsx, that computes it.
- "Auditor gets 403 / UI consistent with backend": holds for today; UI hides the tab from auditors (unless the auditor is also admin or project admin), so an auditor normally never calls the endpoints from this UI except via a direct API call.
- Backend statements (`cli_analytics.py` lines 141/151, `/sessions` exception): unverified, outside this repository; would be confirmed by the backend file.
- Test-harness PR expectations: unverified (outside this repo).

### Consumers of Changed Contracts
- `isCliAnalyticsEnabled` consumers: `AnalyticsDashboard.tsx` (tab list, memo deps), and `tabFlags`/redirect effect in `AnalyticsPage.tsx`; test attribute `data-cli-analytics-enabled` in `AnalyticsPage.test.tsx`. CLI Insights `onOpenUsageAttribution` is separate (Usage Attribution).
- Any backend change in cli-analytics response shape: consumers are `src/store/cliAnalytics.ts` and `src/types/cliAnalytics.ts`; none changes if only the authorization rule changes.

### Architecture and Layers Affected
Page (AnalyticsPage) -> dashboard tab composition (AnalyticsDashboard) -> feature tab (CliAnalyticsTab and views) -> Valtio store (cliAnalyticsStore, userStore) -> API.

### Integration Points
Backend `v1/analytics/cli-analytics/*`; feature flag `features:cliAnalytics` (app config); user from `userStore` (`is_auditor`, `is_admin`, projects).

### Patterns and Conventions
Inline role booleans + feature flag per tab; role matrix tests (see Usage Attribution tab gate tests). Guides under `.ai-run/guides/` exist (state-management, testing-patterns); not read in depth.

---

## 3. Documentation Findings

### Guides and Architecture Docs
`.ai-run/guides/` present (README, architecture, components, ...). No guide specific to analytics RBAC was found in the search.

### Architectural Decisions
None recorded for AI Attribution access. Release notes mention auditor access for Cost Centers and Usage Attribution elsewhere.

### Derived Conventions
Auditor is treated as a read-only platform role in sibling gates (leaderboard, usage attribution, settings tabs).

---

## 4. Testing Landscape

### Existing Coverage
`src/pages/analytics/__tests__/AnalyticsPage.test.tsx`: tests `data-cli-analytics-enabled` true for admin, true for project admin, false for user admining no project, false for non-admin; redirect when flag off (~377); legacy tab rewrite (~396). Usage Attribution has a full role x flag matrix (~430-480) including auditor. No test covers an auditor for AI Attribution. Also `components/__tests__/AnalyticsDashboard*.test.tsx`, `cli-analytics/__tests__/CliAnalyticsTab.test.tsx` (CliAnalyticsTab is mocked in dashboard tests).

### Testing Framework and Patterns
Vitest + Testing Library; `useFeatureFlag` mocked per flag; `userStore.user` assigned directly.

### Coverage Gaps
No test of 403 rendering in cliAnalyticsStore for this tab (not searched exhaustively).

---

## 5. Configuration and Environment

### Environment Variables
None found relevant.

### Configuration Files
Flag `features:cliAnalytics` comes from app config (via `useFeatureFlag`).

### Feature Flags and Deployment Concerns
`features:cliAnalytics` gates the tab in addition to role. Project-level `cli_analytics_enabled` exists in `ProjectModal.tsx:160-173`.

---

## 6. Risk Indicators

- Existing mechanism for the same purpose: the tab gate `(isAdmin || isProjectAdmin) && flag` in AnalyticsPage.tsx mirrors the backend `_admin_gate` and keeps auditors out; see Existing Implementations.
- Speculative: if backend grants Auditor read access, the UI gate (one expression in AnalyticsPage.tsx) and its tests would need `isAuditor` added; the `isAuditor` variable is already in scope.
- Speculative: the tab's project/user filter options and sections (Sessions, Users) rely on backend scoping; any session/prompt-level isolation for auditors is a backend concern, but the UI exposes Users and Sessions sections unconditionally.
- Speculative: if the backend grants access only to some routes (aggregate cost but own sessions), the fixed section nav would show sections whose calls return 403 or only own data; errors would display inline with backend text.
- Role semantic mismatch: UI uses `projects[].is_project_admin`, backend uses `is_applications_admin`; not verified here.
- If the backend does not change, nothing in this repo is inconsistent today: auditors are already hidden and redirected.

---

## 7. Summary for Complexity Assessment

The AI Attribution tab gate is a single expression in `src/pages/analytics/AnalyticsPage.tsx`: `(isAdmin || isProjectAdmin) && features:cliAnalytics`. It feeds `AnalyticsDashboard.tsx` for tab composition and the fallback redirect effect. Auditor (`user.isAuditor`, from `is_auditor`) is already loaded and used for the Leaderboard and Usage Attribution tabs on the same page, but is not part of the AI Attribution gate. So today the UI and the reported backend rule agree, and no frontend change is required if the backend stays as is.

If the backend grants Auditor read access, the frontend change surface is small: the one gate expression, plus the test file `AnalyticsPage.test.tsx` (an auditor case, modelled on the existing Usage Attribution role matrix). The API-error path (`cliAnalytics.ts`, inline per-section error from `parsedError.message`, no redirect) needs no change for a 403. Any partial grant (e.g. aggregate only) would require deciding whether to hide sections, which is design work for spec.

Test posture: good unit coverage of the gate for admin/project admin/non-admin, no auditor case. Novelty is low: sibling gates already follow the pattern.

---

## 8. External References

None named by the task (backend file `cli_analytics.py` and the test-harness PR are mentioned as findings only, outside this repository, not read).
