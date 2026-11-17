# Technical Research

**Task**: cost-center project-management ResourceCounterBadge navigation-filter
**Generated**: 2026-10-15
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-15632 — Cost Center project-count redirect to Project Management.

Summary: Make the project count on each Cost Centers management list row a clickable badge
that opens Project Management filtered to that cost center.

Description: As a platform admin managing cost centers, I want to click the project count on a
cost center row and land directly on the Project Management screen filtered to that cost
center's projects, so that I can see which projects belong to it without manually applying a
filter. Today, the Cost Centers page displays each cost center's linked-project count as static
text. Clicking a resource count on a project row already opens a pre-filtered list using the
existing `ResourceCounterBadge` pattern. This Story applies that click-through pattern to the
Cost Centers list. It depends on EPMCDME-15631 for the destination Cost Center filter and its
navigation contract — EPMCDME-15631 is "Ready for Review" (not yet merged to main), and its
commits are already present on our current branch (we branched off its unmerged branch).

Preconditions:
- A platform admin can access the Cost Centers management list and Project Management.
- Cost center rows display their existing linked-project counts, including zero.
- The Project Management Cost Center filter and its navigation contract are available through
  EPMCDME-15631 (multi-select, comma-separated display, feature-flag-gated, interacts with
  Search/Budgets/Budget category filters).

Acceptance Criteria:
1. Cost Centers list row's project count renders as a clickable badge reusing
   `ResourceCounterBadge`, not plain text.
2. Clicking the badge opens Project Management with the Cost Center filter pre-applied, no
   manual selection needed.
3. A cost center with zero linked projects: badge shows zero, is clickable, and clicking filters
   to that cost center with no results (not an error).
4. After navigating via the badge, the active Cost Center filter is visibly indicated in Project
   Management, consistent with other pre-applied filters.
5. Clearing/changing the Cost Center filter after badge navigation behaves exactly as when set
   via the filter control directly.

