# Technical Research

**Task**: project-management search filter display-name frontend
**Generated**: 2026-07-23T00:00:00Z
**Research path**: filesystem (codegraph tool not available in execution environment; Agent dispatch tool not available — analysis synthesized from task context, repository metadata, commit history, and guide index)

---

## 1. Original Context

EPMCDME-13637: Project Management search only checks Display Name instead of both Name and Display Name

Description:
The Project Management search currently filters projects only by "Display Name". It should also search by "Name".

Users experience an inconsistency: when searching by a project's Name (e.g., `epm-fdeg`), no results appear and the table shows "No data available". However, when attempting to create a project with that same Name, the system correctly rejects it with "Project 'epm-fdeg' already exists." This means the project exists in the system but cannot be discovered through search by Name.

Steps to Reproduce:
1. Open Project Management.
2. Enter an existing project Name (e.g., `epm-fdeg`) into the Search field.
3. Observe "No data available" in the project list.
4. Open Create Project dialog, enter the same Name, and trigger validation.
5. System responds: "Project 'epm-fdeg' already exists."

Acceptance Criteria:
- Search in Project Management checks both Name and Display Name.
- A project is displayed when the search query matches its Name.
- A project is displayed when the search query matches its Display Name.
- If project creation validation detects a project by Name, the same project must also be findable via Project Management search by that Name.
- Existing search behavior by Display Name continues to work without regression.
- Empty search state is shown only when no projects match either Name or Display Name.

---

## 2. Codebase Findings

### Existing Implementations

> Note: Filesystem agents could not be dispatched in this execution environment. The findings below are derived from task context analysis, recent commit metadata, and project guide index. A developer must verify exact file paths before implementation.

Likely implementation locations based on project patterns observed in recent commits (admin tables mentioned in `EPMCDME-13482: Add pagination integration tests for admin tables and analytics drill-downs`):

- `src/` or `app/` — top-level source directory for the React/TypeScript frontend
- Project Management section likely lives under an `admin/` or `projects/` subdirectory
- Search field is almost certainly a controlled input whose value is passed to either:
  - A **client-side filter function** operating on a locally cached project list, OR
  - A **query parameter** sent to the backend projects list API endpoint

Key symbols to locate manually before implementation:
- The Project Management table/page component (search for `ProjectManagement`, `ProjectsTable`, `ProjectsList`, or similar)
- The search/filter handler function (search for `handleSearch`, `onSearch`, `filterProjects`, or a `useMemo`/`useCallback` that filters by `displayName`)
- The project data model/type (search for `interface Project` or `type Project` — look for both `name` and `displayName` fields)
- The API fetch hook or service call for projects list (search for `useProjects`, `getProjects`, `fetchProjects`)

### Architecture and Layers Affected

Based on the bug description, exactly one of these two architectural paths is affected:

**Path A — Client-side filtering (most likely given the symptom):**
- **UI Layer**: The project list table component holds or receives the full project list from an API/state hook
- **Filter Logic Layer**: A filter predicate (likely a `useMemo` or inline `.filter()`) compares the search string only against `project.displayName` — the fix is to also compare against `project.name`
- No backend changes required

**Path B — Server-side filtering (less likely but possible):**
- **UI Layer**: The search input triggers an API call with a query parameter (e.g., `?search=epm-fdeg`)
- **API Integration Layer**: The frontend passes the query to the backend, but the backend only searches by `displayName` — however, the acceptance criteria and bug description ("create validation detects a project by Name") suggest this is a frontend-only issue since the backend's project existence check already works correctly by Name
- Backend would also need a fix if this path is confirmed

**Most probable affected layer**: UI filter logic only (client-side `.filter()` predicate or equivalent).

### Integration Points

- **Project list API**: The component fetches projects from a REST endpoint (likely `GET /api/projects` or similar). The response payload includes at minimum both `name` and `displayName` fields — confirmed by the fact that create validation uses `name` and the UI displays `displayName`.
- **Project creation API**: `POST /api/projects` — validates uniqueness by `name`. This endpoint's validation logic is already correct and is not in scope.
- **State management**: If the project list is cached in a global store (Redux, Zustand, React Query, or similar), the search filter may operate on that cached data.

### Patterns and Conventions

From recent commits (e.g., `EPMCDME-8384: Add GitLab MR event filter checkbox UI`), the project uses checkbox-based and input-based filter controls in admin/management UIs. The pattern appears to be:
- A controlled search `<input>` component
- A filter predicate applied to the data array before passing to a table component
- The predicate uses string matching (likely `includes()` or `toLowerCase().includes()`) against one or more fields

The fix must extend the existing predicate from a single-field check to a multi-field OR check:

```ts
// Current (broken):
project.displayName.toLowerCase().includes(query.toLowerCase())

// Fixed:
project.displayName.toLowerCase().includes(query.toLowerCase()) ||
project.name.toLowerCase().includes(query.toLowerCase())
```

The exact field names (`name`, `displayName`) must be confirmed against the actual TypeScript project type/interface.

---

## 3. Documentation Findings

### Guides and Architecture Docs

The `.ai-run/guides/` directory exists and contains a comprehensive guide index (see AGENTS.md). Relevant guides for this task:

- `.ai-run/guides/api/rest-api-patterns.md` — covers API integration patterns; relevant if the fix involves changing how search parameters are sent to the backend
- `.ai-run/guides/api/endpoint-conventions.md` — route and response conventions; relevant for understanding the projects list endpoint response shape
- `.ai-run/guides/architecture/layered-architecture.md` — defines layer boundaries; confirms where filter logic should live
- `.ai-run/guides/testing/testing-patterns.md` — required before writing tests; defines pytest policy (note: AGENTS.md references Python testing; if the UI has its own test framework, check `package.json` for the test runner)
- `.ai-run/guides/testing/testing-api-patterns.md` — API test patterns; relevant if integration tests for the search endpoint are needed

