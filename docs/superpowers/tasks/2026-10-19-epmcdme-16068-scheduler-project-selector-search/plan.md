# EPMCDME-16068 Scheduler Project filter uses shared ProjectSelector — Implementation Plan

**Goal:** Render the Scheduler page Project filter with the shared `ProjectSelector` (search included), keeping select/deselect and `?projectId=` behaviour unchanged.

**Architecture:** Declare `projectId` as `FilterDefinitionType.Custom` and render `ProjectSelector` from `Filters`' `renderCustomFilter`, dispatching on `definition.name === 'projectId'` (same pattern as `SkillsFilters.tsx:200-212`). No change to `Filters`, `ProjectSelector`, `SchedulersPage`, the store or the backend.

**Conventions:** Commit per task using the repository's existing convention, with ticket key EPMCDME-16068 (`.ai-run/guides/standards/git-workflow.md`). Formatting is automatic (PostToolUse hook). Tests follow `.ai-run/guides/testing/testing-patterns.md`. Do not run whole-suite gates; the calling flow owns them.

---

### Task 1: Swap the Project filter to ProjectSelector and update the unit test

**Files:** Modify `src/pages/schedulers/SchedulerFilters.tsx`; modify `src/pages/schedulers/__tests__/SchedulerFilters.test.tsx`.

**Test-first: yes — with `userStore.getProjects` spied to return `Platform Team` / `Growth Squad`, opening the first `.p-multiselect` must show a search input (`.p-multiselect-panel input[type="text"]`); it fails today because the generic Multiselect has no `onFilter`.**

- [ ] Step 1 (test): In `SchedulerFilters.test.tsx`, replace the "project names" test (lines 52-60) with `vi.spyOn(userStore, 'getProjects').mockResolvedValue([{ name: 'Platform Team' }, { name: 'Growth Squad' }])` (reset in `beforeEach`/`afterEach`, per patterns guide). Cases: (a) after `waitFor`, opening `.p-multiselect[0]` shows both names and the search input; (b) clicking `Platform Team` calls `onApply` with `projectId: 'Platform Team'`; (c) with `values={{ projectId: 'Platform Team' }}`, unchecking it calls `onApply` with `projectId: undefined`. Leave the Resource test as is (Project stays `.p-multiselect[0]`, Resource `[1]`). Run only this file; (a) must fail before step 2.
- [ ] Step 2 (impl): In `SchedulerFilters.tsx`:
  - Lines 85-91: change `type` to `FilterDefinitionType.Custom`, `options: []`, keep `value: values.projectId ? [values.projectId] : []` (array contract with `handleApply`'s `?.[0]` at line 135; never pass a string).
  - Lines 66-69: delete `projectOptions` and drop it from the `useMemo` deps at line 114.
  - Add a `renderCustomFilter` callback passed to `<Filters>` (line 145): for `definition.name === 'projectId'` return `<ProjectSelector multiple fullWidth label="" value={value as string[]} onChange={(v) => updateValue(v)} />` (import from `@/components/ProjectSelector`; props mirror `AnalyticsFilters.tsx:268-276`); otherwise `null`. `selectDefault` does not fire in `multiple` mode.
- [ ] Step 3: Run the file's tests until green; commit.

### Task 2: Update the page integration test

**Files:** Modify `src/pages/schedulers/__tests__/SchedulersPage.integration.test.tsx`.

**Test-first: yes — the "Project filter" test must assert the dropdown contains a search input and lists projects supplied via the `v1/user` mock; the current version (lines 68-76) fails after Task 1 because it relies on `schedulersStore.filterOptions.projects`.**

- [ ] Step 1: Rewrite the test at lines 68-76 ("shows project names in the Project filter dropdown"). Override `mockAPI('GET', 'v1/user', {...})` as the admin case at lines 108-118 does, but non-admin with `projects: [{ name: 'Platform Team' }]` (`user.projects` feeds `getUserProjects`, `src/store/user.ts:384`). Render `/schedulers`, `waitFor` the option to be available after opening `.p-multiselect[0]`, assert `Platform Team` and `.p-multiselect-panel input[type="text"]` are present. Add one assertion that typing a non-matching query then clearing it restores the list only if it is stable under the 300 ms debounce (use `waitFor`); otherwise cover search presence only. Do not touch the Resource or filter-options-on-mount tests.
- [ ] Step 2: Run only this file until green; commit.

---

## Self-review

- Coverage: AC1/AC2 (search present and filtering) Tasks 1-2; AC3 Task 1 (no source change to shared components); AC4/AC5 Task 1 cases (b), (c) (typing does not touch `filters`, so no apply); AC6 Resource test retained; AC7 Tasks 1-2.
- negative-constraints: honoured. No change to `ProjectSelector`, `Filters`, `MultiSelect`, `SchedulersPage`, `schedulersStore` or the backend (only the two test files and `SchedulerFilters.tsx` are touched). Single effective project kept by `handleApply` unchanged (no multi-project filter). Resource filter untouched. Table Project column and URL/API contract untouched. Options are not filtered to projects with schedulers (the shared list is used). Store leading-slash calls untouched.
