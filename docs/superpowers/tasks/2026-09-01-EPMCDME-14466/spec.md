# Spec: Remove AI/Run Adoption Tab, Configuration Panel, and Settings Page

**Ticket**: EPMCDME-14466
**Date**: 2026-09-01
**Size**: L (score 20 — brainstorm first)

---

## Problem

The AI/Run Adoption feature has been retired. Its tab in the Analytics tab strip, its Configuration
side panel, and its Settings → Administration page remain in the UI. These must be removed cleanly
so that no trace of the feature reaches users, while every other Analytics tab and Administration
entry continues to work exactly as before.

The removal also unblocks a subtle correctness issue: `TableWidget.tsx` has a
`waitForAdoptionConfig` prop that defaults to `true` and gates all tabular data fetches on
`analyticsStore.loaded['ai-adoption-config']`. Because the config is only loaded when the adoption
tab is active, Insights, CLI Insights, and Custom Dashboard tables are currently stalled until that
load completes. Removing the gate restores the intended fetch behaviour for all non-adoption tables.

---

## Scope

### Files to delete in full (14 source + 3 test)

**Analytics components**
- `src/pages/analytics/components/AIAdoptionTab.tsx`
- `src/pages/analytics/components/AssetReusabilityDrillDownModal.tsx`
- `src/pages/analytics/components/UserEngagementDrillDownModal.tsx`
- `src/pages/analytics/components/widgets/OverviewWidget.tsx`
- `src/pages/analytics/components/widgets/MaturityOverviewWidget.tsx`

**Settings / Administration**
- `src/pages/settings/administration/AiAdoptionConfigPage.tsx`
- `src/pages/settings/administration/components/AiAdoptionConfigView.tsx`
- `src/pages/settings/administration/components/ConfigItem.tsx`
- `src/pages/settings/administration/components/ConfigItemList.tsx`
- `src/pages/settings/administration/components/ConfigSection.tsx`
- `src/pages/settings/administration/components/ConfigSubSection.tsx`
- `src/pages/settings/administration/components/DimensionConfigSection.tsx`

**Shared utilities**
- `src/hooks/useAiAdoptionConfig.ts`
- `src/utils/aiAdoptionConfigStorage.ts`

**Tests**
- `src/pages/analytics/components/__tests__/AssetReusabilityDrillDownPagination.integration.test.tsx`
- `src/pages/analytics/components/__tests__/UserEngagementDrillDownPagination.integration.test.tsx`
- `src/pages/settings/administration/components/__tests__/ConfigSection.test.tsx`

### Files to modify (partial removal)

**AnalyticsPage.tsx** — remove `isAdoptionEnabled`, `isAdoptionTab`, `isConfigVisible`,
`handleOpenConfigModal`, the Configuration button JSX block, and the `ConfigurationSvg` import.
Simplify `isCustomDashboard`: `!isAdoptionTab && !isInsightsTab && !isLeaderboardTab` becomes
`!isInsightsTab && !isLeaderboardTab` (the `tab &&` guard at the start of the expression is
preserved as-is).

**AnalyticsDashboard.tsx** — remove the `isAdoptionEnabled` prop from `AnalyticsDashboardProps`,
the adoption entry from the `tabs` useMemo array, the full `useAiAdoptionConfig` call block
(lines 59–80), the `refreshTrigger` state and the `useEffect` that calls
`fetchAiAdoptionConfig`/`fetchAiAdoptionOverview`, the Popup with `AiAdoptionConfigView`
(lines 164–202), the `ConfirmationModal` for reset (lines 193–201), and all adoption symbol
imports.

**TableWidget.tsx** — remove the `waitForAdoptionConfig` prop (and its default of `true`), remove
the `loaded['ai-adoption-config']` gate in `fetchData` (lines 126 and 145), and remove the
`aiAdoptionConfig` snapshot (line 113) and the `config` argument passed to `fetchTabularData`.

**src/store/analytics.ts** — remove: state fields `aiAdoptionConfig` and `loaded` (the narrow
`{ 'ai-adoption-config': boolean }` declaration — no other key uses this field); the five adoption
methods (`fetchAiAdoptionOverview`, `fetchAiAdoptionMaturity`, `fetchAiAdoptionConfig`,
`saveAiAdoptionConfig`, `resetAiAdoptionConfig`); the `import` from `aiAdoptionConfigStorage`;
and the `isAiAdoptionDimension` conditional branch plus the `config` parameter from
`fetchTabularData`'s signature.

**src/types/analytics.ts** — remove: `AnalyticsDashboard.adoption`, the four
`TabularMetricType.AI_ADOPTION_*` enum values, `MetricType.AI_ADOPTION_OVERVIEW` and
`AI_ADOPTION_MATURITY`, `AdoptionQueryParams`, `AiAdoptionConfig`, `AiAdoptionConfigResponse`,
and `ConfigParam` (exclusive to `AiAdoptionConfig`; safe to remove with it).

