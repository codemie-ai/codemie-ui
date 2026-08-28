# Technical Research

**Task**: workflow-editor nodes config-panel store
**Generated**: 2026-07-31T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-11609-UI-2 — Build the SubWorkflowNode ReactFlow component, SubWorkflowTab config panel (with WorkflowSelector for workflow_id and InputMappingEditor for key-value pairs), getSelectableWorkflows store method (GET /v1/workflows/selectable), wire both into nodes/index.tsx and ConfigPanel.tsx, update Sidebar.tsx to gate the node behind useSubWorkflowEnabled(), move nodeTemplate category from HIDDEN to ACTION, and add node-sub-workflow.svg icon.

---

## 2. Codebase Findings

### Existing Implementations

**Workflow editor root**: `/home/user/projects/codemie/codemie-ui/src/pages/workflows/editor`

**Node components** (all in `.../editor/nodes/`):
- `AssistantNode.tsx` — `BaseNode` + left target `Handle` + `NodeHeader(type=ASSISTANT, title=id)` + right source `Handle`; reads `state._meta.is_connected` for `isConnected`; receives all store access via `data.findState`, `data.getConfig`, etc. (no direct store import)
- `ToolNode.tsx` — identical layout to `AssistantNode`; uses `NodeTypes.TOOL`; no `assistantHighlighted` prop; otherwise the same structure — direct copy-adapt baseline for `SubWorkflowNode`
- `BaseNode.tsx` — shared visual shell; props: `selected`, `isConnected`, `hasError`, `status`, `success`, `failures`, `active`, `highlighted`
- `NodeHandle.tsx` — thin wrapper around `@xyflow/react` `Handle`
- `NodeHeader.tsx` — renders type icon + `title` text
- `common.ts` — `CommonNodeProps` type (prop interface all node components share)
- `ConditionalNode.tsx`, `CustomNode.tsx`, `EndNode.tsx`, `IteratorNode.tsx`, `NoteNode.tsx`, `StartNode.tsx`, `SwitchNode.tsx`, `TransformNode.tsx` — other node types for pattern reference

**Config panel tabs** (all in `.../editor/configPanels/`):
- `AssistantTab.tsx` — canonical tab pattern: `forwardRef`, `useImperativeHandle({isDirty, save})`, `useForm` + `yupResolver`, `CommonStateFields`, `ConfigAccordion`, `FieldController`, `TabFooter`, `registerFields` at module top level
- `ToolTab.tsx` — delegates form to `ToolForm` sub-component via ref; uses `useWorkflowContext()` for `activeIssue` to auto-expand accordion; same `{isDirty, save}` ref shape
- `ConditionalTab.tsx`, `SwitchTab.tsx`, `IteratorTab.tsx`, `CustomTab.tsx`, `TransformTab.tsx` — further pattern references

**Shared components**:
- `MappingBuilder.tsx` + `MappingRow.tsx` (in `.../configPanels/components/`) — key-value pair UI; currently works with `TransformMapping[]` objects, not `Record<string, string>` — can provide pattern inspiration but needs a separate `InputMappingEditor` implementation
- `WorkflowSelector.tsx` — at `/home/user/projects/codemie/codemie-ui/src/pages/workflows/components/WorkflowSelector.tsx`

**Type definitions relevant to this task**:
- `SubWorkflowStateConfiguration` already defined in `/src/types/workflowEditor/configuration.ts` with `workflow_id?: string` and `input_mapping?: Record<string, string>`
- `NodeTypes.SUB_WORKFLOW = 'sub_workflow'` already defined in `/src/types/workflowEditor/base.ts`
- Serializer, deserializer, and `createState` utility already handle `NodeTypes.SUB_WORKFLOW`

**What does NOT exist yet** (all must be created):
- `SubWorkflowNode.tsx`
- `SubWorkflowTab.tsx`
- `InputMappingEditor` component
- `getSelectableWorkflows` method in the workflows store
- `node-sub-workflow.svg` icon

### Architecture and Layers Affected

