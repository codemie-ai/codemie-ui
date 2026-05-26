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

`src/utils/workflowEditor/actions/states/deleteState.ts`

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

The graph must remain a DAG — run `wouldCreateCycle()` before accepting any connection.

---

## Serialization

### Deserializer — backend → React Flow

`src/utils/workflowEditor/serialization/deserializer/deserializer.ts`

- Map each `WorkflowState` to a `Node`: `type = '${state.type}Node'`, `position = state.position ?? { x: 0, y: 0 }`, `data = { state }`.
- Flatten `state.transitions` entries into `Edge` objects: `source = state.id`, `target = targetId`, `sourceHandle = handle`.

### Serializer — React Flow → backend

`src/utils/workflowEditor/serialization/serializer.ts`

- Map each `Node` to a `WorkflowState`: spread `node.data.state`, add `position: node.position`.
- Build a `transitionMap` from edges: `Map<sourceId, Record<handle, targetId>>`.
- Assign `state.transitions = transitionMap.get(state.id) ?? {}` for each state.

**Always include `position` in serialization** — omitting it loses manual layout on reload.

---

## Auto-Layout (dagre)

`src/utils/workflowEditor/build/layout.ts`

```typescript
import dagre from 'dagre'

export const autoLayout = (nodes: Node[], edges: Edge[]) => {
  const graph = new dagre.graphlib.Graph()
  graph.setGraph({ rankdir: 'TB' })
  graph.setDefaultEdgeLabel(() => ({}))
  nodes.forEach(n => graph.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }))
  edges.forEach(e => graph.setEdge(e.source, e.target))
  dagre.layout(graph)
  return nodes.map(n => {
    const pos = graph.node(n.id)
    return { ...n, position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 } }
  })
}
```

`rankdir: 'TB'` = top-to-bottom flow. Call `autoLayout` on initial load and after bulk node additions. Subtract half node dimensions to center the dagre position anchor.

---

## Iterator Nodes (Nested Nodes)

Iterator nodes can contain child nodes. When a node is dropped inside an iterator:

- Set `droppedNode.parentNode = iteratorNode.id`.
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
| Circular connections allowed | Run `wouldCreateCycle()` in `validateConnection` |
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

Test `validateConnection`, `serializeWorkflow`, `deserializeWorkflow`, and `autoLayout` as pure functions with no DOM dependency.
