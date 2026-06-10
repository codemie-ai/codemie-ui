# Integration Test Infrastructure Reference

## Global Setup (setupTests.tsx)

Location: `src/test-utils/setupTests.tsx`

### Global Mocks

**Fetch and API:**
- `global.fetch` → routed to `mockAPI` registry
- Unregistered endpoints → return `null` with status 200

**Router:**
- `useNavigate` / `useVueRouter` → `mockRouterState` spy
- `mockRouterState.push` → tracks navigation calls
- Reset with `mockRouterState.push.mockClear()` in `beforeEach`

**Toasts:**
- `toaster.success` → `vi.fn()`
- `toaster.error` → `vi.fn()`
- `toaster.info` → `vi.fn()`

**Storage:**
- `localStorage` → in-memory mock
- Resets between tests

### Global API Defaults (Auto-Respond)

These endpoints return default responses without explicit `mockAPI` calls:

| Endpoint | Default Response | Notes |
|----------|------------------|-------|
| `v1/llm_models` | `[]` | Empty array |
| `v1/embeddings_models` | `[]` | Empty array |
| `v1/config` | `[]` | Empty array - override with config items as needed |
| `v1/assistants/user` | `[]` | Empty array |
| `v1/assistants/categories` | `[{ id: '1', name: 'Category 1' }, { id: '2', name: 'Category 2' }, { id: '3', name: 'Category 3' }]` | 3 default categories |
| `v1/user` | `{ applications: [] }` | ⚠️ **Missing id, name, username** - add explicit mock if needed |
| Others | `null` | Status 200 |

### Important Gotcha: v1/user

The default `v1/user` response is incomplete:
```typescript
// Default (insufficient for most flows):
{ applications: [] }

// What you probably need:
mockAPI('GET', 'v1/user', {
  id: 'user-123',
  name: 'Test User',
  username: 'testuser',
  email: 'test@example.com',
  applications: []
})
```

**Symptom**: Tests fail with "Cannot read property 'id' of undefined" or similar when accessing `user.id`.

**Fix**: Add explicit `mockAPI('GET', 'v1/user', {...})` in your test setup with complete user object.

---

## 🔍 SYSTEMATIC INVESTIGATION (When Tests Fail)

When a test fails, follow this checklist to diagnose the issue:

### Button/Element Not Found

**Symptom**: `Unable to find an element with the role "button" and name "Export options"`

**Investigation**:
```bash
# 1. Find the actual component
grep -rn "Export" src/components/

# 2. Read the component for actual aria-label
grep -n "aria-label" src/components/NavigationMore.tsx

# 3. Common findings:
# - Button is named differently: "More options" not "Export options"
# - Dynamic labels: `aria-label="Like ${name}, ${count}"`
# - Role is different: `role="menuitem"` not `role="button"`
```

**Fix**: Use exact aria-label from component. Use `findByRole` for dynamic content.

### Button Doesn't Render

**Symptom**: Button exists in component but test can't find it

**Investigation**:
```bash
# 1. Check for conditional rendering
grep -n "isVisible\|isEnabled\|useFeatureFlag" src/components/Component.tsx

# 2. Common patterns:
# - Feature flag: isConfigItemEnabled('features:pinnedAssistants')
# - Prop-based: isVisible={someCondition}
# - Hook-based: const { isEnabled } = useFeatureFlag('feature-name')
```

**Fix**: Add required config mock:
```typescript
mockAPI('GET', 'v1/config', [{
  id: 'features:pinnedAssistants',
  settings: { enabled: true }
}])
```

### Menu Item Missing

**Symptom**: Menu opens but specific item doesn't appear

**Investigation**:
```bash
# 1. Check ability requirements
grep -n "canDelete\|canEdit\|canView" src/components/AssistantActions.tsx

# 2. Read utils/entity.ts to understand checks
grep -n "canDelete\|canEdit" src/utils/entity.ts

# 3. Common pattern:
# canDelete checks for 'delete' in user_abilities array
```

**Fix**: Update fixture with required abilities:
```typescript
createFixture({ 
  user_abilities: ['read', 'write', 'delete'] // Add 'delete'
})
```

### API Mock Not Working

**Symptom**: `Expected fetch to have been called` fails, or runtime error after API call

**Investigation**:
```bash
# 1. Find the store method
grep -n "reactToAssistant\|likeAssistant" src/store/assistants.ts

# 2. Read response parsing
# Look for: .then(result => result.FIELD_NAME)

# 3. Common issue: Mock structure doesn't match what store expects
```

