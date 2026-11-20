# EPMCDME-17134 Users link opens Members tab — Implementation Plan

Commit per task using the repository's existing convention (carry ticket key EPMCDME-17134). Do not commit unless asked.

## Acceptance criteria

- Clicking a project's Users link opens that same project's details page on the Members tab (`/settings/administration/projects/:projectName/members`).
- The link does not open User Management; the selected project is preserved via the `projectName` param.
- Direct navigation and refresh on `/members` keep showing Members (already supported by the route; no change).
- Other project links and navigation (name cell, assignment counters) are unchanged.
- The `canAccessUsersTab` gate stays (non-clickable badge without access); no special handling for personal projects.

## Task 1: Point the Users link at the Members route

**Files:**
- Modify: `src/pages/settings/administration/projectsManagement/ProjectsManagementFull.tsx:578-589` (`buildUsersLink`), plus imports near L34-54
- Test: `src/pages/settings/administration/projectsManagement/__tests__/ProjectsManagementFull.test.tsx` (existing `resolveMock`, L28-44)

Test-first: yes — with an admin user and a listed project, the Users `ResourceCounterBadge` link must resolve via `router.resolve` with `{ name: PROJECTS_MANAGEMENT_MEMBERS, params: { projectName: <project.name> } }` and not `administration-users`; fails today because the link resolves `administration-users` with a `projects` query.

- [ ] Add a test in the existing file reusing its render and store setup: render with an admin user, assert `resolveMock` was called with the Members route name and `params.projectName`, and that no call used `administration-users`. Note `resolveMock` returns `/${name}`, so the rendered Users link `href` should equal `/projects-management-members`. Add a second case: a non-`canAccessUsersTab` user gets a non-clickable badge (no anchor), pinning the kept gate. Run only this file and confirm the first case fails.
- [ ] In `buildUsersLink`, keep the `!hasUsersTabAccess` early return and the `path`/`searchParamsString` return shape. Change the `router.resolve` argument to `{ name: PROJECTS_MANAGEMENT_MEMBERS, params: { projectName: project.name } }`, importing the constant from `@/constants/routes` (same precedent as `ProjectBudgetsSection.tsx:99`). Leave deps, `handleOpenProjectDetails` and all other columns untouched.
- [ ] Re-run the test file and confirm it passes. Full-suite gates run in the calling flow.

## Negative-constraint pass

- "Keep canAccessUsersTab gate": honored by Task 1 (early return retained, covered by the second test case).
- "No special handling for personal projects": no task adds any.
- "Only change the link target" / "Other links unchanged": Task 1 touches only `buildUsersLink` and its import.
- "Does not open User Management": Task 1 removes the `administration-users` resolve.
- negative-constraints: all of the above checked; no task violates them.
