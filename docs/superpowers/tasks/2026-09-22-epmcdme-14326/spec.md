# Spec: Project History Modal (EPMCDME-14326)

## Problem

Project admins can't see how their project reached its current state — membership, role, budget
and settings changes — without leaving the project screen or asking a platform administrator. The
only existing activity trail is the platform-admin-only, cross-project `ActivityEventsPage`
(`src/pages/settings/administration/ActivityEventsPage.tsx`), which a project admin cannot reach
and which renders detail as raw JSON.

## Approach

Add a project-scoped history modal, opened from `ProjectDetailsPage.tsx`
(`src/pages/settings/administration/ProjectDetailsPage.tsx:141-151`), backed by the two
already-shipped endpoints `GET /v1/projects/{project_name}/activity-events/metadata` and
`GET /v1/projects/{project_name}/activity-events`. All filtering, sorting, pagination and
category grouping (including budget + enforcement-toggle events sharing the Budget category) are
server-side; the frontend only renders returned values.

**New pieces:**
- A project-scoped API client + types module modeling `ActivityEventListItem`,
  `ActivityEventProjectMetadata`, and the response `pagination` shape (`page`/`per_page`/`total`/
  `pages`), distinct from the stale `src/types/entity/activityEvent.ts`
  (no `label`/`category`/`entity_label` today) and from `src/types/common.ts`'s differently-cased
  `Pagination` type.
- An isolated (non-singleton) piece of state for the modal — not `activityEventsStore`
  (`src/store/activityEvents.ts:1-30`, a module-level Valtio `proxy()`), so the modal and the
  platform-admin page never share or stomp each other's `events`/`pagination`/`loading`/filters.
  Mechanism (factory-produced proxy vs. component-local state) is left to the implementation plan.
- A shared event-presentation module: given an `ActivityEventListItem`, produces a human label,
  category, and a readable rendering of `attributes` (named entities, formatted currency via
  `src/utils/currency.ts`, formatted timestamps via `src/utils/helpers.ts`), with an explicit
  fallback for event types it doesn't recognize (never blank, never a raw dump). Used by both the
  new modal and the migrated `ActivityEventsPage`.
- The modal itself: category filter (Budget/Members/Settings) + date-range filter, both wired to
  the API's `category`/`from`/`to` params; a `Table` (`src/components/Table/Table.tsx`) using its
  native `expandedRowIds`/`renderExpandedRow` mechanism (already proven in
  `src/components/Table/__tests__/TableExpansion.test.tsx`) for change detail — no Popup, no raw
  JSON; server-driven pagination with total count; distinct empty state (`recording_enabled: true`,
  zero rows) vs. disabled state (`recording_enabled: false`); an error state with a retry action
  that leaves the underlying `ProjectDetailsPage` usable.
- Entry point: one button on `ProjectDetailsPage.tsx`, next to the title, alongside the existing
  "Edit Project" button pattern (`ProjectDetailsPage.tsx:148-151`), opening the modal unfiltered.
  Hidden entirely when `project.project_type === ProjectType.PERSONAL` — the same check already
  used independently in `ProjectDetailsPage.tsx`, `ProjectMembersManager.tsx`, and
  `ProjectsManagementFull.tsx`; this task adds a fourth site consistent with that existing
  convention rather than centralizing it.
- Deleted-actor events render `actor_email`/`actor_name` exactly as recorded on the event, with no
  live user lookup.
- `ActivityEventsPage.tsx` migration: its `Popup`-based JSON detail view and its raw attribute
  chips (`AttributesCell`) are replaced by the shared presentation module and row expansion. Its
  data source (`activityEventsStore`, `v1/admin/activity-events*`) is unchanged.

## Acceptance criteria

- Modal opens from `ProjectDetailsPage`, lists all-domain events for that project, newest first,
  with timestamp/actor/action/target visible per row.
- Category (Budget/Members/Settings) and date-range filters are server-side and stay visibly active
  while applied.
- No filter/sort/page/count value is computed client-side; all come from the API response.
- Budget category surfaces budget events and the enforcement-toggle event together.
- Pagination preserves active filters and displays the total matching count from the API.
- Row expansion shows readable change detail (named entities, formatted amounts/timestamps) —
  never raw JSON.
- An unrecognized `event_type` renders a readable fallback, never blank, never a crash, never a raw
  id dump.
- The modal's state is isolated from `activityEventsStore`; opening one does not affect the other,
  concurrently or sequentially.
- Any admin/maintainer/project-admin authorized by the backend sees the identical modal UI.
- Personal projects show no history entry point.
- Deleted-actor events show the event's own identity snapshot fields, not a live lookup.
- Empty state (no matching events) is visually distinct from the disabled state
  (`recording_enabled: false`).
- A failed/timed-out request shows a retry action; `ProjectDetailsPage` remains interactive
  underneath.
- Closing the modal leaves `ProjectDetailsPage` exactly as it was.
- `ActivityEventsPage` renders the same shared presentation for detail instead of raw JSON/chips,
  with no change to its data source or existing filters.

## Non-goals

- No backend changes; the two endpoints and their contract are fixed inputs.
- No change to `activityEventsStore`'s data source, endpoint, or filter semantics beyond swapping
  its detail-rendering onto the shared presentation module.
- No centralization of the three existing `project_type === PERSONAL` checks into a shared helper.
- No fix for the unrelated `isAuditor`-flag defect noted in the technical analysis.
- No i18n; strings remain hardcoded English, consistent with the rest of the codebase.
- No client-side feature flag for activity events; `recording_enabled` from the API is the only
  enable/disable signal.
- No new entry point on `ProjectBudgetsSection` or `ProjectMembersManager`; Budget-only viewing is
  reached only via the modal's category filter.
- No prescribed mechanism for the isolated store (factory proxy vs. component-local state) — left
  to the implementation plan.

## Open risks

- No isolated (non-singleton) Valtio store exists anywhere in this codebase to copy; the isolation
  mechanism is new engineering, not a lookup.
- Zero existing test coverage on the exact code being changed (`ActivityEventsPage`'s detail
  rendering, `ProjectDetailsPage`'s personal-project gating) — refactor risk without a regression
  net until new tests are added.
- `PaginationData` field names from the backend (`page`/`per_page`/`total`/`pages`) differ from the
  frontend's existing `Pagination` type casing/shape; a mapping layer is required and is an easy
  spot to introduce an off-by-one or naming mismatch.
