# Hide 'Me' Checkbox for Admin/Maintainer Users

**Jira**: [EPMCDME-12579](https://jiraeu.epam.com/browse/EPMCDME-12579)  
**Date**: 2026-06-11

## Overview

Hide the 'Me' checkbox on the Users filter of the analytics page when the current user is an admin or maintainer. This simplifies the UI for privileged users who typically need to view analytics across all users rather than filtering to themselves.

## Requirements

- Hide the 'Me' checkbox when `currentUser.isAdmin === true` OR `currentUser.isMaintainer === true`
- Keep the "Users" label and hint icon visible regardless of user role
- Preserve all existing selection behavior and state management
- Admin/maintainer users can still select themselves via the dropdown if needed

## Implementation

### Component: AnalyticsUserFilter.tsx

**Location**: `src/pages/analytics/components/AnalyticsUserFilter.tsx`

**Changes**:
1. Calculate visibility condition: `const showMeCheckbox = !(currentUser?.isAdmin || currentUser?.isMaintainer)`
2. Conditionally render the checkbox div (lines 178-184) based on `showMeCheckbox`
3. Keep all existing state logic intact (meChecked, toggleCurrentUser, selection preservation)

**Code structure**:
```tsx
const showMeCheckbox = !(currentUser?.isAdmin || currentUser?.isMaintainer)

return (
  <div>
    <div className="mb-2 ml-1">
      <div className="flex items-center space-x-2">
        <span className="text-xs text-text-tertiary">Users</span>
        {showMeCheckbox && (
          <div data-tooltip-id="react-tooltip" ...>
            <Checkbox ... />
          </div>
        )}
        <Hint ... />
      </div>
    </div>
    <MultiSelect ... />
  </div>
)
```

### No Parent Component Changes

The `AnalyticsUserFilter` component already has access to `currentUser` via `userStore.user` (line 42). No prop changes or parent updates needed.

## Testing

### Unit Tests

Update `AnalyticsUserFilter.test.tsx`:
1. Add test: "should hide Me checkbox when user is admin"
2. Add test: "should hide Me checkbox when user is maintainer"
3. Add test: "should show Me checkbox when user is neither admin nor maintainer"

Mock `userStore.user` with different role combinations to verify visibility behavior.

### Manual Testing

1. Log in as admin → verify Me checkbox is hidden
2. Log in as maintainer → verify Me checkbox is hidden
3. Log in as regular user → verify Me checkbox is visible
4. Verify dropdown still allows manual selection of current user for all roles

## Edge Cases

- **No current user**: Checkbox was already disabled when `!currentUserId`. Hidden state doesn't change this behavior.
- **Role changes mid-session**: If user role changes (unlikely in production), the component will re-render based on updated `currentUser` state.
- **Existing selection**: If admin/maintainer has themselves selected via dropdown, hiding the checkbox doesn't clear the selection.

## Backward Compatibility

No breaking changes. All existing functionality preserved:
- Selection state management unchanged
- Project filter interactions unchanged (EPMCDME-12721)
- Super-user search functionality unchanged (EPMCDME-12610)
- Tooltip and hint behavior unchanged
