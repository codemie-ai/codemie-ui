# Sub-workflow Node Type Wiring — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the `sub_workflow` node type into the editor's type system, serialization layer, state creation, and helper constants so YAML states with `workflow_id` parse and round-trip correctly, and the feature-flag constant is ready for Story 2.

**Architecture:** Pure type/constant additions — no new visual components. The serializer already uses `...rest` spread (via `stripMeta` which destructures only `_meta`), so `workflow_id`/`input_mapping` pass through automatically. The deserializer needs one new guard in `inferNodeType`. All other changes are additive: new interface, new union member, new constant entry, new `if` branch in `buildState`.

**Tech Stack:** TypeScript, Vitest 1.6.1, `@testing-library/react`, `js-yaml`, ReactFlow

## Global Constraints

- Node value must be the lowercase string `'sub_workflow'` (matches backend `WorkflowState` discriminator)
- Feature flag key must be `'features:subWorkflow'` (follows `features:camelCase` convention)
- `nodeTemplates` entry must use `NodeTemplateCategory.HIDDEN` — no sidebar icon in this story
- `ACTOR_FIELD_MAP` and `NODE_TYPE_TO_CONFIG_ARRAY` must NOT receive a `sub_workflow` entry
- `ISSUE_FIELD_MAP` gets `sub_workflow: 'workflow_id'` only
- Tests run with: `npm run test:unit -- --reporter=verbose <path>`
- All existing tests must continue passing

---

### Task 1: Feature flag constant and hook

**Test-first: yes — verify `FEATURE_FLAGS.SUB_WORKFLOW === 'features:subWorkflow'`**

**Files:**
- Modify: `src/constants/featureFlags.ts:19-31`
- Modify: `src/hooks/useFeatureFlags.ts` (append at end)
- Test: `src/utils/__tests__/featureFlags.test.ts` (add test case)

**Interfaces:**
- Produces: `FEATURE_FLAGS.SUB_WORKFLOW` constant (value `'features:subWorkflow'`) consumed by Task 8 and Story 2

- [ ] **Step 1: Write the failing test**

Open `src/utils/__tests__/featureFlags.test.ts` and add at the end of the file (after the last `describe` block):

```ts
describe('FEATURE_FLAGS.SUB_WORKFLOW', () => {
  it('has value features:subWorkflow', () => {
    expect(FEATURE_FLAGS.SUB_WORKFLOW).toBe('features:subWorkflow')
  })
})
```

