# Technical Research

**Task**: skills workflows favorites preferences (EPMCDME-16337)
**Generated**: 2026-11-11
**Research path**: filesystem

---

## 1. Original Context

Title: Skills and workflows: favorite state lost after page refresh (EPMCDME-16337, Bug, repo codemie-ui, branch EPMCDME-16337_favorite-star-after-refresh cut from main which already contains MR !2181 / EPMCDME-16031, e.g. src/hooks/useAssistantPreferenceFlags.ts)

Context
- EPMCDME-16031 (codemie-ui MR !2181) fixed the same defect for assistants: after refresh, pinned/favorited assistants showed as not pinned/favorited. Cause: the list copied the flags from the user's saved preferences at load time, and on refresh the list can load before preferences. Fix: the UI reads the state from the user's preferences whenever it shows a star or pin. The MR names skills and workflows as a known follow-up.
- On main, the Skills list and Workflows list (including marketplace views) copy the favorite flag the same way (skillsStore.indexSkills in src/store/skills.ts, workflowsStore.indexWorkflows in src/store/workflows.ts). After refresh a favorited skill/workflow can show an unfilled star until the user switches category or page.
- Favorites page not affected today: backend marks every item there as favorited. Skill and workflow details pages have no favorite star.
- Workflow template cards show a favorite star that can never appear filled (templates are never marked favorited; clicking the star does not update the template card). Assistant template cards show no star.
- Separate pre-existing issue, NOT in this story: favoriting/unfavoriting before preferences have loaded can overwrite saved favorites.

Story: As a CodeMie user who marks skills and workflows as favorites, I want the favorite star on skill and workflow cards to show my saved favorites after I reload the page so that I can trust the star.

Acceptance Criteria
1. Favorited skill -> reload on Skills list -> its star shows favorited.
2. Favorited workflow -> reload on Workflows list -> its star shows favorited.
3. Favorited skills/workflows -> reload on the marketplace view of Skills or of Workflows -> favorited items show a filled star.
4. List loads before preferences on reload -> when preferences arrive, stars switch to the correct state without reloading the list and without visible loading delay; holds whichever of the two loads first.
5. Favorite/unfavorite a skill/workflow card -> star updates once the change is saved, and after reload keeps the new state.
6. Unfavorite -> confirm removal popup -> star becomes unfilled; cancel -> star stays filled and nothing is saved.
7. Saving a favorite/unfavorite fails -> error shown -> star keeps its previous state.
8. Favorites page (All, Skills or Workflows tab): on load/reload every skill and workflow card shows a filled star, including before preferences have loaded.
9. Workflow templates: no favorite star shown on any template card.
10. Favorites feature turned off -> no star on skills, workflows or templates (unchanged behaviour).
11. Preferences not loaded yet -> skill and workflow cards render an unfilled star without errors.
12. Assistants: pin and favorite behaviour unchanged from EPMCDME-16031.

Out of Scope: guarding saves made before preferences load; making workflow templates favoritable; adding a star to skill/workflow details pages; handling a failed (non-404) preferences load (all stars unfilled is accepted, as for assistants); likes/dislikes; ANY backend, SDK or API change.
Decisions: D1 refresh bug for skills+workflows plus hiding the workflow template star. D2 hide the template star, matching assistant templates. D3 Favorites page star stays filled before preferences load (every item there is a favorite by definition). D4 follow the same approach as EPMCDME-16031/MR !2181.
Constraints: codemie-ui only; no backend or SDK change.

EXTRA REQUIREMENT FOR THIS RESEARCH (feasibility gate): decide whether codemie-ui ALONE can satisfy ALL 12 acceptance criteria; include section "Scope Check: codemie-ui only?" (one row per criterion); verify against code; note anything an earlier analysis may have gotten wrong now that !2181 is merged. No source modification.

---

## 2. Codebase Findings

### Existing Implementations

