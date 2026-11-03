# Technical Research

**Task**: project members budget override
**Generated**: 2026-10-30
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-16610 — Remove "Reset budget usage" from the per-member Budget Override popup.
Description: Remove the "Reset budget usage" button from the per-member Budget Override popup on the project Members page (/settings/administration/projects/codemie/members). The popup combines per-member limit editing with a separate spending-reset action; remove the reset button so the popup focuses on editing the override. Button is at bottom left of the popup.
Acceptance criteria:
1. The popup does not display the "Reset budget usage" button.
2. The popup retains its limit fields (Platform, CLI, Premium Models), "Use project allocation", override reason, Cancel, and Save Override controls.
3. Saving, canceling, and clearing a member override continue to work as before.
4. This task does not change spending-reset behavior outside this popup.

---

## 2. Codebase Findings

### Existing Implementations
Base: `src/pages/settings/administration/projectsManagement/`
- `components/MemberAllocationOverrideModal.tsx` (374 lines) — the popup. Optional prop `onResetUsage?: (userId: string) => Promise<void>` (interface ~line 41), destructured in the component, and rendered in the `Popup` `footerContent`: `onResetUsage ? <Button ...>Reset budget usage</Button> : <span />` inside a `flex justify-between` wrapper, with Cancel/Save in a right-hand `div`. The `<span />` is a left spacer that keeps Cancel/Save right-aligned. `Button`, `ButtonSize`, `ButtonType` imports remain used by Cancel/Save.
- `ProjectMembersManager.tsx` — only consumer of the modal (~line 1011). Passes `onResetUsage={canResetBudgets ? async () => { find user; setOverrideContext(null); setResetBudgetUser(user ?? null) } : undefined}` (lines ~1022-1030).
- `resetBudgetUser` state (line 280) and `<ResetBudgetPopup>` (line ~1034, onSave refreshes first page) are shared with other entry points; `canResetBudgets` (line 317) also feeds a prop at line ~905 (member row/table). Whether `setResetBudgetUser` has another caller was not traced beyond the grep (only lines 280, 1027, 1036-1039 matched in this file; the row path at 905 passes `canResetBudgets` to a child, which likely calls its own handler).
- Out of scope sibling: `components/projectsManagement/BulkBudgetOverrideModal.tsx` has its own `onResetUsage` (bulk); `usersManagement/.../ResetBudgetPopup.tsx`, `BulkResetBudgetsPopup.tsx` implement the reset itself.

### Architecture and Layers Affected
UI component layer only (modal footer) plus its parent wiring in ProjectMembersManager. No store/API change.

### Integration Points
Modal <- ProjectMembersManager (props `onSubmit=handleOverrideMember`, `onHide`). Reset flow: ResetBudgetPopup -> user store.

### Patterns and Conventions
Valtio stores, PrimeReact-based `Popup` with `footerContent`; optional callback props gate optional actions.

---

## 3. Documentation Findings

### Guides and Architecture Docs
`.ai-run/guides/` exists (components, testing, architecture, etc.); AGENTS.md says tests/git only when explicitly asked. Prettier/eslint run automatically via hook.

### Architectural Decisions
None found for this popup.

### Derived Conventions
Test files live in adjacent `__tests__/` dirs; Vitest + RTL.

---

## 4. Testing Landscape

### Existing Coverage
- `components/__tests__/MemberAllocationOverrideModal.test.tsx` — modal tests; grep for "Reset"/"ResetUsage" returned no matches, so no direct reset-button test there.
- `__tests__/ProjectMembersBudgetPermissions.test.tsx` — describe "Reset usage in the row Override budgets modal" (lines ~185-202): asserts the button is absent for non-maintainer and `getByRole('button', { name: /Reset budget usage/ })` present for a maintainer after `openRowOverrideModal()` (uses the real member modal). The second test will fail after the change and needs removal or inversion. The bulk modal is mocked with its own "Reset budget usage (bulk)" button (lines ~39-42, 259-268); that is unrelated and must remain.

### Testing Framework and Patterns
Vitest, React Testing Library, `vi.mock` stand-ins for heavy children.

### Coverage Gaps
No test of Save/Cancel/clear-override behavior is confirmed beyond the existing modal test file (not fully read).

---

## 5. Configuration and Environment

### Environment Variables
None relevant.

### Configuration Files
None.

### Feature Flags and Deployment Concerns
Permission gating via `canManageBudgets` / `canResetBudgets` (maintainer) in ProjectMembersManager; no flags.

---

## 6. Risk Indicators

- Low overall risk; a small, localized UI removal.
- Speculative: `canResetBudgets` and `setResetBudgetUser` / `ResetBudgetPopup` must stay if another entry point (row action, line ~905) still uses them; removing them would violate AC4. Verify before deleting wiring.
- Speculative: removing the button leaves the footer wrapper's `justify-between` with only one child; the layout may need adjusting to keep Cancel/Save right-aligned.
- `ProjectMembersBudgetPermissions.test.tsx` "is offered to a maintainer" test asserts the removed behavior and will fail unless updated.
- Bulk modal's `onResetUsage` shares the name; avoid touching it.

---

## 7. Summary for Complexity Assessment

One UI layer is touched: the footer of `MemberAllocationOverrideModal.tsx` and the single caller in `ProjectMembersManager.tsx` (the `onResetUsage` prop and possibly the optional prop definition). Roughly 2 source files and 1 test file change, with no store, API, config or schema work.

Technical novelty is none; it is deletion of an optional action. Test posture is reasonable: an existing permissions test directly asserts the button and must be updated; the modal's own test file has no reset coverage.

Main risks are accidentally removing reset wiring still used by other entry points (AC4) and footer alignment after dropping the left element.

---

## 8. External References

None named by the task.
