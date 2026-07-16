# Technical Research

**Task**: workflow navigation routing back-cancel
**Generated**: 2026-07-13T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-13308: Workflow edit page: Back and Cancel buttons do not work when the page is opened from a direct link

The Back and Cancel buttons on the workflow edit page do not perform any action when the page is opened directly by URL. This prevents users from returning to the workflow list from the edit page and creates a navigation dead end.

Preconditions:
- User is authorized in CodeMie.
- A workflow exists and can be opened in edit mode.
- User opens the workflow edit page using a direct link, e.g. https://codemie.lab.epam.com/workflows/b2291fce-8bfd-4f87-8411-67a595b1e9f5/edit

Steps to Reproduce:
1. Open a direct link to the workflow edit page.
2. Click the Back button.
3. Open the same direct link again if needed.
4. Click the Cancel button.

Expected Result: The user is redirected to the workflow list.
Actual Result: No action is performed. Nothing happens after clicking the Back or Cancel buttons.

Acceptance Criteria:
- When the workflow edit page is opened from a direct link, clicking Back redirects the user to the workflow list.
- When the workflow edit page is opened from a direct link, clicking Cancel redirects the user to the workflow list.
- The buttons remain functional when the workflow edit page is opened through regular in-app navigation.
- No regression is introduced for existing workflow edit, save, or navigation flows.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/workflows/EditWorkflowPage.tsx` — workflow edit page component; the Back arrow (via `PageLayout`'s `onBack` prop) and the Cancel button both call `goBackFromWorkflowEdit({ workflowId: id })`; this is the entry point for the broken navigation
- `src/pages/workflows/utils/goBackWorkflows.ts` — domain-scoped navigation helpers; exports `goBackFromWorkflowEdit` (the function with the bug), `goBackWorkflows` (generic workflow-domain back), and `goBackFromWorkflowExecutions` (executions page back); root cause lives here
- `src/utils/helpers.ts` — exports `navigateBack(...allowedRouteNames)`, the shared session-history-aware back utility; scans the Valtio history stack for a prior allowed route, then attempts URL-ancestor path matching, then falls back to `router.push({ name: allowedRouteNames[0] })`
- `src/hooks/appLevel/useHistoryStack.tsx` — builds and maintains the custom session history as a Valtio `proxy` (`history.stack`, `history.currentIndex`); initialized with `stack: [], currentIndex: -1` on every fresh page load; only populated as the user navigates within the current SPA session
- `src/hooks/useVueRouter.tsx` — Vue-style router abstraction wrapping React Router; `back()` calls `router.navigate(-1)`, `push()` and `replace()` accept `{ name, params }` objects; used throughout `goBackWorkflows.ts` and `helpers.ts`
- `src/router.tsx` — `createBrowserRouter` with `basename: import.meta.env.BASE_URL`; defines the edit-workflow route as `{ id: 'edit-workflow', path: 'workflows/:id/edit' }`
- `src/constants/routes.ts` — route ID string constants: `EDIT_WORKFLOW = 'edit-workflow'`, `WORKFLOWS_ALL = 'workflows-all'`, `WORKFLOWS_MY = 'workflows-my'`, `WOKRFLOW_EXECUTIONS = 'workflow-execution'` (note: intentional typo in constant name)
- `src/components/Layouts/Layout/PageLayout.tsx` — shared page layout; renders the Back arrow button; if the `onBack` prop is provided it calls `onBack()`, otherwise falls back to `window.history.back()`; `EditWorkflowPage` always provides `onBack`, so the layout fallback is never reached in the broken scenario
- `src/pages/workflows/NewWorkflowPage.tsx` — new workflow page; has the **correct guard pattern** that `EditWorkflowPage` is missing: checks `history.stack.length > 1` before calling `goBackWorkflows()`; otherwise calls `router.push({ name: WORKFLOWS_ALL })` directly

### Root Cause (Precise)

`goBackFromWorkflowEdit` in `src/pages/workflows/utils/goBackWorkflows.ts` (lines 73–83) calls `findFirstNonWorkflowRoute(workflowId)` to locate a safe prior route in `history.stack`. When the edit page is opened via direct link, the stack contains only the current edit-page entry (or is empty), so `safeRoute` is `null`. The null branch falls through to `goBackWorkflows({ name: WOKRFLOW_EXECUTIONS, params: { id: workflowId } })`, passing `WOKRFLOW_EXECUTIONS` as the first (default) allowed route to `navigateBack`. With an empty stack and no matching URL ancestor (param name mismatch: `edit-workflow` uses `:id` but `view-workflow` uses `:workflowId`), `navigateBack` exhausts all strategies and calls `router.push({ name: 'workflow-execution' })` with no params — resolving to a broken URL or silently doing nothing.

The same bug does not exist in `goBackFromWorkflowExecutions`, which already has an explicit `route.push({ name: WORKFLOWS_ALL })` guard for the no-history case.

### Architecture and Layers Affected

- **Navigation utility layer** — `goBackWorkflows.ts`: the primary fix location; one guard condition required
- **Page component layer** — `EditWorkflowPage.tsx`: no change needed unless the fix is applied at the component level instead (not recommended; domain utility is the correct location per project convention)
- **Shared history layer** — `useHistoryStack.tsx` / Valtio `history` proxy: no change needed; the behavior of starting empty on fresh load is by design

### Integration Points

- `EditWorkflowPage` → `goBackFromWorkflowEdit` → `goBackWorkflows` → `navigateBack` → Valtio `history` proxy + `useVueRouter.push()`
- `PageLayout` receives `onBack` from `EditWorkflowPage`; does not independently call `window.history.back()` in this path
- `router.tsx` `createBrowserRouter` with `basename` derived from `VITE_SUFFIX` env var; all `router.push({ name })` calls resolve through this router instance

### Patterns and Conventions

- Feature-scoped `goBack*` utilities per domain (not raw `navigate(-1)`) — enforced by project guide at `.ai-run/guides/architecture/routing-patterns.md`
- Route IDs as named constants from `src/constants/routes.ts` — never hardcoded strings
- Session history guard pattern: `if (history.stack.length > 1) { goBackWorkflows() } else { router.push({ name: WORKFLOWS_ALL }) }` — already used in `NewWorkflowPage` and `goBackFromWorkflowExecutions`
- Valtio proxy for reactive shared state (history stack, app-level stores)
- Vue-style router abstraction (`useVueRouter`) wrapping React Router throughout the navigation stack

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/architecture/routing-patterns.md` — PRIMARY guide for this task; explicitly documents the correct pattern for edit pages reachable via direct link; includes an anti-pattern table entry: "DON'T: Call `navigate(-1)` on pages reachable via direct link"; defines Pattern A (`navigateBack` + path matching) and Pattern B (history stack guard) — the fix must follow Pattern B

