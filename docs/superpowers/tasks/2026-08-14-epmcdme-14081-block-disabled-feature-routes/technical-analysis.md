# Technical Research

**Task**: router feature-flags routing customer-config
**Generated**: 2026-08-14T00:00:00.000Z
**Research path**: codegraph

---

## 1. Original Context

In codemie-ui, routes for disabled features remain accessible through direct URL navigation. Feature-gated routes should be blocked at the router level when the corresponding feature is disabled in customer-config.yaml. When a feature such as features:favoritesPage is set to enabled: false, the /favorites route can still be opened manually in the browser. This must be fixed generically so any route controlled by a feature flag respects the corresponding feature configuration.

---

## 2. Codebase Findings

### Existing Implementations
- `src/router.tsx` — single route tree; defines `favoritesRoutes`, `analyticsRoutes`, `aiAdoptionConfigRoutes` and all other route arrays; exports `createBrowserRouter` instance. `favoritesRoutes` (lines ~647-668) spreads all four `/favorites/*` sub-routes unconditionally — none wrapped in `FeatureGuard`.
- `src/components/FeatureGuard.tsx` — wrapper component that throws a 404-shaped `Error` when a feature flag is disabled; already used in `analyticsRoutes` and `aiAdoptionConfigRoutes`; NOT used for `favoritesRoutes`.
- `src/constants/featureFlags.ts` — `FEATURE_FLAGS` const-object; includes `FAVORITES_PAGE: 'features:favoritesPage'`.
- `src/utils/featureFlags.ts` — non-reactive `isFeatureEnabled()`, `isFavoritesPageEnabled()`, etc.; reads from `appInfoStore`.
- `src/hooks/useFeatureFlags.ts` — reactive `useFeatureFlag()` hook; `useFavoritesPageEnabled()` already defined but not wired into the router.
- `src/store/appInfo.ts` — Valtio proxy; owns `configs: ConfigItem[]` and `isConfigFetched`; customer-config is fetched here via `fetchCustomerConfig()`.

### Architecture and Layers Affected
- **Presentation / Router layer**: `src/router.tsx` — route definitions where `FeatureGuard` wrapping must be added.
- **Presentation / Component layer**: `src/components/FeatureGuard.tsx` — existing guard component, no changes needed to its logic.
- **State layer**: `src/store/appInfo.ts` — Valtio proxy that drives feature flag evaluation; read-only for this task.
- **Config layer**: `customer-config.yaml` / `/customer-config` API response — source of truth for flag values.

### Integration Points
- `FeatureGuard` → `isConfigItemEnabled(appInfoStore.configs, featureFlag)` — the utility that reads runtime config.
- `appInfoStore.isConfigFetched` — guards against premature config reads before the API response arrives.
- `react-router` v7.9.5 `RouteObject.element` — where `FeatureGuard` wraps the page component.
- Root `ErrorBoundary: ErrorPage` — catches the 404-shaped error thrown by `FeatureGuard` and shows the not-found UI.

### Patterns and Conventions
- **`FeatureGuard` wrapping pattern** (established): wrap the route `element` with `<FeatureGuard featureFlag={FEATURE_FLAGS.X}>` — throws a 404 error, triggering the root `ErrorBoundary`.
- `isConfigItemEnabled(configs, featureFlag)` is the underlying utility called by `FeatureGuard`.
- `FEATURE_FLAGS.FAVORITES_PAGE = 'features:favoritesPage'` is already declared — it is just not wired into the router.

---

## 3. Documentation Findings

### Guides and Architecture Docs
- `.ai-run/guides/architecture/routing-patterns.md` — documents the `FeatureGuard` pattern, `isEnterpriseEdition()` gate, and existing protected-route mechanisms directly relevant to this fix.
- `.ai-run/guides/architecture/architecture.md` — layer rules; `FeatureGuard` / `useFeatureFlag` listed as design patterns.

