# Technical Research

**Task**: project-management users members tab routing
**Generated**: 2026-11-16
**Research path**: filesystem

---

## 1. Original Context

Jira EPMCDME-17134
Summary: Project Management: Open the project's Members tab from the Users link.
Description: Change the Users link on the Project Management page so that clicking it opens the corresponding project's details page on the Members tab. This lets users go directly from the project list to the project's member list instead of navigating to User Management with a project filter.
Preconditions: user can access Project Management page and the project's details page; a project is listed with its Users link available.
Scenarios: 1. Open Project Management page. 2. Click the Users link for a project. 3. Arrive at that project's details page with the Members tab selected.
Affected Areas: Project Management page Users column/link; navigation to project details and the Members tab.
Acceptance Criteria: 1. Clicking a project's Users link opens that same project's details page with the Members tab selected. 2. The selected project is preserved; the link does not open User Management. 3. Direct navigation and browser refresh continue to show the selected project's Members tab. 4. Other project links and navigation behaviors remain unchanged.

---

## 2. Codebase Findings

### Existing Implementations
- `src/pages/settings/administration/projectsManagement/ProjectsManagementFull.tsx`
  - L162: the `users` column definition (Custom).
  - L186-202: `UsersCell` and `renderUsersColumn(buildUsersLink)`. They render `ResourceCounterBadge` with `to={buildUsersLink(item)}`.
  - L576-589: `hasUsersTabAccess = canAccessUsersTab(currentUser)`. `buildUsersLink` returns `''` when access is false. Otherwise it calls `router.resolve({name:'administration-users', query:{projects:[project.name]}})` and returns `path?searchParamsString`. This is the behavior to change.
  - L482-490: `handleOpenProjectDetails` calls `router.push({name:'projects-management-detail', params:{projectName}})`. It is used by the project name cell.
  - L615: `users: renderUsersColumn(buildUsersLink)`. L685 returns `buildUsersLink`, so it is likely in a deps array.
- `.../projectsManagement/ResourceCounterBadge.tsx`: renders a react-router `Link` when `to` is a non-empty string. Otherwise it renders a non-clickable div. It also serves the assignments counters.
- `src/router.tsx` L626-659: routes `projects-management-detail` (`/settings/administration/projects/:projectName`) and `-overview`, `-members`, `-models` (FeatureGuard), `-budgets` and `-integrations`. Route names are constants in `src/constants/routes.ts` L85-91, including `PROJECTS_MANAGEMENT_MEMBERS = 'projects-management-members'`. A dedicated `/members` route already exists.
- `.../projectsManagement/ProjectDetailsNavigation.tsx`: the route-name to tab map. `getProjectDetailsTab(router.name)` yields the active tab, so the tab is URL-driven. Direct navigation and refresh on `/members` already work.
- `src/pages/settings/administration/ProjectDetailsPage.tsx`:
  - `getVisibleTabs` (L58-73) omits Members for personal projects.
  - L127 `canOpenActiveTab`, and L301 renders a fallback when the tab is not openable.

### Architecture and Layers Affected
UI page and component layer (the Projects list table cell) and the routing layer (route name constants already exist). No store or API change is evident.

### Integration Points
- `useVueRouter` (`router.resolve` and `router.push` with a named route and params).
- Existing precedent for linking to the Members route by name: `ProjectBudgetsSection.tsx` L99 uses `{name: PROJECTS_MANAGEMENT_MEMBERS, ...}`. Other callers of project detail routes are `UsersManagementPage.tsx` L369, `UserProjectSpendingTable.tsx` L62, `SharedProjectModal.tsx` L237 and `NewProjectIntegrationPage.tsx`.
- `canAccessUsersTab` (`@/utils/permissions`) currently gates the Users link.

### Patterns and Conventions
Route names come from constants in `@/constants/routes`. `ProjectsManagementFull` uses the string literal `'projects-management-detail'`. The project name is passed as the `projectName` param. `projectName` is URL-encoded in API calls.

---

## 3. Documentation Findings

### Guides and Architecture Docs
`.ai-run/guides/architecture/routing-patterns.md` exists and covers routing. I did not read it in depth. `AGENTS.md` routes tests and git work to their own guides, and says to write tests only when asked.

### Architectural Decisions
None found.

### Derived Conventions
Tabs are separate named routes, not query params or state.

---

## 4. Testing Landscape

### Existing Coverage
`projectsManagement/__tests__/ProjectsManagementFull.*.test.tsx` (test, search, persistence, pagination, editFlow and others) and `ResourceCounterBadge.test.tsx`. A grep for users/Users in the `ProjectsManagementFull*` tests found no assertions on the Users link or `buildUsersLink`. `__tests__/ProjectDetailsPage.test.tsx` covers the details page.

### Testing Framework and Patterns
Vitest with React Testing Library (`vite.config.ts` `test.projects`).

### Coverage Gaps
The Users link target is not covered by any existing test.

---

## 5. Configuration and Environment

### Environment Variables
None relevant.

### Configuration Files
None relevant.

### Feature Flags and Deployment Concerns
The `projects-management-models` route is behind `FeatureGuard`. The Members route has no guard.

---

## 6. Risk Indicators

- Speculative: if the Members link still depends on `canAccessUsersTab`, users without that permission see a non-clickable badge. The ticket does not say whether that gate should stay. The gate belongs to the old destination, User Management.
- Speculative: personal projects hide the Members tab (`getVisibleTabs`). A Users link to `/members` for such a project lands on the "cannot open tab" fallback (`ProjectDetailsPage.tsx` L301). Check whether personal projects appear in the list and whether they have a `user_count`.
- Speculative: `buildUsersLink` is exposed in the return and deps at L685. Check consumers (any test or hook) before renaming or removing it.
- The link must stay a path string for `ResourceCounterBadge`. Resolve it with `router.resolve({name: PROJECTS_MANAGEMENT_MEMBERS, params:{projectName}})`, the same way the current code resolves its link. Names containing special characters depend on how `router.resolve` encodes params.
- Risk is low overall: a small, localized change with the route and tab logic already present.

---

## 7. Summary for Complexity Assessment

The change is confined to the UI and routing layers. The Users cell in `ProjectsManagementFull.tsx` (`buildUsersLink`, about 10 lines) points at `administration-users` with a project filter. The `projects-management-members` route, its constant and the tab mapping already exist, and the active tab is derived from the route name. Direct navigation and refresh therefore already work. Likely 1 source file changes, plus tests.

There is no technical novelty. A comparable named-route link to Members already exists in `ProjectBudgetsSection.tsx`. The test posture is mixed. The Projects list has extensive tests but none on the Users link target, so the new behavior needs a test.

The main open questions are the permission gating (`canAccessUsersTab`) and personal-project behavior, where the Members tab is hidden. Both are product decisions rather than technical difficulty.

---

## 8. External References

None named by the task.
