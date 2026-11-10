# EPMCDME-16885 Standalone Core Gating: UI Implementation Plan

**Goal:** When `v1/config` reports `features:core` with `settings.enabled === false`, hide every core entry, land on Analytics, and fire no core-only calls. Absent item, empty configs or failed fetch = core available.

**Architecture:** One constant plus `useCoreAvailable()` and `isCoreAvailable()` (present-and-false rule, copying `useMermaidEnabled`). Consumers use these, never `isConfigItemEnabled` (absent = off). Route hiding uses a new `CoreGuard` that throws the same 404 as `FeatureGuard`.

Commit per task using the repository's existing convention. Existing `skills`, `schedulersView`, `favorites` flags stay and combine with the core rule.

Negative-constraints pass: no new on-screen message (no task adds one); no Analytics tab hiding (Task 6 uses empty states only); no backend change; no flag-semantics change (Tasks 2-3 combine, not replace); no tests written (project rule); share link `/share/conversations/:token` untouched.

---

### Task 1: Core availability signal
**Files:** `src/constants/featureFlags.ts:19`, `src/hooks/useFeatureFlags.ts:158`, `src/utils/settings.ts:187`
- Add `FEATURE_FLAGS.CORE = 'features:core'` (comment: verify against merged EPMCDME-16884).
- Add `useCoreAvailable(): boolean` beside `useMermaidEnabled` (same `configs.find` rule: available unless `settings.enabled === false`).
- Add `isCoreAvailable(configs)` in `settings.ts` with the same rule, for non-React callers.

Test-first: no — project rule: tests only on request

### Task 2: Route guard and landing redirect
**Files:** `src/components/FeatureGuard.tsx`, `src/router.tsx` (`:119,142,228,433,815,824,843,351`)
- In `FeatureGuard.tsx` extract the 404 error construction into a local `notFoundError()` used by both guards, and add `CoreGuard` (reads `configs`, `isCoreAvailable`, throws when false, else renders children).
- In `router.tsx` wrap chats, assistants, skills, workflows and help (incl. `help/models`) in a pathless `CoreGuard` parent rendering `<Outlet/>`, per the favorites pattern (`:841`). Favorites and schedulers guards get a `CoreGuard` parent as well.
- Index route (`:815`): element renders `Chat` when `useCoreAvailable()`, else `<Navigate to="/analytics" replace />` (check the analytics route path at `:788`).
- Workflows: the `workflows` child loader redirects to `/workflows/my` before render; place the guard parent above it so the result is redirect then not-found. Verify this once.

Test-first: no — project rule: tests only on request

### Task 3: Navigation shell controls
**Files:** `src/components/Navigation/Navigation.tsx:75-184`, `MobileTopBar.tsx:124,140`, `NavigationPinnedSection/NavigationPinnedSection.tsx:52`, `NavigationAssistants.tsx:39`
- `Navigation`: with `useCoreAvailable()` false omit Chats, Assistants, Skills, Workflows, Schedulers, Favorites and Help; keep Applications, Integrations, Data Sources, Katas, Analytics.
- Logo (`handleCreateChat`, `Navigation.tsx:75`) and `MobileTopBar` logo/`handleCreateChat`: when core is off, push the analytics route and skip `chatsStore.startNewChat`.
- `NavigationPinnedSection` and `NavigationAssistants`: return `null` when core is off.

Test-first: no — project rule: tests only on request

### Task 4: Onboarding tours and shell mounting
**Files:** `src/configs/onboarding/navigationIntroduction.tsx:83-112`, `src/components/appLevel/AutoPopupManager.tsx:45-75`, `src/App.tsx:99-103`
- Add `condition: () => isCoreAvailable(appInfoStore.configs)` (mechanism as `assistantsOverview.ts:198`) to the steps for the logo, Chats, Assistants, Workflows, Skills, Schedulers, Favorites and Help.
- `AutoPopupManager` effect 1 and the first-visit tour effect run only after `isConfigFetched`, and skip core-page tour ids when core is off. `HelpPanel` and `FloatingKataWindow` need no change; confirm neither reads config before fetch.

Test-first: no — project rule: tests only on request

### Task 5: Skip core-only app-load calls
**Files:** `src/hooks/appLevel/useInitialDataFetch.tsx:26-73`, `src/pages/integrations/components/SettingsForm/hooks/useResourceOptions.ts:24-71`, `src/pages/workflows/components/WorkflowSelector.tsx:53`, `src/pages/assistants/components/AssistantSelector.tsx`
- In the hook, evaluate `isCoreAvailable(appInfoStore.configs)` after the awaited `fetchCustomerConfig` (the effect has `[]` deps; do not capture a render-time value). When false, skip `fetchPinnedAssistants`, `getHelpAssistants`, `getDefaultAssistant`, `getAssistantCategories`, `chatsStore.getFolders/getAssistantFolders/getChats`, `skillsStore.getSkillCategories`. Keep the other calls. Skipped stores are not reloaded if core flips on later (reload required); no code for that.
- Fix the wrong "no toaster" comment at `skills.ts:396`.
- `useResourceOptions` and the other selectors on visible pages: when core is off set options to `[]` and issue no request.

Test-first: no — project rule: tests only on request

### Task 6: Zero-toast load on remaining pages
**Files:** `src/hooks/appLevel/useInitialDataFetch.tsx:58,63`, `src/store/appInfo.ts` (`getLLMModels`), `src/store/applications.ts` (`fetchApplications`), `src/pages/analytics/AnalyticsPage.tsx:88`, `src/store/analytics.ts:94`
- Backend behaviour is unverified: trace each call (`getLLMModels`, `getEmbeddingsModels`, `fetchApplications`, `loadDashboards` and each Analytics tab request). For any that can error on a core-off backend, pass `skipErrorHandling` (`api.ts:398`) when core is off and render the tab's normal empty state from the `analyticsStore.error` entry instead of an error. Do not hide tabs.
- Accepted: a failed config fetch keeps core visible (AC7 wins) and may toast; no retry logic.

Test-first: no — project rule: tests only on request
