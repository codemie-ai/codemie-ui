# Technical Research

**Task**: workflow editor state-fields node configuration panels task output-schema showAllFields custom-node
**Generated**: 2026-10-21T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

As a workflow author, I want node configuration panels to show only settings that affect the selected node, so that I do not spend time configuring ignored values or mistake their lack of effect for a platform or toolkit bug.

Current behavior by node type:
- Tool / toolkit: Task ignored (label always "Call <tool>"); Output Schema ignored
- Sub-workflow: Task ignored (label always "Executing sub-workflow <id>"); Output Schema ignored
- Custom: state-processor: Task used; Output Schema ignored
- Custom: Bedrock flow / document-tree: Task ignored; Output Schema ignored
- Assistant: Task used as the prompt; Output Schema used for structured output

Add independent showTask and showOutputSchema options to the shared state-fields component. Preserve the existing Transform-tab behavior controlled by showAllFields. Use a UI-side rule identifying which custom node types consume Task. Confirm the supported custom-node list during implementation; do not introduce a backend capability API.

Scope: UI-only. No backend, API, execution behavior, or configuration migration changes.

Affected Areas: Shared state-fields component; Tool, Sub-workflow, Custom, and Assistant node configuration panels; Custom-node Task visibility rule; Workflow editor save/load regression coverage.

