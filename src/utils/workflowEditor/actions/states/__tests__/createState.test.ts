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
import {
  WorkflowConfiguration,
  StateConfiguration,
  CustomNodeStateConfiguration,
  AssistantStateConfiguration,
  ToolStateConfiguration,
} from '@/types/workflowEditor/configuration'

import { createStateAction } from '../createState'

describe('createState', () => {
  let baseConfig: WorkflowConfiguration
  const testPosition = { x: 100, y: 200 }

  beforeEach(() => {
    baseConfig = {
      states: [
        {
          id: 'assistant_1',
          assistant_id: 'assistant1',
          task: 'Task 1',
          _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
        } as AssistantStateConfiguration,
      ],
      assistants: [{ id: 'assistant1', name: 'Assistant 1', model: 'gpt-4' }],
    }
  })

  describe('ID generation', () => {
    it('should generate ID with suffix 1 for first node of type', () => {
      const config: WorkflowConfiguration = {
        states: [],
        assistants: [],
      }

      const result = createStateAction(NodeTypes.ASSISTANT, testPosition, config)

      expect(result.config.states).toHaveLength(1)
      expect(result.config.states[0].id).toBe('assistant_1')
    })

    it('should increment ID based on existing nodes', () => {
      const result = createStateAction(NodeTypes.ASSISTANT, testPosition, baseConfig)

      expect(result.config.states).toHaveLength(2)
      expect(result.config.states[1].id).toBe('assistant_2')
    })

    it('should handle gaps in numbering', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'tool_1',
            tool_name: 'tool1',
            _meta: { type: 'tool', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
          {
            id: 'tool_5',
            tool_name: 'tool5',
            _meta: { type: 'tool', is_connected: true, position: { x: 0, y: 0 } },
          } as StateConfiguration,
        ],
      }

      const result = createStateAction(NodeTypes.TOOL, testPosition, config)

      expect(result.config.states).toHaveLength(3)
      expect(result.config.states[2].id).toBe('tool_6')
    })

    it('should generate different IDs for different node types', () => {
      const result1 = createStateAction(NodeTypes.ASSISTANT, testPosition, baseConfig)
      const result2 = createStateAction(NodeTypes.TOOL, testPosition, result1.config)
      const result3 = createStateAction(NodeTypes.CUSTOM, testPosition, result2.config)

      expect(result1.config.states[1].id).toBe('assistant_2')
      expect(result2.config.states[2].id).toBe('tool_1')
      expect(result3.config.states[3].id).toBe('custom_1')
    })

    it('should handle non-numeric suffixes gracefully', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'assistant_abc',
            assistant_id: 'assistant1',
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as AssistantStateConfiguration,
          {
            id: 'assistant_2',
            assistant_id: 'assistant2',
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as AssistantStateConfiguration,
        ],
        assistants: [
          { id: 'assistant1', name: 'Test 1', model: 'gpt-4' },
          { id: 'assistant2', name: 'Test 2', model: 'gpt-4' },
        ],
      }

      const result = createStateAction(NodeTypes.ASSISTANT, testPosition, config)

      expect(result.config.states[2].id).toBe('assistant_3')
    })
  })

  describe('assistant node creation', () => {
    it('should create assistant state with correct structure', () => {
      const result = createStateAction(NodeTypes.ASSISTANT, testPosition, baseConfig)

      const newState = result.config.states[1] as AssistantStateConfiguration
      expect(newState.id).toBe('assistant_2')
      expect(newState.assistant_id).toBe('')
      expect(newState.next).toEqual({})
      expect(newState._meta?.type).toBe('assistant')
      expect(newState._meta?.is_connected).toBe(false)
      expect(newState._meta?.position).toEqual(testPosition)
    })
  })

  describe('tool node creation', () => {
    it('should create tool state with correct structure', () => {
      const result = createStateAction(NodeTypes.TOOL, testPosition, baseConfig)

      const newState = result.config.states[1] as ToolStateConfiguration
      expect(newState.id).toBe('tool_1')
      expect(newState.tool_id).toBe('')
      expect(newState.next).toEqual({})
      expect(newState._meta?.type).toBe('tool')
      expect(newState._meta?.is_connected).toBe(false)
      expect(newState._meta?.position).toEqual(testPosition)
    })
  })

  describe('custom node creation', () => {
    it('should create custom state with correct structure', () => {
      const result = createStateAction(NodeTypes.CUSTOM, testPosition, baseConfig)

      const newState = result.config.states[1] as CustomNodeStateConfiguration
      expect(newState.id).toBe('custom_1')
      expect(newState.custom_node_id).toBe('')
      expect(newState.next).toEqual({})
      expect(newState._meta?.type).toBe('custom')
      expect(newState._meta?.is_connected).toBe(false)
      expect(newState._meta?.position).toEqual(testPosition)
    })
  })

  describe('conditional node creation', () => {
    it('should create conditional state with condition structure', () => {
      const result = createStateAction(NodeTypes.CONDITIONAL, testPosition, baseConfig)

      const newState = result.config.states[1]
      expect(newState.id).toBe('conditional_1')
      expect(newState._meta?.type).toBe('conditional')
      expect(newState._meta?.is_connected).toBe(false)
      expect(newState._meta?.position).toEqual(testPosition)
      expect(newState._meta?.data?.next).toEqual({
        condition: {
          expression: '',
          then: '',
          otherwise: '',
        },
      })
    })

    it('should create multiple conditionals with incremented IDs', () => {
      const result1 = createStateAction(NodeTypes.CONDITIONAL, testPosition, baseConfig)
      const result2 = createStateAction(NodeTypes.CONDITIONAL, { x: 200, y: 300 }, result1.config)

      expect(result1.config.states[1].id).toBe('conditional_1')
      expect(result2.config.states[2].id).toBe('conditional_2')
    })
  })

  describe('switch node creation', () => {
    it('should create switch state with switch structure', () => {
      const result = createStateAction(NodeTypes.SWITCH, testPosition, baseConfig)

      const newState = result.config.states[1]
      expect(newState.id).toBe('switch_1')
      expect(newState._meta?.type).toBe('switch')
      expect(newState._meta?.is_connected).toBe(false)
      expect(newState._meta?.position).toEqual(testPosition)
      expect(newState._meta?.data?.next).toEqual({
        switch: {
          cases: [
            {
              condition: 'x == true',
              state_id: '',
            },
          ],
          default: '',
        },
      })
    })

    it('should create multiple switches with incremented IDs', () => {
      const result1 = createStateAction(NodeTypes.SWITCH, testPosition, baseConfig)
      const result2 = createStateAction(NodeTypes.SWITCH, { x: 200, y: 300 }, result1.config)

      expect(result1.config.states[1].id).toBe('switch_1')
      expect(result2.config.states[2].id).toBe('switch_2')
    })
  })

  describe('iterator node creation', () => {
    it('should create iterator state with iter_key and dimensions', () => {
      const result = createStateAction(NodeTypes.ITERATOR, testPosition, baseConfig)

      const newState = result.config.states[1]
      expect(newState.id).toBe('iterator_1')
      expect(newState.next).toEqual({})
      expect(newState._meta?.type).toBe('iterator')
      expect(newState._meta?.is_connected).toBe(false)
      expect(newState._meta?.position).toEqual(testPosition)
      expect(newState._meta?.data?.next?.iter_key).toBe('item')
      expect(newState._meta?.measured?.width).toBeDefined()
      expect(newState._meta?.measured?.height).toBeDefined()
    })

    it('should have default iterator dimensions', () => {
      const result = createStateAction(NodeTypes.ITERATOR, testPosition, baseConfig)

      const newState = result.config.states[1]
      expect(typeof newState._meta?.measured?.width).toBe('number')
      expect(typeof newState._meta?.measured?.height).toBe('number')
      expect(newState._meta?.measured?.width).toBeGreaterThan(0)
      expect(newState._meta?.measured?.height).toBeGreaterThan(0)
    })
  })

  describe('note node creation', () => {
    it('should create note state with note data', () => {
      const result = createStateAction(NodeTypes.NOTE, testPosition, baseConfig)

      const newState = result.config.states[1]
      expect(newState.id).toBe('note_1')
      expect(newState.next).toEqual({})
      expect(newState._meta?.type).toBe('note')
      expect(newState._meta?.is_connected).toBe(false)
      expect(newState._meta?.position).toEqual(testPosition)
      expect(newState._meta?.data?.note).toBe('')
    })
  })

  describe('position handling', () => {
    it('should set correct position for created node', () => {
      const position = { x: 500, y: 750 }
      const result = createStateAction(NodeTypes.ASSISTANT, position, baseConfig)

      expect(result.config.states[1]._meta?.position).toEqual(position)
    })

    it('should handle different positions for multiple nodes', () => {
      const pos1 = { x: 100, y: 200 }
      const pos2 = { x: 300, y: 400 }

      const result1 = createStateAction(NodeTypes.ASSISTANT, pos1, baseConfig)
      const result2 = createStateAction(NodeTypes.TOOL, pos2, result1.config)

      expect(result1.config.states[1]._meta?.position).toEqual(pos1)
      expect(result2.config.states[2]._meta?.position).toEqual(pos2)
    })

    it('should handle negative positions', () => {
      const position = { x: -100, y: -200 }
      const result = createStateAction(NodeTypes.ASSISTANT, position, baseConfig)

      expect(result.config.states[1]._meta?.position).toEqual(position)
    })
  })

  describe('config preservation', () => {
    it('should preserve existing states', () => {
      const result = createStateAction(NodeTypes.TOOL, testPosition, baseConfig)

      expect(result.config.states[0]).toEqual(baseConfig.states[0])
    })

    it('should preserve other config properties', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'assistant_1',
            assistant_id: 'assistant1',
            _meta: { type: 'assistant', is_connected: true, position: { x: 0, y: 0 } },
          } as AssistantStateConfiguration,
        ],
        assistants: [{ id: 'assistant1', name: 'Test', model: 'gpt-4' }],
        tools: [{ id: 'tool1', tool: 'some_tool' }],
        custom_nodes: [{ id: 'custom1', name: 'Custom' }],
      }

      const result = createStateAction(NodeTypes.ASSISTANT, testPosition, config)

      expect(result.config.assistants).toEqual(config.assistants)
      expect(result.config.tools).toEqual(config.tools)
      expect(result.config.custom_nodes).toEqual(config.custom_nodes)
    })

    it('should not mutate original config', () => {
      const originalStates = [...baseConfig.states]

      createStateAction(NodeTypes.ASSISTANT, testPosition, baseConfig)

      expect(baseConfig.states).toEqual(originalStates)
    })

    it('should append new state to end of states array', () => {
      const result = createStateAction(NodeTypes.TOOL, testPosition, baseConfig)

      expect(result.config.states).toHaveLength(2)
      expect(result.config.states[0].id).toBe('assistant_1')
      expect(result.config.states[1].id).toBe('tool_1')
    })
  })

  describe('edge cases', () => {
    it('should handle empty states array', () => {
      const config: WorkflowConfiguration = {
        states: [],
        assistants: [],
      }

      const result = createStateAction(NodeTypes.ASSISTANT, testPosition, config)

      expect(result.config.states).toHaveLength(1)
      expect(result.config.states[0].id).toBe('assistant_1')
    })

    it('should handle creating multiple nodes in sequence', () => {
      let config = baseConfig

      for (let i = 2; i <= 5; i += 1) {
        const result = createStateAction(NodeTypes.ASSISTANT, testPosition, config)
        config = result.config
        expect(result.config.states.at(-1)?.id).toBe(`assistant_${i}`)
      }

      expect(config.states).toHaveLength(5)
    })

    it('should handle creating same type nodes with different positions', () => {
      const result1 = createStateAction(NodeTypes.ASSISTANT, { x: 0, y: 0 }, baseConfig)
      const result2 = createStateAction(NodeTypes.ASSISTANT, { x: 100, y: 100 }, result1.config)
      const result3 = createStateAction(NodeTypes.ASSISTANT, { x: 200, y: 200 }, result2.config)

      expect(result3.config.states).toHaveLength(4)
      expect(result3.config.states[1].id).toBe('assistant_2')
      expect(result3.config.states[2].id).toBe('assistant_3')
      expect(result3.config.states[3].id).toBe('assistant_4')
    })

    it('should set is_connected to false for all new nodes', () => {
      const types = [
        NodeTypes.ASSISTANT,
        NodeTypes.TOOL,
        NodeTypes.CUSTOM,
        NodeTypes.CONDITIONAL,
        NodeTypes.SWITCH,
        NodeTypes.ITERATOR,
        NodeTypes.NOTE,
      ]

      types.forEach((type) => {
        const result = createStateAction(type, testPosition, baseConfig)
        const newState = result.config.states[result.config.states.length - 1]
        expect(newState._meta?.is_connected).toBe(false)
      })
    })
  })

  describe('all node types', () => {
    it('should create all supported node types correctly', () => {
      let config = baseConfig

      // Assistant
      config = createStateAction(NodeTypes.ASSISTANT, testPosition, config).config
      expect(config.states[config.states.length - 1]._meta?.type).toBe('assistant')

      // Tool
      config = createStateAction(NodeTypes.TOOL, testPosition, config).config
      expect(config.states[config.states.length - 1]._meta?.type).toBe('tool')

      // Custom
      config = createStateAction(NodeTypes.CUSTOM, testPosition, config).config
      expect(config.states[config.states.length - 1]._meta?.type).toBe('custom')

      // Conditional
      config = createStateAction(NodeTypes.CONDITIONAL, testPosition, config).config
      expect(config.states[config.states.length - 1]._meta?.type).toBe('conditional')

      // Switch
      config = createStateAction(NodeTypes.SWITCH, testPosition, config).config
      expect(config.states[config.states.length - 1]._meta?.type).toBe('switch')

      // Iterator
      config = createStateAction(NodeTypes.ITERATOR, testPosition, config).config
      expect(config.states[config.states.length - 1]._meta?.type).toBe('iterator')

      // Note
      config = createStateAction(NodeTypes.NOTE, testPosition, config).config
      expect(config.states[config.states.length - 1]._meta?.type).toBe('note')

      expect(config.states).toHaveLength(8) // 1 base + 7 new
    })
  })
})