**src/pages/settings/tabs.tsx** — remove the `AI_ADOPTION_CONFIG` entry from
`getEnterpriseAdminItems`. The remaining entries are sorted alphabetically; no positional fix is
needed.

**src/router.tsx** — remove the `aiAdoptionConfigRoutes` constant (lines 430–440) and its spread
at line 707.

**src/constants/index.ts** — remove `SettingsTab.AI_ADOPTION_CONFIG`.

**src/constants/pageTitles.ts** — remove the `'ai-adoption-config': 'AI Adoption Config'` entry.

**src/pages/analytics/__tests__/AnalyticsPage.test.tsx** — remove the adoption-specific test case
(`'should NOT show Edit Dashboard button when tab is adoption'`) and the `fetchAiAdoptionConfig`
key from the `analyticsStore` mock. The three remaining test cases are unaffected.

---

## Acceptance Criteria

1. Analytics tab bar renders no AI/Run Adoption tab for any role (admin, auditor, or other).
2. Insights, CLI Insights, and Leaderboard tabs remain present in their existing order with their existing role gates.
3. No Configuration button or adoption config popup appears on any Analytics tab.
4. Settings → Administration menu renders no AI/Run Adoption Framework entry; every other entry appears in the same position.
5. Users who never had access to the adoption tab see no change in the Analytics page or Settings.
6. `TableWidget.tsx` contains no `waitForAdoptionConfig` prop, no `loaded['ai-adoption-config']` guard, and no `config` argument to `fetchTabularData`.
7. `analyticsStore` contains no adoption state fields, no adoption methods, and no `loaded` field.
8. No TypeScript errors after all removals; `npm run typecheck` passes.
9. `AnalyticsPage.test.tsx` passes with the adoption test case removed.
10. No dead imports or unused variables remain in modified files.

---

## Non-Goals

- Adding a redirect or retirement notice for the `/settings/administration/ai-adoption-config` URL.
- Cleaning up the `'codemie-ai-adoption-config'` localStorage key from existing user sessions (separate ticket).
- Providing a fallback widget or empty state for custom dashboards that previously showed AI Adoption metrics.
- Removing backend endpoints (`v1/analytics/ai-adoption-*`) or SDK methods.
- Any changes to the remaining Analytics tabs' data, layout, or behavior beyond unblocking the `waitForAdoptionConfig` gate.
- Writing new tests for components that are being deleted.

---

## Decisions

- **Remove `loaded` field entirely** over broadening it to `Record<string, boolean>`: the field has exactly one key (`'ai-adoption-config'`) and no non-adoption consumer; broadening it would leave a field with no purpose.
- **Remove `config` parameter from `fetchTabularData` signature** over making it optional: keeping it optional as `undefined` would silently pass `undefined` to all non-adoption callers with no benefit; the POST/GET branch that consumed it is also removed.
- **Simplify `isCustomDashboard` expression inline** over extracting to a named variable: the expression becomes `tab && !isInsightsTab && !isLeaderboardTab`, which is readable without extraction; a rename would touch unrelated lines.
- **Remove `ConfigParam` type along with `AiAdoptionConfig`** over auditing broader usage: the type is defined as part of the `AiAdoptionConfig` interface structure and has no consumers outside the adoption types being deleted.
- **Delete adoption integration tests outright** over converting them to stubs: the tests exercise components that no longer exist; stubs would test nothing and add noise.

---

## Post-QA Additions (2026-09-10)

The QA gate for EPMCDME-14344 surfaced three orphaned adoption-framework artefacts outside the original 14466 scope. All three were removed on the retirement branch:

| File | Finding | Action |
|---|---|---|
| `src/pages/analytics/components/widgets/MaturityCard.tsx` | Zero consumers; rendered L3/AGENTIC, L2/AUGMENTED maturity levels (adoption-exclusive concepts) | Deleted |
| `src/pages/analytics/components/widgets/ScoreCard.tsx` | Zero consumers; filtered on `feature_adoption_score`, `adoption_index`, `maturity_level` metric IDs | Deleted |
| `src/types/analytics.ts` lines 254–405 | `// Adoption Analytics Types` header + `OverviewQueryParams`, `UserEngagementUsersRequest`, `UserEngagementUserRow`, `UserEngagementDrillDownState`, `AssetReusabilityAssistantsRequest`, `AssetReusabilityWorkflowsRequest`, `AssetReusabilityDatasourcesRequest`, `AssetReusabilityTabState`, `AssetReusabilityDrillDownState` — all zero consumers | Deleted |

---

## Open Risks

- `TableWidget` fetch-timing change for non-adoption tables: after removing the `waitForAdoptionConfig` gate, Insights/CLI Insights/Custom Dashboard tables fetch immediately on mount rather than waiting for config load. This is correct and intended, but must be manually verified in the running app before merge — no automated test currently covers the timing path.
- Any bookmark or deep-link to `/settings/administration/ai-adoption-config` will return a 404 or redirect to the default route after removal. This is accepted per the out-of-scope decision; a follow-up ticket owns the redirect.
