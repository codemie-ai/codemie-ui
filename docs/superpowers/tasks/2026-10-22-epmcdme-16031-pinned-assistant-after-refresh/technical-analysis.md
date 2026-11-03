# Technical Research

**Task**: assistants pinned list refresh
**Generated**: 2026-10-22
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-16031 Assistants list: pinned assistant is not pinned after page refresh

Repository: /home/volhamakarava/codemie-dev/codemie-ui (read its AGENTS.md and .ai-run/guides/ first). Bug: in the Assistants list, an assistant the user pins is shown as unpinned after a page refresh. Find how pinning is stored/fetched (store, API call, list rendering, any localStorage/backend persistence) and identify the likely root cause.

---

## 2. Codebase Findings

Repo: `codemie-ui` (React 18 / TS / Vite / Valtio / Vitest). Frontend only; no backend code here.

### Existing Implementations
- Persistence is **backend-backed user preferences**, not localStorage: `GET/PUT v1/preferences/{userId}` with `pinned_assistants: string[]` (`src/types/entity/favorites.ts` `UserPreferences`).
- `src/store/preferences.ts` `preferencesStore`: `preferences` starts `null`; `fetchPreferences(userId)` (404 -> PUT empty prefs); `putPreferences` replaces `preferences` with the PUT response.
- `src/store/assistants.ts`:
  - `pinAssistant(id)` (~L1094): PUTs `pinned_assistants: [...current, id]`, then sets `is_pinned: true` on `assistantsStore.assistants` and appends to `pinnedAssistants` (sidebar list). `unpinAssistant` mirrors it.
  - `indexAssistants(...)` (~L255-320): after fetching `v1/assistants`, **computes `is_pinned` client-side** as `preferencesStore.preferences?.pinned_assistants ?? []).includes(assistant.id)` (~L302-311). The backend list response is not the source of `is_pinned`. Same derivation in `normalizeAssistant` (~L209-219).
  - `fetchPinnedAssistants()` (~L1043): sidebar list, built from `preferences.pinned_assistants`; returns early with `[]` if preferences null/empty.
- `src/store/favorites.ts` `fetchFavoriteAssistants` (~L193): same client-side derivation from `preferencesStore` for the Favorites tab.
- Rendering: `src/pages/assistants/components/AssistantList/AssistantCard/AssistantCard.tsx` reads `assistant.is_pinned` (L309-312) for `PinAssistantButton`; shown only if feature flag `features:pinnedAssistants` (`usePinnedAssistantsEnabled`). Toggle handler L119-131 calls `assistantsStore.pinAssistant` + `favoritesStore.patchAssistantPinned`.
- List loading: `AssistantsListPage.tsx` effect (L191-205) -> `useAssistantsList` -> `useAssistants.loadAssistants` -> `assistantsStore.indexAssistants`. `AssistantList.tsx` renders `assistantsStore.assistants` via `useSnapshot`.

### Architecture and Layers Affected
Store layer (`src/store/assistants.ts`, `preferences.ts`, `favorites.ts`), app bootstrap hook (`src/hooks/appLevel/useInitialDataFetch.tsx`, called from `src/App.tsx`), page/hook layer (`AssistantsListPage`, `useAssistants`, `useAssistantsList`), component (`AssistantCard`).

### Integration Points
- Refresh bootstrap order in `useInitialDataFetch` (called by `App.tsx` L56): `fetchCustomerConfig` -> `userStore.loadUser()` -> `Promise.all([preferencesStore.fetchPreferences, fetchProfileSettings])` -> `fetchPinnedAssistants`.
- `App.tsx` (L68-89) renders `<Outlet />` as soon as `user && isConfigFetched`. `userStore.loadUser` (`src/store/user.ts` L135-157) sets `userStore.user` **before** its chain continues into `getUserData`, so routes mount before preferences fetch even starts.
- Other consumers of `pinned_assistants`: `NavigationPinnedSection.tsx` (calls `fetchPinnedAssistants` on mount), `PinnedAssistantsEditPopup.tsx` (reads `preferencesStore` reactively via `useSnapshot`, calls `indexAssistants` with 50), `StartNewChatModal.tsx`.

### Patterns and Conventions
Component -> store -> API; stores are Valtio proxies; guides: `.ai-run/guides/patterns/state-management.md`. `is_pinned` is a derived, denormalised flag copied onto list items at fetch time (not reactive to later preferences changes).

---

## 3. Documentation Findings

### Guides and Architecture Docs
`.ai-run/guides/` exists (state-management, architecture, testing, etc.); none mention pinning/preferences ordering. State-management guide mandates Component -> Store -> API.

