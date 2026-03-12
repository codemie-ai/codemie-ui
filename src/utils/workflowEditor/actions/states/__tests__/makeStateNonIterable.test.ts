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

import { describe, it, expect, beforeEach, vi } from 'vitest'

import {
  WorkflowConfiguration,
  StateConfiguration,
  AssistantStateConfiguration,
} from '@/types/workflowEditor/configuration'

import { makeStateNonIterableAction } from '../makeStateNonIterable'

describe('makeStateNonIterable', () => {
  let baseConfig: WorkflowConfiguration

  beforeEach(() => {
    baseConfig = {
      states: [
        {
          id: 'iterator_1',
          next: {},
          _meta: {
            type: 'iterator',
            is_connected: true,
            position: { x: 0, y: 0 },
            data: { iter_key: 'items' },
          },
        } as StateConfiguration,
        {
          id: 'state1',
          assistant_id: 'assistant1',
          task: 'Task 1',
          next: {
            meta_iter_state_id: 'iterator_1',
            iter_key: 'items',
          },
          _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
        } as StateConfiguration,
        {
          id: 'state2',
          assistant_id: 'assistant2',
          task: 'Task 2',
          next: {
            state_id: 'state3',
            meta_iter_state_id: 'iterator_1',
            iter_key: 'items',
          },
          _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
        } as StateConfiguration,
      ],
      assistants: [
        { id: 'assistant1', name: 'Assistant 1', model: 'gpt-4' },
        { id: 'assistant2', name: 'Assistant 2', model: 'gpt-4' },
      ],
    }
  })

  describe('basic functionality', () => {
    it('should remove meta_iter_state_id from state', () => {
      const result = makeStateNonIterableAction('state1', baseConfig)

      const updatedState = result.config.states.find((s) => s.id === 'state1')
      expect(updatedState?.next?.meta_iter_state_id).toBeUndefined()
    })

    it('should handle state with multiple next properties', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'state1',
            assistant_id: 'assistant1',
            next: {
              state_id: 'state2',
              output_key: 'result',
              include_in_llm_history: true,
              meta_iter_state_id: 'iterator_1',
              iter_key: 'items',
            },
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
        ],
        assistants: [{ id: 'assistant1', name: 'Test', model: 'gpt-4' }],
      }

      const result = makeStateNonIterableAction('state1', config)

      const updatedState = result.config.states.find((s) => s.id === 'state1')
      expect(updatedState?.next).toEqual({
        state_id: 'state2',
        output_key: 'result',
        include_in_llm_history: true,
      })
    })
  })

  describe('next object variations', () => {
    it('should handle state with only meta_iter_state_id', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'state1',
            assistant_id: 'assistant1',
            next: {
              meta_iter_state_id: 'iterator_1',
            },
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
        ],
        assistants: [{ id: 'assistant1', name: 'Test', model: 'gpt-4' }],
      }

      const result = makeStateNonIterableAction('state1', config)

      const updatedState = result.config.states.find((s) => s.id === 'state1')
      expect(updatedState?.next).toEqual({})
    })

    it('should handle state without next property', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'state1',
            assistant_id: 'assistant1',
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as AssistantStateConfiguration,
        ],
        assistants: [{ id: 'assistant1', name: 'Test', model: 'gpt-4' }],
      }

      const result = makeStateNonIterableAction('state1', config)

      const updatedState = result.config.states.find((s) => s.id === 'state1')
      expect(updatedState?.next).toEqual({})
    })

    it('should handle state with empty next object', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'state1',
            assistant_id: 'assistant1',
            next: {},
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
        ],
        assistants: [{ id: 'assistant1', name: 'Test', model: 'gpt-4' }],
      }

      const result = makeStateNonIterableAction('state1', config)

      const updatedState = result.config.states.find((s) => s.id === 'state1')
      expect(updatedState?.next).toEqual({})
    })
  })

  describe('preserving next properties', () => {
    it('should preserve state_id', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'state1',
            assistant_id: 'assistant1',
            next: {
              state_id: 'state2',
              meta_iter_state_id: 'iterator_1',
              iter_key: 'items',
            },
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
        ],
        assistants: [{ id: 'assistant1', name: 'Test', model: 'gpt-4' }],
      }

      const result = makeStateNonIterableAction('state1', config)

      const updatedState = result.config.states.find((s) => s.id === 'state1')
      expect(updatedState?.next?.state_id).toBe('state2')
    })

    it('should preserve state_ids array', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'state1',
            assistant_id: 'assistant1',
            next: {
              state_ids: ['state2', 'state3'],
              meta_iter_state_id: 'iterator_1',
              iter_key: 'items',
            },
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
        ],
        assistants: [{ id: 'assistant1', name: 'Test', model: 'gpt-4' }],
      }

      const result = makeStateNonIterableAction('state1', config)

      const updatedState = result.config.states.find((s) => s.id === 'state1')
      expect(updatedState?.next?.state_ids).toEqual(['state2', 'state3'])
    })

    it('should preserve output_key', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'state1',
            assistant_id: 'assistant1',
            next: {
              output_key: 'result',
              meta_iter_state_id: 'iterator_1',
              iter_key: 'items',
            },
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
        ],
        assistants: [{ id: 'assistant1', name: 'Test', model: 'gpt-4' }],
      }

      const result = makeStateNonIterableAction('state1', config)

      const updatedState = result.config.states.find((s) => s.id === 'state1')
      expect(updatedState?.next?.output_key).toBe('result')
    })

    it('should preserve condition', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'state1',
            assistant_id: 'assistant1',
            next: {
              condition: {
                expression: 'x > 0',
                then: 'state2', // nosonar
                otherwise: 'state3',
              },
              meta_iter_state_id: 'iterator_1',
              iter_key: 'items',
            },
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
        ],
        assistants: [{ id: 'assistant1', name: 'Test', model: 'gpt-4' }],
      }

      const result = makeStateNonIterableAction('state1', config)

      const updatedState = result.config.states.find((s) => s.id === 'state1')
      expect(updatedState?.next?.condition).toEqual({
        expression: 'x > 0',
        then: 'state2', // nosonar
        otherwise: 'state3',
      })
    })

    it('should preserve switch', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'state1',
            assistant_id: 'assistant1',
            next: {
              switch: {
                arg: 'type',
                cases: [{ condition: 'a', state_id: 'state2' }],
                default: 'state3',
              },
              meta_iter_state_id: 'iterator_1',
              iter_key: 'items',
            },
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as unknown as StateConfiguration,
        ],
        assistants: [{ id: 'assistant1', name: 'Test', model: 'gpt-4' }],
      }

      const result = makeStateNonIterableAction('state1', config)

      const updatedState = result.config.states.find((s) => s.id === 'state1')
      expect(updatedState?.next?.switch).toEqual({
        arg: 'type',
        cases: [{ condition: 'a', state_id: 'state2' }],
        default: 'state3',
      })
    })

    it('should preserve meta_next_state_id', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'state1',
            assistant_id: 'assistant1',
            next: {
              meta_next_state_id: 'conditional_1',
              meta_iter_state_id: 'iterator_1',
              iter_key: 'items',
            },
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
        ],
        assistants: [{ id: 'assistant1', name: 'Test', model: 'gpt-4' }],
      }

      const result = makeStateNonIterableAction('state1', config)

      const updatedState = result.config.states.find((s) => s.id === 'state1')
      expect(updatedState?.next?.meta_next_state_id).toBe('conditional_1')
    })

    it('should preserve all boolean flags', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'state1',
            assistant_id: 'assistant1',
            next: {
              include_in_llm_history: true,
              override_task: false,
              store_in_context: true,
              clear_prior_messages: false,
              clear_context_store: true,
              meta_iter_state_id: 'iterator_1',
              iter_key: 'items',
            },
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
        ],
        assistants: [{ id: 'assistant1', name: 'Test', model: 'gpt-4' }],
      }

      const result = makeStateNonIterableAction('state1', config)

      const updatedState = result.config.states.find((s) => s.id === 'state1')
      expect(updatedState?.next?.include_in_llm_history).toBe(true)
      expect(updatedState?.next?.override_task).toBe(false)
      expect(updatedState?.next?.store_in_context).toBe(true)
      expect(updatedState?.next?.clear_prior_messages).toBe(false)
      expect(updatedState?.next?.clear_context_store).toBe(true)
    })
  })

  describe('error handling', () => {
    it('should return unchanged config if state not found', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = makeStateNonIterableAction('nonexistent', baseConfig)

      expect(result.config).toEqual(baseConfig)
      expect(consoleWarnSpy).toHaveBeenCalledWith('State nonexistent not found')

      consoleWarnSpy.mockRestore()
    })

    it('should handle empty states array', () => {
      const config: WorkflowConfiguration = {
        states: [],
        assistants: [],
      }

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = makeStateNonIterableAction('state1', config)

      expect(result.config).toEqual(config)
      expect(consoleWarnSpy).toHaveBeenCalled()

      consoleWarnSpy.mockRestore()
    })

    it('should handle undefined states', () => {
      const config: WorkflowConfiguration = {
        assistants: [],
        states: [],
      }

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = makeStateNonIterableAction('state1', config)

      expect(result.config).toEqual(config)

      consoleWarnSpy.mockRestore()
    })
  })

  describe('multiple states', () => {
    it('should make multiple states non-iterable independently', () => {
      const result1 = makeStateNonIterableAction('state1', baseConfig)
      const result2 = makeStateNonIterableAction('state2', result1.config)

      const state1 = result2.config.states.find((s) => s.id === 'state1')
      const state2 = result2.config.states.find((s) => s.id === 'state2')

      expect(state1?.next?.meta_iter_state_id).toBeUndefined()
      expect(state2?.next?.meta_iter_state_id).toBeUndefined()
      expect(state1?.next?.iter_key).toBeUndefined()
      expect(state2?.next?.iter_key).toBeUndefined()
    })
  })

  describe('config preservation', () => {
    it('should preserve other states', () => {
      const result = makeStateNonIterableAction('state1', baseConfig)

      expect(result.config.states).toHaveLength(3)
      const iterator = result.config.states.find((s) => s.id === 'iterator_1')
      expect(iterator).toEqual(baseConfig.states[0])
    })

    it('should preserve other config properties', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'state1',
            assistant_id: 'assistant1',
            next: {
              meta_iter_state_id: 'iterator_1',
              iter_key: 'items',
            },
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
        ],
        assistants: [{ id: 'assistant1', name: 'Test', model: 'gpt-4' }],
        tools: [{ id: 'tool1', tool: 'some_tool' }],
        custom_nodes: [{ id: 'custom1', name: 'Custom' }],
      }

      const result = makeStateNonIterableAction('state1', config)

      expect(result.config.assistants).toEqual(config.assistants)
      expect(result.config.tools).toEqual(config.tools)
      expect(result.config.custom_nodes).toEqual(config.custom_nodes)
    })

    it('should not mutate original config', () => {
      const originalStates = structuredClone(baseConfig.states)

      makeStateNonIterableAction('state1', baseConfig)

      expect(baseConfig.states).toEqual(originalStates)
    })
  })

  describe('idempotency', () => {
    it('should be idempotent - running twice has same effect as once', () => {
      const result1 = makeStateNonIterableAction('state1', baseConfig)
      const result2 = makeStateNonIterableAction('state1', result1.config)

      expect(result2.config).toEqual(result1.config)
    })

    it('should handle already non-iterable state', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'state1',
            assistant_id: 'assistant1',
            next: {
              state_id: 'state2',
            },
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
        ],
        assistants: [{ id: 'assistant1', name: 'Test', model: 'gpt-4' }],
      }

      const result = makeStateNonIterableAction('state1', config)

      const updatedState = result.config.states.find((s) => s.id === 'state1')
      expect(updatedState?.next?.state_id).toBe('state2')
    })
  })

  describe('removing iter_key from parent states', () => {
    it('should remove iter_key from parent state that references the child', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'parent',
            assistant_id: 'assistant1',
            next: {
              state_id: 'child',
              iter_key: 'items',
            },
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
          {
            id: 'child',
            assistant_id: 'assistant2',
            next: {
              meta_iter_state_id: 'iterator_1',
            },
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
        ],
        assistants: [
          { id: 'assistant1', name: 'Test 1', model: 'gpt-4' },
          { id: 'assistant2', name: 'Test 2', model: 'gpt-4' },
        ],
      }

      const result = makeStateNonIterableAction('child', config)

      const parentState = result.config.states.find((s) => s.id === 'parent')
      expect(parentState?.next?.iter_key).toBeUndefined()
      expect(parentState?.next?.state_id).toBe('child') // Preserve other properties
    })

    it('should remove iter_key from parent with state_ids array', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'parent',
            assistant_id: 'assistant1',
            next: {
              state_ids: ['child1', 'child2'],
              iter_key: 'items',
            },
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
          {
            id: 'child1',
            assistant_id: 'assistant2',
            next: {
              meta_iter_state_id: 'iterator_1',
            },
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
          {
            id: 'child2',
            assistant_id: 'assistant2',
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
        ],
        assistants: [
          { id: 'assistant1', name: 'Test 1', model: 'gpt-4' },
          { id: 'assistant2', name: 'Test 2', model: 'gpt-4' },
        ],
      }

      const result = makeStateNonIterableAction('child1', config)

      const parentState = result.config.states.find((s) => s.id === 'parent')
      expect(parentState?.next?.iter_key).toBeUndefined()
      expect(parentState?.next?.state_ids).toEqual(['child1', 'child2'])
    })

    it('should remove iter_key from multiple parent states', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'parent1',
            assistant_id: 'assistant1',
            next: {
              state_id: 'child',
              iter_key: 'items',
            },
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
          {
            id: 'parent2',
            assistant_id: 'assistant1',
            next: {
              state_id: 'child',
              iter_key: 'users',
            },
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
          {
            id: 'child',
            assistant_id: 'assistant2',
            next: {
              meta_iter_state_id: 'iterator_1',
            },
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
        ],
        assistants: [
          { id: 'assistant1', name: 'Test 1', model: 'gpt-4' },
          { id: 'assistant2', name: 'Test 2', model: 'gpt-4' },
        ],
      }

      const result = makeStateNonIterableAction('child', config)

      const parent1 = result.config.states.find((s) => s.id === 'parent1')
      const parent2 = result.config.states.find((s) => s.id === 'parent2')

      expect(parent1?.next?.iter_key).toBeUndefined()
      expect(parent2?.next?.iter_key).toBeUndefined()
      expect(parent1?.next?.state_id).toBe('child')
      expect(parent2?.next?.state_id).toBe('child')
    })

    it('should not affect parent states without iter_key', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'parent',
            assistant_id: 'assistant1',
            next: {
              state_id: 'child',
              output_key: 'result',
            },
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
          {
            id: 'child',
            assistant_id: 'assistant2',
            next: {
              meta_iter_state_id: 'iterator_1',
            },
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
        ],
        assistants: [
          { id: 'assistant1', name: 'Test 1', model: 'gpt-4' },
          { id: 'assistant2', name: 'Test 2', model: 'gpt-4' },
        ],
      }

      const result = makeStateNonIterableAction('child', config)

      const parentState = result.config.states.find((s) => s.id === 'parent')
      expect(parentState?.next?.state_id).toBe('child')
      expect(parentState?.next?.output_key).toBe('result')
    })

    it('should not affect other parent states that do not reference this child', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'parent1',
            assistant_id: 'assistant1',
            next: {
              state_id: 'child1',
              iter_key: 'items',
            },
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
          {
            id: 'parent2',
            assistant_id: 'assistant1',
            next: {
              state_id: 'child2',
              iter_key: 'users',
            },
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
          {
            id: 'child1',
            assistant_id: 'assistant2',
            next: {
              meta_iter_state_id: 'iterator_1',
            },
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
          {
            id: 'child2',
            assistant_id: 'assistant2',
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
        ],
        assistants: [
          { id: 'assistant1', name: 'Test 1', model: 'gpt-4' },
          { id: 'assistant2', name: 'Test 2', model: 'gpt-4' },
        ],
      }

      const result = makeStateNonIterableAction('child1', config)

      const parent1 = result.config.states.find((s) => s.id === 'parent1')
      const parent2 = result.config.states.find((s) => s.id === 'parent2')

      expect(parent1?.next?.iter_key).toBeUndefined()
      expect(parent2?.next?.iter_key).toBe('users') // Should remain unchanged
    })

    it('should preserve all parent next properties except iter_key', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'parent',
            assistant_id: 'assistant1',
            next: {
              state_id: 'child',
              iter_key: 'items',
              output_key: 'result',
              include_in_llm_history: true,
            },
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
          {
            id: 'child',
            assistant_id: 'assistant2',
            next: {
              meta_iter_state_id: 'iterator_1',
            },
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
        ],
        assistants: [
          { id: 'assistant1', name: 'Test 1', model: 'gpt-4' },
          { id: 'assistant2', name: 'Test 2', model: 'gpt-4' },
        ],
      }

      const result = makeStateNonIterableAction('child', config)

      const parentState = result.config.states.find((s) => s.id === 'parent')
      expect(parentState?.next).toEqual({
        state_id: 'child',
        output_key: 'result',
        include_in_llm_history: true,
      })
    })

    it('should handle state with no parents', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'parent',
            assistant_id: 'assistant1',
            next: {
              state_id: 'other',
              iter_key: 'items',
            },
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
          {
            id: 'child',
            assistant_id: 'assistant2',
            next: {
              meta_iter_state_id: 'iterator_1',
            },
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
        ],
        assistants: [
          { id: 'assistant1', name: 'Test 1', model: 'gpt-4' },
          { id: 'assistant2', name: 'Test 2', model: 'gpt-4' },
        ],
      }

      const result = makeStateNonIterableAction('child', config)

      const parentState = result.config.states.find((s) => s.id === 'parent')
      expect(parentState?.next?.iter_key).toBe('items') // Unchanged
    })
  })

  describe('position translation', () => {
    it('should translate state position from relative to absolute', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'iterator_1',
            next: {},
            _meta: {
              type: 'iterator',
              is_connected: true,
              position: { x: 100, y: 200 },
            },
          } as StateConfiguration,
          {
            id: 'child',
            assistant_id: 'assistant1',
            next: {
              meta_iter_state_id: 'iterator_1',
            },
            _meta: {
              type: 'assistant',
              is_connected: true,
              position: { x: 50, y: 75 },
            },
          } as StateConfiguration,
        ],
        assistants: [{ id: 'assistant1', name: 'Test', model: 'gpt-4' }],
      }

      const result = makeStateNonIterableAction('child', config)

      const updatedState = result.config.states.find((s) => s.id === 'child')
      expect(updatedState?._meta?.position).toEqual({ x: 150, y: 275 })
    })

    it('should not translate position if iterator not found', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'child',
            assistant_id: 'assistant1',
            next: {
              meta_iter_state_id: 'nonexistent_iterator',
            },
            _meta: {
              type: 'assistant',
              is_connected: true,
              position: { x: 50, y: 75 },
            },
          } as StateConfiguration,
        ],
        assistants: [{ id: 'assistant1', name: 'Test', model: 'gpt-4' }],
      }

      const result = makeStateNonIterableAction('child', config)

      const updatedState = result.config.states.find((s) => s.id === 'child')
      expect(updatedState?._meta?.position).toEqual({ x: 50, y: 75 })
    })

    it('should not translate position if state has no position', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'iterator_1',
            next: {},
            _meta: {
              type: 'iterator',
              is_connected: true,
              position: { x: 100, y: 200 },
            },
          } as StateConfiguration,
          {
            id: 'child',
            assistant_id: 'assistant1',
            next: {
              meta_iter_state_id: 'iterator_1',
            },
            _meta: {
              type: 'assistant',
              is_connected: true,
            },
          } as StateConfiguration,
        ],
        assistants: [{ id: 'assistant1', name: 'Test', model: 'gpt-4' }],
      }

      const result = makeStateNonIterableAction('child', config)

      const updatedState = result.config.states.find((s) => s.id === 'child')
      expect(updatedState?._meta?.position).toBeUndefined()
    })

    it('should not translate position if iterator has no position', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'iterator_1',
            next: {},
            _meta: {
              type: 'iterator',
              is_connected: true,
            },
          } as StateConfiguration,
          {
            id: 'child',
            assistant_id: 'assistant1',
            next: {
              meta_iter_state_id: 'iterator_1',
            },
            _meta: {
              type: 'assistant',
              is_connected: true,
              position: { x: 50, y: 75 },
            },
          } as StateConfiguration,
        ],
        assistants: [{ id: 'assistant1', name: 'Test', model: 'gpt-4' }],
      }

      const result = makeStateNonIterableAction('child', config)

      const updatedState = result.config.states.find((s) => s.id === 'child')
      expect(updatedState?._meta?.position).toEqual({ x: 50, y: 75 })
    })
  })
})
