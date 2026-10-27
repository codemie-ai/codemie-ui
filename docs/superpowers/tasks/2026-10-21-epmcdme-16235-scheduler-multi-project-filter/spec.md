# EPMCDME-16235 — Scheduler page: multi-select Project and Resource filters (frontend)

## Intent

On the Scheduler page the Project selector shows checkboxes, but checking a second project removes the first one. The Resource filter does the same. Users expect to pick several values and see schedulers for any of them. The backend (codemie MR) already accepts repeated `projectId` / `resourceId` query params with OR semantics within a dimension, keeps a single value working as before, and treats an empty list as "no filter".

## Root cause

The selection is cut to one value at three points. `refreshOnValuesUpdate` in `Filters` then pushes that single value back into the UI:

1. `SchedulerFilters.handleApply` keeps only `[0]` of each array (`src/pages/schedulers/SchedulerFilters.tsx:124-138`). `SchedulerFilterValues` is scalar (L28-35), and so is the definition `value` wrapping (L81-94).
2. `SchedulersPage` writes the URL with `set` and reads it with `get` (`src/pages/schedulers/SchedulersPage.tsx:94-106`, `131-144`).
3. `SchedulersQuery.projectId` / `resourceId` are scalar, and `fetchSchedulers` types its params as scalar (`src/store/schedulers.ts:61-71`, `115-145`).

## Goals / behavior

- `projectId` and `resourceId` are `string[]` at every hop: filter values, URL, store query and request.
- `handleApply` passes the full arrays. The definitions pass the arrays through as `value`.
- An empty array means no filter. `areFiltersEmpty` treats `[]` as empty. An empty list produces no query param.
- The URL holds one repeated key per value (`?projectId=a&projectId=b`): `getAll` to read, `append` to write. This follows `src/utils/filters.ts:148`. A reload, a shared link, or the `sessionStorage` restore in `useSearchParams` keeps the whole selection. An old URL with a single value still works.
- The request sends arrays as they are. The default `queryParamArrayHandling: 'separate'` in `src/utils/api.ts:310-343` already emits repeated params, so `api.ts` does not change.
- Project values stay project **names**, as `ProjectSelector` emits today and the backend expects.

## Acceptance criteria

1. AC1: The user can check two or more projects in the Project selector, and all of them stay checked.
2. AC2: Unchecking one project leaves the other selected projects checked.
3. AC3: The scheduler list request carries every selected project as a repeated `projectId` param, so the list shows schedulers from any of them.
4. AC4: AC1–AC3 also hold for the Resource filter (`resourceId`).
5. AC5: The frontend sends only the user's selection and adds no client-side widening. Access scoping for non-admins stays on the backend.
6. AC6: Clearing all selections sends no `projectId` / `resourceId` param, and the unfiltered list is shown.
7. AC7: A multi-selection survives a page reload or a shared link (the URL round-trip keeps every value).

## Tests

- `src/pages/schedulers/__tests__/SchedulerFilters.test.tsx`: rewrite the two scalar tests (apply, clear) to use arrays. Add tests that check 2+ projects and 2+ resources, then uncheck one and confirm the others stay selected.
- Store: test that `fetchSchedulers` sends repeated `projectId` / `resourceId` params for arrays and sends none for empty arrays.
- Page URL round-trip (AC7): add one integration assertion in `SchedulersPage.integration.test.tsx`. Opening `/schedulers?projectId=a&projectId=b` must request both values.

## Non-goals

- Scheduler Run History filters (`SchedulerRunFilters.tsx`, `/scheduler-runs*`) stay unchanged (D3).
- No changes to `api.ts`, `ProjectSelector`, the shared `Filters` component or `useSearchParams`.
- No comma-separated param format. Only repeated params.
- No AND semantics and no "match all" toggle.
- No backend changes. Those were shipped in the separate codemie MR.
- No change to other scheduler filters (owner type, search, type switch).

## Left to the builder

Exact types for the widened `params` record in `fetchSchedulers`, and how the tests are arranged in their files.
