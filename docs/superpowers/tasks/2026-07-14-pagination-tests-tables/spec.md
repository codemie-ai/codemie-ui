# Design: EPMCDME-13481 — Pagination tests for Data Sources & Integrations tables

## Context

Sub-task of EPMCDME-5727 ("Add tests for pagination on all tabs"), following EPMCDME-13479 (Assistants/Workflows tabs, unmerged). This ticket covers the three remaining shared-`Table.tsx` pages that have zero pagination coverage today:

- Data Sources page (`/data-sources`)
- Integrations — User Settings tab (`/integrations`, default tab)
- Integrations — Project Settings tab (`/integrations`, admin-gated tab)

Scope is integration tests only. No production code changes.

## Approach

Three new, self-contained pagination test files — no shared "assert a Table paginates" helper. The ticket explicitly permits introducing one, but the prior pagination task (EPMCDME-13479) didn't need one, and a first-attempt abstraction over three different store-wiring paths (plus ProjectSettings' extra admin/tab-switch precondition) risks being wrong in a way that's more expensive to unwind than three small, independent files. Each file follows the same shape as the existing `AssistantTemplatesPagination.integration.test.tsx` / `WorkflowTemplatesPagination.integration.test.tsx` reference files: a local fixture factory, `renderPage()` + `mockAPI()` setup, and one `describe` block per page/table.

## Files

### 1. `src/pages/dataSources/__tests__/DataSourcesPagination.integration.test.tsx`

- Route: `/data-sources`
- Mocks: `v1/index` → nested envelope `{ data, pagination: { page, per_page, pages, total } }`; `v1/index/users` → `[]` (fired on mount by `DataSourceFilters`)
- No additional admin/project mock needed — `userStore.getProjects()` resolves synchronously via `getUserProjects()` for the default (non-admin) mocked user.
- Local fixture: `createDataSourceFixture(overrides)` / `createDataSources(count, prefix)` — minimal fields from `DataSource` (`id`, `project_name`, `repo_name`, `index_type`, `created_by`, `project_space_visible`, `date`, `update_date`, `status`-relevant fields as needed by rendered columns).

### 2. `src/pages/integrations/__tests__/UserSettingsPagination.integration.test.tsx`

- Route: `/integrations` (User Settings is the default tab — no tab switch needed)
- Mocks: `v1/settings/user` → nested envelope
- Local fixture: `createUserSettingFixture(overrides)` / `createUserSettings(count, prefix)` — minimal fields from `UserSetting`.

### 3. `src/pages/integrations/__tests__/ProjectSettingsPagination.integration.test.tsx`

- Route: `/integrations`
- Mocks: `v1/user` overridden with `is_admin: true` (reveals the "Project" `SelectButton` option — default mock has `is_admin: false`); `v1/settings/project` → nested envelope; `v1/settings/project/users` → `[]` (fired on mount by `ProjectSettings`'s `loadCreatedByOptions`)
- Setup step before every test: click the `Project` option (`screen.getByRole('button', { name: 'Project' })` — PrimeReact `SelectButton` renders each option with `role="button"` and `aria-label` = option label) to switch off the default User tab.
- Confirmed no `v1/admin/applications` mock is required: `userStore.getAdminProjects` short-circuits to a synchronous return when the search string is empty (as it is on initial mount), so the admin-projects endpoint is never actually called in these tests.
- Local fixture: `createProjectSettingFixture(overrides)` / `createProjectSettings(count, prefix)` — minimal fields from `ProjectSetting`.

## Test cases (5 per file, 15 total)

Per the ticket's acceptance criteria, each file gets:

1. **Page-2 navigation loads the next page** — mock 25 items (`pages: 3`), click `Page 2`, remock page-2 data, assert page-2 item visible and page-1 item gone.
2. **Per-page change reloads with the new size** — `document.getElementById('per-page')` → `fireEvent.click` to open the PrimeReact overlay → `fireEvent.click(screen.getByLabelText('20 items'))` (switching from the default 10 to 20, per `DECIMAL_PAGINATION_OPTIONS` — distinct from the prior task's `DEFAULT_PAGINATION_OPTIONS` 12/24 set); remock with a distinct 20-per-page dataset; assert the new item renders and `global.fetch` was called with `per_page=20`.
3. **Pagination controls hidden when items fit on one page** — mock `pages: 1, total: 6`; assert `Page 2` button absent.
4. **Previous button absent on first page** — mock `page: 0, pages: 3, total: 25`; assert `Previous page` button absent.
5. **Next button absent on last page** — mock the initial response directly with `page: 2, pages: 3, total: 25` (stores trust the response's `page` field verbatim, confirmed in `dataSourceStore`/`userSettingsStore`/`projectSettingsStore`); assert `Next page` button absent.

## Conventions carried over from the prior pagination task

- `renderPage(path)` + `mockAPI(method, url, data)` — `mockAPI` calls precede `renderPage`; last call per key wins.
- "Disabled" pagination controls = DOM absence, not the `disabled` attribute — `screen.queryByRole('button', { name: ... }).not.toBeInTheDocument()`.
- `fireEvent` (not `userEvent`) for the PrimeReact per-page `<Select>` interaction — matches the established convention for this specific component.
- No router/URL-sync assertions — none of these three pages sync pagination to the router (unlike some Assistants/Workflows tabs in the prior task).
- `src/test-utils/integration.tsx` and `_mock-state.ts` are read-only; not modified.

## Risk notes

- `DataSourcesPage` has a 5-second background `REFRESH_TIMEOUT` re-fetch loop. Not mitigated with fake timers — the component's `useEffect` cleanup clears the pending timeout on unmount (via `setupTests.tsx`'s `afterEach` → RTL `cleanup()`), and each test completes in well under 5 seconds, so the timer should not fire mid-test. If flakiness appears during implementation, revisit with fake timers.
- No CI pipeline currently gates `npm run test:integration` — verification is manual/local for this ticket, per AC #3.

## Out of scope

- Any production code change to `Table.tsx`, `Pagination.tsx`, `useTableFilters.ts`, the three stores, or `IntegrationsPage.tsx`/`IntegrationsTab.tsx`.
- Modifying `src/test-utils/integration.tsx` or `_mock-state.ts`.
- A shared/reusable pagination-assertion helper (optional per ticket; deliberately not introduced — see Approach).
- Filter, sort, or create/edit/delete flow coverage for these three pages (already covered elsewhere, e.g. `DataSourceCreatePage.integration.test.tsx`).

## Validation

- `npm run test:integration -- DataSourcesPagination UserSettingsPagination ProjectSettingsPagination` locally per file while iterating.
- Full `npm run test:integration` before handoff (qa-gates will also run this).
