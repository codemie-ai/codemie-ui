# Workflow Editor Patterns

> **Visual workflow editor patterns using React Flow**

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [State Management](#state-management)
4. [Node Operations](#node-operations)
5. [Connection Operations](#connection-operations)
6. [Serialization](#serialization)
7. [Common Patterns](#common-patterns)

---

## Overview

The workflow editor is a complex visual editor built with React Flow for creating and editing AI workflows.

### Key Components

- **Canvas**: React Flow canvas for visual editing
- **Nodes**: Workflow states (AI, Decision, Iterator, etc.)
- **Edges**: Connections between states
- **Toolbar**: Editor controls and actions
- **Forms**: State configuration forms

### Technology

- **React Flow**: Graph visualization and interaction
- **Valtio**: State management for workflow data
- **Utils**: Complex editor logic extracted from components

---

## Architecture

### File Structure

```
src/pages/workflows/
├── EditWorkflowPage.tsx                # Main editor page
├── ViewWorkflowPage.tsx                # Read-only view
├── WorkflowExecutionPage.tsx           # Execution details
├── components/
│   ├── WorkflowCanvas/                 # Canvas component
│   ├── NodeTypes/                      # Custom node components
│   ├── Toolbar/                        # Editor toolbar
│   └── Forms/                          # Configuration forms
└── src/utils/workflowEditor/           # Editor logic (outside pages/)
    ├── actions/                        # State mutation operations
    │   ├── nodes/                      # Node operations
    │   ├── connections/                # Edge operations
    │   ├── states/                     # State CRUD
    │   └── config/                     # Config updates
    ├── build/                          # Graph construction
    │   ├── nodes/                      # Node builders
    │   ├── edges/                      # Edge builders
    │   └── layout.ts                   # Auto-layout
    ├── serialization/                  # Save/load
    │   ├── serializer.ts               # To backend format
    │   └── deserializer/               # From backend format
    └── helpers/                        # Utilities
        ├── nodes/                      # Node helpers
        ├── states/                     # State helpers
        └── connections/                # Connection helpers
```

---

## State Management

### Workflow Store

```typescript
// src/store/workflows.ts
export const workflowsStore = proxy({
  // Workflow data
  currentWorkflow: null as Workflow | null,
  workflows: [] as Workflow[],

  // Editor state
  editorState: {
    nodes: [] as Node[],
    edges: [] as Edge[],
    selectedNode: null as Node | null,
  },

  // Load workflow for editing
  async loadWorkflow(id: string) {
    const response = await api.get(`workflows/${id}`)
    const workflow = await response.json()

    // Deserialize backend format to React Flow format
    const { nodes, edges } = deserializeWorkflow(workflow)

    this.currentWorkflow = workflow
    this.editorState.nodes = nodes
    this.editorState.edges = edges
  },

  // Save workflow
  async saveWorkflow() {
    const { nodes, edges } = this.editorState

    // Serialize React Flow format to backend format
    const workflowData = serializeWorkflow(nodes, edges)

    const response = await api.put(
      `workflows/${this.currentWorkflow.id}`,
      workflowData
    )

    this.currentWorkflow = await response.json()
  },
})
```

### Editor State Pattern

Keep React Flow state separate from workflow data:

```typescript
// ✅ DO - Separate editor state
const editorState = {
  nodes: [],        // React Flow nodes
  edges: [],        // React Flow edges
  viewport: {},     // Canvas viewport
}

// ❌ DON'T - Mix with workflow data
const workflow = {
  name: '...',
  nodes: [],        // Don't store React Flow nodes here
  edges: [],
}
```

---

## Node Operations

### Creating Nodes

```typescript
// src/utils/workflowEditor/actions/states/createState.ts
export const createState = (
  type: StateType,
  position: { x: number; y: number }
) => {
  const stateId = generateStateId()

  // Create workflow state (backend format)
  const state: WorkflowState = {
    id: stateId,
    type,
    name: `New ${type}`,
    config: getDefaultConfig(type),
  }

  // Create React Flow node (editor format)
  const node: Node = {
    id: stateId,
    type: `${type}Node`,
    position,
    data: { state },
  }

  return { state, node }
}

// Usage in component
const handleAddState = (type: StateType, position: XYPosition) => {
  const { state, node } = createState(type, position)

  workflowsStore.currentWorkflow.states.push(state)
  workflowsStore.editorState.nodes.push(node)
}
```

### Updating Nodes

```typescript
// src/utils/workflowEditor/actions/states/updateState.ts
export const updateState = (
  stateId: string,
  updates: Partial<WorkflowState>
) => {
  // Update in workflow data
  const state = findStateById(stateId)
  Object.assign(state, updates)

  // Update in editor nodes
  const node = findNodeById(stateId)
  node.data = { ...node.data, state }

  return { state, node }
}

// Usage
const handleConfigChange = (stateId: string, config: StateConfig) => {
  updateState(stateId, { config })
}
```

### Deleting Nodes

```typescript
// Handle cleanup when deleting nodes
export const deleteState = (stateId: string) => {
  // Remove connections first
  const connectedEdges = getConnectedEdges(stateId)
  connectedEdges.forEach(edge => deleteConnection(edge.id))

  // Remove node
  workflowsStore.editorState.nodes =
    workflowsStore.editorState.nodes.filter(n => n.id !== stateId)

  // Remove state
  workflowsStore.currentWorkflow.states =
    workflowsStore.currentWorkflow.states.filter(s => s.id !== stateId)
}
```

---

## Connection Operations

### Creating Connections

```typescript
// src/utils/workflowEditor/actions/connections/createConnection.ts
export const createConnection = (
  sourceId: string,
  targetId: string,
  sourceHandle?: string
) => {
  // Validate connection
  const validation = validateConnection(sourceId, targetId)
  if (!validation.valid) {
    toaster.error(validation.message)
    return null
  }

  // Create edge
  const edge: Edge = {
    id: `${sourceId}-${targetId}`,
    source: sourceId,
    target: targetId,
    sourceHandle,
  }

  // Update workflow transition
  const sourceState = findStateById(sourceId)
  sourceState.transitions = sourceState.transitions || {}
  sourceState.transitions[sourceHandle || 'default'] = targetId

  return edge
}

// Usage in React Flow
const onConnect = (connection: Connection) => {
  const edge = createConnection(
    connection.source,
    connection.target,
    connection.sourceHandle
  )

  if (edge) {
    workflowsStore.editorState.edges.push(edge)
  }
}
```

### Validation Rules

```typescript
// src/utils/workflowEditor/helpers/connections/connectionValidator.ts
export const validateConnection = (
  sourceId: string,
  targetId: string
): { valid: boolean; message?: string } => {
  // Prevent self-loops
  if (sourceId === targetId) {
    return { valid: false, message: 'Cannot connect state to itself' }
  }

  // Prevent backward edges (enforce DAG)
  if (wouldCreateCycle(sourceId, targetId)) {
    return { valid: false, message: 'Cannot create circular connections' }
  }

  // Check connection limits
  const sourceState = findStateById(sourceId)
  if (hasMaxConnections(sourceState)) {
    return { valid: false, message: 'Maximum connections reached' }
  }

  return { valid: true }
}
```

---

## Serialization

### Backend Format → React Flow Format

```typescript
// src/utils/workflowEditor/serialization/deserializer/deserializer.ts
export const deserializeWorkflow = (workflow: Workflow) => {
  // Convert workflow states to React Flow nodes
  const nodes: Node[] = workflow.states.map(state => ({
    id: state.id,
    type: `${state.type}Node`,
    position: state.position || { x: 0, y: 0 },
    data: { state },
  }))

  // Convert workflow transitions to React Flow edges
  const edges: Edge[] = []
  workflow.states.forEach(state => {
    Object.entries(state.transitions || {}).forEach(([handle, targetId]) => {
      edges.push({
        id: `${state.id}-${targetId}`,
        source: state.id,
        target: targetId as string,
        sourceHandle: handle,
      })
    })
  })

  return { nodes, edges }
}
```

### React Flow Format → Backend Format

```typescript
// src/utils/workflowEditor/serialization/serializer.ts
export const serializeWorkflow = (nodes: Node[], edges: Edge[]) => {
  // Convert nodes to states
  const states: WorkflowState[] = nodes.map(node => ({
    ...node.data.state,
    position: node.position,
  }))

  // Build transitions from edges
  const transitionMap = new Map<string, Record<string, string>>()

  edges.forEach(edge => {
    if (!transitionMap.has(edge.source)) {
      transitionMap.set(edge.source, {})
    }
    const transitions = transitionMap.get(edge.source)!
    transitions[edge.sourceHandle || 'default'] = edge.target
  })

  // Add transitions to states
  states.forEach(state => {
    state.transitions = transitionMap.get(state.id) || {}
  })

  return { states }
}
```

---

## Common Patterns

### Auto-Layout

```typescript
// src/utils/workflowEditor/build/layout.ts
import dagre from 'dagre'

export const autoLayout = (nodes: Node[], edges: Edge[]) => {
  const graph = new dagre.graphlib.Graph()
  graph.setDefaultEdgeLabel(() => ({}))
  graph.setGraph({ rankdir: 'TB' })

  // Add nodes
  nodes.forEach(node => {
    graph.setNode(node.id, {
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })
  })

  // Add edges
  edges.forEach(edge => {
    graph.setEdge(edge.source, edge.target)
  })

  // Calculate layout
  dagre.layout(graph)

  // Update node positions
  return nodes.map(node => {
    const positioned = graph.node(node.id)
    return {
      ...node,
      position: {
        x: positioned.x - NODE_WIDTH / 2,
        y: positioned.y - NODE_HEIGHT / 2,
      },
    }
  })
}
```

### Iterator Nodes (Nested Nodes)

```typescript
// Iterator nodes contain other nodes
export const handleIteratorDrop = (
  droppedNode: Node,
  iteratorNode: Node
) => {
  // Check if node is inside iterator bounds
  if (isInsideIterator(droppedNode.position, iteratorNode)) {
    // Mark as child of iterator
    droppedNode.parentNode = iteratorNode.id
    droppedNode.extent = 'parent'

    // Add to iterator's states
    const iteratorState = iteratorNode.data.state as IteratorState
    iteratorState.states = iteratorState.states || []
    iteratorState.states.push(droppedNode.data.state)
  }
}
```

### Viewport Management

```typescript
// Center view on specific node
export const focusNode = (nodeId: string, reactFlowInstance: ReactFlowInstance) => {
  const node = reactFlowInstance.getNode(nodeId)
  if (node) {
    reactFlowInstance.setCenter(
      node.position.x + NODE_WIDTH / 2,
      node.position.y + NODE_HEIGHT / 2,
      { zoom: 1.5, duration: 800 }
    )
  }
}

// Fit all nodes in view
export const fitView = (reactFlowInstance: ReactFlowInstance) => {
  reactFlowInstance.fitView({
    padding: 0.2,
    duration: 800,
  })
}
```

---

## Best Practices

### Separation of Concerns

| Component Layer | Logic Layer |
|----------------|-------------|
| **EditWorkflowPage.tsx** | Render canvas, toolbar |
| **WorkflowCanvas** | Handle React Flow events |
| **NodeTypes** | Render node UI |
| **utils/workflowEditor/actions/** | Mutate state |
| **utils/workflowEditor/build/** | Build graph |
| **utils/workflowEditor/helpers/** | Utilities |

**Rule**: Keep components thin - extract complex logic to `utils/workflowEditor/`

### Testing Strategy

```typescript
// Test logic, not UI
describe('createState', () => {
  it('generates unique state ID', () => {
    const { state } = createState('ai', { x: 0, y: 0 })
    expect(state.id).toMatch(/^state_/)
  })

  it('creates React Flow node', () => {
    const { node } = createState('ai', { x: 100, y: 200 })
    expect(node.position).toEqual({ x: 100, y: 200 })
  })
})
```

### Performance

```typescript
// ✅ DO - Memoize expensive operations
const memoizedEdges = useMemo(() =>
  buildEdges(workflow.states),
  [workflow.states]
)

// ❌ DON'T - Recalculate on every render
const edges = buildEdges(workflow.states)
```

---

## Common Pitfalls

| Problem | Solution |
|---------|----------|
| Node positions not saved | Include `position` in serialization |
| Edges not updating after node delete | Remove connected edges first |
| Circular dependencies | Validate connections (enforce DAG) |
| Iterator nodes not containing children | Check `parentNode` and `extent` props |
| Stale node data after update | Update both `state` and `node.data.state` |

---

**Related Guides**:
- [State Management](../patterns/state-management.md) - Workflow store
- [Component Patterns](../components/component-patterns.md) - Editor components
- [Performance Patterns](./performance-patterns.md) - Optimization

**Last Updated**: 2026-02-03
