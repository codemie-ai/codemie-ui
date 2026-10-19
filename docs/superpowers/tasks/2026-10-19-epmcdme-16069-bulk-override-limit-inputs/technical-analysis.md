# Technical Research

**Task**: bulk-override modal limits validation
**Generated**: 2026-10-19
**Research path**: filesystem

---

## 1. Original Context

Jira EPMCDME-16069, Bug

Summary: Bulk override modal: focusing Hard/Soft limit inputs clears initial values and shows non-negative validation errors

Description
When the user opens the bulk override modal and clicks into the Hard limit or Soft limit input, the pre-filled initial value is deleted. The field then shows the errors "Hard limit must be a non-negative number" and "Soft limit must be a non-negative number", even though the user has not entered an invalid value. The initial values should persist.

Preconditions
* The user can open the bulk override modal.
* The modal has initial values in the Hard limit and Soft limit inputs.

Steps to Reproduce
1. Open the bulk override modal.
2. Click into the Hard limit input.
3. Click into the Soft limit input.
4. Observe the values and the error messages.

Expected Result
* The initial Hard limit and Soft limit values remain in their inputs when the user clicks into them.
* No validation error is shown on focus.
* Validation messages appear only when the user enters an invalid value.

Actual Result
* The initial values are cleared when the inputs are clicked.
* "Hard limit must be a non-negative number" and "Soft limit must be a non-negative number" are shown.

Affected Areas
* Bulk override modal (Hard limit and Soft limit inputs)
* Input validation for limit fields

Acceptance Criteria
1. Given the bulk override modal with initial limit values, when the user clicks into the Hard limit input, then the initial value is kept and no error is shown.
2. Given the bulk override modal with initial limit values, when the user clicks into the Soft limit input, then the initial value is kept and no error is shown.
3. Given a valid non-negative number entered in either field, when the user edits it, then no validation error is shown.
4. Given a negative or non-numeric value entered in either field, when the user edits it, then the matching validation error is shown.

Note: the ticket is AI-generated and not SSOT — confirm the actual root cause in code (e.g. how initial values are populated, input type/value binding, focus handlers, validation schema). Also check whether other places share the same limit-input component/validation and would be affected.

---

## 2. Codebase Findings

### Existing Implementations
All paths are relative to `src/pages/settings/administration/`.
- `components/projectsManagement/BulkBudgetOverrideModal.tsx`: the bulk override modal. It uses local `useState<PendingValues>`. Each category (`platform`, `cli`, `premium_models`) holds `{max, soft, reason, maxDirty, softDirty, reasonDirty}`, and `emptyPendingValues()` starts with `max: ''` and `maxDirty: false`.
- `components/projectsManagement/BudgetOverrideCategoryCard.tsx`: the presentational card that renders the Hard Limit ($) and Soft Limit ($) `Input`s. It forwards the optional `onMaxFocus`/`onSoftFocus` props to `Input onFocus`. Inputs use `type="text"`, `inputMode="decimal"` and `keyfilter={/[^0-9.,]/g}`, and `onChange` passes the value through `normalizeBudgetInput`.
- `components/projectsManagement/budgetNumber.ts`: `normalizeBudgetInput`, `parseBudgetNumber` (returns `null` for `''` or `'.'`), `SOFT_EXCEEDS_HARD_MESSAGE` and `getNonNegativeLimitErrors(max, soft)`. That function returns the two ticket messages when a value is `null` or `< 0`. Its doc comment says it is shared by the single-member and bulk modals.
- `projectsManagement/components/MemberAllocationOverrideModal.tsx`: the single-member override modal. It reuses `BudgetOverrideCategoryCard` and `getNonNegativeLimitErrors`.
- `components/projectsManagement/ProjectMembersBulkActions.tsx:215`: the only place that mounts `BulkBudgetOverrideModal`, gated on `canManageBudgets`. It submits sequential `projectBudgetsStore.overrideMemberAllocation` PATCHes.

