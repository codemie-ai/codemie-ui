# Test Completeness Checklist

> **Purpose**: Prevent incomplete tests by ensuring every user flow is tested end-to-end with full UI verification.

---

## Core Principle: Test the Complete User-Observable Outcome

**❌ Incomplete test** (only checks API):
```tsx
it('likes a skill', async () => {
  await user.click(likeButton)
  
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining('v1/skills/skill-1/reactions'),
    expect.objectContaining({ method: 'POST' })
  )
})
```

**✅ Complete test** (checks API + UI reaction):
```tsx
it('likes a skill and updates button state', async () => {
  await user.click(screen.getByRole('button', { name: 'Like 5' }))
  
  // 1. Verify API called
  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('v1/skills/skill-1/reactions'),
      expect.objectContaining({ method: 'POST' })
    )
  })
  
  // 2. Verify UI updated
  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'Remove like 6' }))
      .toBeInTheDocument()
  })
  expect(screen.queryByRole('button', { name: 'Like 5' }))
    .not.toBeInTheDocument()
})
```

---

## Mandatory Verification Layers

For EVERY user action test, verify **all observable outcomes**:

### Layer 1: API Called ✅
```tsx
expect(global.fetch).toHaveBeenCalledWith(
  expect.stringContaining('v1/endpoint'),
  expect.objectContaining({ method: 'POST' })
)
```

### Layer 2: UI Updated ✅
```tsx
// Button state changed
await waitFor(() => {
  expect(screen.getByRole('button', { name: 'New State' }))
    .toBeInTheDocument()
})

// Count updated
expect(screen.getByText('6')).toBeInTheDocument()
expect(screen.queryByText('5')).not.toBeInTheDocument()

// Icon changed (via aria-label)
const button = screen.getByRole('button', { name: /favorite/i })
expect(button).toHaveAttribute('aria-label', 'Remove from favorites')
```

### Layer 3: Navigation Occurred (if applicable) ✅
```tsx
expect(mockRouterState.push).toHaveBeenCalledWith(
  expect.objectContaining({
    name: 'skill-details',
    params: { id: 'skill-1' }
  })
)
```

### Layer 4: Toast/Message Shown (if applicable) ✅
```tsx
await waitFor(() => {
  expect(screen.getByText('Skill published successfully'))
    .toBeInTheDocument()
})
```

### Layer 5: Modal State Changed (if applicable) ✅
```tsx
// Modal closed after action
await waitFor(() => {
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

// Or modal opened
expect(screen.getByRole('dialog')).toBeInTheDocument()
expect(screen.getByText('Confirm Delete')).toBeInTheDocument()
```

---

## Common Incomplete Patterns (ALWAYS FIX)

### ❌ Pattern 1: Test Stops After API Verification
```tsx
it('publishes skill', async () => {
  await user.click(publishButton)
  
  // Test ends here - incomplete!
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining('marketplace/publish'),
    expect.anything()
  )
})
```

**✅ Fix**: Add UI outcome verification
```tsx
it('publishes skill and updates visibility badge', async () => {
  await user.click(publishButton)
  
  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('marketplace/publish'),
      expect.anything()
    )
  })
  
  // Verify UI shows "PUBLIC" badge
  await waitFor(() => {
    expect(screen.getByText('PUBLIC')).toBeInTheDocument()
  })
  
  // Verify kebab menu updated
  const moreButton = screen.getByRole('button', { name: 'More options' })
  await user.click(moreButton)
  expect(screen.getByRole('menuitem', { name: 'Remove from Marketplace' }))
    .toBeInTheDocument()
})
```

---

### ❌ Pattern 2: Modal Test Stops After Opening
```tsx
it('opens publish modal', async () => {
  await user.click(publishButton)
  
  // Test ends here - incomplete!
  expect(screen.getByRole('dialog')).toBeInTheDocument()
})
```

**✅ Fix**: Complete the modal flow
```tsx
it('publishes skill through modal', async () => {
  await user.click(screen.getByRole('menuitem', { name: 'Publish to Marketplace' }))
  
  // Modal opened
  await waitFor(() => {
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
  
  // Select category
  await user.click(screen.getByRole('checkbox', { name: 'Coding' }))
  
  // Submit
  await user.click(screen.getByRole('button', { name: 'Publish' }))
  
  // Verify API called
  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('marketplace/publish'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('coding')
      })
    )
  })
  
  // Verify modal closed
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
  
  // Verify success toast
  expect(screen.getByText('Skill published successfully'))
    .toBeInTheDocument()
})
```

---

### ❌ Pattern 3: No Error Path Tests
```tsx
describe('Delete Skill', () => {
  it('deletes skill successfully', async () => {
    // Only happy path tested
  })
  // Missing: Error cases
})
```