### Architectural Decisions

- The routing guide serves as the canonical navigation decision record for this project; no separate ADR files were found in `docs/`
- The design decision to use a custom session-scoped Valtio history stack (rather than `window.history.length` or the browser history API) is documented in the routing guide

### Derived Conventions

- Edit and create pages that can be opened via direct URL must always guard against empty history before calling any `goBack*` utility
- The fallback destination for workflow navigation when history is empty is `WORKFLOWS_ALL` (not `WOKRFLOW_EXECUTIONS` or `WORKFLOWS_MY`)
- `goBackFromWorkflowExecutions` at line 122 of `goBackWorkflows.ts` is the reference implementation for the correct guard pattern within this domain

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/workflows/__tests__/WorkflowDetailsPage.integration.test.tsx` — covers `WorkflowDetailsPage` (executions, back nav on that page); uses `mockRouterState`
- `src/pages/workflows/__tests__/WorkflowsListPage.integration.test.tsx` — covers workflow list page rendering
- `src/pages/workflows/__tests__/ViewWorkflowTemplatePage.integration.test.tsx` — covers template view page (calls `goBackWorkflows`); does not exercise the empty-stack scenario
- `src/pages/workflows/components/__tests__/WorkflowActions.test.tsx` — covers delete/unpublish modals; mocks `useNavigate`
- `src/utils/__tests__/navigateBack.integration.test.ts` — integration tests for `navigateBack` history-less fallback behavior (exists for the assistants domain; not yet for workflows)
- **No test file exists for `EditWorkflowPage.tsx` — zero unit or integration coverage**
- **No test file exists for `goBackFromWorkflowEdit` or `goBackWorkflows` utilities**

### Testing Framework and Patterns

- Vitest with two workspaces: `unit` and `integration` (defined in `vitest.workspace.ts`)
- React Testing Library (`@testing-library/react`, `@testing-library/user-event`)
- jsdom environment for both workspaces
- `useNavigate` mock: globally set up in `setupTests.tsx` via `vi.mock('react-router', ...)` to return a shared `vi.fn()` `nav`; tests import `navigate` from `./test-utils/_mock-state` to assert calls
- `useVueRouter` mock: globally mocked via `vi.mock('@/hooks/useVueRouter', ...)` pointing to `src/hooks/__mocks__/useVueRouter`; tests call `mockRouterState.push.mockReturnValue(...)` to control router behavior
- `createMemoryRouter` pattern: used in `TermsAndConditionsPage.test.tsx` for full-page route scenarios
- Fixture factory functions: integration tests define local `createXxxFixture()` helpers
- Valtio `history` proxy: NOT mocked globally — tests that exercise `goBackFromWorkflowEdit` with empty history must manually set `history.stack = []` and `history.currentIndex = -1` before asserting navigation calls

### Coverage Gaps

- `EditWorkflowPage.tsx` — no tests of any kind
- `goBackFromWorkflowEdit` — the exact broken code path (empty `history.stack` + direct URL) has no test
- `goBackWorkflows` — untested entirely
- The empty-history fallback scenario across all workflow `goBack*` utilities is uncovered

---

## 5. Configuration and Environment

### Environment Variables

- `VITE_SUFFIX` — URL base path prefix (e.g. `/codemie`); used as Vite `base` and React Router `basename`; must match deployment sub-path or all `router.push()` calls resolve incorrect paths
- `VITE_API_URL` — backend API base URL; default `/api`; not relevant to this bug
- `VITE_WORKFLOW_VISUAL_EDITOR_ENABLED` — toggles visual editor; when enabled, adds "Save and Run" button to `EditWorkflowPage`; does not affect Back/Cancel logic

### Configuration Files

- `src/router.tsx` — `createBrowserRouter` with `basename: import.meta.env.BASE_URL`; the `edit-workflow` route (`workflows/:id/edit`) and all list routes (`workflows-all`, `workflows-my`) are defined here
- `src/constants/routes.ts` — authoritative source of route ID constants used in all navigation utilities
- `vite.config.ts` — sets `base: env.VITE_SUFFIX || '/'`; this value becomes `import.meta.env.BASE_URL` and therefore the router `basename`
- `.env` — sets `VITE_SUFFIX`, `VITE_WORKFLOW_VISUAL_EDITOR_ENABLED`, workflow documentation URLs

### Feature Flags and Deployment Concerns

- `VITE_WORKFLOW_VISUAL_EDITOR_ENABLED` — toggles visual editor UI; renders additional buttons on `EditWorkflowPage` but does not affect Back/Cancel
- No deployment configuration changes are required for this fix
- `VITE_SUFFIX` correctness is a prerequisite for all navigation; not a new concern for this ticket

---

## 6. Risk Indicators

- **Zero test coverage for `EditWorkflowPage.tsx`** — the primary component being fixed has no tests; risk of silent regression
- **Zero test coverage for `goBackFromWorkflowEdit` and `goBackWorkflows`** — the utility functions being modified have no unit or integration tests; the fix must be self-evidently correct or accompanied by tests
- **`WOKRFLOW_EXECUTIONS` constant has a typo** (`WOKRFLOW` not `WORKFLOW`) — existing technical debt; do not "fix" the spelling as part of this change (it is used throughout the codebase)
- **Param name mismatch between routes** — `edit-workflow` uses `:id` while `view-workflow` uses `:workflowId`; this mismatch is what causes `navigateBack`'s path-ancestor fallback to fail silently; the fix must not rely on path matching
- **`navigateBack` last-resort fallback silently produces a broken URL** — when called with `WOKRFLOW_EXECUTIONS` and no params, it navigates to a malformed path rather than throwing or logging; this makes the bug invisible at runtime without manual testing
- **`NewWorkflowPage` already has the correct pattern** — confirms the fix approach; no novel pattern is being introduced
- **`goBackFromWorkflowExecutions` already has the correct pattern** — a second reference implementation exists in the same file; the fix is a local consistency alignment
- **No documentation gap** — `.ai-run/guides/architecture/routing-patterns.md` already documents the correct approach; the bug is a deviation from documented conventions, not a missing convention

---

## 7. Summary for Complexity Assessment

This is a low-complexity, well-scoped bug fix with a clear, precedented solution. The affected layer is the navigation utility layer, specifically `goBackFromWorkflowEdit` in `src/pages/workflows/utils/goBackWorkflows.ts`. The fix requires adding one guard condition (3–5 lines) identical to the pattern already used by `goBackFromWorkflowExecutions` in the same file and by `NewWorkflowPage` in the component layer. No architectural changes, no new dependencies, and no route configuration changes are required. Total file change surface is one file (`goBackWorkflows.ts`) for the fix, with optional companion tests.

The task follows an established, documented pattern: the project routing guide at `.ai-run/guides/architecture/routing-patterns.md` explicitly prohibits `navigate(-1)` on direct-link pages and prescribes the exact guard pattern needed. There is no technical novelty. The fix does not touch the authentication layer, the Valtio history proxy implementation, the router configuration, or any shared utilities beyond the workflow-scoped `goBackWorkflows.ts`.

The primary risk factor is the complete absence of test coverage for `EditWorkflowPage.tsx` and the `goBackFromWorkflowEdit` utility. The fix is straightforward and verifiable by manual testing, but the empty-history code path has never been exercised by automated tests. A regression test seeding `history.stack = []` and asserting `router.push({ name: 'workflows-all' })` is called would close this gap and provide a safety net against future regressions. The `navigateBack.integration.test.ts` file in `src/utils/__tests__/` provides a reference pattern for writing such a test.
