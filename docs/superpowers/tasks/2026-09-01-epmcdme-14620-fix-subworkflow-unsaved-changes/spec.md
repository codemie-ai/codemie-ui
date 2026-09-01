# EPMCDME-14620: Fix Sub-Workflow node triggering Unsaved Changes popup on drop

## Problem

Dropping a Sub-Workflow node onto the workflow canvas immediately shows the "Unsaved Changes" popup. The popup should appear only when the user attempts to navigate away or close the editor with unsaved changes.

## Root Cause

Two mechanisms combine to produce the bug:

1. `createState.ts` initialises a new Sub-Workflow state with `workflow_id: ''` (empty string).
2. `SubWorkflowTab` initialises the react-hook-form with `defaultValues: { workflow_id: state?.workflow_id ?? null }`. Because `''` is not `null`/`undefined`, the `??` operator leaves it as `''`.
3. `WorkflowSelector` has a `useEffect` keyed on the `project` prop that fires on initial mount, calling `resetValue()` → `onChange([])`. The parent Controller handler converts this to `field.onChange(null)`.
4. react-hook-form compares the current field value (`null`) to the stored `defaultValues.workflow_id` (`''`) and sets `isFormDirty = true` before the user interacts with anything.
5. When the node config panel opens, `executeWithUnsavedCheck` sees `isDirty() === true` and shows the popup.

## Fix

### `SubWorkflowTab.tsx` — align defaultValues with the form's empty-value representation

Change the `defaultValues` initialisation from `??` (null-coalescing) to `||` (falsy-coalescing):

```ts
// Before
defaultValues: { workflow_id: state?.workflow_id ?? null }

// After
defaultValues: { workflow_id: state?.workflow_id || null }
```

When `workflow_id` is `''` (a freshly dropped node), `'' || null` evaluates to `null`, matching the `null` that the WorkflowSelector onChange handler produces for an empty selection. isDirty stays `false` on mount.

For any non-empty `workflow_id` the two operators are identical, so existing behaviour is preserved.

The `saveData` function already converts `null → ''` via `formValues.workflow_id ?? ''`, so the state serialisation contract is unchanged.

### `SubWorkflowTab.test.tsx` — regression test

- Add `useEffect` to the React import.
- Update the `WorkflowSelector` mock to call `onChange(value)` via `useEffect([])` on mount. This replicates the real component's project-change side-effect and is the exact condition that triggers the bug in production.
- Add one test: `isDirty() returns false on initial mount when workflow_id is empty`, using a config with `workflow_id: ''`. This test fails before the fix and passes after.
- All existing tests remain green: for a non-empty `workflow_id` the mock calls `onChange([{id, name}])` → `field.onChange(id)`, which equals the existing `defaultValues`, so isDirty stays false.

## Acceptance Criteria

- Dropping a Sub-Workflow node does not show the Unsaved Changes popup.
- The node is added to the canvas and the workflow is marked modified.
- The popup still appears when the user navigates away or closes the editor with unsaved changes.
- No regression in Unsaved Changes behaviour for other node types or editing actions.

## Files Changed

| File | Change |
|---|---|
| `src/pages/workflows/editor/configPanels/SubWorkflowTab.tsx` | line 83: `??` → `\|\|` |
| `src/pages/workflows/editor/configPanels/__tests__/SubWorkflowTab.test.tsx` | add `useEffect` import; update WorkflowSelector mock; add regression test |