The import at the top of the file already has `import { FEATURE_FLAGS } from '@/constants'` — no new import needed.

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:unit -- --reporter=verbose src/utils/__tests__/featureFlags.test.ts
```

Expected: FAIL — `FEATURE_FLAGS.SUB_WORKFLOW` is `undefined`

- [ ] **Step 3: Add the constant to `src/constants/featureFlags.ts`**

In the `FEATURE_FLAGS` object (line ~19), add the new entry before `} as const`:

```ts
export const FEATURE_FLAGS = {
  ENTERPRISE_EDITION: 'features:enterpriseEdition',
  USER_MANAGEMENT: 'features:userManagement',
  BUDGET_MANAGEMENT: 'features:budgetManagement',
  FAVORITES: 'features:favorites',
  PINNED_ASSISTANTS: 'features:pinnedAssistants',
  FAVORITES_PAGE: 'features:favoritesPage',
  MCP_CONNECT: 'mcpConnect',
  SHOW_ALL_PROJECTS: 'features:showAllProjects',
  REQUEST_HEDGING: 'features:requestHedging',
  TEAMS_BOT_INTEGRATION: 'features:teamsBotIntegration',
  WORKFLOW_AI: 'features:workflowAI',
  SUB_WORKFLOW: 'features:subWorkflow',
} as const
```

- [ ] **Step 4: Add the named hook to `src/hooks/useFeatureFlags.ts`**

Append at the end of the file (after `useWorkflowAIEnabled`):

```ts
export const useSubWorkflowEnabled = (): FeatureFlagResult => {
  return useFeatureFlag(FEATURE_FLAGS.SUB_WORKFLOW)
}
```

The `FEATURE_FLAGS` and `useFeatureFlag` and `FeatureFlagResult` imports are already present — no new imports needed.

- [ ] **Step 5: Run test to verify it passes**

```bash
npm run test:unit -- --reporter=verbose src/utils/__tests__/featureFlags.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/constants/featureFlags.ts src/hooks/useFeatureFlags.ts src/utils/__tests__/featureFlags.test.ts
git commit -m "feat(EPMCDME-11609): add SUB_WORKFLOW feature flag constant and hook"
```

---

### Task 2: Node type registration in `base.ts`

**Test-first: yes — verify `NodeTypes.SUB_WORKFLOW === 'sub_workflow'` and template is HIDDEN**

**Files:**
- Modify: `src/types/workflowEditor/base.ts:30-42` (NodeTypes), `src/types/workflowEditor/base.ts:79-140` (nodeTemplates)
- Test: add inline assertion in the deserializer test added in Task 6 (the constant must resolve correctly by then); for this task verify manually via TypeScript compile in Step 4

**Interfaces:**
- Produces: `NodeTypes.SUB_WORKFLOW = 'sub_workflow'` consumed by Tasks 3, 5, 6, 7, 8

- [ ] **Step 1: Add `SUB_WORKFLOW` to the `NodeTypes` const object**

In `src/types/workflowEditor/base.ts`, find the `NodeTypes` object (line 30). Add the new entry after `TRANSFORM`:

```ts
export const NodeTypes = {
  ASSISTANT: 'assistant',
  CUSTOM: 'custom',
  TOOL: 'tool',
  TRANSFORM: 'transform',
  SUB_WORKFLOW: 'sub_workflow',

  START: 'start',
  END: 'end',
  CONDITIONAL: 'conditional',
  SWITCH: 'switch',
  ITERATOR: 'iterator',
  NOTE: 'note',
} as const
```

Do **not** add `SUB_WORKFLOW` to `MetaNodeTypes` (lines 44–51).

- [ ] **Step 2: Add the template entry to `nodeTemplates`**

In `src/types/workflowEditor/base.ts`, append to `nodeTemplates` after the `NOTE` entry (before the closing `]`):

```ts
  {
    type: NodeTypes.SUB_WORKFLOW,
    label: 'Sub-workflow',
    icon: null,
    category: NodeTemplateCategory.HIDDEN,
  },
```

`icon: null` is intentional — Story 2 replaces it with an SVG import. The `NodeTemplate` interface declares `icon: React.ReactNode`; `null` is assignable.

- [ ] **Step 3: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors for the edited files. If there is a type error on `icon: null`, cast it: `icon: null as React.ReactNode`.

- [ ] **Step 4: Commit**

```bash
git add src/types/workflowEditor/base.ts
git commit -m "feat(EPMCDME-11609): register SUB_WORKFLOW node type (HIDDEN category)"
```

---

### Task 3: Type definitions in `configuration.ts` and `workflow.ts`

**Test-first: yes — TypeScript compile is the gate; dedicated runtime tests are in Tasks 5 and 6**

**Files:**
- Modify: `src/types/workflowEditor/configuration.ts:247-276`
- Modify: `src/types/entity/workflow.ts:32-47`

**Interfaces:**
- Produces: `WorkflowPoolConfig`, `SubWorkflowStateConfiguration` consumed by Tasks 4, 5, 6, 7, 8
- `WorkflowPoolConfig` is imported into `workflow.ts` and (later) `types.ts`

- [ ] **Step 1: Add `WorkflowPoolConfig` to `configuration.ts`**

In `src/types/workflowEditor/configuration.ts`, add the new interface before the `StateConfiguration` union type (line ~247). Place it right after the last existing `interface` block (`IteratorStateConfiguration`):

```ts
export interface WorkflowPoolConfig {
  enabled: boolean
  min_size?: number
  max_size?: number
  refill_interval_seconds?: number
}
```

- [ ] **Step 2: Add `SubWorkflowStateConfiguration` to `configuration.ts`**

Immediately after `WorkflowPoolConfig`:

```ts
export interface SubWorkflowStateConfiguration extends CommonStateConfiguration {
  workflow_id: string
  input_mapping?: Record<string, string>
}
```

- [ ] **Step 3: Add `SubWorkflowStateConfiguration` to the `StateConfiguration` union**

The union currently ends at line 255. Add the new member:

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
  | SubWorkflowStateConfiguration
```

- [ ] **Step 4: Add `pool_config` and `max_nesting_level` to `WorkflowConfiguration`**