Acceptance Criteria:
1. The shared component supports independent showTask and showOutputSchema visibility options.
2. Tool/toolkit and Sub-workflow panels hide both fields.
3. Custom panels hide Output Schema for all custom node types.
4. Custom panels show Task only for node types that consume it: state-processor shows it; Bedrock flow and document-tree hide it.
5. The custom-node Task visibility rule is explicit and checked against the supported custom-node implementations.
6. Assistant panels retain both fields and their existing prompt and structured-output behavior.
7. Existing Transform-tab behavior under showAllFields is unchanged.
8. Opening, editing unrelated settings, saving, and reopening a workflow does not clear or overwrite stored values merely because their fields are hidden.
9. Other State Settings remain unchanged.
10. Regression coverage verifies the visibility matrix, Assistant and Transform behavior, and preservation of existing hidden values.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/workflows/editor/configPanels/CommonStateFields.tsx` — the shared "State Settings" component. Accepts `state`, `idDisabled`, and `showAllFields` (default `true`). Renders `id` unconditionally, then wraps `task`, `output_schema`, `interrupt_before`, `finish_iteration`, `resolve_dynamic_values_in_prompt`, `result_as_human_message` (lines 301–387) plus the whole "Transition Settings" and "Retry Policy" accordions (lines 391–633) behind a single `showAllFields` boolean. There is currently no independent toggle for `task` or `output_schema` alone.
- `src/pages/workflows/editor/configPanels/ToolTab.tsx` (line 267) and `SubWorkflowTab.tsx` (line 163) call `<CommonStateFields ref={...} state={state} />` with no `showAllFields` override, so today they render `task`/`output_schema` (and Transition/Retry) by default, even though the ticket states both fields are ignored for these node types.
- `src/pages/workflows/editor/configPanels/CustomTab.tsx` (line 194) calls `<CommonStateFields ref={commonStateFieldsRef} state={state} />` with no override either — `task` and `output_schema` are shown for every custom node type regardless of whether the selected `custom_node_id` consumes them.
- `src/pages/workflows/editor/configPanels/AssistantTab.tsx` (line 385) also calls the default (`showAllFields` true), matching the requirement to keep both fields for Assistant.
- `src/pages/workflows/editor/configPanels/TransformTab.tsx` (line 200) is the one existing caller that already overrides the flag: `<CommonStateFields ref={commonStateFieldsRef} state={state} showAllFields={false} />`. This hides Task/Output Schema and Transition/Retry together for the `transform_node` custom node type, which has its own dedicated tab (not routed through `CustomTab`).
- `src/pages/workflows/editor/configPanels/components/CustomNodeForm.tsx` — the custom-node-specific form. `custom_node_id` is chosen here (via `CustomNodeSelector`) and is available as `watch('custom_node_id')` (line 132), which is the value a Task-visibility rule would need to inspect from within `CustomTab`.
- `src/pages/workflows/editor/configPanels/components/CustomNodeSelector.tsx` (lines 34–55) — the actual list of custom node types a user can currently select: `GENERATE_DOCUMENT_TREE` ("Generate Document Tree"), `STATE_PROCESSOR` ("State Processor"), `RESULT_FINALIZER` ("Result Finalizer"), `SUPERVISOR` ("Supervisor"), `SUMMARIZE_CONVERSATION` ("Summarize Conversation"). `TRANSFORM` exists in the `CustomNodeType` enum (`src/types/workflowEditor/configuration.ts` line 81) but is deliberately excluded from this selector/list because it is handled by `TransformTab`, not `CustomTab`.
- `src/pages/workflows/editor/configPanels/utils/formUtils.ts` — `buildCommonStateConfig()` (lines 20–35) always reads `commonValues.task` / `commonValues.output_schema` straight from `CommonStateFields`'s `getValues()` and writes them into the saved state unconditionally, regardless of whether those fields were rendered.

### Architecture and Layers Affected

- **Shared form component layer**: `CommonStateFields` (state-fields component) — needs new `showTask` / `showOutputSchema` props, independent of `showAllFields`.
- **Node configuration panel layer**: `ToolTab`, `SubWorkflowTab`, `CustomTab`, `AssistantTab` (all under `src/pages/workflows/editor/configPanels/`) — each is the call site that must pass the new visibility props appropriately.
- **Custom-node domain layer**: `CustomNodeType` enum and `CustomNodeSelector`'s option list (`src/types/workflowEditor/configuration.ts`, `components/CustomNodeSelector.tsx`) — source of truth for which custom node type is active; a new Task-visibility rule must be keyed off this same enum.
- **Save/load layer**: `formUtils.ts` `buildCommonStateConfig` and `CommonStateFields`'s internal `useForm` default values (`getDefaultValues`, lines 154–181) — this is where hidden-field preservation already happens today (see Patterns below) and must continue to.

### Integration Points

- `CommonStateFields` is a `forwardRef` component exposing `getValues`, `validate`, `isDirty`, `reset` via `useImperativeHandle`; every panel (`ToolTab`, `SubWorkflowTab`, `CustomTab`, `AssistantTab`, `TransformTab`) holds a `commonStateFieldsRef` and calls these methods during its own `saveData()`. Adding new props does not change this ref contract.
- `registerFields` (`src/pages/workflows/editor/utils/visualEditorFieldRegistry.ts`, called at `CommonStateFields.tsx` line 106) registers `task`, `output_schema`, etc. against `NodeTypes.ASSISTANT, CUSTOM, TOOL, TRANSFORM` for some cross-cutting concern (likely validation-issue routing / field highlighting, not rendering) — this registry is populated at module scope independent of per-instance `showAllFields`, so it is unaffected by hiding fields at render time, but worth checking it still makes sense once Task/Output Schema are hidden for Tool.
- `NodeTypes` (`src/types/workflowEditor/base.ts` lines 31–43): `ASSISTANT`, `CUSTOM`, `TOOL`, `TRANSFORM`, `SUB_WORKFLOW` are the five actionable node types; `SUB_WORKFLOW` is notably absent from the `registerFields` list for task/output_schema at line 117, consistent with Sub-Workflow already not really using Task for anything registry-tracked.

### Patterns and Conventions

- **Hidden-but-preserved values already work by construction**: `CommonStateFields`'s `useForm` is initialized once with `defaultValues: getDefaultValues(state)` (line 242), which seeds `task`/`output_schema` from the existing `state` object regardless of whether those fields are rendered. `getValues()` (used by every panel's `saveData`) returns those seeded values even for fields never mounted into the DOM, because react-hook-form keeps unregistered-but-defaulted values in its internal state until a field actually registers and diverges. This is the mechanism AC8 relies on — hiding a field via a new prop should not, by itself, break this, as long as the field's `name` stays part of `CommonNodeFieldValues`/`getDefaultValues`/`validationSchema` and is simply not wrapped in a `<FieldController>` when hidden.
- **Conditional rendering by boolean flag inside the same accordion**: the existing `showAllFields && (...)` block (line 301) is the direct precedent to extend into two independent conditions (`showTask`, `showOutputSchema`) wrapping just the `task` and `output_schema` `FieldController`s, while the remaining fields in that block (`interrupt_before`, `finish_iteration`, etc.) stay governed only by `showAllFields` per AC9 ("Other State Settings remain unchanged").
- **Per-panel override pattern**: `TransformTab` demonstrates the established way a panel opts out of default visibility — pass an explicit prop into `<CommonStateFields .../>`. New callers (`ToolTab`, `SubWorkflowTab`, `CustomTab`) will follow the same call-site pattern with the new `showTask`/`showOutputSchema` props instead of toggling everything with `showAllFields`.
- **Custom-node type gating precedent**: `CustomNodeForm.tsx` already branches UI by `customNodeId` (e.g., `argsMode !== CONFIG_ARGS_MODE.NONE` at line 259) using `watch('custom_node_id')`. A Task-visibility rule for custom nodes would most naturally live as a small exported predicate/constant (e.g., a `Set`/array of `CustomNodeType` values that consume Task) consumed by `CustomTab`, mirroring how `CustomNodeSelector.CUSTOM_NODE_OPTIONS` already enumerates the supported types explicitly rather than deriving them from a backend schema call.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/patterns/state-management.md` and `.ai-run/guides/components/component-patterns.md` are the P1/architecture guides for this kind of shared-component change (component construction, Valtio/react-hook-form patterns) but were not read in full here; AGENTS.md routes "building or placing UI components" work there — consult before implementation for prop-naming/organization conventions.
- No guide file specifically documents `CommonStateFields`, `showAllFields`, or custom-node Task semantics; this ticket's own description is the most authoritative source for current-vs-desired behavior.

