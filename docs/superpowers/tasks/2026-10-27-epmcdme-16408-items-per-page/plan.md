# EPMCDME-16408 Members items-per-page reset - Implementation Plan

**Goal:** Keep the Members tab mounted during background project refreshes so local state (per_page, page, filters, selection) survives member actions.

**Approach:** Smallest fix in `ProjectDetailsPage.tsx` only: show the full-page spinner only on initial load (no project yet), not on refreshes. `ProjectMembersManager` and `Pagination` are untouched (EPMCDME-16410 overlap avoided).

Commit per task using the repository's existing convention. Do not touch `.codemie/codemie-cli.config.json`, `src/setupTests.tsx`, `.gitattributes`. No git operations beyond that, no whole-suite runs.

## Task 1 - Spinner only on initial load

**Files:** modify `src/pages/settings/administration/ProjectDetailsPage.tsx`

**Test-first: yes - with `getProject` held pending on a second call, calling the mocked Members manager's `onMembersChanged` must keep `project-members-manager` in the DOM and not render `spinner`; today the spinner replaces it.**

- Test goes in task 2's file; write it first and see it fail, then apply this change.
- Change the early return at `ProjectDetailsPage.tsx:224` from `if (loading)` to `if (loading && !project)`.
- In the mount/projectName effect (`:147-153`), call `setProject(null)` before `loadProject(guard)` so navigating to a different project (or a renamed project route) still shows the spinner instead of stale data.
- Leave `loadProject` (`:131-145`) and its callers (Overview, Budgets, Members) as they are; they now refresh in place. Failure path still sets `project` to null so "Project not found" renders.
- Check while implementing: `ProjectMembersManager` reacts to the new `project` object identity only via `project.name`-keyed callbacks (analysis l.22), so a refresh does not trigger an extra page-0 refetch that resets `per_page`. If it does, stabilise by depending on `project.name` only (cite the line in the digest).

## Task 2 - Regression test

**Files:** modify `src/pages/settings/administration/__tests__/ProjectDetailsPage.test.tsx` (add after the "route-level section" test at `:163-179`, reusing the existing `projectMembersManagerMock` and Spinner mock).

**Test-first: yes - see Task 1; it is the failing test for that change.**

Cases (all with `routeState.name = 'projects-management-members'`):
1. Refresh keeps Members mounted: render, grab `onMembersChanged` from `projectMembersManagerMock.mock.calls[0][0]`, make the next `getProject` a deferred promise, call it inside `act` without awaiting; assert `project-members-manager` still present and `spinner` absent; resolve and assert the manager element is the same node (no remount).
2. Initial load still shows `spinner` until `getProject` resolves.
3. Refresh from the Overview path is unaffected: `onProjectChanged` on the budgets section mock (`projectBudgetsSectionMock`) also does not show the spinner when rendered on the budgets route.

4. Unassign reloads the table at the chosen page size (user-requested assertion). The page test mocks the manager, so add this as an integration test alongside `ProjectSettingsPagination.integration.test.tsx` (reuse its `renderPage`/`mockAPI` pattern; locate the file with Glob) rendering the real `ProjectDetailsPage` + `ProjectMembersManager` on the Members route with >20 mocked members: select "Show: 20", unassign a member (confirm dialog), then assert (a) the removed member's row is gone and the list/total reflect the post-action API response, (b) the Show selector still reads 20 and the last members request used `per_page=20`, (c) the Members table was not replaced by the spinner. Must fail before Task 1 (selector resets to 10) and pass after. Add this file to Task 2's Files list.

Per-member checks for role change, assign, import, bulk actions and reset budget all route through the same `onMembersChanged`, so case 1 covers acceptance criterion 3; note this in the digest.

## Negative-constraint pass

- Do NOT change Pagination (EPMCDME-16410): honored, no task edits `src/components/Pagination/`.
- Do not run/modify tests beyond the plan; no git ops; dirty files untouched: honored, only the two files above are edited.
