# Technical Research

**Task**: activity events project-history modal
**Generated**: 2026-09-24T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Jira ticket EPMCDME-14326 — "Project History Modal" (Story, blocked by EPMCDME-14325 which is now done).

## Story
As a project admin, I want to open a history of everything that has happened to my project —
membership, roles, settings and budgets — from the project screens, so that I can understand how
it reached its current state at the moment the question arises, instead of leaving the screen or
asking a platform administrator.

## Background
Project admins are accountable for their project but have no view of its history. The activity
trail today renders only on a standalone platform-admin Activity Events page, as a global list
across all domains and all projects. A project's story is split across three event domains
(project lifecycle, membership/roles, budget changes) that no screen brings together. The project
details page and the project budgets, budget group and member allocation screens all manage a
project but show no record of past change. Event details currently render as raw JSON, plus raw
key/value chips in the row.

Constraints called out in the ticket:
- The activity store (existing platform-admin page) is a module-level singleton. A modal reusing
  it would overwrite the platform-admin page's state, and two instances could not coexist — the
  modal needs its own isolated state, not the shared singleton store.
- The existing `/v1/admin/activity-events/filter-options` call is maintainer-gated and returns
  platform-wide domains/event types — cannot serve a project admin. Use the new project-scoped
  metadata endpoint instead (see backend contract below).
- The UI has no i18n framework; user-facing strings are hardcoded English throughout.
- Modal-based detail/editing patterns already exist across these admin screens — follow that
  interaction model.
- The project details page is reachable by project admins; it also renders personal projects,
  which have no members/no budgets — personal projects must show NO history entry point.
- A pre-existing defect: 19 UI files branch on an `isAuditor` flag the backend never sends (always
  false) — out of scope, do not touch.

## Approach (from ticket)
- Event taxonomy comes from the backend project-scoped metadata endpoint (see contract below).
- The backend owns event naming, category, and query concerns (filtering, sorting, grouping,
  aggregation, pagination). The UI owns rendering returned values (amounts, timestamps, user
  references) and layout.
- Event label and per-event-type attribute presentation should be extracted into a shared module
  reusable by both this new modal and the existing platform-admin Activity Events page (which
  should also switch its raw-JSON detail rendering to the same shared presentation).
- One entry point: the project details page opens the full project history; the Budget category
  filter narrows it from there (no separate entry point per screen).

## Backend contract (confirmed just-shipped in the sibling ../codemie repo, EPMCDME-14325, same
repo `authenticate` + `project_admin_or_admin_or_maintainer_access` dependency as the project
activity list):

`GET /v1/projects/{project_name}/activity-events/metadata`
  -> `ActivityEventProjectMetadata { event_types: [{event_type, label, category}], recording_enabled: bool }`
  (event types actually present for that project, each with its taxonomy label/category; also
  doubles as the ACTIVITY_EVENTS_ENABLED signal via `recording_enabled`)