Out of scope: the project-count stat box on CostCenterDetailsPage.tsx; building the Project
Management Cost Center filter itself (that's EPMCDME-15631's job, already landed on this
branch); relocating/promoting ResourceCounterBadge out of the projectsManagement/ feature
folder; changing how the linked-project count is calculated/stored; icon/tooltip copy choices.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/settings/administration/CostCentersManagementPage.tsx` — the list to change.
  `project_count` is column key `'project_count'`, `type: DefinitionTypes.String`, label
  "Projects", no entry in `customRenderColumns` (lines 49-54, 148-198) — so it currently renders
  as plain text via the generic `Table` cell renderer. This is the plain-text spot to replace.
- `src/pages/settings/administration/projectsManagement/ResourceCounterBadge.tsx` — the shared
  badge component: `<Link to={to}>` with an icon, `count ?? 0`, a `data-tooltip-id`/`aria-label`
  tooltip. Props: `{ icon: ComponentType<SVGProps<SVGSVGElement>>, count: number | undefined,
  tooltip: string, to: string }`. It lives under `projectsManagement/` (out of scope to relocate
  per the ticket, so `CostCentersManagementPage.tsx` must import it cross-folder from
  `administration/projectsManagement/ResourceCounterBadge`).
- `src/pages/settings/administration/projectsManagement/ProjectResourceCounters.tsx` — the only
  current consumer, used on the Projects Management list's "Assignments" cell. It builds the `to`
  path with `useVueRouter().resolve({ name: routeName, query: { project: project.name } })`,
  returning `${path}?${searchParamsString}`, and renders five badges (assistants, workflows,
  integrations, data sources, skills), one `ResourceCounterBadge` per resource type.
- `src/pages/settings/administration/projectsManagement/ProjectsManagementFull.tsx` — the Project
  Management destination page. Reads cost-center filter state from
  `useProjectsFilters()` (`costCenterIds`, `setCostCenterIds`). Gates the filter and the
  dedicated "Cost center" table column behind `isCostCentersEnabled` (feature flag) AND
  `currentUser?.isAdmin || currentUser?.isMaintainer` (`canFilterByCostCenter`, lines 220-226).
  Renders `<CostCenterFilter value={costCenterIds} onChange={setCostCenterIds} />` only when
  `canFilterByCostCenter` is true (line 704-708) — this is the "visibly active filter" surface
  (AC4): the multi-select shows the currently selected cost center(s) as chips/labels.
- `src/pages/settings/administration/projectsManagement/hooks/useProjectsFilters.ts` — EPMCDME-
  15631's filter-state hook. `PROJECT_FILTER_KEYS.multiple = ['cost_center_ids']`. On mount, calls
  `getFilters(FILTER_ENTITY.PROJECTS, PROJECT_FILTER_KEYS)`, which (via
  `src/utils/filters.ts`) reads `cost_center_ids` from the URL query string first
  (`searchParams.getAll('cost_center_ids')`, URL takes priority over localStorage), filtering
  values through `isUuid`. Every `costCenterIds` change is written back to both the URL and
  per-user localStorage (`setFilters`). **This is the navigation contract**: landing on
  `/settings/administration/projects?cost_center_ids=<uuid>` pre-applies that cost center as a
  selected chip in the existing `CostCenterFilter`, satisfying AC2 and AC4 with no new wiring on
  the destination page.
- `src/pages/settings/administration/projectsManagement/components/CostCenterFilter.tsx` —
  the EPMCDME-15631 multi-select filter control (`FilterMultiSelect`), takes `value: string[]` /
  `onChange: (ids: string[]) => void`; resolves unknown IDs' labels via
  `costCentersStore.getCostCenter(id)` so a cost center selected only by ID (as this badge would
  pass) still displays its name once resolved.
- `src/store/costCenters.ts` and `src/types/entity/costCenter.ts` — `CostCenterListItem` has
  `project_count: number` (not optional, no `| undefined`), `id: string` (UUID, matches the
  `isUuid` guard in `useProjectsFilters`).
- `src/router.tsx` — route ids: `'cost-centers-management'` /
  `'cost-centers-management-detail'` (both `FeatureGuard featureFlags={FEATURE_FLAGS.COST_CENTERS}`)
  and `'projects-management'` at `/settings/administration/projects` (no route guard beyond the
  page's own internal flag checks). `FEATURE_FLAGS.COST_CENTERS = 'features:costCenters'`
  (`src/constants/featureFlags.ts:35`) — the same flag string used as
  `FEATURE_FLAG_COST_CENTERS` inside `ProjectsManagementFull.tsx`.
- `src/hooks/useVueRouter.tsx` — `useVueRouter().resolve({ name, query, params })` returns
  `{ path, searchParamsString, ... }`; `router.push({ name, query })` is the project's thin
  wrapper over React Router's `navigate`.

### Precedent for "open another page pre-filtered" (closest existing pattern besides the badge)

- Commit `a77e46fed` (EPMCDME-15695, "Open Members with category and override filters from View
  details") in `ProjectBudgetsSection.tsx` → `ProjectMembersManager.tsx`/
  `ProjectMembersFilters.tsx`: a "View details" link does
  `router.push({ name: PROJECTS_MANAGEMENT_MEMBERS, params, query: { overrides: data.category } })`,
  and the destination reads the initial filter **directly from `router.query.overrides` once at
  mount** (`getInitialFilters(router.query.overrides)`), bypassing the localStorage-backed
  filters utility entirely. This is a *different* mechanism from the cost-center filter's
  URL+localStorage approach in `useProjectsFilters`/`utils/filters.ts` — the two destination
  filters on Project Management (`costCenterIds` via `getFilters`, future ones via raw
  `router.query`) are not uniform across the codebase; the Cost Center filter already has its own
  URL-param contract from EPMCDME-15631, so the badge should target that contract
  (`cost_center_ids` query param) rather than reinvent one.

### Architecture and Layers Affected

- **Page/list layer**: `CostCentersManagementPage.tsx` (`customRenderColumns.project_count`,
  column `type` would need to change from `String` to `Custom`).
- **Shared component layer**: `ResourceCounterBadge.tsx` (reused, not modified, per ticket scope)
  — importing it across the `administration/` → `administration/projectsManagement/` folder
  boundary (new cross-folder import; `ProjectResourceCounters.tsx` already imports it
  intra-folder, but `CostCentersManagementPage.tsx` is a sibling folder, not a child of
  `projectsManagement/`).
- **Routing layer**: `useVueRouter().resolve`/`push`, building a `to`/href that encodes
  `cost_center_ids=<id>` for route `'projects-management'`.
- **Destination filter state layer**: `useProjectsFilters.ts` + `utils/filters.ts` (consumed
  as-is, not modified).

### Integration Points

- Internal: `CostCentersManagementPage` → `ResourceCounterBadge` (new import) → React Router
  `Link` → `'projects-management'` route → `ProjectsManagementFull` → `useProjectsFilters` →
  `utils/filters.ts` (`getFilters`/`setFilters`) → `CostCenterFilter`.
- No new external/HTTP integration — `project_count` is already returned by the existing cost
  centers list endpoint (`costCentersStore.getCostCenters`).

### Patterns and Conventions

- Table custom cells: `columnDefinitions` entries with `type: DefinitionTypes.Custom` paired with
  a function in `customRenderColumns` keyed by the column's `key` (seen in both
  `CostCentersManagementPage.tsx`'s `name`/`description`/`actions` and
  `ProjectsManagementFull.tsx`'s `cost_center_name`/`budgets`/`assignments`/`users`/`actions`).
  `project_count` must move from `String` to `Custom` to render a component instead of raw text.
  `headClassNames` width class is independent of this and does not need to change.
  Memoize the new cell function in the existing `useMemo` for `customRenderColumns` (both pages
  already do this), adding the row's handler/callback to that `useMemo`'s dependency array.
- Badge `to` construction: build via `router.resolve({ name: 'projects-management', query: {...} })`
  then concatenate `path` + `searchParamsString`, exactly as `ProjectResourceCounters.buildTo`
  does — not a hand-built string.

---

## 3. Documentation Findings

### Guides and Architecture Docs

No guide under `.ai-run/guides/` mentions `ResourceCounterBadge`, cost centers, or this
click-through pattern by name (checked `architecture/`, `components/`, `patterns/`,
`development/`). The applicable guides per `AGENTS.md` task routing are
`.ai-run/guides/components/component-patterns.md` (component construction/placement) and
`.ai-run/guides/architecture/routing-patterns.md` (route definition/navigation) — read these
before implementing, per `AGENTS.md`'s "Check Guides First" rule; this analysis does not
reproduce their contents.

### Architectural Decisions

None found as ADRs. The only recorded rationale found in-code is the `EPMCDME-14866` comment in
`ProjectsManagementFull.tsx` (integrations no longer block project deletion) — unrelated to this
task, included here only because it sits in a file this task touches.

### Derived Conventions

- Resource badges are grouped per-row inside a `flex flex-wrap gap-2` container
  (`ProjectResourceCounters.tsx`) when there is more than one; the Cost Centers list only ever
  shows one count, so the new cell can render a single `ResourceCounterBadge` without a wrapper
  group, matching the badge's own built-in sizing (`w-[68px]`).
- Filter contracts for Project Management are each owned by their own hook/column (`search`,
  `budget_assignment`, `budget_category`, `cost_center_ids` all live in one
  `useProjectsFilters`), and all read URL-first via `utils/filters.ts`— this is the dominant
  convention for *this specific destination page*, distinct from the one-off `router.query.*`
  read used for the Members "View details" link (EPMCDME-15695) on a different destination page.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/settings/administration/projectsManagement/__tests__/ResourceCounterBadge.test.tsx`
  — covers the badge in isolation (renders as a link with given `to`, shows count, shows `0` for
  `undefined`, `aria-label` from tooltip). Confirms the badge supports `count: undefined` as well
  as `0`.
