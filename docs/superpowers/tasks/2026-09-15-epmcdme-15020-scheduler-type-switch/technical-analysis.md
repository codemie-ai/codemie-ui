# Technical Research

**Task**: schedulers integrations SelectButton type-switch scope ownerType
**Generated**: 2026-09-15T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Add a User/Project type switch to the Schedulers page, mirroring the pattern used on the Integrations page. The switch uses a SelectButton component with IntegrationOption.USER / IntegrationOption.PROJECT values. Only users with applicationsAdmin or isAdmin permissions can see the Project option. Switching type clears URL filters and resets pagination to page 0. The SchedulersQuery type needs a new scope/ownerType field. Backend API contract may need to be defined if it doesn't exist.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/integrations/IntegrationsPage.tsx` — The reference implementation. Uses `SelectButton` with `IntegrationOption.USER` / `IntegrationOption.PROJECT`, derives `integrationOptions` array via `useMemo` guarded by `currentUser?.applicationsAdmin?.length || currentUser?.isAdmin`, and calls `clearUrlFilters()` in the change handler. Passes `integrationType` down to `IntegrationsTab`.
- `src/pages/schedulers/SchedulersPage.tsx` — Current Schedulers page. Has no type switch. Query is built from `SchedulersQuery` via `useMemo`; pagination is local `useState`. Uses `useSearchParams` / `setSearchParams` for URL-driven filters. No header actions rendered (no `rightContent` on `PageLayout`).
- `src/store/schedulers.ts` — Defines `SchedulersQuery` (currently: `page`, `pageSize`, `search`, `resourceType`, `projectId`, `resourceId`, `status`, `lastRunStatus`). The store's `fetchSchedulers` builds a `params` object and calls `GET /v1/schedulers`. A new `ownerType` (or `scope`) field must be added here and forwarded as a query param.
- `src/constants/integration.ts` — Exports `IntegrationOption` enum (`USER = 'User'`, `PROJECT = 'Project'`). This is the shared constant both pages should reference.
- `src/components/SelectButton/SelectButton.tsx` — Thin wrapper over PrimeReact `SelectButton`. Accepts `caption`, `value`, `options` (string array or `SelectButtonOption[]`), and `onChange(value: string)`. The `IntegrationOption` enum values are plain strings — they pass directly without adaptation.
- `src/utils/filters.ts` — Exports `clearUrlFilters()` which strips all URL params except `tab`. This is what `IntegrationsPage` calls on type switch.
- `src/store/user.ts` (via `src/store/index.ts`) — `userStore.user` carries `isAdmin: boolean` and `applicationsAdmin: string[]`. The permission check used in `IntegrationsPage` is `currentUser?.applicationsAdmin?.length || currentUser?.isAdmin`.

### Architecture and Layers Affected

- **Page layer** (`src/pages/schedulers/SchedulersPage.tsx`): Add local `integrationType` state, build `schedulerOptions` with permission guard, render `SelectButton` in header, wire `handleChangeSchedulerType` to call `clearUrlFilters()` and reset page.
- **Store / API layer** (`src/store/schedulers.ts`): Extend `SchedulersQuery` with `ownerType?: IntegrationOption` (or a narrower string union like `'User' | 'Project'`). Forward the field as a query param in `fetchSchedulers`.
- **Constants** (`src/constants/integration.ts`): No changes needed — `IntegrationOption` already exists with the required values.
- **Component layer**: `SelectButton` is already fully reusable; no changes needed.

### Integration Points

- `GET /v1/schedulers` — current endpoint. A new `ownerType` query param needs to be accepted by the backend. If the backend does not yet support it, the frontend can add the field to `SchedulersQuery` and the store method while the backend contract is defined separately.
- `userStore` — read via `useSnapshot` or directly; `applicationsAdmin` and `isAdmin` drive the option visibility guard.
- `clearUrlFilters()` — already used by `IntegrationsPage`; import path is `@/utils/filters`.

### Patterns and Conventions

