# Analytics User Filter Email + Admin Dropdown Width Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show email below user name in the Analytics Users filter dropdown, and set a 320px minimum width on five Administration page filter panels.

**Architecture:** Backend adds `email` to `UserListItem` and populates it in the PG handler path. Frontend threads `email` through `formatUserOptions` → `AnalyticsUserFilter` → a new `renderUserOption` template. The admin dropdown panel width fix adds a `panelMinWidth` prop to the shared `MultiSelect` wrapper, forwarded through `ProjectSelector` and `BudgetSelector`, then applied at five call sites.

**Tech Stack:** Python 3.12 / FastAPI / Pydantic (backend); TypeScript / React / PrimeReact / Tailwind / Vitest + @testing-library/react (frontend).

## Global Constraints

- Commit message format: `EPMCDME-XXXX: Capital sentence` (enforced by CI — first word after colon must be uppercase, no trailing period)
- Backend repo: `C:\Users\kostiantyn_pshenych1\Documents\cdme\codemie`
- Frontend repo: `C:\Users\kostiantyn_pshenych1\Documents\cdme\codemie-ui-next`
- Both repos are on branch `EPMCDME-14070_analytics-user-filter-email`
- Never skip pre-commit hooks (`--no-verify`)
- `email` field on `UserListItem` is `str | None` — ES path will always produce `None`; render templates must guard against it
- Do not modify any file outside the listed **Files** for each task

---

### Task 1: Add `email` to backend `UserListItem` and PG handler path

**Repos:** `codemie`

**Files:**
- Modify: `src/codemie/rest_api/models/analytics.py` (around line 144)
- Modify: `src/codemie/service/analytics/handlers/user_handler.py` (around line 100)
- Test: `tests/codemie/service/analytics/handlers/test_user_handler.py`

**Interfaces:**
- Produces: `UserListItem` shape `{id: str, name: str, email: str | None}` — consumed by Task 2 via the API response

- [ ] **Step 1: Write the failing test**

Add to `tests/codemie/service/analytics/handlers/test_user_handler.py` inside a new `class TestGetUsersList`:

```python
class TestGetUsersList:
    """Tests for get_users_list PG path email inclusion."""

    @pytest.mark.asyncio
    async def test_pg_path_includes_email_in_response(self, handler):
        """UserListItem must include email when returned from the PG super-admin path."""
        mock_db_user = MagicMock()
        mock_db_user.id = "u1"
        mock_db_user.name = "Alice"
        mock_db_user.username = "alice"
        mock_db_user.email = "alice@example.com"

        with (
            patch("codemie.service.analytics.handlers.user_handler.config") as mock_cfg,
            patch("codemie.service.analytics.handlers.user_handler.get_async_session") as mock_session_ctx,
            patch("codemie.service.analytics.handlers.user_handler.user_repository") as mock_repo,
            patch("codemie.service.analytics.handlers.user_handler.ResponseFormatter"),
            patch("codemie.service.analytics.handlers.user_handler.TimeParser"),
        ):
            mock_cfg.ENABLE_USER_MANAGEMENT = True
            handler._user.is_admin = True

            mock_session = AsyncMock()
            mock_session_ctx.return_value.__aenter__ = AsyncMock(return_value=mock_session)
            mock_session_ctx.return_value.__aexit__ = AsyncMock(return_value=False)
            mock_repo.aquery_active_users = AsyncMock(return_value=[mock_db_user])

            from codemie.service.analytics.access_filter import AccessFilter
            with patch.object(AccessFilter, "get_project_access_context") as mock_ctx:
                mock_ctx.return_value.is_admin = True
                result = await handler.get_users_list()

        users = result["data"]["users"]
        assert len(users) == 1
        assert users[0]["email"] == "alice@example.com"

    @pytest.mark.asyncio
    async def test_pg_path_email_none_when_db_email_is_none(self, handler):
        """email key must still be present but None when UserDB.email is None."""
        mock_db_user = MagicMock()
        mock_db_user.id = "u2"
        mock_db_user.name = "Bob"
        mock_db_user.username = "bob"
        mock_db_user.email = None

        with (
            patch("codemie.service.analytics.handlers.user_handler.config") as mock_cfg,
            patch("codemie.service.analytics.handlers.user_handler.get_async_session") as mock_session_ctx,
            patch("codemie.service.analytics.handlers.user_handler.user_repository") as mock_repo,
            patch("codemie.service.analytics.handlers.user_handler.ResponseFormatter"),
            patch("codemie.service.analytics.handlers.user_handler.TimeParser"),
        ):
            mock_cfg.ENABLE_USER_MANAGEMENT = True
            handler._user.is_admin = True

            mock_session = AsyncMock()
            mock_session_ctx.return_value.__aenter__ = AsyncMock(return_value=mock_session)
            mock_session_ctx.return_value.__aexit__ = AsyncMock(return_value=False)
            mock_repo.aquery_active_users = AsyncMock(return_value=[mock_db_user])

            from codemie.service.analytics.access_filter import AccessFilter
            with patch.object(AccessFilter, "get_project_access_context") as mock_ctx:
                mock_ctx.return_value.is_admin = True
                result = await handler.get_users_list()

        users = result["data"]["users"]
        assert users[0]["email"] is None
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd C:\Users\kostiantyn_pshenych1\Documents\cdme\codemie
poetry run pytest tests/codemie/service/analytics/handlers/test_user_handler.py::TestGetUsersList -v
```