Purpose A: "the star on a skill/workflow card reflects my saved favorites"
- Source of truth: `preferencesStore.preferences.favorites.{skills,workflows,assistants}` (`src/store/preferences.ts:23-27`, shape `UserPreferences` in `src/types/entity/favorites.ts`). Loaded once at app start by `fetchPreferences` in `src/hooks/appLevel/useInitialDataFetch.tsx:43` (after `loadUser`, in parallel with profile settings); list pages fetch independently, so order is not guaranteed. 404 -> creates empty prefs via PUT (`preferences.ts:48-52`); other errors set `error` and leave `preferences` null.
- Copy-at-load (the defect): `skillsStore.indexSkills` builds a Set from preferences and writes `is_favorited` per skill (`src/store/skills.ts:157-161`); `workflowsStore.indexWorkflows` same (`src/store/workflows.ts:187-191`). These are the only two writers besides `setFavoritedInStore` (below). Both are one-shot copies; nothing re-derives when preferences later change.
- Patch-on-toggle: `setFavoritedInStore` (`src/store/favorites.ts:35-40`) rewrites `is_favorited` in `skillsStore.skills` / `workflowsStore.workflows` after a successful add/remove; assistants branch was removed by !2181.
- Readers of the flag: `SkillCard.tsx:206-210` (`skill.is_favorited`), `WorkflowCard.tsx:192-196` (`workflow.is_favorited`). Types declaring it: `Skill` (`src/types/entity/skill.ts:89`), `Workflow` (`src/types/entity/workflow.ts:43`), local `Workflow` in `WorkflowCard.tsx:52`, `FavoriteItem` (`favorites.ts` types).
- Reference implementation (assistants, merged): `useIsAssistantFavorited(id)` / `useIsAssistantPinned(id)` in `src/hooks/useAssistantPreferenceFlags.ts:25-33` - `useSnapshot(preferencesStore)` then `includes(id)`, `false` while preferences null. Consumed by `AssistantCard.tsx:88-89,355-365` and `AssistantDetailsActions.tsx`. !2181 also deleted the `is_pinned`/`is_favorited` copies from `normalizeAssistant`, `indexAssistants`, `favoritesStore.fetchFavoriteAssistants`, removed the `Assistant.is_*` type fields, and removed `patchAssistantPinned` (commit `d783f00fe`). There is NO skill or workflow equivalent hook today.
- Toggle path (shared by both cards and assistants): `favoritesStore.addFavorite/removeFavorite` (`favorites.ts:244-285`): builds new list from `preferencesStore.preferences?.favorites` (falls back to empty -> the out-of-scope overwrite issue), `await preferencesStore.putPreferences` (replaces whole `preferences` from PUT response, `preferences.ts:56-58`), on failure `toaster.error` and returns without touching state; on success patches stores/toasts. `removeFavorite` also filters the item out of `favoritesStore.{skills,workflows,assistants,favorites}`.
- Remove confirm: `RemoveFavoriteConfirmPopup` in `SkillCard.tsx:218-228`, `WorkflowCard.tsx:317-325`: cancel only closes; confirm awaits `removeFavorite`, closes popup regardless of result, then `reloadSkills?.()` / `reloadWorkflows?.()`.
- Feature flag gate: `useFavoritesEnabled` (`src/hooks/useFeatureFlags.ts:78`); `SkillCard.tsx:198`, `WorkflowCard.tsx:185` (also adds `pr-14` title padding at `:211`).

Purpose B: "Favorites page shows every item as favorited"
- Backend favorites endpoints `v1/preferences/{userId}/favorites/{assistants|skills|workflows}` return `FavoriteItem` with `is_favorited=True` hard-coded (codemie repo, read-only check: `src/codemie/rest_api/models/user_preferences.py:68`; set explicitly in `src/codemie/service/user_preferences_service.py:186` skills, `:247` workflows, `:296` assistants).
- UI stores them untouched: `fetchFavoriteWorkflows` `favorites.ts:238` (`data.data ?? data`); `fetchFavoriteSkills` `:212-216` (spreads item + reactions). Rendered by `FavoritesPage.tsx:143-168` through the same `SkillCard`/`WorkflowCard`, and by `WorkflowsList.tsx:92,290` (scope FAVORITES via `useFavoriteWorkflows`) on the Workflows page favorites tab. The card currently shows filled because it reads the payload `is_favorited`; it never consults preferences.
- Skills/workflows list endpoints (`v1/skills`, `v1/workflows`) carry no `is_favorited`: grep of the backend `src` finds the field only in the three user-preferences files above.

Purpose C: "workflow templates show no star"
- `WorkflowTemplates.tsx:158-163` renders `WorkflowCard isTemplate`. `WorkflowCard.tsx:185` gates the star only on `isFavoritesEnabled`, not on `isTemplate` (other `isTemplate` branches: `:130,:142,:252,:288,:305`). Assistant template cards show no star (per ticket; assistant card is a separate component).

Other touched code: `src/pages/skills/components/SkillsGrid.tsx:67` (list/marketplace -> `SkillCard`, passes `isMarketplace`); `SkillsNavigation.tsx`, `WorkflowsNavigation.tsx` (use `useFavoritesEnabled` for tabs only).

