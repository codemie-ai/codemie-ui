# EPMCDME-16031: Pinned assistant shows as unpinned after page refresh

Size: M (complexity-assessment.json, total 15). Frontend only (`codemie-ui`); no backend, SDK or API change.

## Problem

A user pins an assistant; the pin is saved correctly (`PUT v1/preferences/{userId}`, `pinned_assistants`). After a browser refresh the Assistants list shows it as unpinned, while the sidebar pinned section still shows it. The favorite star has the same defect.

Root cause (code-evidenced, not yet reproduced): `is_pinned` and `is_favorited` are fetch-time copies, not live state. `assistantsStore.indexAssistants` (`src/store/assistants.ts` ~L255-320, derivation ~L302-311), `normalizeAssistant` (~L209-219) and `favoritesStore.fetchFavoriteAssistants` (`src/store/favorites.ts` ~L193) stamp them from `preferencesStore.preferences` (`pinned_assistants`, `favorites.assistants`). On refresh `AssistantsListPage` mounts as soon as `userStore.user` is set (`App.tsx` L68-89), before `useInitialDataFetch` has loaded preferences. `preferences` is still `null`, so every item gets `false`, and nothing re-derives the flags when preferences arrive. Which one wins depends on whether `v1/assistants` or `v1/preferences/{id}` returns first.

`AssistantDetailsActions` copies both flags into `useState` (`isPinned`, `isFavorited`), so the details page goes stale too. The sidebar pinned popup also edits preferences, so any stored copy in the list drifts from preferences unless the UI derives the state at render time.

## Chosen approach (confirmed by the user)

Make pin and favorite state a render-time derivation from the reactive `preferencesStore` snapshot (`useSnapshot(preferencesStore)` or an equivalent small shared hook or selector): pinned = id in `preferences.pinned_assistants`; favorited = id in `preferences.favorites.assistants`. Assistant UI must not read `assistant.is_pinned` / `assistant.is_favorited` copied at fetch time. The list renders immediately with no added loading state, and indicators are correct as soon as preferences arrive, whatever the response order.

Ruled out:
- Gating `Outlet` or list loading on preferences. It adds latency to every route. `preferencesStore` has no loaded-promise (only `loading`/`error` flags), so gating would need new store API plus a failure path.
- Re-mapping stored lists when preferences load. The indicator would flip visibly, and the stored copies would still drift when the sidebar popup edits preferences.

## Scope

Assistants only, for both `is_pinned` and `is_favorited`:
- Main Assistants list (`indexAssistants` path, `AssistantList` / `AssistantCard`).
- `normalizeAssistant`.
- Favorites tab (`favoritesStore.fetchFavoriteAssistants`): pin state only. Items there are favorited by definition.
- `AssistantCard`: pin button (~L309-312) and favorite star.
- `AssistantDetailsActions`: replace the `useState` copies of `isPinned` and `isFavorited` with the render-time derivation.

Behavior and constraints:
- The toggles (`AssistantCard.tsx` ~L119-131, `assistantsStore.pinAssistant` / `unpinAssistant`, `favoritesStore.patchAssistantPinned`, and the favorite/unfavorite path) keep working. After the preferences PUT completes, the card, details page, sidebar and Favorites tab show the new state, and PUT payloads are unchanged.
- The `is_pinned` and `is_favorited` fields are removed from the Assistant type and the assistant-side stamping and patching code. Any other reader of them is migrated to the derivation.
- Keep the shared `FavoriteItem` / favorites-type `is_favorited` and the skill and workflow branches of `favorites.ts` `setFavoritedInStore`. Only the assistant branch goes.
- Existing consumers of the preferences snapshot (`NavigationPinnedSection`, `PinnedAssistantsEditPopup`, `StartNewChatModal`) behave as before.
- The feature flag `features:pinnedAssistants` still gates the pin button.
- Follow `.ai-run/guides/patterns/state-management.md` (Component -> Store -> API; Valtio snapshots).

## Acceptance criteria

1. Pin an assistant, refresh: it shows as pinned in the main Assistants list.
2. Favorite an assistant, refresh: the star shows as favorited in the main Assistants list.
3. Criteria 1 and 2 hold whether `v1/preferences/{id}` responds before or after `v1/assistants` (delayed-response case).
4. After refresh the Favorites tab shows the correct pin state on its items.
5. Items from `normalizeAssistant` show correct pin and favorite state once preferences are loaded.
6. On the assistant details page after refresh, `AssistantDetailsActions` shows the correct pinned and favorited state, including when preferences load after the page mounts.
7. Pin/unpin from a card updates the card, details page, sidebar pinned list and the preferences PUT payload as today.
8. Favorite/unfavorite updates the card, the preferences PUT and the Favorites tab as today.
9. Before preferences load, cards and the details actions render unpinned and unfavorited without errors, then switch with no list refetch.
10. Tests cover late-arriving preferences for pin and favorite, the Favorites-tab pin state, the details-page actions and the toggle flows. Test scaffolding uses a mutable `preferencesStore` mock instead of the existing static `{ preferences: null }`.

## Non-goals

- No change to bootstrap order (`useInitialDataFetch`, `App.tsx`) and no gating of `Outlet` or list loading on preferences.
- No handling of a failed preferences fetch (non-404): current behavior is kept, and an unpinned/unfavorited list in that case is accepted.
- No backend, SDK, endpoint or feature-flag change, and the backend list-response flags, if any, are not used.
- No change to `fetchPinnedAssistants`, `PinnedAssistantsEditPopup` or the pin/star UI design.
- `is_liked` is untouched.
- Skills and workflows `is_favorited` (`skills.ts` ~L160, `workflows.ts` ~L190, `SkillCard`, `WorkflowCard`) is a documented follow-up, not in this ticket.
- The shared `FavoriteItem` / favorites-type `is_favorited` and the skill and workflow branches of `setFavoritedInStore` are kept.
- No new dependencies.

## Risks

- The race is code-evidenced but not reproduced in a browser; verify with a delayed `v1/preferences` response.
- Regression risk for the sidebar, edit popup and `StartNewChatModal`, which share the preferences snapshot.
- Removing the type fields will surface every reader (including tests and fixtures with `is_pinned: false`); the plan must enumerate them.
- `AssistantDetailsActions` has local state and optimistic updates; the plan must make sure the toggle still reflects the PUT result.