**✅ Fix**: Add error scenarios
```tsx
describe('Delete Skill', () => {
  it('deletes skill successfully', async () => {
    // ... happy path ...
  })
  
  it('shows error toast when delete fails', async () => {
    mockAPI('DELETE', 'v1/skills/skill-1', 
      { error: { message: 'Skill is in use' } }, 
      409
    )
    
    // ... trigger delete ...
    
    await waitFor(() => {
      expect(screen.getByText('Skill is in use')).toBeInTheDocument()
    })
    
    // Verify skill still exists in list
    expect(screen.getByText('My Skill')).toBeInTheDocument()
  })
})
```

---

## Test Coverage Checklist (Run Before Completing)

After writing tests, verify this checklist for **each user flow**:

### For Every User Action (click, type, submit):
- [ ] **API called** with correct method/URL/body
- [ ] **UI updated** (button state, count, badge, icon, text)
- [ ] **Navigation occurred** (if expected)
- [ ] **Toast/message shown** (if expected)
- [ ] **Modal state changed** (opened/closed if expected)
- [ ] **Error path tested** (at least one API error scenario)

### For Every Feature/Section:
- [ ] **Empty state tested** (no items)
- [ ] **Loading state tested** (if visible)
- [ ] **Permission-based rendering** (with/without write access)
- [ ] **Feature flag conditional** (enabled/disabled if applicable)
- [ ] **Filter/search tested** (if applicable)
- [ ] **Pagination tested** (if applicable)
- [ ] **Sorting tested** (if applicable)

### For Every Modal/Dialog:
- [ ] **Opens correctly** (trigger → dialog visible)
- [ ] **Form submission** (input → submit → API → close)
- [ ] **Cancellation** (close button → dialog hidden)
- [ ] **Error handling** (API error → error message in modal)
- [ ] **Success outcome** (toast/navigation after modal closes)

---

## Red Flags (These Always Mean Incomplete Test)

| Red Flag | What It Means | How to Fix |
|----------|---------------|------------|
| Test name says "opens modal" | Only half the flow | Test full "creates X through modal" flow |
| Test name says "calls API" | Implementation detail | Test "updates Y and shows Z" outcome |
| Only `expect(fetch).toHaveBeenCalled` | Missing UI verification | Add `waitFor` checks for UI changes |
| No error path tests | Only happy path | Add at least one 4xx/5xx error test |
| Modal test has no submit | Modal opened but not used | Complete the form submission flow |
| "Copy link" test missing | Common action ignored | Add clipboard API test |
| No empty state test | Only tested with data | Add zero-results scenario |

---

## Examples: Before/After

### ❌ Before: Incomplete
```tsx
it('navigates to skill details', async () => {
  await user.click(screen.getByText('My Skill'))
  
  expect(mockRouterState.push).toHaveBeenCalled()
})
```

### ✅ After: Complete
```tsx
it('navigates to skill details with correct params', async () => {
  await user.click(screen.getByText('My Skill'))
  
  expect(mockRouterState.push).toHaveBeenCalledWith(
    expect.objectContaining({
      name: 'skill-details',
      params: expect.objectContaining({ id: 'skill-1' })
    })
  )
})
```

---

### ❌ Before: Stops at API
```tsx
it('removes favorite', async () => {
  await user.click(unfavoriteButton)
  await user.click(confirmButton)
  
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining('v1/preferences'),
    expect.objectContaining({ method: 'PUT' })
  )
})
```

### ✅ After: Verifies UI Update
```tsx
it('removes favorite and updates star icon', async () => {
  await user.click(screen.getByRole('button', { name: 'Remove from favorites' }))
  await user.click(screen.getByRole('button', { name: 'Remove' }))
  
  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('v1/preferences'),
      expect.objectContaining({ method: 'PUT' })
    )
  })
  
  // Verify button changed to "Add to favorites"
  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'Add to favorites' }))
      .toBeInTheDocument()
  })
  expect(screen.queryByRole('button', { name: 'Remove from favorites' }))
    .not.toBeInTheDocument()
})
```

---

## When to Skip UI Verification (Rare Exceptions)

Only skip UI verification when:

1. **Background job triggered** (user doesn't see immediate result)
   ```tsx
   it('triggers background sync', async () => {
     await user.click(syncButton)
     
     expect(global.fetch).toHaveBeenCalledWith(
       expect.stringContaining('v1/sync/start'),
       expect.anything()
     )
     // No immediate UI change expected
   })
   ```

2. **Navigation to external URL** (can't verify next page in test)
   ```tsx
   it('opens documentation in new tab', async () => {
     const link = screen.getByRole('link', { name: 'View Docs' })
     expect(link).toHaveAttribute('href', 'https://docs.example.com')
     expect(link).toHaveAttribute('target', '_blank')
   })
   ```

**For 99% of tests, you SHOULD verify UI updates.**

---

## Implementation Reminder

When writing tests:
1. Write the user action (click, type, submit)
2. Verify API called
3. **IMMEDIATELY verify UI updated** - don't stop at API verification
4. Add error path variant
5. Check this checklist before moving to next test
