# Workflow Node Task/Output-Schema Visibility — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make workflow node configuration panels show "Task" and "Output Schema" only for node
types that actually consume them, via two new independent `CommonStateFields` props.

**Architecture:** Add `showTask`/`showOutputSchema` boolean props to `CommonStateFields`
(default `true`), gating only the `task`/`output_schema` `FieldController`s inside the existing
`showAllFields` block — the rest of that block stays governed solely by `showAllFields`. Wire the
four panel call sites to the matrix in the spec. For `CustomTab`, derive `showTask` from a new
exported `CUSTOM_NODE_TYPES_USING_TASK` set, fed by the *live* `custom_node_id` lifted out of
`CustomNodeForm` via a new `onCustomNodeIdChange` callback prop.

**Tech Stack:** React 18, TypeScript, react-hook-form, Vitest + React Testing Library.

**Spec:** `docs/superpowers/tasks/2026-10-21-workflow-node-schema-visibility/spec.md`

## Global Constraints

- UI-only change — no backend, API, execution-behavior, or stored-configuration-schema changes.
- No backend capability API for custom-node Task support; the rule is a hard-coded UI-side list.
- `TransformTab.tsx` and its `showAllFields={false}` call are not modified.
- `registerFields` (`CommonStateFields.tsx:106-118`) is not restructured.
- `task`/`output_schema` stay in `CommonNodeFieldValues`, `getDefaultValues`, and the validation
  schema, and must never be unregistered when hidden — this is the only mechanism relied on for
  hidden-value preservation; no new persistence code.
- New `showTask`/`showOutputSchema` props default to `true` (opt-out), matching `showAllFields`'s
  existing convention.
- Commit per task using the repository's existing convention (one commit per task below; no
  separate commit-task steps are listed).

## Review Focus

- A node with an existing stored `task`/`output_schema` value, reopened after this change with
  the field now hidden for its node type — does `getValues()`/save still return the original
  string unchanged (AC8)? Covered by Task 5.
- Switching the custom node type inside an open `CustomTab` panel (e.g. State Processor →
  Generate Document Tree) without closing/reopening — does Task visibility update immediately,
  not only after reopen (AC4 "live")? Covered by Task 4.
- A custom node type with no entry in `CUSTOM_NODE_TYPES_USING_TASK` (e.g. a freshly selected
  `RESULT_FINALIZER`) — does it default to hidden rather than throwing or defaulting to shown?
  Covered by Task 2 and Task 4.
- `showAllFields={false}` (TransformTab) combined with the new props' default `true` — do
  Transition Settings/Retry Policy and Task/Output Schema all stay hidden exactly as today, with
  no regression from adding the new props? Covered by Task 1.
- Assistant panel — do Task (prompt) and Output Schema (structured output) remain visible and
  wired exactly as before, confirming the new props don't change `AssistantTab`'s default
  behavior? Covered by Task 3.

---

## Task 1: `CommonStateFields` — independent `showTask`/`showOutputSchema` props

**Files:**
- Modify: `src/pages/workflows/editor/configPanels/CommonStateFields.tsx:148-152` (props
  interface), `:230-231` (destructure with defaults), `:301-330` (gate `task`/`output_schema`
  individually)
- Test: `src/pages/workflows/editor/configPanels/__tests__/CommonStateFields.test.tsx`

**Interfaces:**
- Produces: `CommonStateFields` now accepts `showTask?: boolean` (default `true`) and
  `showOutputSchema?: boolean` (default `true`) in addition to existing `showAllFields`. Later
  tasks (2–4) pass these props from their panels.

**Test-first: yes — `CommonStateFields` with `showTask={false}` must not render the Task
`ExpandableTextarea` while `showOutputSchema` stays default-visible, and vice versa; this fails
today because both fields share one `showAllFields` gate.**

- [ ] **Step 1: Write the failing tests**

Add a new `describe('CommonStateFields — Task/Output Schema visibility')` block. Reuse the
existing `vi.mock` setup already in the file (registerFields, useWorkflowContext,
ConfigAccordion). Assert via `screen.queryByPlaceholderText('Describe the task for this node')`
and `screen.queryByPlaceholderText('Expected output format (JSON Schema)')`:

```tsx
it('renders Task and Output Schema by default', () => {
  render(<CommonStateFields state={{ id: 's' }} />)
  expect(screen.getByPlaceholderText('Describe the task for this node')).toBeInTheDocument()
  expect(screen.getByPlaceholderText('Expected output format (JSON Schema)')).toBeInTheDocument()
})

it('hides Task independently of Output Schema', () => {
  render(<CommonStateFields state={{ id: 's' }} showTask={false} />)
  expect(screen.queryByPlaceholderText('Describe the task for this node')).not.toBeInTheDocument()
  expect(screen.getByPlaceholderText('Expected output format (JSON Schema)')).toBeInTheDocument()
})

it('hides Output Schema independently of Task', () => {
  render(<CommonStateFields state={{ id: 's' }} showOutputSchema={false} />)
  expect(screen.getByPlaceholderText('Describe the task for this node')).toBeInTheDocument()
  expect(screen.queryByPlaceholderText('Expected output format (JSON Schema)')).not.toBeInTheDocument()
})

it('keeps interrupt_before etc. visible when only Task/Output Schema are hidden', () => {
  render(<CommonStateFields state={{ id: 's' }} showTask={false} showOutputSchema={false} />)
  expect(screen.getByText('Interrupt Before')).toBeInTheDocument()
})

it('showAllFields={false} still hides Task/Output Schema regardless of new props defaults', () => {
  render(<CommonStateFields state={{ id: 's' }} showAllFields={false} />)
  expect(screen.queryByPlaceholderText('Describe the task for this node')).not.toBeInTheDocument()
  expect(screen.queryByPlaceholderText('Expected output format (JSON Schema)')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run --project unit src/pages/workflows/editor/configPanels/__tests__/CommonStateFields.test.tsx`
Expected: FAIL — `showTask`/`showOutputSchema` props don't exist yet, so Task/Output Schema
always render together under `showAllFields`.

- [ ] **Step 3: Implement the props**

In `CommonNodeFieldsProps` (line 148-152) add `showTask?: boolean` and
`showOutputSchema?: boolean`. In the component signature (line 231) destructure
`showTask = true, showOutputSchema = true`. Split the `task` `FieldController` (lines 303-315)
into its own `{showAllFields && showTask && (...)}` wrapper, and the `output_schema`
`FieldController` (lines 317-329) into `{showAllFields && showOutputSchema && (...)}`. Leave the
outer `{showAllFields && (<>...</>)}` wrapper (line 301) around the whole block as-is so
`interrupt_before` through `result_as_human_message` keep their current `showAllFields`-only gate.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --project unit src/pages/workflows/editor/configPanels/__tests__/CommonStateFields.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

Commit `CommonStateFields.tsx` and its test file per the repository's existing commit convention.

---

## Task 2: Custom-node Task-visibility rule

**Files:**
- Modify: `src/pages/workflows/editor/configPanels/components/CustomNodeSelector.tsx` (add
  exported constant near `CUSTOM_NODE_OPTIONS`, line 34)
- Test: `src/pages/workflows/editor/configPanels/components/__tests__/CustomNodeSelector.test.tsx`
  (create if no test file for this component exists yet; otherwise append)

**Interfaces:**
- Consumes: `CustomNodeType` enum (`src/types/workflowEditor/configuration.ts:75-82`).
- Produces: `export const CUSTOM_NODE_TYPES_USING_TASK: Set<CustomNodeType>` containing only
  `CustomNodeType.STATE_PROCESSOR`. Task 4 imports this to compute `CustomTab`'s `showTask` prop.

**Test-first: yes — `CUSTOM_NODE_TYPES_USING_TASK.has(CustomNodeType.STATE_PROCESSOR)` must be
`true` and every other currently-selectable type must be `false`; this fails today because the
constant does not exist.**

- [ ] **Step 1: Write the failing test**

```tsx
import { CustomNodeType } from '@/types/workflowEditor/configuration'
import { CUSTOM_NODE_TYPES_USING_TASK } from '../CustomNodeSelector'

describe('CUSTOM_NODE_TYPES_USING_TASK', () => {
  it('includes only STATE_PROCESSOR among currently-selectable custom node types', () => {
    expect(CUSTOM_NODE_TYPES_USING_TASK.has(CustomNodeType.STATE_PROCESSOR)).toBe(true)
    expect(CUSTOM_NODE_TYPES_USING_TASK.has(CustomNodeType.GENERATE_DOCUMENT_TREE)).toBe(false)
    expect(CUSTOM_NODE_TYPES_USING_TASK.has(CustomNodeType.RESULT_FINALIZER)).toBe(false)
    expect(CUSTOM_NODE_TYPES_USING_TASK.has(CustomNodeType.SUPERVISOR)).toBe(false)
    expect(CUSTOM_NODE_TYPES_USING_TASK.has(CustomNodeType.SUMMARIZE_CONVERSATION)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/pages/workflows/editor/configPanels/components/__tests__/CustomNodeSelector.test.tsx`
