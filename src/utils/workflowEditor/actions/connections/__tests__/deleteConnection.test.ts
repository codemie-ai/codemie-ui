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

import { describe, it, expect, beforeEach } from 'vitest'

import { NodeTypes } from '@/types/workflowEditor/base'
import { WorkflowConfiguration, StateConfiguration } from '@/types/workflowEditor/configuration'
import { START_NODE_ID, END_NODE_ID } from '@/utils/workflowEditor/constants'

import { deleteConnectionAction } from '../deleteConnection'

describe('deleteConnectionAction', () => {
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
      const result = deleteConnectionAction('nonexistent', 'state1', null, baseConfig)
      expect(result.config).toEqual(baseConfig)
    })
  })

  describe('START node disconnection', () => {
    beforeEach(() => {
      baseConfig.states = baseConfig.states.map((state) => {
        if (state.id === 'state1' || state.id === 'state2' || state.id === 'state3') {
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
    })

    it('marks all regular nodes as disconnected when deleting START connection', () => {
      const result = deleteConnectionAction(START_NODE_ID, 'state1', null, baseConfig)

      const state1 = result.config.states.find((s) => s.id === 'state1')
      const state2 = result.config.states.find((s) => s.id === 'state2')
      const state3 = result.config.states.find((s) => s.id === 'state3')

      expect(state1?._meta?.is_connected).toBe(false)
      expect(state2?._meta?.is_connected).toBe(false)
      expect(state3?._meta?.is_connected).toBe(false)
    })

    it('preserves meta nodes when deleting START connection', () => {
      const result = deleteConnectionAction(START_NODE_ID, 'state1', null, baseConfig)

      const startNode = result.config.states.find((s) => s.id === START_NODE_ID)
      const endNode = result.config.states.find((s) => s.id === END_NODE_ID)

      expect(startNode?._meta?.is_connected).toBe(true)
      expect(endNode?._meta?.is_connected).toBe(false)
    })
  })

  describe('direct connections (regular to regular)', () => {
    it('clears single state_id connection', () => {
      baseConfig.states = baseConfig.states.map((state) => {
        if (state.id === 'state1') {
          return { ...state, next: { state_id: 'state2' } }
        }
        return state
      })

      const result = deleteConnectionAction('state1', 'state2', null, baseConfig)

      const state1 = result.config.states.find((s) => s.id === 'state1')
      expect(state1?.next?.state_id).toBe('')
    })

    it('removes target from state_ids array and converts to state_id when only one remains', () => {
      baseConfig.states = baseConfig.states.map((state) => {
        if (state.id === 'state1') {
          return { ...state, next: { state_ids: ['state2', 'state3'] } }
        }
        return state
      })

      const result = deleteConnectionAction('state1', 'state2', null, baseConfig)

      const state1 = result.config.states.find((s) => s.id === 'state1')
      expect(state1?.next?.state_id).toBe('state3')
      expect(state1?.next?.state_ids).toBeUndefined()
    })

    it('removes last target from state_ids array', () => {
      baseConfig.states = baseConfig.states.map((state) => {
        if (state.id === 'state1') {
          return { ...state, next: { state_ids: ['state2'] } }
        }
        return state
      })

      const result = deleteConnectionAction('state1', 'state2', null, baseConfig)

      const state1 = result.config.states.find((s) => s.id === 'state1')
      expect(state1?.next?.state_ids).toEqual([])
    })

    it('removes iter_key when deleting connection leaves no children', () => {
      baseConfig.states = baseConfig.states.map((state) => {
        if (state.id === 'state1') {
          return {
            ...state,
            next: {
              state_id: 'state2',
              iter_key: 'items',
              meta_iter_state_id: 'iterator1',
            },
          }
        }
        return state
      })

      const result = deleteConnectionAction('state1', 'state2', null, baseConfig)

      const state1 = result.config.states.find((s) => s.id === 'state1')
      expect(state1?.next?.state_id).toBe('')
      expect(state1?.next?.iter_key).toBeUndefined()
      expect(state1?.next?.meta_iter_state_id).toBe('iterator1')
    })
  })

  describe('connections to decision nodes', () => {
    beforeEach(() => {
      // Add a condition meta node
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

      // Link condition to state1
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

    it('clears decision link when deleting connection to decision node', () => {
      const result = deleteConnectionAction('state1', 'condition1', null, baseConfig)

      const state1 = result.config.states.find((s) => s.id === 'state1')
      expect(state1?.next?.state_id).toBe('')
      expect(state1?.next?.condition).toBeUndefined()
      expect(state1?.next?.meta_next_state_id).toBeUndefined()
    })

    it('removes iter_key when deleting to decision node leaves no children', () => {
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
              iter_key: 'items',
              meta_iter_state_id: 'iterator1',
            },
          }
        }
        return state
      })

      const result = deleteConnectionAction('state1', 'condition1', null, baseConfig)

      const state1 = result.config.states.find((s) => s.id === 'state1')
      expect(state1?.next?.state_id).toBe('')
      expect(state1?.next?.iter_key).toBeUndefined()
      expect(state1?.next?.meta_iter_state_id).toBe('iterator1')
    })
  })

  describe('connections from decision nodes', () => {
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
                then: 'state2', // nosonar
                otherwise: 'state3',
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
                then: 'state2', // nosonar
                otherwise: 'state3',
              },
              meta_next_state_id: 'condition1',
            },
          }
        }
        return state
      })
    })

    it('clears then handle when deleting from condition node', () => {
      const result = deleteConnectionAction('condition1', 'state2', 'then', baseConfig)

      const state1 = result.config.states.find((s) => s.id === 'state1')
      const condition1 = result.config.states.find((s) => s.id === 'condition1')

      expect(state1?.next?.condition?.then).toBe('')
      expect(state1?.next?.condition?.otherwise).toBe('state3')
      expect(condition1?._meta?.data?.next?.condition?.then).toBe('')
      expect(condition1?._meta?.data?.next?.condition?.otherwise).toBe('state3')
    })

    it('clears otherwise handle when deleting from condition node', () => {
      const result = deleteConnectionAction('condition1', 'state3', 'otherwise', baseConfig)

      const state1 = result.config.states.find((s) => s.id === 'state1')
      const condition1 = result.config.states.find((s) => s.id === 'condition1')

      expect(state1?.next?.condition?.then).toBe('state2')
      expect(state1?.next?.condition?.otherwise).toBe('')
      expect(condition1?._meta?.data?.next?.condition?.then).toBe('state2')
      expect(condition1?._meta?.data?.next?.condition?.otherwise).toBe('')
    })
  })

  describe('switch node connections', () => {
    beforeEach(() => {
      // Add a switch meta node
      baseConfig.states.push({
        id: 'switch1',
        _meta: {
          type: NodeTypes.SWITCH,
          is_connected: false,
          data: {
            next: {
              switch: {
                cases: [
                  { condition: 'value == 1', state_id: 'state2' },
                  { condition: 'value == 2', state_id: 'state3' },
                ],
                default: END_NODE_ID,
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
                  { condition: 'value == 1', state_id: 'state2' },
                  { condition: 'value == 2', state_id: 'state3' },
                ],
                default: END_NODE_ID,
              },
              meta_next_state_id: 'switch1',
            },
          }
        }
        return state
      })
    })

    it('clears switch case handle when deleting from switch node', () => {
      const result = deleteConnectionAction('switch1', 'state2', 'condition_0', baseConfig)

      const state1 = result.config.states.find((s) => s.id === 'state1')
      const switch1 = result.config.states.find((s) => s.id === 'switch1')

      expect(state1?.next?.switch?.cases?.[0]?.state_id).toBe('')
      expect(state1?.next?.switch?.cases?.[1]?.state_id).toBe('state3')
      expect(switch1?._meta?.data?.next?.switch?.cases?.[0]?.state_id).toBe('')
      expect(switch1?._meta?.data?.next?.switch?.cases?.[1]?.state_id).toBe('state3')
    })

    it('clears switch default handle when deleting from switch node', () => {
      const result = deleteConnectionAction('switch1', END_NODE_ID, 'condition_default', baseConfig)

      const state1 = result.config.states.find((s) => s.id === 'state1')
      const switch1 = result.config.states.find((s) => s.id === 'switch1')

      expect(state1?.next?.switch?.default).toBe('')
      expect(state1?.next?.switch?.cases?.[0]?.state_id).toBe('state2')
      expect(state1?.next?.switch?.cases?.[1]?.state_id).toBe('state3')
      expect(switch1?._meta?.data?.next?.switch?.default).toBe('')
    })

    it('deletes connection TO switch node', () => {
      const result = deleteConnectionAction('state1', 'switch1', null, baseConfig)

      const state1 = result.config.states.find((s) => s.id === 'state1')
      expect(state1?.next?.state_id).toBe('')
      expect(state1?.next?.switch).toBeUndefined()
      expect(state1?.next?.meta_next_state_id).toBeUndefined()
    })
  })

  describe('iterator cleanup', () => {
    it('removes meta_iter_state_id from target node', () => {
      baseConfig.states = baseConfig.states.map((state) => {
        if (state.id === 'state1') {
          return { ...state, next: { state_id: 'state2' } }
        }
        if (state.id === 'state2') {
          return { ...state, next: { meta_iter_state_id: 'iterator1' } }
        }
        return state
      })

      const result = deleteConnectionAction('state1', 'state2', null, baseConfig)

      const state2 = result.config.states.find((s) => s.id === 'state2')
      expect(state2?.next?.meta_iter_state_id).toBeUndefined()
    })

    it('removes iter_key from source when no children remain (single child)', () => {
      baseConfig.states = baseConfig.states.map((state) => {
        if (state.id === 'state1') {
          return {
            ...state,
            next: {
              state_id: 'state2',
              iter_key: 'items',
            },
          }
        }
        return state
      })

      const result = deleteConnectionAction('state1', 'state2', null, baseConfig)

      const state1 = result.config.states.find((s) => s.id === 'state1')
      expect(state1?.next?.iter_key).toBeUndefined()
      expect(state1?.next?.state_id).toBe('')
    })

    it('removes iter_key from source when last child removed from state_ids', () => {
      baseConfig.states = baseConfig.states.map((state) => {
        if (state.id === 'state1') {
          return {
            ...state,
            next: {
              state_ids: ['state2'],
              iter_key: 'items',
            },
          }
        }
        return state
      })

      const result = deleteConnectionAction('state1', 'state2', null, baseConfig)

      const state1 = result.config.states.find((s) => s.id === 'state1')
      expect(state1?.next?.iter_key).toBeUndefined()
      expect(state1?.next?.state_ids).toEqual([])
    })

    it('preserves iter_key when target has no meta_iter_state_id', () => {
      baseConfig.states = baseConfig.states.map((state) => {
        if (state.id === 'state1') {
          return {
            ...state,
            next: {
              state_ids: ['state2', 'state3'],
              iter_key: 'items',
            },
          }
        }
        return state
      })

      const result = deleteConnectionAction('state1', 'state2', null, baseConfig)

      const state1 = result.config.states.find((s) => s.id === 'state1')
      expect(state1?.next?.state_id).toBe('state3')
      expect(state1?.next?.state_ids).toBeUndefined()
    })

    it('does not remove iter_key from meta nodes', () => {
      // Add a condition meta node
      baseConfig.states.push({
        id: 'condition1',
        _meta: {
          type: NodeTypes.CONDITIONAL,
          is_connected: false,
          data: {
            next: {
              condition: {
                expression: 'test',
                then: 'state2', // nosonar
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
                then: 'state2', // nosonar
                otherwise: '',
              },
              meta_next_state_id: 'condition1',
              iter_key: 'items',
            },
          }
        }
        return state
      })

      const result = deleteConnectionAction('condition1', 'state2', 'then', baseConfig)

      const state1 = result.config.states.find((s) => s.id === 'state1')
      expect(state1?.next?.iter_key).toBe('items')
    })

    it('removes both meta_iter_state_id from target and iter_key from source', () => {
      baseConfig.states = baseConfig.states.map((state) => {
        if (state.id === 'state1') {
          return {
            ...state,
            next: {
              state_id: 'state2',
              iter_key: 'items',
            },
          }
        }
        if (state.id === 'state2') {
          return {
            ...state,
            next: { meta_iter_state_id: 'iterator1' },
          }
        }
        return state
      })

      const result = deleteConnectionAction('state1', 'state2', null, baseConfig)

      const state1 = result.config.states.find((s) => s.id === 'state1')
      const state2 = result.config.states.find((s) => s.id === 'state2')

      expect(state1?.next?.iter_key).toBeUndefined()
      expect(state2?.next?.meta_iter_state_id).toBeUndefined()
    })
  })

  describe('edge cases', () => {
    it('handles empty states array', () => {
      const emptyConfig: WorkflowConfiguration = {
        assistants: [],
        states: [],
        retry_policy: {},
      }

      const result = deleteConnectionAction('state1', 'state2', null, emptyConfig)
      expect(result.config).toEqual(emptyConfig)
    })

    it('does not mutate input config', () => {
      baseConfig.states = baseConfig.states.map((state) => {
        if (state.id === 'state1') {
          return { ...state, next: { state_id: 'state2' } }
        }
        return state
      })

      const originalConfig = structuredClone(baseConfig)

      deleteConnectionAction('state1', 'state2', null, baseConfig)

      expect(baseConfig).toEqual(originalConfig)
    })

    it('handles deletion with undefined sourceHandle', () => {
      baseConfig.states = baseConfig.states.map((state) => {
        if (state.id === 'state1') {
          return { ...state, next: { state_id: 'state2' } }
        }
        return state
      })

      const result = deleteConnectionAction('state1', 'state2', undefined, baseConfig)

      const state1 = result.config.states.find((s) => s.id === 'state1')
      expect(state1?.next?.state_id).toBe('')
    })

    it('handles missing target state gracefully', () => {
      baseConfig.states = baseConfig.states.map((state) => {
        if (state.id === 'state1') {
          return { ...state, next: { state_id: 'state2' } }
        }
        return state
      })

      const result = deleteConnectionAction('state1', 'nonexistent', null, baseConfig)

      const state1 = result.config.states.find((s) => s.id === 'state1')
      expect(state1?.next?.state_id).toBe('')
    })
  })
})