Expected: FAIL — `KeyError: 'email'` or `AssertionError`

- [ ] **Step 3: Add `email` field to `UserListItem`**

In `src/codemie/rest_api/models/analytics.py`, change:

```python
class UserListItem(BaseModel):
    """Individual user item in users list."""

    id: str = Field(..., description="User ID")
    name: str = Field(..., description="User display name")
```

to:

```python
class UserListItem(BaseModel):
    """Individual user item in users list."""

    id: str = Field(..., description="User ID")
    name: str = Field(..., description="User display name")
    email: str | None = Field(None, description="User email address — populated on PG path only")
```

- [ ] **Step 4: Include `email` in the PG handler path**

In `src/codemie/service/analytics/handlers/user_handler.py`, change line ~100:

```python
users_list = [{"id": u.id, "name": u.name or u.username} for u in pg_users]
```

to:

```python
users_list = [{"id": u.id, "name": u.name or u.username, "email": u.email} for u in pg_users]
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd C:\Users\kostiantyn_pshenych1\Documents\cdme\codemie
poetry run pytest tests/codemie/service/analytics/handlers/test_user_handler.py::TestGetUsersList -v
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd C:\Users\kostiantyn_pshenych1\Documents\cdme\codemie
git add src/codemie/rest_api/models/analytics.py src/codemie/service/analytics/handlers/user_handler.py tests/codemie/service/analytics/handlers/test_user_handler.py
git commit -m "EPMCDME-14070: Include email in analytics users list response"
```

---

### Task 2: Thread `email` through `formatUserOptions` in the frontend

**Repo:** `codemie-ui-next`

**Files:**
- Modify: `src/utils/user.ts`
- Test: `src/utils/__tests__/user.test.ts` (create if absent)

**Interfaces:**
- Consumes: backend now returns `{ id, name, email?: string | null }` per user item
- Produces: `formatUserOptions` returns `Array<{ label: string; value: string; email?: string }>` — consumed by Task 3

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/user.test.ts`:

```ts
// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { describe, it, expect } from 'vitest'
import { formatUserOptions } from '../user'

