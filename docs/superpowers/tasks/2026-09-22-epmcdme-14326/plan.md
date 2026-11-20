# Project History Modal (EPMCDME-14326) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give a project admin a history of everything that happened to their project (membership,
roles, settings, budget) via a modal opened from the project details page, backed by the two
already-shipped project-scoped activity-event endpoints, without touching the platform-admin
Activity Events page's data source.

**Architecture:** A new types module models the just-shipped backend contract
(`ActivityEventListItem` / `ActivityEventProjectMetadata` / the BE pagination envelope) and maps its
`page/per_page/total/pages` shape onto the frontend's existing `page/perPage/totalCount/totalPages`
`Pagination` type. A factory function (`createProjectActivityEventsStore()`) produces a **fresh**
Valtio `proxy()` per call instead of a module-level singleton — the modal component creates its own
instance via `useState(() => createProjectActivityEventsStore())` and only mounts the modal
component when open (`{isHistoryOpen && <ProjectActivityHistoryModal .../>}`), so a fresh store
exists per open and nothing is shared with `activityEventsStore`. A new presentation module takes a
small structural type (`event_type`, optional `label`/`category`/`entity_label`/`attributes`/etc.)
so it works unmodified against both the new `ActivityEventListItem` and the existing, older
`ActivityEvent` type used by the platform-admin page — no changes to `activityEvent.ts` are needed.
The modal and the migrated platform-admin page both render detail via the `Table` component's
native `expandedRowIds`/`renderExpandedRow` mechanism, not a `Popup`.

**Tech Stack:** React 18, TypeScript 5, Valtio (state), Vitest + React Testing Library, existing
`Table`/`Popup`/`MultiSelect`/`DatePicker`/`Select` components, `api.ts` HTTP layer.

**Spec:** `docs/superpowers/tasks/2026-09-22-epmcdme-14326/spec.md`

**Commits:** one commit per task, following this repository's existing commit convention (ticket
key + type prefix, as used in recent history) — no new format is introduced by this plan.

## Global Constraints

- No backend changes — the two endpoints (`GET /v1/projects/{project_name}/activity-events` and
  `.../activity-events/metadata`) and their contract are fixed inputs (spec Non-goals).
- No change to `activityEventsStore`'s data source, endpoint, or filter semantics — only its detail
  rendering may change (spec Non-goals; Task 6 only).
- No centralizing the three existing `project.project_type === ProjectType.PERSONAL` checks into a
  shared helper — reuse the pattern in place at each site (spec Non-goals).
- No fix for the `isAuditor` defect (spec Non-goals) — do not touch `isAuditor` usage anywhere.
- No i18n — every new user-facing string is a hardcoded English literal, consistent with the rest of
  the codebase (spec Non-goals).
- No client-side feature flag for activity events — `recording_enabled` from the API response is
  the only enable/disable signal (spec Non-goals).
- No new entry point on `ProjectBudgetsSection` or `ProjectMembersManager` — the only entry point is
  the one button on `ProjectDetailsPage.tsx` (spec Non-goals).
- All filter/sort/page/count values displayed must come from the API response — never computed or
  derived client-side (spec Acceptance criteria).

---

## File Structure

New:
- `src/types/entity/projectActivityEvent.ts` — types for the project-scoped contract + BE-pagination
  → frontend-`Pagination` mapping helper.
- `src/store/projectActivityEvents.ts` — `createProjectActivityEventsStore()` factory (isolated,
  non-singleton).
- `src/utils/activityEventPresentation.tsx` — shared label/category/attribute-row formatting, used
  by both the modal and the migrated `ActivityEventsPage`.
- `src/pages/settings/administration/projectsManagement/components/ProjectActivityHistoryModal.tsx`
  — the modal itself.

Modified:
- `src/pages/settings/administration/ProjectDetailsPage.tsx` — entry-point button + conditional
  modal mount.
- `src/pages/settings/administration/ActivityEventsPage.tsx` — replace `Popup`/`AttributesCell`/
  `DetailRow` with the shared presentation module + `Table` row expansion.

---

### Task 1: Project-scoped activity-event types + pagination mapping

