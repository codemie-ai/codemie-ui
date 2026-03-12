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
import { describe, it, expect, beforeEach } from 'vitest'

import { NodeTypes } from '@/types/workflowEditor/base'
import { WorkflowConfiguration, StateConfiguration } from '@/types/workflowEditor/configuration'
import { START_NODE_ID, END_NODE_ID } from '@/utils/workflowEditor/constants'

import { createConnectionAction } from '../createConnection'

describe('createConnectionAction', () => {
  let baseConfig: WorkflowConfiguration

  beforeEach(() => {
    baseConfig = {
      assistants: [],
      states: [
        {
          id: START_NODE_ID,
          _meta: {
            type: NodeTypes.START,
            is_connected: true,
            data: {},
          },
        },
        {
          id: END_NODE_ID,
          _meta: {
            type: NodeTypes.END,
            is_connected: false,
            data: {},
          },
        },
        {
          id: 'state1',
          assistant_id: 'assistant1',
          task: 'Task 1',
          next: { state_id: '' },
          _meta: {
            type: NodeTypes.ASSISTANT,
            is_connected: false,
            data: {},
          },
        },
        {
          id: 'state2',
          assistant_id: 'assistant2',
          task: 'Task 2',
          next: { state_id: '' },
          _meta: {
            type: NodeTypes.ASSISTANT,
            is_connected: false,
            data: {},
          },
        },
        {
          id: 'state3',
          assistant_id: 'assistant3',
          task: 'Task 3',
          next: { state_id: '' },
          _meta: {
            type: NodeTypes.ASSISTANT,
            is_connected: false,
            data: {},
          },
        },
      ] as StateConfiguration[],
      retry_policy: {},
    }
  })

  describe('validation', () => {
    it('returns unchanged config when source state not found', () => {
      const connection: Connection = {
        source: 'nonexistent',
        target: 'state1',
        sourceHandle: null,
        targetHandle: null,
      }

      const result = createConnectionAction(connection, baseConfig)

      expect(result.config).toEqual(baseConfig)
    })

    it('returns unchanged config when target state not found', () => {
      const connection: Connection = {
        source: 'state1',
        target: 'nonexistent',
        sourceHandle: null,
        targetHandle: null,
      }

      const result = createConnectionAction(connection, baseConfig)

      expect(result.config).toEqual(baseConfig)
    })

    it('prevents meta to meta connections (except to END)', () => {
      baseConfig.states.push(
        {
          id: 'condition1',
          _meta: {
            type: NodeTypes.CONDITIONAL,
            is_connected: false,
            data: {
              next: {
                condition: {
                  then: '', // nosonar
                  otherwise: '',
                },
              },
            },
          },
        } as StateConfiguration,
        {
          id: 'switch1',
          _meta: {
            type: NodeTypes.SWITCH,
            is_connected: false,
            data: {
              next: {
                switch: {
                  cases: [],
                  default: '',
                },
              },
            },
          },
        } as StateConfiguration
      )

      const connection: Connection = {
        source: 'condition1',
        target: 'switch1',
        sourceHandle: null,
        targetHandle: null,
      }

      const result = createConnectionAction(connection, baseConfig)

      expect(result.config).toEqual(baseConfig)
    })
  })

  describe('START node connections', () => {
    it('creates connection from START to regular state', () => {
      const connection: Connection = {
        source: START_NODE_ID,
        target: 'state1',
        sourceHandle: null,
        targetHandle: null,
      }

      const result = createConnectionAction(connection, baseConfig)

      const state1 = result.config.states.find((s) => s.id === 'state1')
      expect(state1?._meta?.is_connected).toBe(true)
    })

    it('marks all reachable states as connected when connecting from START', () => {
      // Setup: state1 -> state2 -> state3
      baseConfig.states = baseConfig.states.map((state) => {
        if (state.id === 'state1') {
          return { ...state, next: { state_id: 'state2' } }
        }
        if (state.id === 'state2') {
          return { ...state, next: { state_id: 'state3' } }
        }
        return state
      })

      const connection: Connection = {
        source: START_NODE_ID,
        target: 'state1',
        sourceHandle: null,
        targetHandle: null,
      }

      const result = createConnectionAction(connection, baseConfig)

      const state1 = result.config.states.find((s) => s.id === 'state1')
      const state2 = result.config.states.find((s) => s.id === 'state2')
      const state3 = result.config.states.find((s) => s.id === 'state3')

      expect(state1?._meta?.is_connected).toBe(true)
      expect(state2?._meta?.is_connected).toBe(true)
      expect(state3?._meta?.is_connected).toBe(true)
    })

    it('sorts states so target state is first when connecting from START', () => {
      const connection: Connection = {
        source: START_NODE_ID,
        target: 'state2',
        sourceHandle: null,
        targetHandle: null,
      }

      const result = createConnectionAction(connection, baseConfig)

      // Check that state2 is now the first regular state (after START and END meta nodes)
      const regularStates = result.config.states.filter(
        (s) => s.id !== START_NODE_ID && s.id !== END_NODE_ID
      )

      expect(regularStates[0].id).toBe('state2')
      expect(regularStates.length).toBe(3)
    })

    it('maintains state order for non-target states when connecting from START', () => {
      // Initial order: START, END, state1, state2, state3
      const connection: Connection = {
        source: START_NODE_ID,
        target: 'state3',
        sourceHandle: null,
        targetHandle: null,
      }

      const result = createConnectionAction(connection, baseConfig)

      const regularStates = result.config.states.filter(
        (s) => s.id !== START_NODE_ID && s.id !== END_NODE_ID
      )

      // state3 should be first, followed by state1 and state2 in original order
      expect(regularStates[0].id).toBe('state3')
      expect(regularStates[1].id).toBe('state1')
      expect(regularStates[2].id).toBe('state2')
    })

    it('preserves all state data when sorting on START connection', () => {
      const connection: Connection = {
        source: START_NODE_ID,
        target: 'state2',
        sourceHandle: null,
        targetHandle: null,
      }

      const originalState2 = baseConfig.states.find((s) => s.id === 'state2')!

      const result = createConnectionAction(connection, baseConfig)

      const resultState2 = result.config.states.find((s) => s.id === 'state2')!

      // Check that all properties are preserved (except is_connected which is updated)
      expect(resultState2.id).toBe(originalState2.id)
      expect(resultState2.next).toEqual(originalState2.next)
      expect(resultState2._meta?.type).toBe(originalState2._meta?.type)
      expect(resultState2._meta?.is_connected).toBe(true) // Should be updated to true
    })
  })

  describe('direct connections (regular to regular)', () => {
    it('creates connection when next.state_id is empty', () => {
      const connection: Connection = {
        source: 'state1',
        target: 'state2',
        sourceHandle: null,
        targetHandle: null,
      }

      const result = createConnectionAction(connection, baseConfig)

      const state1 = result.config.states.find((s) => s.id === 'state1')
      expect(state1?.next?.state_id).toBe('state2')
    })

    it('converts single state_id to state_ids array when adding second target', () => {
      baseConfig.states = baseConfig.states.map((state) => {
        if (state.id === 'state1') {
          return { ...state, next: { state_id: 'state2' } }
        }
        return state
      })

      const connection: Connection = {
        source: 'state1',
        target: 'state3',
        sourceHandle: null,
        targetHandle: null,
      }

      const result = createConnectionAction(connection, baseConfig)

      const state1 = result.config.states.find((s) => s.id === 'state1')
      expect(state1?.next?.state_ids).toEqual(['state2', 'state3'])
      expect(state1?.next?.state_id).toBeUndefined()
    })

    it('appends to existing state_ids array', () => {
      baseConfig.states = baseConfig.states.map((state) => {
        if (state.id === 'state1') {
          return { ...state, next: { state_ids: ['state2'] } }
        }
        return state
      })

      const connection: Connection = {
        source: 'state1',
        target: 'state3',
        sourceHandle: null,
        targetHandle: null,
      }

      const result = createConnectionAction(connection, baseConfig)

      const state1 = result.config.states.find((s) => s.id === 'state1')
      expect(state1?.next?.state_ids).toEqual(['state2', 'state3'])
    })

    it('preserves iter_key and meta_iter_state_id when creating connection', () => {
      baseConfig.states = baseConfig.states.map((state) => {
        if (state.id === 'state1') {
          return {
            ...state,
            next: {
              state_id: '',
              iter_key: 'items',
              meta_iter_state_id: 'iterator1',
            },
          }
        }
        return state
      })

      const connection: Connection = {
        source: 'state1',
        target: 'state2',
        sourceHandle: null,
        targetHandle: null,
      }

      const result = createConnectionAction(connection, baseConfig)

      const state1 = result.config.states.find((s) => s.id === 'state1')
      expect(state1?.next?.state_id).toBe('state2')
      expect(state1?.next?.iter_key).toBe('items')
      expect(state1?.next?.meta_iter_state_id).toBe('iterator1')
    })

    it('creates next object when state has no next', () => {
      baseConfig.states = baseConfig.states.map((state) => {
        if (state.id === 'state1') {
          const { next: _, ...rest } = state
          return rest as StateConfiguration
        }
        return state
      })

      const connection: Connection = {
        source: 'state1',
        target: 'state2',
        sourceHandle: null,
        targetHandle: null,
      }

      const result = createConnectionAction(connection, baseConfig)

      const state1 = result.config.states.find((s) => s.id === 'state1')
      expect(state1?.next?.state_id).toBe('state2')
    })

    it('allows connection to END node', () => {
      const connection: Connection = {
        source: 'state1',
        target: END_NODE_ID,
        sourceHandle: null,
        targetHandle: null,
      }

      const result = createConnectionAction(connection, baseConfig)

      const state1 = result.config.states.find((s) => s.id === 'state1')
      expect(state1?.next?.state_id).toBe(END_NODE_ID)
    })
  })

  describe('connections to decision nodes (CONDITION/SWITCH)', () => {
    beforeEach(() => {
      baseConfig.states.push({
        id: 'condition1',
        _meta: {
          type: NodeTypes.CONDITIONAL,
          is_connected: false,
          data: {
            next: {
              condition: {
                then: '', // nosonar
                otherwise: '',
              },
            },
          },
        },
      } as StateConfiguration)
    })

    it('links decision node to source by copying decision logic', () => {
      const connection: Connection = {
        source: 'state1',
        target: 'condition1',
        sourceHandle: null,
        targetHandle: null,
      }

      const result = createConnectionAction(connection, baseConfig)

      const state1 = result.config.states.find((s) => s.id === 'state1')
      expect(state1?.next?.condition).toEqual({
        then: '', // nosonar
        otherwise: '',
      })
      expect(state1?.next?.meta_next_state_id).toBe('condition1')
    })

    it('clears old parent link when decision node is linked to another node', () => {
      baseConfig.states = baseConfig.states.map((state) => {
        if (state.id === 'state2') {
          return {
            ...state,
            next: {
              condition: {
                then: '', // nosonar
                otherwise: '',
              },
              meta_next_state_id: 'condition1',
            },
          } as StateConfiguration
        }
        return state
      })

      const connection: Connection = {
        source: 'state1',
        target: 'condition1',
        sourceHandle: null,
        targetHandle: null,
      }

      const result = createConnectionAction(connection, baseConfig)

      const state1 = result.config.states.find((s) => s.id === 'state1')
      const state2 = result.config.states.find((s) => s.id === 'state2')

      expect(state1?.next?.meta_next_state_id).toBe('condition1')
      expect(state2?.next?.state_id).toBe('')
      expect(state2?.next?.condition).toBeUndefined()
      expect(state2?.next?.meta_next_state_id).toBeUndefined()
    })
  })

  describe('connections from decision nodes (CONDITION/SWITCH)', () => {
    beforeEach(() => {
      // Add a condition meta node linked to state1
      baseConfig.states.push({
        id: 'condition1',
        _meta: {
          type: NodeTypes.CONDITIONAL,
          is_connected: false,
          data: {
            next: {
              condition: {
                expression: 'test',
                then: '', // nosonar
                otherwise: '',
              },
            },
          },
        },
      } as StateConfiguration)

      baseConfig.states = baseConfig.states.map((state) => {
        if (state.id === 'state1') {
          return {
            ...state,
            next: {
              condition: {
                expression: 'test',
                then: '', // nosonar
                otherwise: '',
              },
              meta_next_state_id: 'condition1',
            },
          }
        }
        return state
      })
    })

    it('updates both meta node and parent when connecting from condition then handle', () => {
      const connection: Connection = {
        source: 'condition1',
        target: 'state2',
        sourceHandle: 'then',
        targetHandle: null,
      }

      const result = createConnectionAction(connection, baseConfig)

      const state1 = result.config.states.find((s) => s.id === 'state1')
      const condition1 = result.config.states.find((s) => s.id === 'condition1')

      // Both parent and meta node should be updated
      expect(state1?.next?.condition?.then).toBe('state2')
      expect(state1?.next?.condition?.otherwise).toBe('')
      expect(condition1?._meta?.data?.next?.condition?.then).toBe('state2')
      expect(condition1?._meta?.data?.next?.condition?.otherwise).toBe('')
    })

    it('updates both meta node and parent when connecting from condition otherwise handle', () => {
      const connection: Connection = {
        source: 'condition1',
        target: 'state3',
        sourceHandle: 'otherwise',
        targetHandle: null,
      }

      const result = createConnectionAction(connection, baseConfig)

      const state1 = result.config.states.find((s) => s.id === 'state1')
      const condition1 = result.config.states.find((s) => s.id === 'condition1')

      // Both parent and meta node should be updated
      expect(state1?.next?.condition?.then).toBe('')
      expect(state1?.next?.condition?.otherwise).toBe('state3')
      expect(condition1?._meta?.data?.next?.condition?.then).toBe('')
      expect(condition1?._meta?.data?.next?.condition?.otherwise).toBe('state3')
    })
  })

  describe('connectivity propagation', () => {
    it('propagates connectivity when connecting from connected state', () => {
      // Mark state1 as connected
      baseConfig.states = baseConfig.states.map((state) => {
        if (state.id === 'state1') {
          return {
            ...state,
            _meta: {
              ...state._meta,
              is_connected: true,
            },
          } as StateConfiguration
        }
        return state
      })

      const connection: Connection = {
        source: 'state1',
        target: 'state2',
        sourceHandle: null,
        targetHandle: null,
      }

      const result = createConnectionAction(connection, baseConfig)

      const state2 = result.config.states.find((s) => s.id === 'state2')
      expect(state2?._meta?.is_connected).toBe(true)
    })

    it('propagates connectivity through multiple states', () => {
      baseConfig.states = baseConfig.states.map((state) => {
        if (state.id === 'state1') {
          return {
            ...state,
            _meta: {
              ...state._meta,
              is_connected: true,
            },
          } as StateConfiguration
        }
        if (state.id === 'state2') {
          return { ...state, next: { state_id: 'state3' } }
        }
        return state
      })

      const connection: Connection = {
        source: 'state1',
        target: 'state2',
        sourceHandle: null,
        targetHandle: null,
      }

      const result = createConnectionAction(connection, baseConfig)

      const state2 = result.config.states.find((s) => s.id === 'state2')
      const state3 = result.config.states.find((s) => s.id === 'state3')

      expect(state2?._meta?.is_connected).toBe(true)
      expect(state3?._meta?.is_connected).toBe(true)
    })

    it('does not propagate connectivity when source is not connected', () => {
      const connection: Connection = {
        source: 'state1',
        target: 'state2',
        sourceHandle: null,
        targetHandle: null,
      }

      const result = createConnectionAction(connection, baseConfig)

      const state2 = result.config.states.find((s) => s.id === 'state2')
      expect(state2?._meta?.is_connected).toBe(false)
    })
  })

  describe('switch node connections', () => {
    beforeEach(() => {
      baseConfig.states.push({
        id: 'switch1',
        _meta: {
          type: NodeTypes.SWITCH,
          is_connected: false,
          data: {
            next: {
              switch: {
                cases: [
                  { condition: 'value == 1', state_id: '' },
                  { condition: 'value == 2', state_id: '' },
                ],
                default: '',
              },
            },
          },
        },
      } as StateConfiguration)

      // Link switch to state1
      baseConfig.states = baseConfig.states.map((state) => {
        if (state.id === 'state1') {
          return {
            ...state,
            next: {
              switch: {
                cases: [
                  { condition: 'value == 1', state_id: '' },
                  { condition: 'value == 2', state_id: '' },
                ],
                default: '',
              },
              meta_next_state_id: 'switch1',
            },
          }
        }
        return state
      })
    })

    it('connects to switch node from regular state', () => {
      const connection: Connection = {
        source: 'state2',
        target: 'switch1',
        sourceHandle: null,
        targetHandle: null,
      }

      const result = createConnectionAction(connection, baseConfig)

      const state2 = result.config.states.find((s) => s.id === 'state2')
      expect(state2?.next?.switch).toBeDefined()
      expect(state2?.next?.meta_next_state_id).toBe('switch1')
    })

    it('updates switch case handle', () => {
      const connection: Connection = {
        source: 'switch1',
        target: 'state2',
        sourceHandle: 'condition_0',
        targetHandle: null,
      }

      const result = createConnectionAction(connection, baseConfig)

      const state1 = result.config.states.find((s) => s.id === 'state1')
      const switch1 = result.config.states.find((s) => s.id === 'switch1')

      expect(state1?.next?.switch?.cases?.[0]?.state_id).toBe('state2')
      expect(switch1?._meta?.data?.next?.switch?.cases?.[0]?.state_id).toBe('state2')
    })

    it('updates switch default handle', () => {
      const connection: Connection = {
        source: 'switch1',
        target: 'state3',
        sourceHandle: 'condition_default',
        targetHandle: null,
      }

      const result = createConnectionAction(connection, baseConfig)

      const state1 = result.config.states.find((s) => s.id === 'state1')
      const switch1 = result.config.states.find((s) => s.id === 'switch1')

      expect(state1?.next?.switch?.default).toBe('state3')
      expect(switch1?._meta?.data?.next?.switch?.default).toBe('state3')
    })
  })

  describe('edge cases', () => {
    it('handles empty states array', () => {
      const emptyConfig: WorkflowConfiguration = {
        assistants: [],
        states: [],
        retry_policy: {},
      }

      const connection: Connection = {
        source: 'state1',
        target: 'state2',
        sourceHandle: null,
        targetHandle: null,
      }

      const result = createConnectionAction(connection, emptyConfig)

      expect(result.config).toEqual(emptyConfig)
    })

    it('does not mutate input config', () => {
      const originalConfig = structuredClone(baseConfig)

      const connection: Connection = {
        source: 'state1',
        target: 'state2',
        sourceHandle: null,
        targetHandle: null,
      }

      createConnectionAction(connection, baseConfig)

      expect(baseConfig).toEqual(originalConfig)
    })
  })
})
