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

import { NodePositionChange } from '@xyflow/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { WorkflowNode, NodeTypes } from '@/types/workflowEditor/base'
import { WorkflowConfiguration } from '@/types/workflowEditor/configuration'
import toaster from '@/utils/toaster'

import { handleIteratorDropAction } from '../handleIteratorDrop'

vi.mock('@/utils/toaster')

describe('handleIteratorDrop', () => {
  let mockGetIntersectingNodes: (node: WorkflowNode) => WorkflowNode[]
  let nodes: WorkflowNode[]
  let config: WorkflowConfiguration

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup basic nodes
    nodes = [
      {
        id: 'assistant1',
        type: NodeTypes.ASSISTANT,
        position: { x: 100, y: 100 },
        data: {},
      } as WorkflowNode,
      {
        id: 'tool1',
        type: NodeTypes.TOOL,
        position: { x: 200, y: 100 },
        data: {},
      } as WorkflowNode,
      {
        id: 'custom1',
        type: NodeTypes.CUSTOM,
        position: { x: 300, y: 100 },
        data: {},
      } as WorkflowNode,
      {
        id: 'start1',
        type: NodeTypes.START,
        position: { x: 400, y: 100 },
        data: {},
      } as WorkflowNode,
      {
        id: 'iterator1',
        type: NodeTypes.ITERATOR,
        position: { x: 0, y: 0 },
        data: {},
      } as WorkflowNode,
    ]

    // Setup basic config
    config = {
      states: [
        {
          id: 'assistant1',
          assistant_id: 'asst1',
          _meta: {
            type: 'assistant',
            is_connected: true,
            position: { x: 100, y: 100 },
          },
        },
        {
          id: 'tool1',
          tool_id: 'tool1',
          _meta: {
            type: 'tool',
            is_connected: true,
            position: { x: 200, y: 100 },
          },
        },
        {
          id: 'custom1',
          custom_node_id: 'custom1',
          _meta: {
            type: 'custom',
            is_connected: true,
            position: { x: 300, y: 100 },
          },
        },
        {
          id: 'start1',
          _meta: {
            type: 'start',
            is_connected: true,
            position: { x: 400, y: 100 },
          },
        },
        {
          id: 'iterator1',
          _meta: {
            type: 'iterator',
            is_connected: true,
            position: { x: 0, y: 0 },
            data: { iter_key: 'items' },
          },
        },
      ],
    }

    mockGetIntersectingNodes = vi.fn(() => [])
  })

  describe('valid drops into iterator', () => {
    it('should allow assistant node to be dropped into iterator', () => {
      // Add parent connection for assistant1
      config.states.push({
        id: 'start_state',
        _meta: {
          type: 'start',
          is_connected: true,
          position: { x: 0, y: 0 },
          data: {
            next: {
              state_id: 'assistant1',
            },
          },
        },
      })

      const changes: NodePositionChange[] = [
        {
          id: 'assistant1',
          type: 'position',
          position: { x: 50, y: 50 },
        },
      ]

      mockGetIntersectingNodes = vi.fn((node) => {
        if (node.id === 'assistant1') {
          return [nodes[4]] // Return iterator node
        }
        return []
      })

      const result = handleIteratorDropAction(changes, nodes, config, mockGetIntersectingNodes)

      expect(result.changes).toHaveLength(1)
      expect(result.changes[0].position).toEqual({ x: 50, y: 50 })
      expect(result.parentChanges).toHaveLength(1)
      expect(result.parentChanges[0]).toEqual({
        nodeId: 'assistant1',
        oldIteratorId: null,
        newIteratorId: 'iterator1',
      })
      expect(toaster.error).not.toHaveBeenCalled()
    })

    it('should allow tool node to be dropped into iterator', () => {
      // Add parent connection for tool1
      config.states[0].next = {
        state_id: 'tool1',
      }

      const changes: NodePositionChange[] = [
        {
          id: 'tool1',
          type: 'position',
          position: { x: 50, y: 50 },
        },
      ]

      mockGetIntersectingNodes = vi.fn((node) => {
        if (node.id === 'tool1') {
          return [nodes[4]] // Return iterator node
        }
        return []
      })

      const result = handleIteratorDropAction(changes, nodes, config, mockGetIntersectingNodes)

      expect(result.changes).toHaveLength(1)
      expect(result.changes[0].position).toEqual({ x: 50, y: 50 })
      expect(result.parentChanges).toHaveLength(1)
      expect(result.parentChanges[0]).toEqual({
        nodeId: 'tool1',
        oldIteratorId: null,
        newIteratorId: 'iterator1',
      })
      expect(toaster.error).not.toHaveBeenCalled()
    })

    it('should allow custom node to be dropped into iterator', () => {
      // Add parent connection for custom1
      config.states[1].next = {
        state_id: 'custom1',
      }

      const changes: NodePositionChange[] = [
        {
          id: 'custom1',
          type: 'position',
          position: { x: 50, y: 50 },
        },
      ]

      mockGetIntersectingNodes = vi.fn((node) => {
        if (node.id === 'custom1') {
          return [nodes[4]] // Return iterator node
        }
        return []
      })

      const result = handleIteratorDropAction(changes, nodes, config, mockGetIntersectingNodes)

      expect(result.changes).toHaveLength(1)
      expect(result.changes[0].position).toEqual({ x: 50, y: 50 })
      expect(result.parentChanges).toHaveLength(1)
      expect(result.parentChanges[0]).toEqual({
        nodeId: 'custom1',
        oldIteratorId: null,
        newIteratorId: 'iterator1',
      })
      expect(toaster.error).not.toHaveBeenCalled()
    })
  })

  describe('invalid drops into iterator', () => {
    it('should reject start node dropped into iterator and revert position', () => {
      const changes: NodePositionChange[] = [
        {
          id: 'start1',
          type: 'position',
          position: { x: 50, y: 50 },
        },
      ]

      mockGetIntersectingNodes = vi.fn((node) => {
        if (node.id === 'start1') {
          return [nodes[4]] // Return iterator node
        }
        return []
      })

      const result = handleIteratorDropAction(changes, nodes, config, mockGetIntersectingNodes)

      expect(result.changes).toHaveLength(1)
      // Position should be reverted to original stored position
      expect(result.changes[0].position).toEqual({ x: 400, y: 100 })
      expect(result.parentChanges).toHaveLength(0)
      expect(toaster.error).toHaveBeenCalledWith(
        'Only execution nodes (Assistant, Tool, Custom, Transform) can be dropped into an Iterator'
      )
    })

    it('should reject conditional node dropped into iterator', () => {
      const conditionalNode: WorkflowNode = {
        id: 'conditional1',
        type: NodeTypes.CONDITIONAL,
        position: { x: 500, y: 100 },
        data: {},
      } as WorkflowNode

      nodes.push(conditionalNode)
      config.states.push({
        id: 'conditional1',
        _meta: {
          type: 'conditional',
          is_connected: true,
          position: { x: 500, y: 100 },
        },
      })

      const changes: NodePositionChange[] = [
        {
          id: 'conditional1',
          type: 'position',
          position: { x: 50, y: 50 },
        },
      ]

      mockGetIntersectingNodes = vi.fn((node) => {
        if (node.id === 'conditional1') {
          return [nodes[4]] // Return iterator node
        }
        return []
      })

      const result = handleIteratorDropAction(changes, nodes, config, mockGetIntersectingNodes)

      expect(result.changes[0].position).toEqual({ x: 500, y: 100 })
      expect(result.parentChanges).toHaveLength(0)
      expect(toaster.error).toHaveBeenCalled()
    })

    it('should reject iterator node dropped into another iterator', () => {
      const iterator2: WorkflowNode = {
        id: 'iterator2',
        type: NodeTypes.ITERATOR,
        position: { x: 600, y: 100 },
        data: {},
      } as WorkflowNode

      nodes.push(iterator2)
      config.states.push({
        id: 'iterator2',
        _meta: {
          type: 'iterator',
          is_connected: true,
          position: { x: 600, y: 100 },
          data: { iter_key: 'other' },
        },
      })

      const changes: NodePositionChange[] = [
        {
          id: 'iterator2',
          type: 'position',
          position: { x: 50, y: 50 },
        },
      ]

      mockGetIntersectingNodes = vi.fn((node) => {
        if (node.id === 'iterator2') {
          return [nodes[4]] // Return iterator1
        }
        return []
      })

      const result = handleIteratorDropAction(changes, nodes, config, mockGetIntersectingNodes)

      expect(result.changes[0].position).toEqual({ x: 600, y: 100 })
      expect(result.parentChanges).toHaveLength(0)
      expect(toaster.error).toHaveBeenCalled()
    })

    it('should reject node with multiple parents dropped into iterator', () => {
      // Setup node with multiple parents
      // Parent 1: has assistant1 as state_id
      // Parent 2: has assistant1 in state_ids array
      config.states.push({
        id: 'parent1',
        next: {
          state_id: 'assistant1',
        },
        _meta: {
          type: 'assistant',
          is_connected: true,
          position: { x: 0, y: 0 },
        },
      })

      config.states.push({
        id: 'parent2',
        next: {
          state_ids: ['assistant1', 'custom1'],
        },
        _meta: {
          type: 'assistant',
          is_connected: true,
          position: { x: 0, y: 0 },
        },
      })

      const changes: NodePositionChange[] = [
        {
          id: 'assistant1',
          type: 'position',
          position: { x: 50, y: 50 },
        },
      ]

      mockGetIntersectingNodes = vi.fn((node) => {
        if (node.id === 'assistant1') {
          return [nodes[4]] // Return iterator node
        }
        return []
      })

      const result = handleIteratorDropAction(changes, nodes, config, mockGetIntersectingNodes)

      expect(result.changes[0].position).toEqual({ x: 100, y: 100 }) // Reverted to original position
      expect(result.parentChanges).toHaveLength(0)
      expect(toaster.error).toHaveBeenCalledWith(
        'Cannot add node with multiple parents to an iterator'
      )
    })

    it('should reject node with no parents dropped into iterator', () => {
      // Ensure assistant1 has no parents (no state references it in next.state_id or next.state_ids)
      const changes: NodePositionChange[] = [
        {
          id: 'assistant1',
          type: 'position',
          position: { x: 50, y: 50 },
        },
      ]

      mockGetIntersectingNodes = vi.fn((node) => {
        if (node.id === 'assistant1') {
          return [nodes[4]] // Return iterator node
        }
        return []
      })

      const result = handleIteratorDropAction(changes, nodes, config, mockGetIntersectingNodes)

      expect(result.changes[0].position).toEqual({ x: 100, y: 100 }) // Reverted to original position
      expect(result.parentChanges).toHaveLength(0)
      expect(toaster.error).toHaveBeenCalledWith(
        'Cannot add node to iterator: node must have a parent connection first'
      )
    })
  })

  describe('moving nodes out of iterator', () => {
    it('should track when node is moved out of iterator', () => {
      // Setup node already inside iterator
      config.states[0].next = {
        meta_iter_state_id: 'iterator1',
        iter_key: 'items',
      }

      const changes: NodePositionChange[] = [
        {
          id: 'assistant1',
          type: 'position',
          position: { x: 300, y: 300 },
        },
      ]

      // Node is no longer intersecting with iterator
      mockGetIntersectingNodes = vi.fn(() => [])

      const result = handleIteratorDropAction(changes, nodes, config, mockGetIntersectingNodes)

      expect(result.changes).toHaveLength(1)
      expect(result.changes[0].position).toEqual({ x: 300, y: 300 })
      expect(result.parentChanges).toHaveLength(1)
      expect(result.parentChanges[0]).toEqual({
        nodeId: 'assistant1',
        oldIteratorId: 'iterator1',
        newIteratorId: null,
      })
      expect(toaster.error).not.toHaveBeenCalled()
    })

    it('should allow moving iterable node out of iterator', () => {
      config.states[1].next = {
        meta_iter_state_id: 'iterator1',
        iter_key: 'items',
      }

      const changes: NodePositionChange[] = [
        {
          id: 'tool1',
          type: 'position',
          position: { x: 400, y: 400 },
        },
      ]

      mockGetIntersectingNodes = vi.fn(() => [])

      const result = handleIteratorDropAction(changes, nodes, config, mockGetIntersectingNodes)

      expect(result.parentChanges).toHaveLength(1)
      expect(result.parentChanges[0]).toEqual({
        nodeId: 'tool1',
        oldIteratorId: 'iterator1',
        newIteratorId: null,
      })
    })
  })

  describe('no iterator parent change', () => {
    it('should not track changes when node stays outside iterator', () => {
      const changes: NodePositionChange[] = [
        {
          id: 'assistant1',
          type: 'position',
          position: { x: 150, y: 150 },
        },
      ]

      mockGetIntersectingNodes = vi.fn(() => [])

      const result = handleIteratorDropAction(changes, nodes, config, mockGetIntersectingNodes)

      expect(result.changes).toHaveLength(1)
      expect(result.changes[0].position).toEqual({ x: 150, y: 150 })
      expect(result.parentChanges).toHaveLength(0)
      expect(toaster.error).not.toHaveBeenCalled()
    })

    it('should not track changes when node stays inside same iterator', () => {
      // Setup node already inside iterator
      config.states[0].next = {
        meta_iter_state_id: 'iterator1',
        iter_key: 'items',
      }

      const changes: NodePositionChange[] = [
        {
          id: 'assistant1',
          type: 'position',
          position: { x: 60, y: 60 },
        },
      ]

      // Node still intersects with same iterator
      mockGetIntersectingNodes = vi.fn((node) => {
        if (node.id === 'assistant1') {
          return [nodes[4]] // Return same iterator
        }
        return []
      })

      const result = handleIteratorDropAction(changes, nodes, config, mockGetIntersectingNodes)

      expect(result.changes).toHaveLength(1)
      expect(result.changes[0].position).toEqual({ x: 60, y: 60 })
      expect(result.parentChanges).toHaveLength(0)
      expect(toaster.error).not.toHaveBeenCalled()
    })
  })

  describe('multiple position changes', () => {
    it('should handle multiple valid drops', () => {
      // Add parent connections for both nodes
      config.states.push({
        id: 'parent1',
        _meta: {
          type: 'start',
          is_connected: true,
          position: { x: 0, y: 0 },
          data: {
            next: {
              state_id: 'assistant1',
            },
          },
        },
      })

      config.states.push({
        id: 'parent2',
        _meta: {
          type: 'start',
          is_connected: true,
          position: { x: 0, y: 0 },
          data: {
            next: {
              state_id: 'tool1',
            },
          },
        },
      })

      const changes: NodePositionChange[] = [
        {
          id: 'assistant1',
          type: 'position',
          position: { x: 50, y: 50 },
        },
        {
          id: 'tool1',
          type: 'position',
          position: { x: 60, y: 60 },
        },
      ]

      mockGetIntersectingNodes = vi.fn((node) => {
        if (node.id === 'assistant1' || node.id === 'tool1') {
          return [nodes[4]] // Return iterator
        }
        return []
      })

      const result = handleIteratorDropAction(changes, nodes, config, mockGetIntersectingNodes)

      expect(result.changes).toHaveLength(2)
      expect(result.parentChanges).toHaveLength(2)
      expect(result.parentChanges[0]).toEqual({
        nodeId: 'assistant1',
        oldIteratorId: null,
        newIteratorId: 'iterator1',
      })
      expect(result.parentChanges[1]).toEqual({
        nodeId: 'tool1',
        oldIteratorId: null,
        newIteratorId: 'iterator1',
      })
    })

    it('should handle mix of valid and invalid drops', () => {
      // Add parent connection for assistant1
      config.states.push({
        id: 'parent_asst',
        _meta: {
          type: 'start',
          is_connected: true,
          position: { x: 0, y: 0 },
          data: {
            next: {
              state_id: 'assistant1',
            },
          },
        },
      })

      const changes: NodePositionChange[] = [
        {
          id: 'assistant1',
          type: 'position',
          position: { x: 50, y: 50 },
        },
        {
          id: 'start1',
          type: 'position',
          position: { x: 60, y: 60 },
        },
      ]

      mockGetIntersectingNodes = vi.fn((node) => {
        if (node.id === 'assistant1' || node.id === 'start1') {
          return [nodes[4]] // Both intersect iterator
        }
        return []
      })

      const result = handleIteratorDropAction(changes, nodes, config, mockGetIntersectingNodes)

      expect(result.changes).toHaveLength(2)
      // Assistant should keep new position
      expect(result.changes[0].position).toEqual({ x: 50, y: 50 })
      // Start should be reverted
      expect(result.changes[1].position).toEqual({ x: 400, y: 100 })

      // Only assistant should have parent change
      expect(result.parentChanges).toHaveLength(1)
      expect(result.parentChanges[0].nodeId).toBe('assistant1')

      expect(toaster.error).toHaveBeenCalledTimes(1)
    })
  })

  describe('edge cases', () => {
    it('should handle empty changes array', () => {
      const changes: NodePositionChange[] = []

      const result = handleIteratorDropAction(changes, nodes, config, mockGetIntersectingNodes)

      expect(result.changes).toHaveLength(0)
      expect(result.parentChanges).toHaveLength(0)
    })

    it('should skip changes for nodes not found in nodes array', () => {
      const changes: NodePositionChange[] = [
        {
          id: 'nonexistent',
          type: 'position',
          position: { x: 50, y: 50 },
        },
      ]

      const result = handleIteratorDropAction(changes, nodes, config, mockGetIntersectingNodes)

      expect(result.changes).toHaveLength(1)
      expect(result.parentChanges).toHaveLength(0)
      expect(toaster.error).not.toHaveBeenCalled()
    })

    it('should skip changes for nodes not found in config states', () => {
      nodes.push({
        id: 'newnode',
        type: NodeTypes.ASSISTANT,
        position: { x: 500, y: 500 },
        data: {},
      } as WorkflowNode)

      const changes: NodePositionChange[] = [
        {
          id: 'newnode',
          type: 'position',
          position: { x: 50, y: 50 },
        },
      ]

      const result = handleIteratorDropAction(changes, nodes, config, mockGetIntersectingNodes)

      expect(result.changes).toHaveLength(1)
      expect(result.parentChanges).toHaveLength(0)
    })

    it('should handle node without stored position in meta', () => {
      // Remove stored position from state
      delete config.states[3]._meta?.position

      const changes: NodePositionChange[] = [
        {
          id: 'start1',
          type: 'position',
          position: { x: 50, y: 50 },
        },
      ]

      mockGetIntersectingNodes = vi.fn((node) => {
        if (node.id === 'start1') {
          return [nodes[4]] // Return iterator
        }
        return []
      })

      const result = handleIteratorDropAction(changes, nodes, config, mockGetIntersectingNodes)

      // Should still reject but can't revert to stored position
      expect(result.changes[0].position).toEqual({ x: 50, y: 50 }) // No revert
      expect(result.parentChanges).toHaveLength(0)
      expect(toaster.error).toHaveBeenCalled()
    })

    it('should handle getIntersectingNodes returning multiple nodes', () => {
      // Add parent connection for assistant1
      config.states.push({
        id: 'parent_node',
        _meta: {
          type: 'start',
          is_connected: true,
          position: { x: 0, y: 0 },
          data: {
            next: {
              state_id: 'assistant1',
            },
          },
        },
      })

      const otherNode: WorkflowNode = {
        id: 'other',
        type: NodeTypes.ASSISTANT,
        position: { x: 0, y: 0 },
        data: {},
      } as WorkflowNode

      mockGetIntersectingNodes = vi.fn((node) => {
        if (node.id === 'assistant1') {
          return [otherNode, nodes[4]] // Return multiple, but only iterator matters
        }
        return []
      })

      const changes: NodePositionChange[] = [
        {
          id: 'assistant1',
          type: 'position',
          position: { x: 50, y: 50 },
        },
      ]

      const result = handleIteratorDropAction(changes, nodes, config, mockGetIntersectingNodes)

      expect(result.parentChanges).toHaveLength(1)
      expect(result.parentChanges[0].newIteratorId).toBe('iterator1')
    })

    it('should use null for previousIteratorId when meta_iter_state_id is undefined', () => {
      // Ensure no meta_iter_state_id but ADD a parent connection
      delete config.states[0].next

      config.states.push({
        id: 'parent_for_asst',
        _meta: {
          type: 'start',
          is_connected: true,
          position: { x: 0, y: 0 },
          data: {
            next: {
              state_id: 'assistant1',
            },
          },
        },
      })

      const changes: NodePositionChange[] = [
        {
          id: 'assistant1',
          type: 'position',
          position: { x: 50, y: 50 },
        },
      ]

      mockGetIntersectingNodes = vi.fn((node) => {
        if (node.id === 'assistant1') {
          return [nodes[4]]
        }
        return []
      })

      const result = handleIteratorDropAction(changes, nodes, config, mockGetIntersectingNodes)

      expect(result.parentChanges[0].oldIteratorId).toBeNull()
    })
  })

  describe('parent change tracking', () => {
    it('should track oldIteratorId and newIteratorId correctly', () => {
      // Setup: node currently in iterator1, moving to no iterator
      config.states[0].next = {
        meta_iter_state_id: 'iterator1',
        iter_key: 'items',
      }

      const changes: NodePositionChange[] = [
        {
          id: 'assistant1',
          type: 'position',
          position: { x: 300, y: 300 },
        },
      ]

      mockGetIntersectingNodes = vi.fn(() => [])

      const result = handleIteratorDropAction(changes, nodes, config, mockGetIntersectingNodes)

      expect(result.parentChanges).toHaveLength(1)
      expect(result.parentChanges[0]).toEqual({
        nodeId: 'assistant1',
        oldIteratorId: 'iterator1',
        newIteratorId: null,
      })
    })

    it('should track when moving from one iterator to another', () => {
      // Add parent connection for assistant1
      config.states.push({
        id: 'parent_of_assistant',
        _meta: {
          type: 'start',
          is_connected: true,
          position: { x: 0, y: 0 },
          data: {
            next: {
              state_id: 'assistant1',
            },
          },
        },
      })

      // Add second iterator
      const iterator2: WorkflowNode = {
        id: 'iterator2',
        type: NodeTypes.ITERATOR,
        position: { x: 500, y: 500 },
        data: {},
      } as WorkflowNode
      nodes.push(iterator2)

      config.states.push({
        id: 'iterator2',
        _meta: {
          type: 'iterator',
          is_connected: true,
          position: { x: 500, y: 500 },
          data: { iter_key: 'other' },
        },
      })

      // Setup: node currently in iterator1
      config.states[0].next = {
        meta_iter_state_id: 'iterator1',
        iter_key: 'items',
      }

      const changes: NodePositionChange[] = [
        {
          id: 'assistant1',
          type: 'position',
          position: { x: 550, y: 550 },
        },
      ]

      // Node now intersects with iterator2
      mockGetIntersectingNodes = vi.fn((node) => {
        if (node.id === 'assistant1') {
          return [iterator2]
        }
        return []
      })

      const result = handleIteratorDropAction(changes, nodes, config, mockGetIntersectingNodes)

      expect(result.parentChanges).toHaveLength(1)
      expect(result.parentChanges[0]).toEqual({
        nodeId: 'assistant1',
        oldIteratorId: 'iterator1',
        newIteratorId: 'iterator2',
      })
    })
  })
})
