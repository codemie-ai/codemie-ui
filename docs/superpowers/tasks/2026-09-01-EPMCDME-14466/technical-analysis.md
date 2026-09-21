# Technical Research

**Task**: analytics ai-adoption settings admin
**Generated**: 2026-09-01T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-14466: UI: remove AI/Run Adoption tab, Configuration panel, and Settings page

Remove the AI/Run Adoption tab from the Analytics tab strip, its Configuration side panel, and
the Settings → Administration → AI/Run Adoption Framework page and menu entry — without disturbing
the other Analytics tabs or Administration entries.

Scope:
- Remove the adoption tab entry from AnalyticsDashboard.tsx.
- Remove adoption-specific logic and Configuration button/popup from Analytics pages/components.
- Delete AI Adoption tab components, widgets, modals, and related integration tests.
- Keep TableWidget.tsx, but remove only adoption-specific prop/branch logic.
- Delete AI Adoption configuration view, hook, and page.
- Remove the route and Administration menu entry.
- Delete aiAdoptionConfigStorage.ts, while accounting for stale-key cleanup handled by another ticket.
- Verify other Analytics tabs and Administration entries are unaffected.

Out of scope:
- Bookmark redirect and retirement notice.
- Stale localStorage cleanup on next load.
- Custom dashboard fallback for removed AI Adoption metrics.
- Backend endpoint/SDK removal.

Acceptance Criteria:
1. Given an admin or auditor opens the Analytics page, when the tab bar renders, then no AI/Run Adoption tab is offered.
2. Given an admin or auditor opens the Analytics page, when the tab bar renders, then Insights, CLI Insights, and Leaderboard, where applicable, remain in the same order and with the same roles.
3. Given an admin on any remaining Analytics tab, when they look at page actions, then no Configuration button for the adoption framework is present.
4. Given an admin opens Settings → Administration, when the menu renders, then AI/Run Adoption Framework is not listed, and every other entry keeps its position and behavior.
5. Given a user who never had access to the adoption tab, when they use Analytics, then nothing in their experience changes.

Important: The tab is gated only by isAdmin || isAuditor (no feature flag check exists in frontend).

---

## 2. Codebase Findings

### Existing Implementations

**Core AI Adoption files — delete in full:**
- `src/pages/analytics/components/AIAdoptionTab.tsx` — tab component; renders OverviewWidget, MaturityOverviewWidget, four TableWidget instances with AI_ADOPTION metric types, and two drill-down modals
- `src/pages/analytics/components/AssetReusabilityDrillDownModal.tsx` — drill-down modal used only inside AIAdoptionTab
- `src/pages/analytics/components/UserEngagementDrillDownModal.tsx` — drill-down modal used only inside AIAdoptionTab
- `src/pages/analytics/components/widgets/OverviewWidget.tsx` — overview cards widget used only inside AIAdoptionTab
- `src/pages/analytics/components/widgets/MaturityOverviewWidget.tsx` — maturity overview widget used only inside AIAdoptionTab; also reads `loaded['ai-adoption-config']` directly from analyticsStore
- `src/pages/settings/administration/AiAdoptionConfigPage.tsx` — Settings page; wraps AiAdoptionConfigView in SettingsLayout with title "AI/Run Adoption Framework"
- `src/pages/settings/administration/components/AiAdoptionConfigView.tsx` — large config form component; only consumer of ConfigItem/ConfigItemList/ConfigSection/ConfigSubSection/DimensionConfigSection
- `src/pages/settings/administration/components/ConfigItem.tsx` — adoption-only subcomponent
- `src/pages/settings/administration/components/ConfigItemList.tsx` — adoption-only subcomponent
- `src/pages/settings/administration/components/ConfigSection.tsx` — adoption-only subcomponent
- `src/pages/settings/administration/components/ConfigSubSection.tsx` — adoption-only subcomponent
- `src/pages/settings/administration/components/DimensionConfigSection.tsx` — adoption-only subcomponent
- `src/hooks/useAiAdoptionConfig.ts` — hook used only in AnalyticsDashboard.tsx and AiAdoptionConfigPage.tsx
- `src/utils/aiAdoptionConfigStorage.ts` — localStorage read/write/clear for `'codemie-ai-adoption-config'`

