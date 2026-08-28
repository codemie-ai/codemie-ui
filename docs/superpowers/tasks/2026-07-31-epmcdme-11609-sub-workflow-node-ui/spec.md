# Spec: EPMCDME-11609-UI-1 — Sub-workflow node type wiring

**Ticket:** EPMCDME-11609 (UI Story 1)
**Branch:** EPMCDME-11609_sub-workflow-node-ui
**Size:** M
**Date:** 2026-07-31

---

## 1. Purpose

Establish the core type and serialization foundation for the sub-workflow node in the workflow editor UI. No visual component, no config panel, no form fields — those belong to Stories 2 and 3. When this story is merged, the editor can parse, represent, and round-trip YAML states with `workflow_id` correctly, and the feature flag constant is in place for Story 2 to gate the sidebar entry.

---

## 2. Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| `ACTOR_FIELD_MAP` entry | **None** | Map is used by `cleanupUnusedReferences` for embedded actor configs (`assistants`, `tools`, `custom_nodes`). Sub-workflow references an external entity — no embedded config array exists in the YAML. |
| `NODE_TYPE_TO_CONFIG_ARRAY` entry | **None** | Map resolves actor config sections for issue validation. No `sub_workflows` section in `WorkflowConfiguration`. |
| `ISSUE_FIELD_MAP` entry | **`sub_workflow: 'workflow_id'`** | Lets the issue validation layer resolve the ID field for error display. |
| `nodeTemplates` category | **`HIDDEN`** | Node must not appear in the sidebar palette until Story 2 adds the SVG icon and feature-flag gate. |
| `WorkflowPoolConfig` location | **`configuration.ts`** | Shared by both the editor type system and the `Workflow` entity type; co-locating avoids a cross-module import. |
| Serializer pass-through | **`...rest` spread — verify, don't patch upfront** | The serializer's `processConnectedState` already spreads unknown fields. Confirm `workflow_id`/`input_mapping` survive the spread during implementation; add explicit keys only if they don't. |

---

## 3. Feature Flag

**File:** `src/constants/featureFlags.ts`

```ts
SUB_WORKFLOW: 'features:subWorkflow',
```

**File:** `src/hooks/useFeatureFlags.ts`

```ts
export const useSubWorkflowEnabled = () => useFeatureFlag(FEATURE_FLAGS.SUB_WORKFLOW)
```

The string value `'features:subWorkflow'` follows the `features:camelCase` convention used by all existing workflow flags. The flag resolves to `true` only when the backend `/v1/configs` endpoint emits `features.subWorkflow.enabled = true`.

---

## 4. Node Type Registration

**File:** `src/types/workflowEditor/base.ts`

Add to `NodeTypes`:
```ts
SUB_WORKFLOW: 'sub_workflow',
```

Add to `nodeTemplates`:
```ts
{
  type: NodeTypes.SUB_WORKFLOW,
  label: 'Sub-workflow',
  icon: null,
  category: NodeTemplateCategory.HIDDEN,
},
```

`icon: null` is a placeholder; Story 2 replaces it with the SVG import. `HIDDEN` ensures the node never appears in the sidebar palette in this story.

`SUB_WORKFLOW` is **not** added to `MetaNodeTypes` — it is an actor/execution node, not a structural node.

---

## 5. Type Definitions

**File:** `src/types/workflowEditor/configuration.ts`

### 5a. `WorkflowPoolConfig`

```ts
export interface WorkflowPoolConfig {
  enabled: boolean
  min_size?: number
  max_size?: number
  refill_interval_seconds?: number
}
```

### 5b. `SubWorkflowStateConfiguration`

```ts
export interface SubWorkflowStateConfiguration extends CommonStateConfiguration {
  workflow_id: string
  input_mapping?: Record<string, string>
}
```

Add `SubWorkflowStateConfiguration` to the `StateConfiguration` union:
```ts
export type StateConfiguration =
  | AssistantStateConfiguration
  | ToolStateConfiguration
  | ConditionalStateConfiguration
  | NoteStateConfiguration
  | SwitchStateConfiguration
  | CustomNodeStateConfiguration
  | TransformStateConfiguration
  | IteratorStateConfiguration
  | SubWorkflowStateConfiguration   // ← new
```

### 5c. `WorkflowConfiguration` additions

```ts
pool_config?: WorkflowPoolConfig
max_nesting_level?: number
```

---

## 6. Entity Type

**File:** `src/types/entity/workflow.ts`

Add to `Workflow` interface:
```ts
pool_config?: WorkflowPoolConfig
max_nesting_level?: number
```

Import `WorkflowPoolConfig` from `@/types/workflowEditor/configuration`.

---

## 7. Serialization Types

**File:** `src/utils/workflowEditor/serialization/types.ts`