| Layer | Component | File |
|---|---|---|
| Presentation / ReactFlow canvas | `SubWorkflowNode` (new) | `.../editor/nodes/SubWorkflowNode.tsx` |
| Config panel dispatch | `nodeConfigPanels` map | `.../editor/ConfigPanel.tsx` |
| Config panel tab | `SubWorkflowTab` (new) | `.../editor/configPanels/SubWorkflowTab.tsx` |
| Config panel sub-component | `InputMappingEditor` (new) | `.../editor/configPanels/components/InputMappingEditor.tsx` |
| Node registry | `nodeTypeComponents` map | `.../editor/nodes/index.tsx` |
| Node template metadata | `nodeTemplates` array | `/src/types/workflowEditor/base.ts` |
| Sidebar / palette | `Sidebar` component | `.../editor/Sidebar.tsx` |
| State store | `workflowsStore` | `/src/store/workflows.ts` |
| Issue/field registry | `visualEditorFieldRegistry` | `.../editor/utils/visualEditorFieldRegistry.ts` |
| Assets | SVG icon | `/src/assets/icons/node-sub-workflow.svg` |

### Integration Points

**Internal**:
- `WorkflowSelector` (`/src/pages/workflows/components/WorkflowSelector.tsx`) — consumed by `SubWorkflowTab` to pick `workflow_id`
- `CommonStateFields` — shared ref-based sub-form used by all tabs; `SubWorkflowTab` must include it
- `visualEditorFieldRegistry` — `registerFields(['workflow_id', 'input_mapping'], NodeTypes.SUB_WORKFLOW, 'resource_validation')` registers fields so the issues panel can surface backend validation errors to the correct tab
- `useSubWorkflowEnabled` hook — already in `/src/hooks/useFeatureFlags.ts`; consumed by `Sidebar.tsx` to gate the node in the palette
- `appInfoStore` — source of feature flag config read by `useSubWorkflowEnabled`

**External**:
- Backend API `GET /v1/workflows/selectable` — new endpoint; no existing call exists in the frontend; must be confirmed available from backend before implementing `getSelectableWorkflows`

### Patterns and Conventions

**Node component pattern** (copy `ToolNode.tsx` as baseline):
```tsx
// SubWorkflowNode.tsx
export const SubWorkflowNode = ({ data, selected }: NodeProps<CommonNodeData>) => {
  const state = data.findState(data.id) as SubWorkflowStateConfiguration | undefined
  const isConnected = state?._meta?.is_connected ?? false
  return (
    <BaseNode selected={selected} isConnected={isConnected}>
      <Handle type="target" position={Position.Left} />
      <NodeHeader type={NodeTypes.SUB_WORKFLOW} title={data.id} />
      <Handle type="source" position={Position.Right} />
    </BaseNode>
  )
}
```

**nodes/index.tsx registration**:
```ts
export const nodeTypeComponents = {
  [NodeTypes.ASSISTANT]: AssistantNode,
  [NodeTypes.TOOL]: ToolNode,
  // ... existing entries
  [NodeTypes.SUB_WORKFLOW]: SubWorkflowNode,  // add this
}
```

**ConfigPanel.tsx dispatch**:
```ts
const nodeConfigPanels = {
  [NodeTypes.ASSISTANT]: AssistantTab,
  // ... existing entries
  [NodeTypes.SUB_WORKFLOW]: SubWorkflowTab,   // add this
}
// NodePanel = nodeConfigPanels[selectedNode.type ?? NodeTypes.CUSTOM]
// <NodePanel ref={activeTabRef} key={selectedNode.id} stateId={...} config={...} ... />
```

**Tab ref shape** (both `AssistantTab` and `ToolTab` use identical ref API):
```ts
export type SubWorkflowTabRef = { isDirty: () => boolean; save: () => Promise<boolean> }
```

**registerFields call site** — must be at module top level in `SubWorkflowTab.tsx`:
```ts
registerFields(['workflow_id'], NodeTypes.SUB_WORKFLOW, 'resource_validation')
registerFields(['input_mapping'], NodeTypes.SUB_WORKFLOW, 'resource_validation')
```

**workflows store method pattern** (modeled on `getWorkflowOptions`):
```ts
async getSelectableWorkflows(project?: string) {
  const url = project
    ? `v1/workflows/selectable?project=${encodeURIComponent(project)}`
    : 'v1/workflows/selectable'
  return api.get(url).then((r) => r.json()).then((r) => r.data)
},
```
HTTP client is the custom `API` class (wraps `fetch`), imported as `import api from '@/utils/api'`. No axios.

