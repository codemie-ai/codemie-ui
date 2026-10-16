# EPMCDME-16054 — Filters reset after navigating away and back

## Problem

Filters on the Projects list and the Analytics screen reset when the user leaves the screen and comes back. Users must apply them again, and they may read results under the wrong scope without noticing.

The screens already have URL + localStorage persistence (`src/utils/filters.ts`; EPMCDME-12703, EPMCDME-15058). This is therefore a defect fix and a scope extension, not a new mechanism.

## Scope

| Screen | Controls in scope |
|---|---|
| Projects list — `/settings/administration/projects` (`ProjectsManagementFull`, shown only when user management is enabled) | search, budget assignment, budget category, **sort** |
| Analytics — shared filter bar (`AnalyticsFilters` / `useAnalyticsFilters`) | time period, start/end date, users, projects |
| Analytics — Leaderboard tab (`LeaderboardTab.tsx:60`) | tier, project, search, intent, CLI-only, sort |

## Required behaviour

### Analytics filter bar
- A change made within the 2 s debounce window before the user leaves the screen must be kept. `AnalyticsFilters.tsx` (~lines 90-98) currently cancels that pending write on unmount.
- On unmount, a pending value is written **to localStorage only**. It must not update the URL, because by then the router may be on another route and its query would be overwritten.
- Restored `users` must render in the control with their labels, whether or not `projects` is also restored. Today the labels are seeded only when both are present.

### Leaderboard filters
- The filter state (`LeaderboardEntriesParams`, including `sort_by`/`sort_order`) is restored on mount and saved on every change.
- Save it **to localStorage only**, under a new entity key. `updateUrlWithFilters` rebuilds the whole query and would drop the filter-bar params:

```ts
// src/utils/filters.ts
FILTER_ENTITY.ANALYTICS_LEADERBOARD = 'analytics_leaderboard'
```
- With nothing stored, the tab keeps today's default (`total_score`, `desc`).

### Projects sort
- Sort is saved and restored with the existing Projects filters, in the same entity (`FILTER_ENTITY.PROJECTS`) and by the same URL + storage mechanism. Today it is local `useState({})` in `ProjectsManagementFull`.
- This part goes ahead whatever the outcome of the reproduction below.

### Projects filter reset — reproduce first
- Reading the code found no root cause: `useProjectsFilters` reads and writes correctly. The work therefore **starts with a browser reproduction**: apply a filter, navigate away, return, then inspect the `<userId>_filters_projects` localStorage key and the URL.
- **If it reproduces:** fix the root cause it reveals.
- **If it does not reproduce:** stop work on the Projects filter defect. Report the steps tried, the feature-flag state and what was observed, and ask the reporter for exact steps and flags. The Analytics, Leaderboard and Projects-sort work still ships.

### Clearing
- If the user clears a filter (or returns sort to its default), the cleared state is saved. The old value must not come back on return. This applies to every control in scope.

## Acceptance criteria

1. Projects list: search and budget filters applied before leaving are restored on return, or work is halted pending reporter input as described above.
2. Projects list: sort applied before leaving is restored on return.
3. Analytics filter bar: values are restored on return, including a change made less than 2 s before leaving.
4. Leaderboard tab: tier, project, search, intent, CLI-only and sort are restored on return.
5. Every restored value is visible in its control, including user labels in the Analytics user filter.
6. On return, the request sent to the backend uses the restored values, so the results shown match them.
7. A cleared filter (or reset sort) stays cleared on return, on every screen in scope.
8. Saving a pending Analytics change on unmount does not change the URL of the route the user moved to.
9. Tests cover unmounting and remounting each in-scope screen, asserting the control value, the request params and that cleared values stay cleared.

## Non-goals

- No persistence for the Analytics top-N selectors, the CLI Analytics section toggle, or the Leaderboard view/season selector.
- No change to filter behaviour on other list pages (assistants, skills, workflows, katas, datasources, users management).
- No change to URL-over-storage priority, the storage key format, or how long stored filters last.
- Leaderboard filters are not reflected in the URL.
- No Projects filter fix that is guessed without a reproduction.
- `ProjectsManagementDefault` (non-user-management view) is unchanged.

## Risks

- The Projects root cause is unknown. Reproduction needs user management enabled, and budget filters also need budget management enabled.
- Changes to the shared `src/utils/filters.ts` affect every list page. Keep them additive (the new enum value only).
