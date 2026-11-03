---
schema: sdlc-factory/code-review@1
decision: approve
reviewed_head: 3626e2e3fc06ed3d3b8bc68d9db888250323d72f
---

# Code review — 2026-10-22-epmcdme-16031-pinned-assistant-after-refresh

**Decision:** approve (final round, confidence high)  
**Reviewed head:** `3626e2e` · **Rounds:** final

All four lenses and standards ran; every story criterion and spec item passes, and reachability of each lens concern was checked against real call sites (putPreferences writes the response back to the store; no remaining assistant is_pinned/is_favorited readers). 1 deferred (pre-existing: pin/favorite PUT with unloaded preferences overwrites server lists, in code-review-deferred.local.md); 11 dismissed as noise or already handled.

## Open — 0

## Pre-existing (not blocking) — 1

- **Pin/favorite PUT with unloaded preferences overwrites server lists** — `src/store/assistants.ts:1083` — when `preferencesStore.preferences` is null (initial fetch failed with a non-404 error or has not finished), `pinAssistant` PUTs `[id]` only, and `favoritesStore.addFavorite` starts from an empty favorites object, replacing the user's stored list. Pre-existing: both store methods are unchanged by this diff and already built the list from `preferencesStore.preferences`; the ticket scope is displaying pin/favorite state after refresh, not guarding writes before preferences load.

## Coverage

| Acceptance criterion | Status | Notes |
|---|---|---|
| 1. Pin an assistant, refresh: it shows as pinned in the main Assistants list | pass | AssistantCard derives isPinned via useIsAssistantPinned; list-page test covers first render. |
| 2. Favorite an assistant, refresh: the star shows as favorited in the main Assistants list | pass | AssistantCard uses useIsAssistantFavorited; same list-page test. |
| 3. Criteria 1 and 2 hold whether preferences respond before or after v1/assistants | pass | Hook is reactive; list-page and hook tests cover late arrival without refetch. |
| 4. After refresh the Favorites tab shows the correct pin state on its items | pass | fetchFavoriteAssistants no longer stamps; cards derive pin; favorites tab tests added. |
| 5. normalizeAssistant items show correct pin/favorite state once preferences are loaded | pass | normalizeAssistant stamping removed; UI derives at render. |
| 6. Details page AssistantDetailsActions shows correct state after refresh, incl. late preferences | pass | useState copies replaced by hooks; details page test covers late preferences. |
| 7. Pin/unpin from a card updates card, details page, sidebar and the preferences PUT payload | pass | PUT payloads unchanged and asserted; putPreferences replaces the snapshot. |
| 8. Favorite/unfavorite updates the card, the preferences PUT and the Favorites tab | pass | removeFavorite still filters favoritesStore.assistants; PUT bodies asserted. |
| 9. Before preferences load, cards and details render unpinned/unfavorited, then switch without refetch | pass | Hooks use optional chaining with empty fallback; null-preferences tests added. |
| 10. Tests cover late-arriving preferences, Favorites-tab pin state, details actions, toggle flows | pass | Hook, card, list, details, favorites tests added; mutable preferences mock used. |
| Pin/favorite state is a render-time derivation from reactive preferencesStore snapshot | pass | useAssistantPreferenceFlags uses useSnapshot; no remaining UI reader of assistant flags. |
| No added loading state, no Outlet/list gating, no bootstrap order change | pass | Diff touches no App.tsx, useInitialDataFetch or list-loading code. |
| Scope: indexAssistants and normalizeAssistant stop stamping flags | pass | Stamping removed in assistants.ts. |
| Scope: fetchFavoriteAssistants no longer stamps pin state | pass | Assigns data.data ?? data directly. |
| Scope: AssistantCard pin button and favorite star use derivation | pass | Card uses the two hooks. |
| Scope: AssistantDetailsActions replaces useState copies | pass | Hooks replace state; optimistic setters removed. |
| Toggles keep working and PUT payloads unchanged | pass | pinAssistant/unpinAssistant and favorite path unchanged; payloads asserted. |
| is_pinned/is_favorited removed from Assistant type and assistant-side stamping/patching | pass | Type fields removed; remaining is_pinned is on FavoriteItem pinnedAssistants (allowed). |
| Keep FavoriteItem is_favorited and skill/workflow branches of setFavoritedInStore | pass | Skill and workflow branches retained; test asserts skills still stamped. |
| Existing preferences-snapshot consumers behave as before | pass | Sidebar, edit popup, StartNewChatModal untouched. |
| Feature flag features:pinnedAssistants still gates the pin button | pass | Gating retained in card and details. |
| Follow state-management guide (Component -> Store -> API; Valtio snapshots) | pass | Shared hook with useSnapshot; mutations stay in stores. |
| Non-goals respected: no new deps, no backend/SDK change, skills/workflows untouched | pass | Changed files limited to hook, assistant/favorites stores, type, cards/details, tests. |

Standards: commit-format pass · code-quality na · security pass
