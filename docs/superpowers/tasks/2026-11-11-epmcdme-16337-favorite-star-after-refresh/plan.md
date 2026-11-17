# EPMCDME-16337: favorite star on skill/workflow cards after refresh - Implementation Plan

**Goal:** Skill and workflow cards derive the favorite star from `preferencesStore` at render time (the EPMCDME-16031 / MR !2181 pattern) instead of the one-shot `is_favorited` copy made at list load.

**Architecture:** A new reactive hook pair mirrors `src/hooks/useAssistantPreferenceFlags.ts:25-33`. The cards use it, and also honour the item's own `is_favorited` so Favorites-page items (backend hard-codes `true`) stay filled before preferences load. The list-store copy blocks and the skill/workflow branch of `setFavoritedInStore` become orphaned writers and are removed.

**Conventions:** Commit per task using the repository's existing convention. Do NOT stage `.codemie/codemie-cli.config.json` or `skills-lock.json`. No new dependency, no new test files or cases (project rule: tests only on explicit request).

## Acceptance criteria

1. Favorited skill -> reload on Skills list -> star shows favorited.
2. Favorited workflow -> reload on Workflows list -> star shows favorited.
3. Reload on marketplace view of Skills or Workflows -> favorited items show a filled star.
4. List loads before preferences -> when preferences arrive stars switch to the correct state without reloading the list and without visible loading delay; holds whichever loads first.
5. Favorite/unfavorite -> star updates once the change is saved; after reload keeps the new state.
6. Unfavorite -> confirm popup -> star unfilled; cancel -> star stays filled, nothing saved.
7. Save fails -> error shown -> star keeps previous state.
8. Favorites page (All, Skills, Workflows tabs): every skill/workflow card shows a filled star on load/reload, including before preferences load.
9. Workflow templates: no favorite star on any template card.
10. Favorites feature off -> no star on skills, workflows, templates (unchanged).
11. Preferences not loaded -> skill/workflow cards render an unfilled star without errors.
12. Assistants: pin/favorite behaviour unchanged from EPMCDME-16031.

## Task 1: Derive the star at render time (AC 1-8, 11)

**Files:** create `src/hooks/useSkillWorkflowPreferenceFlags.ts`; modify `src/pages/skills/components/SkillCard.tsx`, `src/pages/workflows/components/WorkflowCard.tsx`.

**Test-first: no** - project rule: tests only on explicit request; existing tests are updated to the new contract in Task 3.

- [ ] Create the hook file (copy the licence header from `useAssistantPreferenceFlags.ts:1-14`):

```ts
import { useSnapshot } from 'valtio'

import { preferencesStore } from '@/store/preferences'

export const useIsSkillFavorited = (id: string): boolean => {
  const { preferences } = useSnapshot(preferencesStore)
  return (preferences?.favorites?.skills ?? []).includes(id)
}

export const useIsWorkflowFavorited = (id: string): boolean => {
  const { preferences } = useSnapshot(preferencesStore)
  return (preferences?.favorites?.workflows ?? []).includes(id)
}
```

- [ ] `SkillCard.tsx:51` area: add `const isFavorited = useIsSkillFavorited(skill.id) || skill.is_favorited === true`. At `:205-211` pass `isFavorited` to `FavoriteButton` and use it in the `onToggle` ternary instead of `skill.is_favorited`.
- [ ] `WorkflowCard.tsx:107` area (before the `if (!workflow)` early return at `:124`, so use `workflow?.id`): add `const isFavorited = useIsWorkflowFavorited(workflow?.id) || workflow?.is_favorited === true` (user-approved refinement: keep the optional chaining on `is_favorited` so the missing-`workflow` guard still holds). At `:191-197` use `isFavorited` in `FavoriteButton` and in `onToggle`.

Why the item flag is kept and cannot go stale: after Task 2 nothing writes `is_favorited` onto `skillsStore.skills` / `workflowsStore.workflows`, so the flag exists only on `favoritesStore` payload items (Favorites page, Workflows favorites tab), where the backend sets it `true`. `removeFavorite` (`favorites.ts:285-288`) drops the item from those lists on a successful save, and on a failed save nothing changes (AC 7).

## Task 2: Hide the template star and remove orphaned writers (AC 9, 10)

**Files:** modify `src/pages/workflows/components/WorkflowCard.tsx`, `src/store/skills.ts`, `src/store/workflows.ts`, `src/store/favorites.ts`.

**Test-first: no** - project rule: tests only on explicit request; existing tests updated in Task 3.

- [ ] `WorkflowCard.tsx`: define `const showFavorite = isFavoritesEnabled && !isTemplate` and use it for the star gate (`:185`) and the `pr-14` title padding (`:211`). `useFavoritesEnabled` still gates everything, so AC 10 holds.
- [ ] `skills.ts:157-161`: assign `skillsStore.skills = skills` and delete the `favoriteSkillIds` set. `workflows.ts:187-191`: assign `this.workflows = data` likewise. Remove `preferencesStore` imports only if they become unused (check each file).
- [ ] `favorites.ts:35-41`: delete `setFavoritedInStore` and its two calls (`:263`, `:284`). Keep the `lookup` table (`:264-268`) and everything else; leave `Skill.is_favorited` / `Workflow.is_favorited` types (still carried by favorites payloads).

## Task 3: Update existing tests broken by the new contract

**Files:** modify `src/store/__tests__/favorites.test.ts`, `src/pages/workflows/__tests__/WorkflowsListPage.integration.test.tsx`.

**Test-first: no** - project rule: tests only on explicit request; this edits existing tests only, adds no cases.

- [ ] `favorites.test.ts:59-62`: the "still sets is_favorited on the skill" case asserts the removed writer. Change its assertion to `not.toHaveProperty('is_favorited')` (as the assistant case at `:56` does) and rename it accordingly.
- [ ] `WorkflowsListPage.integration.test.tsx:1095`: the PUT mock returns `{}`, which now replaces preferences and leaves the star unfilled. Return a full preferences object with `favorites.workflows: ['workflow-1']` (shape as at `:1161-1167`).
- [ ] Leave `:63`, `:1093`, `:1274`, `:1296`, `:1848` as is: they only set fixture flags that remain harmless or valid (`:1848` is a favorites-endpoint payload; `:1296` also has the id in preferences).

## Self-review

- negative-constraints: no save guarding (`addFavorite`/`removeFavorite` untouched); templates stay non-favoritable (star hidden, Task 2); no star added to details pages; no backend/SDK/API change; no new tests or commits of unrelated files (conventions header, Task 3 edits existing tests only).
- AC 12: no assistant file edited; `favorites.ts` edit only removes the skill/workflow branch.
- Quality gates (lint, type-check, existing tests) run one at a time by the calling flow, not here.

## Optional, only if the user asks

Test gaps found: no list-before-preferences ordering test for skills/workflows cards; no test that template cards render no star; no hook test for `useIsSkillFavorited` / `useIsWorkflowFavorited` (assistant equivalent exists in `src/hooks/__tests__/useAssistantPreferenceFlags.integration.test.ts`).
