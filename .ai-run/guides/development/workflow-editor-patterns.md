# Workflow Editor Patterns

> Visual workflow editor using `@xyflow/react` (React Flow) + `dagre` for auto-layout.

---

## Architecture Overview

The editor separates **UI components** from **editor logic** strictly. Components render; utils mutate state.

```
src/pages/workflows/
├── EditWorkflowPage.tsx          # Main editor entry point
├── ViewWorkflowPage.tsx          # Read-only canvas
├── WorkflowExecutionPage.tsx     # Execution details
└── components/
    ├── WorkflowCanvas/           # React Flow canvas wrapper
    ├── NodeTypes/                # Custom node components (UI only)
    ├── Toolbar/                  # Editor toolbar
    └── Forms/                    # State configuration forms

src/utils/workflowEditor/         # All editor logic (outside pages/)
├── actions/
│   ├── nodes/                    # createState, updateState, deleteState
│   ├── connections/              # createConnection, deleteConnection
│   ├── states/                   # state CRUD helpers
│   └── config/                   # config update helpers
├── build/
│   ├── nodes/                    # node builders
│   ├── edges/                    # edge builders
│   └── layout.ts                 # dagre auto-layout
├── serialization/
│   ├── serializer.ts             # React Flow → backend format
│   └── deserializer/             # backend format → React Flow
└── helpers/                      # node/state/connection utilities
```

**Rule**: Keep components thin. Any logic beyond JSX rendering belongs in `src/utils/workflowEditor/`.

---

## Node & Edge Types

| React Flow type string | Component | Backend state type |
|------------------------|-----------|-------------------|
| `aiNode` | `NodeTypes/AiNode.tsx` | `ai` |
| `decisionNode` | `NodeTypes/DecisionNode.tsx` | `decision` |
| `iteratorNode` | `NodeTypes/IteratorNode.tsx` | `iterator` |
| `startNode` | `NodeTypes/StartNode.tsx` | `start` |
| `endNode` | `NodeTypes/EndNode.tsx` | `end` |

Node type string convention: `${backendType}Node`. Register all types in the `nodeTypes` map passed to `<ReactFlow nodeTypes={nodeTypes} />`.

Custom node components receive `data: { state: WorkflowState }` and render UI only — they call action utilities for mutations.

---

## State Management

### Store structure

```typescript
// src/store/workflows.ts
export const workflowsStore = proxy({
  currentWorkflow: null as Workflow | null,
  workflows: [] as Workflow[],
  editorState: {
    nodes: [] as Node[],
    edges: [] as Edge[],
    selectedNode: null as Node | null,
  },
})
```

Keep `editorState` (React Flow format) separate from `currentWorkflow` (backend format). Never store React Flow nodes inside `currentWorkflow`.

### Load and save

- `loadWorkflow(id)` — fetch from API, call `deserializeWorkflow()`, populate both `currentWorkflow` and `editorState`.
- `saveWorkflow()` — call `serializeWorkflow(nodes, edges)`, PUT to API, update `currentWorkflow`.

### DO / DON'T

| DON'T | DO |
|-------|----|
| Store React Flow nodes in `currentWorkflow` | Keep `editorState` separate |
| Call API directly from node components | Use store actions |
| Mutate node `data` without updating `state` | Update both `state` and `node.data.state` |
| Recalculate edges on every render | `useMemo(() => buildEdges(...), [workflow.states])` |

---

## Node Operations

### Creating a node

`src/utils/workflowEditor/actions/states/createState.ts`

- Generate a unique `stateId`.
- Build `WorkflowState` (backend format) with `getDefaultConfig(type)`.
- Build `Node` (React Flow format) with `type: '${type}Node'`, `position`, and `data: { state }`.
- Push both to store: `workflowsStore.currentWorkflow.states` and `workflowsStore.editorState.nodes`.

### Updating a node

`src/utils/workflowEditor/actions/states/updateState.ts`

- `Object.assign(state, updates)` on the backend state object.
- Rebuild `node.data = { ...node.data, state }` — React Flow requires a new data reference to detect changes.

### Deleting a node

`src/utils/workflowEditor/actions/states/removeState.ts` — exports `removeStateAction`

Always remove connected edges before removing the node:
1. `getConnectedEdges(stateId)` → `deleteConnection(edge.id)` for each.
2. Filter node from `editorState.nodes`.
3. Filter state from `currentWorkflow.states`.