### Architectural Decisions
Commit `731c0218d` (EPMCDME-11546) moved user profile storage from localStorage to backend; preferences already backend-backed. No ADR on preferences load ordering. Existing comment in `useChatSidebarSectionPersistence.ts` L36 acknowledges that data from `useInitialDataFetch` settles asynchronously.

### Derived Conventions
Other derived flags (`is_favorited`, `is_liked`) follow the same fetch-time derivation; `updateAssistantsWithLikedStatus` is a post-fetch patch precedent.

---

## 4. Testing Landscape

### Existing Coverage
- `src/store/__tests__/assistants.test.ts`: mocks `@/store/preferences` as `{ preferences: null }`; only asserts `is_pinned` defaults to false with no prefs (L182-216). No test for pins applied when prefs are loaded after the list, or for `indexAssistants` pin derivation.
- `src/pages/assistants/__tests__/AssistantsListPage.integration.test.tsx`: pin PUT to `v1/preferences/test-user-id` (L551-605), assistant fixtures `is_pinned: false`.
- `src/pages/assistants/components/AssistantList/AssistantCard/__tests__/AssistantCard.test.tsx`; `src/pages/assistants/hooks/__tests__/useAssistantsList.test.tsx`.
- `src/setupTests.tsx` L270 seeds `pinned_assistants: []`.

### Testing Framework and Patterns
Vitest + React Testing Library, projects `unit` and `integration`; `mockAPI(method, url, body)` helper in integration tests; store modules mocked with `vi.mock`.

### Coverage Gaps
No test for ordering between `fetchPreferences` and `indexAssistants`/page mount; no test for `useInitialDataFetch`.

---

## 5. Configuration and Environment

### Environment Variables
None specific to pinning.

### Configuration Files
Feature flag `PINNED_ASSISTANTS: 'features:pinnedAssistants'` in `src/constants/featureFlags.ts` L24, gating the pin button (`src/hooks/useFeatureFlags.ts` L80).

### Feature Flags and Deployment Concerns
Only the flag above. No deployment manifests involved. Working tree has an unrelated modification to `.codemie/codemie-cli.config.json`.

---

## 6. Risk Indicators

- **Likely root cause (code-evidenced, not reproduced)**: race on page refresh. `AssistantsListPage` mounts and calls `indexAssistants` as soon as `userStore.user` is set; `preferencesStore.preferences` is still `null` (fetched later in `useInitialDataFetch`). `indexAssistants` then stamps `is_pinned: false` on every item and nothing re-derives it when preferences arrive. Pinning itself persists correctly (PUT succeeds, sidebar `fetchPinnedAssistants` runs after preferences load and shows it). The intermittency depends on which of `v1/assistants` and `v1/preferences/{id}` returns first.
- Same pattern exists in `favoritesStore.fetchFavoriteAssistants` (Favorites tab) and `normalizeAssistant`; a fix confined to `indexAssistants` could leave those stale.
- Speculative: fix options are (a) gate list loading / `Outlet` on preferences being loaded, (b) derive `is_pinned` at render time from `useSnapshot(preferencesStore)` rather than copying at fetch time, (c) re-map `assistantsStore.assistants` (and favorites) when preferences load. Option (b) also removes drift between store flag and preferences. Not verified.
- Speculative: also verify the backend list response does not itself return a trustworthy `is_pinned`; the client currently overrides it regardless (backend repo not inspected).
- Existing unit test mocks `preferencesStore` as a static object, so tests for a reactive fix need a mock with a mutable `preferences`.
- Not ruled out: `fetchPreferences` failure (non-404) leaves `preferences` null with only `error` set, which would also render everything unpinned; and `pinAssistant` early-return if `userStore.user` stale. Not reproduced.

---

## 7. Summary for Complexity Assessment

The change is frontend-only and confined to the store/bootstrap layers of `codemie-ui`: `src/store/assistants.ts` (and probably `favorites.ts`), possibly `useInitialDataFetch.tsx`/`App.tsx` or `AssistantCard.tsx` depending on the chosen approach. Expected file surface is small (2-4 source files plus tests). Pinning is persisted in the backend preferences endpoint, not localStorage; the sidebar pinned list is correct after refresh because it is computed after preferences load, while the Assistants list copies `is_pinned` at fetch time and can run before preferences load.

Technical novelty is low: no new API, dependency or config; the pattern (derive flag from `preferencesStore`) already exists. The design decision is where to fix the ordering (gate, reactive derivation, or re-map on load) and whether to cover the Favorites tab and `normalizeAssistant` consistently.

Test posture is thin around this path: store tests mock preferences as a static `null`, and nothing covers load ordering. Main risks are an unreproduced race (confirm in a browser with a delayed preferences response) and regressions in the sidebar/popup that also consume the preferences snapshot. No backend or SDK change appears to be needed (not verified in `codemie`).

---

## 8. External References

None named by the task.