### Root cause (confirmed in code)
The focus handlers in `BulkBudgetOverrideModal.tsx:432-437` cause the bug:
```tsx
onMaxFocus={() => { if (!values.maxDirty) updateCategory(value, 'max', '') }}
onSoftFocus={() => { if (!values.softDirty) updateCategory(value, 'soft', '') }}
```
`updateCategory` (lines 279-304) sets `[field]: ''` and also `[field+'Dirty']: true`. One focus event therefore causes this chain:
1. `getFieldDisplayValue(dirty=true, '', …)` (lines 95-104) now returns the draft `''` instead of `String(current.max[0])`. The pre-filled value disappears.
2. `isCategoryFieldDirty('', true, current)` (lines 106-110) gives `parseBudgetNumber('')` = `null` !== `current[0]`, so the category counts as dirty and `validationByCategory` runs (lines 229-265).
3. `nextMax = normalizeNumber('')` = `null`, so `getNonNegativeLimitErrors` returns "Hard limit must be a non-negative number". Soft works the same way.
4. `hasInvalidPendingCategory` becomes true and **Save Override is disabled**. The Revert icon (`maxDirty && onRevert`) also appears.

The clear-on-focus looks meant for the `'Mixed'` placeholder: `getFieldDisplayValue` shows the literal text `Mixed` when users' values differ, and that text would otherwise need to be deleted by hand. However, the handler runs whether or not the field is mixed. The behaviour arrived in `bd22ebf39 EPMCDME-14781: Project details redesign + models config`, the only commit that touches either file.

### Shared component impact
- `MemberAllocationOverrideModal.tsx` uses `BudgetOverrideCategoryCard` at line 334 and passes **no** `onMaxFocus`/`onSoftFocus` (grep finds no `Focus` in the file). It does not have this bug. Its validation is gated by `touched` and by comparing against `initialDraft`.
- `getNonNegativeLimitErrors` is correct for its inputs. The bulk modal gives it `null` from the synthetic `''` draft.

### Architecture and Layers Affected
- UI component layer only. The changes are in `BulkBudgetOverrideModal.tsx` (local state, focus handlers, validation memo) and perhaps `BudgetOverrideCategoryCard.tsx`. No store, API or type changes were found on this path.

### Integration Points
- `BulkBudgetOverrideModal` → `budgetNumber.ts`, `BudgetOverrideCategoryCard`, `BudgetOverrideCategoryTable`, `@/components/form/Input`, `@/components/Popup`.
- `ProjectMembersBulkActions` → `BulkBudgetOverrideModal` → `onSubmit` → `projectBudgetsStore.overrideMemberAllocation`.
- `MemberAllocationOverrideModal` → the same card and validation helpers.

### Patterns and Conventions
- `Input` (`src/components/form/Input/Input.tsx`) strips characters matching `keyfilter` in `handleChange` before `onChange`. It passes `onFocus` through via `...rest`.
- Display uses a dirty flag: an untouched field shows the current value, or `Mixed`. A dirty field shows the draft. Revert resets `[field]: ''` and `dirty: false`.
- Validation is derived in `useMemo`, and the Save button is disabled when `!isDirty || hasInvalidPendingCategory`.

---

## 3. Documentation Findings

### Guides and Architecture Docs
- `AGENTS.md` sends forms and modals to `.ai-run/guides/patterns/form-patterns.md` and `modal-patterns.md`, and testing to `.ai-run/guides/testing/testing-patterns.md` (RTL with `fireEvent` and `@testing-library/user-event` 14.6.1). No guide covers budget overrides specifically.

### Architectural Decisions
- An inline comment in `BulkBudgetOverrideModal.tsx:274-276` says pending state is initialised only when the modal opens, so that external budget refreshes do not discard edits.
- The `budgetNumber.ts:34` doc comment says the helper is shared by both modals.
- The UI text "Mixed values remain unchanged unless edited." (line 382) is the user-facing rule for mixed fields.

### Derived Conventions
- Validation errors should follow edits made by the user. The single-member modal gates on `touched` and changed-vs-initial values, and the bulk modal gates on `categoryDirty`.

---

## 4. Testing Landscape

