# Scheduler User/Project Type Switch — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a User/Project type switch to the Schedulers page, forwarding the selected scope as `ownerType` to `GET /v1/schedulers`, mirroring the Integrations page pattern.

**Architecture:** Two-file change. The store gains an `ownerType` field on `SchedulersQuery` forwarded to the API. The page gains a `SelectButton` in the header gated by admin permission, a type state, and a handler that clears URL filters and resets pagination on switch.

**Tech Stack:** React 18, TypeScript, Valtio, `SelectButton` component, `IntegrationOption` enum

**Spec:** `docs/superpowers/tasks/2026-09-15-epmcdme-15020-scheduler-type-switch/spec.md`

## Global Constraints

- Ticket prefix on all commits: `EPMCDME-15020:`
- First word after colon must be uppercase (`Add`, `Extend`, etc.)
- Do not chain quality gate commands with `&&`; run them individually
- Formatting/lint runs automatically via PostToolUse hook — do not re-run manually
- Import `IntegrationOption` from `@/constants/integration`
- Import `SelectButton` from `@/components/SelectButton/SelectButton`
- Import `userStore` from `@/store`
- Import `clearUrlFilters` from `@/utils/filters`

---

### Task 1: Extend SchedulersQuery with ownerType

**Test-first: yes — test that fetchSchedulers forwards ownerType to the API params**

**Files:**
- Modify: `src/store/schedulers.ts:60-69` (SchedulersQuery interface), `src/store/schedulers.ts:116-125` (fetchSchedulers params block)
- Test: `src/pages/schedulers/__tests__/SchedulersPage.integration.test.tsx`

**Interfaces:**
- Produces: `SchedulersQuery.ownerType?: IntegrationOption` — used by Task 2

- [ ] **Step 1: Write the failing test**

Add to `SchedulersPage.integration.test.tsx` (inside the existing `describe('SchedulersPage')` block):

```ts
it('forwards ownerType to GET /v1/schedulers when set on the store query', async () => {
  mockAPI('GET', 'v1/schedulers', mockSchedulersResponse)
  renderPage('/schedulers')
  await waitFor(() => {
    expect(schedulersStore.schedulers).toBeDefined()
  })
  // Directly call fetchSchedulers with ownerType to verify the param is forwarded.
  // After the store change, the API call should include ownerType=User.
  mockAPI('GET', 'v1/schedulers', mockSchedulersResponse)
  await schedulersStore.fetchSchedulers({ ownerType: IntegrationOption.USER })
  // The test is behavioural: if ownerType is NOT in SchedulersQuery the above line
  // causes a TypeScript error, which is the failing state we want to drive away.
})
```

Add the import at the top of the test file:
```ts
import { IntegrationOption } from '@/constants/integration'
```

- [ ] **Step 2: Run the test to verify it fails (TypeScript error)**

```bash
npx tsc --noEmit
```

Expected: TypeScript error — `Object literal may only specify known properties, and 'ownerType' does not exist in type 'SchedulersQuery'`

- [ ] **Step 3: Add ownerType to SchedulersQuery**

In `src/store/schedulers.ts`, extend the interface:

```ts
export interface SchedulersQuery {
  page?: number
  pageSize?: number
  search?: string
  resourceType?: SchedulerResourceType
  projectId?: string
  resourceId?: string
  status?: SchedulerStatus
  lastRunStatus?: SchedulerLastRunStatus
  ownerType?: IntegrationOption
}
```

Add the import at the top of the file (if not present):
```ts
import { IntegrationOption } from '@/constants/integration'
```

- [ ] **Step 4: Forward ownerType in fetchSchedulers**

In the `params` construction block inside `fetchSchedulers` (after the `if (query.lastRunStatus)` line), add:

```ts
if (query.ownerType) params.ownerType = query.ownerType
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/store/schedulers.ts src/pages/schedulers/__tests__/SchedulersPage.integration.test.tsx
git commit -m "EPMCDME-15020: Extend SchedulersQuery with ownerType and forward to API"
```

---

### Task 2: Add type switch UI and wire it to the query

**Test-first: yes — test that SelectButton is hidden for non-admin users and visible for admins**

**Files:**
- Modify: `src/pages/schedulers/SchedulersPage.tsx`
- Test: `src/pages/schedulers/__tests__/SchedulersPage.integration.test.tsx`

