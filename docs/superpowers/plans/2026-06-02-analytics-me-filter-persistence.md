# Analytics Me Filter Persistence Bug Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix bug where removing project filter incorrectly clears the Me checkbox in Analytics Insights

**Architecture:** Separate Me checkbox state from automatic user validation logic by tracking Me intent explicitly with `meChecked` state, preserving it across `userOptions` reloads while maintaining validation for other users

**Tech Stack:** React, TypeScript, Vitest, React Testing Library

**Test-first:** yes — Each task includes failing test first, then minimal implementation

---

## File Structure

**Modified Files:**
- `src/pages/analytics/components/AnalyticsUserFilter.tsx` - Main bug fix (state management, validation logic)

**New Files:**
- `src/pages/analytics/components/__tests__/AnalyticsUserFilter.test.tsx` - Unit tests for bug scenario

---

## Task 1: Create Test File and First Failing Test

**Files:**
- Create: `src/pages/analytics/components/__tests__/AnalyticsUserFilter.test.tsx`

**Test-first:** yes — Write failing test that reproduces the bug

- [ ] **Step 1: Write the failing test**

Create test file with the bug reproduction scenario:

```typescript
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

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { userStore } from '@/store/user'

import AnalyticsUserFilter from '../AnalyticsUserFilter'

vi.mock('@/store/user', () => ({
  userStore: {
    user: {
      userId: 'user-123',
      username: 'testuser',
      name: 'Test User',
    },
  },
}))

describe('AnalyticsUserFilter', () => {
  const mockOnChange = vi.fn()

  beforeEach(() => {
    mockOnChange.mockClear()
  })

  it('should preserve Me checkbox when userOptions refresh without current user', async () => {
    const user = userEvent.setup()
    const initialOptions = [
      { label: 'Test User', value: 'user-123' },
      { label: 'Other User', value: 'user-456' },
    ]

    const { rerender } = render(
      <AnalyticsUserFilter
        value={[]}
        onChange={mockOnChange}
        userOptions={initialOptions}
        isLoadingOptions={false}
      />
    )

    // Step 1: Enable Me checkbox
    const meCheckbox = screen.getByLabelText('Me')
    await user.click(meCheckbox)

    // Verify Me checkbox is checked and onChange was called with current user
    expect(meCheckbox).toBeChecked()
    expect(mockOnChange).toHaveBeenCalledWith(['user-123'])

    // Step 2: Simulate userOptions refresh without current user (project filter applied)
    const optionsWithoutCurrentUser = [{ label: 'Other User', value: 'user-456' }]

    rerender(
      <AnalyticsUserFilter
        value={['user-123']}
        onChange={mockOnChange}
        userOptions={optionsWithoutCurrentUser}
        isLoadingOptions={false}
      />
    )

    // Bug: Me checkbox gets unchecked because validation effect removes user-123
    // Expected: Me checkbox should stay checked but become disabled
    await waitFor(() => {
      expect(meCheckbox).toBeChecked()
      expect(meCheckbox).toBeDisabled()
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- AnalyticsUserFilter.test`

Expected: FAIL - Test fails because Me checkbox unchecks when userOptions refresh

- [ ] **Step 3: Commit**

```bash
git add src/pages/analytics/components/__tests__/AnalyticsUserFilter.test.tsx
git commit -m 'EPMCDME-12590: Add failing test for Me filter persistence bug'
```

---

## Task 2: Refactor State Management - Add meChecked State

**Files:**
- Modify: `src/pages/analytics/components/AnalyticsUserFilter.tsx:38-42,67-73`

**Test-first:** yes — Test already written, now implement fix

- [ ] **Step 1: Replace isChecked with meChecked state**

Change line 38 from:
```typescript
const [isChecked, setIsChecked] = useState(false)
```

To:
```typescript
const [meChecked, setMeChecked] = useState(false)
```

- [ ] **Step 2: Update checkbox state initialization effect**

Replace lines 67-73 with:
```typescript
// Update checkbox state based on current selection
useEffect(() => {
  if (currentUserId && value) {
    setMeChecked(value.includes(currentUserId))
  }
}, [value, currentUserId])
```

Remove the `value.length === 1` check - Me checkbox should be checked whenever currentUserId is in the value array, regardless of array length.

- [ ] **Step 3: Update checkbox rendering to use meChecked**

Change line 124 from:
```typescript
checked={isChecked}
```

To:
```typescript
checked={meChecked}
```

- [ ] **Step 4: Run tests**

Run: `npm run test:unit -- AnalyticsUserFilter.test`

Expected: Still fails - need to fix validation logic next

- [ ] **Step 5: Commit**

```bash
git add src/pages/analytics/components/AnalyticsUserFilter.tsx
git commit -m 'EPMCDME-12590: Refactor Me checkbox state to meChecked'
```

---

## Task 3: Fix User Validation Logic to Preserve Me Filter

**Files:**
- Modify: `src/pages/analytics/components/AnalyticsUserFilter.tsx:75-87`