**Files:**
- Create: `src/types/entity/projectActivityEvent.ts`
- Test: `src/types/entity/__tests__/projectActivityEvent.test.ts`

**Interfaces:**
- Produces: `ActivityEventTypeInfo { event_type: string; label: string; category: string }`,
  `ActivityEventProjectMetadata { event_types: ActivityEventTypeInfo[]; recording_enabled: boolean }`,
  `ActivityEventListItem { id: string; domain: string; event_type: string; label: string; category: string; entity_type?: string; entity_id?: string; entity_label?: string; project_name?: string; actor_id?: string; actor_email?: string; actor_name?: string; attributes?: Record<string, unknown>; created_at: string }`,
  `ActivityEventPaginationBE { page: number; per_page: number; total: number; pages: number }`,
  `ProjectActivityEventsResponse { data: ActivityEventListItem[]; pagination: ActivityEventPaginationBE; recording_enabled: boolean }`,
  `ProjectActivityEventsParams { category?: string[] | null; from?: string | null; to?: string | null; sort_dir?: 'asc' | 'desc'; limit?: number; offset?: number }`,
  `mapActivityEventPagination(be: ActivityEventPaginationBE): Pagination` (from `@/types/common`).

- [ ] **Step 1: Write the failing test for the pagination mapping**

```typescript
import { mapActivityEventPagination } from '../projectActivityEvent'

describe('mapActivityEventPagination', () => {
  it('maps BE page/per_page/total/pages onto the frontend Pagination shape', () => {
    const result = mapActivityEventPagination({ page: 1, per_page: 25, total: 60, pages: 3 })
    expect(result).toEqual({ page: 1, perPage: 25, totalCount: 60, totalPages: 3 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/types/entity/__tests__/projectActivityEvent.test.ts`
Expected: FAIL — module `../projectActivityEvent` has no export `mapActivityEventPagination`.

- [ ] **Step 3: Write the types module**

```typescript
import { Pagination } from '@/types/common'

export interface ActivityEventTypeInfo {
  event_type: string
  label: string
  category: string
}

export interface ActivityEventProjectMetadata {
  event_types: ActivityEventTypeInfo[]
  recording_enabled: boolean
}

export interface ActivityEventListItem {
  id: string
  domain: string
  event_type: string
  label: string
  category: string
  entity_type?: string
  entity_id?: string
  entity_label?: string
  project_name?: string
  actor_id?: string
  actor_email?: string
  actor_name?: string
  attributes?: Record<string, unknown>
  created_at: string
}

export interface ActivityEventPaginationBE {
  page: number
  per_page: number
  total: number
  pages: number
}

export interface ProjectActivityEventsResponse {
  data: ActivityEventListItem[]
  pagination: ActivityEventPaginationBE
  recording_enabled: boolean
}

export interface ProjectActivityEventsParams {
  category?: string[] | null
  from?: string | null
  to?: string | null
  sort_dir?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export function mapActivityEventPagination(be: ActivityEventPaginationBE): Pagination {
  return { page: be.page, perPage: be.per_page, totalCount: be.total, totalPages: be.pages }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/types/entity/__tests__/projectActivityEvent.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

Test-first: yes — `mapActivityEventPagination` field-mapping test written before the module existed.

---

### Task 2: Isolated project activity-events store (factory, not a singleton)

**Files:**
- Create: `src/store/projectActivityEvents.ts`
- Test: `src/store/__tests__/projectActivityEvents.test.ts`

**Interfaces:**
- Consumes: `ActivityEventListItem`, `ActivityEventProjectMetadata`, `ProjectActivityEventsResponse`,
  `ProjectActivityEventsParams`, `mapActivityEventPagination` (Task 1); `api` from `@/utils/api`
  (`api.get(path, { params, skipErrorHandling })` per `src/store/activityEvents.ts:70-73`);
  `Pagination` from `@/types/common`.
- Produces: `ProjectActivityEventsStore { events: ActivityEventListItem[]; pagination: Pagination; loading: boolean; error: string | null; metadata: ActivityEventProjectMetadata | null; metadataLoading: boolean; listEvents(projectName: string, params?: ProjectActivityEventsParams): Promise<void>; loadMetadata(projectName: string): Promise<void> }`,
  `createProjectActivityEventsStore(): ProjectActivityEventsStore`.

Design note (why a factory, not the existing singleton pattern): no store in this codebase is
non-singleton today (`activityEventsStore`, `userStore`, `projectsStore` are all module-level
`proxy()` exports). Reusing that shape here would give every modal instance the same object, exactly
what the ticket forbids. A plain factory function returning a new `proxy()` on each call needs no
new abstraction (no context, no DI container) and composes with `useState(() => factory())` in the
component that owns the modal's lifetime — the cheapest mechanism that satisfies "two instances must
not stomp each other," reusing every other convention (`listEvents`/`loading`/`pagination` field
names, `api.get` call shape) from the existing singleton.

- [ ] **Step 1: Write the failing tests**

```typescript
import { createProjectActivityEventsStore } from '../projectActivityEvents'
import api from '@/utils/api'