- `src/pages/settings/administration/projectsManagement/__tests__/ProjectsManagementFull.costCenters.test.tsx`
  — exercises `CostCenterFilter` directly (mocking `@/utils/api`), including multi-select
  accumulation and search-miss messaging; does not test the Project Management page reading
  `cost_center_ids` from the URL on initial mount.
- `src/pages/settings/administration/projectsManagement/hooks/__tests__/useProjectsFilters.test.ts`
  — exists; not opened in full, but by name is the place that would already assert URL→state
  precedence for `cost_center_ids` on mount.
- **No test file exists for `CostCentersManagementPage.tsx`** — confirmed by directory listing of
  `src/pages/settings/administration/__tests__/`.

### Testing Framework and Patterns

Vitest + React Testing Library (`@testing-library/react`, `@testing-library/user-event`),
`MemoryRouter` from `react-router` for routing-dependent components, `vi.mock('@/utils/api', ...)`
for HTTP-layer mocking. Tests mock at the store/API boundary rather than the component layer.

### Coverage Gaps

- No existing test asserts `CostCentersManagementPage`'s table rendering, pagination, or any of
  its `customRenderColumns` cells (name/description/actions) — the file this task edits is
  currently untested end-to-end.
- No existing test exercises the full round trip "click a `ResourceCounterBadge`-style link →
  land on `ProjectsManagementFull` → see the filter pre-applied" (the two existing badge/filter
  test files each cover one side in isolation).

