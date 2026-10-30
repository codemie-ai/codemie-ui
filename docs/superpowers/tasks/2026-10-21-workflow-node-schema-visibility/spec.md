# Spec: Show Task and Output Schema only for node types that use them (EPMCDME-15961)

## Intent

Workflow node configuration panels currently render "Task" and "Output Schema" for every
node type, even where the platform ignores them (Tool/toolkit, Sub-workflow, and most Custom
node types). Authors waste time filling in values that have no effect, or mistake the lack of
effect for a bug. This change makes each panel show only the fields that actually affect the
selected node, without touching any backend, API, execution, or stored-configuration behavior.

## Design

Extend `CommonStateFields` (`src/pages/workflows/editor/configPanels/CommonStateFields.tsx`)
with two new, independent boolean props, following the existing `showAllFields` naming/default
convention (opt-out, default `true`):

```ts
interface CommonStateFieldsProps {
  // existing props unchanged
  showAllFields?: boolean;
  showTask?: boolean;
  showOutputSchema?: boolean;
}
```

- Each prop gates only its own `FieldController` inside the block currently at
  `CommonStateFields.tsx:301-387`. `task` is wrapped in `showTask &&`, `output_schema` in
  `showOutputSchema &&`. The remaining fields in that block (`interrupt_before`,
  `finish_iteration`, `resolve_dynamic_values_in_prompt`, `result_as_human_message`) and the
  Transition Settings/Retry Policy accordions (`:391-633`) stay governed only by
  `showAllFields`, unchanged (AC7, AC9).
- `showAllFields={false}` (as `TransformTab.tsx:200` already passes) must continue to hide
  everything it hides today, independent of the new props' defaults. `TransformTab.tsx` is not
  modified.
- Do not remove `task`/`output_schema` from `CommonNodeFieldValues`, `getDefaultValues`, or the
  validation schema, and do not unregister them when hidden. This preserves the existing
  react-hook-form behavior (`CommonStateFields.tsx:242`, `formUtils.ts:20-35`) where a hidden
  field's previously-stored value survives `getValues()`/save/reload untouched (AC8). This is
  the only mechanism relied on for AC8 — no new persistence code is needed.

### Call-site wiring

- `ToolTab.tsx:267` and `SubWorkflowTab.tsx:163`: pass `showTask={false} showOutputSchema={false}`.
- `AssistantTab.tsx:385`: no change — both default to visible, preserving existing prompt and
  structured-output behavior (AC6).
- `CustomTab.tsx:194`: pass `showOutputSchema={false}` unconditionally (AC3), and
  `showTask={customNodeTaskVisibility(custom_node_id)}` per the rule below (AC4).

### Custom-node Task-visibility rule

Add a small exported predicate/constant next to `CustomNodeSelector.CUSTOM_NODE_OPTIONS`
(`src/pages/workflows/editor/configPanels/components/CustomNodeSelector.tsx`), keyed off the
existing `CustomNodeType` enum, e.g. a `Set<CustomNodeType>` named `CUSTOM_NODE_TYPES_USING_TASK`
containing only `STATE_PROCESSOR`. Every other currently-selectable type —
`GENERATE_DOCUMENT_TREE`, `RESULT_FINALIZER`, `SUPERVISOR`, `SUMMARIZE_CONVERSATION` — defaults to
hidden. This is a documented decision, not a gap: the ticket names only `state-processor` as
Task-consuming and "Bedrock flow / document-tree" as not; the ticket's own "Bedrock flow" label
has no matching `CustomNodeType` today, and the ticket defers final confirmation of the mapping
to implementation. Hiding by default is the safe choice (it matches the ticket's stated goal of
hiding ignored fields; a wrongly-hidden field is a lesser error than a wrongly-shown one that
revives the original bug this ticket fixes). `TRANSFORM` is out of scope for this rule — it never
reaches `CustomTab`.