**Files to modify (partial removal):**
- `src/pages/analytics/AnalyticsPage.tsx` — holds `isAdoptionEnabled`, `isAdoptionTab`, `isConfigVisible`, `handleOpenConfigModal`, and the Configuration button JSX block (lines 102–111); imports `ConfigurationSvg`, adoption-related state
- `src/pages/analytics/components/AnalyticsDashboard.tsx` — holds `isAdoptionEnabled` prop, adoption tab entry in `tabs` array (lines 126–133), full `useAiAdoptionConfig` call (lines 59–80), Popup with AiAdoptionConfigView (lines 164–202), ConfirmationModal for reset (lines 193–201), and imports for all adoption symbols
- `src/pages/settings/tabs.tsx` — `getEnterpriseAdminItems` includes `AI_ADOPTION_CONFIG` tab as first entry (lines 35–40); entries sorted alphabetically so removal does not break order of remaining entries
- `src/router.tsx` — `aiAdoptionConfigRoutes` constant (lines 430–440) and its spread into the router array (line 707)
- `src/constants/index.ts` — `SettingsTab.AI_ADOPTION_CONFIG = 'ai_adoption_config'` (line 91)
- `src/constants/pageTitles.ts` — `'ai-adoption-config': 'AI Adoption Config'` entry (line 96)
- `src/store/analytics.ts` — multiple adoption-specific state fields (`aiAdoptionConfig`, `loaded: { 'ai-adoption-config': boolean }`), five store methods (`fetchAiAdoptionOverview`, `fetchAiAdoptionMaturity`, `fetchAiAdoptionConfig`, `saveAiAdoptionConfig`, `resetAiAdoptionConfig`), adoption import from `aiAdoptionConfigStorage`, and `isAiAdoptionDimension` branch in `fetchTabularData`
- `src/types/analytics.ts` — `AnalyticsDashboard.adoption = 'adoption'` (line 25), `TabularMetricType.AI_ADOPTION_*` enum values (lines 228–231), `MetricType.AI_ADOPTION_OVERVIEW` and `AI_ADOPTION_MATURITY` (lines 256–257), `AdoptionQueryParams` interface (line 265), `AiAdoptionConfig` interface (line 284), `AiAdoptionConfigResponse` interface (line 335), `ConfigParam` type (used within `AiAdoptionConfig`; check no other type uses it)
- `src/pages/analytics/components/widgets/TableWidget.tsx` — `waitForAdoptionConfig` prop (default `true`, line 96), `loaded['ai-adoption-config']` gate in `fetchData` (lines 126, 145), and snapshot of `aiAdoptionConfig` (line 113) passed as `config` to `fetchTabularData`

### Architecture and Layers Affected

- **Page layer**: `AnalyticsPage.tsx` (tab strip host, action buttons), `AiAdoptionConfigPage.tsx` (Settings sub-page)
- **Component layer**: `AnalyticsDashboard.tsx` (tab registrar and config popup host), `AIAdoptionTab.tsx` and its child widgets and modals
- **State layer**: `src/store/analytics.ts` — Valtio store; adoption state and methods are interleaved with non-adoption state
- **Routing layer**: `src/router.tsx` (route definition), `src/pages/settings/tabs.tsx` (navigation menu entries)
- **Types layer**: `src/types/analytics.ts`
- **Constants layer**: `src/constants/index.ts`, `src/constants/pageTitles.ts`
- **Utilities layer**: `src/utils/aiAdoptionConfigStorage.ts`, `src/hooks/useAiAdoptionConfig.ts`

### Integration Points

- **analyticsStore** (`src/store/analytics.ts`) — shared Valtio store; adoption methods co-exist with leaderboard, summaries, tabular data, and custom dashboard methods; removal must be surgical
- **TableWidget** — currently reads `analyticsStore.loaded['ai-adoption-config']` and `analyticsStore.aiAdoptionConfig?.data` regardless of whether the metricType is adoption-related; removing this gate will unblock TableWidget renders for all non-adoption tables that were previously stalled waiting for the config load
- **router.tsx** — `aiAdoptionConfigRoutes` is inserted into the route tree at line 707 via spread; the route is wrapped in a `FeatureGuard` with `FEATURE_FLAGS.ENTERPRISE_EDITION`
- **Backend endpoints referenced** (out of scope but present): `v1/analytics/ai-adoption-overview`, `v1/analytics/ai-adoption-config`, `v1/analytics/ai-adoption-maturity`, `v1/analytics/ai-adoption-user-engagement/users`, `v1/analytics/ai-adoption-asset-reusability/assistants`, `v1/analytics/ai-adoption-asset-reusability/workflows`, `v1/analytics/ai-adoption-asset-reusability/datasources`

### Patterns and Conventions