In the `WorkflowConfiguration` interface (lines 257–276), add after `retry_policy`:

```ts
  pool_config?: WorkflowPoolConfig
  max_nesting_level?: number
```

- [ ] **Step 5: Add typed fields to `Workflow` in `workflow.ts`**

In `src/types/entity/workflow.ts`, add the import at the top of the file (after the existing imports):

```ts
import { WorkflowPoolConfig } from '../workflowEditor/configuration'
```

Then in the `Workflow` interface (lines 32–47), add before the `[key: string]: any` index signature:

```ts
  pool_config?: WorkflowPoolConfig
  max_nesting_level?: number
```

- [ ] **Step 6: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/types/workflowEditor/configuration.ts src/types/entity/workflow.ts
git commit -m "feat(EPMCDME-11609): add WorkflowPoolConfig and SubWorkflowStateConfiguration types"
```

---

### Task 4: Serialization types in `types.ts`

**Test-first: yes — TypeScript compile; runtime round-trip test is in Task 5**

**Files:**
- Modify: `src/utils/workflowEditor/serialization/types.ts:28-63` (SerializedState), `src/utils/workflowEditor/serialization/types.ts:74-94` (SerializedWorkflowConfig)

**Interfaces:**
- Consumes: `WorkflowPoolConfig` from Task 3
- Produces: `SerializedState.workflow_id`, `SerializedState.input_mapping` consumed by Tasks 5, 6

- [ ] **Step 1: Add `workflow_id` and `input_mapping` to `SerializedState`**

In `src/utils/workflowEditor/serialization/types.ts`, find the `SerializedState` interface. Add a new `// Sub-workflow` comment block after the `// Custom` block (after `config?: CustomNodeConfigurationValues`):

```ts
  // Sub-workflow
  workflow_id?: string
  input_mapping?: Record<string, string>
```

- [ ] **Step 2: Add `pool_config` and `max_nesting_level` to `SerializedWorkflowConfig`**

Add the import for `WorkflowPoolConfig` at the top of the file, next to the existing imports from `@/types/workflowEditor/configuration`:

```ts
import {
  AssistantConfiguration,
  ToolConfiguration,
  CustomNodeConfiguration,
  RetryPolicy,
  NextState,
  AssistantTool,
  CustomNodeConfigurationValues,
  WorkflowPoolConfig,
} from '@/types/workflowEditor/configuration'
```

Then in `SerializedWorkflowConfig`, add after `retry_policy`:

```ts
  pool_config?: WorkflowPoolConfig
  max_nesting_level?: number
```