`CustomTab` must evaluate this rule against the **live** selected custom node type, not only the
last-saved one, so visibility updates immediately if the author changes the custom node type
without closing the panel. `custom_node_id` is currently local to `CustomNodeForm`'s internal
`useForm` (`CustomNodeForm.tsx:132`). Lift it: have `CustomNodeForm` report the current
`custom_node_id` to `CustomTab` (e.g. a lifted `watch` subscription or an `onCustomNodeIdChange`
callback), and have `CustomTab` hold it in state to drive the `showTask` prop passed to
`CommonStateFields`.

### `registerFields` registry

No change. `registerFields` (`CommonStateFields.tsx:106-118`) is a validation/issue-routing
registry independent of render visibility; confirm during implementation that an invisible field
cannot still surface an "active issue" highlight for Tool/Sub-workflow/non-Task custom panels, but
do not restructure the registry for this ticket.

## Acceptance Criteria

1. `CommonStateFields` accepts `showTask` and `showOutputSchema` as independent boolean props,
   each defaulting to `true`, gating only `task` and `output_schema` respectively.
2. `ToolTab` and `SubWorkflowTab` pass `showTask={false}` and `showOutputSchema={false}`; neither
   field renders for Tool/toolkit or Sub-workflow nodes.
3. `CustomTab` passes `showOutputSchema={false}` for every custom node type.
4. `CustomTab` passes `showTask` derived from `CUSTOM_NODE_TYPES_USING_TASK`: visible for
   `STATE_PROCESSOR`, hidden for `GENERATE_DOCUMENT_TREE` and every other currently-selectable
   custom node type, and reacts live to an in-panel type change.
5. The Task-visibility rule is a single named, exported constant/predicate checked against
   `CustomNodeSelector.CUSTOM_NODE_OPTIONS`'s current list, not an inline conditional duplicated
   per call site.
6. `AssistantTab` is unmodified; Task (prompt) and Output Schema (structured output) remain
   visible and functionally unchanged.
7. `TransformTab`'s `showAllFields={false}` call and behavior are unmodified.
8. A `task`/`output_schema` value already stored on a node survives open → edit an unrelated
   field → save → reopen, even while hidden, with no new persistence code.
9. `interrupt_before`, `finish_iteration`, `resolve_dynamic_values_in_prompt`,
   `result_as_human_message`, Transition Settings, and Retry Policy are ungated by the new props
   and keep their current `showAllFields`-only behavior.
10. New regression tests cover: the visibility matrix (Tool, Sub-workflow, each custom node type,
    Assistant), Assistant/Transform preservation, live reaction to a custom-node-type change, and
    hidden-value survival across save/reload, using the existing Vitest + RTL + `vi.mock` harness
    pattern from `CommonStateFields.test.tsx`.

## Non-goals

- No backend, API, execution-behavior, or stored-configuration-schema changes.
- No backend capability API for custom-node Task support; the rule is a hard-coded UI-side list.
- No change to `TransformTab`'s existing `showAllFields` mechanism or its call site.
- No change to the `registerFields` validation/issue-routing registry.
- No change to `interrupt_before`, `finish_iteration`, `resolve_dynamic_values_in_prompt`,
  `result_as_human_message`, Transition Settings, or Retry Policy visibility rules.
- No renaming or restructuring of `CommonNodeFieldValues`, `getDefaultValues`, or the validation
  schema beyond what's needed to keep `task`/`output_schema` registered-but-hidden.
- No final, backend-confirmed mapping of every custom node type to Task support — the rule
  documented here (state-processor only) is the implementation default pending any later
  correction, per the ticket's own deferral.

## Open risks

- If a future custom node type genuinely consumes Task but isn't added to
  `CUSTOM_NODE_TYPES_USING_TASK`, it will silently hide Task for that type until someone updates
  the list — same class of risk as `CustomNodeSelector.CUSTOM_NODE_OPTIONS` already carries today.
- Lifting `custom_node_id` out of `CustomNodeForm` touches a second component beyond the four
  listed call sites; implementation should keep this lift minimal (read-only reporting upward) to
  avoid widening scope into `CustomNodeForm`'s own behavior.