**Interfaces:**
- Consumes: `SchedulersQuery.ownerType?: IntegrationOption` from Task 1
- Produces: rendered `SelectButton` with `caption="Scheduler Type:"` in the page header

- [ ] **Step 1: Write the failing tests**

Add to `SchedulersPage.integration.test.tsx` inside `describe('SchedulersPage')`:

```ts
describe('Scheduler Type switch', () => {
  it('does not render the type switch for non-admin users', async () => {
    vi.mock('@/store', async (importActual) => {
      const actual = await importActual<typeof import('@/store')>()
      return {
        ...actual,
        userStore: { user: { isAdmin: false, applicationsAdmin: [] } },
      }
    })
    renderPage('/schedulers')
    await waitFor(() => {
      expect(schedulersStore.schedulers).toBeDefined()
    })
    expect(screen.queryByText('Scheduler Type:')).not.toBeInTheDocument()
  })

  it('renders the type switch for admin users', async () => {
    vi.mock('@/store', async (importActual) => {
      const actual = await importActual<typeof import('@/store')>()
      return {
        ...actual,
        userStore: { user: { isAdmin: true, applicationsAdmin: ['demo'] } },
      }
    })
    renderPage('/schedulers')
    await waitFor(() => {
      expect(schedulersStore.schedulers).toBeDefined()
    })
    expect(screen.getByText('Scheduler Type:')).toBeInTheDocument()
    expect(screen.getByText('User')).toBeInTheDocument()
    expect(screen.getByText('Project')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/pages/schedulers/__tests__/SchedulersPage.integration.test.tsx
```

Expected: FAIL — `'Scheduler Type:'` not found (component not yet rendered)

- [ ] **Step 3: Add imports to SchedulersPage.tsx**

In `src/pages/schedulers/SchedulersPage.tsx`, add to the existing import block:

```ts
import SelectButton from '@/components/SelectButton/SelectButton'
import { IntegrationOption } from '@/constants/integration'
import { userStore } from '@/store'
import { clearUrlFilters } from '@/utils/filters'
```

- [ ] **Step 4: Add type state and options memo**

Inside `SchedulersPage`, after the existing `useState` declarations (around line 78), add:

```ts
const currentUser = userStore.user
const schedulerOptions = useMemo(() => {
  const hasProjectPermission = currentUser?.applicationsAdmin?.length || currentUser?.isAdmin
  return [IntegrationOption.USER, IntegrationOption.PROJECT].filter(
    (opt) => opt !== IntegrationOption.PROJECT || hasProjectPermission
  )
}, [currentUser])
const [schedulerType, setSchedulerType] = useState(IntegrationOption.USER)
```

- [ ] **Step 5: Add the change handler**

After `handlePaginationChange`, add:

```ts
const handleChangeSchedulerType = (type: IntegrationOption) => {
  clearUrlFilters()
  setPage(0)
  setSchedulerType(type)
}
```

- [ ] **Step 6: Add ownerType to the query memo**

In the `query` useMemo, add `ownerType: schedulerType` alongside the other fields:

```ts
const query = useMemo<SchedulersQuery>(
  () => ({
    page,
    pageSize: perPage,
    search: filters.search,
    resourceType: filters.resourceType || undefined,
    projectId: filters.projectId,
    resourceId: filters.resourceId,
    status: filters.status || undefined,
    lastRunStatus: filters.lastRunStatus || undefined,
    ownerType: schedulerType,
  }),
  [page, perPage, filters, schedulerType]
)
```

- [ ] **Step 7: Render SelectButton in the header**

Replace the current `<PageLayout>` opening tag:

```tsx
<PageLayout>
```

with:

```tsx
<PageLayout
  rightContent={
    schedulerOptions.length > 1 ? (
      <div className="flex items-center text-white">
        <SelectButton
          caption="Scheduler Type:"
          value={schedulerType}
          options={schedulerOptions}
          onChange={handleChangeSchedulerType}
        />
      </div>
    ) : undefined
  }
>
```

- [ ] **Step 8: Run tests to verify they pass**

```bash
npx vitest run src/pages/schedulers/__tests__/SchedulersPage.integration.test.tsx
```

Expected: all tests PASS

- [ ] **Step 9: Run type-check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 10: Commit**

```bash
git add src/pages/schedulers/SchedulersPage.tsx src/pages/schedulers/__tests__/SchedulersPage.integration.test.tsx
git commit -m "EPMCDME-15020: Add User/Project type switch to Schedulers page"
```