### Architectural Decisions

- No ADR or inline `NOTE:`/`DECISION:` marker was found in `CommonStateFields.tsx`, `CustomTab.tsx`, `CustomNodeForm.tsx`, or `CustomNodeSelector.tsx` explaining why Task/Output Schema are unconditionally shown for Tool, Sub-Workflow, and all Custom node types today — this appears to be an oversight the ticket is correcting, not a documented intentional design.

### Derived Conventions

- Visibility of groups of fields in `CommonStateFields` is controlled by boolean props with a `show*` naming convention (`showAllFields`), defaulting to `true` (opt-out, not opt-in) — new props should follow the same naming and default.
- Node-type-specific business rules (which custom node types support which capability) are hard-coded as UI-side lists next to the relevant form, not fetched from the backend (`CustomNodeSelector.CUSTOM_NODE_OPTIONS`) — this matches the ticket's explicit instruction not to introduce a backend capability API.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/workflows/editor/configPanels/__tests__/CommonStateFields.test.tsx` — covers only the `ResetKeysInput`/reset-keys-in-context-store behavior (comma-parsing, blur commit, external sync). It mocks `ConfigAccordion` to always render children and mocks `registerFields` and `useWorkflowContext`. It does **not** currently test `showAllFields`, `task`, or `output_schema` rendering/visibility at all.
- `src/pages/workflows/editor/configPanels/__tests__/SubWorkflowTab.test.tsx`, `GeneralConfigTab.test.tsx`, `AdvancedConfigTab.test.tsx`, `YamlPanel.test.tsx` exist under the same `__tests__` directory but were not opened in depth; none appeared in the `showAllFields` grep, so none currently assert field-visibility behavior for Tool, Custom, or Assistant panels.
- No test file currently exercises `ToolTab`, `CustomTab`, or `AssistantTab`'s rendering of `CommonStateFields` at all (no matches for those component names paired with "Task"/"Output Schema" assertions).

### Testing Framework and Patterns

- Vitest + React Testing Library (`render`, `screen`, `userEvent`), consistent with the repo-wide stack noted in AGENTS.md (`unit` and `integration` Vitest projects).
- Module mocking via `vi.mock` is the established pattern for isolating `CommonStateFields` from `ConfigAccordion`, `registerFields`, and `useWorkflowContext` — any new test for visibility toggles should reuse this harness (`renderWithResetKeys`-style helper) rather than building a new one.

### Coverage Gaps

- No existing test asserts what `CommonStateFields` renders or hides for any combination of `showAllFields`/`showTask`/`showOutputSchema` — this is a full gap the new regression coverage (AC10) will need to fill from scratch.
- No existing test asserts that `ToolTab`, `SubWorkflowTab`, or `CustomTab` pass the correct visibility props into `CommonStateFields`, or that `CustomTab` picks Task visibility correctly per `custom_node_id`.
- No existing test asserts the "hidden field value survives save/reload" behavior (AC8) for `task`/`output_schema` specifically, even though the underlying react-hook-form mechanism already appears to support it (see Patterns above) — this needs an explicit regression test, not just reliance on existing architecture.

---

## 5. Configuration and Environment

### Environment Variables

- None found specific to this feature area; this is a pure client-side form-rendering change with no `import.meta.env`/`window._env_` touchpoints identified in the files read.

### Configuration Files

- Not applicable — no config files govern node-panel field visibility; it is entirely in-component React logic.

### Feature Flags and Deployment Concerns

- No feature flag or toggle currently gates `showAllFields` or any node-panel visibility; introducing `showTask`/`showOutputSchema` as plain component props (not flags) is consistent with current practice.

---

## 6. Risk Indicators