### Architectural Decisions
- The `FeatureGuard` component is the current preferred approach for feature-gating routes; the older `isEnterpriseEdition()` enterprise gate is a separate mechanism.

### Derived Conventions
- Every feature-gated route wraps its `element` with `<FeatureGuard featureFlag={FEATURE_FLAGS.X}>`. The guard throws a 404 error; the root error boundary handles display. This pattern is consistent across `analyticsRoutes` and `aiAdoptionConfigRoutes`.

---

## 4. Testing Landscape

### Existing Coverage
- `src/components/__tests__/FeatureGuard.test.tsx` — covers `FeatureGuard` throw behaviour.
- `src/utils/__tests__/featureFlags.test.ts` — covers `isFeatureEnabled` and related utils.
- `src/pages/favorites/__tests__/FavoritesPagePagination.integration.test.tsx` — integration test for favorites page (no routing guard coverage).

### Testing Framework and Patterns
- Vitest + React Testing Library; fixtures via `vi.mock` for store snapshots.

### Coverage Gaps
- No existing test verifies that `favoritesRoutes` are blocked when `features:favoritesPage` is disabled.
- A router-level test for the `FeatureGuard` on `favoritesRoutes` should be added alongside the fix.

---

## 5. Configuration and Environment

### Environment Variables
- None directly relevant to feature flag routing.

### Configuration Files
- `customer-config.yaml` — `features:favoritesPage: enabled: false/true` is the flag that gates the favorites routes.
- `/customer-config` API endpoint — runtime source; response cached in `appInfoStore.configs`.

### Feature Flags and Deployment Concerns
- `appInfoStore.isConfigFetched` must be `true` before `FeatureGuard` evaluates flags; if config hasn't loaded, `isConfigItemEnabled` returns `false` and the guard throws 404 prematurely. This is a latent timing risk shared by existing guarded routes (`analyticsRoutes`) but is more prominent for `favoritesPage` which can genuinely be disabled. Current `FeatureGuard` does not handle the loading window — worth noting but out of scope for this fix unless the existing pattern is changed.

---

## 6. Risk Indicators

- `favoritesRoutes` is completely unguarded — all four `/favorites/*` routes are accessible regardless of `features:favoritesPage` value.
- The fix is additive and low-risk: wrapping `favoritesRoutes` elements with `<FeatureGuard featureFlag={FEATURE_FLAGS.FAVORITES_PAGE}>` mirrors the exact pattern in `analyticsRoutes` and `aiAdoptionConfigRoutes`.
- Timing risk: `FeatureGuard` may throw 404 on first render before `isConfigFetched = true`; shared by existing guarded routes; in scope only if the team decides to fix `FeatureGuard` itself.
- No router-level test for favorites guard — a gap that should be closed in this same PR.
- The `FeatureGuard` pattern is already generic; no new abstraction is needed for this ticket.

---

## 7. Summary for Complexity Assessment

The task requires a minimal, additive change to `src/router.tsx`: wrap each element in `favoritesRoutes` with `<FeatureGuard featureFlag={FEATURE_FLAGS.FAVORITES_PAGE}>`, mirroring the identical pattern already applied in `analyticsRoutes` and `aiAdoptionConfigRoutes`. No new files, no new abstractions, and no changes to `FeatureGuard` itself are required. The `FAVORITES_PAGE` flag constant and the `isFavoritesPageEnabled` hook both already exist — they simply are not wired into the router.

The main complexity risk is the config-loading timing window: `FeatureGuard` reads `appInfoStore.configs` reactively but does not wait for `isConfigFetched`; a direct navigation before config loads could briefly show a 404. This issue is pre-existing and shared with other guarded routes, so fixing it is out of scope here unless the team decides otherwise.

Test coverage must be added: a test that mocks `appInfoStore.configs` with `features:favoritesPage: false` and asserts the favorites route renders the not-found/error page rather than the favorites UI. Overall implementation effort is low (1–3 files changed, straightforward pattern application).