**SVG import pattern** (in `base.ts`):
```ts
import NodeSubWorkflowSvg from '@/assets/icons/node-sub-workflow.svg?react'
// Then in the nodeTemplates array:
{ type: NodeTypes.SUB_WORKFLOW, label: 'Sub-workflow', icon: React.createElement(NodeSubWorkflowSvg), category: NodeTemplateCategory.ACTION }
```

**WorkflowSelector single-select usage** (for `workflow_id`):
```tsx
<WorkflowSelector
  singleValue={true}
  value={workflowId ? [{ id: workflowId, name: workflowName }] : []}
  onChange={(opts) => setValue('workflow_id', opts[0]?.id ?? '')}
  project={project}
  error={errors.workflow_id?.message}
/>
```

**configPanels/index.tsx barrel export** — `ToolTab` is NOT exported from the barrel; `ConfigPanel.tsx` imports it directly. `SubWorkflowTab` can follow either convention — direct import in `ConfigPanel.tsx` is acceptable.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `/home/user/projects/codemie/codemie-ui/.ai-run/guides/development/workflow-editor-patterns.md` — directly relevant: covers node types, Sidebar, template registration, component architecture rule ("keep components thin")
- `/home/user/projects/codemie/codemie-ui/.ai-run/guides/development/constants-usage.md` — relevant for understanding feature flag constant conventions (FEATURE_FLAGS.SUB_WORKFLOW already exists)
- `/home/user/projects/codemie/codemie-ui/.ai-run/guides/components/component-patterns.md` — relevant for hook usage patterns inside components

### Architectural Decisions

- All node data flows via `data.*` props (callbacks like `findState`, `getConfig`, `updateConfig`) — node components do NOT import Valtio stores directly. This is established architecture; `SubWorkflowNode` must follow it.
- Config panel tabs use a consistent `{isDirty, save}` ref interface — this is the contract that `ConfigPanel.tsx` depends on for unsaved-changes detection and save orchestration.
- Feature flag constants live in `/src/constants/featureFlags.ts`; hooks live in `/src/hooks/useFeatureFlags.ts`. `FEATURE_FLAGS.SUB_WORKFLOW` and `useSubWorkflowEnabled` are already present.

### Derived Conventions

- `registerFields` calls are always module-level (outside the component function) in every existing tab — they run once at import time as side-effects populating the registry singleton
- Tab components set `displayName` on the forwardRef result
- ConfigAccordion is used as the visual grouping container for each logical section within a tab
- The `WorkflowSelector` component lives in `/src/pages/workflows/components/`, not in the editor subdirectory — it is shared across the workflows page area

---

## 4. Testing Landscape

### Existing Coverage

- `/src/pages/workflows/editor/nodes/__tests__/AssistantNode.test.tsx` — rendering, connection indicator, selected border, `findState` call; canonical template for all node tests
- `/src/pages/workflows/editor/nodes/__tests__/ToolNode.test.tsx` — identical coverage pattern; **direct copy-adapt baseline for SubWorkflowNode.test.tsx**
- `/src/pages/workflows/editor/nodes/__tests__/CustomNode.test.tsx` — same base pattern
- `/src/pages/workflows/editor/nodes/__tests__/ConditionalNode.test.tsx` — same; also stubs `useNodeConnections: () => []`
- `/src/pages/workflows/editor/nodes/__tests__/IteratorNode.test.tsx` — extended: adds `NodeResizeControl` stub, SVG mocks, class assertions
- `/src/pages/workflows/editor/__tests__/ConfigPanel.test.tsx` — tests `useImperativeHandle` (isDirty, save); mocks every tab via `vi.mock('../configPanels/XxxTab', ...)` with `forwardRef + useImperativeHandle`; uses `WorkflowContext.Provider + UnsavedChangesProvider` wrappers; will need a `SubWorkflowTab` mock entry added
- `/src/utils/workflowEditor/actions/states/__tests__/createState.test.ts` — covers `NodeTypes.SUB_WORKFLOW` state creation (id prefix `sub_workflow_`, defaults for `workflow_id` and `input_mapping`)
- `/src/utils/workflowEditor/serialization/__tests__/serializer.test.ts` — serializes a `NodeTypes.SUB_WORKFLOW` state
- `/src/utils/workflowEditor/serialization/deserializer/__tests__/deserializer.test.ts` — sub_workflow type inference from `workflow_id` field

### Testing Framework and Patterns