vi.mock('@/utils/api')

describe('createProjectActivityEventsStore', () => {
  it('returns an independent store instance on every call', () => {
    const a = createProjectActivityEventsStore()
    const b = createProjectActivityEventsStore()
    a.loading = true
    expect(b.loading).toBe(false)
    expect(a).not.toBe(b)
  })

  it('listEvents populates events, mapped pagination, and clears error on success', async () => {
    const response = {
      data: [{ id: '1', domain: 'budget', event_type: 'x', label: 'X', category: 'Budget', created_at: '2026-01-01T00:00:00Z' }],
      pagination: { page: 0, per_page: 50, total: 1, pages: 1 },
      recording_enabled: true,
    }
    ;(api.get as any).mockResolvedValue({ json: async () => response })
    const store = createProjectActivityEventsStore()
    await store.listEvents('proj-1')
    expect(store.events).toEqual(response.data)
    expect(store.pagination).toEqual({ page: 0, perPage: 50, totalCount: 1, totalPages: 1 })
    expect(store.error).toBeNull()
  })

  it('listEvents sets error (not a thrown toast) on failure, leaving loading false', async () => {
    ;(api.get as any).mockRejectedValue(new Error('boom'))
    const store = createProjectActivityEventsStore()
    await store.listEvents('proj-1')
    expect(store.error).toBe('boom')
    expect(store.loading).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/store/__tests__/projectActivityEvents.test.ts`
Expected: FAIL — `../projectActivityEvents` does not exist.

- [ ] **Step 3: Write the store factory**

```typescript
import { proxy } from 'valtio'

import { Pagination } from '@/types/common'
import {
  ActivityEventListItem,
  ActivityEventProjectMetadata,
  ProjectActivityEventsParams,
  ProjectActivityEventsResponse,
  mapActivityEventPagination,
} from '@/types/entity/projectActivityEvent'
import api from '@/utils/api'

const DEFAULT_LIMIT = 50

export interface ProjectActivityEventsStore {
  events: ActivityEventListItem[]
  pagination: Pagination
  loading: boolean
  error: string | null
  metadata: ActivityEventProjectMetadata | null
  metadataLoading: boolean
  listEvents: (projectName: string, params?: ProjectActivityEventsParams) => Promise<void>
  loadMetadata: (projectName: string) => Promise<void>
}

export function createProjectActivityEventsStore(): ProjectActivityEventsStore {
  return proxy<ProjectActivityEventsStore>({
    events: [],
    pagination: { page: 0, perPage: DEFAULT_LIMIT, totalPages: 0, totalCount: 0 },
    loading: false,
    error: null,
    metadata: null,
    metadataLoading: false,

    async listEvents(projectName, params = {}) {
      this.loading = true
      this.error = null
      try {
        const limit = params.limit ?? DEFAULT_LIMIT
        const offset = params.offset ?? 0
        const queryParams: Record<string, string | string[]> = {
          limit: String(limit),
          offset: String(offset),
          sort_dir: params.sort_dir ?? 'desc',
        }
        if (params.category?.length) queryParams.category = params.category
        if (params.from) queryParams.from = params.from
        if (params.to) queryParams.to = params.to

        const response = await api.get(`v1/projects/${projectName}/activity-events`, {
          params: queryParams,
          skipErrorHandling: true,
        })
        const data = (await response.json()) as ProjectActivityEventsResponse
        this.events = data.data ?? []
        this.pagination = mapActivityEventPagination(data.pagination)
      } catch (error: any) {
        this.error = error?.parsedError?.message ?? error?.message ?? 'Failed to load activity events'
      } finally {
        this.loading = false
      }
    },

    async loadMetadata(projectName) {
      this.metadataLoading = true
      try {
        const response = await api.get(`v1/projects/${projectName}/activity-events/metadata`, {
          skipErrorHandling: true,
        })
        this.metadata = (await response.json()) as ActivityEventProjectMetadata
      } catch (error: any) {
        this.error = error?.parsedError?.message ?? error?.message ?? 'Failed to load activity metadata'
      } finally {
        this.metadataLoading = false
      }
    },
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/store/__tests__/projectActivityEvents.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

Test-first: yes — isolation test and both success/error `listEvents` tests written before the
factory existed.

---

### Task 3: Shared event-presentation module

**Files:**
- Create: `src/utils/activityEventPresentation.tsx`
- Test: `src/utils/__tests__/activityEventPresentation.test.tsx`

**Interfaces:**
- Consumes: `formatCurrency` from `@/utils/currency.ts:17`, `formatDate` from
  `@/utils/helpers.ts:51`.
- Produces: `PresentableActivityEvent { event_type: string; label?: string; category?: string; entity_type?: string; entity_id?: string; entity_label?: string; actor_name?: string; actor_email?: string; attributes?: Record<string, unknown> | null; created_at: string }` (structurally satisfied by both `ActivityEventListItem` and the existing, older `ActivityEvent` type — no changes needed to either),
  `getEventDisplayLabel(event: PresentableActivityEvent): string`,
  `getEventTargetLabel(event: PresentableActivityEvent): string`,
  `getEventActorLabel(event: PresentableActivityEvent): string`,
  `getEventAttributeRows(event: PresentableActivityEvent): Array<{ label: string; value: React.ReactNode }>`.

- [ ] **Step 1: Write the failing tests**

```typescript
import { getEventDisplayLabel, getEventTargetLabel, getEventActorLabel, getEventAttributeRows } from '../activityEventPresentation'

describe('activityEventPresentation', () => {
  it('falls back to a humanized event_type when label is missing (old ActivityEvent shape)', () => {
    expect(getEventDisplayLabel({ event_type: 'member_role_changed', created_at: '2026-01-01' }))
      .toBe('Member role changed')
  })

  it('prefers entity_label, falls back to entity_type/entity_id, then em dash', () => {
    expect(getEventTargetLabel({ event_type: 'x', entity_label: 'Budget A', created_at: '2026-01-01' })).toBe('Budget A')
    expect(getEventTargetLabel({ event_type: 'x', entity_type: 'budget', entity_id: 'b-1', created_at: '2026-01-01' })).toBe('budget b-1')
    expect(getEventTargetLabel({ event_type: 'x', created_at: '2026-01-01' })).toBe('—')
  })

  it('renders actor_name/actor_email from the event itself, never a lookup, falling back to "system"', () => {
    expect(getEventActorLabel({ event_type: 'x', actor_name: 'Jane', actor_email: 'jane@x.com', created_at: '2026-01-01' })).toBe('Jane (jane@x.com)')
    expect(getEventActorLabel({ event_type: 'x', created_at: '2026-01-01' })).toBe('system')
  })

  it('formats currency-shaped attribute keys with formatCurrency and never dumps raw JSON', () => {
    const rows = getEventAttributeRows({
      event_type: 'unknown_future_event',
      attributes: { max_budget: 120.5, changed_at: '2026-01-01T00:00:00Z', note: 'ok' },
      created_at: '2026-01-01',
    })
    expect(rows).toEqual([
      { label: 'Max budget', value: '$120.50' },
      { label: 'Changed at', value: expect.any(String) },
      { label: 'Note', value: 'ok' },
    ])
  })

  it('returns an empty array, not a placeholder, when there are no attributes', () => {
    expect(getEventAttributeRows({ event_type: 'x', created_at: '2026-01-01' })).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/__tests__/activityEventPresentation.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write the presentation module**

```tsx
import { formatCurrency } from '@/utils/currency'
import { formatDate } from '@/utils/helpers'

export interface PresentableActivityEvent {
  event_type: string
  label?: string
  category?: string
  entity_type?: string
  entity_id?: string
  entity_label?: string
  actor_name?: string
  actor_email?: string
  attributes?: Record<string, unknown> | null
  created_at: string
}

const AMOUNT_KEY_HINT = /(amount|budget|spend|limit|cost)/i
const DATE_KEY_HINT = /(_at$|date|timestamp)/i

function humanizeKey(key: string): string {
  const words = key.replace(/_/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function getEventDisplayLabel(event: PresentableActivityEvent): string {
  return event.label?.trim() || humanizeKey(event.event_type)
}

export function getEventTargetLabel(event: PresentableActivityEvent): string {
  if (event.entity_label) return event.entity_label
  if (event.entity_type && event.entity_id) return `${event.entity_type} ${event.entity_id}`
  if (event.entity_id) return event.entity_id
  return '—'
}

export function getEventActorLabel(event: PresentableActivityEvent): string {
  if (event.actor_name && event.actor_email) return `${event.actor_name} (${event.actor_email})`
  return event.actor_name || event.actor_email || 'system'
}

function formatAttributeValue(key: string, value: unknown): React.ReactNode {
  if (typeof value === 'number' && AMOUNT_KEY_HINT.test(key)) return formatCurrency(value)
  if (typeof value === 'string' && DATE_KEY_HINT.test(key)) return formatDate(value)
  if (value === null || value === undefined) return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function getEventAttributeRows(
  event: PresentableActivityEvent
): Array<{ label: string; value: React.ReactNode }> {
  return Object.entries(event.attributes ?? {}).map(([key, value]) => ({
    label: humanizeKey(key),
    value: formatAttributeValue(key, value),
  }))
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/__tests__/activityEventPresentation.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

Test-first: yes — five behavior tests (label fallback, target fallback chain, actor-from-event-only,
currency/date attribute formatting, empty-attributes case) written before the module existed.

---

### Task 4: `ProjectActivityHistoryModal` component

**Files:**
- Create:
  `src/pages/settings/administration/projectsManagement/components/ProjectActivityHistoryModal.tsx`
- Test:
  `src/pages/settings/administration/projectsManagement/components/__tests__/ProjectActivityHistoryModal.test.tsx`

**Interfaces:**
- Consumes: `createProjectActivityEventsStore` (Task 2); `getEventDisplayLabel`,
  `getEventTargetLabel`, `getEventActorLabel`, `getEventAttributeRows` (Task 3); `Popup` (props per
  `src/components/Popup/Popup.tsx:29-55`); `Table` (props per `src/components/Table/Table.tsx:51-78`,
  in particular `expandedRowIds`/`onToggleExpand`/`renderExpandedRow`); `DatePicker` (usage per
  `ActivityEventsPage.tsx:326-329`); `formatDate` from `@/utils/helpers`.
- Produces: `ProjectActivityHistoryModalProps { projectName: string; onHide: () => void }`,
  default export `ProjectActivityHistoryModal`.

Category values are fixed (`Budget`, `Members`, `Settings` per spec) — render as a plain
multi-checkbox `MultiSelect` with a static option list, not derived from the metadata endpoint.

- [ ] **Step 1: Write the failing tests**

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import api from '@/utils/api'
import ProjectActivityHistoryModal from '../ProjectActivityHistoryModal'

vi.mock('@/utils/api')

function mockEventsResponse(overrides = {}) {
  return {
    json: async () => ({
      data: [{
        id: '1', domain: 'members', event_type: 'member_added', label: 'Member added',
        category: 'Members', entity_label: 'Jane Doe', actor_name: 'Admin', actor_email: 'a@x.com',
        attributes: { role: 'viewer' }, created_at: '2026-01-01T00:00:00Z',
      }],
      pagination: { page: 0, per_page: 50, total: 1, pages: 1 },
      recording_enabled: true,
      ...overrides,
    }),
  }
}

describe('ProjectActivityHistoryModal', () => {
  it('renders event rows with actor/target/label from the API, expands to show attribute rows, never raw JSON', async () => {
    ;(api.get as any).mockImplementation((path: string) =>
      path.includes('/metadata')
        ? { json: async () => ({ event_types: [], recording_enabled: true }) }
        : mockEventsResponse()
    )
    render(<ProjectActivityHistoryModal projectName="proj-1" onHide={vi.fn()} />)
    expect(await screen.findByText('Member added')).toBeInTheDocument()
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /expand/i }))
    expect(await screen.findByText('viewer')).toBeInTheDocument()
    expect(screen.queryByText(/^\{/)).not.toBeInTheDocument()
  })

  it('shows a distinct disabled state when recording_enabled is false, not the empty state', async () => {
    ;(api.get as any).mockImplementation((path: string) =>
      path.includes('/metadata')
        ? { json: async () => ({ event_types: [], recording_enabled: false }) }
        : mockEventsResponse({ data: [], recording_enabled: false })
    )
    render(<ProjectActivityHistoryModal projectName="proj-1" onHide={vi.fn()} />)
    expect(await screen.findByText(/activity recording is disabled/i)).toBeInTheDocument()
  })

  it('shows an error state with a retry action on a failed request', async () => {
    ;(api.get as any).mockRejectedValue(new Error('network down'))
    render(<ProjectActivityHistoryModal projectName="proj-1" onHide={vi.fn()} />)
    expect(await screen.findByText(/network down/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/pages/settings/administration/projectsManagement/components/__tests__/ProjectActivityHistoryModal.test.tsx`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Implement the modal**

Structure (using existing primitives, no new low-level UI code): a `Popup` (`visible` always true
since the parent only mounts it when open, `isFullWidth`, `hideFooter`) containing a category
`MultiSelect` (options `['Budget', 'Members', 'Settings']`), two `DatePicker`s (`From`/`To`, mirroring
`ActivityEventsPage.tsx:326-329`), and a `Table` fed from
`useState(() => createProjectActivityEventsStore())` + `useSnapshot`. Columns: `created_at`
(`formatDate`), `label` (`getEventDisplayLabel`), `entity` (`getEventTargetLabel`), `actor`
(`getEventActorLabel`); `expandedRowIds`/`onToggleExpand` driven by local `useState<string[]>`;
`renderExpandedRow` maps `getEventAttributeRows(item)` into label/value rows, rendering `'No
additional detail'` when the array is empty (never blank). Load `metadata` once on mount to read
`recording_enabled`; when `false`, render a disabled-state message in place of the `Table` (distinct
copy from the empty-list state `Table` already renders via `EmptyList` when `items` is `[]` and
`recording_enabled` is `true`). On `store.error`, render the message plus a "Retry" button calling
`store.listEvents(projectName, currentParams)` again; the underlying `ProjectDetailsPage` is
unaffected because this component only affects its own Popup subtree.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/pages/settings/administration/projectsManagement/components/__tests__/ProjectActivityHistoryModal.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

Test-first: yes — row rendering + expansion + disabled-state + error/retry tests written before the
component existed.

---

### Task 5: Entry point on `ProjectDetailsPage.tsx`

**Files:**
- Modify: `src/pages/settings/administration/ProjectDetailsPage.tsx:88` (add
  `isHistoryOpen` state next to `isEditPopupVisible`), `:200-206` (add button in `rightContent`),
  `:322-328` (mount the modal conditionally next to `ProjectModal`).
- Test: `src/pages/settings/administration/__tests__/ProjectDetailsPage.test.tsx` (new — no test
  file exists for this page today per the technical analysis).

**Interfaces:**
- Consumes: `ProjectActivityHistoryModal` (Task 4, props `{ projectName, onHide }`);
  `isPersonalProject` (already computed at `ProjectDetailsPage.tsx:92`).

- [ ] **Step 1: Write the failing tests**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
// ...existing test setup mocking projectsStore.getProject and userStore per this page's dependencies

describe('ProjectDetailsPage — activity history entry point', () => {
  it('shows a "History" button for a non-personal project and opens the modal on click', async () => {
    // mock projectsStore.getProject to resolve a non-personal ProjectDetail
    render(<ProjectDetailsPage />)
    const button = await screen.findByRole('button', { name: /history/i })
    await userEvent.click(button)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('shows no History button at all for a personal project', async () => {
    // mock projectsStore.getProject to resolve a ProjectDetail with project_type: ProjectType.PERSONAL
    render(<ProjectDetailsPage />)
    await screen.findByText(/project details|description/i)
    expect(screen.queryByRole('button', { name: /history/i })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/pages/settings/administration/__tests__/ProjectDetailsPage.test.tsx`
Expected: FAIL — no "History" button exists yet.

- [ ] **Step 3: Wire the entry point**

- At `ProjectDetailsPage.tsx:88` (alongside `isEditPopupVisible`), add
  `const [isHistoryOpen, setIsHistoryOpen] = useState(false)`.
- At `ProjectDetailsPage.tsx:200-206`, add a second `Button` inside `rightContent`, rendered
  whenever `!isPersonalProject` (independent of `canManageProject`, since any admin/maintainer/
  project-admin the backend authorizes should see it — spec acceptance criterion): `<Button
  size={ButtonSize.MEDIUM} onClick={() => setIsHistoryOpen(true)}>History</Button>`.
- At `ProjectDetailsPage.tsx:322-328` (next to the existing `<ProjectModal .../>`), add:
  `{isHistoryOpen && (<ProjectActivityHistoryModal projectName={project.name} onHide={() => setIsHistoryOpen(false)} />)}`
  — mounting only while open is what gives Task 2's factory-produced store a fresh instance per
  open, per the Architecture note above.
- Import `ProjectActivityHistoryModal` from
  `./projectsManagement/components/ProjectActivityHistoryModal`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/pages/settings/administration/__tests__/ProjectDetailsPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

Test-first: yes — button-visibility-by-project-type and open-on-click tests written before the
button existed.

---

### Task 6: Migrate `ActivityEventsPage.tsx` onto the shared presentation module

**Files:**
- Modify: `src/pages/settings/administration/ActivityEventsPage.tsx` — remove `Popup` import
  (`:24`), `AttributesCell`/`makeAttributesRenderer`/`DetailRow` (`:95-144`), the `selectedEvent`
  state (`:161`), the `attributes` entry in `customRenderColumns` (`:266`), and the `Popup` detail
  block (`:371-416`); add row expansion.
- Test: extend `src/pages/settings/administration/__tests__/ActivityEventsPage.test.tsx` (currently
  covers only `activityEventsFilters.ts` helpers per the technical analysis — this task adds the
  first render-level coverage of the page itself).

**Interfaces:**
- Consumes: `getEventDisplayLabel`, `getEventTargetLabel`, `getEventActorLabel`,
  `getEventAttributeRows` (Task 3) — called with the page's existing `ActivityEvent` items directly;
  no change to `ActivityEvent`'s type definition is needed (structural compatibility, see Task 3).
  `Table`'s `expandedRowIds`/`onToggleExpand`/`renderExpandedRow`.
- Does not change: `activityEventsStore`, its `listEvents`/`loadFilterOptions` calls, or any of the
  existing Domain/Event type/Entity type/Actor ID/Entity ID/From/To/Sort filter state and handlers
  (`ActivityEventsPage.tsx:152-243` untouched).

- [ ] **Step 1: Write the failing tests**

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { activityEventsStore } from '@/store/activityEvents'
import ActivityEventsPage from '../ActivityEventsPage'

describe('ActivityEventsPage — shared presentation migration', () => {
  it('renders no raw JSON attribute dump and no Popup; expanding a row shows readable attribute rows', async () => {
    activityEventsStore.events = [{
      id: '1', domain: 'members', event_type: 'member_added', entity_type: 'user', entity_id: 'u1',
      actor_id: 'a1', actor_name: 'Admin', actor_email: 'admin@x.com',
      attributes: { role: 'viewer' }, created_at: '2026-01-01T00:00:00Z',
    }]
    render(<ActivityEventsPage />)
    await userEvent.click(await screen.findByRole('button', { name: /expand/i }))
    expect(await screen.findByText('viewer')).toBeInTheDocument()
    expect(screen.queryByText(/^\{/)).not.toBeInTheDocument()
    expect(document.querySelector('[role="dialog"]')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/settings/administration/__tests__/ActivityEventsPage.test.tsx`
Expected: FAIL — no row-expansion mechanism exists yet; a `Popup` still renders on chip click.

- [ ] **Step 3: Migrate the page**

- Remove the `Popup` import, `AttributesCell`, `makeAttributesRenderer`, `DetailRow`, the
  `selectedEvent` state, and the `attributes` column entry in `customRenderColumns` (the raw-chip
  cell and the JSON-dump Popup this task must eliminate).
- Add `const [expandedRowIds, setExpandedRowIds] = useState<string[]>([])` and a toggle handler
  `(id: string) => setExpandedRowIds((ids) => ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id])`.
- Pass `expandedRowIds`, `onToggleExpand={toggleExpand}`, and
  `renderExpandedRow={(item: ActivityEvent) => { const rows = getEventAttributeRows(item); return
  <div className="p-3 flex flex-col gap-1">{rows.length ? rows.map((r) => <div key={r.label}><span
  className="text-text-quaternary text-xs">{r.label}: </span><span
  className="text-text-primary text-sm">{r.value}</span></div>) : <span
  className="text-text-quaternary text-sm">No additional detail</span>}</div> }}` to the existing
  `Table`.
- Replace `renderEntity`/`renderActor`'s bodies with `getEventTargetLabel(item)` /
  `getEventActorLabel(item)` respectively so the same fallback rules (deleted-actor identity
  snapshot, entity fallback chain) apply on both screens.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/settings/administration/__tests__/ActivityEventsPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

Test-first: yes — the "no raw JSON, no Popup, expand shows readable rows" test was written before
the migration.

---

## Self-review notes

**Spec coverage:** modal opens from `ProjectDetailsPage` and lists all-domain project events (Task
4/5); category + date-range filters server-side (Task 4); no client-side derivation of filter/sort/
page/count (Tasks 2/4 pass API values straight through); Budget category groups budget + enforcement
events together (server-side already, per technical analysis — nothing to build); pagination
preserves filters + shows total (Task 4, `store.pagination.totalCount`); row expansion instead of
Popup/raw JSON (Tasks 4 and 6); unknown event type fallback (Task 3's `getEventDisplayLabel`/
`getEventAttributeRows` are unconditional, no special-casing needed); isolated store (Task 2 +
Task 5's mount-on-open); identical UI for any authorized viewer (Task 5's button is not
role-gated, only personal-project-gated); personal projects hide the entry point (Task 5); deleted
actor shows recorded identity, no lookup (Task 3's `getEventActorLabel`, used by both Task 4 and
Task 6); empty vs. disabled state distinction (Task 4); error + retry, underlying page usable (Task
4, scoped to the modal's own Popup); closing leaves the page untouched (Task 5 unmounts the modal,
nothing else changes); `ActivityEventsPage` migrated onto shared presentation with no data-source
change (Task 6).

**Negative constraints:**
- No backend changes — no task edits anything outside `src/` in this repo. ✓
- No change to `activityEventsStore`'s data source/endpoint/filters — Task 6 touches only
  presentation/expansion; `listEvents`/`loadFilterOptions` and all filter state are explicitly left
  alone. ✓
- No centralizing the three `PERSONAL` checks — Task 5 reuses the page's existing
  `isPersonalProject` local variable; no shared helper is introduced. ✓
- No `isAuditor` fix — no task references or edits `isAuditor`. ✓
- No i18n — every new string in Tasks 3/4/6 (`'History'`, `'No additional detail'`, `'system'`,
  disabled/error copy) is a plain literal, no i18n hook introduced. ✓
- No client-side feature flag — Task 4 reads `recording_enabled` from the metadata/list response
  only; no `FEATURE_FLAGS` entry is added. ✓
- No new entry point on `ProjectBudgetsSection`/`ProjectMembersManager` — only Task 5 adds an entry
  point, and only on `ProjectDetailsPage`. ✓
- All displayed filter/sort/page/count values come from the API — Tasks 2 and 4 never compute
  `totalPages`/`totalCount` client-side; they map the BE envelope 1:1. ✓
