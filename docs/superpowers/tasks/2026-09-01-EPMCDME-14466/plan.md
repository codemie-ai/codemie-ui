# Remove AI/Run Adoption Tab, Configuration Panel, and Settings Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Delete all AI/Run Adoption UI — Analytics tab, configuration popup, Settings page — and excise every supporting file, store method, and type, while leaving Insights, CLI Insights, Leaderboard, and all Administration entries untouched.

**Architecture:** Pure removal across six layers (page/component, Valtio store, routing, navigation menu, types/constants, utilities). No new behaviour is introduced. Removing the `waitForAdoptionConfig` gate in `TableWidget.tsx` is a correctness fix that unblocks non-adoption table fetches.

**Tech Stack:** React 18, TypeScript 5, Valtio (analytics store), react-router 7, Vitest + React Testing Library.

**Spec:** `docs/superpowers/tasks/2026-09-01-EPMCDME-14466/spec.md`

## Global Constraints

- Commit per task using the repository's existing branch/commit convention (see `.ai-run/guides/standards/git-workflow.md`). Never hand-write a commit message format.
- Do not add a redirect or retirement notice for `/settings/administration/ai-adoption-config`.
- Do not add localStorage cleanup code; the orphaned key is handled by a separate ticket.
- Do not touch any backend endpoint, SDK method, or Dockerfile.
- Do not add a fallback widget or empty state for custom dashboards that previously showed AI Adoption metrics.
- TypeScript must compile cleanly after every task (`npm run typecheck`).

---

### Task 1 — Delete adoption-only source and test files

**Files — delete in full:**
- `src/pages/analytics/components/AIAdoptionTab.tsx`
- `src/pages/analytics/components/AssetReusabilityDrillDownModal.tsx`
- `src/pages/analytics/components/UserEngagementDrillDownModal.tsx`
- `src/pages/analytics/components/widgets/OverviewWidget.tsx`
- `src/pages/analytics/components/widgets/MaturityOverviewWidget.tsx`
- `src/pages/settings/administration/AiAdoptionConfigPage.tsx`
- `src/pages/settings/administration/components/AiAdoptionConfigView.tsx`
- `src/pages/settings/administration/components/ConfigItem.tsx`
- `src/pages/settings/administration/components/ConfigItemList.tsx`
- `src/pages/settings/administration/components/ConfigSection.tsx`
- `src/pages/settings/administration/components/ConfigSubSection.tsx`
- `src/pages/settings/administration/components/DimensionConfigSection.tsx`
- `src/hooks/useAiAdoptionConfig.ts`
- `src/utils/aiAdoptionConfigStorage.ts`
- `src/pages/analytics/components/__tests__/AssetReusabilityDrillDownPagination.integration.test.tsx`
- `src/pages/analytics/components/__tests__/UserEngagementDrillDownPagination.integration.test.tsx`
- `src/pages/settings/administration/components/__tests__/ConfigSection.test.tsx`

**Test-first: no** — pure deletion; TypeScript compile errors in importers serve as verification when imports are removed in Tasks 2–5.

- [ ] Delete all 17 files listed above. The build will report import errors until the remaining tasks complete — that is expected.

---

### Task 2 — Remove adoption state and types from store and type definitions

**Files:**
- Modify: `src/store/analytics.ts`
- Modify: `src/types/analytics.ts`

**Test-first: no** — TypeScript compiler is the verification gate; no unit tests cover these adoption methods directly.

- [ ] **`src/store/analytics.ts`** — make the following removals:
  - Delete the `import` from `aiAdoptionConfigStorage`.
  - Delete state fields `aiAdoptionConfig` and `loaded` (the narrow `{ 'ai-adoption-config': boolean }` field; remove entirely — do not broaden to `Record<string, boolean>`).
  - Delete the five adoption methods: `fetchAiAdoptionOverview`, `fetchAiAdoptionMaturity`, `fetchAiAdoptionConfig`, `saveAiAdoptionConfig`, `resetAiAdoptionConfig`.
  - In `fetchTabularData`: delete the `config` parameter from its signature, and delete the `isAiAdoptionDimension` conditional branch that switched between POST and GET for adoption endpoints.

- [ ] **`src/types/analytics.ts`** — make the following removals:
  - `AnalyticsDashboard.adoption` enum value.
  - `TabularMetricType.AI_ADOPTION_USERS`, `AI_ADOPTION_ASSISTANTS`, `AI_ADOPTION_WORKFLOWS`, `AI_ADOPTION_DATASOURCES` (four values).
  - `MetricType.AI_ADOPTION_OVERVIEW` and `AI_ADOPTION_MATURITY`.
  - `AdoptionQueryParams` interface.
  - `AiAdoptionConfig` interface and `ConfigParam` type (remove together; `ConfigParam` has no consumers outside `AiAdoptionConfig`).
  - `AiAdoptionConfigResponse` interface.

- [ ] Run `npm run typecheck`. Fix any residual references that point to the deleted symbols (there should be none outside the files touched in Tasks 3–5, but confirm now).

---

### Task 3 — Clean `TableWidget.tsx` adoption gate

**Files:**
- Modify: `src/pages/analytics/components/widgets/TableWidget.tsx` (lines 96, 113, 126, 145 per technical analysis)

