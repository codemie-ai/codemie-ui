# EPMCDME-13637: Project Management Search by Name + Display Name

**Date**: 2026-07-23  
**Ticket**: https://jiraeu.epam.com/browse/EPMCDME-13637  
**Branch**: `EPMCDME-13637_project-mgmt-search-name-display`  
**Repos**: `codemie` (backend) + `codemie-ui` (frontend)

---

## Problem

Project Management search (and all project selectors) match only against `COALESCE(display_name, name)`:
if a project has a `display_name` set, its technical `name` (e.g. `epm-fdeg`) is never searchable.
This affects two server endpoints and one client-side path independently.

Additional symptom: the existing "name + tooltip on hover" UI pattern is inconsistent — display_name
is invisible unless the user hovers, which also means users don't know what to type in the search box.

---

## Acceptance Criteria

- A project is found when the search query matches its `name`.
- A project is found when the search query matches its `display_name`.
- Both AC above hold in the admin `v1/projects` table, the admin `v1/admin/applications` dropdowns,
  and the non-admin cached-project dropdowns.
- `display_name` (when present) is always visible below `name` in table cells and dropdown options,
  in muted text — no tooltip required.
- Empty search shows all projects (no regression).
- Existing `display_name`-only search continues to work.

---

## Architecture

Three independent layers, each with a separate root cause:

| Layer | Root Cause | Fix |
|---|---|---|
| **Backend `v1/projects`** | `_apply_search_filters` uses `COALESCE(display_name, name)` — `name` ignored when `display_name` set | OR both fields explicitly |
| **Backend `v1/admin/applications`** | `Application.search_by_name` uses same `COALESCE` pattern | OR both fields explicitly |
| **Frontend non-admin store** | `getUserProjects()` ignores the search query entirely | Client-side filter on both fields via `matchesProjectSearch` |
| **Visual** | Tooltip-on-hover hides `display_name` | Replace with always-visible stacked two-line display |

---

## Backend Changes (`codemie` repo)

### `_apply_search_filters` is NOT shared between endpoints

`v1/projects` uses `ApplicationRepository._apply_search_filters` in `application_repository.py`.  
`v1/admin/applications` uses `Application.search_by_name` in `models.py`.  
Both have the same `COALESCE` bug independently and must be fixed separately.

### Fix: `application_repository.py` — `_apply_search_filters`

```python
# Before
display_or_name = func.coalesce(Application.display_name, Application.name)
return statement.where(
    or_(
        display_or_name == search,
        display_or_name.ilike(f"%{escaped_query}%", escape="\\"),
        Application.description.ilike(f"%{escaped_query}%", escape="\\"),
    )
)

# After
display_or_name = func.coalesce(Application.display_name, Application.name)
return statement.where(
    or_(
        display_or_name == search,
        display_or_name.ilike(f"%{escaped_query}%", escape="\\"),
        Application.name == search,                                       # NEW
        Application.name.ilike(f"%{escaped_query}%", escape="\\"),        # NEW
        Application.description.ilike(f"%{escaped_query}%", escape="\\"),
    )
)
```

Also fix `_apply_search` ordering to prioritize exact match on either field:

```python
# After
return statement.order_by(
    case((or_(display_or_name == search, Application.name == search), 1), else_=2)
)
```

### Fix: `models.py` — `Application.search_by_name`

```python
# After
display_or_name = func.coalesce(cls.display_name, cls.name)
stmt = (
    select(cls)
    .where(
        or_(
            display_or_name == name_query,
            display_or_name.ilike(f"%{escaped_query}%", escape="\\"),
            cls.name == name_query,                                    # NEW
            cls.name.ilike(f"%{escaped_query}%", escape="\\"),         # NEW
        )
    )
    .order_by(
        case((or_(display_or_name == name_query, cls.name == name_query), 1), else_=2)
    )
)
```

### Backend tests to add

In the existing test files for `application_repository` and `Application.search_by_name`:

- Project with `display_name` set is found by exact `name` query.
- Project with `display_name` set is found by partial `name` query.
- Project with `display_name` set is still found by `display_name` (regression guard).
- Project without `display_name` is still found by `name` (regression guard).
- Exact match on `name` is ordered before partial match.

---

## Frontend Changes (`codemie-ui` repo)

### 1. Shared utility — `matchesProjectSearch`

Add to `src/utils/projectDisplayName.ts`:

```ts
export function matchesProjectSearch(
  project: { name: string; display_name?: string | null },
  query: string
): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  return (
    project.name.toLowerCase().includes(q) ||
    !!(project.display_name?.trim().toLowerCase().includes(q))
  )
}
```

### 2. Fix non-admin search — `src/store/user.ts`

`getUserProjects` currently ignores `query`. Fix:

```ts
// Signature change
getUserProjects(adminOnly = false, query = '') {
  const projects = userStore.user?.projects ?? []
  const filtered = adminOnly ? projects.filter((p) => p.is_project_admin) : projects
  const searched = query ? filtered.filter((p) => matchesProjectSearch(p, query)) : filtered
  return searched
    .map((p) => ({ name: p.name, display_name: p.display_name }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
```

Thread `query` from `getProjects` (non-admin path):

```ts
async getProjects(query = '', adminOnly = false) {
  if (userStore.user?.isAdmin) return userStore.getAdminProjects(query)
  return userStore.getUserProjects(adminOnly, query)   // pass query
}
```

Frontend tests to add (in the user store test file or a new one):

- Non-admin: `getUserProjects` with a `name` query returns matching projects even when `display_name` differs.
- Non-admin: `getUserProjects` with a `display_name` query still works (regression guard).
- Non-admin: `getUserProjects` with empty query returns all projects.

### 3. Shared display component — `src/components/ProjectNameDisplay/ProjectNameDisplay.tsx`

New component. Used everywhere a project name is rendered (table cells and dropdown options).

```tsx
interface ProjectNameDisplayProps {
  name: string
  displayName?: string | null
  truncate?: boolean
}

const ProjectNameDisplay = ({ name, displayName, truncate }: ProjectNameDisplayProps) => {
  const trimmed = displayName?.trim()
  if (!trimmed) return <>{name}</>
  return (
    <div className="flex flex-col leading-tight gap-0.5">
      <span>{name}</span>
      <span className={`text-xs text-text-secondary${truncate ? ' truncate' : ''}`}>
        {trimmed}
      </span>
    </div>
  )
}

export default ProjectNameDisplay
```

Color token: `text-text-secondary` — the design system token for secondary/muted text.
Works in both light and dark themes (no hardcoded color values).

### 4. Table cells — `ProjectNameCell`

`src/components/ProjectNameCell/ProjectNameCell.tsx` — remove tooltip pattern, use `ProjectNameDisplay`:

```tsx
const ProjectNameCell = ({ projectName }: ProjectNameCellProps) => {
  const displayName = useProjectDisplayNames(projectName).get(projectName)
  return <ProjectNameDisplay name={projectName} displayName={displayName} />
}
```

Remove `data-tooltip-id` and `data-tooltip-content` from the JSX. No other behavioral change.

### 5. `ProjectsManagementFull.tsx` — Name column

The Name column uses `NameLinkCell` (clickable link) with tooltip. Replace tooltip with inline display:

```tsx
name: (item: Project) => (
  <NameLinkCell onClick={() => handleOpenProjectDetails(item.name)}>
    <ProjectNameDisplay name={item.name} displayName={item.display_name} />
  </NameLinkCell>
),
```

Remove the `displayName` tooltip variable from this renderer.

### 6. Dropdown options — `useProjectOptions` hook and option shape

`src/hooks/useProjectOptions.ts` — extend option shape to carry `displayName`:

```ts
// Option shape: { label: string, value: string, displayName?: string }
// label = getProjectDisplayName(project)  (unchanged — used for selected chip)
// value = project.name
// displayName = project.display_name (new — used for two-line rendering)

const options = projects.map((project) => ({
  label: getProjectDisplayName(project),
  value: project.name,
  displayName: project.display_name ?? undefined,
}))
```

Export a shared render helper from the same file:

```ts
export const renderProjectOption = (opt: { label: string; value: string; displayName?: string }) => (
  <ProjectNameDisplay name={opt.value} displayName={opt.displayName} truncate />
)
```

Note: `opt.value` is always the technical `name`. The chip (`label`) continues to show
`getProjectDisplayName(project)` so existing selected-chip behavior is unchanged.

### 7. `ProjectSelector` — option shape + render

`src/components/ProjectSelector/ProjectSelector.tsx`:

- Match the extended option shape from `useProjectOptions`.
- Pass `renderProjectOption` (imported from `useProjectOptions`) as `renderOption` to `<MultiSelect>`.
- `handleFilter` → `loadProjects(searchValue)` → `userStore.getProjects(query)` already works correctly
  for admins (server-side) and now also for non-admins (via the `getUserProjects` fix above).

### 8. Two files already using `useProjectOptions` — `ProjectSettings` + `UserSettings`

`src/pages/settings/components/ProjectSettings/ProjectSettings.tsx`  
`src/pages/settings/administration/components/UserSettings/UserSettings.tsx`

These already use the `useProjectOptions` hook. Changes needed: pass `renderProjectOption` to the
`MultiSelect` or `ProjectSelector` they render. No local duplication to remove.

### 9. Refactor 5 copy-pasted filter files to use `useProjectOptions`

These 5 files each duplicate the same `loadProjectOptions` pattern locally:

- `src/pages/assistants/components/AssistantList/AssistantFilters/AssistantFilters.tsx`
- `src/pages/favorites/components/FavoritesAllFilters.tsx`
- `src/pages/workflows/components/WorkflowsFilters.tsx`
- `src/pages/skills/components/SkillsFilters.tsx`
- `src/pages/dataSources/components/DataSourceFilters.tsx`

**Decision: refactor all five to use `useProjectOptions`.**
Rationale: we are touching all five anyway to add `renderProjectOption`. Consolidating removes 5 copies
of the same bug surface and ensures the `matchesProjectSearch` fix (non-admin path) applies automatically.

For each: replace the local `[projectOptions, setProjectOptions]` + `loadProjectOptions` block with
`const { projectOptions, loadProjectOptions } = useProjectOptions()`, then pass `renderProjectOption`
to the `MultiSelect` rendering project options.

### 10. PrimeReact `filterBy` threading — `src/components/form/MultiSelect/MultiSelect.tsx`

**Critical gap**: PrimeReact's `MultiSelect` applies its own independent client-side option visibility
filter based on the `filterBy` prop (default: `"label"`). This is in addition to any `onFilter` handler.
Confirmed in `node_modules/primereact/multiselect/multiselect.esm.js` (`getVisibleOptions`, ~lines 1873–1897).

Without threading `filterBy` through, even after backend OR-search fixes and `matchesProjectSearch`:
- A project found by `name` (not its `display_name`) is fetched and present in the option list.
- PrimeReact then hides it because `label` (= `getProjectDisplayName()` = `display_name` when set) does
  not match the query string.
- The fix silently fails in exactly the scenario this ticket exists to solve.

**Fix — `src/components/form/MultiSelect/MultiSelect.tsx`:**

Add `filterBy` to the props interface and pass it through to `PrimeMultiselect`:

```tsx
interface MultiSelectProps<T> {
  // ... existing props ...
  filterBy?: string
}

// In the component JSX:
<PrimeMultiselect
  // ... existing props ...
  filterBy={filterBy}
/>
```

**Fix — `ProjectSelector.tsx` and all 5 refactored filter files:**

Pass `filterBy="value,displayName"` to `<MultiSelect>` wherever project options are rendered.
The field names `value` and `displayName` match the extended option shape introduced in section 6:

```tsx
<MultiSelect
  options={projectOptions}
  filterBy="value,displayName"
  renderOption={renderProjectOption}
  // ... other props ...
/>
```

This tells PrimeReact to match the typed query against both the `value` field (technical `name`)
and the `displayName` field, independently of `label`. Options that match by `name` are now visible.

**Scope**: dropdown/select components only (`ProjectSelector.tsx`, 5 filter files, and
`ProjectSettings.tsx` + `UserSettings.tsx` via `useProjectOptions`).
`ProjectsManagementFull.tsx` is a server-driven table — no `MultiSelect`, not affected.

**Test to add:**

Add one test in `ProjectSelector` or a filter-file test suite that explicitly verifies:
> An option whose `value` (technical `name`) matches the search query but whose `displayName` does NOT
> match remains visible in the rendered dropdown option list after the user types the query.

This test is distinct from the `matchesProjectSearch` unit test — it must assert rendered visibility
(e.g. with `getByText` or `queryByRole('option', ...)`) to catch a PrimeReact `filterBy` regression,
not just that the option was included in the fetched data.

---

## File Change Summary