- [ ] **Step 3: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/utils/workflowEditor/serialization/types.ts
git commit -m "feat(EPMCDME-11609): add workflow_id/input_mapping to SerializedState; pool_config to SerializedWorkflowConfig"
```

---

### Task 5: Serializer pass-through verification and test

**Test-first: yes — write test showing `workflow_id`/`input_mapping` survive `serialize()`**

**Files:**
- Verify (no change expected): `src/utils/workflowEditor/serialization/serializer.ts`
- Test: `src/utils/workflowEditor/serialization/__tests__/serializer.test.ts` (add test case)

**Interfaces:**
- Consumes: `NodeTypes.SUB_WORKFLOW` from Task 2, `SubWorkflowStateConfiguration` from Task 3, `WorkflowConfiguration` from Task 3

- [ ] **Step 1: Understand the serializer pass-through path**

Read `serializer.ts` lines 37-40 (the `stripMeta` function):

```ts
const stripMeta = (state: StateConfiguration): SerializedState => {
  const { _meta, ...stateWithoutMeta } = state
  return stateWithoutMeta as SerializedState
}
```

The destructuring spread `...stateWithoutMeta` preserves all fields except `_meta`, including `workflow_id` and `input_mapping`. No code change is needed.

Confirm `pool_config` and `max_nesting_level` similarly pass through the top-level `...rest` spread in the `deserialize` function. In `deserializer.ts` lines 300-305:

```ts
const {
  states: rawStates = [],
  orphaned_states: rawOrphanedStates = [],
  meta_states: rawMetaStates = [],
  ...rest
} = config
const loadedConfig: WorkflowConfiguration = { states: [], ...rest }
```

Both `pool_config` and `max_nesting_level` are in `...rest` and flow into `loadedConfig` automatically. No code change is needed in the deserializer for top-level fields.

- [ ] **Step 2: Write the failing serializer test**

In `src/utils/workflowEditor/serialization/__tests__/serializer.test.ts`, add a new `describe` block at the end of the file (after the last `describe`):

```ts
describe('serialize - sub-workflow state pass-through', () => {
  it('preserves workflow_id and input_mapping in serialized output', () => {
    const config: WorkflowConfiguration = {
      states: [
        {
          id: START_NODE_ID,
          _meta: { type: NodeTypes.START, is_connected: true },
        },
        {
          id: 'call_child',
          workflow_id: 'child-workflow-id',
          input_mapping: { user_query: '{{ context.user_input }}' },
          next: { state_id: END_NODE_ID },
          _meta: { type: NodeTypes.SUB_WORKFLOW, is_connected: true, position: { x: 100, y: 100 } },
        } as SubWorkflowStateConfiguration,
        {
          id: END_NODE_ID,
          _meta: { type: NodeTypes.END, is_connected: true },
        },
      ],
    }

    const serializedYaml = serialize(config)
    const parsedYaml = yaml.load(serializedYaml) as any

    const callChild = parsedYaml.states.find((s: any) => s.id === 'call_child')
    expect(callChild).toBeDefined()
    expect(callChild.workflow_id).toBe('child-workflow-id')
    expect(callChild.input_mapping).toEqual({ user_query: '{{ context.user_input }}' })
    expect(callChild._meta).toBeUndefined()
  })

  it('preserves pool_config and max_nesting_level at top-level in serialized output', () => {
    const config: WorkflowConfiguration = {
      states: [
        { id: START_NODE_ID, _meta: { type: NodeTypes.START, is_connected: true } },
        { id: END_NODE_ID, _meta: { type: NodeTypes.END, is_connected: true } },
      ],
      pool_config: { enabled: true, min_size: 2, max_size: 5 },
      max_nesting_level: 3,
    }

    const serializedYaml = serialize(config)
    const parsedYaml = yaml.load(serializedYaml) as any

    expect(parsedYaml.pool_config).toEqual({ enabled: true, min_size: 2, max_size: 5 })
    expect(parsedYaml.max_nesting_level).toBe(3)
  })
})
```

Add `SubWorkflowStateConfiguration` to the imports at the top of the test file:

```ts
import { WorkflowConfiguration, SubWorkflowStateConfiguration } from '@/types/workflowEditor/configuration'
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm run test:unit -- --reporter=verbose src/utils/workflowEditor/serialization/__tests__/serializer.test.ts
```

Expected: FAIL — `NodeTypes.SUB_WORKFLOW` is undefined (Task 2 not yet committed in this branch) or TypeScript error on `SubWorkflowStateConfiguration`.

> Note: If Tasks 1–4 are already committed on the branch, the test may pass immediately in Step 3 — that is acceptable; skip to Step 5.

- [ ] **Step 4: Verify serializer needs no code change**

Since `stripMeta` uses `...stateWithoutMeta` spread, `workflow_id` and `input_mapping` are already preserved. Run all serializer tests to confirm no regressions:

```bash
npm run test:unit -- --reporter=verbose src/utils/workflowEditor/serialization/__tests__/serializer.test.ts
```

Expected: PASS (all tests including the new ones).

- [ ] **Step 5: Commit**

```bash
git add src/utils/workflowEditor/serialization/__tests__/serializer.test.ts
git commit -m "test(EPMCDME-11609): verify sub-workflow fields pass through serializer"
```

---

### Task 6: Deserializer — `inferNodeType` guard and fixture test

**Test-first: yes — new YAML fixture; assert `_meta.type === 'sub_workflow'`**

**Files:**
- Modify: `src/utils/workflowEditor/serialization/deserializer/deserializer.ts:65-71`
- Create: `src/utils/workflowEditor/serialization/deserializer/__tests__/fixtures/workflow-with-sub-workflow.yaml`
- Test: `src/utils/workflowEditor/serialization/deserializer/__tests__/deserializer.test.ts` (add `describe` block)

**Interfaces:**
- Consumes: `NodeTypes.SUB_WORKFLOW` from Task 2, `SerializedState.workflow_id` from Task 4

- [ ] **Step 1: Create the YAML fixture**

Create `src/utils/workflowEditor/serialization/deserializer/__tests__/fixtures/workflow-with-sub-workflow.yaml`:

```yaml
states:
  - id: kick_off
    workflow_id: child-workflow-abc
    input_mapping:
      user_query: "{{ context.user_input }}"
    next:
      state_id: summarize
  - id: summarize
    assistant_id: summarizer
    task: Summarize results
