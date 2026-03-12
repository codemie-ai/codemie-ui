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

import { makeStateIterableAction } from '../makeStateIterable'

describe('makeStateIterable', () => {
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
            data: { next: { iter_key: 'items' } },
          },
        } as StateConfiguration,
        {
          id: 'state1',
          assistant_id: 'assistant1',
          task: 'Task 1',
          next: {},
          _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
        } as AssistantStateConfiguration,
        {
          id: 'state2',
          assistant_id: 'assistant2',
          task: 'Task 2',
          next: { state_id: 'state1' },
          _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
        } as AssistantStateConfiguration,
      ],
      assistants: [
        { id: 'assistant1', name: 'Assistant 1', model: 'gpt-4' },
        { id: 'assistant2', name: 'Assistant 2', model: 'gpt-4' },
      ],
    }
  })

  describe('basic functionality', () => {
    it('should add meta_iter_state_id to state', () => {
      const result = makeStateIterableAction('state1', 'iterator_1', baseConfig)

      const updatedState = result.config.states.find((s) => s.id === 'state1')
      expect(updatedState?.next?.meta_iter_state_id).toBe('iterator_1')
    })

    it('should only add meta_iter_state_id without iter_key', () => {
      const result = makeStateIterableAction('state1', 'iterator_1', baseConfig)

      const updatedState = result.config.states.find((s) => s.id === 'state1')
      expect(updatedState?.next?.meta_iter_state_id).toBe('iterator_1')
      expect(updatedState?.next?.iter_key).toBeUndefined()
    })

    it('should preserve existing next properties', () => {
      const result = makeStateIterableAction('state2', 'iterator_1', baseConfig)

      const updatedState = result.config.states.find((s) => s.id === 'state2')
      expect(updatedState?.next?.state_id).toBe('state1')
      expect(updatedState?.next?.meta_iter_state_id).toBe('iterator_1')
    })

    it('should handle state with empty next object', () => {
      const result = makeStateIterableAction('state1', 'iterator_1', baseConfig)

      const updatedState = result.config.states.find((s) => s.id === 'state1')
      expect(updatedState?.next).toEqual({
        meta_iter_state_id: 'iterator_1',
      })
    })

    it('should handle state with existing next properties', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'iterator_1',
            next: {},
            _meta: {
              type: 'iterator',
              is_connected: true,
              position: { x: 0, y: 0 },
              data: { next: { iter_key: 'rows' } },
            },
          } as StateConfiguration,
          {
            id: 'state1',
            assistant_id: 'assistant1',
            next: {
              state_id: 'state2',
              output_key: 'result',
              include_in_llm_history: true,
            },
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
        ],
        assistants: [{ id: 'assistant1', name: 'Test', model: 'gpt-4' }],
      }

      const result = makeStateIterableAction('state1', 'iterator_1', config)

      const updatedState = result.config.states.find((s) => s.id === 'state1')
      expect(updatedState?.next).toEqual({
        state_id: 'state2',
        output_key: 'result',
        include_in_llm_history: true,
        meta_iter_state_id: 'iterator_1',
      })
    })
  })

  describe('error handling', () => {
    it('should return unchanged config if state not found', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = makeStateIterableAction('nonexistent', 'iterator_1', baseConfig)

      expect(result.config).toEqual(baseConfig)
      expect(consoleWarnSpy).toHaveBeenCalledWith('State nonexistent not found')

      consoleWarnSpy.mockRestore()
    })

    it('should return unchanged config if iterator not found', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = makeStateIterableAction('state1', 'nonexistent_iterator', baseConfig)

      expect(result.config).toEqual(baseConfig)
      expect(consoleWarnSpy).toHaveBeenCalledWith('Iterator nonexistent_iterator not found')

      consoleWarnSpy.mockRestore()
    })

    it('should handle empty states array', () => {
      const config: WorkflowConfiguration = {
        states: [],
        assistants: [],
      }

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = makeStateIterableAction('state1', 'iterator_1', config)

      expect(result.config).toEqual(config)
      expect(consoleWarnSpy).toHaveBeenCalled()

      consoleWarnSpy.mockRestore()
    })

    it('should handle undefined states', () => {
      const config: WorkflowConfiguration = {
        assistants: [],
      } as unknown as WorkflowConfiguration

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = makeStateIterableAction('state1', 'iterator_1', config)

      expect(result.config).toEqual(config)

      consoleWarnSpy.mockRestore()
    })
  })

  describe('multiple states', () => {
    it('should make multiple states iterable with same iterator', () => {
      const result1 = makeStateIterableAction('state1', 'iterator_1', baseConfig)
      const result2 = makeStateIterableAction('state2', 'iterator_1', result1.config)

      const state1 = result2.config.states.find((s) => s.id === 'state1')
      const state2 = result2.config.states.find((s) => s.id === 'state2')

      expect(state1?.next?.meta_iter_state_id).toBe('iterator_1')
      expect(state2?.next?.meta_iter_state_id).toBe('iterator_1')
    })

    it('should handle switching iterator parent', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'iterator_1',
            next: {},
            _meta: {
              type: 'iterator',
              is_connected: true,
              position: { x: 0, y: 0 },
              data: { next: { iter_key: 'items' } },
            },
          } as StateConfiguration,
          {
            id: 'iterator_2',
            next: {},
            _meta: {
              type: 'iterator',
              is_connected: true,
              position: { x: 0, y: 0 },
              data: { next: { iter_key: 'rows' } },
            },
          } as StateConfiguration,
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

      const result = makeStateIterableAction('state1', 'iterator_2', config)

      const updatedState = result.config.states.find((s) => s.id === 'state1')
      expect(updatedState?.next?.meta_iter_state_id).toBe('iterator_2')
    })
  })

  describe('config preservation', () => {
    it('should preserve iterator state unchanged', () => {
      const result = makeStateIterableAction('state1', 'iterator_1', baseConfig)

      expect(result.config.states).toHaveLength(3)
      const iterator = result.config.states.find((s) => s.id === 'iterator_1')
      expect(iterator).toEqual(baseConfig.states[0])
    })

    it('should preserve other config properties', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'iterator_1',
            next: {},
            _meta: {
              type: 'iterator',
              is_connected: true,
              position: { x: 0, y: 0 },
              data: { next: { iter_key: 'items' } },
            },
          } as StateConfiguration,
          {
            id: 'state1',
            assistant_id: 'assistant1',
            next: {},
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as AssistantStateConfiguration,
        ],
        assistants: [{ id: 'assistant1', name: 'Test', model: 'gpt-4' }],
        tools: [{ id: 'tool1', tool: 'some_tool' }],
        custom_nodes: [{ id: 'custom1', name: 'Custom' }],
      }

      const result = makeStateIterableAction('state1', 'iterator_1', config)

      expect(result.config.assistants).toEqual(config.assistants)
      expect(result.config.tools).toEqual(config.tools)
      expect(result.config.custom_nodes).toEqual(config.custom_nodes)
    })

    it('should not mutate original config', () => {
      const originalStates = JSON.parse(JSON.stringify(baseConfig.states))

      makeStateIterableAction('state1', 'iterator_1', baseConfig)

      expect(baseConfig.states).toEqual(originalStates)
    })

    it('should not modify iterator state', () => {
      const originalIterator = baseConfig.states[0]

      const result = makeStateIterableAction('state1', 'iterator_1', baseConfig)

      const iterator = result.config.states.find((s) => s.id === 'iterator_1')
      expect(iterator).toEqual(originalIterator)
    })
  })

  describe('various state types', () => {
    it('should make tool state iterable', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'iterator_1',
            next: {},
            _meta: {
              type: 'iterator',
              is_connected: true,
              position: { x: 0, y: 0 },
              data: { next: { iter_key: 'items' } },
            },
          } as StateConfiguration,
          {
            id: 'tool_1',
            tool_name: 'test_tool',
            next: {},
            _meta: { type: 'tool', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
        ],
        tools: [{ id: 'tool1', tool: 'test_tool' }],
      }

      const result = makeStateIterableAction('tool_1', 'iterator_1', config)

      const updatedState = result.config.states.find((s) => s.id === 'tool_1')
      expect(updatedState?.next?.meta_iter_state_id).toBe('iterator_1')
    })

    it('should make custom state iterable', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'iterator_1',
            next: {},
            _meta: {
              type: 'iterator',
              is_connected: true,
              position: { x: 0, y: 0 },
              data: { next: { iter_key: 'items' } },
            },
          } as StateConfiguration,
          {
            id: 'custom_1',
            custom_node_id: 'my_custom',
            next: {},
            _meta: { type: 'custom', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
        ],
        custom_nodes: [{ id: 'custom1', name: 'Custom' }],
      }

      const result = makeStateIterableAction('custom_1', 'iterator_1', config)

      const updatedState = result.config.states.find((s) => s.id === 'custom_1')
      expect(updatedState?.next?.meta_iter_state_id).toBe('iterator_1')
    })
  })

  describe('parent iter_key update', () => {
    it('should update parent iter_key when making state iterable', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'iterator_1',
            next: {},
            _meta: {
              type: 'iterator',
              is_connected: true,
              position: { x: 0, y: 0 },
              data: { next: { iter_key: 'items' } },
            },
          } as StateConfiguration,
          {
            id: 'parent',
            assistant_id: 'assistant1',
            next: {
              state_id: 'child1',
            },
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
          {
            id: 'child1',
            assistant_id: 'assistant2',
            next: {},
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
        ],
        assistants: [
          { id: 'assistant1', name: 'Assistant 1', model: 'gpt-4' },
          { id: 'assistant2', name: 'Assistant 2', model: 'gpt-4' },
        ],
      }

      const result = makeStateIterableAction('child1', 'iterator_1', config)

      const parent = result.config.states.find((s) => s.id === 'parent')
      expect(parent?.next?.iter_key).toBe('items')
    })

    it('should preserve other parent next properties when updating iter_key', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'iterator_1',
            next: {},
            _meta: {
              type: 'iterator',
              is_connected: true,
              position: { x: 0, y: 0 },
              data: { next: { iter_key: 'rows' } },
            },
          } as StateConfiguration,
          {
            id: 'parent',
            assistant_id: 'assistant1',
            next: {
              state_id: 'child1',
              output_key: 'result',
              include_in_llm_history: true,
            },
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
          {
            id: 'child1',
            assistant_id: 'assistant2',
            next: {},
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
        ],
        assistants: [
          { id: 'assistant1', name: 'Assistant 1', model: 'gpt-4' },
          { id: 'assistant2', name: 'Assistant 2', model: 'gpt-4' },
        ],
      }

      const result = makeStateIterableAction('child1', 'iterator_1', config)

      const parent = result.config.states.find((s) => s.id === 'parent')
      expect(parent?.next).toEqual({
        state_id: 'child1',
        output_key: 'result',
        include_in_llm_history: true,
        iter_key: 'rows',
      })
    })

    it('should not update iter_key when state has no parent', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'iterator_1',
            next: {},
            _meta: {
              type: 'iterator',
              is_connected: true,
              position: { x: 0, y: 0 },
              data: { next: { iter_key: 'items' } },
            },
          } as StateConfiguration,
          {
            id: 'state1',
            assistant_id: 'assistant1',
            next: {},
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
        ],
        assistants: [{ id: 'assistant1', name: 'Assistant 1', model: 'gpt-4' }],
      }

      const result = makeStateIterableAction('state1', 'iterator_1', config)

      const state1 = result.config.states.find((s) => s.id === 'state1')
      expect(state1?.next?.meta_iter_state_id).toBe('iterator_1')
      expect(state1?.next?.iter_key).toBeUndefined()
    })

    it('should not update parent when state has multiple parents', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'iterator_1',
            next: {},
            _meta: {
              type: 'iterator',
              is_connected: true,
              position: { x: 0, y: 0 },
              data: { next: { iter_key: 'items' } },
            },
          } as StateConfiguration,
          {
            id: 'parent1',
            assistant_id: 'assistant1',
            next: { state_id: 'child1' },
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
          {
            id: 'parent2',
            assistant_id: 'assistant2',
            next: { state_id: 'child1' },
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
          {
            id: 'child1',
            assistant_id: 'assistant3',
            next: {},
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
        ],
        assistants: [
          { id: 'assistant1', name: 'Assistant 1', model: 'gpt-4' },
          { id: 'assistant2', name: 'Assistant 2', model: 'gpt-4' },
          { id: 'assistant3', name: 'Assistant 3', model: 'gpt-4' },
        ],
      }

      const result = makeStateIterableAction('child1', 'iterator_1', config)

      const parent1 = result.config.states.find((s) => s.id === 'parent1')
      const parent2 = result.config.states.find((s) => s.id === 'parent2')
      expect(parent1?.next?.iter_key).toBeUndefined()
      expect(parent2?.next?.iter_key).toBeUndefined()
    })
  })

  describe('sibling handling', () => {
    it('should not add siblings when parent has single child', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'iterator_1',
            next: {},
            _meta: {
              type: 'iterator',
              is_connected: true,
              position: { x: 0, y: 0 },
              data: { next: { iter_key: 'items' } },
            },
          } as StateConfiguration,
          {
            id: 'parent',
            assistant_id: 'assistant1',
            next: {
              state_id: 'child1',
            },
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
          {
            id: 'child1',
            assistant_id: 'assistant2',
            next: {},
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
        ],
        assistants: [
          { id: 'assistant1', name: 'Assistant 1', model: 'gpt-4' },
          { id: 'assistant2', name: 'Assistant 2', model: 'gpt-4' },
        ],
      }

      const result = makeStateIterableAction('child1', 'iterator_1', config)

      const child1 = result.config.states.find((s) => s.id === 'child1')
      expect(child1?.next?.meta_iter_state_id).toBe('iterator_1')
    })

    it('should not add siblings when state has no parent', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'iterator_1',
            next: {},
            _meta: {
              type: 'iterator',
              is_connected: true,
              position: { x: 0, y: 0 },
              data: { next: { iter_key: 'items' } },
            },
          } as StateConfiguration,
          {
            id: 'state1',
            assistant_id: 'assistant1',
            next: {},
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
        ],
        assistants: [{ id: 'assistant1', name: 'Assistant 1', model: 'gpt-4' }],
      }

      const result = makeStateIterableAction('state1', 'iterator_1', config)

      const state1 = result.config.states.find((s) => s.id === 'state1')
      expect(state1?.next?.meta_iter_state_id).toBe('iterator_1')
    })

    it('should not add siblings when state has multiple parents', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'iterator_1',
            next: {},
            _meta: {
              type: 'iterator',
              is_connected: true,
              position: { x: 0, y: 0 },
              data: { next: { iter_key: 'items' } },
            },
          } as StateConfiguration,
          {
            id: 'parent1',
            assistant_id: 'assistant1',
            next: { state_id: 'child1' },
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
          {
            id: 'parent2',
            assistant_id: 'assistant2',
            next: { state_id: 'child1' },
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
          {
            id: 'child1',
            assistant_id: 'assistant3',
            next: {},
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
        ],
        assistants: [
          { id: 'assistant1', name: 'Assistant 1', model: 'gpt-4' },
          { id: 'assistant2', name: 'Assistant 2', model: 'gpt-4' },
          { id: 'assistant3', name: 'Assistant 3', model: 'gpt-4' },
        ],
      }

      const result = makeStateIterableAction('child1', 'iterator_1', config)

      // Only child1 should be added (has multiple parents, so sibling logic doesn't apply)
      const child1 = result.config.states.find((s) => s.id === 'child1')
      expect(child1?.next?.meta_iter_state_id).toBe('iterator_1')
    })

    it('should not add sibling that is already in the iterator', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'iterator_1',
            next: {},
            _meta: {
              type: 'iterator',
              is_connected: true,
              position: { x: 0, y: 0 },
              data: { next: { iter_key: 'items' } },
            },
          } as StateConfiguration,
          {
            id: 'parent',
            assistant_id: 'assistant1',
            next: {
              state_ids: ['child1', 'child2'],
            },
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
          {
            id: 'child1',
            assistant_id: 'assistant2',
            next: {},
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
          {
            id: 'child2',
            assistant_id: 'assistant3',
            next: { meta_iter_state_id: 'iterator_1' },
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
        ],
        assistants: [
          { id: 'assistant1', name: 'Assistant 1', model: 'gpt-4' },
          { id: 'assistant2', name: 'Assistant 2', model: 'gpt-4' },
          { id: 'assistant3', name: 'Assistant 3', model: 'gpt-4' },
        ],
      }

      const result = makeStateIterableAction('child1', 'iterator_1', config)

      // Both should have iterator, child2 already had it
      const child1 = result.config.states.find((s) => s.id === 'child1')
      const child2 = result.config.states.find((s) => s.id === 'child2')

      expect(child1?.next?.meta_iter_state_id).toBe('iterator_1')
      expect(child2?.next?.meta_iter_state_id).toBe('iterator_1')
    })
  })
})
