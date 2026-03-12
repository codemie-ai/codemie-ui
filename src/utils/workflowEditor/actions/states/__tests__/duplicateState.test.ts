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
  AssistantStateConfiguration,
  ToolStateConfiguration,
  CustomNodeStateConfiguration,
} from '@/types/workflowEditor/configuration'

import { duplicateStateAction } from '../duplicateState'

describe('duplicateState', () => {
  let baseConfig: WorkflowConfiguration

  beforeEach(() => {
    baseConfig = {
      states: [
        {
          id: 'assistant_1',
          assistant_id: 'assistant1',
          task: 'Task 1',
          next: { state_id: 'tool_1' },
          _meta: {
            type: 'assistant',
            is_connected: true,
            position: { x: 100, y: 100 },
          },
        } as AssistantStateConfiguration,
        {
          id: 'tool_1',
          tool_id: 'tool1',
          next: {},
          _meta: {
            type: 'tool',
            is_connected: true,
            position: { x: 200, y: 200 },
          },
        } as ToolStateConfiguration,
      ],
      assistants: [{ id: 'assistant1', name: 'Assistant 1', model: 'gpt-4' }],
      tools: [{ id: 'tool1', tool: 'search' }],
    }
  })

  describe('Basic duplication', () => {
    it('should duplicate a state successfully', () => {
      const result = duplicateStateAction('assistant_1', baseConfig)

      expect(result.config.states).toHaveLength(3)
      expect(result.config.states[1].id).toBe('assistant_1_copy')
    })

    it('should throw error if state not found', () => {
      expect(() => duplicateStateAction('nonexistent', baseConfig)).toThrow(
        'State with id "nonexistent" not found'
      )
    })

    it('should insert duplicated state after the original', () => {
      const result = duplicateStateAction('assistant_1', baseConfig)

      expect(result.config.states[0].id).toBe('assistant_1')
      expect(result.config.states[1].id).toBe('assistant_1_copy')
      expect(result.config.states[2].id).toBe('tool_1')
    })
  })

  describe('ID generation', () => {
    it('should generate _copy suffix for first duplicate', () => {
      const result = duplicateStateAction('assistant_1', baseConfig)

      expect(result.config.states[1].id).toBe('assistant_1_copy')
    })

    it('should increment suffix for multiple duplicates', () => {
      let config = baseConfig

      const result1 = duplicateStateAction('assistant_1', config)
      config = result1.config
      expect(config.states[1].id).toBe('assistant_1_copy')

      const result2 = duplicateStateAction('assistant_1', config)
      config = result2.config
      expect(config.states[1].id).toBe('assistant_1_copy_2')
      expect(config.states[2].id).toBe('assistant_1_copy')

      const result3 = duplicateStateAction('assistant_1', config)
      config = result3.config
      expect(config.states[1].id).toBe('assistant_1_copy_3')
      expect(config.states[2].id).toBe('assistant_1_copy_2')
      expect(config.states[3].id).toBe('assistant_1_copy')
    })

    it('should strip existing _copy suffix when duplicating a copy', () => {
      const result1 = duplicateStateAction('assistant_1', baseConfig)
      const { config } = result1
      // Duplicating assistant_1_copy should strip _copy and create assistant_1_copy_2
      const result2 = duplicateStateAction('assistant_1_copy', config)

      expect(result2.config.states[1].id).toBe('assistant_1_copy')
      expect(result2.config.states[2].id).toBe('assistant_1_copy_2')
    })
  })

  describe('State properties', () => {
    it('should remove navigation fields from next but keep configuration fields', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'assistant_1',
            assistant_id: 'assistant1',
            next: {
              state_id: 'tool_1',
              output_key: 'result',
              include_in_llm_history: false,
              store_in_context: true,
              clear_prior_messages: true,
            },
            _meta: {
              type: 'assistant',
              is_connected: true,
              position: { x: 100, y: 100 },
            },
          } as AssistantStateConfiguration,
        ],
        assistants: [],
      }

      const result = duplicateStateAction('assistant_1', config)
      const duplicatedState = result.config.states[1]

      // Navigation fields should be removed
      expect(duplicatedState.next?.state_id).toBeUndefined()

      // Configuration fields should be preserved
      expect(duplicatedState.next?.output_key).toBe('result')
      expect(duplicatedState.next?.include_in_llm_history).toBe(false)
      expect(duplicatedState.next?.store_in_context).toBe(true)
      expect(duplicatedState.next?.clear_prior_messages).toBe(true)
    })

    it('should remove next field entirely if it only contains navigation fields', () => {
      const result = duplicateStateAction('assistant_1', baseConfig)
      const duplicatedState = result.config.states[1]

      expect(duplicatedState.next).toBeUndefined()
    })

    it('should copy all other properties from original state', () => {
      const result = duplicateStateAction('assistant_1', baseConfig)
      const originalState = result.config.states[0] as AssistantStateConfiguration
      const duplicatedState = result.config.states[1] as AssistantStateConfiguration

      expect(duplicatedState.assistant_id).toBe(originalState.assistant_id)
      expect(duplicatedState.task).toBe(originalState.task)
      expect(duplicatedState._meta?.type).toBe(originalState._meta?.type)
    })

    it('should set is_connected to false', () => {
      const result = duplicateStateAction('assistant_1', baseConfig)
      const duplicatedState = result.config.states[1]

      expect(duplicatedState._meta?.is_connected).toBe(false)
    })

    it('should set selected to true', () => {
      const result = duplicateStateAction('assistant_1', baseConfig)
      const duplicatedState = result.config.states[1]

      expect(duplicatedState._meta?.selected).toBe(true)
    })

    it('should offset position vertically by 100px', () => {
      const result = duplicateStateAction('assistant_1', baseConfig)
      const originalState = result.config.states[0]
      const duplicatedState = result.config.states[1]

      expect(duplicatedState._meta?.position?.x).toBe(originalState._meta?.position?.x)
      expect(duplicatedState._meta?.position?.y).toBe((originalState._meta?.position?.y ?? 0) + 100)
    })
  })

  describe('Different node types', () => {
    it('should duplicate tool state correctly', () => {
      const result = duplicateStateAction('tool_1', baseConfig)
      const duplicatedState = result.config.states[2] as ToolStateConfiguration

      expect(duplicatedState.id).toBe('tool_1_copy')
      expect(duplicatedState.tool_id).toBe('tool1')
      expect(duplicatedState.next).toBeUndefined()
    })

    it('should duplicate custom node state correctly', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'custom_1',
            custom_node_id: 'custom1',
            next: { state_id: 'assistant_1' },
            _meta: {
              type: 'custom',
              is_connected: true,
              position: { x: 50, y: 50 },
            },
          } as CustomNodeStateConfiguration,
        ],
        custom_nodes: [{ id: 'custom1', name: 'Custom Node' }],
      }

      const result = duplicateStateAction('custom_1', config)
      const duplicatedState = result.config.states[1] as CustomNodeStateConfiguration

      expect(duplicatedState.id).toBe('custom_1_copy')
      expect(duplicatedState.custom_node_id).toBe('custom1')
      expect(duplicatedState.next).toBeUndefined()
    })
  })

  describe('Next field configuration preservation', () => {
    it('should preserve all next configuration fields', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'assistant_1',
            assistant_id: 'assistant1',
            next: {
              state_id: 'tool_1',
              output_key: 'analysis',
              include_in_llm_history: false,
              override_task: true,
              store_in_context: true,
              clear_prior_messages: false,
              clear_context_store: 'keep_current',
              reset_keys_in_context_store: ['key1', 'key2'],
            },
            _meta: {
              type: 'assistant',
              is_connected: true,
              position: { x: 100, y: 100 },
            },
          } as AssistantStateConfiguration,
        ],
        assistants: [],
      }

      const result = duplicateStateAction('assistant_1', config)
      const duplicatedState = result.config.states[1]

      // Navigation should be removed
      expect(duplicatedState.next?.state_id).toBeUndefined()

      // All config fields should be preserved
      expect(duplicatedState.next?.output_key).toBe('analysis')
      expect(duplicatedState.next?.include_in_llm_history).toBe(false)
      expect(duplicatedState.next?.override_task).toBe(true)
      expect(duplicatedState.next?.store_in_context).toBe(true)
      expect(duplicatedState.next?.clear_prior_messages).toBe(false)
      expect(duplicatedState.next?.clear_context_store).toBe('keep_current')
      expect(duplicatedState.next?.reset_keys_in_context_store).toEqual(['key1', 'key2'])
    })

    it('should remove all navigation-related fields', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'assistant_1',
            assistant_id: 'assistant1',
            next: {
              state_id: 'tool_1',
              state_ids: ['branch1', 'branch2'],
              iter_key: 'items',
              meta_next_state_id: 'decision_node',
              meta_iter_state_id: 'iterator_node',
              condition: {
                expression: 'test',
                then: '1', // nosonar
                otherwise: '2',
              },
              switch: {
                default: 'def',
                cases: [],
              },
              output_key: 'result',
            },
            _meta: {
              type: 'assistant',
              is_connected: true,
              position: { x: 100, y: 100 },
            },
          } as AssistantStateConfiguration,
        ],
        assistants: [],
      }

      const result = duplicateStateAction('assistant_1', config)
      const duplicatedState = result.config.states[1]

      // All navigation fields should be removed
      expect(duplicatedState.next?.state_id).toBeUndefined()
      expect(duplicatedState.next?.state_ids).toBeUndefined()
      expect(duplicatedState.next?.iter_key).toBeUndefined()
      expect(duplicatedState.next?.condition).toBeUndefined()
      expect(duplicatedState.next?.switch).toBeUndefined()
      expect(duplicatedState.next?.meta_next_state_id).toBeUndefined()
      expect(duplicatedState.next?.meta_iter_state_id).toBeUndefined()

      // Config field should be preserved
      expect(duplicatedState.next?.output_key).toBe('result')
    })

    it('should return undefined next if no configuration fields exist', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'assistant_1',
            assistant_id: 'assistant1',
            next: {
              state_id: 'tool_1',
              condition: {
                expression: 'test',
                then: '1', // nosonar
                otherwise: '2',
              },
              switch: {
                default: 'def',
                cases: [],
              },
            },
            _meta: {
              type: 'assistant',
              is_connected: true,
              position: { x: 100, y: 100 },
            },
          } as AssistantStateConfiguration,
        ],
        assistants: [],
      }

      const result = duplicateStateAction('assistant_1', config)
      const duplicatedState = result.config.states[1]

      expect(duplicatedState.next).toBeUndefined()
    })
  })

  describe('Execution state validation', () => {
    it('should not duplicate meta states (conditional)', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'conditional_1',
            _meta: {
              type: 'conditional',
              is_connected: true,
              position: { x: 100, y: 100 },
              data: {
                condition: {
                  expression: 'test',
                  then: 'state_1',
                  otherwise: 'state_2',
                },
              },
            },
          } as any,
        ],
        assistants: [],
      }

      const result = duplicateStateAction('conditional_1', config)

      // Should return config unchanged
      expect(result.config.states).toHaveLength(1)
      expect(result.config).toBe(config)
    })

    it('should not duplicate meta states (switch)', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'switch_1',
            _meta: {
              type: 'switch',
              is_connected: true,
              position: { x: 100, y: 100 },
            },
          } as any,
        ],
        assistants: [],
      }

      const result = duplicateStateAction('switch_1', config)

      // Should return config unchanged
      expect(result.config.states).toHaveLength(1)
      expect(result.config).toBe(config)
    })

    it('should not duplicate meta states (iterator)', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'iterator_1',
            _meta: {
              type: 'iterator',
              is_connected: true,
              position: { x: 100, y: 100 },
            },
          } as any,
        ],
        assistants: [],
      }

      const result = duplicateStateAction('iterator_1', config)

      // Should return config unchanged
      expect(result.config.states).toHaveLength(1)
      expect(result.config).toBe(config)
    })

    it('should duplicate note nodes (exception to meta state rule)', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'note_1',
            _meta: {
              id: 'note_1',
              type: 'note',
              is_connected: false,
              position: { x: 100, y: 100 },
              data: {
                note: 'This is a test note',
              },
            },
          } as any,
        ],
        assistants: [],
      }

      const result = duplicateStateAction('note_1', config)

      // Should duplicate note nodes
      expect(result.config.states).toHaveLength(2)
      expect(result.config.states[1].id).toBe('note_1_copy')
      expect(result.config.states[1]._meta?.id).toBe('note_1_copy')
      expect(result.config.states[1]._meta?.type).toBe('note')
      expect(result.config.states[1]._meta?.data.note).toBe('This is a test note')
      expect(result.config.states[1]._meta?.position?.y).toBe(200) // Original y (100) + OFFSET_X (100)
    })

    it('should duplicate execution states (assistant)', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'assistant_1',
            assistant_id: 'assistant1',
            _meta: {
              type: 'assistant',
              is_connected: true,
              position: { x: 100, y: 100 },
            },
          } as AssistantStateConfiguration,
        ],
        assistants: [],
      }

      const result = duplicateStateAction('assistant_1', config)

      // Should duplicate
      expect(result.config.states).toHaveLength(2)
      expect(result.config.states[1].id).toBe('assistant_1_copy')
    })

    it('should duplicate execution states (tool)', () => {
      const result = duplicateStateAction('tool_1', baseConfig)

      // Should duplicate
      expect(result.config.states).toHaveLength(3)
      expect(result.config.states[2].id).toBe('tool_1_copy')
    })

    it('should duplicate execution states (custom)', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'custom_1',
            custom_node_id: 'custom1',
            _meta: {
              type: 'custom',
              is_connected: true,
              position: { x: 50, y: 50 },
            },
          } as CustomNodeStateConfiguration,
        ],
        custom_nodes: [{ id: 'custom1', name: 'Custom Node' }],
      }

      const result = duplicateStateAction('custom_1', config)

      // Should duplicate
      expect(result.config.states).toHaveLength(2)
      expect(result.config.states[1].id).toBe('custom_1_copy')
    })

    it('should duplicate execution states (transform)', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'transform_1',
            custom_node_id: 'transform1',
            _meta: {
              type: 'transform',
              is_connected: true,
              position: { x: 50, y: 50 },
            },
          } as any,
        ],
        custom_nodes: [],
      }

      const result = duplicateStateAction('transform_1', config)

      // Should duplicate
      expect(result.config.states).toHaveLength(2)
      expect(result.config.states[1].id).toBe('transform_1_copy')
    })
  })

  describe('Edge cases', () => {
    it('should handle state with no next field', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'assistant_1',
            assistant_id: 'assistant1',
            task: 'Task 1',
            _meta: {
              type: 'assistant',
              is_connected: false,
              position: { x: 0, y: 0 },
            },
          } as AssistantStateConfiguration,
        ],
        assistants: [],
      }

      const result = duplicateStateAction('assistant_1', config)

      expect(result.config.states).toHaveLength(2)
      expect(result.config.states[1].next).toBeUndefined()
    })

    it('should handle state with position at (0, 0)', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'assistant_1',
            assistant_id: 'assistant1',
            _meta: {
              type: 'assistant',
              is_connected: false,
              position: { x: 0, y: 0 },
            },
          } as AssistantStateConfiguration,
        ],
        assistants: [],
      }

      const result = duplicateStateAction('assistant_1', config)
      const duplicatedState = result.config.states[1]

      expect(duplicatedState._meta?.position).toEqual({ x: 0, y: 100 })
    })

    it('should duplicate last state in the list', () => {
      const result = duplicateStateAction('tool_1', baseConfig)

      expect(result.config.states).toHaveLength(3)
      expect(result.config.states[2].id).toBe('tool_1_copy')
    })

    it('should not modify the original config object', () => {
      const originalStatesLength = baseConfig.states.length
      const originalFirstStateId = baseConfig.states[0].id

      duplicateStateAction('assistant_1', baseConfig)

      expect(baseConfig.states).toHaveLength(originalStatesLength)
      expect(baseConfig.states[0].id).toBe(originalFirstStateId)
    })
  })

  describe('Meta data preservation', () => {
    it('should preserve custom meta data fields', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'assistant_1',
            assistant_id: 'assistant1',
            _meta: {
              type: 'assistant',
              is_connected: true,
              position: { x: 100, y: 100 },
              data: {
                customField: 'value',
                next: { state_id: 'tool_1' },
              },
            },
          } as AssistantStateConfiguration,
        ],
        assistants: [],
      }

      const result = duplicateStateAction('assistant_1', config)
      const duplicatedState = result.config.states[1]

      expect(duplicatedState._meta?.data).toBeDefined()
      expect((duplicatedState._meta?.data as any)?.customField).toBe('value')
    })

    it('should preserve meta.data including next field', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'assistant_1',
            assistant_id: 'assistant1',
            _meta: {
              type: 'assistant',
              is_connected: true,
              position: { x: 100, y: 100 },
              data: {
                next: { state_id: 'tool_1' },
              },
            },
          } as AssistantStateConfiguration,
        ],
        assistants: [],
      }

      const result = duplicateStateAction('assistant_1', config)
      const duplicatedState = result.config.states[1]

      // Note: meta.data.next is preserved, only top-level next is removed
      expect(duplicatedState._meta?.data?.next).toEqual({ state_id: 'tool_1' })
    })
  })
})