---

## 5. Configuration and Environment

### Environment Variables

None specific to this feature found; no `import.meta.env`/`window._env_` reads in any file
touched above.

### Configuration Files

None beyond the standard route table (`src/router.tsx`) and feature-flag constant file
(`src/constants/featureFlags.ts`).

### Feature Flags and Deployment Concerns

- `FEATURE_FLAGS.COST_CENTERS` (`'features:costCenters'`) gates both the Cost Centers routes and
  the Project Management cost-center column/filter — already satisfied for any user who can see
  the Cost Centers list, since that list sits behind the same flag.
- `canFilterByCostCenter` in `ProjectsManagementFull.tsx` additionally requires
  `currentUser.isAdmin || currentUser.isMaintainer`. The Cost Centers management page itself
  carries no equivalent role check visible in `CostCentersManagementPage.tsx` or its route
  definition (`FeatureGuard` only checks the feature flag, not role) — worth confirming during
  spec/plan whether a non-admin/non-maintainer user who can reach Cost Centers management could
  click the badge and land on Project Management with the filter silently dropped (because
  `canFilterByCostCenter` would be `false` for them), which would fail AC2/AC4 for that user.

---

## 6. Risk Indicators

- Speculative: `canFilterByCostCenter`'s role gate (admin/maintainer) in `ProjectsManagementFull`
  is not mirrored by any visible role gate on `CostCentersManagementPage`/its route — if a
  non-admin, non-maintainer user can reach the Cost Centers list, clicking the badge would land
  them on Project Management with the Cost Center filter UI hidden and the `cost_center_ids`
  query param silently ignored by `effectiveCostCenterIds` (`canFilterByCostCenter ? costCenterIds
  : []`), violating AC2/AC4 for that user. Confirm actual access control on the Cost Centers page
  before assuming this is a non-issue.
- `ResourceCounterBadge.tsx` lives under `.../administration/projectsManagement/`, a sibling
  folder to `.../administration/` where `CostCentersManagementPage.tsx` lives. The ticket
  explicitly rules out relocating/promoting the component, so the new import is a cross-feature-
  folder import; `.ai-run/guides/components/component-patterns.md` (not read in full here) may
  have an opinion on this that should be checked before implementing.