- **Framework**: Vitest + `@testing-library/react` + `@testing-library/jest-dom` + `@testing-library/user-event`
- **Two test projects**: `unit` (jsdom environment) and `integration` (custom env, 15s timeout)
- **`createMockProps(overrides?)` factory** — produces a full `CommonNodeProps` with `vi.fn()` for `findState`, `getConfig`, `updateConfig`, `removeState`; overrides spread at end
- **`renderXxxNode` helper** — wraps component in `<ReactFlowProvider>` before calling `render(...)`
- **`@xyflow/react` mock** (all node tests):
  ```ts
  vi.mock('@xyflow/react', async () => {
    const actual = await vi.importActual('@xyflow/react')
    return { ...actual, useNodeConnections: () => [] }
  })
  ```
- **Valtio global mock** in `setupTests.unit.ts`: `useSnapshot: vi.fn().mockImplementation((store) => store)` — snapshots return the store object directly
- **SVG asset mock** per node:
  ```ts
  vi.mock('@/assets/icons/node-sub-workflow.svg?react', () => ({ default: () => <svg data-testid="node-icon" /> }))
  ```
- **`vi.clearAllMocks()` in `beforeEach`** — universal across all node tests
- **forwardRef + useImperativeHandle stub** — pattern for mocking tabs in `ConfigPanel.test.tsx`

### Coverage Gaps

- `SubWorkflowNode.test.tsx` — does not exist; must be created (use `ToolNode.test.tsx` as the template)
- `SubWorkflowTab.test.tsx` — does not exist; must be created (tab-level tests are sparse across the codebase — `AssistantTab`, `ToolTab`, and all other tabs also lack dedicated tests, but a minimal smoke test for save/isDirty is appropriate)
- `ConfigPanel.test.tsx` — the `SubWorkflowTab` mock entry must be added when the tab is registered
- `InputMappingEditor.test.tsx` — the new component will need tests; no existing analog to copy from
- Feature-flag gate behavior — no test verifies that the SubWorkflow node is hidden/shown based on `features:subWorkflow` in Sidebar

---

## 5. Configuration and Environment

### Environment Variables

- No new env vars required for this feature; the `/v1/workflows/selectable` endpoint uses the same `api` base URL already configured

### Configuration Files

- `/src/constants/featureFlags.ts` — `FEATURE_FLAGS.SUB_WORKFLOW = 'features:subWorkflow'` already present; no changes needed
- `/src/hooks/useFeatureFlags.ts` — `useSubWorkflowEnabled()` already present; no changes needed

### Feature Flags and Deployment Concerns

- `FEATURE_FLAGS.SUB_WORKFLOW` (`'features:subWorkflow'`) is already defined and `useSubWorkflowEnabled()` is already implemented
- The flag is read from `appInfoStore.configs` (array of `{ id, settings: { enabled } }` objects populated from a backend config endpoint)
- **CRITICAL**: In `Sidebar.tsx` the `actionNodes` array is computed at **module level** (outside the component function, line 37–39):
  ```ts
  const actionNodes = nodeTemplates.filter(
    (template) => template.category === NodeTemplateCategory.ACTION
  )
  ```
  Because this runs at import time, `useSubWorkflowEnabled()` cannot be called here. The implementation must either: (a) move the `actionNodes` filter inside the `Sidebar` component body, or (b) post-filter `actionNodes` inside the component:
  ```ts
  const [isSubWorkflowEnabled] = useSubWorkflowEnabled()
  const visibleActionNodes = actionNodes.filter(
    (t) => t.type !== NodeTypes.SUB_WORKFLOW || isSubWorkflowEnabled
  )
  ```
  Option (b) is the minimal-change approach.

---

## 6. Risk Indicators

