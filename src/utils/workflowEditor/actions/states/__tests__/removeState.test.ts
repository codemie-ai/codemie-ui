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

import {
  WorkflowConfiguration,
  StateConfiguration,
  AssistantStateConfiguration,
  ToolStateConfiguration,
} from '@/types/workflowEditor/configuration'

import { removeStateAction } from '../removeState'

describe('removeState', () => {
  let baseConfig: WorkflowConfiguration

  beforeEach(() => {
    baseConfig = {
      states: [
        {
          id: 'state1',
          assistant_id: 'assistant1',
          task: 'Task 1',
          _meta: { type: 'assistant', is_connected: true },
        } as AssistantStateConfiguration,
        {
          id: 'state2',
          assistant_id: 'assistant2',
          task: 'Task 2',
          next: { state_id: 'state1' },
          _meta: { type: 'assistant', is_connected: true },
        } as AssistantStateConfiguration,
        {
          id: 'state3',
          assistant_id: 'assistant3',
          task: 'Task 3',
          _meta: { type: 'assistant', is_connected: true },
        } as AssistantStateConfiguration,
      ],
      assistants: [
        { id: 'assistant1', name: 'Assistant 1', model: 'gpt-4' },
        { id: 'assistant2', name: 'Assistant 2', model: 'gpt-4' },
        { id: 'assistant3', name: 'Assistant 3', model: 'gpt-4' },
      ],
    }
  })

  describe('basic state removal', () => {
    it('should remove a state from the configuration', () => {
      const result = removeStateAction('state2', baseConfig)

      expect(result.config.states).toHaveLength(2)
      expect(result.config.states.find((s) => s.id === 'state2')).toBeUndefined()
      expect(result.config.states.find((s) => s.id === 'state1')).toBeDefined()
      expect(result.config.states.find((s) => s.id === 'state3')).toBeDefined()
    })

    it('should handle removing the first state', () => {
      const result = removeStateAction('state1', baseConfig)

      expect(result.config.states).toHaveLength(2)
      expect(result.config.states.find((s) => s.id === 'state1')).toBeUndefined()
    })

    it('should handle removing the last state', () => {
      const result = removeStateAction('state3', baseConfig)

      expect(result.config.states).toHaveLength(2)
      expect(result.config.states.find((s) => s.id === 'state3')).toBeUndefined()
    })

    it('should handle removing non-existent state', () => {
      const result = removeStateAction('nonexistent', baseConfig)

      expect(result.config.states).toHaveLength(3)
      expect(result.config).toEqual(baseConfig)
    })

    it('should handle empty states array', () => {
      const config: WorkflowConfiguration = {
        states: [],
        assistants: [],
      }

      const result = removeStateAction('state1', config)

      expect(result.config.states).toEqual([])
    })
  })

  describe('START and END node protection', () => {
    it('should not remove START node', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'start',
            _meta: { type: 'start', is_connected: true },
          } as StateConfiguration,
          {
            id: 'state1',
            assistant_id: 'assistant1',
            _meta: { type: 'assistant', is_connected: true },
          } as AssistantStateConfiguration,
        ],
        assistants: [{ id: 'assistant1', name: 'Test', model: 'gpt-4' }],
      }

      const result = removeStateAction('start', config)

      expect(result.config).toEqual(config)
      expect(result.config.states.find((s) => s.id === 'start')).toBeDefined()
    })

    it('should not remove END node', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'end',
            _meta: { type: 'end', is_connected: true },
          } as StateConfiguration,
          {
            id: 'state1',
            assistant_id: 'assistant1',
            _meta: { type: 'assistant', is_connected: true },
          } as AssistantStateConfiguration,
        ],
        assistants: [{ id: 'assistant1', name: 'Test', model: 'gpt-4' }],
      }

      const result = removeStateAction('end', config)

      expect(result.config).toEqual(config)
      expect(result.config.states.find((s) => s.id === 'end')).toBeDefined()
    })
  })

  describe('iterator removal', () => {
    it('should remove meta_iter_state_id from child states when removing iterator', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'parent',
            assistant_id: 'assistant0',
            next: { state_id: 'child1', iter_key: 'items' },
            _meta: { type: 'assistant', is_connected: true },
          } as StateConfiguration,
          {
            id: 'iterator_123',
            _meta: {
              type: 'iterator',
              is_connected: true,
              position: { x: 100, y: 100 },
              data: { iter_key: 'items' },
            },
          } as StateConfiguration,
          {
            id: 'child1',
            assistant_id: 'assistant1',
            next: { state_id: 'child2', meta_iter_state_id: 'iterator_123' },
            _meta: { type: 'assistant', is_connected: true, position: { x: 50, y: 50 } },
          } as StateConfiguration,
          {
            id: 'child2',
            assistant_id: 'assistant2',
            next: { meta_iter_state_id: 'iterator_123' },
            _meta: { type: 'assistant', is_connected: true, position: { x: 75, y: 75 } },
          } as StateConfiguration,
        ],
        assistants: [
          { id: 'assistant0', name: 'Test 0', model: 'gpt-4' },
          { id: 'assistant1', name: 'Test 1', model: 'gpt-4' },
          { id: 'assistant2', name: 'Test 2', model: 'gpt-4' },
        ],
      }

      const result = removeStateAction('iterator_123', config)

      expect(result.config.states).toHaveLength(3)
      expect(result.config.states.find((s) => s.id === 'iterator_123')).toBeUndefined()

      const parent = result.config.states.find((s) => s.id === 'parent')
      const child1 = result.config.states.find((s) => s.id === 'child1')
      const child2 = result.config.states.find((s) => s.id === 'child2')

      // Children should have meta_iter_state_id removed
      expect(child1?.next?.meta_iter_state_id).toBeUndefined()
      expect(child2?.next?.meta_iter_state_id).toBeUndefined()

      // Parent should have iter_key removed
      expect(parent?.next?.iter_key).toBeUndefined()

      // Should translate positions to absolute
      expect(child1?._meta?.position).toEqual({ x: 150, y: 150 })
      expect(child2?._meta?.position).toEqual({ x: 175, y: 175 })
    })

    it('should preserve other next properties when removing iterator references', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'parent',
            assistant_id: 'assistant0',
            next: { state_id: 'child1', iter_key: 'items', output_key: 'parent_result' },
            _meta: { type: 'assistant', is_connected: true },
          } as StateConfiguration,
          {
            id: 'iterator_123',
            _meta: {
              type: 'iterator',
              is_connected: true,
              data: { iter_key: 'items' },
            },
          } as StateConfiguration,
          {
            id: 'child1',
            assistant_id: 'assistant1',
            next: {
              meta_iter_state_id: 'iterator_123',
              state_id: 'next_state',
              output_key: 'result',
              include_in_llm_history: true,
            },
            _meta: { type: 'assistant', is_connected: true },
          } as StateConfiguration,
        ],
        assistants: [
          { id: 'assistant0', name: 'Test 0', model: 'gpt-4' },
          { id: 'assistant1', name: 'Test', model: 'gpt-4' },
        ],
      }

      const result = removeStateAction('iterator_123', config)

      const parent = result.config.states.find((s) => s.id === 'parent')
      const child1 = result.config.states.find((s) => s.id === 'child1')

      expect(child1?.next?.meta_iter_state_id).toBeUndefined()
      expect(child1?.next?.state_id).toBe('next_state')
      expect(child1?.next?.output_key).toBe('result')
      expect(child1?.next?.include_in_llm_history).toBe(true)

      expect(parent?.next?.iter_key).toBeUndefined()
      expect(parent?.next?.output_key).toBe('parent_result')
    })

    it('should not affect states without iterator reference', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'parent',
            assistant_id: 'assistant0',
            next: { state_id: 'child1', iter_key: 'items' },
            _meta: { type: 'assistant', is_connected: true },
          } as StateConfiguration,
          {
            id: 'iterator_123',
            _meta: {
              type: 'iterator',
              is_connected: true,
              data: { iter_key: 'items' },
            },
          } as StateConfiguration,
          {
            id: 'child1',
            assistant_id: 'assistant1',
            next: { meta_iter_state_id: 'iterator_123' },
            _meta: { type: 'assistant', is_connected: true },
          } as StateConfiguration,
          {
            id: 'unrelated',
            assistant_id: 'assistant2',
            next: { state_id: 'other_state', output_key: 'data' },
            _meta: { type: 'assistant', is_connected: true },
          } as StateConfiguration,
        ],
        assistants: [
          { id: 'assistant0', name: 'Test 0', model: 'gpt-4' },
          { id: 'assistant1', name: 'Test 1', model: 'gpt-4' },
          { id: 'assistant2', name: 'Test 2', model: 'gpt-4' },
        ],
      }

      const result = removeStateAction('iterator_123', config)

      const unrelated = result.config.states.find((s) => s.id === 'unrelated')

      expect(unrelated?.next?.state_id).toBe('other_state')
      expect(unrelated?.next?.output_key).toBe('data')
    })

    it('should handle removing iterator with no children', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'iterator_123',
            _meta: {
              type: 'iterator',
              is_connected: true,
              data: { iter_key: 'items' },
            },
          } as StateConfiguration,
          {
            id: 'state1',
            assistant_id: 'assistant1',
            _meta: { type: 'assistant', is_connected: true },
          } as StateConfiguration,
        ],
        assistants: [{ id: 'assistant1', name: 'Test', model: 'gpt-4' }],
      }

      const result = removeStateAction('iterator_123', config)

      expect(result.config.states).toHaveLength(1)
      expect(result.config.states.find((s) => s.id === 'iterator_123')).toBeUndefined()
      expect(result.config.states.find((s) => s.id === 'state1')).toBeDefined()
    })

    it('should handle children without positions when removing iterator', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'parent',
            assistant_id: 'assistant0',
            next: { state_id: 'child1', iter_key: 'items' },
            _meta: { type: 'assistant', is_connected: true },
          } as StateConfiguration,
          {
            id: 'iterator_123',
            _meta: {
              type: 'iterator',
              is_connected: true,
              position: { x: 100, y: 100 },
              data: { iter_key: 'items' },
            },
          } as StateConfiguration,
          {
            id: 'child1',
            assistant_id: 'assistant1',
            next: { meta_iter_state_id: 'iterator_123' },
            _meta: { type: 'assistant', is_connected: true },
          } as StateConfiguration,
        ],
        assistants: [
          { id: 'assistant0', name: 'Test 0', model: 'gpt-4' },
          { id: 'assistant1', name: 'Test', model: 'gpt-4' },
        ],
      }

      const result = removeStateAction('iterator_123', config)

      const child1 = result.config.states.find((s) => s.id === 'child1')
      expect(child1?.next?.meta_iter_state_id).toBeUndefined()
      expect(child1?._meta?.position).toBeUndefined()
    })

    it('should handle iterator without position when removing', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'parent',
            assistant_id: 'assistant0',
            next: { state_id: 'child1', iter_key: 'items' },
            _meta: { type: 'assistant', is_connected: true },
          } as StateConfiguration,
          {
            id: 'iterator_123',
            _meta: {
              type: 'iterator',
              is_connected: true,
              data: { iter_key: 'items' },
            },
          } as StateConfiguration,
          {
            id: 'child1',
            assistant_id: 'assistant1',
            next: { meta_iter_state_id: 'iterator_123' },
            _meta: { type: 'assistant', is_connected: true, position: { x: 50, y: 50 } },
          } as StateConfiguration,
        ],
        assistants: [
          { id: 'assistant0', name: 'Test 0', model: 'gpt-4' },
          { id: 'assistant1', name: 'Test', model: 'gpt-4' },
        ],
      }

      const result = removeStateAction('iterator_123', config)

      const child1 = result.config.states.find((s) => s.id === 'child1')
      expect(child1?.next?.meta_iter_state_id).toBeUndefined()
      expect(child1?._meta?.position).toEqual({ x: 50, y: 50 })
    })
  })

  describe('removal with various state types', () => {
    it('should remove conditional meta state', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'conditional_123',
            _meta: {
              type: 'conditional',
              is_connected: true,
              data: {
                next: {
                  condition: {
                    statement: 'test',
                    then: 'state1',
                    otherwise: 'state2',
                  },
                },
              },
            },
          } as StateConfiguration,
          {
            id: 'state1',
            assistant_id: 'assistant1',
            _meta: { type: 'assistant', is_connected: true },
          } as AssistantStateConfiguration,
        ],
        assistants: [{ id: 'assistant1', name: 'Test', model: 'gpt-4' }],
      }

      const result = removeStateAction('conditional_123', config)

      expect(result.config.states).toHaveLength(1)
      expect(result.config.states.find((s) => s.id === 'conditional_123')).toBeUndefined()
    })

    it('should remove switch meta state', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'switch_123',
            _meta: {
              type: 'switch',
              is_connected: true,
              data: {
                next: {
                  switch: {
                    arg: 'value',
                    cases: [{ value: 'case1', state_id: 'state1' }],
                    default: 'state2',
                  },
                },
              },
            },
          } as StateConfiguration,
          {
            id: 'state1',
            assistant_id: 'assistant1',
            _meta: { type: 'assistant', is_connected: true },
          } as AssistantStateConfiguration,
        ],
        assistants: [{ id: 'assistant1', name: 'Test', model: 'gpt-4' }],
      }

      const result = removeStateAction('switch_123', config)

      expect(result.config.states).toHaveLength(1)
      expect(result.config.states.find((s) => s.id === 'switch_123')).toBeUndefined()
    })

    it('should remove tool state', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'tool1',
            tool_name: 'test_tool',
            _meta: { type: 'tool', is_connected: true },
          } as StateConfiguration,
          {
            id: 'state1',
            assistant_id: 'assistant1',
            _meta: { type: 'assistant', is_connected: true },
          } as AssistantStateConfiguration,
        ],
        assistants: [{ id: 'assistant1', name: 'Test', model: 'gpt-4' }],
        tools: [{ id: 'tool1', tool: 'test_tool' }],
      }

      const result = removeStateAction('tool1', config)

      expect(result.config.states).toHaveLength(1)
      expect(result.config.states.find((s) => s.id === 'tool1')).toBeUndefined()
    })

    it('should remove custom node state', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'custom1',
            custom_node_id: 'my_custom',
            _meta: { type: 'custom', is_connected: true },
          } as StateConfiguration,
          {
            id: 'state1',
            assistant_id: 'assistant1',
            _meta: { type: 'assistant', is_connected: true },
          } as AssistantStateConfiguration,
        ],
        assistants: [{ id: 'assistant1', name: 'Test', model: 'gpt-4' }],
        custom_nodes: [{ id: 'custom1', name: 'Custom Node' }],
      }

      const result = removeStateAction('custom1', config)

      expect(result.config.states).toHaveLength(1)
      expect(result.config.states.find((s) => s.id === 'custom1')).toBeUndefined()
    })
  })

  describe('config preservation', () => {
    it('should cleanup unused actors after removing state', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'state1',
            assistant_id: 'assistant1',
            _meta: { type: 'assistant', is_connected: true },
          } as AssistantStateConfiguration,
        ],
        assistants: [{ id: 'assistant1', name: 'Test', model: 'gpt-4' }],
        tools: [{ id: 'tool1', tool: 'some_tool' }],
        custom_nodes: [{ id: 'custom1', name: 'Custom' }],
      }

      const result = removeStateAction('state1', config)

      expect(result.config.assistants).toHaveLength(0)
      expect(result.config.tools).toHaveLength(0)
      expect(result.config.custom_nodes).toHaveLength(0)
    })

    it('should preserve actors that are still referenced by remaining states', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'state1',
            tool_id: 'tool1',
            _meta: { type: 'tool', is_connected: true },
          } as ToolStateConfiguration,
          {
            id: 'state2',
            assistant_id: 'assistant1',
            _meta: { type: 'assistant', is_connected: true },
          } as AssistantStateConfiguration,
        ],
        assistants: [{ id: 'assistant1', name: 'Test', model: 'gpt-4' }],
        tools: [{ id: 'tool1', tool: 'some_tool' }],
        custom_nodes: [{ id: 'custom1', name: 'Custom' }],
      }

      const result = removeStateAction('state1', config)

      expect(result.config.assistants).toHaveLength(1)
      expect(result.config.assistants?.[0].id).toBe('assistant1')
      expect(result.config.tools).toHaveLength(0)
      expect(result.config.custom_nodes).toHaveLength(0)
    })

    it('should not mutate original config', () => {
      const originalStates = [...baseConfig.states]

      removeStateAction('state1', baseConfig)

      expect(baseConfig.states).toEqual(originalStates)
    })
  })
})