**Example**:
```typescript
// Store code:
.then(result => {
  assistant.like_count = result.like_count  // Expects like_count
  assistant.dislike_count = result.dislike_count
})

// Fix mock to match:
mockAPI('POST', 'v1/.../reactions', {
  like_count: 1,        // ✅ Matches store expectation
  dislike_count: 0
  // NOT: unique_likes_count (wrong field name)
})
```

### Unexpected Behavior (Confirmation/No Confirmation)

**Symptom**: Test expects confirmation dialog but doesn't appear (or vice versa)

**Investigation**:
```bash
# Read the actual handler - don't assume symmetric behavior
grep -n "handlePinToggle\|handleFavoriteToggle" src/components/Component.tsx
```

**Common pattern**:
```typescript
// Asymmetric: confirmation only on REMOVE
const handleToggle = () => {
  if (isPinned) {
    setShowConfirmation(true)  // Confirms when removing
  } else {
    directAction()  // No confirmation when adding
  }
}
```

**Fix**: Test the ACTUAL flow, not assumed flow.

---

## ❌ ANTI-PATTERNS (NEVER DO THESE)

### 1. NEVER Initialize Stores Directly in Tests

❌ **WRONG**:
```typescript
beforeEach(() => {
  userStore.user = { id: 'user-123', name: 'Test' }
  appInfoStore.configs = []
  assistantsStore.assistants = []
})
```

✅ **CORRECT**:
```typescript
beforeEach(() => {
  mockRouterState.push.mockClear()
  mockRouterState.replace.mockClear()
  // That's it! Let renderPage + mockAPI handle stores
})
```

**Why**: `renderPage` wraps `<App />` which runs `useInitialDataFetch()`. This hook calls `userStore.loadUser()`, `appInfoStore.fetchCustomerConfig()`, etc. Manual store assignment gets overwritten or prevents the page from rendering.

**Symptom**: Test renders auth/login screen instead of the actual page content.

### 2. Mock Only APIs Your Test Actually Needs

**Pattern**: Mock the APIs that your specific test flow requires. Don't blindly mock everything.

✅ **CORRECT** - Mock what you need:
```typescript
// Test loads assistants list
mockAPI('GET', 'v1/config', [])
mockAPI('GET', 'v1/assistants', {...})
mockAPI('GET', 'v1/user/reactions', { items: [] })
// Note: v1/user NOT mocked - default is sufficient

renderPage('/assistants/project')
```

✅ **CORRECT** - Mock v1/user when test needs specific user data:
```typescript
// Test loads favorites (needs user.userId)
mockAPI('GET', 'v1/config', [{ id: 'features:favorites', settings: { enabled: true } }])
mockAPI('GET', 'v1/user', {  // NOW we need this
  user_id: 'test-user-id',
  name: 'Test User',
  username: 'testuser',
  applications: []
})
mockAPI('GET', 'v1/preferences/test-user-id/favorites/assistants', {...})

renderPage('/assistants/favorites')
```

**Why**: `useInitialDataFetch` calls multiple APIs, but setupTests.tsx provides defaults for most (like v1/user → `{ applications: [] }`). Only mock when you need specific data or the default breaks your test.

### 3. Sample Existing Tests First

❌ **WRONG**: Writing tests without checking if similar tests already exist

✅ **CORRECT**: Before writing any test, check `src/pages/[target]/__tests__/*.integration.test.tsx` and read one existing test to learn the pattern.

**Why**: Existing working tests show you project-specific infrastructure patterns (how renderPage works, which APIs to mock, beforeEach setup, etc.)

---

## renderPage Lifecycle (CRITICAL)

**What renderPage actually does**:

```
renderPage(path) →
  1. Wraps <App /> (not just page component)
  2. App runs useInitialDataFetch() hook on mount
  3. Hook fetches:
     - v1/user (loads user data)
     - v1/config (loads customer config)
     - v1/preferences/{userId} (loads user preferences)
     - v1/assistants/pinned (loads pinned assistants)
     - Various other initialization calls
  4. Stores populated via API responses
  5. App checks if user exists → renders <Outlet /> if yes
```

**RULE**: NEVER set stores directly. ALWAYS mock the APIs that populate them.

**Common Pitfall**:
```typescript
// ❌ This gets overwritten by useInitialDataFetch
userStore.user = { id: 'user-123', ... }
renderPage('/page')
// useInitialDataFetch calls userStore.loadUser() → overwrites your user

// ✅ This works
mockAPI('GET', 'v1/user', { user_id: 'user-123', ... })
renderPage('/page')
// useInitialDataFetch calls userStore.loadUser() → uses your mock
```