**Test-first: no** — no existing tests cover the fetch-timing path; TypeScript catches call-site mismatches when `config` is removed from `fetchTabularData`.

- [ ] Remove the `waitForAdoptionConfig` prop and its `default: true` from the props interface and destructuring.
- [ ] Remove the `loaded['ai-adoption-config']` guard at lines 126 and 145 in `fetchData`.
- [ ] Remove the `aiAdoptionConfig` snapshot (line 113) and the `config` argument in the `fetchTabularData` call.
- [ ] Run `npm run typecheck` to confirm the `fetchTabularData` signature change propagated cleanly.

---

### Task 4 — Clean `AnalyticsDashboard.tsx` and `AnalyticsPage.tsx`; update test

**Files:**
- Modify: `src/pages/analytics/__tests__/AnalyticsPage.test.tsx` *(test-first)*
- Modify: `src/pages/analytics/components/AnalyticsDashboard.tsx` (lines 59–80, 126–133, 164–202)
- Modify: `src/pages/analytics/AnalyticsPage.tsx` (lines 102–111)

**Test-first: yes** — update the test file *before* touching the source files; the three remaining test cases must pass against the pre-change source as a baseline.

- [ ] **`src/pages/analytics/__tests__/AnalyticsPage.test.tsx`**:
  - Remove the test case `'should NOT show Edit Dashboard button when tab is adoption'`.
  - Remove the `fetchAiAdoptionConfig: vi.fn()` key from the `analyticsStore` mock object.
  - Run `npx vitest run src/pages/analytics/__tests__/AnalyticsPage.test.tsx` — all three remaining cases must pass.

- [ ] **`src/pages/analytics/components/AnalyticsDashboard.tsx`**:
  - Remove `isAdoptionEnabled` from `AnalyticsDashboardProps`.
  - Remove the `useAiAdoptionConfig` call block (lines 59–80).
  - Remove `refreshTrigger` state and the `useEffect` that called `fetchAiAdoptionConfig`/`fetchAiAdoptionOverview`.
  - Remove the adoption tab entry from the `tabs` useMemo array (lines 126–133).
  - Remove the `<Popup>` with `AiAdoptionConfigView` and the `ConfirmationModal` for reset (lines 164–202).
  - Remove all adoption-related imports (`AIAdoptionTab`, `AiAdoptionConfigView`, `useAiAdoptionConfig`, and any adoption type imports).

- [ ] **`src/pages/analytics/AnalyticsPage.tsx`**:
  - Remove `isAdoptionEnabled`, `isAdoptionTab`, `isConfigVisible`, `handleOpenConfigModal`.
  - Remove the Configuration button JSX block (lines 102–111) and the `ConfigurationSvg` import.
  - Simplify `isCustomDashboard`: change `tab && !isAdoptionTab && !isInsightsTab && !isLeaderboardTab` to `tab && !isInsightsTab && !isLeaderboardTab`. Keep the `tab &&` guard.

- [ ] Run `npx vitest run src/pages/analytics/__tests__/AnalyticsPage.test.tsx` — all three cases must still pass.

---

### Task 5 — Remove adoption route, navigation entry, and constants

**Files:**
- Modify: `src/router.tsx` (lines 430–440, 707)
- Modify: `src/pages/settings/tabs.tsx`
- Modify: `src/constants/index.ts`
- Modify: `src/constants/pageTitles.ts`

**Test-first: no** — routing and constants removal; TypeScript catches any residual reference to the removed enum value.

- [ ] **`src/router.tsx`**: delete the `aiAdoptionConfigRoutes` constant (lines 430–440) and its spread into the router array (line 707).
- [ ] **`src/pages/settings/tabs.tsx`**: remove the `AI_ADOPTION_CONFIG` entry from `getEnterpriseAdminItems`. No positional fix needed; remaining entries are sorted alphabetically.
- [ ] **`src/constants/index.ts`**: remove `SettingsTab.AI_ADOPTION_CONFIG`.
- [ ] **`src/constants/pageTitles.ts`**: remove the `'ai-adoption-config': 'AI Adoption Config'` entry.
- [ ] Run `npm run typecheck` — must pass cleanly with zero errors.

---

## Negative-Constraints Pass

| Constraint source | Constraint | Honored by |
|---|---|---|
| Non-goal 1 | No redirect/retirement notice for adoption URL | No task adds one |
| Non-goal 2 | No localStorage cleanup code | Task 1 deletes the file; no cleanup logic introduced |
| Non-goal 3 | No fallback widget for custom dashboards | No task adds a fallback state |
| Non-goal 4 | No backend endpoint or SDK removal | No task touches backend code |
| Non-goal 5 | No behavior changes to remaining Analytics tabs beyond unblocking the gate | Task 3 removes only the gate; adds nothing |
| Decisions | `loaded` removed entirely, not broadened | Task 2 deletes the field |
| Decisions | `config` param removed entirely from `fetchTabularData`, not made optional | Tasks 2 and 3 remove it |
| Decisions | `isCustomDashboard` simplified inline, not extracted | Task 4 simplifies inline |
| Decisions | `ConfigParam` removed with `AiAdoptionConfig` | Task 2 removes both together |
| Decisions | Adoption integration tests deleted outright, not converted to stubs | Task 1 deletes them |
