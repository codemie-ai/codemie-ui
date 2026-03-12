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

import { describe, it, expect } from 'vitest'

import { NodeTypes, ActorTypes } from '@/types/workflowEditor/base'
import {
  WorkflowConfiguration,
  StateConfiguration,
  AssistantStateConfiguration,
  ToolStateConfiguration,
  CustomNodeStateConfiguration,
} from '@/types/workflowEditor/configuration'

import { generateStateID, generateActorID, shouldReuseActorId } from '../idGenerators'

describe('idGenerators', () => {
  describe('generateStateID', () => {
    it('generates first ID when no existing states', () => {
      const id = generateStateID(NodeTypes.ASSISTANT, [])
      expect(id).toBe('assistant_1')
    })

    it('generates incremental IDs for different node types', () => {
      const states: StateConfiguration[] = []

      expect(generateStateID(NodeTypes.ASSISTANT, states)).toBe('assistant_1')
      expect(generateStateID(NodeTypes.TOOL, states)).toBe('tool_1')
      expect(generateStateID(NodeTypes.ITERATOR, states)).toBe('iterator_1')
      expect(generateStateID(NodeTypes.CONDITIONAL, states)).toBe('conditional_1')
      expect(generateStateID(NodeTypes.SWITCH, states)).toBe('switch_1')
    })

    it('generates next incremental ID based on existing states', () => {
      const states: StateConfiguration[] = [
        { id: 'assistant_1' } as StateConfiguration,
        { id: 'assistant_2' } as StateConfiguration,
      ]

      const id = generateStateID(NodeTypes.ASSISTANT, states)
      expect(id).toBe('assistant_3')
    })

    it('handles non-sequential existing IDs', () => {
      const states: StateConfiguration[] = [
        { id: 'assistant_1' } as StateConfiguration,
        { id: 'assistant_5' } as StateConfiguration,
        { id: 'assistant_3' } as StateConfiguration,
      ]

      const id = generateStateID(NodeTypes.ASSISTANT, states)
      expect(id).toBe('assistant_6')
    })

    it('ignores states with different prefixes', () => {
      const states: StateConfiguration[] = [
        { id: 'assistant_1' } as StateConfiguration,
        { id: 'tool_5' } as StateConfiguration,
        { id: 'assistant_2' } as StateConfiguration,
      ]

      const id = generateStateID(NodeTypes.ASSISTANT, states)
      expect(id).toBe('assistant_3')
    })

    it('handles states with invalid number suffixes', () => {
      const states: StateConfiguration[] = [
        { id: 'assistant_1' } as StateConfiguration,
        { id: 'assistant_abc' } as StateConfiguration,
        { id: 'assistant_2' } as StateConfiguration,
      ]

      const id = generateStateID(NodeTypes.ASSISTANT, states)
      expect(id).toBe('assistant_3')
    })

    it('generates ID with underscore in node type', () => {
      const states: StateConfiguration[] = []
      const id = generateStateID(NodeTypes.CUSTOM, states)
      expect(id).toBe('custom_1')
    })
  })

  describe('generateActorID', () => {
    it('generates first ID when no existing actors', () => {
      const config: WorkflowConfiguration = {
        states: [],
        assistants: [],
      }

      const id = generateActorID(ActorTypes.Assistant, config)
      expect(id).toBe('assistant_1')
    })

    it('generates IDs for different actor types', () => {
      const config: WorkflowConfiguration = {
        states: [],
        assistants: [],
        tools: [],
        custom_nodes: [],
      }

      expect(generateActorID(ActorTypes.Assistant, config)).toBe('assistant_1')
      expect(generateActorID(ActorTypes.Tool, config)).toBe('tool_1')
      expect(generateActorID(ActorTypes.CustomNode, config)).toBe('custom_node_1')
    })

    it('generates next incremental ID for assistants', () => {
      const config: WorkflowConfiguration = {
        states: [],
        assistants: [{ id: 'assistant_1' } as any, { id: 'assistant_2' } as any],
      }

      const id = generateActorID(ActorTypes.Assistant, config)
      expect(id).toBe('assistant_3')
    })

    it('generates next incremental ID for tools', () => {
      const config: WorkflowConfiguration = {
        states: [],
        tools: [{ id: 'tool_1' } as any, { id: 'tool_2' } as any],
      }

      const id = generateActorID(ActorTypes.Tool, config)
      expect(id).toBe('tool_3')
    })

    it('generates next incremental ID for custom nodes', () => {
      const config: WorkflowConfiguration = {
        states: [],
        custom_nodes: [{ id: 'custom_1' } as any, { id: 'custom_node_2' } as any],
      }

      const id = generateActorID(ActorTypes.CustomNode, config)
      expect(id).toBe('custom_node_3')
    })

    it('handles non-sequential existing IDs', () => {
      const config: WorkflowConfiguration = {
        states: [],
        assistants: [
          { id: 'assistant_1' } as any,
          { id: 'assistant_5' } as any,
          { id: 'assistant_3' } as any,
        ],
      }

      const id = generateActorID(ActorTypes.Assistant, config)
      expect(id).toBe('assistant_6')
    })

    it('handles undefined actors array', () => {
      const config: WorkflowConfiguration = {
        states: [],
      }

      const id = generateActorID(ActorTypes.Assistant, config)
      expect(id).toBe('assistant_1')
    })
  })

  describe('shouldReuseActorId', () => {
    describe('Assistant actor type', () => {
      it('returns false when actorId is undefined', () => {
        const config: WorkflowConfiguration = {
          states: [],
          assistants: [],
        }

        const result = shouldReuseActorId(config, ActorTypes.Assistant, undefined, 'state1')
        expect(result).toBe(false)
      })

      it('returns true when actor is only referenced by current node', () => {
        const config: WorkflowConfiguration = {
          states: [{ id: 'state1', assistant_id: 'assistant_1' } as AssistantStateConfiguration],
          assistants: [],
        }

        const result = shouldReuseActorId(config, ActorTypes.Assistant, 'assistant_1', 'state1')
        expect(result).toBe(true)
      })

      it('returns false when actor is referenced by multiple nodes', () => {
        const config: WorkflowConfiguration = {
          states: [
            { id: 'state1', assistant_id: 'assistant_1' } as AssistantStateConfiguration,
            { id: 'state2', assistant_id: 'assistant_1' } as AssistantStateConfiguration,
          ],
          assistants: [],
        }

        const result = shouldReuseActorId(config, ActorTypes.Assistant, 'assistant_1', 'state1')
        expect(result).toBe(false)
      })

      it('returns false when actor is referenced by different node only', () => {
        const config: WorkflowConfiguration = {
          states: [{ id: 'state2', assistant_id: 'assistant_1' } as AssistantStateConfiguration],
          assistants: [],
        }

        const result = shouldReuseActorId(config, ActorTypes.Assistant, 'assistant_1', 'state1')
        expect(result).toBe(false)
      })

      it('returns false when actor is not referenced by any node', () => {
        const config: WorkflowConfiguration = {
          states: [{ id: 'state1', assistant_id: 'assistant_2' } as AssistantStateConfiguration],
          assistants: [],
        }

        const result = shouldReuseActorId(config, ActorTypes.Assistant, 'assistant_1', 'state1')
        expect(result).toBe(false)
      })

      it('returns false when states array is empty', () => {
        const config: WorkflowConfiguration = {
          states: [],
          assistants: [],
        }

        const result = shouldReuseActorId(config, ActorTypes.Assistant, 'assistant_1', 'state1')
        expect(result).toBe(false)
      })
    })

    describe('Tool actor type', () => {
      it('returns true when tool is only referenced by current node', () => {
        const config: WorkflowConfiguration = {
          states: [{ id: 'state1', tool_id: 'tool_1' } as ToolStateConfiguration],
          tools: [],
        }

        const result = shouldReuseActorId(config, ActorTypes.Tool, 'tool_1', 'state1')
        expect(result).toBe(true)
      })

      it('returns false when tool is referenced by multiple nodes', () => {
        const config: WorkflowConfiguration = {
          states: [
            { id: 'state1', tool_id: 'tool_1' } as ToolStateConfiguration,
            { id: 'state2', tool_id: 'tool_1' } as ToolStateConfiguration,
          ],
          tools: [],
        }

        const result = shouldReuseActorId(config, ActorTypes.Tool, 'tool_1', 'state1')
        expect(result).toBe(false)
      })

      it('returns false when tool is referenced by different node only', () => {
        const config: WorkflowConfiguration = {
          states: [{ id: 'state2', tool_id: 'tool_1' } as ToolStateConfiguration],
          tools: [],
        }

        const result = shouldReuseActorId(config, ActorTypes.Tool, 'tool_1', 'state1')
        expect(result).toBe(false)
      })
    })

    describe('CustomNode actor type', () => {
      it('returns true when custom node is only referenced by current node', () => {
        const config: WorkflowConfiguration = {
          states: [{ id: 'state1', custom_node_id: 'custom_1' } as CustomNodeStateConfiguration],
          custom_nodes: [],
        }

        const result = shouldReuseActorId(config, ActorTypes.CustomNode, 'custom_1', 'state1')
        expect(result).toBe(true)
      })

      it('returns false when custom node is referenced by multiple nodes', () => {
        const config: WorkflowConfiguration = {
          states: [
            { id: 'state1', custom_node_id: 'custom_1' } as CustomNodeStateConfiguration,
            { id: 'state2', custom_node_id: 'custom_1' } as CustomNodeStateConfiguration,
          ],
          custom_nodes: [],
        }

        const result = shouldReuseActorId(config, ActorTypes.CustomNode, 'custom_1', 'state1')
        expect(result).toBe(false)
      })

      it('returns false when custom node is referenced by different node only', () => {
        const config: WorkflowConfiguration = {
          states: [{ id: 'state2', custom_node_id: 'custom_1' } as CustomNodeStateConfiguration],
          custom_nodes: [],
        }

        const result = shouldReuseActorId(config, ActorTypes.CustomNode, 'custom_1', 'state1')
        expect(result).toBe(false)
      })
    })

    describe('Mixed state types', () => {
      it('correctly filters by actor type when config has mixed state types', () => {
        const config: WorkflowConfiguration = {
          states: [
            { id: 'state1', assistant_id: 'assistant_1' } as AssistantStateConfiguration,
            { id: 'state2', tool_id: 'tool_1' } as ToolStateConfiguration,
            { id: 'state3', custom_node_id: 'custom_1' } as CustomNodeStateConfiguration,
          ],
          assistants: [],
          tools: [],
          custom_nodes: [],
        }

        expect(shouldReuseActorId(config, ActorTypes.Assistant, 'assistant_1', 'state1')).toBe(true)
        expect(shouldReuseActorId(config, ActorTypes.Tool, 'tool_1', 'state2')).toBe(true)
        expect(shouldReuseActorId(config, ActorTypes.CustomNode, 'custom_1', 'state3')).toBe(true)
      })

      it('does not confuse different actor types with same ID pattern', () => {
        const config: WorkflowConfiguration = {
          states: [
            { id: 'state1', assistant_id: 'actor_1' } as AssistantStateConfiguration,
            { id: 'state2', tool_id: 'actor_1' } as ToolStateConfiguration,
          ],
          assistants: [],
          tools: [],
        }

        expect(shouldReuseActorId(config, ActorTypes.Assistant, 'actor_1', 'state1')).toBe(true)
        expect(shouldReuseActorId(config, ActorTypes.Tool, 'actor_1', 'state2')).toBe(true)
      })
    })
  })
})
