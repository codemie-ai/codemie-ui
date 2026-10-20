# EPMCDME-16068: Scheduler Project filter uses the shared ProjectSelector

## Problem

The Project filter on the Scheduler page is a generic `Multiselect` declared in
`src/pages/schedulers/SchedulerFilters.tsx` (lines ~85-91) with no `config.onFilter`, so
`MultiSelect` renders no search box (`src/components/form/MultiSelect.tsx:467`). Other pages use the
shared `ProjectSelector` (`src/components/ProjectSelector`), which has search. The Scheduler page
should use it for consistency.

## Approach

Declare the `projectId` filter as `FilterDefinitionType.Custom` and render `ProjectSelector` from
the `renderCustomFilter` prop of `Filters`, dispatching on `definition.name === 'projectId'`
(same pattern as Assistants and Skills "Created by"). Nothing else changes in `Filters`,
`ProjectSelector`, `SchedulersPage`, the store or the backend.

Constraints:

- **Mode:** `multiple`, array value. The definition value stays `[projectId]` (or `[]`), and
  `handleApply` keeps only the first element (`?.[0]`) as today. `selectDefault` does not fire in
  this mode. A string value must not be passed, because `?.[0]` would then return one character.
- **Option source:** the shared selector's own list (`userStore.getProjects`, including its admin
  search rules). `schedulersStore.filterOptions.projects` no longer feeds the Project filter; the
  endpoint and the store field remain.
- **Look:** follow the Analytics embed precedent (`AnalyticsFilters.tsx:268-276`): `label=""`
  (the panel already shows the "Project" caption), `fullWidth`, `multiple`. No duplicate caption.
- **Value contract:** project value is the project name, equal to the URL `?projectId=` value,
  so URLs and reloads keep working.

## Acceptance criteria

1. The Project filter dropdown on the Scheduler page contains a search input.
2. Typing a query filters the project list; clearing the query restores the full list.
3. The Project filter is rendered by the shared `ProjectSelector`, with no `Filters` or
   `ProjectSelector` source change.
4. Selecting a project sets `?projectId=<name>` and filters the table; unchecking it, or the clear
   action, removes the param. Reload keeps the selection. Behaviour is the same as before the change.
5. Typing in the search box does not trigger a filter apply. Only a selection change does.
6. The Resource filter and the other filters (Status, etc.) behave as before.
7. Existing tests that assert Project options from `filterOptions.projects`
   (`SchedulerFilters.test.tsx`, `SchedulersPage.integration.test.tsx`) are updated to supply
   projects through the user store or the `v1/user` mock. New coverage: the search input is
   present, and the selection reaches `onApply`.

## Non-goals

- No change to `ProjectSelector`, `Filters`, `MultiSelect`, `SchedulersPage`, `schedulersStore` or
  the backend `GET /v1/schedulers/filter-options`.
- No true multi-project filtering: the effective selection stays one project.
- No search or other change to the Resource filter.
- No change to the table's Project column (still plain `project.name`).
- No `projectId` URL or API contract change.
- No fix for the unrelated leading-slash `'/v1/...'` calls in `schedulersStore`.
- No filtering of options to projects that have schedulers.

## Known side effects

- Users can pick projects that return no schedulers.
- Labels become "name (display_name)" (`formatProjectLabel`).
- Admins with `SHOW_ALL_PROJECTS` off get server-side search only from 3 characters (inherited).