### Decisions Already in the Code
- Convention (D4): derive-at-render hook over `useSnapshot(preferencesStore)`, null -> false (`useAssistantPreferenceFlags.ts:25-33`), and no copy on list items. Alternative used before: copy at list load (`skills.ts:157`, `workflows.ts:187`). Reason recorded in !2181 commit message: list can load before preferences.
- Preferences PUT replaces the entire `preferences` object (`preferences.ts:56-58`), so a reactive snapshot consumer updates only after the save succeeds (matches AC5/AC7 by construction); no optimistic update exists.
- `Favorites` flag keeps toast on success in the store, not the card (`favorites.ts:255`).
- Data direction: favorites are stored as id arrays per type (id -> boolean via `includes`), which is the direction the cards need; the Favorites endpoints store the flag per item (always true).
- Server list endpoints do not return per-user favorite flags; the only per-user favorite data on the client is preferences (or the favorites endpoints).

### Task Statements Checked Against the Code
- "indexSkills / indexWorkflows copy the flag" - holds (`skills.ts:157-161`, `workflows.ts:187-191`).
- "marketplace views copied the same way" - holds: the same functions serve marketplace scope (`skills.ts:170-177` runs reaction update after the copy; `workflows.ts:176-177` only changes the URL). No separate marketplace copy.
- "Favorites page not affected today: backend marks every item favorited" - holds against the sibling backend (`user_preferences.py:68`, service lines above); in this repo only test fixtures show it (`FavoritesPagePagination.integration.test.tsx:53,64`). Note: the card does NOT read preferences, so today it is correct before preferences load; it would regress to unfilled if cards switched to preferences-only (D3 guards this; keeps the payload flag as the mechanism for Purpose B in place; consumers: `FavoritesPage.tsx:146,160`, `WorkflowsList.tsx:290` in favorites scope).
- "Skill and workflow details pages have no favorite star" - holds: `FavoriteButton` is imported only in `SkillCard.tsx`, `WorkflowCard.tsx`, `AssistantCard.tsx`, `AssistantDetailsActions.tsx` (grep).
- "Workflow template cards show a star that can never appear filled; click does not update template" - holds: star gated only by `isFavoritesEnabled` (`WorkflowCard.tsx:185`); template objects come from a separate templates list, not `indexWorkflows`; `setFavoritedInStore` only patches `workflowsStore.workflows`.
- "Assistant template cards show no star" - not re-verified beyond AssistantCard (out of the files this task touches).
- "Pre-existing overwrite issue before preferences load" - holds: `favorites.ts:246,271` fall back to `EMPTY_FAVORITES` when preferences null.
- "Failed non-404 preferences load -> all unfilled" - holds: `preferences.ts:53-54` leaves `preferences` null.
- "!2181 names skills/workflows as follow-up" / contents of the hook - holds (hook file above; commit `d783f00fe`).
- D4 "same approach as !2181" keeps in place: `setFavoritedInStore` (`favorites.ts:35-40`) still writes `is_favorited` to skills/workflows stores and `favorites.test.ts:59-62` asserts it. Consumers: only the two cards' current reads.

### Consumers of Changed Contracts
Contract: `is_favorited` on `skillsStore.skills[]` / `workflowsStore.workflows[]` items.
- Readers: `SkillCard.tsx:206-208`, `WorkflowCard.tsx:192-194`; no other source reader (grep `is_favorited|isFavorited` outside assistants: only types, the two stores, favorites.ts, cards).
- Writers: `skills.ts:158-161`, `workflows.ts:188-191`, `favorites.ts:35-40`.
- Same cards also receive `FavoriteItem` payloads from `favoritesStore` carrying `is_favorited: true` (Favorites page, workflows favorites tab); this is the only place the payload flag is meaningful.
- Tests asserting the current contract: `favorites.test.ts:59-62`; `WorkflowsListPage.integration.test.tsx:63,1093,1274,1296,1848` (fixtures set `is_favorited`, including `true` at 1296 on a non-favorites list); `FavoritesPagePagination.integration.test.tsx:53,64`; `WorkflowCard.test.tsx`/`SkillCard.test.tsx` exist (not inspected line by line).
- Contract: `FavoriteButton` props (`isFavorited`, `onToggle`, `loading?`) - unchanged; 4 consumers.

### Architecture and Layers Affected
Store (valtio: skills, workflows, favorites, preferences), hooks (`src/hooks`), page components (`pages/skills/components`, `pages/workflows/components`, `pages/favorites`). No API/service layer change.