```

- [ ] **Step 2: Write the failing deserializer test**

In `src/utils/workflowEditor/serialization/deserializer/__tests__/deserializer.test.ts`, add a new `describe` block at the end of the file:

```ts
describe('deserialize - workflow with sub-workflow state', () => {
  let loadedConfig

  beforeAll(() => {
    const yamlContent = loadFixture('workflow-with-sub-workflow.yaml')
    loadedConfig = deserialize(yamlContent)
  })

  it('infers sub_workflow node type from workflow_id field', () => {
    const { states } = loadedConfig
    const kickOff = states.find((s) => s.id === 'kick_off')
    expect(kickOff).toBeDefined()
    expect(kickOff._meta.type).toBe(NodeTypes.SUB_WORKFLOW)
  })

  it('preserves workflow_id on the deserialized state', () => {
    const { states } = loadedConfig
    const kickOff = states.find((s) => s.id === 'kick_off')
    expect(kickOff.workflow_id).toBe('child-workflow-abc')
  })

  it('preserves input_mapping on the deserialized state', () => {
    const { states } = loadedConfig
    const kickOff = states.find((s) => s.id === 'kick_off')
    expect(kickOff.input_mapping).toEqual({ user_query: '{{ context.user_input }}' })
  })

  it('does not misidentify sub_workflow state as custom when workflow_id is set', () => {
    const { states } = loadedConfig
    const kickOff = states.find((s) => s.id === 'kick_off')
    expect(kickOff._meta.type).not.toBe(NodeTypes.CUSTOM)
  })
})
```

`NodeTypes` and `loadFixture` are already imported/defined at the top of the test file.

- [ ] **Step 3: Run test to verify it fails**

```bash
npm run test:unit -- --reporter=verbose src/utils/workflowEditor/serialization/deserializer/__tests__/deserializer.test.ts
```

Expected: FAIL — `kick_off._meta.type` is `'custom'` instead of `'sub_workflow'`

- [ ] **Step 4: Update `inferNodeType` in `deserializer.ts`**

In `src/utils/workflowEditor/serialization/deserializer/deserializer.ts`, lines 65–71, replace the function body:

```ts
const inferNodeType = (state: SerializedState): string => {
  if (state.assistant_id) return NodeTypes.ASSISTANT
  if (state.tool_id) return NodeTypes.TOOL
  if (state.custom_node_id === TRANSFORM_CUSTOM_ACTOR_ID) return NodeTypes.TRANSFORM
  if (state.workflow_id) return NodeTypes.SUB_WORKFLOW
  if (state.custom_node_id) return NodeTypes.CUSTOM
  return NodeTypes.CUSTOM
}
```

The `workflow_id` guard is placed after `tool_id` (no overlap possible) and before the `custom_node_id` fallback.

- [ ] **Step 5: Run test to verify it passes**

```bash
npm run test:unit -- --reporter=verbose src/utils/workflowEditor/serialization/deserializer/__tests__/deserializer.test.ts
```

Expected: PASS (all deserializer tests, including pre-existing ones)

- [ ] **Step 6: Commit**

```bash
git add src/utils/workflowEditor/serialization/deserializer/deserializer.ts \
        src/utils/workflowEditor/serialization/deserializer/__tests__/fixtures/workflow-with-sub-workflow.yaml \
        src/utils/workflowEditor/serialization/deserializer/__tests__/deserializer.test.ts
