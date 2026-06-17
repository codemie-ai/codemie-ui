# Hide Me Checkbox for Admin/Maintainer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide the 'Me' checkbox on the Users filter of the analytics page when the current user is an admin or maintainer.

**Architecture:** Single component change in AnalyticsUserFilter.tsx. Add conditional rendering based on currentUser.isAdmin || currentUser.isMaintainer. No prop changes, no parent component modifications.

**Tech Stack:** React, TypeScript, Vitest, React Testing Library

---

## File Structure

**Modified Files:**
- `src/pages/analytics/components/AnalyticsUserFilter.tsx` - Add conditional rendering for Me checkbox
- `src/pages/analytics/components/__tests__/AnalyticsUserFilter.test.tsx` - Add test coverage for visibility behavior

---

### Task 1: Add test for hiding Me checkbox when user is admin

**Files:**
- Modify: `src/pages/analytics/components/__tests__/AnalyticsUserFilter.test.tsx`

**Test-first: yes — Add failing test for admin user hiding behavior**

- [ ] **Step 1: Write the failing test**

Add this test to the describe block:

```typescript
it('should hide Me checkbox when user is admin', () => {
  vi.mocked(userStore).user = {
    userId: 'user-123',
    username: 'adminuser',
    name: 'Admin User',
    isAdmin: true,
    isMaintainer: false,
  }

  const options = [
    { label: 'Admin User', value: 'user-123' },
    { label: 'Other User', value: 'user-456' },
  ]

  render(
    <AnalyticsUserFilter
      value={[]}
      onChange={mockOnChange}
      userOptions={options}
      isLoadingOptions={false}
    />
  )

  const meCheckbox = screen.queryByLabelText('Me')
  expect(meCheckbox).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/analytics/components/__tests__/AnalyticsUserFilter.test.tsx`

Expected: FAIL - "received element" (checkbox exists but should be hidden)

- [ ] **Step 3: Commit the failing test**

```bash
git add src/pages/analytics/components/__tests__/AnalyticsUserFilter.test.tsx
git commit -m "EPMCDME-12579: Add failing test for hiding Me checkbox when admin

Generated with AI

Co-Authored-By: codemie-ai <codemie.ai@gmail.com>"
```

---

### Task 2: Add test for hiding Me checkbox when user is maintainer

**Files:**
- Modify: `src/pages/analytics/components/__tests__/AnalyticsUserFilter.test.tsx`

**Test-first: yes — Add failing test for maintainer user hiding behavior**

- [ ] **Step 1: Write the failing test**

Add this test after the admin test:

```typescript
it('should hide Me checkbox when user is maintainer', () => {
  vi.mocked(userStore).user = {
    userId: 'user-123',
    username: 'maintaineruser',
    name: 'Maintainer User',
    isAdmin: false,
    isMaintainer: true,
  }

  const options = [
    { label: 'Maintainer User', value: 'user-123' },
    { label: 'Other User', value: 'user-456' },
  ]

  render(
    <AnalyticsUserFilter
      value={[]}
      onChange={mockOnChange}
      userOptions={options}
      isLoadingOptions={false}
    />
  )

  const meCheckbox = screen.queryByLabelText('Me')
  expect(meCheckbox).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/analytics/components/__tests__/AnalyticsUserFilter.test.tsx`

Expected: FAIL - "received element" (checkbox exists but should be hidden)

- [ ] **Step 3: Commit the failing test**

```bash
git add src/pages/analytics/components/__tests__/AnalyticsUserFilter.test.tsx
git commit -m "EPMCDME-12579: Add failing test for hiding Me checkbox when maintainer

Generated with AI

Co-Authored-By: codemie-ai <codemie.ai@gmail.com>"
```

---

### Task 3: Add test for showing Me checkbox when user is regular

**Files:**
- Modify: `src/pages/analytics/components/__tests__/AnalyticsUserFilter.test.tsx`

**Test-first: yes — Add failing test for regular user showing behavior**

- [ ] **Step 1: Write the failing test**

Add this test after the maintainer test:

```typescript
it('should show Me checkbox when user is neither admin nor maintainer', () => {
  vi.mocked(userStore).user = {
    userId: 'user-123',
    username: 'regularuser',
    name: 'Regular User',
    isAdmin: false,
    isMaintainer: false,
  }

  const options = [
    { label: 'Regular User', value: 'user-123' },
    { label: 'Other User', value: 'user-456' },
  ]

  render(
    <AnalyticsUserFilter
      value={[]}
      onChange={mockOnChange}
      userOptions={options}
      isLoadingOptions={false}
    />
  )

  const meCheckbox = screen.getByLabelText('Me')
  expect(meCheckbox).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm test -- src/pages/analytics/components/__tests__/AnalyticsUserFilter.test.tsx`

Expected: PASS (existing implementation shows checkbox for regular users)

- [ ] **Step 3: Commit the test**

```bash
git add src/pages/analytics/components/__tests__/AnalyticsUserFilter.test.tsx
git commit -m "EPMCDME-12579: Add test for showing Me checkbox when regular user

Generated with AI

Co-Authored-By: codemie-ai <codemie.ai@gmail.com>"
```

---

### Task 4: Implement conditional rendering for Me checkbox

**Files:**
- Modify: `src/pages/analytics/components/AnalyticsUserFilter.tsx:164-191`

**Test-first: no — Implementation to make tests pass**

- [ ] **Step 1: Add visibility condition calculation**

After line 44 (where `currentUserId` is declared), add:

```typescript
const showMeCheckbox = !(currentUser?.isAdmin || currentUser?.isMaintainer)
```

- [ ] **Step 2: Wrap checkbox div in conditional rendering**

Replace lines 167-186 (the flex container div with checkbox and hint) with:

```typescript
<div className="flex items-center space-x-2">
  <span className="text-xs text-text-tertiary">Users</span>
  {showMeCheckbox && (
    <div
      data-tooltip-id="react-tooltip"
      data-tooltip-content={
        !currentUserId
          ? 'Analytics data selected with current filters values contain no data for current user.'
          : undefined
      }
      data-tooltip-class-name="break-keep"
    >
      <Checkbox
        checked={meChecked}
        onChange={toggleCurrentUser}
        label="Me"
        disabled={!currentUserId}
        rootClassName="gap-x-0 mr-2"
      />
    </div>
  )}
  <Hint
    hint="Options for this dropdown are displayed based on the data available in the current dashboard (including filtering). Sometimes multiple names or other identifiers can be traced to the same user. In those cases identifiers will be merged into one option and additional ones will be shown in parentheses."
    id="analytics-user-filter-hint"
  />
</div>
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `npm test -- src/pages/analytics/components/__tests__/AnalyticsUserFilter.test.tsx`

Expected: All tests PASS (including the 2 new tests from Tasks 1 and 2)

- [ ] **Step 4: Commit the implementation**

```bash
git add src/pages/analytics/components/AnalyticsUserFilter.tsx
git commit -m "EPMCDME-12579: Hide Me checkbox for admin/maintainer users

Generated with AI

Co-Authored-By: codemie-ai <codemie.ai@gmail.com>"
```

---

### Task 5: Run full test suite and verify no regressions

**Files:**
- None (verification only)

**Test-first: no — Verification step**

- [ ] **Step 1: Run all analytics tests**

Run: `npm test -- src/pages/analytics/`

Expected: All tests PASS

- [ ] **Step 2: Run full test suite**

Run: `npm test`

Expected: All tests PASS with no regressions

- [ ] **Step 3: Verify no type errors**

Run: `npm run type-check`

Expected: No TypeScript errors

---

## Spec Coverage Self-Review

✅ **Hide checkbox for admin**: Covered in Task 1 test + Task 4 implementation
✅ **Hide checkbox for maintainer**: Covered in Task 2 test + Task 4 implementation
✅ **Show checkbox for regular users**: Covered in Task 3 test (already working)
✅ **Keep Users label visible**: Task 4 implementation keeps label outside conditional
✅ **Keep Hint visible**: Task 4 implementation keeps Hint outside conditional
✅ **Preserve selection behavior**: No changes to state management logic
✅ **Allow dropdown selection**: No changes to MultiSelect or onChange behavior

No gaps found.