Add to `SerializedState`:
```ts
workflow_id?: string
input_mapping?: Record<string, string>
```

Add to `SerializedWorkflowConfig`:
```ts
pool_config?: WorkflowPoolConfig
max_nesting_level?: number
```

Import `WorkflowPoolConfig` from `@/types/workflowEditor/configuration`.

---

## 8. Deserializer

**File:** `src/utils/workflowEditor/serialization/deserializer/deserializer.ts`

In `inferNodeType`, insert before the final fallback:
```ts
if (state.workflow_id) return NodeTypes.SUB_WORKFLOW
```

Full updated function:
```ts
const inferNodeType = (state: SerializedState): string => {
  if (state.assistant_id) return NodeTypes.ASSISTANT
  if (state.tool_id) return NodeTypes.TOOL
  if (state.custom_node_id === TRANSFORM_CUSTOM_ACTOR_ID) return NodeTypes.TRANSFORM
  if (state.workflow_id) return NodeTypes.SUB_WORKFLOW   // ← new
  if (state.custom_node_id) return NodeTypes.CUSTOM
  return NodeTypes.CUSTOM
}
```

The `workflow_id` check is placed after `tool_id` and before the `custom_node_id` fallback so that a state with only `workflow_id` set is unambiguously identified as `sub_workflow`.

`pool_config` and `max_nesting_level` are top-level YAML fields that flow through the existing `...rest` spread in the deserializer root — no additional handling required.

---

## 9. Serializer

**File:** `src/utils/workflowEditor/serialization/serializer.ts`

`workflow_id` and `input_mapping` are state-level fields. The serializer's `processConnectedState` spreads unknown state fields via `...rest`. Verify during implementation that both fields survive the spread into the output YAML. If either is stripped (e.g., by an explicit pick list), add them explicitly:
```ts
workflow_id: state.workflow_id,
input_mapping: state.input_mapping,
```

`pool_config` and `max_nesting_level` are top-level config fields. Verify they pass through the top-level spread similarly.

---

## 10. State Creation

**File:** `src/utils/workflowEditor/actions/states/createState.ts`

Add before the final default case:
```ts
if (nodeType === NodeTypes.SUB_WORKFLOW) {
  return {
    id,
    workflow_id: '',
    input_mapping: {},
    next: {},
    _meta: {
      position,
      type: nodeType,
      is_connected: false,
      selected: true,
    },
  } as StateConfiguration
}
```

---

## 11. Constants and Helpers

### 11a. `constants.ts`

**File:** `src/utils/workflowEditor/constants.ts`

Add to `ISSUE_FIELD_MAP` only:
```ts
export const ISSUE_FIELD_MAP = {
  assistant: 'assistant_id',
  tool: 'tool_id',
  custom: 'custom_node_id',
  transform: 'custom_node_id',
  sub_workflow: 'workflow_id',   // ← new
} as const
```

No entries in `ACTOR_FIELD_MAP` or `NODE_TYPE_TO_CONFIG_ARRAY` — see Design Decisions §2.

### 11b. `stateTypeCheckers.ts`

**File:** `src/utils/workflowEditor/helpers/states/stateTypeCheckers.ts`

Add `NodeTypes.SUB_WORKFLOW` to `isExecutionState`:
```ts
export const isExecutionState = (state: StateConfiguration | null): boolean => {
  if (!state?._meta?.type) return false
  return [
    NodeTypes.ASSISTANT,
    NodeTypes.TOOL,
    NodeTypes.CUSTOM,
    NodeTypes.TRANSFORM,
    NodeTypes.SUB_WORKFLOW,   // ← new
  ].includes(state._meta.type as any)
}
```

---

## 12. Test Plan

| File | Scenario |
|---|---|
| `serialization/__tests__/serializer.test.ts` | A state with `workflow_id` and `input_mapping` serializes and retains both fields in the output |
| `serialization/deserializer/__tests__/` | New YAML fixture `workflow-with-sub-workflow.yaml`; `inferNodeType` resolves to `'sub_workflow'`; `pool_config` / `max_nesting_level` round-trip at top level |
| `helpers/nodes/__tests__/nodeTypeCheckers.test.ts` | `isExecutionState` returns `true` for a state with `_meta.type === 'sub_workflow'` |
| `src/utils/__tests__/featureFlags.test.ts` | `FEATURE_FLAGS.SUB_WORKFLOW === 'features:subWorkflow'` |

All existing serializer, deserializer, and helper tests must pass unchanged.

---

## 13. Out of Scope

- `SubWorkflowNode` visual component — Story 2
- `SubWorkflowTab` config panel — Story 2
- Sidebar gating via `useSubWorkflowEnabled` — Story 2
- `getSelectableWorkflows` store method — Story 2
- `pool_config` / `max_nesting_level` form fields — Story 3