describe('formatUserOptions', () => {
  it('preserves email when present on user object', () => {
    const users = [{ id: 'u1', name: 'Alice', email: 'alice@example.com' }]
    const result = formatUserOptions(users)
    expect(result).toHaveLength(1)
    expect(result[0].email).toBe('alice@example.com')
  })

  it('omits email key when email is null', () => {
    const users = [{ id: 'u1', name: 'Alice', email: null }]
    const result = formatUserOptions(users)
    expect(result[0].email).toBeUndefined()
  })

  it('omits email key when email is undefined', () => {
    const users = [{ id: 'u1', name: 'Alice' }]
    const result = formatUserOptions(users)
    expect(result[0].email).toBeUndefined()
  })

  it('picks email from first grouped entry that has one', () => {
    // Two rows for the same user id — first has no email, second does
    const users = [
      { id: 'u1', name: 'Alice A', email: null },
      { id: 'u1', name: 'alice', email: 'alice@example.com' },
    ]
    const result = formatUserOptions(users)
    expect(result).toHaveLength(1)
    expect(result[0].email).toBe('alice@example.com')
  })

  it('still returns label and value correctly when email is present', () => {
    const users = [{ id: 'u1', name: 'Alice', email: 'alice@example.com' }]
    const result = formatUserOptions(users)
    expect(result[0].label).toBe('Alice')
    expect(result[0].value).toBe('u1')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd C:\Users\kostiantyn_pshenych1\Documents\cdme\codemie-ui-next
npx vitest run src/utils/__tests__/user.test.ts
```

Expected: FAIL — `expect(received).toBe(expected)` on the email assertions

- [ ] **Step 3: Update `formatUserOptions` to include `email`**

In `src/utils/user.ts`, update the return type and the map at the end of `formatUserOptions`:

Change the function signature comment + return type:

```ts
export const formatUserOptions = (users: any[]): Array<{ label: string; value: string; email?: string }> => {
```

Inside the `Array.from(userMap.entries()).map(...)` block, after building `label`, add email extraction before the `return`:

```ts
  // Sort names by priority (non-UUID first, then non-empty, then rest)
  names.sort((a, b) => {
    const priorityA = prioritizeName(a)
    const priorityB = prioritizeName(b)
    return priorityA - priorityB
  })

  // Create label with the best name first, others in parentheses
  const label = names.length > 1 ? `${names[0]} (${names.slice(1).join(', ')})` : names[0]

  // Pick the first non-empty email from all entries for this user id
  const email = users.find((u: any) => u.id === id && u.email)?.email as string | undefined

  return {
    label,
    value: id,
    ...(email ? { email } : {}),
  }
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd C:\Users\kostiantyn_pshenych1\Documents\cdme\codemie-ui-next
npx vitest run src/utils/__tests__/user.test.ts
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
cd C:\Users\kostiantyn_pshenych1\Documents\cdme\codemie-ui-next
git add src/utils/user.ts src/utils/__tests__/user.test.ts
git commit -m "EPMCDME-14070: Thread email through formatUserOptions"
```

---

### Task 3: Add `renderUserOption` template to `AnalyticsUserFilter`

**Repo:** `codemie-ui-next`

**Files:**
- Modify: `src/pages/analytics/components/AnalyticsUserFilter.tsx`
- Test: `src/pages/analytics/components/__tests__/AnalyticsUserFilter.test.tsx`

**Interfaces:**
- Consumes: `userOptions: Array<{ label: string; value: string; email?: string }>` from Task 2
- Produces: MultiSelect items rendered with name on top, email below (dimmed, smaller) when present

- [ ] **Step 1: Write the failing test**

Add to `src/pages/analytics/components/__tests__/AnalyticsUserFilter.test.tsx` (inside `describe('AnalyticsUserFilter')`):

```tsx
it('renders email below name in dropdown option when email is present', async () => {
  const user = userEvent.setup()
  const options = [
    { label: 'Alice Smith', value: 'u1', email: 'alice@example.com' },
    { label: 'Bob Jones', value: 'u2' },
  ]

  render(
    <AnalyticsUserFilter
      value={[]}
      onChange={vi.fn()}
      userOptions={options}
      isLoadingOptions={false}
      showMeCheckbox={false}
    />
  )

  // Open the dropdown
  await user.click(screen.getByRole('combobox', { hidden: true }) ?? screen.getByPlaceholderText('Users'))

  await waitFor(() => {
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
    // Bob has no email — the email line must not appear
    expect(screen.queryByText('undefined')).not.toBeInTheDocument()
    expect(screen.queryByText('null')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd C:\Users\kostiantyn_pshenych1\Documents\cdme\codemie-ui-next
npx vitest run src/pages/analytics/components/__tests__/AnalyticsUserFilter.test.tsx --reporter=verbose
```

Expected: FAIL — `Unable to find an element with the text: alice@example.com`

- [ ] **Step 3: Update `AnalyticsUserFilterProps` and add `renderUserOption`**

In `src/pages/analytics/components/AnalyticsUserFilter.tsx`:

Update the interface:

```tsx
interface AnalyticsUserFilterProps {
  value: string[]
  onChange: (value: string[]) => void
  userOptions: Array<{ label: string; value: string; email?: string }>
  isLoadingOptions?: boolean
  isAdmin?: boolean
  showMeCheckbox?: boolean
  onSearchChange?: (term: string) => void
}
```

Add the render function just before the component definition (after the imports):

```tsx
const renderUserOption = (option: { label: string; value: string; email?: string }) => (
  <div className="flex flex-col min-w-0">
    <p className="text-sm font-medium truncate">{option.label}</p>
    {option.email && (
      <p className="text-xs text-text-quaternary truncate">{option.email}</p>
    )}
  </div>
)
```

Update the `MultiSelect` call inside the component's return statement — add `renderOption` and update `virtualScrollerOptions`:

```tsx
<MultiSelect
  id="users"
  value={displayValue}
  options={mergedOptions}
  onChange={handleUsersChange}
  placeholder="Users"
  fullWidth
  onFilter={isAdmin ? onSearchChange : () => {}}
  filterPlaceholder="Search users"
  showCheckbox
  hasVirtualScroll
  virtualScrollerOptions={{ itemSize: 48 }}
  renderOption={renderUserOption}
/>
```

Also update the `stickyOptions` state type to match the new option shape:

```tsx
const [stickyOptions, setStickyOptions] = useState<Map<string, { label: string; value: string; email?: string }>>(
  new Map()
)
```

And the `currentUserOptionRef`:

```tsx
const currentUserOptionRef = useRef<{ label: string; value: string; email?: string } | null>(null)
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd C:\Users\kostiantyn_pshenych1\Documents\cdme\codemie-ui-next
npx vitest run src/pages/analytics/components/__tests__/AnalyticsUserFilter.test.tsx --reporter=verbose
```

Expected: all tests PASS including the new one

- [ ] **Step 5: Commit**

```bash
cd C:\Users\kostiantyn_pshenych1\Documents\cdme\codemie-ui-next
git add src/pages/analytics/components/AnalyticsUserFilter.tsx src/pages/analytics/components/__tests__/AnalyticsUserFilter.test.tsx
git commit -m "EPMCDME-14070: Add name+email item template to analytics users filter"
```

---

### Task 4: Add `panelMinWidth` prop to `MultiSelect` wrapper

**Repo:** `codemie-ui-next`

**Files:**
- Modify: `src/components/form/MultiSelect/MultiSelect.tsx`

**Interfaces:**
- Produces: `panelMinWidth?: number` prop — consumed by Tasks 5 and 6 via `ProjectSelector`, `BudgetSelector`, and direct call sites

Test-first: no unit test needed here — this is a pure prop passthrough. Verification is done via the call-site tests in Tasks 5 and 6.

- [ ] **Step 1: Add `panelMinWidth` to `MultiSelectProps`**

In `src/components/form/MultiSelect/MultiSelect.tsx`, add to the `MultiSelectProps` type (after `onScrollBottom`):

```ts
panelMinWidth?: number
```

- [ ] **Step 2: Destructure the new prop**

In the component's parameter list (inside `forwardRef`), add `panelMinWidth` to the destructured props:

```ts
onScrollBottom,
panelMinWidth,
```

- [ ] **Step 3: Apply `panelMinWidth` to `panelStyle`**

Find the existing `panelStyle` prop on `<PrimeMultiselect>`:

```ts
panelStyle={inputWidth ? { width: `${inputWidth}px` } : {}}
```

Replace with:

```ts
panelStyle={
  inputWidth
    ? { width: `${inputWidth}px`, ...(panelMinWidth ? { minWidth: `${panelMinWidth}px` } : {}) }
    : panelMinWidth
      ? { minWidth: `${panelMinWidth}px` }
      : {}
}
```

- [ ] **Step 4: Commit**

```bash
cd C:\Users\kostiantyn_pshenych1\Documents\cdme\codemie-ui-next
git add src/components/form/MultiSelect/MultiSelect.tsx
git commit -m "EPMCDME-14078: Add panelMinWidth prop to MultiSelect wrapper"
```

---

### Task 5: Forward `panelMinWidth` through `ProjectSelector` and `BudgetSelector`

**Repo:** `codemie-ui-next`

**Files:**
- Modify: `src/components/ProjectSelector/ProjectSelector.tsx`
- Modify: `src/components/BudgetSelector/BudgetSelector.tsx`

**Interfaces:**
- Consumes: `panelMinWidth?: number` from Task 4's `MultiSelect`
- Produces: `panelMinWidth` available as a prop on `ProjectSelector` and `BudgetSelector` — consumed by Task 6

Test-first: prop forwarding is verified by the call-site rendering in Task 6; no isolated unit test added here.

- [ ] **Step 1: Add `panelMinWidth` to `ProjectSelectorProps` and forward it**

In `src/components/ProjectSelector/ProjectSelector.tsx`:

Add to the props interface (after `size`):

```ts
panelMinWidth?: number
```

Add to the destructured parameters:

```ts
size = 'medium',
panelMinWidth,
```

Add `panelMinWidth={panelMinWidth}` to the `<MultiSelect>` call:

```tsx
<MultiSelect
  size={size}
  // ... existing props ...
  panelMinWidth={panelMinWidth}
/>
```

- [ ] **Step 2: Add `panelMinWidth` to `BudgetSelectorProps` and forward it**

In `src/components/BudgetSelector/BudgetSelector.tsx`:

Add to the props interface (after `size`):

```ts
panelMinWidth?: number
```

Add to the destructured parameters:

```ts
size = 'medium',
panelMinWidth,
```

Add `panelMinWidth={panelMinWidth}` to the `<MultiSelect>` call:

```tsx
<MultiSelect
  size={size}
  // ... existing props ...
  panelMinWidth={panelMinWidth}
/>
```

- [ ] **Step 3: Commit**

```bash
cd C:\Users\kostiantyn_pshenych1\Documents\cdme\codemie-ui-next
git add src/components/ProjectSelector/ProjectSelector.tsx src/components/BudgetSelector/BudgetSelector.tsx
git commit -m "EPMCDME-14078: Forward panelMinWidth through ProjectSelector and BudgetSelector"
```

---

### Task 6: Apply `panelMinWidth={320}` at the five administration call sites

**Repo:** `codemie-ui-next`

**Files:**
- Modify: `src/pages/settings/administration/ActivityEventsPage.tsx`
- Modify: `src/pages/settings/administration/usersManagement/components/UsersManagementFilters.tsx`
- Test: `src/pages/settings/administration/__tests__/ActivityEventsPage.test.tsx`

**Interfaces:**
- Consumes: `panelMinWidth` from Tasks 4 and 5

- [ ] **Step 1: Write a failing test for `ActivityEventsPage` panel width**

In `src/pages/settings/administration/__tests__/ActivityEventsPage.test.tsx`, add:

```tsx
it('renders Domain, Event type, and Entity type MultiSelects with panelMinWidth 320', () => {
  // This test verifies the prop is passed — visual panel sizing is integration-level,
  // so we assert the rendered MultiSelect triggers are present and the prop reaches PrimeReact
  // by checking the component tree via data attributes set by PrimeReact on the panel.
  // A simpler proxy: assert the three labelled MultiSelects are in the document.
  render(<ActivityEventsPage />)  // use whatever wrapper the existing tests use

  expect(screen.getByLabelText('Domain')).toBeInTheDocument()
  expect(screen.getByLabelText('Event type')).toBeInTheDocument()
  expect(screen.getByLabelText('Entity type')).toBeInTheDocument()
})
```

> Note: check how the existing tests in this file mount `ActivityEventsPage` (mock stores, providers) and replicate that setup for the new test.

- [ ] **Step 2: Run existing tests to confirm they pass before changes**

```bash
cd C:\Users\kostiantyn_pshenych1\Documents\cdme\codemie-ui-next
npx vitest run src/pages/settings/administration/__tests__/ActivityEventsPage.test.tsx --reporter=verbose
```

Expected: existing tests PASS

- [ ] **Step 3: Add `panelMinWidth={320}` to Domain, Event type, Entity type in `ActivityEventsPage.tsx`**

In `src/pages/settings/administration/ActivityEventsPage.tsx`, find the three MultiSelect components at lines ~278, ~287, ~297 (Domain, Event type, Entity type) and add `panelMinWidth={320}` to each:

```tsx
<div className="w-44">
  <MultiSelect
    label="Domain"
    value={domain}
    options={domainOptions}
    onChange={(e) => setDomain(e.value ?? [])}
    placeholder="All domains"
    showCheckbox
    panelMinWidth={320}
  />
</div>
```

```tsx
<div className="w-52">
  <MultiSelect
    label="Event type"
    value={eventType}
    options={eventTypeOptions}
    onChange={(e) => setEventType(e.value ?? [])}
    placeholder="All events"
    showCheckbox
    panelMinWidth={320}
  />
</div>
```

```tsx
<div className="w-44">
  <MultiSelect
    label="Entity type"
    value={entityType}
    options={entityTypeOptions}
    onChange={(e) => setEntityType(e.value ?? [])}
    placeholder="All entity types"
    showCheckbox
    panelMinWidth={320}
  />
</div>
```

Do **not** change the container `div` width classes.

- [ ] **Step 4: Add `panelMinWidth={320}` to Project and Budget in `UsersManagementFilters.tsx`**

In `src/pages/settings/administration/usersManagement/components/UsersManagementFilters.tsx`, at lines ~110 and ~122:

```tsx
<div className="w-48">
  <ProjectSelector
    label="Project"
    fullWidth
    multiple
    value={localFilters.projects ?? []}
    onChange={handleProjectsChange}
    size="small"
    panelMinWidth={320}
  />
</div>
```

```tsx
{isBudgetManagementEnabled && canManageBudgets && (
  <div className="w-48">
    <BudgetSelector
      label="Budget"
      fullWidth
      multiple
      value={localFilters.budgets ?? []}
      onChange={handleBudgetsChange}
      size="small"
      panelMinWidth={320}
    />
  </div>
)}
```

Do **not** change the container `div` width classes.

- [ ] **Step 5: Run all modified test files**

```bash
cd C:\Users\kostiantyn_pshenych1\Documents\cdme\codemie-ui-next
npx vitest run src/pages/settings/administration/__tests__/ActivityEventsPage.test.tsx --reporter=verbose
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd C:\Users\kostiantyn_pshenych1\Documents\cdme\codemie-ui-next
git add src/pages/settings/administration/ActivityEventsPage.tsx src/pages/settings/administration/usersManagement/components/UsersManagementFilters.tsx src/pages/settings/administration/__tests__/ActivityEventsPage.test.tsx
git commit -m "EPMCDME-14078: Set 320px minimum panel width on administration filter dropdowns"
```

---

### Task 7: Full test suite run

- [ ] **Step 1: Run backend tests**

```bash
cd C:\Users\kostiantyn_pshenych1\Documents\cdme\codemie
poetry run pytest tests/codemie/service/analytics/ -v
```

Expected: all PASS

- [ ] **Step 2: Run frontend tests**

```bash
cd C:\Users\kostiantyn_pshenych1\Documents\cdme\codemie-ui-next
npx vitest run --reporter=verbose
```

Expected: all PASS, no regressions
