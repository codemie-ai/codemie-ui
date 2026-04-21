// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { describe, expect, it } from 'vitest'

import type { ExtendedWorkflowExecutionState } from '@/types/entity/workflow'
import type { WorkflowNode } from '@/types/workflowEditor'
import { NodeTypes } from '@/types/workflowEditor/base'
import type { StateConfiguration } from '@/types/workflowEditor/configuration'

import { applyExecutionStates } from '../applyExecutionStates'
import { configState, configHandle, execState, xyNode, xyEdge, type TestHandle } from './factories'

import type { Edge } from '@xyflow/react'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Helper to create simple action state
 */
const actionState = (id: string, nextId?: string): StateConfiguration => {
  return configState({
    id,
    _meta: { type: NodeTypes.ASSISTANT },
    next: nextId ? { state_id: nextId } : undefined,
  })
}

/**
 * Helper to create decision state (conditional)
 */
const decisionState = (id: string, thenId: string, otherwiseId: string): StateConfiguration => {
  return configState({
    id,
    _meta: { type: NodeTypes.CONDITIONAL },
    next: {
      condition: {
        then: thenId,
        otherwise: otherwiseId,
      },
    },
  })
}

/**
 * Build a graph (nodes and edges) from config states for testing.
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
const buildGraph = (states: StateConfiguration[]): { nodes: WorkflowNode[]; edges: Edge[] } => {
  const nodes: WorkflowNode[] = []
  const edges: Edge[] = []

  for (const state of states) {
    const isDecision =
      state._meta?.type === NodeTypes.CONDITIONAL || state._meta?.type === NodeTypes.SWITCH

    // Determine handles based on state type
    const handles: TestHandle[] = [
      configHandle({ id: `${state.id}-in`, state_id: state.id, type: 'target' }),
    ]

    // For Decision nodes with branches, create handles for each branch
    if (isDecision && state.next) {
      if (state.next.condition) {
        handles.push(configHandle({ id: `${state.id}-out-0`, state_id: state.id, type: 'source' }))
        handles.push(configHandle({ id: `${state.id}-out-1`, state_id: state.id, type: 'source' }))
      } else if (state.next.switch) {
        state.next.switch.cases.forEach((_, idx) => {
          handles.push(
            configHandle({ id: `${state.id}-out-${idx}`, state_id: state.id, type: 'source' })
          )
        })
        handles.push(
          configHandle({ id: `${state.id}-out-default`, state_id: state.id, type: 'source' })
        )
      } else {
        handles.push(configHandle({ id: `${state.id}-out`, state_id: state.id, type: 'source' }))
      }
    } else {
      // Default output handle for Action nodes
      handles.push(configHandle({ id: `${state.id}-out`, state_id: state.id, type: 'source' }))
    }

    // Create node with appropriate handles
    nodes.push(xyNode(state.id, isDecision, handles))

    // Create edges based on next
    if (state.next) {
      const { next } = state
      if (next.state_id) {
        edges.push(xyEdge(state.id, next.state_id))
      } else if (next.state_ids) {
        next.state_ids.forEach((target) => {
          edges.push(xyEdge(state.id, target))
        })
      } else if (next.condition) {
        edges.push(xyEdge(state.id, next.condition.then, { sourceHandle: `${state.id}-out-0` }))
        edges.push(
          xyEdge(state.id, next.condition.otherwise, { sourceHandle: `${state.id}-out-1` })
        )
      } else if (next.switch) {
        next.switch.cases.forEach((caseItem, idx) => {
          edges.push(
            xyEdge(state.id, caseItem.state_id, { sourceHandle: `${state.id}-out-${idx}` })
          )
        })
        edges.push(
          xyEdge(state.id, next.switch.default, { sourceHandle: `${state.id}-out-default` })
        )
      }
    }
  }

  return { nodes, edges }
}

const makeGraph = (states: StateConfiguration[]) => buildGraph(states)

/**
 * Deep-clone nodes and edges so each test starts with pristine data.
 * applyExecutionStates mutates nodes and edges in place.
 */