git commit -m "feat(EPMCDME-11609): infer sub_workflow node type in deserializer; add fixture + tests"
```

---

### Task 7: State creation — `buildState` case for `SUB_WORKFLOW`

**Test-first: yes — verify `createStateAction(NodeTypes.SUB_WORKFLOW, ...)` returns correct shape**

**Files:**
- Modify: `src/utils/workflowEditor/actions/states/createState.ts:144-195`
- Test: find or create `src/utils/workflowEditor/actions/states/__tests__/createState.test.ts`

**Interfaces:**
- Consumes: `NodeTypes.SUB_WORKFLOW` from Task 2, `SubWorkflowStateConfiguration` from Task 3

- [ ] **Step 1: Locate or create the test file**

```bash
find /home/user/projects/codemie/codemie-ui/src/utils/workflowEditor/actions -name "*.test.ts" 2>/dev/null
```

If a `createState.test.ts` file exists, append to it. If not, create it at `src/utils/workflowEditor/actions/states/__tests__/createState.test.ts`.

- [ ] **Step 2: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { NodeTypes } from '@/types/workflowEditor/base'
import { WorkflowConfiguration } from '@/types/workflowEditor/configuration'
import { createStateAction } from '../createState'

const EMPTY_CONFIG: WorkflowConfiguration = { states: [] }
const POSITION = { x: 100, y: 200 }

describe('createStateAction - SUB_WORKFLOW', () => {
  it('creates a sub_workflow state with workflow_id and input_mapping defaults', () => {
    const result = createStateAction(NodeTypes.SUB_WORKFLOW, POSITION, EMPTY_CONFIG)
    const newState = result.config.states[0]

    expect(newState.id).toMatch(/^sub_workflow_/)
    expect((newState as any).workflow_id).toBe('')
    expect((newState as any).input_mapping).toEqual({})
    expect(newState._meta?.type).toBe(NodeTypes.SUB_WORKFLOW)
    expect(newState._meta?.is_connected).toBe(false)
    expect(newState._meta?.selected).toBe(true)
    expect(newState._meta?.position).toEqual(POSITION)
  })

  it('increments state ID for multiple sub_workflow states', () => {
    const firstResult = createStateAction(NodeTypes.SUB_WORKFLOW, POSITION, EMPTY_CONFIG)
    const secondResult = createStateAction(NodeTypes.SUB_WORKFLOW, POSITION, firstResult.config)

    const ids = secondResult.config.states.map((s) => s.id)
    expect(ids).toContain('sub_workflow_1')
    expect(ids).toContain('sub_workflow_2')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm run test:unit -- --reporter=verbose src/utils/workflowEditor/actions/states/__tests__/createState.test.ts
```

Expected: FAIL — no `sub_workflow` case, falls through to default which doesn't set `workflow_id`

- [ ] **Step 4: Add the `SUB_WORKFLOW` case to `buildState` in `createState.ts`**

In `src/utils/workflowEditor/actions/states/createState.ts`, add before the final `return` block (line ~186), after the `NodeTypes.CUSTOM` block:

```ts
  if (nodeType === NodeTypes.TRANSFORM) {
    // ... existing TRANSFORM block (if present) or after CUSTOM block
  }

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

> Exact insertion point: after the `NodeTypes.CUSTOM` if-block that ends at line ~184, before the final fallback `return` at line ~186.

- [ ] **Step 5: Run test to verify it passes**

```bash
npm run test:unit -- --reporter=verbose src/utils/workflowEditor/actions/states/__tests__/createState.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/utils/workflowEditor/actions/states/createState.ts \
        src/utils/workflowEditor/actions/states/__tests__/createState.test.ts
git commit -m "feat(EPMCDME-11609): add SUB_WORKFLOW case to createStateAction"
```

---

### Task 8: Constants and `isExecutionState` helper

**Test-first: yes — verify `isExecutionState` returns `true` for sub_workflow state**

**Files:**
- Modify: `src/utils/workflowEditor/constants.ts:119-124` (ISSUE_FIELD_MAP)
- Modify: `src/utils/workflowEditor/helpers/states/stateTypeCheckers.ts:33-38` (isExecutionState)
- Test: `src/utils/workflowEditor/helpers/nodes/__tests__/nodeTypeCheckers.test.ts` (add test case)

**Interfaces:**
- Consumes: `NodeTypes.SUB_WORKFLOW` from Task 2

- [ ] **Step 1: Write the failing test for `isExecutionState`**

In `src/utils/workflowEditor/helpers/nodes/__tests__/nodeTypeCheckers.test.ts`, add a new `describe` block (file already imports `WorkflowNode` from `@/types/workflowEditor/base`; add `isExecutionState` import from `stateTypeCheckers`):

```ts
import { isExecutionState } from '../../states/stateTypeCheckers'
import { StateConfiguration } from '@/types/workflowEditor/configuration'