**Test-first:** yes — This makes the test pass

- [ ] **Step 1: Update validation effect to preserve currentUserId**

Replace lines 75-87 with:
```typescript
// Filter out users that are no longer in the available options
useEffect(() => {
  // Wait for options to finish loading before validating
  if (isLoadingOptions || !value.length) return

  const availableUserIds = new Set(userOptions.map((option) => option.value))

  // Filter out invalid users, but preserve currentUserId if Me is checked
  const validUserIds = value.filter((userId) => {
    // Always keep currentUserId when Me checkbox is checked
    if (meChecked && userId === currentUserId) return true
    // Remove other users that are no longer available
    return availableUserIds.has(userId)
  })

  // Update the value if some users are no longer available
  if (validUserIds.length !== value.length) {
    onChange(validUserIds)
  }
}, [userOptions, value, onChange, isLoadingOptions, currentUserId, meChecked])
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm run test:unit -- AnalyticsUserFilter.test`

Expected: PASS - Me checkbox now persists when userOptions refresh

- [ ] **Step 3: Commit**

```bash
git add src/pages/analytics/components/AnalyticsUserFilter.tsx
git commit -m 'EPMCDME-12590: Fix validation to preserve currentUserId when Me checked'
```

---

## Task 4: Update toggleCurrentUser Logic

**Files:**
- Modify: `src/pages/analytics/components/AnalyticsUserFilter.tsx:41,89-104`

**Test-first:** yes — Write test first for new toggle behavior

- [ ] **Step 1: Write test for toggle behavior**

Add to `src/pages/analytics/components/__tests__/AnalyticsUserFilter.test.tsx`:

```typescript
it('should add current user to selection when Me is checked', async () => {
  const user = userEvent.setup()
  const options = [
    { label: 'Test User', value: 'user-123' },
    { label: 'Other User', value: 'user-456' },
  ]

  render(
    <AnalyticsUserFilter
      value={['user-456']}
      onChange={mockOnChange}
      userOptions={options}
      isLoadingOptions={false}
    />
  )

  const meCheckbox = screen.getByLabelText('Me')
  await user.click(meCheckbox)

  // Should add current user to existing selection
  expect(mockOnChange).toHaveBeenCalledWith(['user-456', 'user-123'])
})

it('should remove only current user when Me is unchecked', async () => {
  const user = userEvent.setup()
  const options = [
    { label: 'Test User', value: 'user-123' },
    { label: 'Other User', value: 'user-456' },
  ]

  render(
    <AnalyticsUserFilter
      value={['user-123', 'user-456']}
      onChange={mockOnChange}
      userOptions={options}
      isLoadingOptions={false}
    />
  )

  const meCheckbox = screen.getByLabelText('Me')
  await user.click(meCheckbox)

  // Should remove only current user
  expect(mockOnChange).toHaveBeenCalledWith(['user-456'])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- AnalyticsUserFilter.test`

Expected: FAIL - Current toggle logic replaces selection instead of adding

- [ ] **Step 3: Remove previousUsers state**

Delete line 41:
```typescript
const [previousUsers, setPreviousUsers] = useState<string[]>([])
```

- [ ] **Step 4: Replace toggleCurrentUser function**

Replace lines 89-104 with:
```typescript
const toggleCurrentUser = (checked: boolean) => {
  setMeChecked(checked)

  if (checked) {
    // Add current user if not already in selection
    if (!value.includes(currentUserId)) {
      onChange([...value, currentUserId])
    }
  } else {
    // Remove only current user from selection
    onChange(value.filter((id) => id !== currentUserId))
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:unit -- AnalyticsUserFilter.test`