---

## mockAPI Helper

Location: `src/test-utils/integration.ts`

### Basic Usage

```typescript
import { mockAPI } from '@/test-utils/integration'

// GET request
mockAPI('GET', 'v1/endpoint', { data: [...] })

// POST request
mockAPI('POST', 'v1/endpoint', { id: 'new-123' })

// PUT request
mockAPI('PUT', 'v1/endpoint/123', { updated: true })

// DELETE request
mockAPI('DELETE', 'v1/endpoint/123', null)
```

### With Query Parameters (Exact Match)

Pass query params as **4th argument** (object):

```typescript
mockAPI('GET', 'v1/assistants', 
  { data: [...], pagination: {...} },
  { category: 'coding', page: '0' }
)

// Matches:     v1/assistants?category=coding&page=0
// Not matches: v1/assistants?category=coding&page=1
// Not matches: v1/assistants (no query params)
```

**Order doesn't matter**: `?category=coding&page=0` = `?page=0&category=coding`

### Error Responses

Pass status code as **4th argument** (number):

```typescript
// 422 Unprocessable Entity
mockAPI('POST', 'v1/endpoint', 
  { error: { message: 'Validation failed' } },
  422
)

// 500 Internal Server Error
mockAPI('GET', 'v1/endpoint', 
  { error: 'Server error' },
  500
)

// 401 Unauthorized
mockAPI('POST', 'v1/login',
  { error: 'Invalid credentials' },
  401
)
```

**With query params AND status:**
```typescript
mockAPI('GET', 'v1/endpoint',
  { error: 'Not found' },
  { id: 'invalid' },  // Query params
  404                 // Status (now 5th arg)
)
```

### Network Errors

To simulate network failure (no response):

```typescript
vi.spyOn(global, 'fetch').mockRejectedValueOnce(
  new Error('Network request failed')
)
```

---

## renderPage Helper

Location: `src/test-utils/integration.ts`

### Usage

```typescript
import { renderPage } from '@/test-utils/integration'

// Render route without params
renderPage('/assistants')

// Render route with params (passed as part of path)
renderPage('/assistants/asst-123/edit')

// Render route with query params
renderPage('/assistants?category=coding&page=1')
```

### What it Does

1. Sets up router with MemoryRouter at given path
2. Wraps app with all necessary providers (Router, Stores, etc.)
3. Renders app into Testing Library container
4. Returns Testing Library queries (screen.getBy*, etc.)

### Waiting for Initial Load

If page has `useEffect` data fetching:

```typescript
renderPage('/page')

// Wait for content to appear
await waitFor(() => {
  expect(screen.getByRole('heading', { name: /page title/i }))
    .toBeInTheDocument()
})
```

---

## mockRouterState

Location: `src/hooks/__mocks__/useVueRouter.ts`

### Usage

```typescript
import { mockRouterState } from '@/hooks/__mocks__/useVueRouter'

// Reset before each test
beforeEach(() => {
  mockRouterState.push.mockClear()
})

// Check navigation occurred
await waitFor(() => {
  expect(mockRouterState.push).toHaveBeenCalled()
})

// Check specific route
expect(mockRouterState.push).toHaveBeenCalledWith(
  expect.objectContaining({
    name: 'route-name'
  })
)

// Check route with params
expect(mockRouterState.push).toHaveBeenCalledWith(
  expect.objectContaining({
    name: 'route-name',
    params: expect.objectContaining({
      id: 'value-123'
    })
  })
)

// Check NOT called
expect(mockRouterState.push).not.toHaveBeenCalled()
```

---

## Testing Library Queries

### Priority Order (Use in This Order)

1. **`getByRole`** (most accessible)
   ```typescript
   screen.getByRole('button', { name: /save/i })
   screen.getByRole('heading', { name: /page title/i })
   screen.getByRole('textbox', { name: /username/i })
   ```

2. **`findByRole`** (async, for elements that appear after render)
   ```typescript
   await screen.findByRole('alert', { name: /success/i })
   ```

3. **`getByLabelText`** (for form inputs)
   ```typescript
   screen.getByLabelText(/email address/i)
   ```

4. **`getByText`** (for static text)
   ```typescript
   screen.getByText(/welcome back/i)
   ```

5. **`getByTestId`** (last resort - only when no semantic option)
   ```typescript
   screen.getByTestId('custom-component')
   ```

### get vs query vs find