Expected: FAIL — `CUSTOM_NODE_TYPES_USING_TASK` is not exported.

- [ ] **Step 3: Implement the constant**

Add directly below `CUSTOM_NODE_OPTIONS` (line 55) in `CustomNodeSelector.tsx`:

```ts
export const CUSTOM_NODE_TYPES_USING_TASK = new Set<CustomNodeType>([
  CustomNodeType.STATE_PROCESSOR,
])
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit src/pages/workflows/editor/configPanels/components/__tests__/CustomNodeSelector.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

Commit `CustomNodeSelector.tsx` and its test file.

---

## Task 3: Wire `ToolTab`, `SubWorkflowTab`, `AssistantTab`

**Files:**
- Modify: `src/pages/workflows/editor/configPanels/ToolTab.tsx:267`,
  `src/pages/workflows/editor/configPanels/SubWorkflowTab.tsx:163`
- No change: `src/pages/workflows/editor/configPanels/AssistantTab.tsx:385` (AC6 — verified by
  test, not edited)
- Test: `src/pages/workflows/editor/configPanels/__tests__/ToolTab.test.tsx`,
  `src/pages/workflows/editor/configPanels/__tests__/SubWorkflowTab.test.tsx` (append to
  `SubWorkflowTab.test.tsx` if it exists; create `ToolTab.test.tsx` if it doesn't),
  `src/pages/workflows/editor/configPanels/__tests__/AssistantTab.test.tsx` (append or create)

**Interfaces:**
- Consumes: `CommonStateFields`'s `showTask`/`showOutputSchema` props from Task 1.

**Test-first: yes — rendering `ToolTab`/`SubWorkflowTab` must show neither the Task nor the
Output Schema field; rendering `AssistantTab` must keep showing both. The Tool/Sub-workflow
assertions fail today because both call sites render `CommonStateFields` with no override.**

- [ ] **Step 1: Write the failing tests**

For each of `ToolTab` and `SubWorkflowTab`, render the panel with whatever minimal props/mocks its
existing test file already establishes (reuse that file's existing render helper/mocks) and
assert:

```tsx
it('hides Task and Output Schema', () => {
  // render panel via existing helper
  expect(screen.queryByPlaceholderText('Describe the task for this node')).not.toBeInTheDocument()
  expect(screen.queryByPlaceholderText('Expected output format (JSON Schema)')).not.toBeInTheDocument()
})
```

For `AssistantTab`, add the inverse assertion confirming both fields remain visible:

```tsx
it('keeps Task and Output Schema visible', () => {
  // render panel via existing helper
  expect(screen.getByPlaceholderText('Describe the task for this node')).toBeInTheDocument()
  expect(screen.getByPlaceholderText('Expected output format (JSON Schema)')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run --project unit src/pages/workflows/editor/configPanels/__tests__/ToolTab.test.tsx src/pages/workflows/editor/configPanels/__tests__/SubWorkflowTab.test.tsx src/pages/workflows/editor/configPanels/__tests__/AssistantTab.test.tsx`
Expected: FAIL for `ToolTab`/`SubWorkflowTab` (fields currently render); PASS already for
`AssistantTab` (no behavior change — confirms the baseline before touching anything).

- [ ] **Step 3: Implement the call-site changes**

In `ToolTab.tsx:267` change `<CommonStateFields ref={commonStateFieldsRef} state={state} />` to
add `showTask={false} showOutputSchema={false}`. Make the identical change in
`SubWorkflowTab.tsx:163`. Do not touch `AssistantTab.tsx`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --project unit src/pages/workflows/editor/configPanels/__tests__/ToolTab.test.tsx src/pages/workflows/editor/configPanels/__tests__/SubWorkflowTab.test.tsx src/pages/workflows/editor/configPanels/__tests__/AssistantTab.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

Commit `ToolTab.tsx`, `SubWorkflowTab.tsx`, and the test files.

---

## Task 4: Lift live `custom_node_id` and wire `CustomTab`

**Files:**
- Modify: `src/pages/workflows/editor/configPanels/components/CustomNodeForm.tsx:43-47` (props),
  `:132` (watch), add an effect to report changes
- Modify: `src/pages/workflows/editor/configPanels/CustomTab.tsx:67-98` (track live
  `custom_node_id` in state), `:194` (pass `showOutputSchema`/`showTask`)
- Test: `src/pages/workflows/editor/configPanels/__tests__/CustomTab.test.tsx` (create if absent;
  check first — none was found in the technical analysis)
- Test: `src/pages/workflows/editor/configPanels/components/__tests__/CustomNodeForm.test.tsx`
  (append or create)

**Interfaces:**
- Consumes: `CUSTOM_NODE_TYPES_USING_TASK` from Task 2; `showTask`/`showOutputSchema` from Task 1.
- Produces: `CustomNodeFormProps` gains `onCustomNodeIdChange?: (customNodeId?: CustomNodeType) => void`,
  invoked with the current `custom_node_id` on mount and on every change. `CustomTab` holds this in
  a new `const [liveCustomNodeId, setLiveCustomNodeId] = useState<CustomNodeType | undefined>(state?.custom_node_id)`.

**Test-first: yes — `CustomNodeForm` must call `onCustomNodeIdChange` with the live
`custom_node_id` on mount and on every selector change; `CustomTab` must show Task only for
`STATE_PROCESSOR` and update that visibility immediately on an in-panel type change. All three
fail today: the callback prop doesn't exist and `CustomTab` always passes no visibility props.**

- [ ] **Step 1: Write the failing tests**

`CustomNodeForm` test — assert the callback fires with the initial and the updated value:

```tsx
it('reports the current custom_node_id on mount and on change', async () => {
  const onCustomNodeIdChange = vi.fn()
  // render CustomNodeForm with customNodeConfig.custom_node_id = STATE_PROCESSOR and the prop
  expect(onCustomNodeIdChange).toHaveBeenCalledWith(CustomNodeType.STATE_PROCESSOR)
  // simulate selecting a different type via the existing CustomNodeSelector interaction
  // used by this file's current tests, then:
  expect(onCustomNodeIdChange).toHaveBeenLastCalledWith(CustomNodeType.GENERATE_DOCUMENT_TREE)
})
```

`CustomTab` test — assert the visibility matrix and the live reaction:

```tsx
it('shows Output Schema hidden and Task visible for state_processor', () => {
  // render CustomTab with state.custom_node_id = STATE_PROCESSOR
  expect(screen.getByPlaceholderText('Describe the task for this node')).toBeInTheDocument()
  expect(screen.queryByPlaceholderText('Expected output format (JSON Schema)')).not.toBeInTheDocument()
})

it('hides Task for generate_documents_tree', () => {
  // render CustomTab with state.custom_node_id = GENERATE_DOCUMENT_TREE
  expect(screen.queryByPlaceholderText('Describe the task for this node')).not.toBeInTheDocument()
})

it('updates Task visibility live when the custom node type changes in-panel', async () => {
  // render CustomTab with state.custom_node_id = GENERATE_DOCUMENT_TREE (Task hidden)
  // interact with CustomNodeSelector to change type to STATE_PROCESSOR
  expect(screen.getByPlaceholderText('Describe the task for this node')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run --project unit src/pages/workflows/editor/configPanels/__tests__/CustomTab.test.tsx src/pages/workflows/editor/configPanels/components/__tests__/CustomNodeForm.test.tsx`
Expected: FAIL — no `onCustomNodeIdChange` prop exists; `CustomTab` always shows both fields.

- [ ] **Step 3: Implement the lift and the wiring**

In `CustomNodeForm.tsx`: add `onCustomNodeIdChange?: (customNodeId?: CustomNodeType) => void` to
`CustomNodeFormProps` (line 43-47) and destructure it in the component signature (line 114). Add
`useEffect(() => { onCustomNodeIdChange?.(customNodeId) }, [customNodeId, onCustomNodeIdChange])`
near the existing `customNodeId = watch('custom_node_id')` line (132) — this fires on mount
(initial value) and on every subsequent change, since `handleCustomNodeTypeChange` already drives
`customNodeId` through `setValue`.

In `CustomTab.tsx`: add
`const [liveCustomNodeId, setLiveCustomNodeId] = useState<CustomNodeType | undefined>(state?.custom_node_id)`
next to the existing `customNodeActorConfig` state (line 84). Pass
`onCustomNodeIdChange={setLiveCustomNodeId}` to `<CustomNodeForm>` (line 186-191). Change line 194
to:
`<CommonStateFields ref={commonStateFieldsRef} state={state} showOutputSchema={false} showTask={liveCustomNodeId ? CUSTOM_NODE_TYPES_USING_TASK.has(liveCustomNodeId) : false} />`,
importing `CUSTOM_NODE_TYPES_USING_TASK` from `./components/CustomNodeSelector` and
`CustomNodeType` from `@/types/workflowEditor/configuration`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --project unit src/pages/workflows/editor/configPanels/__tests__/CustomTab.test.tsx src/pages/workflows/editor/configPanels/components/__tests__/CustomNodeForm.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

Commit `CustomNodeForm.tsx`, `CustomTab.tsx`, and the test files.

---

## Task 5: Hidden-value survival regression test

**Files:**
- Test: `src/pages/workflows/editor/configPanels/__tests__/CommonStateFields.test.tsx`

**Interfaces:**
- Consumes: `CommonStateFields`'s `getValues()` (existing `CommonStateFieldsRef` method,
  unchanged) and `showTask`/`showOutputSchema` from Task 1.

**Test-first: yes — a `task`/`output_schema` value already present in `state` must still be
returned by `getValues()` after editing the unrelated, always-visible `id` field, even while both
are hidden via `showTask={false} showOutputSchema={false}`. This is new coverage, not a current
failure: Task 1's design (hide via JSX only, never via `getDefaultValues`/schema) is expected to
already satisfy it, and this step is the explicit proof AC8/AC10 require.**

- [ ] **Step 1: Write the failing test**

```tsx
it('preserves a stored task/output_schema value while hidden, through getValues and a simulated reopen', () => {
  const { ref } = (() => {
    const ref = createRef<CommonStateFieldsRef>()
    render(
      <CommonStateFields
        ref={ref}
        state={{ id: 'test-state', task: 'existing task', output_schema: '{"type":"object"}' }}
        showTask={false}
        showOutputSchema={false}
      />
    )
    return { ref }
  })()

  expect(ref.current!.getValues().task).toBe('existing task')
  expect(ref.current!.getValues().output_schema).toBe('{"type":"object"}')

  // Simulate "edit an unrelated field" — id is always rendered
  const idInput = screen.getByPlaceholderText('e.g., analyze_code')
  fireEvent.change(idInput, { target: { value: 'test-state-renamed' } })

  expect(ref.current!.getValues().task).toBe('existing task')
  expect(ref.current!.getValues().output_schema).toBe('{"type":"object"}')
})
```

Import `fireEvent` from `@testing-library/react` alongside the existing `render`/`screen` import
at the top of the file.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/pages/workflows/editor/configPanels/__tests__/CommonStateFields.test.tsx`
Expected: PASS if Task 1 landed as designed (prop controls only JSX, not `defaultValues`/schema);
FAIL only if Task 1's gating accidentally unregistered the field. Run it regardless — it is the
explicit regression proof AC8/AC10 require, not an assumption.

- [ ] **Step 3: Confirm or fix**

If the test fails, the cause is Task 1's implementation having altered `getDefaultValues` or the
validation schema; fix `CommonStateFields.tsx` to restore `task`/`output_schema` to
`CommonNodeFieldValues`/`getDefaultValues`/`validationSchema` unconditionally, independent of the
new props. If it already passes, no production code changes in this task — it is test-only.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit src/pages/workflows/editor/configPanels/__tests__/CommonStateFields.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

Commit the updated test file.

---

## Negative-constraints check

- No backend/API/execution/stored-config-schema change anywhere in Tasks 1–5 — all edits are to
  React components, a UI-side constant, and tests.
- No backend capability API introduced — Task 2's `CUSTOM_NODE_TYPES_USING_TASK` is a local
  hard-coded `Set`, not a fetched schema.
- `TransformTab.tsx` is not touched by any task; Task 1's regression test explicitly re-asserts
  its `showAllFields={false}` precedent still hides Task/Output Schema.
- `registerFields` (`CommonStateFields.tsx:106-118`) is not modified by any task.
- `interrupt_before`, `finish_iteration`, `resolve_dynamic_values_in_prompt`,
  `result_as_human_message`, Transition Settings, and Retry Policy are untouched — Task 1 keeps
  them under the outer `showAllFields` wrapper only, and its own test (`keeps interrupt_before
  etc. visible...`) pins this.
- No new persistence/save code is added for hidden-value preservation (Task 5 is test-only,
  proving the existing react-hook-form mechanism already satisfies it).
