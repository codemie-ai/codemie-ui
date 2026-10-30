# Workflow Editor: Node-Aware Task / Output Schema Visibility — Story

**Date**: 2026-10-21
**Status**: Approved
**Ticket**: EPMCDME-15961 (https://jiraeu.epam.com/browse/EPMCDME-15961)

---

## Context

- The change is concentrated in one shared component, `CommonStateFields` (`src/pages/workflows/editor/configPanels/CommonStateFields.tsx`), and four thin call sites: `ToolTab`, `SubWorkflowTab`, `CustomTab`, `AssistantTab`. `TransformTab` already overrides field visibility via `showAllFields={false}`, which is the existing precedent for this pattern.
- Hidden-but-defaulted form values already survive save/reload through the existing `buildCommonStateConfig` flow — hiding a field visually does not require new persistence plumbing to satisfy "don't clear stored values when hidden."
- The ticket's "Bedrock flow" custom node type is not clearly present in the current custom-node type list (only document-tree/state-processor and a few others exist today). The ticket explicitly defers resolving the exact custom-node → Task-visibility mapping to implementation time, rather than fixing it in the story.
- No current regression coverage exercises field visibility for `CommonStateFields` or its callers — this story requires new tests covering the full visibility matrix, not an extension of existing ones.

---

## Complexity

**Size**: M (15/36) · **Recommended flow**: sdlc-standard

Shared-component change with a clear precedent (TransformTab's existing `showAllFields` override) and low execution risk, but bumped to M because `CommonStateFields` is a core shared utility touching four call sites, likely needs `custom_node_id` state lifted out of `CustomNodeForm`, and AC10's visibility-matrix regression suite has no existing test template to extend.

---

## Story

**As a** workflow author, **I want** node configuration panels to show only the Task and Output Schema fields that actually affect the selected node, **so that** I don't spend time configuring values that are silently ignored, or mistake their lack of effect for a platform or toolkit bug.

---

## Background

Today, the Task and Output Schema fields appear in every node's configuration panel regardless of whether that node type actually consumes them. Tool/toolkit and Sub-workflow nodes ignore both fields entirely; Custom nodes ignore Output Schema always and ignore Task except for the state-processor type; only Assistant nodes genuinely use both. This creates a confusing authoring experience: a workflow author can fill in a Task or Output Schema value, see no effect, and reasonably conclude something is broken rather than realizing the field simply doesn't apply to that node type. This story makes field visibility match actual field behavior per node type, without changing what any field does at execution time.

---

## Acceptance Criteria

- [ ] Given the shared state-fields component, when a consuming panel sets `showTask` and `showOutputSchema` independently, then each field's visibility is controlled separately (not bundled under the existing `showAllFields` toggle).
- [ ] Given a Tool/toolkit or Sub-workflow node is selected, when its configuration panel renders, then neither Task nor Output Schema is shown.
- [ ] Given any Custom node is selected, when its configuration panel renders, then Output Schema is always hidden.
- [ ] Given a Custom node of type state-processor is selected, when its configuration panel renders, then Task is shown; given a Custom node of type Bedrock flow or document-tree is selected, then Task is hidden.
- [ ] Given the custom-node Task-visibility rule, when it is implemented, then it is an explicit, named rule checked against the current set of supported custom-node implementations (not inferred implicitly).
- [ ] Given an Assistant node is selected, when its configuration panel renders, then both Task and Output Schema remain visible and retain their existing prompt / structured-output behavior.
- [ ] Given the Transform tab, when it renders under its existing `showAllFields` configuration, then its field visibility is unchanged by this story.
- [ ] Given an existing workflow with stored Task or Output Schema values on a node type that now hides those fields, when the author opens the workflow, edits an unrelated setting, saves, and reopens it, then the previously stored values are neither cleared nor overwritten.
- [ ] Given any node's configuration panel, when Task/Output Schema visibility changes, then all other State Settings fields remain unaffected.
- [ ] Given the full set of node types (Tool, Sub-workflow, Custom variants, Assistant, Transform), when regression tests run, then they verify the complete visibility matrix, Assistant/Transform preservation, and that previously hidden stored values survive save/reload.

---

## Out of Scope

- Any backend, API, execution-behavior, or configuration-migration changes — this is a UI-only change.
- Introducing a backend capability API to describe which node types consume Task/Output Schema; the rule is UI-side only.
- Final confirmation of the complete custom-node-type → Task-visibility mapping (e.g., resolving the "Bedrock flow" naming against current custom-node implementations) — the ticket defers this to implementation time.

---

## Decisions

- D1: Should the exact custom-node → Task-visibility mapping (including reconciling "Bedrock flow" against the current custom-node type list) be resolved before story approval? → Resolved during implementation, not story approval; the story only requires the rule to be explicit and checked against whatever custom-node types exist at implementation time. — proposed by PO: the ticket's own Description states "Confirm the supported custom-node list during implementation; do not introduce a backend capability API."

---

## Open Questions

- None