### Integration Points
Backend endpoints used (all existing): `GET/PUT v1/preferences/{userId}`, `GET v1/preferences/{userId}/favorites/{skills,workflows,assistants}`, `GET v1/skills`, `GET v1/workflows`. PUT returns `UserPreferencesResponse` (`user_preferences_router.py:53`), consumed whole at `preferences.ts:57`.

### Patterns and Conventions
valtio `useSnapshot` hooks; stores as proxies; `.ai-run/guides/` present (state-management, component patterns); tests only when explicitly requested per AGENTS.md.

---

## 3. Documentation Findings

### Guides and Architecture Docs
`.ai-run/guides/` exists (patterns/state-management.md, components/, testing/); AGENTS.md routes State -> `patterns/state-management.md`. Not read in depth; conventions confirmed from code.

### Architectural Decisions
Prior analysis of EPMCDME-16031 shipped in repo at `docs/superpowers/tasks/*16031*` (commit `d783f00fe` adds technical-analysis.md, spec.md, plan.md, decisions.jsonl). Not re-read; `git show d783f00fe` diff used instead.

### Derived Conventions
See Section 2 "Decisions".

---

## 4. Testing Landscape

### Existing Coverage
- Hook: `src/hooks/__tests__/useAssistantPreferenceFlags.integration.test.ts` (null -> false; flips when preferences arrive; missing lists).
- Stores: `src/store/__tests__/favorites.test.ts`, `skills.test.ts`; `assistants.test.ts` (updated by !2181). No `workflows` index test mentioning favorites.
- Components/pages: `SkillCard.test.tsx`, `WorkflowCard.test.tsx`, `WorkflowTemplates.test.tsx`, `WorkflowsList.test.tsx`, `WorkflowsListPage.integration.test.tsx`, `SkillsListPagePagination.integration.test.tsx`, `FavoritesPagePagination.integration.test.tsx`.

### Testing Framework and Patterns
Vitest + Testing Library; `renderHook` + `act` on the valtio store for hooks; page-level integration tests with API mocks.

### Coverage Gaps
No test pairs list-before-preferences ordering for skills/workflows; no test that a template card renders no star (checked by grep of `WorkflowTemplates.test.tsx` titles for "avorit": none).

---

## 5. Configuration and Environment

### Environment Variables
None found relevant.
### Configuration Files
Feature flag config entry `FEATURE_FLAGS.FAVORITES` read via `appInfoStore.configs` (`useFeatureFlags.ts:78`).
### Feature Flags and Deployment Concerns
`favorites` flag gates star on skill/workflow cards; unchanged by this task. No deployment manifests involved.

---

## 6. Risk Indicators

- Speculative: switching cards to a preferences-only hook would make Favorites-page cards unfilled before preferences load (AC8/D3) because the cards today rely on the payload flag; see "Task Statements" (keeps Purpose B mechanism in place).
- Speculative: `setFavoritedInStore` and the two list-copy blocks become unused writers if cards stop reading `skill.is_favorited`; `favorites.test.ts:59-62` and `WorkflowsListPage.integration.test.tsx:1296` assert the old contract.
- Speculative: if the Favorites-page fix reads the payload flag, any stale `is_favorited: true` written by `setFavoritedInStore` on list items could keep a star filled after unfavorite.
- `removeFavorite` closes the confirm popup even on save failure (`SkillCard.tsx:223-225`, `WorkflowCard.tsx:322-324`); AC7 wording ("star keeps previous state") holds because state only changes after the PUT.
- Out-of-scope overwrite (`favorites.ts:246,271`) remains; AC5 on a very early click is exposed to it.
- Two card instances of `isTemplate` branches in `WorkflowCard.tsx`; title padding `pr-14` at `:211` is tied to the star's presence.
- Earlier-analysis check: nothing found that is wrong in the ticket's premises; the one point to keep in mind is that `setFavoritedInStore` was NOT removed by !2181 for skills/workflows (only the assistants branch), and `Skill`/`Workflow` types still declare `is_favorited` (the assistant type had it removed).

---

## 7. Summary for Complexity Assessment

Layers: store, hook, three presentational components (`SkillCard`, `WorkflowCard`, plus `FavoritesPage`/`WorkflowsList` consumers that need no change by themselves). The existing pattern from !2181 (`useAssistantPreferenceFlags.ts`) is directly transferable: a reactive per-id selector over `preferencesStore`. No new endpoints, config or dependencies. Change surface by file: `skills.ts`, `workflows.ts`, `favorites.ts` (cleanup of derived flag writers), a new skills/workflows hook, `SkillCard.tsx`, `WorkflowCard.tsx`, type files, and the tests listed in Section 2.

