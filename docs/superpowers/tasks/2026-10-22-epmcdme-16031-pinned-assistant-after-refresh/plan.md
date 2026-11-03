# EPMCDME-16031 Pinned and favorited state after refresh - Implementation Plan

> For agentic workers: use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** For assistants, the pinned and favorited state shown in the UI is derived at render time from the reactive `preferencesStore` snapshot, not from `is_pinned` / `is_favorited` copies stamped at fetch time.

**Approach:** One small hooks file exposes a pair of hooks over `useSnapshot(preferencesStore)`. `AssistantCard` and `AssistantDetailsActions` use them. Then the assistant-side stamping, patching and the two Assistant type fields are removed. Commit per task using the repository's existing convention (ticket key EPMCDME-16031 required). Follow `.ai-run/guides/patterns/state-management.md`.

**Spec:** `spec.md` in this task directory.

**Global constraints:** frontend only; no change to `useInitialDataFetch` / `App.tsx`; flags `features:pinnedAssistants` and `features:favorites` still gate the buttons; no new dependencies; `is_liked`/`is_disliked` and skill/workflow `is_favorited` untouched.

**Review focus:** (1) preferences null/empty renders unpinned/unfavorited without error (Task 1); (2) preferences arrive after list or after details mount flips with no refetch (Tasks 2, 4); (3) `pinned_assistants` containing falsy entries (`pinAssistant` filters with `Boolean`) and missing `favorites` key must not throw (Task 1); (4) details-page toggle must reflect the PUT result, and a failed PUT must not leave the button flipped (Task 2); (5) Favorites tab and unfavorite-then-`reloadAssistants` flow (Task 4).

## Field usage inventory (verified by grep over `src/`, `mock-server/`)

Decision: remove `is_pinned` and `is_favorited` from the `Assistant` type (`src/types/entity/assistant.ts:159-160`). No reader outside the two components below remains after migration.

| Kind | Location | Action |
|---|---|---|
| Reader | `AssistantCard.tsx:120,311` (pin), `:317,319` (favorite) | hooks (Task 2) |
| Reader | `AssistantDetailsActions.tsx:60-61` (`useState` for both, setters at 177, 189, 210, plus `setIsFavorited` calls) | hooks (Task 2) |
| Writer | `assistants.ts:217-218` (`normalizeAssistant`), `:310-311` (`indexAssistants`), `:1101-1104`, `:1124-1126` (pin/unpin map over `assistants`) | remove (Task 3) |
| Writer | `favorites.ts:130-134` `patchAssistantPinned` (+ type L98), `:193-197` stamp in `fetchFavoriteAssistants`, `:39` assistant branch of `setFavoritedInStore` | remove (Task 3) |
| Kept | `FavoriteItem` (`types/entity/favorites.ts:40-41`), `pinnedAssistants` sidebar stamps (`assistants.ts:1065,1108`, `fetchPinnedAssistants` is a non-goal), skill/workflow branches of `setFavoritedInStore`, `skills.ts:160`, `workflows.ts:190`, `SkillCard`, `WorkflowCard`, `types/entity/skill.ts:89`, `workflow.ts:43` | do not touch |
| Test | `store/__tests__/assistants.test.ts:182-190,209-217` (+ mock L43-44) | rewrite (Task 3) |
| Fixture | `is_pinned`/`is_favorited` in `AssistantsListPage` (L49-50, 154, 771), `AssistantDetailsPage` (L87-88), `AssistantTemplatesPagination` (L56-57), `EditAssistantPage` (L62-63) integration tests; `FavoritesPagePagination` assistant fixture (L37-38 only; L54 skill and L65 workflow stay) | delete (Task 3) |
| Test mock | `AssistantCard.test.tsx:82` `patchAssistantPinned` | delete (Task 3) |

`AssistantDetailsActions` is also rendered by `RemoteAssistantDetails.tsx` (its test needs no field change, but must still pass).

### Task 1: Preference-derived flag hooks

**Files:** create `src/hooks/useAssistantPreferenceFlags.ts`, `src/hooks/__tests__/useAssistantPreferenceFlags.test.ts`.

**Interfaces:** Produces `useIsAssistantPinned(id: string): boolean` (id in `preferences.pinned_assistants`) and `useIsAssistantFavorited(id: string): boolean` (id in `preferences.favorites.assistants`). Both false while `preferences` is null or the list is missing.

- [ ] Implement both over `useSnapshot(preferencesStore)` using optional chaining and `?? []`.
- **Test-first: yes** - with the real `preferencesStore` and `preferences = null` both hooks return false; after assigning `{ pinned_assistants: ['a1', ''], favorites: { assistants: ['a2'], skills: [], workflows: [] } }` post-render, the same rendered hooks switch: pinned true for `a1` only, favorited true for `a2` only; `favorites` undefined does not throw. Reset the store in `beforeEach`.

### Task 2: Use the hooks in `AssistantCard` and `AssistantDetailsActions`

