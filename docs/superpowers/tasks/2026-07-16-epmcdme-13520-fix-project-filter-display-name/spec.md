# Spec: Fix project filter display name after page refresh (EPMCDME-13520)

## Problem

When a system-level admin (`isAdmin: true`) selects a project they are not personally assigned to via the Project filter on the Assistants, Skills, or Workflows list pages, then refreshes the page, the filter chip shows the project's technical name instead of its display name.

**Root cause.** On refresh, each filter component calls `loadProjectOptions('')`. Because `search.length < 3` and `VITE_SHOW_ALL_PROJECTS !== 'true'` (the production default), `userStore.getAdminProjects` short-circuits and returns only the user's roster projects. The non-roster project persisted in localStorage/URL is absent from the returned options. `Filters.tsx` `getHiddenOptions` (lines 138–158) then creates a synthetic `{ label: technicalName, value: technicalName }` fallback entry, which renders the technical name as the chip label.

**Why this doesn't affect non-admin users.** Non-admins go through `getUserProjects()`, which returns all their assigned projects. A non-admin cannot select an out-of-roster project, so the fallback path is never reached.

## Fix

Wire the existing `useProjectDisplayNames` / `projectDisplayNamesStore.ensure` pattern — already used in `ProjectNameCell`, `AssistantDetails`, and `SkillDetails` — into the three filter components that were missing the call.

### Changes per component

**`AssistantFilters.tsx`, `SkillsFilters.tsx`, `WorkflowsFilters.tsx`** (symmetric):

1. Import `useProjectDisplayNames` from `@/hooks/useProjectDisplayNames`.
2. Call `useProjectDisplayNames(selectedProjectValues)` where `selectedProjectValues` is `filters.project ?? []` (for `AssistantFilters` and `SkillsFilters`, received as a prop) or `initialFilterValues.project ?? []` (for `WorkflowsFilters`, read from localStorage/URL at mount).
3. Derive `resolvedProjectOptions` in a new `useMemo`:
   - Build a `Set` of values already present in `projectOptions`.
   - For each selected project value not in that set, create `{ label: projectDisplayNames.get(name) ?? name, value: name }`.
   - Return `[...projectOptions, ...extras]`.
4. Replace `options: projectOptions` with `options: resolvedProjectOptions` in the `filterDefinitions` useMemo for the `project` field.

`Filters.tsx`, `FilterDefinition`, and the store/hook layer are not changed.

### Loading / intermediate state

`projectDisplayNamesStore` exposes only `cache` (reactive) and an `inFlight` dedup set (non-reactive). There is no reactive pending flag.

During the fetch window (after mount, before `ensure()` resolves):
- `projectDisplayNames.get(name)` returns `undefined`.
- The `?? name` fallback means the extra entry carries `{ label: technicalName, value: technicalName }`.
- The chip renders the technical name — the same as today's behaviour, but now time-bounded by the fetch (~< 1 s on a warm network).

Once `ensure()` resolves, Valtio writes to `cache`, triggers a re-render, and the chip switches to the display name. No skeleton is added; this matches `ProjectNameCell` and `AssistantDetails` (the established pattern). Adding a skeleton would require a `pending` set in the store proxy, which is out of scope.

### Error behaviour

If `ensure()` fails (project not visible, network error), the store leaves the name uncached so a later attempt can retry. `projectDisplayNames.get(name)` returns `undefined`; the fallback `?? name` shows the technical name — identical to today's behaviour, no regression.

## Testing

### New: `AssistantsListPage.integration.test.tsx`

Add two tests:

1. **Resolved state** — Project Admin (`is_admin: true`), non-roster project name persisted in localStorage. Mock `GET v1/projects/:name` to resolve immediately with a `display_name`. On page load, the filter chip shows the display name, not the technical name.

2. **Loading/fallback state** — Same setup but mock `GET v1/projects/:name` with a promise that does not resolve during the test. Assert the chip shows the technical name (graceful degradation, no crash or empty label).

### New: `SkillsListPage.integration.test.tsx`

First integration test for this page. One test covering the resolved state only (display name shown after `ensure()` resolves). Follow the `AssistantsListPage` integration test pattern: `renderPage`, `mockAPI`, `localStorageMock`.

### Update: `WorkflowsListPage.integration.test.tsx`

The existing `Project filter applies correctly` test (line 842) uses `display_name: null` fixtures. Update the fixture to include a real `display_name` and add an assertion that the chip label equals the display name. The existing assertion (technical name passed as query param) is preserved.

## Files changed

| File | Change |
|---|---|
| `src/pages/assistants/components/AssistantList/AssistantFilters/AssistantFilters.tsx` | Add `useProjectDisplayNames`, derive `resolvedProjectOptions` |
| `src/pages/skills/components/SkillsFilters.tsx` | Same |
| `src/pages/workflows/components/WorkflowsFilters.tsx` | Same (source values from `initialFilterValues.project`) |
| `src/pages/assistants/__tests__/AssistantsListPage.integration.test.tsx` | Add resolved + loading-state tests |
| `src/pages/skills/__tests__/SkillsListPage.integration.test.tsx` | New file — first integration test |
| `src/pages/workflows/__tests__/WorkflowsListPage.integration.test.tsx` | Update fixture + add display-name assertion |

## Out of scope

- `DataSourceFilters.tsx` — the same `loadProjectOptions` pattern exists there (TODO comment at line 54) but it is not part of this ticket.
- Adding a `pending` set to `projectDisplayNamesStore`.
- Changing the 3-character search gate in `getAdminProjects`.
- Any change to `Filters.tsx` or `FilterDefinition`.