- Permission guard: `const canSeeProject = currentUser?.applicationsAdmin?.length || currentUser?.isAdmin` — identical to `IntegrationsPage`.
- Options derivation via `useMemo` filtering the enum values array.
- Type switch resets pagination to `page = 0` (already done in `handleApplyFilters` for filter changes; same `setPage(0)` call needed on type switch).
- `SelectButton` rendered in the `rightContent` prop of `PageLayout` (the `SchedulersPage` currently uses `<PageLayout>` without `rightContent`; `IntegrationsPage` uses `rightContent`).
- The `PageLayout` component in `SchedulersPage` is imported from `@/components/Layouts/Layout` (no alias); `IntegrationsPage` imports from `@/components/Layouts/Layout/PageLayout`. Both resolve to the same component; confirm the correct named import.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/architecture/architecture.md` — covers where page-level state and store changes belong.
- `.ai-run/guides/patterns/state-management.md` — covers Valtio store extension patterns.
- `.ai-run/guides/development/api-integration.md` — covers adding query params to API calls.

### Architectural Decisions

- `IntegrationOption` enum was deliberately placed in `src/constants/integration.ts` rather than a page-local file, anticipating reuse across pages. The Schedulers page should import from the same location.
- `clearUrlFilters()` is the canonical way to wipe URL state on scope/type switch (see `IntegrationsPage` pattern).

### Derived Conventions

- Type switch state is local to the page component (not stored in Valtio), consistent with `IntegrationsPage`.
- The option array is derived via `useMemo` with the user object as a dependency — not computed at module scope — because permissions are only available after login.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/schedulers/__tests__/SchedulersPage.integration.test.tsx` — covers mount, filter options loading, and filter dropdowns. Tests use `mockAPI` and `renderPage` from `@/test-utils/integration`. Does not cover type switching, permission gating, or `ownerType` API param.

### Testing Framework and Patterns

- Vitest with React Testing Library (`integration` project).
- `mockAPI('GET', 'v1/schedulers', ...)` for HTTP mocking.
- `renderPage('/schedulers')` renders with full router context.
- Mocking `userStore` for permission variants is not demonstrated in existing scheduler tests; analogous tests in the integrations or assistants area should be consulted for the `userStore` mock pattern.

### Coverage Gaps

- No tests for the type switch UI element (SelectButton rendered in header).
- No tests for the permission guard (Project option hidden for non-admin users).
- No tests verifying that switching type calls `clearUrlFilters()` and resets page to 0.
- No tests verifying that `ownerType` is forwarded to `GET /v1/schedulers` as a query param.

---

## 5. Configuration and Environment

### Environment Variables

None identified as relevant to this feature. The type switch is a UI-only feature gated by user permissions, not feature flags.

### Configuration Files

No configuration file changes anticipated.

### Feature Flags and Deployment Concerns

No feature flags are used for the equivalent pattern in `IntegrationsPage`. The Project option is gated purely by runtime user permissions (`isAdmin` / `applicationsAdmin`). Consistent with that pattern, no feature flag is needed here unless a product decision adds one.

---

## 6. Risk Indicators

- `SchedulersPage` imports `PageLayout` from `@/components/Layouts/Layout` (default export); `IntegrationsPage` imports from `@/components/Layouts/Layout/PageLayout` (also default export). Both should resolve to the same component, but the import path inconsistency should be confirmed before adding `rightContent`.
- Backend API contract for `ownerType` param on `GET /v1/schedulers` is unconfirmed — ticket notes "may need to be defined if it doesn't exist." The store change is low-risk (adding an optional param), but the UI switch will silently send an unrecognized param if the backend is not ready, potentially returning all schedulers regardless of type.
- No existing test demonstrates how to mock `userStore.user` in the scheduler integration test suite. If `userStore` is a Valtio proxy, tests may need to write directly to the proxy or use a wrapper.
- `SchedulerFilterValues` and `SchedulersQuery` are currently aligned. Adding `ownerType` to the query but not to the filter values is intentional (it is a top-level switch, not a sidebar filter), but the distinction must be clear in implementation to avoid confusion.

---

## 7. Summary for Complexity Assessment

The task follows an established, already-implemented pattern: `IntegrationsPage` is the direct reference, and every building block (`SelectButton`, `IntegrationOption`, `clearUrlFilters`, `userStore` permission check) already exists in the codebase. The Schedulers page needs four localized changes: (1) add `integrationType` local state and `schedulerOptions` memo to `SchedulersPage.tsx`, (2) render the `SelectButton` in a `rightContent` prop on `PageLayout`, (3) wire the change handler to call `clearUrlFilters()` and `setPage(0)`, and (4) extend `SchedulersQuery` in `src/store/schedulers.ts` with an optional `ownerType` field and forward it in `fetchSchedulers`. The file change surface is two source files and one existing type.

Test coverage for this area is sparse — the existing `SchedulersPage.integration.test.tsx` covers filter dropdowns but has no tests for header actions, permission gating, or query param forwarding. New tests covering the type switch behavior and the `ownerType` param will need to be added, and the pattern for mocking `userStore` in scheduler integration tests will need to be established from analogous test files.

The only genuine uncertainty is the backend API contract for the `ownerType` param. The frontend work is self-contained and low-risk, but without backend support the switch will render correctly while having no filtering effect. This is a coordination risk, not a code complexity risk. Overall the task is low-to-medium complexity: straightforward UI wiring on the established pattern, with a modest test gap to fill.