- Tabs are registered as `Tab<string>[]` built with `useMemo` inside `AnalyticsDashboard`; conditional entries use `if (isXEnabled) { tabsList.push(...) }` — the adoption tab uses this same pattern
- The `AnalyticsDashboard` component receives `isAdoptionEnabled` as a prop; removing the prop reduces the `AnalyticsDashboardProps` interface
- Navigation menu entries for Administration are built in `getEnterpriseAdminItems` in `tabs.tsx` then sorted alphabetically; the AI/Run Adoption entry is first alphabetically but `.sort` ensures stable order after removal
- Routes use `RouteObject[]` constants that are spread into the main router array
- Feature-gated routes use `<FeatureGuard featureFlag={...}>` wrapping the page component

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/README.md` is present and well-structured. No guide specific to analytics or AI adoption was found. The architecture guide at `.ai-run/guides/architecture/architecture.md` and component patterns guide are the relevant references for this removal task.

### Architectural Decisions

- No ADRs or inline decision markers found for the AI adoption feature.
- The `FeatureGuard` wrapping on the adoption config route (`ENTERPRISE_EDITION`) indicates the feature was gated by edition, not just role. The tab itself in `AnalyticsPage` is gated only by `isAdmin || isAuditor` without a feature flag check — this matches the ticket's note.

### Derived Conventions

- Conditional tabs: use `if (flag) tabsList.push(...)` inside a `useMemo`; removing the adoption tab is a straightforward deletion of its conditional block.
- Store interface types are explicit TypeScript interfaces, not generic records; the `loaded: { 'ai-adoption-config': boolean }` narrowly typed field should either be removed or broadened when its only consumer is gone.
- The pattern of storing config in localStorage (`aiAdoptionConfigStorage.ts`) is specific to this feature — no other store uses a localStorage persistence layer.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/analytics/__tests__/AnalyticsPage.test.tsx` — four unit tests covering `isCustomDashboard` logic; one test (`'should NOT show Edit Dashboard button when tab is adoption'`) directly references the `'adoption'` tab id and mocks `fetchAiAdoptionConfig`; mock for `analyticsStore` includes `fetchAiAdoptionConfig`
- `src/pages/analytics/components/__tests__/AssetReusabilityDrillDownPagination.integration.test.tsx` — integration test for AssetReusabilityDrillDownModal pagination; entirely adoption-specific; delete
- `src/pages/analytics/components/__tests__/UserEngagementDrillDownPagination.integration.test.tsx` — integration test for UserEngagementDrillDownModal pagination; entirely adoption-specific; delete
- `src/pages/settings/administration/components/__tests__/ConfigSection.test.tsx` — unit test for the adoption-only `ConfigSection` component; delete when `ConfigSection.tsx` is deleted

### Testing Framework and Patterns

- Vitest with React Testing Library, two workspaces: `unit` and `integration`
- Integration tests use `renderPage` from `src/test-utils/integration` which sets up the full router context
- Adoption integration tests use `requestRegistry` from `src/test-utils/_mock-state` to intercept API calls and `appInfoStore` to control feature flags
- Unit tests mock stores via `vi.mock('@/store/analytics', ...)`
- Import-order constraint documented in integration test headers: `@/test-utils/integration` must be imported before `@/store/analytics` to avoid circular dependency crash

### Coverage Gaps

- No unit tests exist for `useAiAdoptionConfig`, `aiAdoptionConfigStorage`, `AiAdoptionConfigView`, `AIAdoptionTab`, `OverviewWidget`, `MaturityOverviewWidget`, `UserEngagementDrillDownModal`, or `AssetReusabilityDrillDownModal` — all are to be deleted, so no new gaps are introduced
- `AnalyticsPage.test.tsx` will need the adoption-specific test case removed and the `fetchAiAdoptionConfig` mock cleaned up; the remaining three test cases can stay

---

## 5. Configuration and Environment

### Environment Variables

No adoption-specific environment variables found. The feature is controlled by role (`isAdmin || isAuditor`) and edition (`FEATURE_FLAGS.ENTERPRISE_EDITION` for the Settings route).

### Configuration Files

- `src/constants/index.ts` — `SettingsTab.AI_ADOPTION_CONFIG` enum member to remove
- `src/constants/pageTitles.ts` — `'ai-adoption-config'` entry to remove
- `src/utils/aiAdoptionConfigStorage.ts` — localStorage key `'codemie-ai-adoption-config'`; deletion leaves the key orphaned in existing user sessions (out-of-scope cleanup per ticket)

### Feature Flags and Deployment Concerns

- The Settings route `'/settings/administration/ai-adoption-config'` is guarded by `FeatureGuard featureFlag={FEATURE_FLAGS.ENTERPRISE_EDITION}`; removing the route entirely supersedes this guard
- The Analytics tab is not feature-flag gated; it depends only on `isAdmin || isAuditor`
- No Dockerfile or CI/CD config references the AI adoption feature

