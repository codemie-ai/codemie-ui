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

import {
  WorkflowConfiguration,
  AssistantStateConfiguration,
  ToolStateConfiguration,
  CustomNodeStateConfiguration,
} from '@/types/workflowEditor/configuration'

import { cleanupUnusedReferences } from '../cleanupUnusedReferences'

describe('cleanupUnusedReferences', () => {
  describe('assistants cleanup', () => {
    it('removes unused assistant when no states reference it', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'state1',
            assistant_id: 'assistant1',
            _meta: { type: 'assistant', is_connected: true },
          } as AssistantStateConfiguration,
        ],
        assistants: [
          { id: 'assistant1', name: 'Used', model: 'gpt-4' },
          { id: 'assistant2', name: 'Unused', model: 'gpt-4' },
        ],
      }

      const result = cleanupUnusedReferences(config)

      expect(result.assistants).toHaveLength(1)
      expect(result.assistants?.[0].id).toBe('assistant1')
    })

    it('keeps assistant when multiple states reference it', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'state1',
            assistant_id: 'assistant1',
            _meta: { type: 'assistant', is_connected: true },
          } as AssistantStateConfiguration,
          {
            id: 'state2',
            assistant_id: 'assistant1',
            _meta: { type: 'assistant', is_connected: true },
          } as AssistantStateConfiguration,
        ],
        assistants: [{ id: 'assistant1', name: 'Used', model: 'gpt-4' }],
      }

      const result = cleanupUnusedReferences(config)

      expect(result.assistants).toHaveLength(1)
      expect(result.assistants?.[0].id).toBe('assistant1')
    })

    it('removes all assistants when no states exist', () => {
      const config: WorkflowConfiguration = {
        states: [],
        assistants: [
          { id: 'assistant1', name: 'Unused1', model: 'gpt-4' },
          { id: 'assistant2', name: 'Unused2', model: 'gpt-4' },
        ],
      }

      const result = cleanupUnusedReferences(config)

      expect(result.assistants).toHaveLength(0)
    })

    it('handles undefined assistants array', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'state1',
            assistant_id: 'assistant1',
            _meta: { type: 'assistant', is_connected: true },
          } as AssistantStateConfiguration,
        ],
        assistants: undefined,
      }

      const result = cleanupUnusedReferences(config)

      expect(result.assistants).toBeUndefined()
    })
  })

  describe('tools cleanup', () => {
    it('removes unused tool when no states reference it', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'tool_state1',
            tool_id: 'tool1',
            _meta: { type: 'tool', is_connected: true },
          } as ToolStateConfiguration,
        ],
        tools: [
          { id: 'tool1', tool: 'used_tool' },
          { id: 'tool2', tool: 'unused_tool' },
        ],
      }

      const result = cleanupUnusedReferences(config)

      expect(result.tools).toHaveLength(1)
      expect(result.tools?.[0].id).toBe('tool1')
    })

    it('removes all tools when no states reference them', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'state1',
            assistant_id: 'assistant1',
            _meta: { type: 'assistant', is_connected: true },
          } as AssistantStateConfiguration,
        ],
        tools: [
          { id: 'tool1', tool: 'unused1' },
          { id: 'tool2', tool: 'unused2' },
        ],
      }

      const result = cleanupUnusedReferences(config)

      expect(result.tools).toHaveLength(0)
    })

    it('handles undefined tools array', () => {
      const config: WorkflowConfiguration = {
        states: [],
        tools: undefined,
      }

      const result = cleanupUnusedReferences(config)

      expect(result.tools).toBeUndefined()
    })
  })

  describe('custom_nodes cleanup', () => {
    it('removes unused custom_node when no states reference it', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'custom_state1',
            custom_node_id: 'custom1',
            _meta: { type: 'custom', is_connected: true },
          } as CustomNodeStateConfiguration,
        ],
        custom_nodes: [
          { id: 'custom1', name: 'Used Custom' },
          { id: 'custom2', name: 'Unused Custom' },
        ],
      }

      const result = cleanupUnusedReferences(config)

      expect(result.custom_nodes).toHaveLength(1)
      expect(result.custom_nodes?.[0].id).toBe('custom1')
    })

    it('handles undefined custom_nodes array', () => {
      const config: WorkflowConfiguration = {
        states: [],
        custom_nodes: undefined,
      }

      const result = cleanupUnusedReferences(config)

      expect(result.custom_nodes).toBeUndefined()
    })
  })

  describe('mixed cleanup scenarios', () => {
    it('removes multiple unused actors across all types', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'state1',
            assistant_id: 'assistant1',
            _meta: { type: 'assistant', is_connected: true },
          } as AssistantStateConfiguration,
        ],
        assistants: [
          { id: 'assistant1', name: 'Used', model: 'gpt-4' },
          { id: 'assistant2', name: 'Unused', model: 'gpt-4' },
        ],
        tools: [
          { id: 'tool1', tool: 'unused' },
          { id: 'tool2', tool: 'also_unused' },
        ],
        custom_nodes: [{ id: 'custom1', name: 'Unused Custom' }],
      }

      const result = cleanupUnusedReferences(config)

      expect(result.assistants).toHaveLength(1)
      expect(result.assistants?.[0].id).toBe('assistant1')
      expect(result.tools).toHaveLength(0)
      expect(result.custom_nodes).toHaveLength(0)
    })

    it('keeps all actors when they are all referenced', () => {
      const config: WorkflowConfiguration = {
        states: [
          {
            id: 'state1',
            assistant_id: 'assistant1',
            _meta: { type: 'assistant', is_connected: true },
          } as AssistantStateConfiguration,
          {
            id: 'state2',
            tool_id: 'tool1',
            _meta: { type: 'tool', is_connected: true },
          } as ToolStateConfiguration,
          {
            id: 'state3',
            custom_node_id: 'custom1',
            _meta: { type: 'custom', is_connected: true },
          } as CustomNodeStateConfiguration,
        ],
        assistants: [{ id: 'assistant1', name: 'Used', model: 'gpt-4' }],
        tools: [{ id: 'tool1', tool: 'used_tool' }],
        custom_nodes: [{ id: 'custom1', name: 'Used Custom' }],
      }

      const result = cleanupUnusedReferences(config)

      expect(result.assistants).toHaveLength(1)
      expect(result.tools).toHaveLength(1)
      expect(result.custom_nodes).toHaveLength(1)
    })

    it('handles empty configuration gracefully', () => {
      const config: WorkflowConfiguration = {
        states: [],
        assistants: [],
        tools: [],
        custom_nodes: [],
      }

      const result = cleanupUnusedReferences(config)

      expect(result.assistants).toHaveLength(0)
      expect(result.tools).toHaveLength(0)
      expect(result.custom_nodes).toHaveLength(0)
    })
  })
})