**Files:** `src/pages/assistants/components/AssistantList/AssistantCard/AssistantCard.tsx:119-131,309-324`, `src/pages/assistants/components/AssistantDetails/components/AssistantDetailsActions.tsx:60-61,168-193,203-214`, `AssistantCard/__tests__/AssistantCard.test.tsx`, and the existing details tests in `AssistantDetailsPage.integration.test.tsx` (L718-811 pin/favorite PUT cases).

**Interfaces:** Consumes the Task 1 hooks.

- [ ] `AssistantCard`: use the hook values for `PinAssistantButton`, `FavoriteButton`, `handlePinToggle` and the favorite toggle. Drop both `favoritesStore.patchAssistantPinned` calls (L124, L130). `reloadAssistants` after remove-favorite stays.
- [ ] `AssistantDetailsActions`: delete the `isPinned` / `isFavorited` `useState` pairs and every `setIsPinned` / `setIsFavorited` call; derive both from the hooks. State now changes only when `putPreferences` replaces `preferences` with the PUT response, so a failed PUT no longer leaves a stale optimistic flip. Keep the `showUnpinConfirm` / `showRemoveFavorite` popup state.
- **Test-first: yes** - `AssistantCard.test.tsx`: stop mocking `useFeatureFlags` as constant false (make the flags a hoisted mutable value, enabled for new cases); use the real `preferencesStore` (not mocked today). Assert the pin and star buttons render unpinned/unfavorited while `preferences` is null, then pinned/favorited after `preferences` is set, with no rerender of props; clicking an unpinned pin calls `assistantsStore.pinAssistant` (add `pinAssistant`/`unpinAssistant` to its store mock). `AssistantDetailsPage.integration.test.tsx`: details actions show pinned and favorited when preferences load after mount, and after the pin PUT mock returns preferences containing the id the button shows pinned.

### Task 3: Remove the stored flags from stores, type, tests and fixtures

**Files:** per the inventory table (`assistants.ts`, `favorites.ts`, `types/entity/assistant.ts`, `assistants.test.ts`, five integration test files, `AssistantCard.test.tsx`).

- [ ] `normalizeAssistant`, `indexAssistants`: stop computing `is_pinned` / `is_favorited` (and the now-unused `pinnedIds` / `favoriteIds` locals); keep `nestedAssistants` and `is_global`.
- [ ] `pinAssistant` / `unpinAssistant`: keep PUT payloads and `pinnedAssistants` updates exactly; delete only the `assistantsStore.assistants` map that sets `is_pinned`.
- [ ] `favorites.ts`: delete `patchAssistantPinned` (type and impl) and the `is_pinned` stamp in `fetchFavoriteAssistants` (assign `(data.data ?? data)` directly); in `setFavoritedInStore` drop the assistant branch, leaving skill and workflow (call sites for `'assistant'` become a no-op; `addFavorite` lookup for the toast stays).
- [ ] Remove the two fields from `Assistant`; delete fixtures and the mock listed in the inventory.
- [ ] Final check: `grep -rn "is_pinned\|is_favorited" src` leaves only the "Kept" rows of the inventory.
- **Test-first: yes** - `assistants.test.ts`: change the `@/store/preferences` mock to a mutable object; assert `normalizeAssistant` and `indexAssistants` results have no `is_pinned` / `is_favorited` key even when preferences list the id, and `pinAssistant` still PUTs `{ pinned_assistants: [...current, id] }` and appends to `pinnedAssistants`. Add a `favorites.ts` store test that `addFavorite('assistant', id)` PUTs the updated `favorites` and leaves `assistantsStore.assistants` unchanged, while `addFavorite('skill', id)` still sets `is_favorited` on the skill.

### Task 4: Race and Favorites-tab integration coverage

**Files:** `src/pages/assistants/__tests__/AssistantsListPage.integration.test.tsx` (near L551-605 and the favorites-tab cases at L149 and L766), `src/pages/favorites/__tests__/FavoritesPagePagination.integration.test.tsx`.

- [ ] Add scenarios with `mockAPI` and the real `preferencesStore`, with `features:pinnedAssistants` and `features:favorites` enabled.
- **Test-first: yes** - (a) list responds first, then `preferencesStore.preferences` is set with the id in `pinned_assistants` and `favorites.assistants`: pin and star flip with no second `v1/assistants` call; (b) preferences set before the list: both set on first render; (c) Favorites tab item shows pinned after preferences arrive; (d) pin click PUTs `pinned_assistants` with the id appended and the card then shows pinned; favorite then unfavorite PUTs the matching `favorites.assistants` and the star updates.

## Negative constraints

Checked against the spec's Non-goals: no task touches `useInitialDataFetch` / `App.tsx`, the `Outlet`, or list-load gating; no re-mapping of stored lists on preferences load; failed-preferences handling unchanged; no backend/SDK/endpoint/flag change; `fetchPinnedAssistants`, `PinnedAssistantsEditPopup` and pin/star UI unchanged; `is_liked`/`is_disliked` and skill/workflow `is_favorited`, `FavoriteItem` fields and the skill/workflow branches of `setFavoritedInStore` are kept; no new dependencies.