### Existing Coverage
- `projectsManagement/components/__tests__/budgetNumber.test.ts` covers `parseBudgetNumber`.
- `projectsManagement/components/__tests__/MemberAllocationOverrideModal.test.tsx` covers the header name and the hard-limit prefill cap. It has no focus or validation tests.
- `components/projectsManagement/__tests__/ProjectMembersBulkActions.test.tsx` and `projectsManagement/__tests__/ProjectMembersBudgetPermissions.test.tsx` **mock** `BulkBudgetOverrideModal`.

### Testing Framework and Patterns
- Vitest, with the `unit` and `integration` projects defined in `vite.config.ts`. React Testing Library is used with `fireEvent` and `userEvent`. Tests sit in colocated `__tests__/` folders, and fixtures are inline `ProjectBudget` objects (see the MemberAllocationOverrideModal test).

### Coverage Gaps
- `BulkBudgetOverrideModal.tsx` has **no direct test file**. Focus, display value, mixed handling, validation and Save enablement are all untested.
- `BudgetOverrideCategoryCard.tsx` has no direct test.
- `getNonNegativeLimitErrors` has no unit test.

---

## 5. Configuration and Environment

### Environment Variables
- None are involved.

### Configuration Files
- None are involved.

### Feature Flags and Deployment Concerns
- The modal renders only when `canManageBudgets` is true (`ProjectMembersBulkActions.tsx:214`). There are no deployment concerns.

---

## 6. Risk Indicators

- **Mixed fields**: removing clear-on-focus everywhere would leave the literal text `Mixed` in the input, and typing would append to it. `normalizeBudgetInput` would then produce strings like `Mixed5`, although `keyfilter` strips letters on change. Speculative: the fix probably has to keep the clear for `maxMixed`/`softMixed` fields only, and decide whether a cleared, empty mixed field should show an error or be treated as "unchanged".
- **AC4 is only partly reachable**: `keyfilter /[^0-9.,]/g` strips `-` and letters on change, so a user cannot type a negative or non-numeric value. Only `''` or `'.'` produce `null`. Tests for AC4 have to use empty, `.` or a decimal edge case, not `-5`.
- **Empty after a deliberate edit**: if the user clears a non-mixed field by hand, `maxDirty` is true and the value is `''`. That shows the non-negative error, which matches AC4's intent. The spec should confirm this is the expected behaviour.
- **Save gating**: today a single focus disables Save across all categories through `hasInvalidPendingCategory`, so a fix changes when Save is enabled.
- **No test harness for the bulk modal**: a new test file is needed to cover AC1-AC4, so test setup cost exceeds the code change.
- **Shared card**: changes to `BudgetOverrideCategoryCard` props affect `MemberAllocationOverrideModal`. That modal is currently unaffected by the bug because it does not pass focus handlers.

---

## 7. Summary for Complexity Assessment

The bug sits entirely in one React component, `src/pages/settings/administration/components/projectsManagement/BulkBudgetOverrideModal.tsx`. Its `onMaxFocus`/`onSoftFocus` handlers (lines 432-437) call `updateCategory(value, field, '')`. That replaces the displayed initial value with `''` and sets the field's dirty flag. The category then counts as dirty, `parseBudgetNumber('')` returns `null`, and `getNonNegativeLimitErrors` produces both "must be a non-negative number" messages. It also disables Save Override. The clear-on-focus appears intended only for the `Mixed` placeholder but runs on every untouched field. No store, API, type or config layer is involved.

The shared pieces, `BudgetOverrideCategoryCard` and `budgetNumber.ts`, are reused by the single-member `MemberAllocationOverrideModal`, which does not pass focus handlers and does not have the bug. The fix is local, likely a few lines in the bulk modal: clear on focus only when the field shows `Mixed`, or stop marking a field dirty on focus. The main design question is how mixed fields behave once cleared.

Test coverage is weak. `BulkBudgetOverrideModal` has no direct tests, and both suites that render its parent mock it out. Covering AC1-AC4 needs a new RTL test file with `ProjectBudget`/`UserListItem` fixtures. AC4 has to account for the `keyfilter` that blocks `-` and letters. Novelty is low and risk is low to moderate, mainly the mixed-value regression and Save-button gating.

---

## 8. External References

None named by the task.