`GET /v1/projects/{project_name}/activity-events?domain=&event_type=&category=&actor_id=&from=&to=&sort_dir=&limit=&offset=`
  -> `ProjectActivityEventsResponse { data: ActivityEventListItem[], pagination: PaginationData, recording_enabled: bool }`
  where `ActivityEventListItem { id, domain, event_type, label, category, entity_type?, entity_id?,
  entity_label?, project_name?, actor_id?, actor_email?, actor_name?, attributes?: Record<string,any>,
  created_at }`. All filtering/sorting/pagination is server-side. `category` is one of Budget /
  Members / Settings (ticket's three filter categories) and already covers cross-domain grouping
  (e.g. budget events + the enforcement-toggle event both land in Budget).
  Access is project-admin-or-admin-or-maintainer; gated by the same `ACTIVITY_EVENTS_ENABLED`
  short-circuit (surfaced here as `recording_enabled: false`).

Both endpoints already exist and are merged on the backend feature branch
`EPMCDME-14325_project-scoped-activity-trail` in the sibling repo at `../codemie` (relative to this
repo's parent directory) — read-only reference only, do not modify that repo. This ticket
(EPMCDME-14326) is frontend-only, in this repo (codemie-ui).

## Acceptance criteria (abbreviated — full list already reviewed)
- Modal opens from the project details page, shows all-domain events for that project,
  timestamp/actor/action/target, newest first.
- Category filter (Budget/Members/Settings) and date-range filter, both server-side; active
  filters stay visible.
- All filter/sort/page/count values come from the API, never client-side derived.
- Entry point present on project details page, opens history unfiltered by default.
- Budget category shows budget events AND the enforcement-toggle event together.
- Pagination preserves filters and shows total matching count.
- Row expansion renders change detail readably (named entities, formatted amounts/timestamps),
  never raw JSON.
- Unknown event types degrade to a readable fallback, never blank/crash/raw-id-dump.
- Modal's own state must not disturb, and must not be disturbed by, the platform-admin Activity
  Events page (no shared singleton store).
- Platform admins/maintainers opening the modal for any project see the same UI a project admin
  would see.
- Personal projects show no history entry point at all.
- Deleted-actor events show the identity snapshot recorded on the event (actor_email/actor_name),
  not a lookup.
- Empty state (no activity) is distinct from the disabled state (`recording_enabled: false`).
- Error/timeout state has a retry action; underlying screen stays usable.
- Closing the modal leaves the underlying screen exactly as the admin left it.

---

## 2. Codebase Findings

### Existing Implementations

Platform-admin Activity Events page (the page whose semantics this task must factor out and reuse):

- `src/pages/settings/administration/ActivityEventsPage.tsx` — the current standalone page. Renders
  a `Table` of events with columns `created_at`, `domain`, `event_type`, `entity`, `actor`,
  `attributes`; filters are Domain/Event type/Entity type `MultiSelect`s, Actor ID/Entity ID
  `Input`s, From/To `DatePicker`s, and a Sort `Select`. Row detail is opened via `AttributesCell` →
  `setSelectedEvent` → a `Popup` (`selectedEvent && <Popup .../>`) whose body is a stack of
  `DetailRow`s ending in a raw `JSON.stringify(selectedEvent.attributes, null, 2)` inside a `<pre>`
  — this is the "raw JSON detail rendering" the ticket says must move to the shared presentation
  module. The in-row "Details" cell (`AttributesCell`) also renders raw key/value chips
  (`Object.entries(item.attributes!).map(...)`) — this is the "raw key/value chips in the row" the
  ticket references.
- `src/store/activityEvents.ts` — `activityEventsStore = proxy<ActivityEventsStore>({...})`, a
  **module-level Valtio singleton** (`events`, `pagination`, `loading`, `filterOptions`,
  `filterOptionsLoading`, `listEvents()`, `loadFilterOptions()`). `listEvents` calls
  `api.get('v1/admin/activity-events', { params, skipErrorHandling: true })`; `loadFilterOptions`
  calls `api.get('v1/admin/activity-events/filter-options', { skipErrorHandling: true })` and
  memoizes once (`if (this.filterOptions) return`). This is the singleton the ticket says a modal
  must not reuse as-is — its shape (single mutable `events`/`pagination`/`loading`) is the pattern
  to replicate in an isolated instance, not the object to import directly.
- `src/types/entity/activityEvent.ts` — current UI-side shape: `ActivityEvent` (no `label`, no
  `category`, no `entity_label` — those are new fields the backend just added in EPMCDME-14325 and
  are not yet reflected on the frontend), `ActivityEventFilterOptions` (`domains`, `event_types`,
  `entity_types`, `mapping` keyed by domain — this is the shape of the maintainer-gated
  `filter-options` endpoint, not the new project-scoped `metadata` endpoint), `ActivityEventListParams`.
- `src/pages/settings/administration/components/activityEventsFilters.ts` — pure functions
  `computeFilteredOptions` (derives event-type/entity-type option lists from selected domains using
  `filterOptions.mapping`) and `revalidateSelections` (drops selections that became invalid after a
  domain change). These only make sense against the old `filter-options` domain→event/entity
  mapping shape; the new project metadata endpoint returns a flat `event_types` list with
  `category`, so this exact logic does not map onto category filtering as-is.

Project details / budget / member screens (the entry-point host and sibling modal patterns):

- `src/pages/settings/administration/ProjectDetailsPage.tsx` — routed at
  `/settings/administration/projects/:projectName` (`PROJECTS_MANAGEMENT_DETAIL` route id). Loads
  the project via `projectsStore.getProject(projectName, true)` into local `project` state (not a
  store the modal would need to share). Computes `isPersonalProject = project?.project_type ===
  ProjectType.PERSONAL` and uses it to gate: `canManageProject`, `canViewBudgets`, and to hide the
  entire `ProjectMembersManager` section (`{!isPersonalProject && (<section>...)}`). Renders
  `ProjectBudgetsSection` and `ProjectMembersManager` as sibling sections, and opens
  `ProjectModal` (edit) via local `isEditPopupVisible` state + a `<Button onClick={() =>
  setIsEditPopupVisible(true)}>Edit Project</Button>` in `rightContent` — this is the placement and
  interaction pattern ("Edit Project" button next to the title) an "Activity" / "History" entry
  point would follow.
- `src/pages/settings/administration/projectsManagement/ProjectBudgetsSection.tsx` — renders
  budgets for a project; owns `UnifiedProjectBudgetModal`, `ConfirmationModal`,
  `DropdownButton`. This is the section whose "Budget" category the ticket says must be reachable
  by narrowing the same modal, not a second entry point — there is currently no history/activity
  affordance here at all.
- `src/pages/settings/administration/projectsManagement/components/MemberAllocationOverrideModal.tsx`
  — a concrete example of the "modal-based detail/editing" pattern already used across these
  screens: `visible`/`onHide` boolean-driven `Popup`, `react-hook-form` + `yupResolver` for the
  form, `footerContent` prop for actions, `limitWidth`/`withBorderBottom={false}` styling.
- `src/pages/settings/administration/projectsManagement/ProjectMembersManager.tsx` — the isPersonal
  detection pattern is repeated here (`isPersonal = project.project_type === ProjectType.PERSONAL`)
  and used to disable role/unassign actions with a `personalProjectTooltip` helper — a second,
  independent site (besides `ProjectDetailsPage`) confirming personal-project detection is
  `project.project_type === ProjectType.PERSONAL`, not a separate "has members" check.
- `src/pages/settings/administration/projectsManagement/ProjectsManagementFull.tsx` — third site
  using `item.project_type === ProjectType.PERSONAL` (`isPersonal`), for the projects list.

Shared UI primitives relevant to rendering:

- `src/components/Popup/Popup.tsx` — the modal primitive used everywhere (wraps PrimeReact
  `Dialog`; props: `visible`, `onHide`, `header`/`headerContent`, `footerContent`, `hideFooter`,
  `className`, `bodyClassName`, `limitWidth`, `isFullWidth`, `dismissableMask`, `hideClose`). No
  i18n hook — headers/labels are plain string props throughout the codebase, consistent with the
  ticket's "no i18n framework" note.
- `src/components/Table/Table.tsx` — supports native row expansion: `expandedRowIds?:
  ReadonlyArray<string>`, `renderExpandedRow?: (item: T) => React.ReactNode`, a synthetic
  `{ key: 'expand', type: DefinitionTypes.Expand }` column, and `isExpandable = !!onToggleExpand &&
  !!renderExpandedRow`. `src/pages/settings/administration/UsersManagementPage.tsx` is a live
  consumer (`expandedRowIds={canManageBudgets ? expandedRowIds : undefined}`), and
  `src/components/Table/__tests__/TableExpansion.test.tsx` covers the mechanism directly. This is
  the "row expansion" primitive already in the table component the ticket's acceptance criteria
  describe — the current `ActivityEventsPage` does not use it (it opens a `Popup` instead), so
  there are two established, working patterns to choose between (expand-in-row vs. popup-on-click),
  not a gap to invent.
- `src/utils/currency.ts` (`formatCurrency`) and `src/utils/helpers.ts` (`formatDate`,
  `formatDateTime`) — the existing amount/timestamp formatters used across
  `ProjectDetailsPage`/`ActivityEventsPage`; these are the formatting utilities category-specific
  attribute rendering (budget amounts, timestamps) would call into.

### Architecture and Layers Affected

- **Routing**: `src/router.tsx` — no route change is implied by a modal (it is opened from
  `ProjectDetailsPage`, not a new URL), but the existing `activity-events` route entry
  (`id: 'activity-events'`, `path: '/settings/administration/activity-events'`, `Component:
  ActivityEventsPage`) is the sibling the shared presentation module must also serve.
- **Store layer**: `src/store/activityEvents.ts` is the only existing store for this domain; it is
  a platform-admin-scoped singleton hitting `v1/admin/activity-events*`. No project-scoped store or
  API client exists yet on the frontend for `v1/projects/{project_name}/activity-events*`.
- **Types layer**: `src/types/entity/activityEvent.ts` models the old, maintainer-only response
  shape only; it has no `label`, `category`, or `entity_label` fields, and no metadata-endpoint
  type at all.
- **Page/component layer**: `ProjectDetailsPage.tsx` (entry point host), `ActivityEventsPage.tsx`
  (existing consumer of the domain to keep working / to migrate onto shared presentation),
  `MemberAllocationOverrideModal.tsx` / `ProjectBudgetsSection.tsx` (sibling modal-in-admin-screen
  patterns).
- **Feature flags**: `src/constants/featureFlags.ts` (`FEATURE_FLAGS` map) has no
  `ACTIVITY_EVENTS_ENABLED` (or similar) entry — the ticket's `recording_enabled` signal comes
  entirely from the new API responses, not from a client-side feature flag.

### Integration Points

- `src/utils/api.ts` is the single HTTP layer (`api.get(...)` with `{ params, skipErrorHandling }`)
  used by every existing store, including `activityEventsStore` — any new project-scoped store
  would call the same layer against
  `v1/projects/{project_name}/activity-events` and
  `v1/projects/{project_name}/activity-events/metadata`.
- `projectsStore.getProject(projectName, true)` (used by `ProjectDetailsPage`) is the existing way
  a project's `project_type` reaches the page; no new fetch is needed to know whether a project is
  personal.
- `userStore` (`currentUser.isAdmin`, `.isMaintainer`, `.applicationsAdmin` list for
  `isProjectAdmin`) is the existing role-derivation pattern `ProjectDetailsPage` already uses
  (`canManageProject`, `canViewBudgets`) — the same pattern would gate whether the history entry
  point renders for a given viewer, though the backend endpoints are already
  project-admin-or-admin-or-maintainer gated server-side.

### Patterns and Conventions

- Valtio `proxy()` module singletons for shared/global state (`activityEventsStore`, `userStore`,
  `projectsStore`); local `useState` for page-and-below UI state (`ProjectDetailsPage`'s `project`,
  `isEditPopupVisible`, `budgets` are all local, not store-backed).
- `Popup` + boolean `visible` prop + `onHide` callback is the universal modal-open pattern; forms
  inside popups use `react-hook-form` + `yupResolver(Yup.object({...}))`.
- Column-definition-driven `Table` with `customRenderColumns` map (`{ [key]: (item) => ReactNode }`)
  for anything not a plain string/number cell.
- No i18n: every label above (`'When'`, `'Domain'`, `'Actor ID'`, `'Access denied. This page is for
  maintainers only.'`, etc.) is a literal string in the component/JSX, confirming the ticket's
  "hardcoded English throughout" note holds in the exact files this task touches.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/patterns/state-management.md` and `.ai-run/guides/patterns/modal-patterns.md`
  are the guides routed for "shared state" and "modals" respectively per `AGENTS.md`'s task-routing
  table; not read in depth here since this document reports findings, not the plan, but they are
  the P0/P1 sources a downstream plan should consult for the store-isolation and modal-authoring
  conventions this ticket depends on.
- `.ai-run/guides/development/api-integration.md` covers the `api.ts` call conventions a new
  project-scoped activity store would follow.

### Architectural Decisions

- No ADR files or inline `ADR:`/`DECISION:` markers were found in the activity-events or
  project-details files touched above.
- The ticket text itself records the operative decisions for this task: backend owns
  filter/sort/aggregation semantics, UI owns value rendering only; one entry point (project
  details) with Budget-category narrowing rather than a second entry point per screen; shared
  presentation module reused by both the modal and the existing platform-admin page.

### Derived Conventions

- Module-level Valtio `proxy()` per domain, with page components holding filter/pagination UI
  state locally and calling store methods (see `ActivityEventsPage`'s `useState` filters + `useEffect`
  triggering `activityEventsStore.listEvents(...)`). An isolated store for the modal would need
  either a per-instance factory function (not a static singleton export) or state colocated in the
  modal component itself, since no existing store in this codebase demonstrates a
  non-singleton/instantiable Valtio store.
- Detail rendering today is ad hoc per screen (`DetailRow` list + `<pre>` JSON dump on the admin
  page); there is no existing "shared presentation" module for event attributes anywhere in
  `src/` — this is new code, not an extraction of a pattern already factored out elsewhere.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/settings/administration/__tests__/ActivityEventsPage.test.tsx` — covers only the pure
  helper functions `computeFilteredOptions`/`revalidateSelections` from
  `activityEventsFilters.ts`; it does **not** render `ActivityEventsPage` itself or exercise
  `activityEventsStore`, the `Popup` detail view, or the attributes-chip rendering.
- `src/pages/settings/administration/__tests__/AdminTablesPagination.integration.test.tsx` —
  integration-level pagination test touching admin tables (scope not fully read; named alongside
  the activity-events test directory, so likely exercises `ActivityEventsPage`'s table pagination
  among others).
- `src/components/Table/__tests__/TableExpansion.test.tsx` — covers the generic row-expansion
  mechanism (`expandedRowIds`, `renderExpandedRow`) the modal could reuse.
- `src/pages/settings/administration/projectsManagement/components/__tests__/MemberAllocationOverrideModal.test.tsx`
  and `.../components/__tests__/ProjectBudgetCard.test.tsx` — modal/component test examples in the
  exact directory tree a new project-history modal would live near.
- No test file exists yet for `ProjectDetailsPage.tsx` itself, `store/activityEvents.ts` directly,
  or any project-scoped activity endpoint — all net-new territory.

### Testing Framework and Patterns

- Vitest with React Testing Library, two projects (`unit`, `integration`) per `vitest.workspace.ts`
  (per AGENTS.md/`.ai-run/guides/testing/testing-patterns.md`, not independently re-derived here).
- Existing tests favor extracting pure logic into standalone modules (`activityEventsFilters.ts`)
  and unit-testing that module directly rather than mounting the full page — a pattern a shared
  presentation module (event label/attribute formatting) fits naturally into.

### Coverage Gaps

- No test exercises the current `ActivityEventsPage`'s raw-JSON detail Popup or the attribute-chip
  row rendering that this task must replace — so there is no regression net for the exact code this
  task modifies on the existing page.
- No test exists for `store/activityEvents.ts`'s singleton behavior (the exact defect the ticket
  flags — state stomped by concurrent use) — nothing currently proves or protects the isolation
  property the new modal store must have.
- No test exists for `ProjectDetailsPage`'s personal-project gating (`isPersonalProject`) beyond
  what's implicitly covered by rendering — no dedicated assertion that personal projects hide the
  members/budgets sections, which is the same gate a history entry point must honor.

---

## 5. Configuration and Environment

### Environment Variables

- No feature-flag or env var specific to activity events was found (`grep` for
  `ACTIVITY_EVENTS_ENABLED` / `activity_events_enabled` / `activityEventsEnabled` returned nothing
  in `src/`). The `recording_enabled` boolean is carried entirely in the two new API response
  bodies (`ActivityEventProjectMetadata.recording_enabled`,
  `ProjectActivityEventsResponse.recording_enabled`), not a build-time or run-time config flag.

### Configuration Files

- `src/constants/featureFlags.ts` — the `FEATURE_FLAGS` map (used with `useFeatureFlag`,
  `useBudgetManagementEnabled`, `useProjectChargebackEnabled` hooks in `ProjectDetailsPage`) has no
  entry for this domain and none is implied by the backend contract, which surfaces the enabled/
  disabled signal per-request instead.
- No `.env.example` or `config.js` entries reference activity events.

### Feature Flags and Deployment Concerns

- None found specific to this feature area. `ProjectDetailsPage` already demonstrates the
  general pattern (`useFeatureFlag(FEATURE_FLAGS.COST_CENTERS)`,
  `useBudgetManagementEnabled()`, `useProjectChargebackEnabled()`) that would be reused only if a
  client-side kill switch were desired — nothing in the ticket asks for one, since
  `recording_enabled` already serves that purpose from the API.

---

## 6. Risk Indicators

- **No isolated-store pattern exists in this codebase to copy.** Every current store
  (`activityEventsStore`, `userStore`, `projectsStore`) is a static module-level Valtio `proxy()`
  singleton; the ticket explicitly forbids reusing the existing singleton for the modal, so the
  isolation mechanism (state colocated in the modal component vs. a factory function producing a
  fresh proxy per mount) is a new decision with no in-repo precedent to imitate, only to avoid.
- **Frontend types lag the backend contract.** `src/types/entity/activityEvent.ts` has no `label`,
  `category`, or `entity_label` fields and models the old maintainer-only `filter-options` response
  shape; `activityEventsFilters.ts`'s domain→event/entity `mapping`-based filtering logic does not
  transfer to the new metadata endpoint's flat `event_types: [{event_type, label, category}]`
  shape, so reuse there is partial at best.
- **No shared presentation module exists yet anywhere in `src/` for event attribute rendering** —
  the current `ActivityEventsPage` renders raw JSON/raw chips; extracting a shared, per-event-type
  formatter (amounts, timestamps, named entities, unknown-type fallback) is greenfield code with no
  local pattern to extend, only formatting utilities (`formatCurrency`, `formatDate`) to call into.
- **Zero test coverage on the exact code this task changes.** `ActivityEventsPage.test.tsx` only
  covers the filter-helper functions, not the Popup detail view or attribute-chip rendering being
  replaced; `store/activityEvents.ts` has no direct test; `ProjectDetailsPage`'s personal-project
  gating has no dedicated test. Any regression in the shared page's behavior while extracting
  shared presentation would not be caught by existing tests.
- **Personal-project detection is duplicated, not centralized.** `project.project_type ===
  ProjectType.PERSONAL` appears independently in `ProjectDetailsPage.tsx`,
  `ProjectMembersManager.tsx`, and `ProjectsManagementFull.tsx` — a fourth ad hoc check for the
  history entry point, rather than a shared helper, would extend an existing duplication rather
  than fix it (fixing it is a scope decision for the plan, not asserted here).
- **Two competing row-detail UI patterns already coexist** (`Table`'s native
  `expandedRowIds`/`renderExpandedRow` vs. `ActivityEventsPage`'s click-to-open `Popup`) — the
  ticket's "row expansion renders change detail" wording implies the former, while the only
  existing activity-events code uses the latter; which one the new modal (and the migrated
  platform-admin page) should use is undecided by anything in the code.
- **The isAuditor discrepancy**: the ticket cites 19 files branching on the never-true `isAuditor`
  flag; a repo-wide grep found 18 non-test-adjacent hits for `isAuditor` in `src/` (one of which,
  `ProjectDetailsPage.tsx`, is a file this task touches for `canViewBudgets`). The ticket marks this
  out of scope — noted here only so the count discrepancy isn't mistaken for missed research.

---

## 7. Summary for Complexity Assessment

This task touches four layers: a new project-scoped store/API-client layer (calling the two
already-shipped backend endpoints, replacing nothing but adding new code beside the existing
singleton `store/activityEvents.ts`), a new shared presentation module (event label/category/
attribute formatting, extracted from and replacing the raw-JSON `Popup` body and raw-chip row
rendering in `ActivityEventsPage.tsx`), a new modal component plus entry-point wiring on
`ProjectDetailsPage.tsx` (gated by the existing `project.project_type === ProjectType.PERSONAL`
check, following the `MemberAllocationOverrideModal`/`Popup` modal convention), and a migration of
the existing platform-admin `ActivityEventsPage.tsx` onto that same shared presentation module. The
file-change surface is moderate-to-large: at least one new store, one new types module (to model
the new `ActivityEventListItem`/`ActivityEventProjectMetadata`/`ProjectActivityEventsResponse`
shapes, distinct from the stale `activityEvent.ts`), one new shared presentation module, one new
modal component (plus its filter subcomponents for category/date-range), edits to
`ProjectDetailsPage.tsx` for the entry point, and edits to `ActivityEventsPage.tsx` to consume the
shared module instead of its own raw rendering.

Technical novelty is concentrated in one place: this codebase has no precedent for a non-singleton
("isolated") Valtio store, so the mechanism satisfying "the modal's state must not disturb the
platform-admin page's state" is new engineering, not a lookup. Everything else — modal chrome
(`Popup`), form/filter components (`MultiSelect`, `DatePicker`, `Select`), table with either
expansion or popup-based detail (`Table`'s `expandedRowIds`/`renderExpandedRow`, already used
elsewhere and tested in `TableExpansion.test.tsx`), and role/personal-project gating (already three
times duplicated in this exact area) — has direct, working precedent to copy.

Test coverage posture is a real risk multiplier: the two files this task edits most
(`ActivityEventsPage.tsx`'s Popup/chip rendering and `ProjectDetailsPage.tsx`'s gating logic) have
no existing tests exercising the behavior being changed, so refactoring them onto shared code
carries silent-regression risk that only new tests (not present today) would catch. Combined with
the type-shape drift between the current frontend `ActivityEvent` type and the just-shipped backend
response shape, and the undecided choice between two existing-but-divergent detail-rendering
patterns, this is a moderate-complexity, multi-file frontend feature with one genuinely novel
architectural piece (isolated store) rather than a simple wire-up of an already-built backend.

---

## 8. External References

- **`../codemie` (sibling repo, relative to this repo's parent directory), branch
  `EPMCDME-14325_project-scoped-activity-trail`** — resolved; currently checked out at that branch.
  Read `src/codemie/rest_api/routers/project_activity_events_router.py` and
  `src/codemie/rest_api/models/activity_event.py` directly (read-only, not modified, per the
  task's instruction). Confirmed facts needed downstream:
  - Router prefix `/v1/projects/{project_name}/activity-events`, both endpoints gated by
    `authenticate` + `project_admin_or_admin_or_maintainer_access`.
  - `GET /metadata` returns `ActivityEventProjectMetadata { event_types: list[ActivityEventTypeInfo], recording_enabled: bool }`
    where `ActivityEventTypeInfo { event_type: str, label: str, category: str }` — a flat list, not
    a domain-keyed mapping like the old `filter-options` endpoint.
  - `GET ""` (list) accepts `domain`, `event_type`, `category` (all `list[str] | None`), `actor_id`,
    `from`/`to` (aliased `from_`/`datetime`), `sort_dir` (`"asc"|"desc"`, default `"desc"`),
    `limit` (1–1000, default 50), `offset` (default 0); returns
    `ProjectActivityEventsResponse { data: list[ActivityEventListItem], pagination: PaginationData, recording_enabled: bool }`.
  - `ActivityEventListItem` fields exactly: `id, domain, event_type, label, category, entity_type?,
    entity_id?, entity_label?, project_name?, actor_id?, actor_email?, actor_name?, attributes?:
    dict[str, Any], created_at: datetime` — confirming the ticket's contract summary verbatim and
    giving the exact optional/required split (`label`, `category`, `id`, `domain`, `event_type`,
    `created_at` are required; everything else is optional).
  - `pagination` in the response is built server-side as `PaginationData(page=offset//limit,
    per_page=limit, total=total, pages=ceil(total/limit))` — confirms "all filtering/sorting/
    pagination is server-side" and gives the exact `page`/`per_page`/`total`/`pages` field names a
    frontend type must match (note: these differ in casing/shape from the frontend's existing
    `Pagination` type in `src/types/common.ts`, e.g. `perPage`/`totalPages`/`totalCount` — mapping
    is needed, not a 1:1 reuse).
  - Recent commit history on that branch (`add category filtering`, `add taxonomy fields,
    recording_enabled, and project response envelope`, `add project activity events metadata
    endpoint`, `add conditional member-spend-enforcement event`) corroborates that category-based
    cross-domain grouping (budget events + enforcement-toggle event both under Budget) is already
    implemented server-side, not something the frontend needs to derive.
