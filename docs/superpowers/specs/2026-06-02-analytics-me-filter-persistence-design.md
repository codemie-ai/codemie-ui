# Analytics Me Filter Persistence Bug Fix

**Ticket:** EPMCDME-12590  
**Date:** 2026-06-02  
**Type:** Bug Fix

## Problem Statement

When a user selects a time period, enables the "Me" checkbox, then selects a project where the current user is not assigned, the data refreshes correctly. However, when the user removes the project filter, the "Me" checkbox is unexpectedly cleared. This violates the principle that removing one filter should not affect other active filters.

## Root Cause

The `AnalyticsUserFilter` component contains a `useEffect` hook (lines 76-87) that automatically removes user IDs from the selection when they are not present in the refreshed `userOptions`. The flow:

1. User enables "Me" checkbox with current user ID in selection
2. User selects a project where they're not assigned
3. `loadUsers()` in parent refreshes with new project filter
4. `userOptions` reloads without current user (they have no data in that project)
5. Validation effect detects current user ID is not in new `userOptions`
6. Effect calls `onChange(validUserIds)` removing current user
7. "Me" checkbox unchecks because `value` no longer contains current user ID

## Solution Design

### Approach

Separate the "Me" checkbox state from the automatic user validation logic. Track Me checkbox intent explicitly so it persists across `userOptions` reloads, while maintaining the existing validation for manually selected users.

### Component Changes: AnalyticsUserFilter.tsx

#### 1. State Management

Add explicit Me checkbox state tracking:

```typescript
const [meChecked, setMeChecked] = useState(false)
```

Initialize from incoming `value` prop:

```typescript
useEffect(() => {
  if (currentUserId && value) {
    setMeChecked(value.includes(currentUserId))
  }
}, [value, currentUserId])
```

Remove the old `isChecked` state that was derived from comparing `value.length === 1`.

#### 2. User Validation Logic

Modify the validation `useEffect` (lines 76-87) to exclude `currentUserId` from auto-removal:

```typescript
useEffect(() => {
  if (isLoadingOptions || !value.length) return

  const availableUserIds = new Set(userOptions.map((option) => option.value))
  
  // Filter out invalid users, but preserve currentUserId if Me is checked
  const validUserIds = value.filter((userId) => {
    // Always keep currentUserId when Me checkbox is checked
    if (meChecked && userId === currentUserId) return true
    // Remove other users that are no longer available
    return availableUserIds.has(userId)
  })

  if (validUserIds.length !== value.length) {
    onChange(validUserIds)
  }
}, [userOptions, value, onChange, isLoadingOptions, currentUserId, meChecked])
```

#### 3. Toggle Logic

Update `toggleCurrentUser` function:

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
    onChange(value.filter(id => id !== currentUserId))
  }
}
```

Remove the `previousUsers` state and logic - it's no longer needed since we track Me state independently.

#### 4. Checkbox Rendering

Keep existing disabled logic (it already works correctly):

```typescript
<Checkbox
  checked={meChecked}
  onChange={toggleCurrentUser}
  label="Me"
  disabled={!currentUserId}
  rootClassName="gap-x-0 mr-2"
/>
```

The tooltip already shows when disabled explaining why.

### Edge Cases Handled

1. **Project filter applied, user not in project:** Me checkbox stays checked but is disabled with tooltip
2. **Project filter removed:** Me checkbox re-enables automatically when currentUserId becomes available in options
3. **Manual user selection includes current user:** Checking Me checkbox should not duplicate or affect other selections
4. **Me checked, then manually selecting users:** Me stays checked, selection array contains both current user and manual selections
5. **Loading state:** During `isLoadingOptions`, don't run validation to avoid race conditions

### Testing Strategy

**Unit Tests** (`AnalyticsUserFilter.test.tsx`):

1. Test Me checkbox persists when userOptions refresh without current user
2. Test Me checkbox becomes disabled when currentUserId not in options
3. Test Me checkbox re-enables when currentUserId returns to options
4. Test removing project filter doesn't clear Me checkbox
5. Test validation still removes other invalid users

**Integration Tests**:

1. Reproduce exact bug scenario: time period → Me → project (user not assigned) → remove project → verify Me stays checked
2. Test Me checkbox with multiple project filter changes

### Files Modified

- `src/pages/analytics/components/AnalyticsUserFilter.tsx` - Main component changes
- `src/pages/analytics/components/__tests__/AnalyticsUserFilter.test.tsx` - New unit tests

### Backwards Compatibility

No breaking changes. The component's props interface remains unchanged. Existing parent components (`AnalyticsFilters.tsx`) require no modifications.

### Performance Impact

Negligible - adds one additional state variable and modifies existing effect dependency array.

## Success Criteria

1. ✅ Removing project filter does not clear Me checkbox
2. ✅ Me checkbox disables (not unchecks) when current user has no data in selected filters
3. ✅ Me checkbox re-enables when filters change to include current user
4. ✅ Other user filter validation continues to work (removing unavailable users)
5. ✅ All existing tests pass
6. ✅ New tests cover the bug scenario