Novelty is low (copy of a merged pattern). The one place the pattern does not transfer verbatim is the Favorites page, where cards must show filled before preferences load; the backend already supplies `is_favorited: true` on every favorites item, so the data for that exists client-side. Test posture: strong coverage exists around cards, pages and the assistant hook; ordering tests for skills/workflows are missing and several fixtures encode the old contract.

Feasibility verdict: all 12 criteria are achievable in codemie-ui alone (Scope Check below).

---

## 8. External References

None named by the task. (Sibling checkout `/Users/Yaraslau_Byshyk/Development/codemie-dev/codemie` was read-only to verify backend payloads: `src/codemie/rest_api/models/user_preferences.py:68`, `src/codemie/service/user_preferences_service.py:186,247,296`, `src/codemie/rest_api/routers/user_preferences_router.py:41,53`.)

---

## 9. Scope Check: codemie-ui only?

| AC | Verdict | Evidence |
|---|---|---|
| 1 | UI-only | Preferences already hold `favorites.skills` ids (`favorites.ts` types; PUT/GET exist, `preferences.ts:44,57`). Card can derive via a hook like `useAssistantPreferenceFlags.ts:30-33`; today's defect is the copy at `skills.ts:157-161`. |
| 2 | UI-only | Same for `favorites.workflows`; defect at `workflows.ts:187-191`. |
| 3 | UI-only | Marketplace uses the same `indexSkills` / `indexWorkflows` (`skills.ts:170-177`, `workflows.ts:176-177`) and the same cards (`SkillsGrid.tsx:67`, `WorkflowsList.tsx:290`); no separate marketplace data path. |
| 4 | UI-only | `useSnapshot(preferencesStore)` re-renders when `preferences` is assigned (`preferences.ts:25,57`), independent of list; proven by the existing hook test (flips on arrival). No list refetch. |
| 5 | UI-only | `putPreferences` replaces `preferences` from the PUT response only on success (`preferences.ts:56-58`); reactive hook then flips the star; reload re-reads server preferences. The toggle API returns the full preferences, enough to update the star. |
| 6 | UI-only | Confirm popup + cancel already implemented (`SkillCard.tsx:218-228`, `WorkflowCard.tsx:317-325`); cancel only calls `setShowRemoveFavorite(false)`; confirm calls `removeFavorite`. Star derived from prefs becomes unfilled after success. |
| 7 | UI-only | `addFavorite`/`removeFavorite` catch the PUT error, `toaster.error`, return before any state change (`favorites.ts:250-253,273-276`); prefs unchanged -> star unchanged. |
| 8 | UI-only (needs payload flag kept for Favorites contexts) | Backend already returns `is_favorited=True` for every favorites item (codemie `user_preferences.py:68`, service `:186,:247`); UI keeps items as received (`favorites.ts:212-216,238`) and cards render via `FavoritesPage.tsx:146,160` / `WorkflowsList.tsx:290`. A preferences-only hook alone would fail this AC before preferences load; the card must also honour the item's own `is_favorited` (or a favorites-context prop). Cards cannot otherwise distinguish context, but no backend/API change is needed. |
| 9 | UI-only | Star is rendered by `WorkflowCard.tsx:185-200`; `isTemplate` prop is already available (`:95`) and passed by `WorkflowTemplates.tsx:158`. |
| 10 | UI-only | Gate `useFavoritesEnabled` (`useFeatureFlags.ts:78`) already wraps both stars (`SkillCard.tsx:198`, `WorkflowCard.tsx:185`); must be preserved when adding the template condition. |
| 11 | UI-only | Hook pattern returns `false` on null preferences (`useAssistantPreferenceFlags.ts:27`), proven by test "returns false ... while preferences are null". |
| 12 | UI-only (no change needed) | Assistant files are untouched; assistant hook, `AssistantCard.tsx:88-89`, `AssistantDetailsActions.tsx` stay as merged in `d783f00fe`. Risk only if shared code is edited: `favorites.ts` (`addFavorite/removeFavorite`, shared) and `FavoriteButton`. |

Result: no criterion is blocked; nothing outside codemie-ui must change. The only external fact relied on (Favorites items arrive flagged `is_favorited=true`) is already shipped in the backend.
