# Technical Research

**Task**: project management list cost-center
**Generated**: 2026-09-10T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

revisit how project displayed on project management list. currently code and name displayed on one line, for cost centers - it's better view. let's fix current view for project management based on cost center approach

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/settings/administration/ProjectsManagementPage.tsx` — entry component for the
  "Projects management" settings page. Renders `ProjectsManagementFull` when the
  `useUserManagementEnabled` flag is on, otherwise `ProjectsManagementDefault` (an admin-tools
  card view with no table).
- `src/pages/settings/administration/projectsManagement/ProjectsManagementFull.tsx` — the table
  view the ticket refers to as "project management list". It defines `columnDefinitions`
  including a `name` column (`Custom` type) and renders it via `ProjectNameCell` /
  `renderProjectNameColumn` (lines 133–146):
  ```
  const ProjectNameCell = ({ item, onOpenDetails }) => (
    <span id={`project-name-${item.id}`}>
      <NameLinkCell onClick={() => onOpenDetails(item.name)}>{formatProjectLabel(item)}</NameLinkCell>
    </span>
  )
  ```
  `formatProjectLabel` (see below) concatenates project code and display name into a single
  string, which is the "code and name displayed on one line" the task complains about.
- `src/utils/projectDisplayName.ts` — houses the two competing formatting helpers:
  - `formatProjectLabel(project)` → `` `${name} (${display_name})` `` on one line, falling back to
    `name` alone when no display name is set. Used only by `ProjectsManagementFull.tsx` and by
    dropdown/option labels (`ProjectSelector.tsx`, `useProjectOptions.ts`,
    `useResolvedProjectOptions.ts`) where a single-line label is appropriate for a `<select>`-like
    control.
  - `getProjectDisplayName(project)` → returns just `display_name` (trimmed) or falls back to
    `name`, intended to be combined by the caller with a secondary line for the code.
- `src/pages/settings/administration/projectsManagement/CostCenterProjectsManager.tsx` — the
  "Linked projects" table shown inside `CostCenterDetailsPage.tsx` (the cost-center detail view).
  Its `name` column custom renderer (lines 180–191) is the pattern the task calls "the cost center
  approach":
  ```
  name: (project: ProjectListItem) => (
    <button type="button" className="text-left text-text-accent-status hover:text-text-accent-status-hover break-all"
            onClick={() => handleOpenProject(project.name)}>
      {getProjectDisplayName(project)}
      {project.display_name && (
        <span className="block text-xs text-text-quaternary">{project.name}</span>
      )}
    </button>
  )
  ```
  Display name renders as the primary (bold-weight-by-color) line; the project code renders below
  it in a smaller, quaternary-colored `<span className="block ...">`, and only when a
  `display_name` is actually set.
- `src/pages/settings/administration/usersManagement/components/UserProjectsTable.tsx` (lines
  177–186) uses the **identical** two-line pattern (`getProjectDisplayName` + conditional
  `<span className="block text-xs text-text-quaternary">{item.name}</span>`) for the "project"
  column of a user's assigned-projects table. This is a second, independent occurrence of the
  pattern the cost-center screen uses, confirming it as an established convention rather than a
  one-off.
- `src/pages/settings/administration/components/NameLinkCell.tsx` — the shared "name-as-link"
  button component used by `ProjectsManagementFull.tsx` (and `CostCentersManagementPage.tsx` for
  cost-center names). It renders whatever `children` it is given as one visual unit (bold,
  underline-on-hover); it does not itself impose single- vs two-line layout — that is entirely up
  to what the caller passes as `children`. `CostCenterProjectsManager.tsx` and
  `UserProjectsTable.tsx` do **not** use `NameLinkCell` — they inline their own `<button>` markup
  with the two-line layout instead.
- `src/pages/settings/administration/CostCentersManagementPage.tsx` — the cost centers *list*
  page (distinct from the "linked projects within one cost center" table above). Its `name`
  column renders a single cost-center name via `NameLinkCell` with no secondary line, because a
  cost center has no code/display-name pair — this list is not itself the "better view" example;
  the project sub-table in `CostCenterDetailsPage.tsx` is.

### Architecture and Layers Affected

- **Page/table layer** (`src/pages/settings/administration/projectsManagement/`): the `name`
  column's `customRenderColumns.name` renderer in `ProjectsManagementFull.tsx` is the only place
  that needs to change to align with the two-line pattern.
- **Shared formatting utility layer** (`src/utils/projectDisplayName.ts`): `getProjectDisplayName`
  already exists and is reused by the two-line renderers elsewhere; `formatProjectLabel` remains
  needed for single-line contexts (selects, dropdown options) and should not be removed.
- **Shared component layer** (`src/pages/settings/administration/components/NameLinkCell.tsx`):
  purely a link-styling wrapper; unaffected by which children (one line or two) are passed to it.
- **Table primitive layer** (`src/components/Table/*`): `ColumnDefinition`/`DefinitionTypes.Custom`
  and `TableCell.tsx` already support arbitrary JSX per cell via `customRenderColumns`, so no table
  primitive change is implied by mirroring the two-line renderer.

### Integration Points

- `ProjectsManagementFull.tsx` imports `formatProjectLabel` from `@/utils/projectDisplayName` and
  `NameLinkCell` from `@/pages/settings/administration/components/NameLinkCell`.
- `CostCenterProjectsManager.tsx` and `UserProjectsTable.tsx` both import `getProjectDisplayName`
  from the same `@/utils/projectDisplayName` module, so the reference implementation is already a
  shared utility, not duplicated formatting logic.
- No third-party UI library import differs between the two renderers; both are hand-rolled JSX
  inside `customRenderColumns` — no shared "ProjectNameWithCodeCell" component currently exists
  across the three call sites (`ProjectsManagementFull`, `CostCenterProjectsManager`,
  `UserProjectsTable`); each inlines its own JSX.

### Patterns and Conventions

- `customRenderColumns` keyed by column `key`, paired with `ColumnDefinition[]` and
  `DefinitionTypes.Custom`, is the standard way every table in `projectsManagement/` and
  `administration/` renders non-trivial cells (see also `BudgetSpendCell`,
  `ProjectResourceCounters`, `ResourceCounterBadge`).
- The two-line "primary label + `<span className="block text-xs text-text-quaternary">`
  secondary code" convention appears in exactly two places today
  (`CostCenterProjectsManager.tsx`, `UserProjectsTable.tsx`) and both gate the secondary line on
  `project.display_name` being truthy, falling back to showing only the code (via
  `getProjectDisplayName`, which itself falls back to `name` when no display name exists).

---

## 3. Documentation Findings

### Guides and Architecture Docs

`.ai-run/guides/components/component-patterns.md`, `component-organization.md`, and
`reusable-components.md` exist under `.ai-run/guides/components/` but contain no mention of
`NameLinkCell`, `display_name`, or a documented "name + code" cell convention — the pattern was
not found in guide text (grepped for `two-line`, `block text-xs`, `text-quaternary`,
`NameLinkCell`, `display_name` — no matches).

### Architectural Decisions

None found specific to this cell-rendering choice. No `ADR:`/`DECISION:`/`NOTE:` markers were
found near `formatProjectLabel`, `getProjectDisplayName`, or the three render sites.

### Derived Conventions

Conventions are derived from code, not documented: the two-line pattern
(`getProjectDisplayName(project)` as the bold/primary line, `project.name` as a quaternary-colored
secondary line, shown only when `display_name` is set) recurs identically in
`CostCenterProjectsManager.tsx` and `UserProjectsTable.tsx`, which is strong evidence it is the
project's de facto standard for name+code display outside of single-line/select contexts.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/settings/administration/projectsManagement/__tests__/ProjectsManagementFull.test.tsx`
  — covers resource-counter badge links and other table behavior; its `mockProject` fixture (line
  126) has no `display_name` field, so no existing test exercises `formatProjectLabel`'s
  concatenated-label branch or renders a project with both a code and a display name.
- `ProjectsManagementFull.search.test.tsx` and `ProjectsManagementFull.editFlow.test.tsx` — cover
  search debounce/filter behavior and the edit-modal submit flow (the latter does assert
  `display_name` is forwarded to `projectsStore.updateProject`, but only as a payload value, not
  as rendered cell content).
- No test file exists for `CostCenterProjectsManager.tsx`, `CostCentersManagementPage.tsx`, or
  `CostCenterDetailsPage.tsx` (`git grep` for these component names in `*.test.tsx` returned no
  results) — the "reference" two-line rendering has no direct unit test either.
- `src/utils/__tests__/projectDisplayName.test.ts` covers `formatProjectLabel` and (by inspection
  of the file) presumably `getProjectDisplayName`/`matchesProjectSearch`/`generateProjectName`
  directly as pure functions.

### Testing Framework and Patterns

Vitest + React Testing Library (per `AGENTS.md` and `vitest.workspace.ts`, two projects: `unit`
and `integration`). `ProjectsManagementFull.test.tsx` mocks `valtio`'s `useSnapshot`, mocks
`@/utils/toaster`, and mocks router/hook modules individually rather than using a full test
harness — consistent with the rest of `administration/` test files.

### Coverage Gaps

- No existing test asserts on the *rendered content* of the project-management list's `name`
  column when a project has a non-null `display_name` — changing the renderer therefore has no
  regression test to break or update discovered in this codebase area, and any new/changed
  behavior in `ProjectsManagementFull.tsx`'s name cell will need its own coverage.
- `CostCenterProjectsManager.tsx` (the pattern being mirrored) is itself untested.

---

## 5. Configuration and Environment

### Environment Variables

None found specific to this feature area. No `import.meta.env`/`window._env_` usage in
`projectsManagement/` files related to name/code display.

### Configuration Files

- `FEATURE_FLAG_COST_CENTERS = 'features:costCenters'` and `FEATURE_FLAG_PROJECT_CREATION =
  'features:userAbilityToCreateProject'` are read via `useFeatureFlag` in
  `ProjectsManagementFull.tsx` and gate the `cost_center_name` column and the "Create" button
  respectively — unrelated to the `name` column's rendering, but confirm this list already reads
  feature flags for column visibility (`effectiveColumnDefinitions`, lines 196–204).
- `useUserManagementEnabled` (from `@/hooks/useFeatureFlags`) selects between
  `ProjectsManagementFull` and `ProjectsManagementDefault`.

### Feature Flags and Deployment Concerns

No deployment manifest, Dockerfile, or CI config references `formatProjectLabel`,
`getProjectDisplayName`, or the project name column.

---

## 6. Risk Indicators

- Speculative: Changing `ProjectsManagementFull.tsx`'s `name` column to the two-line
  `getProjectDisplayName` + secondary `<span>` pattern would leave `formatProjectLabel` still in
  use by `ProjectSelector.tsx`, `useProjectOptions.ts`, and `useResolvedProjectOptions.ts` — those
  are `<select>`/dropdown option labels where a single-line format is arguably still correct, so a
  blanket replacement of `formatProjectLabel` callers is likely out of scope and needs explicit
  scoping in the spec.
- The two-line renderer pattern exists only inline in two components
  (`CostCenterProjectsManager.tsx`, `UserProjectsTable.tsx`); there is no shared
  `ProjectNameCell`/`ProjectNameWithCodeCell` component to import as-is — mirroring it into
  `ProjectsManagementFull.tsx` means either duplicating the JSX a third time or extracting a
  shared component, and no existing extraction attempt was found to reuse.
- `NameLinkCell` (currently used by `ProjectsManagementFull.tsx`'s name cell) renders as a
  `<button>` with `font-bold hover:underline`, styling distinct from the plain `<button
  className="text-left text-text-accent-status ...">` used in `CostCenterProjectsManager.tsx` —
  reconciling link styling (bold+underline vs. accent-color text) between the two patterns is a
  visual-consistency decision not resolved by the code as it stands today.
- No test in this codebase covers rendered name-column content for a project with a set
  `display_name`, in either the "one line" implementation or the "two line" reference
  implementation — any change here is effectively untested territory and needs new test coverage
  regardless of the chosen layout.
- The `name` column in `ProjectsManagementFull.tsx` currently has `headClassNames: 'w-[15%]'` and
  participates in `sortable: true` sorting by `name`; a taller two-line cell may interact with
  fixed-width/`table-fixed` layout (`tableClassName="table-fixed"` is set on this `Table`) and row
  height assumptions elsewhere in the table (e.g., `ProjectResourceCounters`, `BudgetSpendCell`
  cells in adjacent columns) — this is a layout risk to verify visually, not something the
  filesystem research can confirm statically.

---

## 7. Summary for Complexity Assessment

This task touches a single architectural layer: the page/table-cell rendering layer inside
`src/pages/settings/administration/projectsManagement/ProjectsManagementFull.tsx`, specifically
the `customRenderColumns.name` renderer (and possibly the sibling `ProjectNameCell`/
`renderProjectNameColumn` helpers at lines 133–146). The reference pattern the task asks to mirror
already exists twice in the codebase (`CostCenterProjectsManager.tsx`'s "Linked projects" table
and `UserProjectsTable.tsx`), both built on the existing `getProjectDisplayName` utility in
`src/utils/projectDisplayName.ts`, so no new formatting primitive needs to be invented — the
technical novelty is low.

The main complexity signals are: (1) no shared component currently encapsulates the two-line
name-plus-code cell, so the implementation must choose between a third inline duplication and a
new shared component; (2) `formatProjectLabel`, the function producing today's single-line output,
has other legitimate single-line callers (`ProjectSelector`, `useProjectOptions`,
`useResolvedProjectOptions`) that this task should not touch, requiring the spec to scope the
change precisely to the list/table cell; and (3) there is zero existing test coverage — in either
the current single-line implementation or the two-line reference implementation — asserting on
rendered name-column content when `display_name` is set, meaning new tests are needed from
scratch rather than adjusted.

Overall this reads as a small, well-precedented UI change (one render function, following an
established in-repo pattern) with the main risk being scope creep into the other
`formatProjectLabel` call sites and untested visual/layout interaction with the `table-fixed`
layout and adjacent custom cells.

---

## 8. External References

None named by the task.