| File | Type | Change |
|---|---|---|
| `codemie/.../application_repository.py` | backend | `_apply_search_filters` + `_apply_search` ordering |
| `codemie/.../models.py` | backend | `Application.search_by_name` |
| `codemie-ui/src/utils/projectDisplayName.ts` | util | Add `matchesProjectSearch` |
| `codemie-ui/src/store/user.ts` | store | `getUserProjects(adminOnly, query)` + `getProjects` thread |
| `codemie-ui/src/components/ProjectNameDisplay/ProjectNameDisplay.tsx` | **NEW** component | Stacked two-line display |
| `codemie-ui/src/components/ProjectNameCell/ProjectNameCell.tsx` | component | Remove tooltip → use `ProjectNameDisplay` |
| `codemie-ui/src/pages/settings/administration/projectsManagement/ProjectsManagementFull.tsx` | page | Name column renderer |
| `codemie-ui/src/hooks/useProjectOptions.ts` | hook | Extend option shape, export `renderProjectOption` |
| `codemie-ui/src/components/form/MultiSelect/MultiSelect.tsx` | component | Add `filterBy` prop, pass through to PrimeMultiselect |
| `codemie-ui/src/components/ProjectSelector/ProjectSelector.tsx` | component | Match option shape, add `renderOption`, pass `filterBy="value,displayName"` |
| `codemie-ui/src/pages/settings/components/ProjectSettings/ProjectSettings.tsx` | page | Add `renderProjectOption` |
| `codemie-ui/src/pages/settings/administration/components/UserSettings/UserSettings.tsx` | page | Add `renderProjectOption` |
| `codemie-ui/src/pages/assistants/.../AssistantFilters.tsx` | refactor | Replace local pattern with `useProjectOptions` + `renderProjectOption` + `filterBy="value,displayName"` |
| `codemie-ui/src/pages/favorites/.../FavoritesAllFilters.tsx` | refactor | Same |
| `codemie-ui/src/pages/workflows/.../WorkflowsFilters.tsx` | refactor | Same |
| `codemie-ui/src/pages/skills/.../SkillsFilters.tsx` | refactor | Same |
| `codemie-ui/src/pages/dataSources/.../DataSourceFilters.tsx` | refactor | Same |

Plus test files for: backend repository, `user.ts` store, `ProjectNameDisplay` component,
`ProjectNameCell` (tooltip removal regression), `matchesProjectSearch` utility,
`ProjectSelector` (PrimeReact `filterBy` visibility test — option matching by `name` remains visible).

---

## Out of Scope

- Analytics filters (`src/pages/analytics/components/AnalyticsFilters.tsx`) — uses `<ProjectSelector>` directly, so the fix is picked up automatically; no separate file change needed. Include in manual QA verification.
- Katas filters.
- Workflow form fields that embed a project selector (they go through `ProjectSelector` which is covered).
- Backend `display_name` validation or length constraints.

---

## Amendment (2026-07-23): Simplified frontend display/matching approach

The frontend "Visual" and "Dropdown options" sections above (the stacked
`ProjectNameDisplay` component plus `filterBy` threading through `MultiSelect`,
`Filters.tsx`, `ProjectSelector`, and the five refactored filter pages) were
**reverted and replaced** with a simpler approach:

- Every place that renders a project (table cells, detail sidebars, dropdown
  options) now calls a single utility, `formatProjectLabel(project)` in
  `src/utils/projectDisplayName.ts`, which returns `"name (display_name)"` when
  `display_name` is set, else just `name`.
- Because `display_name` is now part of the same string PrimeReact's
  `MultiSelect` filters against (`optionLabel`/`label`), its default
  substring-matching filter already matches on both fields — no `filterBy`
  override is needed.

This removes: the `ProjectNameDisplay` component, the `filterBy` prop on
`MultiSelect.tsx`, `filterBy` threading in `Filters.tsx`, and
`filterBy`/`renderOption` wiring in `ProjectSelector.tsx` and the five filter
pages (`AssistantFilters`, `FavoritesAllFilters`, `WorkflowsFilters`,
`SkillsFilters`, `DataSourceFilters`).

Unchanged: the backend OR-match fix (`v1/projects`, `v1/admin/applications`),
`matchesProjectSearch` and the `getUserProjects` client-side query threading
for non-admins, and the `useProjectOptions` consolidation of the five filter
pages (Task 13) — all of that is still required and still in place.