- **`InputMappingEditor` is a new component with no existing exact analog.** `MappingBuilder`/`MappingRow` are the closest patterns but operate on `TransformMapping[]` (objects with typed fields), not `Record<string, string>`. A fresh implementation is needed; budget extra time for this component.
- **`GET /v1/workflows/selectable` endpoint does not exist in the frontend API call inventory.** The `getSelectableWorkflows` store method cannot be validated until the backend endpoint is confirmed ready. If the endpoint is not ready, `WorkflowSelector` could fall back to `getWorkflowOptions` for the dropdown, or the store method should stub with an empty response.
- **Sidebar's module-level `actionNodes` filter is a gotcha.** The task says "gate the node behind `useSubWorkflowEnabled()`" but the current filter is outside the component; a hook call there would violate React's rules of hooks. The workaround (post-filter inside the component) is straightforward but is non-obvious from reading the task description alone.
- **`WorkflowSelector` returns `WorkflowSelectorOption[]` but `workflow_id` is a plain `string`.** When using `singleValue={true}`, the onChange callback still returns an array; the tab must extract `opts[0]?.id` and store it as a string. The form value type in the Yup schema must match.
- **`ToolTab` is NOT in the `configPanels/index.tsx` barrel.** The barrel convention is inconsistent — some tabs are exported from the barrel, some are imported directly. `SubWorkflowTab` should consistently use one approach; the direct-import pattern (like `ToolTab`) is the safer default.
- **`configPanels/index.tsx` is a named re-export barrel, not a `default` re-export barrel.** Any new tab added must use `export { default as SubWorkflowTab }` syntax if it's added to the barrel.
- **No tab-level test template exists.** `AssistantTab`, `ToolTab`, and all other config panel tabs lack dedicated test files. There is no established pattern to copy from for `SubWorkflowTab.test.tsx`; the implementer must derive the test structure from the `ConfigPanel.test.tsx` stub pattern.
- **`registerFields` must be called at module top level, not inside the component.** All existing call sites are at module scope (outside the component function body). Calling it inside a `useEffect` or the component function would cause repeated registration on re-renders.
- **`SubWorkflowStateConfiguration.input_mapping` is typed as `Record<string, string>` (string → string).** The form default value must be an empty object `{}`, not `undefined` or `[]`, to avoid Yup schema mismatches. The `yupResolver` schema for `input_mapping` needs a `Yup.object()` with `additionalProperties: Yup.string()` or equivalent validation.
- **`node-sub-workflow.svg` does not exist.** The icon must be created; until it is, `base.ts` cannot be updated (the import would fail the build). The SVG must follow the 32×32, fill-based (no stroke), rounded-rect background convention used by all other node icons.
- **`TransformNode.test.tsx` is also absent** — not a blocker for this task but a signal that node test coverage is incomplete across the board; `SubWorkflowNode.test.tsx` should not be skipped even if `TransformNode` lacks one.

---

## 7. Summary for Complexity Assessment

This ticket implements the full UI layer for the Sub-Workflow node type in the visual workflow editor. The backend type infrastructure (`NodeTypes.SUB_WORKFLOW`, `SubWorkflowStateConfiguration`, serializer/deserializer, `createState` utility, feature flag constant and hook) is already in place. The work is purely additive UI: one new ReactFlow node component, one new config panel tab, one new sub-component (`InputMappingEditor`), one new store method, two wiring changes (`nodes/index.tsx`, `ConfigPanel.tsx`), two metadata changes (`base.ts` nodeTemplate category and icon), and one Sidebar gating change. The layer surface spans: canvas node (ReactFlow presentation), config panel tab (form/validation), shared component (InputMappingEditor), store (async API method), and static metadata/assets. Estimated file change surface is 8–10 files modified plus 3–4 new files created.

Technical novelty is moderate. The `SubWorkflowNode` and `SubWorkflowTab` follow well-established patterns (`ToolNode` and `AssistantTab` are direct templates). The only novel work is `InputMappingEditor`: there is no existing `Record<string, string>` key-value editor — `MappingBuilder` handles `TransformMapping[]` (a different shape) — so this component must be implemented from scratch, taking only visual/structural inspiration from `MappingBuilder`/`MappingRow`. The Sidebar gating also requires a small structural change (moving the filter inside the component) that is not immediately obvious from the task description but is a one-line fix once identified.

Test coverage posture for the affected area is mixed. Node components have good coverage patterns (every existing node except `TransformNode` has a test file following the `createMockProps`/`renderXxxNode`/`ReactFlowProvider` template). Config panel tabs are a significant gap — no existing `*Tab.test.tsx` file exists, so there is no direct test template to copy. The store method `getSelectableWorkflows` will need a test following the `getWorkflowOptions` mock-`api` pattern. The key risk factors for complexity scoring are: (1) `InputMappingEditor` is a net-new component with no exact ancestor, (2) the Sidebar module-level filter gotcha, (3) backend endpoint availability for `/v1/workflows/selectable`, and (4) the need to write tests without an existing tab-test template.