describe('isExecutionState', () => {
  it('returns true for sub_workflow state', () => {
    const state: StateConfiguration = {
      id: 'sub_workflow_1',
      _meta: { type: 'sub_workflow', is_connected: true },
    } as any

    expect(isExecutionState(state)).toBe(true)
  })

  it('returns false for conditional state', () => {
    const state: StateConfiguration = {
      id: 'cond_1',
      _meta: { type: 'conditional', is_connected: true },
    } as any

    expect(isExecutionState(state)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:unit -- --reporter=verbose src/utils/workflowEditor/helpers/nodes/__tests__/nodeTypeCheckers.test.ts
```

Expected: FAIL — `isExecutionState` returns `false` for `sub_workflow`

- [ ] **Step 3: Add `NodeTypes.SUB_WORKFLOW` to `isExecutionState`**

In `src/utils/workflowEditor/helpers/states/stateTypeCheckers.ts`, replace lines 35–37:

```ts
export const isExecutionState = (state: StateConfiguration | null): boolean => {
  if (!state?._meta?.type) return false
  return [
    NodeTypes.ASSISTANT,
    NodeTypes.TOOL,
    NodeTypes.CUSTOM,
    NodeTypes.TRANSFORM,
    NodeTypes.SUB_WORKFLOW,
  ].includes(state._meta.type as any)
}
```

- [ ] **Step 4: Add `sub_workflow` to `ISSUE_FIELD_MAP` in `constants.ts`**

In `src/utils/workflowEditor/constants.ts`, replace the `ISSUE_FIELD_MAP` object (lines 119–124):

```ts
export const ISSUE_FIELD_MAP = {
  assistant: 'assistant_id',
  tool: 'tool_id',
  custom: 'custom_node_id',
  transform: 'custom_node_id',
  sub_workflow: 'workflow_id',
} as const
```

Do NOT touch `ACTOR_FIELD_MAP` or `NODE_TYPE_TO_CONFIG_ARRAY`.

- [ ] **Step 5: Run test to verify it passes**

```bash
npm run test:unit -- --reporter=verbose src/utils/workflowEditor/helpers/nodes/__tests__/nodeTypeCheckers.test.ts
```

Expected: PASS

- [ ] **Step 6: Run the full test suite to catch regressions**

```bash
npm run test:unit -- --reporter=verbose
```

Expected: all tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/utils/workflowEditor/constants.ts \
        src/utils/workflowEditor/helpers/states/stateTypeCheckers.ts \
        src/utils/workflowEditor/helpers/nodes/__tests__/nodeTypeCheckers.test.ts
git commit -m "feat(EPMCDME-11609): add sub_workflow to ISSUE_FIELD_MAP and isExecutionState"
```

---

## Self-Review

**Spec coverage check:**

| Spec section | Task |
|---|---|
| §3 Feature flag constant + hook | Task 1 |
| §4 `NodeTypes.SUB_WORKFLOW` + template HIDDEN | Task 2 |
| §5a `WorkflowPoolConfig` | Task 3 |
| §5b `SubWorkflowStateConfiguration` + union | Task 3 |
| §5c `WorkflowConfiguration` additions | Task 3 |
| §6 `Workflow` entity fields | Task 3 |
| §7 `SerializedState` + `SerializedWorkflowConfig` | Task 4 |
| §8 Deserializer `inferNodeType` guard | Task 6 |
| §9 Serializer pass-through verification | Task 5 |
| §10 `createState` SUB_WORKFLOW case | Task 7 |
| §11a `ISSUE_FIELD_MAP` entry | Task 8 |
| §11b `isExecutionState` | Task 8 |
| §12 All four test scenarios | Tasks 1, 5, 6, 8 |

**Placeholder scan:** No TBDs or "similar to" references. All code blocks show exact content.

**Type consistency:** `WorkflowPoolConfig` is defined in Task 3 (`configuration.ts`) and imported in Tasks 3 (`workflow.ts`) and 4 (`types.ts`). `NodeTypes.SUB_WORKFLOW` is defined in Task 2 and referenced in Tasks 5, 6, 7, 8. `SubWorkflowStateConfiguration` is defined in Task 3 and used in Task 5 test.
