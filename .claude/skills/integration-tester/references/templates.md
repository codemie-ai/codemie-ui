# Integration Test Structure Template

## Fixture Factory Pattern

Always type fixture overrides with `Partial<EntityType>` — never `Record<string, any>`:

```typescript
import type { MyEntity } from '@/types/entity/my-entity'

const createMyEntityFixture = (overrides: Partial<MyEntity> = {}): MyEntity => ({
  id: 'entity-1',
  name: 'Test Entity',
  status: 'Active',
  // ...all required fields with sensible defaults
  ...overrides,
})
```

**Why**: `Partial<EntityType>` gives IDE completion on override keys and catches typos at compile time. `Record<string, any>` silently accepts invalid keys.

---

## Standard Flow Test

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderPage } from '@/test-utils/integration'
import { mockAPI } from '@/test-utils/integration'
import { mockRouterState } from '@/hooks/__mocks__/useVueRouter'

describe('[ComponentName] - [Action Description]', () => {
  const user = userEvent.setup()
  
  beforeEach(() => {
    // Reset navigation spy
    mockRouterState.push.mockClear()
  })

  it('[describes the complete flow in user terms]', async () => {
    // SETUP: Mock all preconditions
    // Based on flow.preconditions - ensure state needed for flow to start
    mockAPI('GET', 'v1/user', { 
      id: 'user-123', 
      name: 'Test User',
      applications: [] 
    })
    mockAPI('GET', 'v1/assistants/categories', [
      { id: '1', name: 'Category 1' }
    ])
    
    // SETUP: Mock all API endpoints in data path
    // Based on flow.data_path - find all API calls
    mockAPI('POST', 'v1/chats/start', {
      id: 'chat-123',
      assistant_id: 'asst-456',
      created_at: '2024-01-01T00:00:00Z'
    })
    
    // RENDER
    renderPage('/assistants')
    
    // Wait for initial load (if page has useEffect fetches)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /assistants/i }))
        .toBeInTheDocument()
    })
    
    // EXECUTE: Trigger the entry point
    // Based on flow.entry - find element and interact
    const startButton = screen.getByRole('button', { name: /start chat/i })
    await user.click(startButton)
    
    // VERIFY: All state changes and UI updates
    // Based on flow.state_changes - check EACH one
    
    // 1. Check API was called correctly
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('v1/chats/start'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ assistant_id: 'asst-456' })
      })
    )
    
    // 2. Check navigation occurred (specific route + params)
    await waitFor(() => {
      expect(mockRouterState.push).toHaveBeenCalled()
    })
    expect(mockRouterState.push).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'new-chat',
        params: expect.objectContaining({ id: 'chat-123' })
      })
    )
    
    // 3. Check user-visible UI changes
    await waitFor(() => {
      expect(screen.getByText(/chat started/i)).toBeInTheDocument()
    })
    
    // 4. Check store state (if accessible)
    // const snapshot = useSnapshot(chatsStore)
    // expect(snapshot.currentChat.id).toBe('chat-123')
  })
})
```

---

## Error Path Test

```typescript
describe('[ComponentName] - [Action Description] - Error Handling', () => {
  const user = userEvent.setup()
  
  it('shows error message when API returns 422', async () => {
    // SETUP: Mock preconditions (same as success path)
    mockAPI('GET', 'v1/user', { id: 'user-123', applications: [] })
    
    // SETUP: Mock API with error response
    mockAPI('POST', 'v1/chats/start', 
      { error: { message: 'Invalid assistant ID' } },
      422  // Status code as 4th argument
    )
    
    // RENDER
    renderPage('/assistants')
    
    // EXECUTE
    const startButton = screen.getByRole('button', { name: /start chat/i })
    await user.click(startButton)
    
    // VERIFY: Error handling
    // 1. No navigation occurred
    expect(mockRouterState.push).not.toHaveBeenCalled()
    
    // 2. Error toast/message shown
    await waitFor(() => {
      expect(screen.getByText(/invalid assistant id/i)).toBeInTheDocument()
    })
  })
  
  it('shows error message when network fails', async () => {
    // SETUP
    mockAPI('GET', 'v1/user', { id: 'user-123', applications: [] })
    
    // Mock fetch to throw network error
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(
      new Error('Network request failed')
    )
    
    // RENDER
    renderPage('/assistants')
    
    // EXECUTE
    const startButton = screen.getByRole('button', { name: /start chat/i })
    await user.click(startButton)
    
    // VERIFY
    await waitFor(() => {
      expect(screen.getByText(/failed to connect/i)).toBeInTheDocument()
    })
  })
})
```

---

## Conditional Rendering Test

```typescript
describe('[ComponentName] - Feature Flag Conditional', () => {
  it('shows edit button when feature enabled', async () => {
    // SETUP: Mock config with feature enabled
    mockAPI('GET', 'v1/config', [
      { configItem: 'feature_edit_enabled', value: 'true' }
    ])
    
    // RENDER
    renderPage('/page')
    
    // VERIFY: Button visible
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit/i }))
        .toBeInTheDocument()
    })
  })
  
  it('hides edit button when feature disabled', async () => {
    // SETUP: Mock config with feature disabled
    mockAPI('GET', 'v1/config', [
      { configItem: 'feature_edit_enabled', value: 'false' }
    ])
    
    // RENDER
    renderPage('/page')
    
    // VERIFY: Button not visible
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /edit/i }))
        .not.toBeInTheDocument()
    })
  })
})
```

---

## Form Submission Test

```typescript
describe('[ComponentName] - Submit Form', () => {
  const user = userEvent.setup()
  
  it('submits form and shows success message', async () => {
    // SETUP
    mockAPI('GET', 'v1/user', { id: 'user-123', applications: [] })
    mockAPI('POST', 'v1/providers', {
      id: 'provider-789',
      name: 'New Provider',
      type: 'openai'
    })
    
    // RENDER
    renderPage('/providers/new')
    
    // EXECUTE: Fill form
    const nameInput = screen.getByLabelText(/name/i)
    const typeSelect = screen.getByLabelText(/type/i)
    const submitButton = screen.getByRole('button', { name: /save/i })
    
    await user.type(nameInput, 'New Provider')
    await user.selectOptions(typeSelect, 'openai')
    await user.click(submitButton)
    
    // VERIFY: API called with form data
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('v1/providers'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          name: 'New Provider',
          type: 'openai'
        })
      })
    )
    
    // VERIFY: Success feedback
    await waitFor(() => {
      expect(screen.getByText(/provider added successfully/i))
        .toBeInTheDocument()
    })
    
    // VERIFY: Navigation
    await waitFor(() => {
      expect(mockRouterState.push).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'providers-list' })
      )
    })
  })
  
  it('shows validation error for empty name', async () => {
    // SETUP
    mockAPI('GET', 'v1/user', { id: 'user-123', applications: [] })
    
    // RENDER
    renderPage('/providers/new')
    
    // EXECUTE: Submit without filling required field
    const submitButton = screen.getByRole('button', { name: /save/i })
    await user.click(submitButton)
    
    // VERIFY: Validation error shown, no API call
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    })
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('v1/providers'),
      expect.anything()
    )
  })
})
```

---

## Modal/Popup Test

```typescript
describe('[ComponentName] - Open Modal and Confirm', () => {
  const user = userEvent.setup()
  
  it('opens delete confirmation modal and deletes on confirm', async () => {
    // SETUP
    mockAPI('GET', 'v1/user', { id: 'user-123', applications: [] })
    mockAPI('GET', 'v1/providers', [
      { id: 'provider-1', name: 'Provider 1', type: 'openai' }
    ])
    mockAPI('DELETE', 'v1/providers/provider-1', null)
    
    // RENDER
    renderPage('/providers')
    
    // Wait for list to load
    await waitFor(() => {
      expect(screen.getByText('Provider 1')).toBeInTheDocument()
    })
    
    // EXECUTE: Click delete button
    const deleteButton = screen.getByRole('button', { name: /delete provider 1/i })
    await user.click(deleteButton)
    
    // VERIFY: Modal opens
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
    })
    
    // EXECUTE: Confirm deletion
    const confirmButton = screen.getByRole('button', { name: /confirm/i })
    await user.click(confirmButton)
    
    // VERIFY: API called
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('v1/providers/provider-1'),
      expect.objectContaining({ method: 'DELETE' })
    )
    
    // VERIFY: Modal closes
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    
    // VERIFY: Item removed from list
    await waitFor(() => {
      expect(screen.queryByText('Provider 1')).not.toBeInTheDocument()
    })
  })
})
```

---

## Context Menu Test

```typescript
import { clickMenuOption } from '@/test-utils/component-interactions'

