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
} from '@/types/workflowEditor/configuration'

import { updateStateConfigurationAction, ConfigurationUpdate } from '../updateState'

describe('updateState', () => {
  let baseConfig: WorkflowConfiguration

  beforeEach(() => {
    baseConfig = {
      states: [
        {
          id: 'state1',
          assistant_id: 'assistant1',
          task: 'Test task',
          _meta: { type: 'assistant', is_connected: true },
        } as AssistantStateConfiguration,
        {
          id: 'state2',
          assistant_id: 'assistant2',
          task: 'Another task',
          _meta: { type: 'assistant', is_connected: true },
        } as AssistantStateConfiguration,
      ],
      assistants: [
        { id: 'assistant1', name: 'Assistant 1', model: 'gpt-4' },
        { id: 'assistant2', name: 'Assistant 2', model: 'gpt-4' },
      ],
    }
  })

  describe('cleanup orphaned actors', () => {
    it('should cleanup all orphaned assistants, tools, and custom nodes together', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'state1',
            assistant_id: 'assistant1',
            _meta: { type: 'assistant', is_connected: true },
          },
          {
            id: 'state2',
            assistant_id: 'assistant2',
            _meta: { type: 'assistant', is_connected: true },
          },
          { id: 'state3', tool_id: 'tool1', _meta: { type: 'tool', is_connected: true } },
          {
            id: 'state4',
            custom_node_id: 'custom1',
            _meta: { type: 'custom', is_connected: true },
          },
        ] as StateConfiguration[],
        assistants: [
          { id: 'assistant1', name: 'Used 1', model: 'gpt-4' },
          { id: 'assistant2', name: 'Used 2', model: 'gpt-4' },
          { id: 'assistant3', name: 'Orphaned', model: 'gpt-4' },
        ],
        tools: [
          { id: 'tool1', tool: 'used_tool' },
          { id: 'tool2', tool: 'orphaned_tool' },
        ],
        custom_nodes: [
          { id: 'custom1', name: 'Used Custom' },
          { id: 'custom2', name: 'Orphaned Custom' },
        ],
      }

      const update: ConfigurationUpdate = {
        state: { id: 'state1', data: { task: 'Updated task' } },
      }

      const result = updateStateConfigurationAction(config, update)

      // Only referenced actors should remain
      expect(result.config.assistants).toHaveLength(2)
      expect(result.config.assistants?.map((a) => a.id)).toEqual(['assistant1', 'assistant2'])
      expect(result.config.tools).toHaveLength(1)
      expect(result.config.tools?.[0].id).toBe('tool1')
      expect(result.config.custom_nodes).toHaveLength(1)
      expect(result.config.custom_nodes?.[0].id).toBe('custom1')
    })

    it('should remove actors when state references change', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'state1',
            assistant_id: 'assistant1',
            _meta: { type: 'assistant', is_connected: true },
          },
        ] as StateConfiguration[],
        assistants: [
          { id: 'assistant1', name: 'Old', model: 'gpt-4' },
          { id: 'assistant2', name: 'New', model: 'gpt-4' },
        ],
      }

      // Change assistant reference
      const result = updateStateConfigurationAction(config, {
        state: { id: 'state1', data: { assistant_id: 'assistant2' } },
      })

      // Old assistant should be removed, new one should remain
      expect(result.config.assistants).toHaveLength(1)
      expect(result.config.assistants?.[0].id).toBe('assistant2')
    })

    it('should handle empty and undefined actor arrays', () => {
      const configs = [
        // Empty arrays
        {
          states: [
            {
              id: 'state1',
              assistant_id: 'assistant1',
              _meta: { type: 'assistant', is_connected: true },
            },
          ] as StateConfiguration[],
          assistants: [],
          tools: [],
          custom_nodes: [],
        },
        // Undefined arrays
        {
          states: [
            {
              id: 'state1',
              assistant_id: 'assistant1',
              _meta: { type: 'assistant', is_connected: true },
            },
          ] as StateConfiguration[],
        },
      ]

      configs.forEach((config) => {
        const result = updateStateConfigurationAction(config, {
          state: { id: 'state1', data: { task: 'Test' } },
        })

        if (config.assistants !== undefined) {
          expect(result.config.assistants).toEqual([])
        } else {
          expect(result.config.assistants).toBeUndefined()
        }
        if (config.tools !== undefined) {
          expect(result.config.tools).toEqual([])
        } else {
          expect(result.config.tools).toBeUndefined()
        }
        if (config.custom_nodes !== undefined) {
          expect(result.config.custom_nodes).toEqual([])
        } else {
          expect(result.config.custom_nodes).toBeUndefined()
        }
      })
    })
  })

  describe('applyAssistantUpdates', () => {
    it('should add new assistant and state that references it', () => {
      const update: ConfigurationUpdate = {
        state: {
          id: 'state1',
          data: { assistant_id: 'assistant3' },
        },
        actors: {
          assistants: [{ id: 'assistant3', name: 'New Assistant', model: 'gpt-4' }],
        },
      }

      const result = updateStateConfigurationAction(baseConfig, update)

      // assistant1 removed (no longer referenced), assistant2 kept, assistant3 added
      expect(result.config.assistants).toHaveLength(2)
      expect(result.config.assistants?.find((a) => a.id === 'assistant3')).toBeDefined()
      expect(result.config.assistants?.find((a) => a.id === 'assistant2')).toBeDefined()
    })

    it('should update existing assistant', () => {
      const update: ConfigurationUpdate = {
        actors: {
          assistants: [{ id: 'assistant1', name: 'Updated Name', model: 'gpt-4-turbo' }],
        },
      }

      const result = updateStateConfigurationAction(baseConfig, update)

      expect(result.config.assistants).toHaveLength(2)
      const updated = result.config.assistants?.find((a) => a.id === 'assistant1')
      expect(updated?.name).toBe('Updated Name')
      expect(updated?.model).toBe('gpt-4-turbo')
    })

    it('should handle multiple assistant updates', () => {
      // Add a state that references assistant3
      const configWithExtraState: WorkflowConfiguration = {
        ...baseConfig,
        states: [
          ...baseConfig.states,
          {
            id: 'state3',
            assistant_id: 'assistant3',
            _meta: { type: 'assistant', is_connected: true },
          } as AssistantStateConfiguration,
        ],
      }

      const update: ConfigurationUpdate = {
        actors: {
          assistants: [
            { id: 'assistant1', name: 'Updated 1', model: 'gpt-4' },
            { id: 'assistant3', name: 'New', model: 'gpt-4' },
          ],
        },
      }

      const result = updateStateConfigurationAction(configWithExtraState, update)

      expect(result.config.assistants).toHaveLength(3)
      expect(result.config.assistants?.find((a) => a.id === 'assistant1')?.name).toBe('Updated 1')
      expect(result.config.assistants?.find((a) => a.id === 'assistant3')).toBeDefined()
    })
  })

  describe('applyStateUpdate', () => {
    it('should update state configuration', () => {
      const update: ConfigurationUpdate = {
        state: {
          id: 'state1',
          data: {
            task: 'Updated task',
            interrupt_before: true,
          },
        },
      }

      const result = updateStateConfigurationAction(baseConfig, update)

      const updatedState = result.config.states.find(
        (s) => s.id === 'state1'
      ) as AssistantStateConfiguration
      expect(updatedState?.task).toBe('Updated task')
      expect(updatedState?.interrupt_before).toBe(true)
    })

    it('should handle state ID rename', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'old_id',
            assistant_id: 'assistant1',
            task: 'Test task',
            _meta: { type: 'assistant', is_connected: true },
          } as AssistantStateConfiguration,
          {
            id: 'state2',
            assistant_id: 'assistant2',
            next: { state_id: 'old_id' },
            _meta: { type: 'assistant', is_connected: true },
          } as AssistantStateConfiguration,
        ],
        assistants: [
          { id: 'assistant1', name: 'Test 1', model: 'gpt-4' },
          { id: 'assistant2', name: 'Test 2', model: 'gpt-4' },
        ],
      }

      const update: ConfigurationUpdate = {
        state: {
          id: 'old_id',
          data: {
            id: 'new_id',
            task: 'Updated task',
          },
        },
      }

      const result = updateStateConfigurationAction(config, update)

      const renamedState = result.config.states.find(
        (s) => s.id === 'new_id'
      ) as AssistantStateConfiguration
      expect(renamedState).toBeDefined()
      expect(renamedState?.task).toBe('Updated task')

      // Check the old ID no longer exists
      const oldState = result.config.states.find((s) => s.id === 'old_id')
      expect(oldState).toBeUndefined()

      // Check references were updated
      const referencingState = result.config.states.find((s) => s.id === 'state2')
      expect(referencingState?.next?.state_id).toBe('new_id')
    })

    it('should return config unchanged if state not found', () => {
      const update: ConfigurationUpdate = {
        state: {
          id: 'nonexistent',
          data: { task: 'Test' },
        },
      }

      const result = updateStateConfigurationAction(baseConfig, update)

      expect(result.config).toEqual(baseConfig)
    })
  })

  describe('iterator parent key propagation', () => {
    it('should propagate iter_key to parent states when iterator is updated', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'iterator_123',
            _meta: {
              type: 'iterator',
              is_connected: true,
              data: {
                next: { iter_key: 'old_items' },
              },
            },
          } as StateConfiguration,
          {
            id: 'child1',
            next: { meta_iter_state_id: 'iterator_123' },
            _meta: { type: 'assistant', is_connected: true },
          } as StateConfiguration,
          {
            id: 'parent1',
            next: { state_id: 'child1', iter_key: 'old_items' },
            _meta: { type: 'assistant', is_connected: true },
          } as StateConfiguration,
        ],
      }

      const update: ConfigurationUpdate = {
        state: {
          id: 'iterator_123',
          data: {
            next: { iter_key: 'new_items' },
          },
        },
      }

      const result = updateStateConfigurationAction(config, update)

      const parent1 = result.config.states.find((s) => s.id === 'parent1')
      expect(parent1?.next?.iter_key).toBe('new_items')
    })

    it('should propagate iter_key to multiple parents when iterator has multiple children', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'iterator_123',
            _meta: {
              type: 'iterator',
              is_connected: true,
              data: {
                next: { iter_key: 'items' },
              },
            },
          } as StateConfiguration,
          {
            id: 'child1',
            next: { meta_iter_state_id: 'iterator_123' },
            _meta: { type: 'assistant', is_connected: true },
          } as StateConfiguration,
          {
            id: 'child2',
            next: { meta_iter_state_id: 'iterator_123' },
            _meta: { type: 'assistant', is_connected: true },
          } as StateConfiguration,
          {
            id: 'parent1',
            next: { state_id: 'child1', iter_key: 'items' },
            _meta: { type: 'assistant', is_connected: true },
          } as StateConfiguration,
          {
            id: 'parent2',
            next: { state_id: 'child2', iter_key: 'items' },
            _meta: { type: 'assistant', is_connected: true },
          } as StateConfiguration,
        ],
      }

      const update: ConfigurationUpdate = {
        state: {
          id: 'iterator_123',
          data: {
            next: { iter_key: 'updated_items' },
          },
        },
      }

      const result = updateStateConfigurationAction(config, update)

      const parent1 = result.config.states.find((s) => s.id === 'parent1')
      const parent2 = result.config.states.find((s) => s.id === 'parent2')
      expect(parent1?.next?.iter_key).toBe('updated_items')
      expect(parent2?.next?.iter_key).toBe('updated_items')
    })

    it('should not update unrelated parents when iterator is updated', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'iterator_123',
            _meta: {
              type: 'iterator',
              is_connected: true,
              data: {
                next: { iter_key: 'items' },
              },
            },
          } as StateConfiguration,
          {
            id: 'child1',
            next: { meta_iter_state_id: 'iterator_123' },
            _meta: { type: 'assistant', is_connected: true },
          } as StateConfiguration,
          {
            id: 'parent1',
            next: { state_id: 'child1', iter_key: 'items' },
            _meta: { type: 'assistant', is_connected: true },
          } as StateConfiguration,
          {
            id: 'unrelated_parent',
            next: { iter_key: 'should_not_change' },
            _meta: { type: 'assistant', is_connected: true },
          } as StateConfiguration,
        ],
      }

      const update: ConfigurationUpdate = {
        state: {
          id: 'iterator_123',
          data: {
            next: { iter_key: 'new_items' },
          },
        },
      }

      const result = updateStateConfigurationAction(config, update)

      const unrelatedParent = result.config.states.find((s) => s.id === 'unrelated_parent')
      expect(unrelatedParent?.next?.iter_key).toBe('should_not_change')
    })

    it('should do nothing when iterator has no children', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'iterator_123',
            _meta: {
              type: 'iterator',
              is_connected: true,
              data: {
                next: { iter_key: 'items' },
              },
            },
          } as StateConfiguration,
          {
            id: 'some_state',
            next: { iter_key: 'other_items' },
            _meta: { type: 'assistant', is_connected: true },
          } as StateConfiguration,
        ],
      }

      const update: ConfigurationUpdate = {
        state: {
          id: 'iterator_123',
          data: {
            next: { iter_key: 'new_items' },
          },
        },
      }

      const result = updateStateConfigurationAction(config, update)

      const someState = result.config.states.find((s) => s.id === 'some_state')
      expect(someState?.next?.iter_key).toBe('other_items')
    })
  })

  describe('decision meta state updates', () => {
    it('should update conditional meta state', () => {
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
                    expression: 'old_condition',
                    then: 'state1',
                    otherwise: 'state2',
                  },
                },
              },
            },
          } as StateConfiguration,
        ],
      }

      const update: ConfigurationUpdate = {
        state: {
          id: 'conditional_123',
          data: {
            next: {
              condition: {
                expression: 'new_condition',
                then: 'state1',
                otherwise: 'state2',
              },
            },
          },
        },
      }

      const result = updateStateConfigurationAction(config, update)

      const updated = result.config.states.find((s) => s.id === 'conditional_123')
      expect(updated?._meta?.data?.next?.condition?.expression).toBe('new_condition')
    })

    it('should sync decision meta state changes back to parent state', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'parent_state',
            assistant_id: 'assistant1',
            next: {
              meta_next_state_id: 'conditional_123',
              condition: {
                expression: 'old_expression',
                then: 'state1',
                otherwise: 'state2',
              },
            },
            _meta: { type: 'assistant', is_connected: true },
          } as StateConfiguration,
          {
            id: 'conditional_123',
            _meta: {
              type: 'conditional',
              is_connected: true,
              data: {
                next: {
                  condition: {
                    expression: 'old_expression',
                    then: 'state1',
                    otherwise: 'state2',
                  },
                },
              },
            },
          } as StateConfiguration,
        ],
        assistants: [{ id: 'assistant1', name: 'Test', model: 'gpt-4' }],
      }

      const update: ConfigurationUpdate = {
        state: {
          id: 'conditional_123',
          data: {
            next: {
              condition: {
                expression: 'updated_expression',
                then: 'state1',
                otherwise: 'state2',
              },
            },
          },
        },
      }

      const result = updateStateConfigurationAction(config, update)

      // Meta state should be updated
      const metaState = result.config.states.find((s) => s.id === 'conditional_123')
      expect(metaState?._meta?.data?.next?.condition?.expression).toBe('updated_expression')

      // Parent state should also be updated
      const parentState = result.config.states.find((s) => s.id === 'parent_state')
      expect(parentState?.next?.condition?.expression).toBe('updated_expression')
    })

    it('should update switch meta state', () => {
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
                    variable: 'old_var',
                    cases: [{ value: 'case1', state_id: 'state1' }],
                    default: 'state2',
                  },
                },
              },
            },
          } as StateConfiguration,
        ],
      }

      const update: ConfigurationUpdate = {
        state: {
          id: 'switch_123',
          data: {
            next: {
              switch: {
                variable: 'new_var',
                cases: [{ value: 'case1', state_id: 'state1' }],
                default: 'state2',
              },
            },
          },
        },
      }

      const result = updateStateConfigurationAction(config, update)

      const updated = result.config.states.find((s) => s.id === 'switch_123')
      expect(updated?._meta?.data?.next?.switch?.variable).toBe('new_var')
    })

    it('should not sync to parent when no parent exists', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'orphaned_conditional',
            _meta: {
              type: 'conditional',
              is_connected: false,
              data: {
                next: {
                  condition: {
                    expression: 'old_condition',
                    then: 'state1',
                    otherwise: 'state2',
                  },
                },
              },
            },
          } as StateConfiguration,
        ],
      }

      const update: ConfigurationUpdate = {
        state: {
          id: 'orphaned_conditional',
          data: {
            next: {
              condition: {
                expression: 'new_condition',
                then: 'state1',
                otherwise: 'state2',
              },
            },
          },
        },
      }

      const result = updateStateConfigurationAction(config, update)

      const updated = result.config.states.find((s) => s.id === 'orphaned_conditional')
      expect(updated?._meta?.data?.next?.condition?.expression).toBe('new_condition')
      expect(result.config.states).toHaveLength(1)
    })
  })

  describe('combined updates', () => {
    it('should handle state and assistant updates together', () => {
      const update: ConfigurationUpdate = {
        state: {
          id: 'state1',
          data: { task: 'Updated task' },
        },
        actors: {
          assistants: [{ id: 'assistant1', name: 'Updated Assistant', model: 'gpt-4' }],
        },
      }

      const result = updateStateConfigurationAction(baseConfig, update)

      const state = result.config.states.find(
        (s) => s.id === 'state1'
      ) as AssistantStateConfiguration
      expect(state?.task).toBe('Updated task')

      const assistant = result.config.assistants?.find((a) => a.id === 'assistant1')
      expect(assistant?.name).toBe('Updated Assistant')
    })

    it('should cleanup orphaned assistants after all updates', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'state1',
            assistant_id: 'assistant1',
            _meta: { type: 'assistant', is_connected: true },
          },
        ] as AssistantStateConfiguration[],
        assistants: [
          { id: 'assistant1', name: 'Used', model: 'gpt-4' },
          { id: 'assistant2', name: 'Orphaned', model: 'gpt-4' },
        ],
      }

      const update: ConfigurationUpdate = {
        state: {
          id: 'state1',
          data: { assistant_id: 'assistant3' },
        },
        actors: {
          assistants: [{ id: 'assistant3', name: 'New', model: 'gpt-4' }],
        },
      }

      const result = updateStateConfigurationAction(config, update)

      // Only assistant3 should remain (assistant1 and assistant2 are orphaned)
      expect(result.config.assistants).toHaveLength(1)
      expect(result.config.assistants?.[0].id).toBe('assistant3')
    })
  })

  describe('edge cases', () => {
    it('should handle empty states array', () => {
      const config: WorkflowConfiguration = {
        states: [],
        assistants: [{ id: 'assistant1', name: 'Test', model: 'gpt-4' }],
      }

      const update: ConfigurationUpdate = {
        actors: {
          assistants: [{ id: 'assistant2', name: 'New', model: 'gpt-4' }],
        },
      }

      const result = updateStateConfigurationAction(config, update)

      // All assistants should be cleaned up (no states reference them)
      expect(result.config.assistants).toHaveLength(0)
    })

    it('should handle undefined state data', () => {
      const update: ConfigurationUpdate = {
        state: {
          id: 'state1',
          data: {},
        },
      }

      const result = updateStateConfigurationAction(baseConfig, update)

      expect(result.config.states.find((s) => s.id === 'state1')).toBeDefined()
    })

    it('should preserve referenced actors and cleanup orphaned ones', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'state1',
            assistant_id: 'assistant1',
            _meta: { type: 'assistant', is_connected: true },
          },
          { id: 'state2', tool_id: 'tool1', _meta: { type: 'tool', is_connected: true } },
          {
            id: 'state3',
            custom_node_id: 'custom1',
            _meta: { type: 'custom', is_connected: true },
          },
        ] as StateConfiguration[],
        assistants: [
          { id: 'assistant1', name: 'Used', model: 'gpt-4' },
          { id: 'assistant2', name: 'Orphaned', model: 'gpt-4' },
        ],
        tools: [
          { id: 'tool1', tool: 'used_tool' },
          { id: 'tool2', tool: 'orphaned_tool' },
        ],
        custom_nodes: [
          { id: 'custom1', name: 'Used Custom' },
          { id: 'custom2', name: 'Orphaned Custom' },
        ],
      }

      const update: ConfigurationUpdate = {
        state: { id: 'state1', data: { task: 'Test' } },
      }

      const result = updateStateConfigurationAction(config, update)

      // Should keep only referenced actors
      expect(result.config.assistants).toHaveLength(1)
      expect(result.config.assistants?.[0].id).toBe('assistant1')
      expect(result.config.tools).toHaveLength(1)
      expect(result.config.tools?.[0].id).toBe('tool1')
      expect(result.config.custom_nodes).toHaveLength(1)
      expect(result.config.custom_nodes?.[0].id).toBe('custom1')
    })
  })
})
