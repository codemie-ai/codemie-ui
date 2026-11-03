# EPMCDME-16610: Remove "Reset budget usage" from the Budget Override popups (single-member and bulk)

## Problem
The per-member Budget Override popup (`MemberAllocationOverrideModal`) and the bulk Budget Override popup (`BulkBudgetOverrideModal`, Bulk Actions -> Override budgets) on the project Members page mix limit editing with a separate spending-reset action. The reset buttons should go so the popups only edit overrides.

## Behavior
- Neither popup renders a "Reset budget usage" button, for any user (including maintainers).
- Cancel and Save Override stay right-aligned in each footer, as now.
- Unchanged: limit fields (Platform, CLI, Premium Models), "Use project allocation", override reason, Cancel, Save Override, and the save, cancel and clear-override flows.

## Scope of change
Part 1, single-member popup (done, commits af54309ed and 81ff66574):
- `projectsManagement/components/MemberAllocationOverrideModal.tsx`: `onResetUsage` prop and footer button removed.
- `projectsManagement/ProjectMembersManager.tsx`: `onResetUsage` no longer passed; `resetBudgetUser` state and `<ResetBudgetPopup>` render removed.
- `__tests__/ProjectMembersBudgetPermissions.test.tsx`: row-modal test asserts the button is absent for maintainers.

Part 2, bulk popup (this amendment):
- `components/projectsManagement/BulkBudgetOverrideModal.tsx`: remove the optional `onResetUsage` prop (line 46, 154) and the footer button "Reset budget usage for N users" (lines 370-378) with its `<span />` spacer. Keep Cancel/Save in the right-aligned group (`flex gap-3`); drop the `justify-between` wrapper in favor of right alignment (`justify-end`).
- `components/projectsManagement/ProjectMembersBulkActions.tsx`: stop passing `onResetUsage` (lines 250-257). Grep shows this callback is the ONLY opener of the `resetBudgets` popup in this file (its menu, `bulkActionItems`, has no Reset Budgets entry), so these become dead and are removed: the `BulkResetBudgetsPopup` import and render (lines 24, 261-269), the `resetCategories` state and its reset in `closePopup` (76, 125), the `'resetBudgets'` member of `ActivePopup` (35) and its clause in `validateBulkAction` (83), and the `canResetBudgets` prop (44, 65, 83, 102, 261) with its pass-through in `ProjectMembersManager.tsx` (line 903) and the `canResetBudgets` const there (line 315) if nothing else uses it. `finishBudgetAction` stays (used by the override submit).
- Tests: `__tests__/ProjectMembersBulkActions.test.tsx` (mock exposing `open-reset`/`save-reset`, "refreshes budgets after the bulk reset popup saves", "reset restriction" describe, `canResetBudgets` in render props) and the bulk-modal mock/describe in `ProjectMembersBudgetPermissions.test.tsx` (lines 39-42, 246-270) assert removed behavior; replace with assertions that the bulk modal receives no reset callback / shows no reset button.

## Acceptance criteria
1. The single-member popup does not display "Reset budget usage" for maintainers or anyone else.
2. The bulk Budget Override popup does not display "Reset budget usage for N users", for any user.
3. Both popups retain their limit fields, "Use project allocation", override reason, Cancel and Save Override; saving, canceling and clearing overrides behave as before.
4. The bulk popup footer stays right-aligned (Cancel, Save Override at the right).
5. `BulkBudgetOverrideModal` has no `onResetUsage` prop and `ProjectMembersBulkActions` passes none; no unused state, imports, props or popup remain from the removal.
6. The bulk "Reset Budgets" action on the Users page (`UsersManagementBulkActions`, `BulkResetBudgetsPopup`), `ResetBudgetPopup` on the Users page, the stores and the API are unchanged.

## Non-goals
- No change to `BulkResetBudgetsPopup`, `ResetBudgetPopup` components, the stores or the API.
- No change to `canManageBudgets` permission logic or the Users-page bulk Reset Budgets menu item.
- No new entry point for resetting usage from the project Members page, and no layout or copy change beyond the removed buttons and footer alignment.