const cloneGraph = (graph: ReturnType<typeof makeGraph>) => ({
  nodes: graph.nodes.map((n) => {
    const handlesStatusMap = n.data?.handlesStatusMap
    return {
      ...n,
      data: {
        ...n.data,
        handlesStatusMap: handlesStatusMap instanceof Map ? new Map(handlesStatusMap) : new Map(),
      },
    }
  }),
  edges: graph.edges.map((e) => ({ ...e, data: e.data ? { ...e.data } : {} })),
})

const run = (
  configStates: StateConfiguration[],
  executionStates: ExtendedWorkflowExecutionState[],
  debug: { showExecutionPath: boolean } = { showExecutionPath: false }
) => {
  const graph = makeGraph(configStates)
  const { nodes, edges } = cloneGraph(graph)
  return applyExecutionStates({ nodes, edges, configStates, executionStates, debug })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('applyExecutionStates', () => {
  describe('no execution states', () => {
    it('marks all nodes as not executed with null status', () => {
      const configStates = [actionState('A', 'B'), actionState('B')]
      const { nodes } = run(configStates, [])

      for (const node of nodes) {
        expect(node.data.executed).toBe(false)
        expect(node.data.status).toBeNull()
      }
    })

    it('sets all edge statuses to null', () => {
      const configStates = [actionState('A', 'B'), actionState('B')]
      const { edges } = run(configStates, [])

      for (const edge of edges) {
        expect(edge.data?.status).toBeNull()
      }
    })
  })

  describe('executed nodes', () => {
    it('marks an executed Action node as executed=true with correct status', () => {
      const configStates = [actionState('A', 'B'), actionState('B')]
      const executionStates = [
        execState({
          resolvedId: 'B',
          preceding_state_ids: ['A'],
          status: 'Succeeded',
        }),
      ]

      const { nodes } = run(configStates, executionStates)

      const nodeA = nodes.find((n) => n.id === 'A')
      const nodeB = nodes.find((n) => n.id === 'B')

      expect(nodeA?.data.executed).toBe(true)
      expect(nodeA?.data.status).toBe('Not Started') // A has no log entry → getActionStatus returns NotStarted
      expect(nodeB?.data.executed).toBe(true)
      expect(nodeB?.data.status).toBe('Succeeded')
    })

    it('marks nodes NOT on the execution path as executed=false with null status', () => {
      const configStates = [decisionState('Dec', 'B', 'C'), actionState('B'), actionState('C')]
      // Only B branch taken — C should not be executed
      const executionStates = [
        execState({
          resolvedId: 'B',
          preceding_state_ids: ['Dec'],
          status: 'Succeeded',
        }),
      ]

      const { nodes } = run(configStates, executionStates)

      const nodeC = nodes.find((n) => n.id === 'C')
      expect(nodeC?.data.executed).toBe(false)
      expect(nodeC?.data.status).toBeNull()
    })

    it('marks a bridging Decision node as executed=true with Success status', () => {
      const configStates = [
        actionState('A', 'Dec'),
        decisionState('Dec', 'B', 'B'),
        actionState('B'),
      ]
      const executionStates = [
        execState({
          resolvedId: 'B',
          preceding_state_ids: ['A'],
          status: 'Succeeded',
        }),
      ]

      const { nodes } = run(configStates, executionStates)

      const decNode = nodes.find((n) => n.id === 'Dec')
      expect(decNode?.data.executed).toBe(true)
      expect(decNode?.data.status).toBe('Succeeded')
    })

    it('reflects the correct status for a failed terminal node', () => {
      const configStates = [
        actionState('A', 'Dec'),
        decisionState('Dec', 'B', 'B'),
        actionState('B'),
      ]
      const executionStates = [
        execState({
          resolvedId: 'B',
          preceding_state_ids: ['A'],
          status: 'Failed',
        }),
      ]

      const { nodes } = run(configStates, executionStates)

      const nodeB = nodes.find((n) => n.id === 'B')
      expect(nodeB?.data.status).toBe('Failed')
    })

    it('reflects InProgress for a currently running node', () => {
      const configStates = [actionState('A', 'B'), actionState('B')]
      const executionStates = [
        execState({
          resolvedId: 'B',
          preceding_state_ids: ['A'],
          status: 'In Progress',
        }),
      ]

      const { nodes } = run(configStates, executionStates)

      const nodeB = nodes.find((n) => n.id === 'B')
      expect(nodeB?.data.status).toBe('In Progress')
    })
  })

  describe('executed edges', () => {
    it('sets data.status on an executed edge', () => {
      const configStates = [actionState('A', 'B'), actionState('B')]
      const executionStates = [
        execState({
          resolvedId: 'B',
          preceding_state_ids: ['A'],
          status: 'Succeeded',
        }),
      ]

      const { edges } = run(configStates, executionStates)

      const edge = edges.find((e) => e.source === 'A' && e.target === 'B')
      expect(edge?.data?.status).toBe('Succeeded')
    })

    it('leaves data.status null on an edge that was not traversed', () => {
      const configStates = [decisionState('Dec', 'B', 'C'), actionState('B'), actionState('C')]
      const executionStates = [
        execState({
          resolvedId: 'B',
          preceding_state_ids: ['Dec'],
          status: 'Succeeded',
        }),
      ]

      const { edges } = run(configStates, executionStates)

      const untakenEdge = edges.find((e) => e.source === 'Dec' && e.target === 'C')
      expect(untakenEdge?.data?.status).toBeNull()
    })

    it('assigns Failed status to an edge leading to a failed node', () => {
      const configStates = [
        actionState('A', 'Dec'),
        decisionState('Dec', 'B', 'B'),
        actionState('B'),
      ]
      const executionStates = [
        execState({
          resolvedId: 'B',
          preceding_state_ids: ['A'],
          status: 'Failed',
        }),
      ]

      const { edges } = run(configStates, executionStates)

      const decToB = edges.find((e) => e.source === 'Dec' && e.target === 'B')
      expect(decToB?.data?.status).toBe('Failed')
    })
  })

  describe('handlesStatusMap propagation', () => {
    it('attaches the same handlesStatusMap instance to every node', () => {
      const configStates = [actionState('A', 'B'), actionState('B')]
      const executionStates = [
        execState({
          resolvedId: 'B',
          preceding_state_ids: ['A'],
          status: 'Succeeded',
        }),
      ]

      const { nodes } = run(configStates, executionStates)

      // All nodes share the same handlesStatusMap object
      const map = nodes[0]?.data.handlesStatusMap
      for (const node of nodes) {
        expect(node.data.handlesStatusMap).toBe(map)
      }
    })

    it('attaches the handlesStatusMap to every edge', () => {
      const configStates = [actionState('A', 'B'), actionState('B')]
      const executionStates = [
        execState({
          resolvedId: 'B',
          preceding_state_ids: ['A'],
          status: 'Succeeded',
        }),
      ]

      const { nodes, edges } = run(configStates, executionStates)

      const nodeMap = nodes[0]?.data.handlesStatusMap
      for (const edge of edges) {
        expect((edge.data as { handlesStatusMap: unknown }).handlesStatusMap).toBe(nodeMap)
      }
    })
  })

  describe('multiple decision edges to same target', () => {
    it('highlights all edges when multiple decision branches point to the same state', () => {
      // Decision A has two branches (Handle-0 and Handle-1) both pointing to State X
      // When we execute through Decision A to State X, we can't determine which handle
      // was actually used, so both edges (and handles) should be highlighted
      const configStates = [
        actionState('A', 'Decision'),
        decisionState('Decision', 'X', 'X'),
        actionState('X'),
      ]

      const executionStates = [
        execState({
          resolvedId: 'X',
          preceding_state_ids: ['A'],
          status: 'Succeeded',
        }),
      ]

      const { edges } = run(configStates, executionStates, {
        showExecutionPath: true,
      })

      // Find both edges from Decision to X
      const decisionToXEdges = edges.filter((e) => e.source === 'Decision' && e.target === 'X')
      expect(decisionToXEdges).toHaveLength(2)

      // Both edges should be marked as executed (status should be 'Succeeded')
      for (const edge of decisionToXEdges) {
        expect(edge.data?.status).toBe('Succeeded')
      }
    })

    it('highlights all edges when multiple decision branches point to the same state through nested decisions', () => {
      // A → DecisionA → [X, X]
      // More complex: A → DecisionA → DecisionB → X (multiple paths)
      const configStates = [
        actionState('A', 'DecisionA'),
        decisionState('DecisionA', 'DecisionB', 'X'),
        decisionState('DecisionB', 'X', 'X'),
        actionState('X'),
      ]

      const executionStates = [
        execState({
          resolvedId: 'X',
          preceding_state_ids: ['A'],
          status: 'Succeeded',
        }),
      ]

      const { edges } = run(configStates, executionStates)

      // Both paths should be highlighted:
      // Path 1: DecisionA → DecisionB → X
      // Path 2: DecisionA → X
      const decisionAToB = edges.find((e) => e.source === 'DecisionA' && e.target === 'DecisionB')
      const decisionBToX = edges.find((e) => e.source === 'DecisionB' && e.target === 'X')
      const decisionAToX = edges.find((e) => e.source === 'DecisionA' && e.target === 'X')

      expect(decisionAToB?.data?.status).toBe('Succeeded')
      expect(decisionBToX?.data?.status).toBe('Succeeded')
      expect(decisionAToX?.data?.status).toBe('Succeeded')
    })
  })

  describe('realistic workflow: order processing flow', () => {
    it('correctly processes the full mock-data execution scenario', () => {
      // Subset of the mock order-processing graph:
      // START → Receive Order → [Validate Order (D) → Check Customer Account (D)] → Request Account Verification
      //       → [Validate Order (D) → Check Customer Account (D) → Check Stock (D)] → Reserve Inventory
      //       → [Process Payment (D)] → Retry Payment (×2) → [Process Payment (D)] → Generate Invoice
      //       → [Prepare Shipment (D)] → Manual Review → [Prepare Shipment (D)] → Assign Courier (Failed)
      //       → Ship Order (InProgress)
      const configStates: StateConfiguration[] = [
        actionState('START', 'Receive Order'),
        actionState('Receive Order', 'Validate Order'),
        decisionState('Validate Order', 'Check Customer Account', 'Reject Order'),
        decisionState('Check Customer Account', 'Check Stock', 'Request Account Verification'),
        actionState('Request Account Verification', 'Validate Order'),
        decisionState('Check Stock', 'Reserve Inventory', 'Back Order'),
        actionState('Reserve Inventory', 'Process Payment'),
        decisionState('Process Payment', 'Generate Invoice', 'Retry Payment'),
        actionState('Retry Payment', 'Process Payment'),
        actionState('Generate Invoice', 'Prepare Shipment'),
        decisionState('Prepare Shipment', 'Assign Courier', 'Manual Review'),
        actionState('Manual Review', 'Prepare Shipment'),
        actionState('Assign Courier', 'Ship Order'),
        actionState('Ship Order'),
        actionState('Reject Order'),
        actionState('Back Order'),
      ]

      const executionStates: ExtendedWorkflowExecutionState[] = [
        execState({
          resolvedId: 'Receive Order',
          preceding_state_ids: ['START'],
          status: 'Succeeded',
        }),
        execState({
          resolvedId: 'Request Account Verification',
          preceding_state_ids: ['Receive Order'],
          status: 'Succeeded',
        }),
        execState({
          resolvedId: 'Reserve Inventory',
          preceding_state_ids: ['Request Account Verification'],
          status: 'Succeeded',
        }),
        execState({
          resolvedId: 'Retry Payment',
          preceding_state_ids: ['Reserve Inventory'],
          status: 'Succeeded',
        }),
        execState({
          resolvedId: 'Retry Payment',
          preceding_state_ids: ['Reserve Inventory'],
          status: 'Interrupted',
        }),
        execState({
          resolvedId: 'Retry Payment',
          preceding_state_ids: ['Reserve Inventory'],
          status: 'Succeeded',
        }),
        execState({
          resolvedId: 'Generate Invoice',
          preceding_state_ids: ['Retry Payment'],
          status: 'Succeeded',
        }),
        execState({
          resolvedId: 'Manual Review',
          preceding_state_ids: ['Generate Invoice'],
          status: 'Succeeded',
        }),
        execState({
          resolvedId: 'Assign Courier',
          preceding_state_ids: ['Manual Review'],
          status: 'Failed',
        }),
        execState({
          resolvedId: 'Ship Order',
          preceding_state_ids: ['Assign Courier'],
          status: 'In Progress',
        }),
      ]

      const { nodes, edges } = run(configStates, executionStates)

      // --- Node statuses ---
      const nodeById = (id: string) => nodes.find((n) => n.id === id)

      // Executed nodes on the path
      expect(nodeById('Receive Order')?.data.executed).toBe(true)
      expect(nodeById('Receive Order')?.data.status).toBe('Succeeded')

      expect(nodeById('Validate Order')?.data.executed).toBe(true)
      expect(nodeById('Validate Order')?.data.status).toBe('Succeeded') // Decision → always

      expect(nodeById('Request Account Verification')?.data.executed).toBe(true)
      expect(nodeById('Request Account Verification')?.data.status).toBe('Succeeded')

      expect(nodeById('Reserve Inventory')?.data.executed).toBe(true)
      expect(nodeById('Reserve Inventory')?.data.status).toBe('Succeeded')

      // Retry Payment: 3 executions, last = Success
      expect(nodeById('Retry Payment')?.data.status).toBe('Succeeded')

      expect(nodeById('Generate Invoice')?.data.status).toBe('Succeeded')

      expect(nodeById('Manual Review')?.data.status).toBe('Succeeded')

      // Assign Courier failed
      expect(nodeById('Assign Courier')?.data.executed).toBe(true)
      expect(nodeById('Assign Courier')?.data.status).toBe('Failed')

      // Ship Order is InProgress
      expect(nodeById('Ship Order')?.data.executed).toBe(true)
      expect(nodeById('Ship Order')?.data.status).toBe('In Progress')

      // Untaken branches: not executed
      expect(nodeById('Reject Order')?.data.executed).toBe(false)
      expect(nodeById('Reject Order')?.data.status).toBeNull()
      expect(nodeById('Back Order')?.data.executed).toBe(false)

      // --- Edge statuses ---
      const edgeByPath = (source: string, target: string) =>
        edges.find((e) => e.source === source && e.target === target)

      // Direct Action→Action edges carry the target's execution status
      expect(edgeByPath('Assign Courier', 'Ship Order')?.data?.status).toBe('In Progress')

      // Decision→Action edge: the actual status of the target (Failed)
      expect(edgeByPath('Prepare Shipment', 'Assign Courier')?.data?.status).toBe('Failed')

      // Decision→Action edge: Success for the successful branch
      expect(edgeByPath('Prepare Shipment', 'Manual Review')?.data?.status).toBe('Succeeded')

      // Untaken branch edges: null
      expect(edgeByPath('Validate Order', 'Reject Order')?.data?.status).toBeNull()
    })
  })
})
