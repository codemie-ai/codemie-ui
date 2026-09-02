# Technical Analysis: EPMCDME-14278

## Problem
The `handleDelete` function in `ProjectBudgetsSection.tsx` was failing silently for legacy budgets that don't have an associated budget group. The function would return early when `currentGroupId` was null instead of handling the deletion of individual budgets.

## Root Cause
The application supports two budget models:
1. **Grouped budgets**: Multiple budget categories managed as a unified group (modern)
2. **Legacy budgets**: Individual budget categories without group management (old)

The `handleDelete` function only handled grouped budgets and had no fallback for legacy budgets.

## Solution
Modified the `handleDelete` function to:
1. Check if `currentGroupId` exists
2. If yes: Delete the entire budget group (existing behavior)
3. If no: Delete each budget individually using `Promise.all()`

## Code Changes
File: `src/pages/settings/administration/projectsManagement/ProjectBudgetsSection.tsx`

- Removed early return on null `currentGroupId`
- Added conditional branching to handle both cases
- Updated dependency array to include `budgets` (required for mapping in the else branch)

## Impact
- Users can now delete legacy budgets that lack a budget group
- No breaking changes to the grouped budget deletion flow
- The error handling is unchanged (errors from store are already handled by toaster)

## Testing
- Type-check: PASS
- Linting: PASS
- No runtime errors expected; follows existing error handling patterns