---

## Connection Operations

### Creating a connection

`src/utils/workflowEditor/actions/connections/createConnection.ts`

1. Validate (see validation rules below) — show `toaster.error` and return `null` if invalid.
2. Build `Edge` with `id: '${sourceId}-${targetId}'`, `source`, `target`, `sourceHandle`.
3. Set `sourceState.transitions[sourceHandle || 'default'] = targetId`.
4. Push edge to `editorState.edges`.

### Connection validation rules

`src/utils/workflowEditor/helpers/connections/connectionValidator.ts`

| Rule | Error message |
|------|---------------|
| `sourceId === targetId` | 'Cannot connect state to itself' |
| Would create cycle | 'Cannot create circular connections' |
| Source has reached max connections | 'Maximum connections reached' |

`isValidConnection` already rejects self-loops and circular connections (`checkCircularConnection` walks the target's parents) along with the type, iterator-key and iterator-parent rules; route a new connection path through it (`src/utils/workflowEditor/helpers/connections/connectionValidator.ts::isValidConnection`).

---

## Serialization

### Deserializer — backend → React Flow

`src/utils/workflowEditor/serialization/deserializer/deserializer.ts`

- `deserialize(yamlString)` parses the workflow YAML into a `WorkflowConfiguration`; on a parse error it toasts `Failed loading YAML config` and continues with empty `states`, `orphaned_states` and `meta_states` (`src/utils/workflowEditor/serialization/deserializer/deserializer.ts::deserialize`).

### Serializer — React Flow → backend

`src/utils/workflowEditor/serialization/serializer.ts`

- `serialize(configuration)` writes the `WorkflowConfiguration` back to a YAML string: states are split into `states`, `orphaned_states` and `meta_states`, and `_meta` is stripped from regular states (`src/utils/workflowEditor/serialization/serializer.ts::serialize`).

**Always include `position` in serialization** — omitting it loses manual layout on reload.

---

## Auto-Layout (dagre)

`src/utils/workflowEditor/build/layout.ts`

`applyLayout(nodes, edges)` lays non-iterator nodes out with dagre left to right (`rankdir: 'LR'`), then fits each iterator around its children and makes their positions relative (`src/utils/workflowEditor/build/layout.ts::applyLayout`).

---

## Iterator Nodes (Nested Nodes)

Iterator nodes can contain child nodes. When a node is dropped inside an iterator:

- Set `droppedNode.parentId = iteratorNode.id` (`applyLayout` groups children by `parentId`).
- Set `droppedNode.extent = 'parent'` to constrain movement within the parent.
- Push the child state into `iteratorState.states`.

Check containment with `isInsideIterator(droppedNode.position, iteratorNode)` before applying nesting.

---

## Viewport Management

| Action | API |
|--------|-----|
| Focus a specific node | `reactFlowInstance.setCenter(x + W/2, y + H/2, { zoom: 1.5, duration: 800 })` |
| Fit all nodes | `reactFlowInstance.fitView({ padding: 0.2, duration: 800 })` |

Obtain `reactFlowInstance` via the `useReactFlow()` hook inside a component wrapped in `<ReactFlowProvider>`.

---

## Common Pitfalls

| Problem | Fix |
|---------|-----|
| Node positions lost on save/reload | Always include `position` in serializer |
| Edges remain after node delete | Remove connected edges first in `deleteState` |
| Circular connections allowed | Call `isValidConnection`, which runs the circular check |
| Iterator children escape parent | Set `extent: 'parent'` on child nodes |
| Stale node data after config update | Create new `node.data` reference on update |
| Expensive edge build on every render | Wrap with `useMemo` keyed on `workflow.states` |

---

## Testing Strategy

Test logic utilities — not the React Flow canvas itself:

```typescript
describe('createState', () => {
  it('generates a unique state ID', () => {
    const { state } = createState('ai', { x: 0, y: 0 })
    expect(state.id).toMatch(/^state_/)
  })
  it('sets correct React Flow node type', () => {
    const { node } = createState('decision', { x: 0, y: 0 })
    expect(node.type).toBe('decisionNode')
  })
})
```

Test `isValidConnection`, `serialize`, `deserialize` and `applyLayout` as pure functions with no DOM dependency.