---

## 6. Risk Indicators

- **TableWidget default prop side effect**: `waitForAdoptionConfig` defaults to `true` and gates all tabular data fetches on `loaded['ai-adoption-config']`. Other Analytics tabs (Insights, CLI Insights, Custom Dashboards) that render TableWidget will be implicitly affected when this gate is removed — they will no longer wait for a config that no longer exists. This is the desired outcome but the removal must be complete: both the prop and the `loaded['ai-adoption-config']` gate in `fetchData` must be cleaned, and the TypeScript interface updated.
- **`loaded: { 'ai-adoption-config': boolean }` narrow type in Analytics interface**: `src/store/analytics.ts` line 112 declares `loaded` with a single narrowly typed key. If `aiAdoptionConfig` and the config-loading logic are removed, this type declaration must be removed or the `loaded` field broadened to `Record<string, boolean>`; leaving it typed but never set would cause a TypeScript error.
- **`fetchTabularData` POST branch**: the `isAiAdoptionDimension` check (line 462) switches POST vs GET for adoption-specific tabular endpoints. This must be removed cleanly, and the `config` parameter must be stripped from `fetchTabularData`'s signature to avoid passing undefined adoption config to non-adoption endpoints.
- **`AnalyticsDashboard.tsx` dual-concern**: the component both registers tabs and hosts the adoption config Popup and ConfirmationModal. The `useAiAdoptionConfig` hook is called at component top level and drives `refreshTrigger` state via `onSaveSuccess`. After removal, `refreshTrigger` state and the `useEffect` that calls `fetchAiAdoptionConfig`/`fetchAiAdoptionOverview` must also be deleted — these are interlocked.
- **`AnalyticsPage.tsx` isAdoptionTab and isCustomDashboard logic**: `isCustomDashboard` is currently defined as `tab && !isAdoptionTab && !isInsightsTab && !isLeaderboardTab`; removing the adoption check here simplifies the expression but the change must be verified against the remaining `isCustomDashboard` guard for the Edit Dashboard button.
- **`tabs.tsx` menu entry positioning**: entries are sorted alphabetically with `.sort((a, b) => a.name.localeCompare(b.name))`; "AI/Run Adoption Framework" sorts before "Budgets management" and "Categories management". Its removal does not displace other entries.
- **`AnalyticsPage.test.tsx` mock surface**: the test mocks `analyticsStore` with `fetchAiAdoptionConfig: vi.fn()`; removing this from the mock should be verified not to break the remaining three test cases, which do not exercise adoption code paths.
- **Orphaned ConfigSubSection import**: `AiAdoptionConfigView.tsx` imports `ConfigSubSection` but the Glob of components showed it in the administration components directory; it must also be deleted.

---

## 7. Summary for Complexity Assessment

This task is a well-scoped removal across six architectural layers: the page/component layer, the Valtio state layer, the routing layer, the navigation menu layer, the types/constants layer, and the utilities layer. The file change surface is large in count (~20 files to delete, ~10 files to modify) but each change is bounded — no cross-cutting logic needs to be redesigned, only removed. The tab registration, route definition, and menu entry patterns are all conditional blocks that follow established conventions already used for the leaderboard and custom dashboards.

The main technical novelty is in `src/store/analytics.ts` and `TableWidget.tsx`. The store's adoption methods are interleaved with non-adoption methods in a single Valtio proxy object; the `loaded: { 'ai-adoption-config': boolean }` field is narrowly typed and must be removed from the interface without breaking the `loading` and `error` Records used by non-adoption code. `TableWidget` has a `waitForAdoptionConfig` default-true prop that gates all tabular data fetches; its removal unblocks those fetches across all Analytics tabs and requires the TypeScript signature and call sites to be updated. The `fetchTabularData` method also passes `config: aiAdoptionConfig?.data` as a parameter today — removing adoption config from the store makes that parameter always undefined, so it should be stripped from the method signature and all callers.

Test coverage posture is favorable for this task: the adoption-specific integration tests (`UserEngagementDrillDown`, `AssetReusabilityDrillDown`) are self-contained and can be deleted without adjustment. The one unit test file that references the adoption tab (`AnalyticsPage.test.tsx`) needs a single case removed and one mock key cleaned. No new tests need to be written for the removal. The key risk is ensuring that the `TableWidget` gate removal does not silently change behavior for non-adoption Analytics tabs (Insights, CLI Insights, Custom Dashboards) — these tables previously waited for config load before fetching; after the change they fetch immediately, which is correct but should be manually verified.

---

## 8. External References

None named by the task.
