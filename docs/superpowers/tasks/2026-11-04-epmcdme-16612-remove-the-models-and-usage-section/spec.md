# EPMCDME-16612: Remove "Models and usage" from the project Overview tab

## Goal
The project Overview tab (settings/administration/projectsManagement) no longer shows the "Models and usage" section. The section is the single block rendered by `components/ProjectOverviewIndicators.tsx`. It holds three cards: Model availability, Model usage (30 days), and the project-level integrations count card with a "View" link (analysis section 2).

## Behavior
- The Overview tab renders without that section. All other Overview content is unchanged.
- The integrations count card and its "View" shortcut disappear with the section. The Integrations tab itself is unchanged.
- The data calls made only by the removed component (LLMS_USAGE tabular fetch, availability fetches, integrations count) are no longer made from the Overview tab.

## Scope of change (frontend only, codemie-ui)
- Delete `ProjectOverviewIndicators.tsx` and `components/__tests__/ProjectOverviewIndicators.test.tsx`.
- `ProjectOverviewSection.tsx`: remove the import (l.31) and the render (l.~500-504). Remove the props `canManageProject` and `isModelsConfigEnabled`, which are used only to feed the indicators (analysis: no other use in that file).
- `ProjectDetailsPage.tsx:264-265`: stop passing those two props. Their other uses in that page (tabs, l.71-73, 98, 109) stay.
- `__tests__/ProjectOverviewSection.test.tsx`: remove the `ProjectOverviewIndicators` mock (l.53) and the `canManageProject` props (l.77, l.142).
- Keep all shared code: `analyticsStore.fetchTabularData` / `LLMS_USAGE`, `routerToModelOption`, `projectModelConfiguration.ts`, `projectSettingsStore.listAllProjectSettings`, `projectModelSettingsStore`, `appInfoStore.getLLMModels`, the route constants, and `FEATURE_FLAGS.PROJECT_MODEL_OVERRIDE`.

## Acceptance criteria
1. The Overview tab shows no "Models and usage" heading, Model availability card, Model usage card or integrations count card.
2. `ProjectOverviewIndicators.tsx` and its test no longer exist, and no reference to them remains.
3. `ProjectOverviewSection` no longer accepts `canManageProject` or `isModelsConfigEnabled`, and `ProjectDetailsPage` no longer passes them.
4. The Models tab, Integrations tab and member override features behave as before.
5. Type-check, lint and the affected unit tests pass. The `Test Files` line is quoted after `npm ci`.

## Non-goals
- No changes to the Models or Integrations tabs.
- No removal or editing of shared helpers, stores, analytics constants, or route constants.
- No change to the `PROJECT_MODEL_OVERRIDE` feature flag.
- No backend, SDK or mock-server changes.
- No replacement for the integrations count or its shortcut on the Overview tab.

## Decisions
- Remove the integrations count card together with the whole section, over keeping it as a standalone card. The ticket names the section as a whole — user
- Drop the unused `canManageProject` and `isModelsConfigEnabled` props from `ProjectOverviewSection` and its call site, over leaving them as dead props — user
- Delete the indicators test with the component, over porting it. The router-model counting logic stays covered by the `projectModelConfiguration` tests (analysis section 6).

## Risks
- Over-deleting shared helpers would break the Models tab, chat selectors and analytics. Only the two files named above are deleted.
- Unused-import or unused-variable lint errors after prop removal. Verify with lint and type-check.