| Query | Returns | Throws if not found? | Async? |
|-------|---------|----------------------|--------|
| `getBy*` | Element | ✅ Yes (test fails) | ❌ No |
| `queryBy*` | Element or null | ❌ No | ❌ No |
| `findBy*` | Promise<Element> | ✅ Yes (after timeout) | ✅ Yes |

**When to use:**
- `getBy*` - Element should be present immediately
- `queryBy*` - Checking element is NOT present
- `findBy*` - Element appears after async operation

---

## userEvent

Location: `@testing-library/user-event`

### Setup

```typescript
import userEvent from '@testing-library/user-event'

const user = userEvent.setup()
```

### Common Interactions

```typescript
// Click
await user.click(element)

// Type text
await user.type(input, 'text to type')

// Clear and type
await user.clear(input)
await user.type(input, 'new text')

// Select dropdown option
await user.selectOptions(select, 'option-value')

// Check/uncheck checkbox
await user.click(checkbox) // Toggles

// Tab navigation
await user.tab()

// Keyboard shortcuts
await user.keyboard('{Enter}')
await user.keyboard('{Escape}')
```

---

## waitFor

Location: `@testing-library/react`

### Usage

```typescript
import { waitFor } from '@testing-library/react'

// Wait for condition to be true
await waitFor(() => {
  expect(element).toBeInTheDocument()
})

// Custom timeout (default 1000ms)
await waitFor(() => {
  expect(element).toBeInTheDocument()
}, { timeout: 3000 })
```

### When to Use

✅ **Use waitFor:**
- After async operations (API calls, navigation)
- When checking for element that appears after delay
- When checking store state after async update
- After user interaction that triggers async code

❌ **Don't use waitFor:**
- Checking element is immediately present after render
- Checking element is NOT present (use `queryBy*` directly)

---

## Common Patterns

### Test User Login Flow

```typescript
it('logs in user and navigates to dashboard', async () => {
  const user = userEvent.setup()
  
  mockAPI('POST', 'v1/auth/login', {
    token: 'abc123',
    user: { id: 'user-1', name: 'Test User' }
  })
  
  renderPage('/login')
  
  await user.type(screen.getByLabelText(/email/i), 'test@example.com')
  await user.type(screen.getByLabelText(/password/i), 'password123')
  await user.click(screen.getByRole('button', { name: /log in/i }))
  
  await waitFor(() => {
    expect(mockRouterState.push).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'dashboard' })
    )
  })
})
```

### Test List Loading

```typescript
it('loads and displays assistant list', async () => {
  mockAPI('GET', 'v1/assistants', {
    data: [
      { id: '1', name: 'Assistant 1' },
      { id: '2', name: 'Assistant 2' }
    ],
    pagination: { total: 2, page: 0 }
  })
  
  renderPage('/assistants')
  
  await waitFor(() => {
    expect(screen.getByText('Assistant 1')).toBeInTheDocument()
    expect(screen.getByText('Assistant 2')).toBeInTheDocument()
  })
})
```

### Test Error Handling

```typescript
it('shows error toast on API failure', async () => {
  const user = userEvent.setup()
  
  mockAPI('POST', 'v1/assistants',
    { error: { message: 'Name already exists' } },
    422
  )
  
  renderPage('/assistants/new')
  
  await user.type(screen.getByLabelText(/name/i), 'Duplicate Name')
  await user.click(screen.getByRole('button', { name: /save/i }))
  
  await waitFor(() => {
    expect(screen.getByText(/name already exists/i)).toBeInTheDocument()
  })
  
  // Verify no navigation
  expect(mockRouterState.push).not.toHaveBeenCalled()
})
```

### Test Modal Flow

```typescript
it('opens edit modal and saves changes', async () => {
  const user = userEvent.setup()
  
  mockAPI('GET', 'v1/assistants', {
    data: [{ id: '1', name: 'Old Name' }]
  })
  mockAPI('PUT', 'v1/assistants/1', {
    id: '1',
    name: 'New Name'
  })
  
  renderPage('/assistants')
  
  await waitFor(() => {
    expect(screen.getByText('Old Name')).toBeInTheDocument()
  })
  
  await user.click(screen.getByRole('button', { name: /edit old name/i }))
  
  await waitFor(() => {
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
  
  const nameInput = screen.getByLabelText(/name/i)
  await user.clear(nameInput)
  await user.type(nameInput, 'New Name')
  await user.click(screen.getByRole('button', { name: /save/i }))
  
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('New Name')).toBeInTheDocument()
  })
})
```