Expected: PASS - All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/pages/analytics/components/AnalyticsUserFilter.tsx src/pages/analytics/components/__tests__/AnalyticsUserFilter.test.tsx
git commit -m 'EPMCDME-12590: Update toggle logic to add/remove current user'
```

---

## Task 5: Add Test for Me Checkbox Re-enabling

**Files:**
- Modify: `src/pages/analytics/components/__tests__/AnalyticsUserFilter.test.tsx`

**Test-first:** yes — Write test to verify Me re-enables when currentUserId returns

- [ ] **Step 1: Write test for Me checkbox re-enabling**

Add to test file:

```typescript
it('should re-enable Me checkbox when currentUserId returns to options', async () => {
  const options = [
    { label: 'Test User', value: 'user-123' },
    { label: 'Other User', value: 'user-456' },
  ]

  const { rerender } = render(
    <AnalyticsUserFilter
      value={['user-123']}
      onChange={mockOnChange}
      userOptions={options}
      isLoadingOptions={false}
    />
  )

  const meCheckbox = screen.getByLabelText('Me')
  expect(meCheckbox).toBeChecked()
  expect(meCheckbox).not.toBeDisabled()

  // Simulate project filter - current user not in project
  rerender(
    <AnalyticsUserFilter
      value={['user-123']}
      onChange={mockOnChange}
      userOptions={[{ label: 'Other User', value: 'user-456' }]}
      isLoadingOptions={false}
    />
  )

  await waitFor(() => {
    expect(meCheckbox).toBeChecked()
    expect(meCheckbox).toBeDisabled()
  })

  // Simulate removing project filter - current user returns
  rerender(
    <AnalyticsUserFilter
      value={['user-123']}
      onChange={mockOnChange}
      userOptions={options}
      isLoadingOptions={false}
    />
  )

  await waitFor(() => {
    expect(meCheckbox).toBeChecked()
    expect(meCheckbox).not.toBeDisabled()
  })
})
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm run test:unit -- AnalyticsUserFilter.test`

Expected: PASS - Test passes because disabled logic already works correctly

- [ ] **Step 3: Commit**

```bash
git add src/pages/analytics/components/__tests__/AnalyticsUserFilter.test.tsx
git commit -m 'EPMCDME-12590: Add test for Me checkbox re-enabling'
```

---

## Task 6: Add Test for Invalid User Cleanup

**Files:**
- Modify: `src/pages/analytics/components/__tests__/AnalyticsUserFilter.test.tsx`

**Test-first:** yes — Verify validation still removes other invalid users

- [ ] **Step 1: Write test for invalid user removal**

Add to test file:

```typescript
it('should still remove other invalid users from selection', async () => {
  const initialOptions = [
    { label: 'User 1', value: 'user-1' },
    { label: 'User 2', value: 'user-2' },
    { label: 'User 3', value: 'user-3' },
  ]

  const { rerender } = render(
    <AnalyticsUserFilter
      value={['user-1', 'user-2', 'user-3']}
      onChange={mockOnChange}
      userOptions={initialOptions}
      isLoadingOptions={false}
    />
  )

  // Simulate options refresh with user-2 no longer available
  const updatedOptions = [
    { label: 'User 1', value: 'user-1' },
    { label: 'User 3', value: 'user-3' },
  ]

  rerender(
    <AnalyticsUserFilter
      value={['user-1', 'user-2', 'user-3']}
      onChange={mockOnChange}
      userOptions={updatedOptions}
      isLoadingOptions={false}
    />
  )

  // Should remove user-2 but keep user-1 and user-3
  await waitFor(() => {
    expect(mockOnChange).toHaveBeenCalledWith(['user-1', 'user-3'])
  })
})
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm run test:unit -- AnalyticsUserFilter.test`

Expected: PASS - Validation still works for other users

- [ ] **Step 3: Commit**

```bash
git add src/pages/analytics/components/__tests__/AnalyticsUserFilter.test.tsx
git commit -m 'EPMCDME-12590: Add test for invalid user cleanup'
```

---

## Task 7: Run Full Test Suite and Type Check

**Files:**
- No file changes

**Test-first:** n/a — Final verification

- [ ] **Step 1: Run all analytics tests**

Run: `npm run test:unit -- src/pages/analytics`

Expected: All tests pass

- [ ] **Step 2: Run TypeScript type check**

Run: `npm run typecheck`

Expected: No type errors

- [ ] **Step 3: Run lint check**

Run: `npm run lint`

Expected: No lint errors (single quotes enforced by ESLint)

- [ ] **Step 4: Commit if any auto-fixes applied**

```bash
git add -A
git commit -m 'EPMCDME-12590: Fix lint issues' || echo "No changes to commit"
```

---

## Task 8: Manual Verification

**Files:**
- No file changes

**Test-first:** n/a — Manual QA

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

Expected: Server starts on http://localhost:5173

- [ ] **Step 2: Navigate to Analytics → Insights**

1. Open http://localhost:5173/analytics
2. Click on "Insights" tab

- [ ] **Step 3: Reproduce original bug scenario**

1. Select a time period
2. Enable "Me" checkbox - verify it checks
3. Select a project where you're not assigned
4. Wait for data to refresh
5. Verify "Me" checkbox is still checked but disabled with tooltip
6. Remove the project filter (clear project selection)
7. Verify "Me" checkbox stays checked and becomes enabled again

Expected: Me checkbox persists throughout all filter changes

- [ ] **Step 4: Stop dev server**

Press Ctrl+C in terminal

---

## Success Criteria

✅ All unit tests pass (6 new tests covering bug scenario)  
✅ Me checkbox persists when project filter changes  
✅ Me checkbox disables (not unchecks) when currentUserId not in options  
✅ Me checkbox re-enables when currentUserId returns to options  
✅ Invalid user validation still works for other users  
✅ No TypeScript errors  
✅ No lint errors  
✅ Manual testing confirms fix

---

## Files Changed Summary

**Modified:**
- `src/pages/analytics/components/AnalyticsUserFilter.tsx` (~30 lines changed)

**Created:**
- `src/pages/analytics/components/__tests__/AnalyticsUserFilter.test.tsx` (~200 lines)

**Total Commits:** 8
