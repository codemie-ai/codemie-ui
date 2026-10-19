# EPMCDME-16069 — Bulk override modal: focusing limit inputs must not clear values or show errors

## Problem

In `BulkBudgetOverrideModal`, focusing an untouched Hard or Soft limit input deletes its pre-filled value. The field then shows "Hard/Soft limit must be a non-negative number" and Save Override is disabled. Cause: the focus handlers at `src/pages/settings/administration/components/projectsManagement/BulkBudgetOverrideModal.tsx:432-437` call `updateCategory(category, field, '')`. That call (lines 279-304) sets the field's edited flag (`<field>Dirty`) along with an empty draft. `getFieldDisplayValue` (95-104) then renders the empty draft. `isCategoryFieldDirty` (106-110) marks the category dirty, `parseBudgetNumber('')` returns `null`, and `getNonNegativeLimitErrors` flags both fields. Clearing on focus was meant only for the literal `Mixed` text shown when selected users have different values, but today it runs on every field.

## Required behaviour

**Non-mixed fields (all selected users share one value)**
- Focus changes nothing. The initial value stays, no error appears, the field is not edited, no Revert icon appears, and Save keeps its state.
- Only a real change marks the field as edited. Validation stays as it is today: a valid non-negative number shows no non-negative error. An empty field, `.` or other unparseable input (e.g. `1.2.3`) shows the matching non-negative error and disables Save.

**Mixed fields (selected users differ)**
- On focus, the `Mixed` text clears so the user can type, but the field does **not** count as edited. Its edited flag stays false, it gets no error, it does not enable or disable Save, and no Revert icon appears.
- Leaving the field without typing shows `Mixed` again.
- Typing a value makes the field edited, and the value is validated as above.
- If the user then deletes everything, the field returns to unchanged. Its edited flag goes back to false, there is no error, it shows `Mixed` once focus leaves, and on submit those users keep their existing values. This follows the on-screen rule "Mixed values remain unchanged unless edited." (line 382).

## Constraints

- All changes stay in `BulkBudgetOverrideModal.tsx`. The props of `BudgetOverrideCategoryCard` do not change. The card forwards `onFocus` but has no blur prop. Whatever detects focus leaving a Mixed field (for example, the modal listening for blur events that bubble up from inside the card, keyed by input id `bulk-<category>-<max|soft>`) has to live in the modal.
- The "cleared for typing" state of a Mixed field is display-only. It must not feed `categoryDirty`, `validationByCategory`, `isDirty` or the submit payload.
- Keep the existing helpers in `budgetNumber.ts` and the input filter (`keyfilter /[^0-9.,]/g`) unchanged.

## Acceptance criteria

1. **AC1:** an untouched non-mixed Hard limit input keeps its value on focus and shows no error. Save and the Revert icon are unchanged.
2. **AC2:** the same holds for the Soft limit input.
3. **AC3:** editing either field to a valid non-negative number shows no non-negative error.
4. **AC4:** editing either field to empty, `.` or `1.2.3` shows "<Hard|Soft> limit must be a non-negative number" and disables Save.
5. **AC5:** focusing a Mixed field clears the displayed text without an error and without changing Save. Leaving without typing shows `Mixed` again.
6. **AC6:** typing into a Mixed field and then emptying it gives no error and no edited state, shows `Mixed` once focus leaves, and leaves that field out of the submit payload. Those users keep their current values.
7. **AC7:** a new test file `components/projectsManagement/__tests__/BulkBudgetOverrideModal.test.tsx` (Vitest + RTL) covers AC1–AC6. `getNonNegativeLimitErrors` gets unit tests that include negative inputs, because the input filter blocks typing `-` in the UI.

## Non-goals

- No change to the input filter or `normalizeBudgetInput`, and no new way to enter negative values.
- No change to `BudgetOverrideCategoryCard` props or to `MemberAllocationOverrideModal` behaviour.
- No change to the capacity or soft-over-hard rules, or to their messages.
- No store, API or type changes.
- No redesign of Save gating beyond what the focus fix causes.

## Decisions

- **Cleared non-mixed field:** shows an error instead of counting as unchanged. This matches `MemberAllocationOverrideModal.tsx:162-171` and avoids submitting 0 through `?? 0` (lines 318, 321).
- **AC4 with the input filter:** AC4 is met through empty, `.` and unparseable input. Negative values are covered at the helper level.
- **Mixed fields:** cleared on focus without counting as an edit, and an emptied Mixed field counts as unchanged. Both are user decisions.