- **"Bedrock flow" custom node type does not exist in the current enum/UI.** `CustomNodeType` (`configuration.ts`) and `CustomNodeSelector.CUSTOM_NODE_OPTIONS` list only `GENERATE_DOCUMENT_TREE`, `STATE_PROCESSOR`, `RESULT_FINALIZER`, `SUPERVISOR`, `SUMMARIZE_CONVERSATION` (plus `TRANSFORM`, handled separately). The ticket names "Bedrock flow / document-tree" as a pair that ignores Task; `document-tree` maps cleanly to `GENERATE_DOCUMENT_TREE`, but no option is labeled "Bedrock" anything. The ticket itself anticipates this ("Confirm the supported custom-node list during implementation") — flag this as an open question to resolve with the ticket owner/backend before finalizing the Task-visibility rule, rather than guessing which of `RESULT_FINALIZER`/`SUPERVISOR`/`SUMMARIZE_CONVERSATION` is meant.
- **Four separate call sites currently default to showing all fields.** `ToolTab`, `SubWorkflowTab`, `CustomTab`, `AssistantTab` all call `<CommonStateFields state={state} />` with no override, relying on `showAllFields = true`. Changing the default or forgetting to update even one of these call sites will silently leave Task/Output Schema visible where the ticket requires them hidden (Tool, Sub-Workflow) or visible unconditionally for all custom types (Custom).
- **`CustomTab` has no current access pattern surfaced for `custom_node_id` at the panel level** — `custom_node_id` lives inside `CustomNodeForm`'s internal `useForm`/`watch`, while `CommonStateFields` is a sibling rendered from `CustomTab`. Wiring the Task-visibility rule will need either lifting `custom_node_id` state up to `CustomTab`, or reading `state?.custom_node_id` / the resolved `customNodeActorConfig.custom_node_id` already available in `CustomTab` (via `getCustomNodeActorConfig`, line 94) for the *saved* value — but a newly-selected-but-unsaved type change inside `CustomNodeForm` would not propagate to `CommonStateFields` without an explicit state hookup. Speculative: implementation will likely need `CustomTab` to track the live `custom_node_id` (e.g., via a callback from `CustomNodeForm` or a lifted `watch`) so Task visibility updates as the user changes the custom node type, not just on reopen.
- **Zero existing render/visibility tests for `CommonStateFields` or its callers** — AC10's regression coverage is being added to a component that currently has no assertions on its primary rendering behavior (only on the `ResetKeysInput` sub-component), so test-writing is additive risk/effort, not a modification of brittle existing tests.
- **`registerFields` call at `CommonStateFields.tsx:106-118`** ties `task`/`output_schema` to `NodeTypes.ASSISTANT, CUSTOM, TOOL, TRANSFORM` for what appears to be validation/issue-routing purposes, independent of render visibility. Hiding fields visually without revisiting this registry could leave a now-invisible field still eligible for "active issue" focus/highlighting in Tool or Custom panels where it shouldn't be interactable — worth a dedicated check during implementation, though it is a UI-only concern and not a backend capability.

---

## 7. Summary for Complexity Assessment

This is a UI-only change concentrated in one shared component (`CommonStateFields.tsx`) and four thin call sites (`ToolTab`, `SubWorkflowTab`, `CustomTab`, `AssistantTab`); `TransformTab`'s existing `showAllFields={false}` override is the direct precedent and should not need to change. The core mechanical work — adding `showTask`/`showOutputSchema` props and wrapping two existing `FieldController`s independently instead of under the current single `showAllFields` block — is small and low-risk, reusing an already-proven pattern (hidden-but-defaulted react-hook-form values, confirmed by reading `getDefaultValues`/`buildCommonStateConfig`, already satisfy the "preserve hidden values" requirement without new plumbing).

The primary source of complexity and risk is not the component change itself but (a) establishing the UI-side custom-node Task-visibility rule against an enum (`CustomNodeType`) whose "Bedrock flow" member referenced by the ticket does not clearly exist today, requiring confirmation before the rule can be written correctly, and (b) wiring `CustomTab` to know the live/selected `custom_node_id` so visibility reacts to in-progress edits, not just the persisted state, since `CustomNodeForm` currently owns that value internally. Test coverage is a real gap: `CommonStateFields.test.tsx` currently tests none of its primary rendering logic, so the required regression suite (visibility matrix × four node types, Assistant/Transform preservation, hidden-value survival across save/reload) is being built from zero rather than extended, which is additional but bounded effort for a UI-only, no-backend-change ticket.

---

## 8. External References

None named by the task.