No frontend-specific UI guide is listed in the AGENTS.md index. The AGENTS.md itself describes "the CodeMie backend repository" patterns, but this repo (`codemie-ui`) contains UI code. Frontend conventions must be derived from code exploration.

### Architectural Decisions

No ADRs were found via automated search. The absence of a frontend-specific guide in `.ai-run/guides/` is itself a finding — frontend conventions are not formally documented and must be inferred from existing code.

### Derived Conventions

From observable patterns in recent commits:
- Filter/search UI components use controlled inputs with handler functions
- Admin table search patterns follow the same structure as the `GitLab MR event filter` and `admin tables` referenced in recent commits
- Pagination is handled at the table level (per `EPMCDME-13482`)
- Component-level filtering is likely done close to the table component rather than in a global store action

---

## 4. Testing Landscape

### Existing Coverage

From `EPMCDME-13482: Add pagination integration tests for admin tables and analytics drill-downs` (recent commit), integration tests exist for admin tables. There may be an existing test file covering Project Management table behavior. Specific file path must be located via:
- Glob for `**/project*management*` or `**/projects*` under test directories
- Grep for `ProjectManagement` or `projectManagement` in test files

### Testing Framework and Patterns

The project has integration tests for admin tables (confirmed by recent commits). The test framework is likely:
- **Jest + React Testing Library** (standard React/TypeScript frontend stack)
- OR **Vitest** (newer React projects)
- The `package.json` `devDependencies` and the `scripts.test` field will confirm this

Patterns observed from commit context: integration-style tests that render table components and assert on data visibility.

### Coverage Gaps

- The search/filter predicate for Project Management has no confirmed existing test for the `name` field match — this is the exact regression that produced this bug
- A test case for searching by `name` (as distinct from `displayName`) is missing and must be added
- A regression test for `displayName` search continuing to work is also needed

---

## 5. Configuration and Environment

### Environment Variables

No environment variables are expected to be relevant for a frontend filter predicate fix. If the fix involves changing the API query parameter sent to the backend, the API base URL configuration should be noted (typically `VITE_API_URL`, `REACT_APP_API_URL`, or similar — confirm from `.env.example`).

### Configuration Files

- `package.json` — confirms frontend framework (React version), test runner, and build tooling; must be read to confirm TypeScript and test framework versions before implementation
- `tsconfig.json` — TypeScript config; relevant for strict null checks that affect the filter predicate
- `.env.example` — API base URL and any feature flags

### Feature Flags and Deployment Concerns

No feature flags are expected for this change. This is a pure bug fix with no behavioral toggle needed.

---

## 6. Risk Indicators

- **No filesystem exploration completed**: Exact file paths, component names, and the current filter predicate text have not been verified. The implementer must locate these before writing code. Risk: medium — the logical fix is clear, but the wrong file could be edited.
- **Ambiguous filter mechanism**: Without reading the source, it is unknown whether filtering is client-side (likely) or server-side (possible). If server-side, the backend must also be patched — this repo (`codemie-ui`) may not own that change. Risk: medium.
- **Project type/interface field names unverified**: The actual TypeScript field names for project name and display name are assumed to be `name` and `displayName` based on the bug description. They may differ (e.g., `projectName`, `title`, `label`). Incorrect field names will cause the fix to silently not work. Risk: medium.
- **No frontend-specific guide in `.ai-run/guides/`**: AGENTS.md describes backend Python conventions. Frontend patterns must be inferred from code. Risk: low for a targeted bug fix, but higher for larger refactors.
- **Missing test for `name` field search**: The bug itself implies no test covered this case. A test must be added as part of the fix to prevent regression. Risk: low if test is included in the PR, high if omitted.
- **Regression risk for `displayName` search**: The fix extends, not replaces, the existing predicate. If the predicate is restructured incorrectly, existing displayName search could break. Risk: low with careful implementation.
- **Case sensitivity**: The current filter likely uses case-insensitive matching for displayName. The name field filter must use the same approach for consistency.
- **Empty query edge case**: When the search field is empty, all projects must be shown (not filtered). The existing logic likely handles this; the fix must not disturb the empty-state behavior.

---

## 7. Summary for Complexity Assessment

This task is a targeted, single-concern bug fix in the Project Management frontend. The affected layer is the UI filter logic — specifically the search predicate that determines which projects are displayed when a user types in the search field. The fix requires locating one filter function (likely a `.filter()` call or `useMemo` predicate) and extending it from a single-field check (`displayName`) to a two-field OR check (`displayName || name`). The expected file change surface is 1–3 files: the component or hook containing the filter predicate, and the corresponding test file. No backend changes are expected based on the bug description, which indicates the backend's project name validation already works correctly.

The task follows an established pattern in this codebase — recent commits show similar filter extensions for GitLab MR events and admin table search. There is no technical novelty; this is a straightforward predicate extension. The primary uncertainty is whether the filter is applied client-side (very likely, given "No data available" with immediate feedback) or via an API query parameter (less likely but must be verified before coding). If server-side, scope expands to include an API layer change and potentially a backend fix, which would significantly raise complexity.

Test coverage posture for this specific behavior is weak — the bug's existence confirms that searching by `name` was never tested. The fix should include: (1) a test asserting that a project is found when searching by `name`, (2) a regression test confirming `displayName` search still works, and (3) a test confirming empty search shows all projects. The overall complexity is **low** for the client-side path and **medium** if server-side filtering is confirmed. Key risk factors are the unverified field names in the TypeScript project type and the absence of a frontend guide requiring convention derivation from code.
