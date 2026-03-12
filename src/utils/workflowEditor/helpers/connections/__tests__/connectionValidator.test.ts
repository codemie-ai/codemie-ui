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

import { Connection } from '@xyflow/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { WorkflowNode, NodeTypes } from '@/types/workflowEditor/base'
import { WorkflowConfiguration } from '@/types/workflowEditor/configuration'
import toaster from '@/utils/toaster'

import { isValidConnection } from '../connectionValidator'

vi.mock('@/utils/toaster', () => ({
  default: {
    error: vi.fn(),
  },
}))

describe('connectionValidator', () => {
  let nodes: WorkflowNode[]
  let config: WorkflowConfiguration

  beforeEach(() => {
    vi.clearAllMocks()

    nodes = [
      { id: 'start', type: NodeTypes.START, position: { x: 0, y: 0 }, data: {} },
      { id: 'end', type: NodeTypes.END, position: { x: 0, y: 0 }, data: {} },
      { id: 'assistant1', type: NodeTypes.ASSISTANT, position: { x: 0, y: 0 }, data: {} },
      { id: 'assistant2', type: NodeTypes.ASSISTANT, position: { x: 0, y: 0 }, data: {} },
      { id: 'tool1', type: NodeTypes.TOOL, position: { x: 0, y: 0 }, data: {} },
      { id: 'custom1', type: NodeTypes.CUSTOM, position: { x: 0, y: 0 }, data: {} },
      { id: 'conditional1', type: NodeTypes.CONDITIONAL, position: { x: 0, y: 0 }, data: {} },
      { id: 'switch1', type: NodeTypes.SWITCH, position: { x: 0, y: 0 }, data: {} },
    ]

    config = {
      states: [
        { id: 'start', _meta: { type: NodeTypes.START } },
        { id: 'end', _meta: { type: NodeTypes.END } },
        { id: 'assistant1', _meta: { type: NodeTypes.ASSISTANT }, next: {} },
        { id: 'assistant2', _meta: { type: NodeTypes.ASSISTANT }, next: {} },
        { id: 'tool1', _meta: { type: NodeTypes.TOOL }, next: {} },
        { id: 'custom1', _meta: { type: NodeTypes.CUSTOM }, next: {} },
        { id: 'conditional1', _meta: { type: NodeTypes.CONDITIONAL }, next: {} },
        { id: 'switch1', _meta: { type: NodeTypes.SWITCH }, next: {} },
      ],
    }
  })

  describe('basic validation', () => {
    it('should reject connection with missing source', () => {
      const connection: Connection = {
        source: null as any,
        target: 'assistant1',
        sourceHandle: null,
        targetHandle: null,
      }

      expect(isValidConnection(connection, nodes, config)).toBe(false)
    })

    it('should reject connection with missing target', () => {
      const connection: Connection = {
        source: 'assistant1',
        target: null as any,
        sourceHandle: null,
        targetHandle: null,
      }

      expect(isValidConnection(connection, nodes, config)).toBe(false)
    })

    it('should reject self-loop connections', () => {
      const connection: Connection = {
        source: 'assistant1',
        target: 'assistant1',
        sourceHandle: null,
        targetHandle: null,
      }

      expect(isValidConnection(connection, nodes, config)).toBe(false)
    })

    it('should reject connection when source node not found', () => {
      const connection: Connection = {
        source: 'nonexistent',
        target: 'assistant1',
        sourceHandle: null,
        targetHandle: null,
      }

      expect(isValidConnection(connection, nodes, config)).toBe(false)
    })

    it('should reject connection when target node not found', () => {
      const connection: Connection = {
        source: 'assistant1',
        target: 'nonexistent',
        sourceHandle: null,
        targetHandle: null,
      }

      expect(isValidConnection(connection, nodes, config)).toBe(false)
    })
  })

  describe('node type validation', () => {
    describe('start node', () => {
      it('should allow start to assistant connection', () => {
        const connection: Connection = {
          source: 'start',
          target: 'assistant1',
          sourceHandle: null,
          targetHandle: null,
        }

        expect(isValidConnection(connection, nodes, config)).toBe(true)
      })

      it('should allow start to tool connection', () => {
        const connection: Connection = {
          source: 'start',
          target: 'tool1',
          sourceHandle: null,
          targetHandle: null,
        }

        expect(isValidConnection(connection, nodes, config)).toBe(true)
      })

      it('should allow start to custom connection', () => {
        const connection: Connection = {
          source: 'start',
          target: 'custom1',
          sourceHandle: null,
          targetHandle: null,
        }

        expect(isValidConnection(connection, nodes, config)).toBe(true)
      })

      it('should reject start to end connection', () => {
        const connection: Connection = {
          source: 'start',
          target: 'end',
          sourceHandle: null,
          targetHandle: null,
        }

        expect(isValidConnection(connection, nodes, config)).toBe(false)
      })

      it('should reject start to conditional connection', () => {
        const connection: Connection = {
          source: 'start',
          target: 'conditional1',
          sourceHandle: null,
          targetHandle: null,
        }

        expect(isValidConnection(connection, nodes, config)).toBe(false)
      })

      it('should reject start to switch connection', () => {
        const connection: Connection = {
          source: 'start',
          target: 'switch1',
          sourceHandle: null,
          targetHandle: null,
        }

        expect(isValidConnection(connection, nodes, config)).toBe(false)
      })
    })

    describe('end node', () => {
      it('should allow assistant to end connection', () => {
        const connection: Connection = {
          source: 'assistant1',
          target: 'end',
          sourceHandle: null,
          targetHandle: null,
        }

        expect(isValidConnection(connection, nodes, config)).toBe(true)
      })

      it('should reject end as source', () => {
        const connection: Connection = {
          source: 'end',
          target: 'assistant1',
          sourceHandle: null,
          targetHandle: null,
        }

        expect(isValidConnection(connection, nodes, config)).toBe(false)
      })
    })

    describe('execution nodes (assistant, tool, custom)', () => {
      it('should allow assistant to assistant connection', () => {
        const connection: Connection = {
          source: 'assistant1',
          target: 'assistant2',
          sourceHandle: null,
          targetHandle: null,
        }

        expect(isValidConnection(connection, nodes, config)).toBe(true)
      })

      it('should allow assistant to tool connection', () => {
        const connection: Connection = {
          source: 'assistant1',
          target: 'tool1',
          sourceHandle: null,
          targetHandle: null,
        }

        expect(isValidConnection(connection, nodes, config)).toBe(true)
      })

      it('should allow tool to custom connection', () => {
        const connection: Connection = {
          source: 'tool1',
          target: 'custom1',
          sourceHandle: null,
          targetHandle: null,
        }

        expect(isValidConnection(connection, nodes, config)).toBe(true)
      })

      it('should allow custom to assistant connection', () => {
        const connection: Connection = {
          source: 'custom1',
          target: 'assistant1',
          sourceHandle: null,
          targetHandle: null,
        }

        expect(isValidConnection(connection, nodes, config)).toBe(true)
      })

      it('should allow assistant to conditional connection', () => {
        const connection: Connection = {
          source: 'assistant1',
          target: 'conditional1',
          sourceHandle: null,
          targetHandle: null,
        }

        expect(isValidConnection(connection, nodes, config)).toBe(true)
      })

      it('should allow assistant to switch connection', () => {
        const connection: Connection = {
          source: 'assistant1',
          target: 'switch1',
          sourceHandle: null,
          targetHandle: null,
        }

        expect(isValidConnection(connection, nodes, config)).toBe(true)
      })
    })

    describe('conditional node', () => {
      it('should allow conditional to assistant connection', () => {
        const connection: Connection = {
          source: 'conditional1',
          target: 'assistant1',
          sourceHandle: null,
          targetHandle: null,
        }

        expect(isValidConnection(connection, nodes, config)).toBe(true)
      })

      it('should allow conditional to tool connection', () => {
        const connection: Connection = {
          source: 'conditional1',
          target: 'tool1',
          sourceHandle: null,
          targetHandle: null,
        }

        expect(isValidConnection(connection, nodes, config)).toBe(true)
      })

      it('should allow conditional to custom connection', () => {
        const connection: Connection = {
          source: 'conditional1',
          target: 'custom1',
          sourceHandle: null,
          targetHandle: null,
        }

        expect(isValidConnection(connection, nodes, config)).toBe(true)
      })

      it('should allow conditional to end connection', () => {
        const connection: Connection = {
          source: 'conditional1',
          target: 'end',
          sourceHandle: null,
          targetHandle: null,
        }

        expect(isValidConnection(connection, nodes, config)).toBe(true)
      })

      it('should reject conditional to start connection', () => {
        const connection: Connection = {
          source: 'conditional1',
          target: 'start',
          sourceHandle: null,
          targetHandle: null,
        }

        expect(isValidConnection(connection, nodes, config)).toBe(false)
      })
    })

    describe('switch node', () => {
      it('should allow switch to assistant connection', () => {
        const connection: Connection = {
          source: 'switch1',
          target: 'assistant1',
          sourceHandle: null,
          targetHandle: null,
        }

        expect(isValidConnection(connection, nodes, config)).toBe(true)
      })

      it('should allow switch to end connection', () => {
        const connection: Connection = {
          source: 'switch1',
          target: 'end',
          sourceHandle: null,
          targetHandle: null,
        }

        expect(isValidConnection(connection, nodes, config)).toBe(true)
      })

      it('should reject switch to start connection', () => {
        const connection: Connection = {
          source: 'switch1',
          target: 'start',
          sourceHandle: null,
          targetHandle: null,
        }

        expect(isValidConnection(connection, nodes, config)).toBe(false)
      })
    })
  })

  describe('iterator child validation', () => {
    it('should allow connection to node in iterator without parents', () => {
      const nodesWithIterator = [
        ...nodes,
        { id: 'iterator1', type: NodeTypes.ITERATOR, position: { x: 0, y: 0 }, data: {} },
        {
          id: 'child1',
          type: NodeTypes.ASSISTANT,
          position: { x: 0, y: 0 },
          data: {},
          parentId: 'iterator1',
        },
      ]

      const configWithIterator: WorkflowConfiguration = {
        states: [
          ...config.states,
          { id: 'iterator1', _meta: { type: NodeTypes.ITERATOR }, next: {} },
          {
            id: 'child1',
            _meta: { type: NodeTypes.ASSISTANT },
            next: { meta_iter_state_id: 'iterator1' },
          },
        ],
      }

      const connection: Connection = {
        source: 'assistant1',
        target: 'child1',
        sourceHandle: null,
        targetHandle: null,
      }

      expect(isValidConnection(connection, nodesWithIterator, configWithIterator)).toBe(true)
    })

    it('should reject connection to node in iterator that already has a parent', () => {
      const nodesWithIterator = [
        ...nodes,
        { id: 'iterator1', type: NodeTypes.ITERATOR, position: { x: 0, y: 0 }, data: {} },
        {
          id: 'child1',
          type: NodeTypes.ASSISTANT,
          position: { x: 0, y: 0 },
          data: {},
          parentId: 'iterator1',
        },
      ]

      const configWithIterator: WorkflowConfiguration = {
        states: [
          ...config.states,
          { id: 'iterator1', _meta: { type: NodeTypes.ITERATOR }, next: {} },
          {
            id: 'child1',
            _meta: { type: NodeTypes.ASSISTANT },
            next: { meta_iter_state_id: 'iterator1' },
          },
          {
            id: 'parent1',
            _meta: { type: NodeTypes.ASSISTANT },
            next: { state_id: 'child1' },
          },
        ],
      }

      const connection: Connection = {
        source: 'assistant2',
        target: 'child1',
        sourceHandle: null,
        targetHandle: null,
      }

      expect(isValidConnection(connection, nodesWithIterator, configWithIterator)).toBe(false)
    })

    it('should allow connection to node not in iterator even if it has parents', () => {
      const configWithParent: WorkflowConfiguration = {
        states: [
          ...config.states,
          {
            id: 'parent1',
            _meta: { type: NodeTypes.ASSISTANT },
            next: { state_id: 'assistant2' },
          },
        ],
      }

      const connection: Connection = {
        source: 'assistant1',
        target: 'assistant2',
        sourceHandle: null,
        targetHandle: null,
      }

      expect(isValidConnection(connection, nodes, configWithParent)).toBe(true)
    })

    it('should reject connection when target has parentId but no meta_iter_state_id and has parents', () => {
      const nodesWithIterator = [
        ...nodes,
        { id: 'iterator1', type: NodeTypes.ITERATOR, position: { x: 0, y: 0 }, data: {} },
        {
          id: 'child1',
          type: NodeTypes.ASSISTANT,
          position: { x: 0, y: 0 },
          data: {},
          parentId: 'iterator1',
        },
      ]

      const configWithIterator: WorkflowConfiguration = {
        states: [
          ...config.states,
          { id: 'iterator1', _meta: { type: NodeTypes.ITERATOR }, next: {} },
          { id: 'child1', _meta: { type: NodeTypes.ASSISTANT }, next: {} },
          {
            id: 'parent1',
            _meta: { type: NodeTypes.ASSISTANT },
            next: { state_id: 'child1' },
          },
        ],
      }

      const connection: Connection = {
        source: 'assistant2',
        target: 'child1',
        sourceHandle: null,
        targetHandle: null,
      }

      expect(isValidConnection(connection, nodesWithIterator, configWithIterator)).toBe(false)
    })
  })

  describe('circular connection validation', () => {
    it('should allow connection when no circular path exists', () => {
      const configWithPath: WorkflowConfiguration = {
        states: [
          ...config.states,
          { id: 'nodeA', _meta: { type: NodeTypes.ASSISTANT }, next: {} },
          { id: 'nodeB', _meta: { type: NodeTypes.ASSISTANT }, next: {} },
        ],
      }

      const nodesWithPath = [
        ...nodes,
        { id: 'nodeA', type: NodeTypes.ASSISTANT, position: { x: 0, y: 0 }, data: {} },
        { id: 'nodeB', type: NodeTypes.ASSISTANT, position: { x: 0, y: 0 }, data: {} },
      ]

      const connection: Connection = {
        source: 'nodeA',
        target: 'nodeB',
        sourceHandle: null,
        targetHandle: null,
      }

      expect(isValidConnection(connection, nodesWithPath, configWithPath)).toBe(true)
    })

    it('should reject direct circular connection (A->B exists, trying B->A)', () => {
      const configWithPath: WorkflowConfiguration = {
        states: [
          ...config.states,
          { id: 'nodeA', _meta: { type: NodeTypes.ASSISTANT }, next: { state_id: 'nodeB' } },
          { id: 'nodeB', _meta: { type: NodeTypes.ASSISTANT }, next: {} },
        ],
      }

      const nodesWithPath = [
        ...nodes,
        { id: 'nodeA', type: NodeTypes.ASSISTANT, position: { x: 0, y: 0 }, data: {} },
        { id: 'nodeB', type: NodeTypes.ASSISTANT, position: { x: 0, y: 0 }, data: {} },
      ]

      const connection: Connection = {
        source: 'nodeB',
        target: 'nodeA',
        sourceHandle: null,
        targetHandle: null,
      }

      expect(isValidConnection(connection, nodesWithPath, configWithPath)).toBe(false)
    })

    it('should reject circular connection through multiple hops (A->B->C exists, trying C->A)', () => {
      const configWithPath: WorkflowConfiguration = {
        states: [
          ...config.states,
          { id: 'nodeA', _meta: { type: NodeTypes.ASSISTANT }, next: { state_id: 'nodeB' } },
          { id: 'nodeB', _meta: { type: NodeTypes.ASSISTANT }, next: { state_id: 'nodeC' } },
          { id: 'nodeC', _meta: { type: NodeTypes.ASSISTANT }, next: {} },
        ],
      }

      const nodesWithPath = [
        ...nodes,
        { id: 'nodeA', type: NodeTypes.ASSISTANT, position: { x: 0, y: 0 }, data: {} },
        { id: 'nodeB', type: NodeTypes.ASSISTANT, position: { x: 0, y: 0 }, data: {} },
        { id: 'nodeC', type: NodeTypes.ASSISTANT, position: { x: 0, y: 0 }, data: {} },
      ]

      const connection: Connection = {
        source: 'nodeC',
        target: 'nodeA',
        sourceHandle: null,
        targetHandle: null,
      }

      expect(isValidConnection(connection, nodesWithPath, configWithPath)).toBe(false)
    })

    it('should show circular connection error message when showError is true', () => {
      const configWithPath: WorkflowConfiguration = {
        states: [
          ...config.states,
          { id: 'nodeA', _meta: { type: NodeTypes.ASSISTANT }, next: { state_id: 'nodeB' } },
          { id: 'nodeB', _meta: { type: NodeTypes.ASSISTANT }, next: {} },
        ],
      }

      const nodesWithPath = [
        ...nodes,
        { id: 'nodeA', type: NodeTypes.ASSISTANT, position: { x: 0, y: 0 }, data: {} },
        { id: 'nodeB', type: NodeTypes.ASSISTANT, position: { x: 0, y: 0 }, data: {} },
      ]

      const connection: Connection = {
        source: 'nodeB',
        target: 'nodeA',
        sourceHandle: null,
        targetHandle: null,
      }

      isValidConnection(connection, nodesWithPath, configWithPath, true)

      expect(toaster.error).toHaveBeenCalledWith(
        'Cannot create circular connection: target node already connects back to source'
      )
    })
  })

  describe('error messages', () => {
    it('should show error message when showError is true and connection is invalid', () => {
      const connection: Connection = {
        source: 'assistant1',
        target: 'assistant1',
        sourceHandle: null,
        targetHandle: null,
      }

      isValidConnection(connection, nodes, config, true)

      expect(toaster.error).toHaveBeenCalledWith('Cannot connect a node to itself')
    })

    it('should not show error message when showError is false', () => {
      const connection: Connection = {
        source: 'assistant1',
        target: 'assistant1',
        sourceHandle: null,
        targetHandle: null,
      }

      isValidConnection(connection, nodes, config, false)

      expect(toaster.error).not.toHaveBeenCalled()
    })

    it('should show iterator multiple parents error', () => {
      const nodesWithIterator = [
        ...nodes,
        { id: 'iterator1', type: NodeTypes.ITERATOR, position: { x: 0, y: 0 }, data: {} },
        {
          id: 'child1',
          type: NodeTypes.ASSISTANT,
          position: { x: 0, y: 0 },
          data: {},
          parentId: 'iterator1',
        },
      ]

      const configWithIterator: WorkflowConfiguration = {
        states: [
          ...config.states,
          { id: 'iterator1', _meta: { type: NodeTypes.ITERATOR }, next: {} },
          {
            id: 'child1',
            _meta: { type: NodeTypes.ASSISTANT },
            next: { meta_iter_state_id: 'iterator1' },
          },
          {
            id: 'parent1',
            _meta: { type: NodeTypes.ASSISTANT },
            next: { state_id: 'child1' },
          },
        ],
      }

      const connection: Connection = {
        source: 'assistant2',
        target: 'child1',
        sourceHandle: null,
        targetHandle: null,
      }

      isValidConnection(connection, nodesWithIterator, configWithIterator, true)

      expect(toaster.error).toHaveBeenCalledWith(
        'Cannot connect to a node that is in an iterator and already has a parent'
      )
    })

    it('should show error for end node as source', () => {
      const connection: Connection = {
        source: 'end',
        target: 'assistant1',
        sourceHandle: null,
        targetHandle: null,
      }

      isValidConnection(connection, nodes, config, true)

      expect(toaster.error).toHaveBeenCalledWith('End node cannot have outgoing connections')
    })

    it('should show error for start node as target', () => {
      const connection: Connection = {
        source: 'assistant1',
        target: 'start',
        sourceHandle: null,
        targetHandle: null,
      }

      isValidConnection(connection, nodes, config, true)

      expect(toaster.error).toHaveBeenCalledWith('Start node cannot be a connection target')
    })

    it('should show error for start to non-execution node', () => {
      const connection: Connection = {
        source: 'start',
        target: 'conditional1',
        sourceHandle: null,
        targetHandle: null,
      }

      isValidConnection(connection, nodes, config, true)

      expect(toaster.error).toHaveBeenCalledWith('Start nodes can only connect to execution nodes')
    })
  })

  describe('edge cases', () => {
    it('should handle empty states array', () => {
      const emptyConfig: WorkflowConfiguration = { states: [] }
      const connection: Connection = {
        source: 'assistant1',
        target: 'assistant2',
        sourceHandle: null,
        targetHandle: null,
      }

      expect(isValidConnection(connection, nodes, emptyConfig)).toBe(true)
    })

    it('should handle config without states', () => {
      const noStatesConfig: WorkflowConfiguration = { states: [] }
      const connection: Connection = {
        source: 'assistant1',
        target: 'assistant2',
        sourceHandle: null,
        targetHandle: null,
      }

      expect(isValidConnection(connection, nodes, noStatesConfig)).toBe(true)
    })

    it('should handle node without next property', () => {
      const configWithoutNext: WorkflowConfiguration = {
        states: [{ id: 'assistant1', _meta: { type: NodeTypes.ASSISTANT } }],
      }
      const connection: Connection = {
        source: 'start',
        target: 'assistant1',
        sourceHandle: null,
        targetHandle: null,
      }

      expect(isValidConnection(connection, nodes, configWithoutNext)).toBe(true)
    })
  })
})
