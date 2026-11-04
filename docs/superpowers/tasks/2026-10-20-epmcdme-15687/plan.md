# EPMCDME-15687 Plan: hide datasource badge on Project Management page

> Commit per task using the repository's existing convention. Follow `.ai-run/guides/testing/testing-patterns.md` for tests.

## Acceptance criteria

- [ ] The datasource badge (icon + count) is not rendered for any project on the Project Management page when `features:datasources` is off (OSS standalone default).
- [ ] Project rows remain visible in that state.
- [ ] When `features:datasources` is on, the badge renders as before (link to `data-sources` with project filter).

## Assumptions / scope

- (a) Gate is the single `features:datasources` flag (`FEATURE_FLAGS.DATASOURCES`) via `useFeatureFlag`, as the ticket specifies. This deliberately diverges from the three-flag OR (knowledgeBases | datasources | codeIndexing) used by Navigation, router, AssistantForm and CredentialFields.
- (b) Navigation menu and any other datasource visibility are OUT OF SCOPE (open ticket question to Aliaksei Lyzo).
- (c) `datasources_count` still feeds `calculateTotalAssignments` / delete eligibility in `ProjectsManagementFull.tsx:84-93`; do not touch.
- (d) Flicker before `appInfoStore.configs` loads is accepted (hook returns `false` until fetched; hidden-by-default).
- negative-constraints: none stated beyond scope exclusions above, honored by Task 1 touching only `ProjectResourceCounters.tsx` and tests.

## Task 1 — Gate datasource badge on `features:datasources`

Files: `src/pages/settings/administration/projectsManagement/ProjectResourceCounters.tsx` (modify), `src/pages/settings/administration/projectsManagement/__tests__/ProjectsManagementFull.test.tsx` (modify).

Test-first: yes — with `useFeatureFlag` mocked `[false, true]`, `queryByRole('link', { name: /data sources/i })` is absent while the project row name is still rendered; with the mock returning `[true, true]` for `FEATURE_FLAGS.DATASOURCES`, the badge links to `data-sources` with the project filter.

Steps:
1. Update `ProjectsManagementFull.test.tsx`, "resource counter links" block (~:171-216): the existing "data sources badge links to data-sources with project filter" case (~:208-215) must set `vi.mocked(useFeatureFlag).mockImplementation((name) => [name === FEATURE_FLAGS.DATASOURCES, true])` before render. Add a sibling case with the default (false) mock asserting the data sources link is absent, the other four badges (assistants, workflows, integrations, skills) are still present, and the project row is still rendered. Reset the mock in `beforeEach` (~:147) so the default stays `[false, true]`.
2. Run the new tests; confirm the absence case fails (badge still shown).
3. In `ProjectResourceCounters.tsx`: import `useFeatureFlag` from `@/hooks/useFeatureFlags` and `FEATURE_FLAGS` from `@/constants/featureFlags`; in the component body add `const [isDataSourcesEnabled] = useFeatureFlag(FEATURE_FLAGS.DATASOURCES)` (pattern: `Navigation.tsx:80-87`); wrap the datasource `ResourceCounterBadge` (~:66-71) in `{isDataSourcesEnabled && (...)}`. No other change.
4. Re-run `ProjectsManagementFull.test.tsx` and `ResourceCounterBadge.test.tsx`; the eight sibling `ProjectsManagementFull.*.test.tsx` files mock the component and are unaffected.