describe('[ComponentName] - Context Menu Actions', () => {
  const user = userEvent.setup()
  
  it('opens context menu and triggers action', async () => {
    // SETUP
    mockAPI('GET', 'v1/items', [
      { id: 'item-1', name: 'Test Item' }
    ])
    mockAPI('POST', 'v1/items/item-1/duplicate', {
      id: 'item-2', name: 'Test Item (Copy)'
    })
    
    // RENDER
    renderPage('/items')
    
    // Wait for item to load
    await waitFor(() => {
      expect(screen.getByText('Test Item')).toBeInTheDocument()
    })
    
    // EXECUTE: Open menu and click option
    await clickMenuOption('More options', 'Duplicate', user)
    
    // VERIFY: API called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('v1/items/item-1/duplicate'),
        expect.objectContaining({ method: 'POST' })
      )
    })
    
    // VERIFY: New item appears
    await waitFor(() => {
      expect(screen.getByText('Test Item (Copy)')).toBeInTheDocument()
    })
  })
  
  it('opens context menu with custom timeout', async () => {
    // SETUP
    mockAPI('GET', 'v1/items', [{ id: 'item-1', name: 'Test Item' }])
    
    // RENDER
    renderPage('/items')
    
    // EXECUTE: With custom timeout
    await clickMenuOption('Actions', 'Edit', user, { timeout: 5000 })
    
    // VERIFY: Navigation to edit page
    expect(mockRouterState.push).toHaveBeenCalledWith(
      expect.objectContaining({ 
        name: 'edit-item',
        params: { id: 'item-1' }
      })
    )
  })
})
```

---

## Query Parameter Test

```typescript
describe('[ComponentName] - Filter by Query Param', () => {
  it('filters list when query param is present', async () => {
    // SETUP: Mock API with query params
    mockAPI('GET', 'v1/assistants', 
      {
        data: [{ id: '1', name: 'Assistant 1', category: 'coding' }],
        pagination: { total: 1, page: 0 }
      },
      { category: 'coding' }  // Query params as 4th arg
    )
    
    // RENDER with query params
    renderPage('/assistants?category=coding')
    
    // VERIFY: API called with query params
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/v1\/assistants\?.*category=coding/),
      expect.anything()
    )
    
    // VERIFY: Filtered results shown
    await waitFor(() => {
      expect(screen.getByText('Assistant 1')).toBeInTheDocument()
    })
  })
})
```

---

## Notes

**When to use `waitFor`:**
- Any async operation (API calls, navigation, async state updates)
- Any UI update triggered by async code
- When you're not sure if element is immediately available

**When NOT to use `waitFor`:**
- Checking that something is NOT in the document (use `queryBy*`)
- Asserting on initial render state (elements present immediately)

**Query selectors priority:**
1. `getByRole` - most accessible, use first
2. `findByRole` - async version of getByRole
3. `getByLabelText` - for form inputs
4. `getByText` - for static text
5. `getByTestId` - only when no semantic option exists