- No existing test touches `CostCentersManagementPage.tsx` at all — any new coverage for the badge
  cell starts from zero scaffolding (no existing render helpers/mocks for this page to extend).
- The destination's "visibly active filter" (AC4) depends entirely on `CostCenterFilter`'s own
  label-resolution effect (`resolveLabel` via `costCentersStore.getCostCenter`) succeeding for an
  ID arriving only via URL and not yet in `options`; `CostCenterFilter.tsx` already handles this
  (unresolved IDs show `UNAVAILABLE_LABEL`, and 404s are pruned from the selection) — this is an
  existing capability the badge will exercise, not a gap, but it means a badge click on a cost
  center that is deleted between page views would silently clear itself (consistent with AC5's
  "behaves exactly as the filter control" requirement, but worth confirming in spec review for
  the zero-projects case specifically, AC3).
- No single existing precedent in this codebase is "the" cross-page filtered-navigation pattern:
  `ResourceCounterBadge` badges build `to` via `router.resolve` + concatenated search string, while
  the EPMCDME-15695 Members link uses `router.push({ query })` and the destination reads
  `router.query.*` directly once at mount — two different mechanisms exist in the same codebase.
  This task's destination (`ProjectsManagementFull`'s `cost_center_ids`) already commits to the
  `utils/filters.ts` URL+localStorage mechanism via EPMCDME-15631, so the badge's `to` only needs
  to produce a URL with `cost_center_ids=<id>`; no mechanism decision is open, but a reviewer
  unfamiliar with EPMCDME-15631 could mistakenly reach for the other pattern.

---

## 7. Summary for Complexity Assessment

This task touches two existing pages in the same feature family: `CostCentersManagementPage.tsx`
(the list/presentation layer being changed — one column's cell render switches from
`DefinitionTypes.String` to `DefinitionTypes.Custom`, rendering an existing, unmodified
`ResourceCounterBadge`) and `ProjectsManagementFull.tsx`/`useProjectsFilters.ts`/
`CostCenterFilter.tsx` (the destination, already built by EPMCDME-15631 and present on this
branch, consumed read-only). No new component, store, API call, or filter mechanism is required:
the Cost Center filter already reads its selection from a URL query param
(`cost_center_ids`, multi-value) with URL priority over localStorage, and already renders the
selection as a visible, resolvable multi-select chip — so AC2 and AC4 are satisfied by building
the badge's `to` prop with `router.resolve({ name: 'projects-management', query: {
cost_center_ids: costCenter.id } })`, following the exact `buildTo` pattern already used by
`ProjectResourceCounters.tsx` for the five existing resource badges on the Projects list.

Technical novelty is low: this is an application of an established pattern (`ResourceCounterBadge`
+ `router.resolve`) to a new column, not new architecture. The main design question left open for
spec/plan is the cross-folder import of `ResourceCounterBadge` from `administration/` into a
sibling `administration/projectsManagement/` component, which the ticket forbids resolving by
relocating the component. Risk concentrates in two places: a possible access-control mismatch
between who can reach Cost Centers management and who `ProjectsManagementFull` will actually
apply the filter for (role-gated there, not visibly gated here), and the complete absence of
existing tests for `CostCentersManagementPage.tsx`, meaning any new test for this change adds its
first render-level coverage for that page rather than extending an established harness. No
database schema, migration, backend endpoint, or feature-flag change is implicated — `project_count`
is already returned by the existing cost-centers list response and `features:costCenters` already
gates both ends.

---

## 8. External References

None named by the task beyond EPMCDME-15631's commits, which the task states are "already present
on our current branch" rather than pointing at an external path/URL to read. Verified: all six
EPMCDME-15631 commits (`8646cd55b` through `0c8640984`) are present in `git log` on the current
branch (`EPMCDME-15632_department-assignment`), and their resulting code
(`CostCenterFilter.tsx`, `useProjectsFilters.ts`, the `cost_center_ids` URL contract) is read and
reported in Section 2 above directly from the working tree — no separate external source needed
to be resolved.
