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

import { WorkflowIssue } from '@/types/entity'
import { WorkflowConfiguration } from '@/types/workflowEditor'
import { NodeTypes } from '@/types/workflowEditor/base'

import { getEntityForState, shouldResolveIssue } from '../issueValidation'

describe('getEntityForState', () => {
  describe('assistant state type', () => {
    it('returns assistant entity when found', () => {
      const config: Partial<WorkflowConfiguration> = {
        assistants: [
          { id: 'assistant1', name: 'Assistant 1' },
          { id: 'assistant2', name: 'Assistant 2' },
        ],
      } as Partial<WorkflowConfiguration>

      const result = getEntityForState(
        config as WorkflowConfiguration,
        NodeTypes.ASSISTANT,
        'assistant1'
      )

      expect(result).toEqual({ id: 'assistant1', name: 'Assistant 1' })
    })

    it('returns null when assistant not found', () => {
      const config: Partial<WorkflowConfiguration> = {
        assistants: [{ id: 'assistant1', name: 'Assistant 1' }],
      } as Partial<WorkflowConfiguration>

      const result = getEntityForState(
        config as WorkflowConfiguration,
        NodeTypes.ASSISTANT,
        'nonexistent'
      )

      expect(result).toBeNull()
    })

    it('returns null when assistants array is empty', () => {
      const config: Partial<WorkflowConfiguration> = {
        assistants: [],
      } as Partial<WorkflowConfiguration>

      const result = getEntityForState(
        config as WorkflowConfiguration,
        NodeTypes.ASSISTANT,
        'assistant1'
      )

      expect(result).toBeNull()
    })
  })

  describe('tool state type', () => {
    it('returns tool entity when found', () => {
      const config: any = {
        tools: [
          { id: 'tool1', name: 'Tool 1' },
          { id: 'tool2', name: 'Tool 2' },
        ],
      }

      const result = getEntityForState(config as WorkflowConfiguration, NodeTypes.TOOL, 'tool1')

      expect(result).toEqual({ id: 'tool1', name: 'Tool 1' })
    })

    it('returns null when tool not found', () => {
      const config: any = {
        tools: [{ id: 'tool1', name: 'Tool 1' }],
      }

      const result = getEntityForState(
        config as WorkflowConfiguration,
        NodeTypes.TOOL,
        'nonexistent'
      )

      expect(result).toBeNull()
    })
  })

  describe('transform state type', () => {
    it('returns custom_node entity when found', () => {
      const config: Partial<WorkflowConfiguration> = {
        custom_nodes: [
          { id: 'transform1', name: 'Transform 1' },
          { id: 'transform2', name: 'Transform 2' },
        ],
      } as Partial<WorkflowConfiguration>

      const result = getEntityForState(
        config as WorkflowConfiguration,
        NodeTypes.TRANSFORM,
        'transform1'
      )

      expect(result).toEqual({ id: 'transform1', name: 'Transform 1' })
    })

    it('returns null when custom_node not found', () => {
      const config: Partial<WorkflowConfiguration> = {
        custom_nodes: [{ id: 'transform1', name: 'Transform 1' }],
      } as Partial<WorkflowConfiguration>

      const result = getEntityForState(
        config as WorkflowConfiguration,
        NodeTypes.TRANSFORM,
        'nonexistent'
      )

      expect(result).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('returns null for unsupported state types', () => {
      const config: Partial<WorkflowConfiguration> = {
        assistants: [{ id: 'assistant1', name: 'Assistant 1' }],
      } as Partial<WorkflowConfiguration>

      const result = getEntityForState(
        config as WorkflowConfiguration,
        NodeTypes.START,
        'assistant1'
      )

      expect(result).toBeNull()
    })

    it('returns null when config array does not exist', () => {
      const config: Partial<WorkflowConfiguration> = {} as Partial<WorkflowConfiguration>

      const result = getEntityForState(
        config as WorkflowConfiguration,
        NodeTypes.ASSISTANT,
        'assistant1'
      )

      expect(result).toBeNull()
    })

    it('returns null when config array is not an array', () => {
      const config: Partial<WorkflowConfiguration> = {
        assistants: null as any,
      } as Partial<WorkflowConfiguration>

      const result = getEntityForState(
        config as WorkflowConfiguration,
        NodeTypes.ASSISTANT,
        'assistant1'
      )

      expect(result).toBeNull()
    })
  })
})

describe('shouldResolveIssue', () => {
  describe('top-level config changes', () => {
    it('resolves issue when top-level config property changes (no stateId)', () => {
      const issue: WorkflowIssue = {
        id: 'issue1',
        message: 'Test issue',
        path: 'messages_limit_before_summarization',
        configLine: 70,
      }

      const prevConfig: any = {
        states: [],
        messages_limit_before_summarization: 2,
      }

      const nextConfig: any = {
        states: [],
        messages_limit_before_summarization: 5,
      }

      expect(shouldResolveIssue(issue, prevConfig, nextConfig)).toBe(true)
    })

    it('resolves issue when top-level config property changes (empty stateId)', () => {
      const issue: WorkflowIssue = {
        id: 'issue1',
        message: 'Test issue',
        stateId: '',
        path: 'recursion_limit',
        configLine: 70,
      }

      const prevConfig: any = {
        states: [],
        recursion_limit: 10,
      }

      const nextConfig: any = {
        states: [],
        recursion_limit: 20,
      }

      expect(shouldResolveIssue(issue, prevConfig, nextConfig)).toBe(true)
    })

    it('does not resolve when top-level config property stays same', () => {
      const issue: WorkflowIssue = {
        id: 'issue1',
        message: 'Test issue',
        path: 'max_concurrency',
        configLine: 70,
      }

      const prevConfig: any = {
        states: [],
        max_concurrency: 32,
      }

      const nextConfig: any = {
        states: [],
        max_concurrency: 32,
      }

      expect(shouldResolveIssue(issue, prevConfig, nextConfig)).toBe(false)
    })

    it('resolves issue when nested top-level config property changes', () => {
      const issue: WorkflowIssue = {
        id: 'issue1',
        message: 'Test issue',
        path: 'retry_policy.max_attempts',
        configLine: 70,
      }

      const prevConfig: any = {
        states: [],
        retry_policy: {
          backoff_factor: 1,
          initial_interval: 5,
          max_interval: 4324,
          max_attempts: 1,
        },
      }

      const nextConfig: any = {
        states: [],
        retry_policy: {
          backoff_factor: 1,
          initial_interval: 5,
          max_interval: 4324,
          max_attempts: 3,
        },
      }

      expect(shouldResolveIssue(issue, prevConfig, nextConfig)).toBe(true)
    })

    it('does not resolve when nested top-level config property stays same', () => {
      const issue: WorkflowIssue = {
        id: 'issue1',
        message: 'Test issue',
        path: 'retry_policy.backoff_factor',
        configLine: 70,
      }

      const prevConfig: any = {
        states: [],
        retry_policy: {
          backoff_factor: 1,
          initial_interval: 5,
        },
      }

      const nextConfig: any = {
        states: [],
        retry_policy: {
          backoff_factor: 1,
          initial_interval: 5,
        },
      }

      expect(shouldResolveIssue(issue, prevConfig, nextConfig)).toBe(false)
    })

    it('resolves issue when top-level config property is added', () => {
      const issue: WorkflowIssue = {
        id: 'issue1',
        message: 'Test issue',
        path: 'enable_summarization_node',
        configLine: 70,
      }

      const prevConfig: any = {
        states: [],
        // Missing enable_summarization_node
      }

      const nextConfig: any = {
        states: [],
        enable_summarization_node: true,
      }

      expect(shouldResolveIssue(issue, prevConfig, nextConfig)).toBe(true)
    })

    it('resolves issue when top-level config property is removed', () => {
      const issue: WorkflowIssue = {
        id: 'issue1',
        message: 'Test issue',
        path: 'tokens_limit_before_summarization',
        configLine: 70,
      }

      const prevConfig: any = {
        states: [],
        tokens_limit_before_summarization: 123,
      }

      const nextConfig: any = {
        states: [],
        // Removed tokens_limit_before_summarization
      }

      expect(shouldResolveIssue(issue, prevConfig, nextConfig)).toBe(true)
    })
  })

  describe('missing entity ID issues (path="states")', () => {
    it('resolves issue when state now has entity ID assigned', () => {
      const issue: WorkflowIssue = {
        id: 'b9d145d5-4631-4c8f-937c-e694dd860224',
        message: 'Invalid value',
        path: 'states',
        details: "Must set one of: 'custom_node_id' or 'assistant_id' or 'tool_id'",
        stateId: 'onboarder',
        configLine: 64,
      }

      const prevConfig: any = {
        states: [
          {
            id: 'onboarder',
            // Missing entity ID
            _meta: { type: NodeTypes.ASSISTANT },
          },
        ],
        assistants: [{ id: 'assistant1', name: 'Assistant 1' }],
      }

      const nextConfig: any = {
        states: [
          {
            id: 'onboarder',
            assistant_id: 'assistant1', // Now has entity ID!
            _meta: { type: NodeTypes.ASSISTANT },
          },
        ],
        assistants: [{ id: 'assistant1', name: 'Assistant 1' }],
      }

      expect(shouldResolveIssue(issue, prevConfig, nextConfig)).toBe(true)
    })

    it('does not resolve when state still has no entity ID', () => {
      const issue: WorkflowIssue = {
        id: 'b9d145d5-4631-4c8f-937c-e694dd860224',
        message: 'Invalid value',
        path: 'states',
        details: "Must set one of: 'custom_node_id' or 'assistant_id' or 'tool_id'",
        stateId: 'onboarder',
        configLine: 64,
      }

      const prevConfig: any = {
        states: [
          {
            id: 'onboarder',
            _meta: { type: NodeTypes.ASSISTANT },
          },
        ],
      }

      const nextConfig: any = {
        states: [
          {
            id: 'onboarder',
            // Still missing entity ID
            _meta: { type: NodeTypes.ASSISTANT },
          },
        ],
      }

      expect(shouldResolveIssue(issue, prevConfig, nextConfig)).toBe(false)
    })

    it('resolves when state with missing entity ID is removed', () => {
      const issue: WorkflowIssue = {
        id: 'b9d145d5-4631-4c8f-937c-e694dd860224',
        message: 'Invalid value',
        path: 'states',
        stateId: 'onboarder',
        configLine: 64,
      }

      const prevConfig: any = {
        states: [
          {
            id: 'onboarder',
            _meta: { type: NodeTypes.ASSISTANT },
          },
        ],
      }

      const nextConfig: any = {
        states: [], // State removed
      }

      expect(shouldResolveIssue(issue, prevConfig, nextConfig)).toBe(true)
    })

    it('resolves when tool state gets tool_id assigned', () => {
      const issue: WorkflowIssue = {
        id: 'issue1',
        message: 'Invalid value',
        path: 'states',
        stateId: 'tool_state',
        configLine: 64,
      }

      const prevConfig: any = {
        states: [
          {
            id: 'tool_state',
            _meta: { type: NodeTypes.TOOL },
          },
        ],
      }

      const nextConfig: any = {
        states: [
          {
            id: 'tool_state',
            tool_id: 'tool1', // Now has tool_id
            _meta: { type: NodeTypes.TOOL },
          },
        ],
      }

      expect(shouldResolveIssue(issue, prevConfig, nextConfig)).toBe(true)
    })

    it('resolves when transform state gets custom_node_id assigned', () => {
      const issue: WorkflowIssue = {
        id: 'issue1',
        message: 'Invalid value',
        path: 'states',
        stateId: 'transform_state',
        configLine: 64,
      }

      const prevConfig: any = {
        states: [
          {
            id: 'transform_state',
            _meta: { type: NodeTypes.TRANSFORM },
          },
        ],
      }

      const nextConfig: any = {
        states: [
          {
            id: 'transform_state',
            custom_node_id: 'transform1', // Now has custom_node_id
            _meta: { type: NodeTypes.TRANSFORM },
          },
        ],
      }

      expect(shouldResolveIssue(issue, prevConfig, nextConfig)).toBe(true)
    })

    it('resolves when ANY entity ID is added regardless of state type', () => {
      const issue: WorkflowIssue = {
        id: 'issue1',
        message: 'Invalid value',
        path: 'states',
        stateId: 'some_state',
        configLine: 64,
      }

      // Test with assistant_id
      let prevConfig: any = {
        states: [
          {
            id: 'some_state',
            _meta: { type: NodeTypes.TOOL }, // Type is TOOL
          },
        ],
      }

      let nextConfig: any = {
        states: [
          {
            id: 'some_state',
            assistant_id: 'assistant1', // But assistant_id is added
            _meta: { type: NodeTypes.TOOL },
          },
        ],
      }

      expect(shouldResolveIssue(issue, prevConfig, nextConfig)).toBe(true)

      // Test with tool_id when type is ASSISTANT
      prevConfig = {
        states: [
          {
            id: 'some_state',
            _meta: { type: NodeTypes.ASSISTANT },
          },
        ],
      }

      nextConfig = {
        states: [
          {
            id: 'some_state',
            tool_id: 'tool1', // tool_id added even though type is ASSISTANT
            _meta: { type: NodeTypes.ASSISTANT },
          },
        ],
      }

      expect(shouldResolveIssue(issue, prevConfig, nextConfig)).toBe(true)
    })

    it('does not resolve when no entity ID keys are present', () => {
      const issue: WorkflowIssue = {
        id: 'issue1',
        message: 'Invalid value',
        path: 'states',
        stateId: 'some_state',
        configLine: 64,
      }

      const prevConfig: any = {
        states: [
          {
            id: 'some_state',
            _meta: { type: NodeTypes.ASSISTANT },
          },
        ],
      }

      const nextConfig: any = {
        states: [
          {
            id: 'some_state',
            // Still no entity ID keys
            _meta: { type: NodeTypes.ASSISTANT },
          },
        ],
      }

      expect(shouldResolveIssue(issue, prevConfig, nextConfig)).toBe(false)
    })
  })

  describe('missing required fields in entities', () => {
    describe('assistant entities (path="assistants")', () => {
      it('resolves when assistant gets assistant_id field', () => {
        const issue: WorkflowIssue = {
          id: '9050fe7e-64d6-4164-a7b5-70b07e37fb72',
          message: 'Invalid value',
          path: 'assistants',
          details: "Must set one of: 'assistant_id' or 'system_prompt'",
          stateId: 'requirement_analyzer',
          configLine: 28,
        }

        const prevConfig: any = {
          states: [
            {
              id: 'requirement_analyzer',
              assistant_id: 'assistant1',
              _meta: { type: NodeTypes.ASSISTANT },
            },
          ],
          assistants: [{ id: 'assistant1' }],
        }

        const nextConfig: any = {
          states: [
            {
              id: 'requirement_analyzer',
              assistant_id: 'assistant1',
              _meta: { type: NodeTypes.ASSISTANT },
            },
          ],
          assistants: [{ id: 'assistant1', assistant_id: 'claude-3' }],
        }

        expect(shouldResolveIssue(issue, prevConfig, nextConfig)).toBe(true)
      })

      it('resolves when assistant gets system_prompt field', () => {
        const issue: WorkflowIssue = {
          id: 'issue1',
          message: 'Invalid value',
          path: 'assistants',
          stateId: 'state1',
          configLine: 28,
        }

        const prevConfig: any = {
          states: [
            {
              id: 'state1',
              assistant_id: 'assistant1',
              _meta: { type: NodeTypes.ASSISTANT },
            },
          ],
          assistants: [{ id: 'assistant1' }],
        }

        const nextConfig: any = {
          states: [
            {
              id: 'state1',
              assistant_id: 'assistant1',
              _meta: { type: NodeTypes.ASSISTANT },
            },
          ],
          assistants: [{ id: 'assistant1', system_prompt: 'You are helpful' }],
        }

        expect(shouldResolveIssue(issue, prevConfig, nextConfig)).toBe(true)
      })

      it('does not resolve when assistant still has no required fields', () => {
        const issue: WorkflowIssue = {
          id: 'issue1',
          message: 'Invalid value',
          path: 'assistants',
          stateId: 'state1',
          configLine: 28,
        }

        const prevConfig: any = {
          states: [
            {
              id: 'state1',
              assistant_id: 'assistant1',
              _meta: { type: NodeTypes.ASSISTANT },
            },
          ],
          assistants: [{ id: 'assistant1' }],
        }

        const nextConfig: any = {
          states: [
            {
              id: 'state1',
              assistant_id: 'assistant1',
              _meta: { type: NodeTypes.ASSISTANT },
            },
          ],
          assistants: [{ id: 'assistant1' }],
        }

        expect(shouldResolveIssue(issue, prevConfig, nextConfig)).toBe(false)
      })

      it('resolves when assistant is removed', () => {
        const issue: WorkflowIssue = {
          id: 'issue1',
          message: 'Invalid value',
          path: 'assistants',
          stateId: 'state1',
          configLine: 28,
        }

        const prevConfig: any = {
          states: [
            {
              id: 'state1',
              assistant_id: 'assistant1',
              _meta: { type: NodeTypes.ASSISTANT },
            },
          ],
          assistants: [{ id: 'assistant1' }],
        }

        const nextConfig: any = {
          states: [
            {
              id: 'state1',
              assistant_id: 'assistant1',
              _meta: { type: NodeTypes.ASSISTANT },
            },
          ],
          assistants: [],
        }

        expect(shouldResolveIssue(issue, prevConfig, nextConfig)).toBe(true)
      })

      it('does not resolve when state has no assistant_id', () => {
        const issue: WorkflowIssue = {
          id: 'issue1',
          message: 'Invalid value',
          path: 'assistants',
          stateId: 'state1',
          configLine: 28,
        }

        const prevConfig: any = {
          states: [
            {
              id: 'state1',
              _meta: { type: NodeTypes.ASSISTANT },
            },
          ],
          assistants: [{ id: 'assistant1' }],
        }

        const nextConfig: any = {
          states: [
            {
              id: 'state1',
              _meta: { type: NodeTypes.ASSISTANT },
            },
          ],
          assistants: [{ id: 'assistant1', system_prompt: 'test' }],
        }

        expect(shouldResolveIssue(issue, prevConfig, nextConfig)).toBe(false)
      })
    })

    describe('tool entities (path="tools")', () => {
      it('resolves when tool gets required fields', () => {
        const issue: WorkflowIssue = {
          id: '89a5f18c-4ff3-48cd-9917-21598a8f99e0',
          message: 'Missing required field',
          path: 'tools',
          details: "Required fields: 'tool'",
          stateId: 'tool_1',
          configLine: 36,
        }

        const prevConfig: any = {
          states: [
            {
              id: 'tool_1',
              tool_id: 'tool1',
              _meta: { type: NodeTypes.TOOL },
            },
          ],
          tools: [{ id: 'tool1' }],
        }

        const nextConfig: any = {
          states: [
            {
              id: 'tool_1',
              tool_id: 'tool1',
              _meta: { type: NodeTypes.TOOL },
            },
          ],
          tools: [{ id: 'tool1', name: 'Search Tool' }],
        }

        expect(shouldResolveIssue(issue, prevConfig, nextConfig)).toBe(true)
      })

      it('does not resolve when tool still has only id', () => {
        const issue: WorkflowIssue = {
          id: 'issue1',
          message: 'Missing required field',
          path: 'tools',
          stateId: 'tool_1',
          configLine: 36,
        }

        const prevConfig: any = {
          states: [
            {
              id: 'tool_1',
              tool_id: 'tool1',
              _meta: { type: NodeTypes.TOOL },
            },
          ],
          tools: [{ id: 'tool1' }],
        }

        const nextConfig: any = {
          states: [
            {
              id: 'tool_1',
              tool_id: 'tool1',
              _meta: { type: NodeTypes.TOOL },
            },
          ],
          tools: [{ id: 'tool1' }],
        }

        expect(shouldResolveIssue(issue, prevConfig, nextConfig)).toBe(false)
      })

      it('resolves when tool is removed', () => {
        const issue: WorkflowIssue = {
          id: 'issue1',
          message: 'Missing required field',
          path: 'tools',
          stateId: 'tool_1',
          configLine: 36,
        }

        const prevConfig: any = {
          states: [
            {
              id: 'tool_1',
              tool_id: 'tool1',
              _meta: { type: NodeTypes.TOOL },
            },
          ],
          tools: [{ id: 'tool1' }],
        }

        const nextConfig: any = {
          states: [
            {
              id: 'tool_1',
              tool_id: 'tool1',
              _meta: { type: NodeTypes.TOOL },
            },
          ],
          tools: [],
        }

        expect(shouldResolveIssue(issue, prevConfig, nextConfig)).toBe(true)
      })

      it('does not resolve when state has no tool_id', () => {
        const issue: WorkflowIssue = {
          id: 'issue1',
          message: 'Missing required field',
          path: 'tools',
          stateId: 'tool_1',
          configLine: 36,
        }

        const prevConfig: any = {
          states: [
            {
              id: 'tool_1',
              _meta: { type: NodeTypes.TOOL },
            },
          ],
          tools: [{ id: 'tool1' }],
        }

        const nextConfig: any = {
          states: [
            {
              id: 'tool_1',
              _meta: { type: NodeTypes.TOOL },
            },
          ],
          tools: [{ id: 'tool1', name: 'Search' }],
        }

        expect(shouldResolveIssue(issue, prevConfig, nextConfig)).toBe(false)
      })
    })
  })

  describe('state-level changes', () => {
    it('resolves issue when state is removed', () => {
      const issue: WorkflowIssue = {
        id: 'issue1',
        message: 'Test issue',
        stateId: 'state1',
        path: 'task',
        configLine: 1,
      }

      const prevConfig: Partial<WorkflowConfiguration> = {
        states: [{ id: 'state1', _meta: { type: NodeTypes.ASSISTANT } }],
      } as Partial<WorkflowConfiguration>

      const nextConfig: Partial<WorkflowConfiguration> = {
        states: [], // State removed
      } as Partial<WorkflowConfiguration>

      expect(shouldResolveIssue(issue, prevConfig as any, nextConfig as any)).toBe(true)
    })

    it('resolves issue when state path value changes', () => {
      const issue: WorkflowIssue = {
        id: 'issue1',
        message: 'Test issue',
        stateId: 'state1',
        path: 'task',
        configLine: 1,
      }

      const prevConfig: Partial<WorkflowConfiguration> = {
        states: [{ id: 'state1', task: 'old task', _meta: { type: NodeTypes.ASSISTANT } }],
      } as Partial<WorkflowConfiguration>

      const nextConfig: Partial<WorkflowConfiguration> = {
        states: [{ id: 'state1', task: 'new task', _meta: { type: NodeTypes.ASSISTANT } }],
      } as Partial<WorkflowConfiguration>

      expect(shouldResolveIssue(issue, prevConfig as any, nextConfig as any)).toBe(true)
    })

    it('does not resolve when state path value stays same', () => {
      const issue: WorkflowIssue = {
        id: 'issue1',
        message: 'Test issue',
        stateId: 'state1',
        path: 'task',
        configLine: 1,
      }

      const prevConfig: Partial<WorkflowConfiguration> = {
        states: [
          {
            id: 'state1',
            task: 'same task',
            assistant_id: 'assistant1',
            _meta: { type: NodeTypes.ASSISTANT },
          },
        ],
        assistants: [{ id: 'assistant1', name: 'Assistant 1' }],
      } as Partial<WorkflowConfiguration>

      const nextConfig: Partial<WorkflowConfiguration> = {
        states: [
          {
            id: 'state1',
            task: 'same task',
            assistant_id: 'assistant1',
            _meta: { type: NodeTypes.ASSISTANT },
          },
        ],
        assistants: [{ id: 'assistant1', name: 'Assistant 1' }],
      } as Partial<WorkflowConfiguration>

      expect(shouldResolveIssue(issue, prevConfig as any, nextConfig as any)).toBe(false)
    })

    it('resolves issue when state type changes', () => {
      const issue: WorkflowIssue = {
        id: 'issue1',
        message: 'Test issue',
        stateId: 'state1',
        path: 'task',
        configLine: 1,
      }

      const prevConfig: Partial<WorkflowConfiguration> = {
        states: [{ id: 'state1', task: 'task', _meta: { type: NodeTypes.ASSISTANT } }],
      } as Partial<WorkflowConfiguration>

      const nextConfig: Partial<WorkflowConfiguration> = {
        states: [{ id: 'state1', task: 'task', _meta: { type: NodeTypes.TOOL } }],
      } as Partial<WorkflowConfiguration>

      expect(shouldResolveIssue(issue, prevConfig as any, nextConfig as any)).toBe(true)
    })
  })

  describe('state field validation errors', () => {
    describe('entity ID field errors', () => {
      it('does not resolve when custom_node_id value type is wrong but unchanged', () => {
        const issue: WorkflowIssue = {
          id: 'iss-1',
          message: 'Invalid type (expected string)',
          path: 'custom_node_id',
          stateId: 'onboarder',
          configLine: 65,
        }

        const prevConfig: Partial<WorkflowConfiguration> = {
          states: [
            {
              id: 'onboarder',
              custom_node_id: 123 as unknown as string,
              _meta: { type: NodeTypes.TRANSFORM },
            },
          ],
        }

        const nextConfig: Partial<WorkflowConfiguration> = {
          states: [
            {
              id: 'onboarder',
              custom_node_id: 123 as unknown as string,
              _meta: { type: NodeTypes.TRANSFORM },
            },
          ],
        }

        expect(shouldResolveIssue(issue, prevConfig as any, nextConfig as any)).toBe(false)
      })

      it('resolves when custom_node_id value changes', () => {
        const issue: WorkflowIssue = {
          id: 'iss-1',
          message: 'Invalid type (expected string)',
          path: 'custom_node_id',
          stateId: 'onboarder',
          configLine: 65,
        }

        const prevConfig: Partial<WorkflowConfiguration> = {
          states: [
            {
              id: 'onboarder',
              custom_node_id: 123 as unknown as string,
              _meta: { type: NodeTypes.TRANSFORM },
            },
          ],
        }

        const nextConfig: Partial<WorkflowConfiguration> = {
          states: [
            {
              id: 'onboarder',
              custom_node_id: 'transform1', // Now fixed
              _meta: { type: NodeTypes.TRANSFORM },
            },
          ],
        }

        expect(shouldResolveIssue(issue, prevConfig as any, nextConfig as any)).toBe(true)
      })

      it('does not resolve when assistant_id is invalid but unchanged', () => {
        const issue: WorkflowIssue = {
          id: 'iss-5',
          message: 'Invalid type (expected string)',
          path: 'assistant_id',
          stateId: 'state1',
          configLine: 25,
        }

        const prevConfig: any = {
          states: [
            {
              id: 'state1',
              assistant_id: 999, // Wrong type
              _meta: { type: NodeTypes.ASSISTANT },
            },
          ],
        }

        const nextConfig: any = {
          states: [
            {
              id: 'state1',
              assistant_id: 999, // Still wrong, unchanged
              _meta: { type: NodeTypes.ASSISTANT },
            },
          ],
        }

        expect(shouldResolveIssue(issue, prevConfig, nextConfig)).toBe(false)
      })

      it('does not resolve when tool_id is invalid but unchanged', () => {
        const issue: WorkflowIssue = {
          id: 'iss-6',
          message: 'Invalid type (expected string)',
          path: 'tool_id',
          stateId: 'state1',
          configLine: 30,
        }

        const prevConfig: any = {
          states: [
            {
              id: 'state1',
              tool_id: ['tool1', 'tool2'], // Wrong type (array instead of string)
              _meta: { type: NodeTypes.TOOL },
            },
          ],
        }

        const nextConfig: any = {
          states: [
            {
              id: 'state1',
              tool_id: ['tool1', 'tool2'], // Still wrong, unchanged
              _meta: { type: NodeTypes.TOOL },
            },
          ],
        }

        expect(shouldResolveIssue(issue, prevConfig, nextConfig)).toBe(false)
      })
    })

    describe('other state field errors', () => {
      it('does not resolve when task field is invalid but unchanged', () => {
        const issue: WorkflowIssue = {
          id: 'iss-2',
          message: 'Invalid type (expected string)',
          path: 'task',
          stateId: 'state1',
          configLine: 10,
        }

        const prevConfig: any = {
          states: [
            {
              id: 'state1',
              task: 123, // Wrong type
              _meta: { type: NodeTypes.ASSISTANT },
            },
          ],
        }

        const nextConfig: any = {
          states: [
            {
              id: 'state1',
              task: 123, // Still wrong, unchanged
              _meta: { type: NodeTypes.ASSISTANT },
            },
          ],
        }

        expect(shouldResolveIssue(issue, prevConfig, nextConfig)).toBe(false)
      })

      it('resolves when task field value changes', () => {
        const issue: WorkflowIssue = {
          id: 'iss-2',
          message: 'Invalid type (expected string)',
          path: 'task',
          stateId: 'state1',
          configLine: 10,
        }

        const prevConfig: any = {
          states: [
            {
              id: 'state1',
              task: 123,
              _meta: { type: NodeTypes.ASSISTANT },
            },
          ],
        }

        const nextConfig: any = {
          states: [
            {
              id: 'state1',
              task: 'valid task', // Fixed
              _meta: { type: NodeTypes.ASSISTANT },
            },
          ],
        }

        expect(shouldResolveIssue(issue, prevConfig, nextConfig)).toBe(true)
      })

      it('does not resolve when finish_iteration is invalid but unchanged', () => {
        const issue: WorkflowIssue = {
          id: 'iss-3',
          message: 'Invalid type (expected boolean)',
          path: 'finish_iteration',
          stateId: 'state1',
          configLine: 15,
        }

        const prevConfig: any = {
          states: [
            {
              id: 'state1',
              finish_iteration: 'true', // Wrong type (string instead of boolean)
              _meta: { type: NodeTypes.ASSISTANT },
            },
          ],
        }

        const nextConfig: any = {
          states: [
            {
              id: 'state1',
              finish_iteration: 'true', // Still wrong, unchanged
              _meta: { type: NodeTypes.ASSISTANT },
            },
          ],
        }

        expect(shouldResolveIssue(issue, prevConfig, nextConfig)).toBe(false)
      })

      it('does not resolve when next.state_id is invalid but unchanged', () => {
        const issue: WorkflowIssue = {
          id: 'iss-4',
          message: 'Invalid reference',
          path: 'next.state_id',
          stateId: 'state1',
          configLine: 20,
        }

        const prevConfig: any = {
          states: [
            {
              id: 'state1',
              next: { state_id: 'nonexistent' }, // Invalid reference
              _meta: { type: NodeTypes.ASSISTANT },
            },
          ],
        }

        const nextConfig: any = {
          states: [
            {
              id: 'state1',
              next: { state_id: 'nonexistent' }, // Still invalid, unchanged
              _meta: { type: NodeTypes.ASSISTANT },
            },
          ],
        }

        expect(shouldResolveIssue(issue, prevConfig, nextConfig)).toBe(false)
      })

      it('resolves when next.state_id value changes', () => {
        const issue: WorkflowIssue = {
          id: 'iss-4',
          message: 'Invalid reference',
          path: 'next.state_id',
          stateId: 'state1',
          configLine: 20,
        }

        const prevConfig: any = {
          states: [
            {
              id: 'state1',
              next: { state_id: 'nonexistent' },
              _meta: { type: NodeTypes.ASSISTANT },
            },
          ],
        }

        const nextConfig: any = {
          states: [
            {
              id: 'state1',
              next: { state_id: 'state2' }, // Fixed
              _meta: { type: NodeTypes.ASSISTANT },
            },
          ],
        }

        expect(shouldResolveIssue(issue, prevConfig, nextConfig)).toBe(true)
      })
    })
  })

  describe('entity-level changes', () => {
    describe('assistant entities', () => {
      it('resolves issue when entity is removed', () => {
        const issue: WorkflowIssue = {
          id: 'issue1',
          message: 'Test issue',
          stateId: 'state1',
          path: 'name',
          configLine: 1,
        }

        const prevConfig: Partial<WorkflowConfiguration> = {
          states: [
            { id: 'state1', assistant_id: 'assistant1', _meta: { type: NodeTypes.ASSISTANT } },
          ],
          assistants: [{ id: 'assistant1', name: 'Assistant 1' }],
        } as Partial<WorkflowConfiguration>

        const nextConfig: Partial<WorkflowConfiguration> = {
          states: [
            { id: 'state1', assistant_id: 'assistant1', _meta: { type: NodeTypes.ASSISTANT } },
          ],
          assistants: [], // Entity removed
        } as Partial<WorkflowConfiguration>

        expect(shouldResolveIssue(issue, prevConfig as any, nextConfig as any)).toBe(true)
      })

      it('resolves issue when entity path value changes', () => {
        const issue: WorkflowIssue = {
          id: 'issue1',
          message: 'Test issue',
          stateId: 'state1',
          path: 'name',
          configLine: 1,
        }

        const prevConfig: Partial<WorkflowConfiguration> = {
          states: [
            { id: 'state1', assistant_id: 'assistant1', _meta: { type: NodeTypes.ASSISTANT } },
          ],
          assistants: [{ id: 'assistant1', name: 'Old Name' }],
        } as Partial<WorkflowConfiguration>

        const nextConfig: Partial<WorkflowConfiguration> = {
          states: [
            { id: 'state1', assistant_id: 'assistant1', _meta: { type: NodeTypes.ASSISTANT } },
          ],
          assistants: [{ id: 'assistant1', name: 'New Name' }],
        } as Partial<WorkflowConfiguration>

        expect(shouldResolveIssue(issue, prevConfig as any, nextConfig as any)).toBe(true)
      })

      it('does not resolve when entity path value stays same', () => {
        const issue: WorkflowIssue = {
          id: 'issue1',
          message: 'Test issue',
          stateId: 'state1',
          path: 'name',
          configLine: 1,
        }

        const prevConfig: Partial<WorkflowConfiguration> = {
          states: [
            { id: 'state1', assistant_id: 'assistant1', _meta: { type: NodeTypes.ASSISTANT } },
          ],
          assistants: [{ id: 'assistant1', name: 'Same Name' }],
        } as Partial<WorkflowConfiguration>

        const nextConfig: Partial<WorkflowConfiguration> = {
          states: [
            { id: 'state1', assistant_id: 'assistant1', _meta: { type: NodeTypes.ASSISTANT } },
          ],
          assistants: [{ id: 'assistant1', name: 'Same Name' }],
        } as Partial<WorkflowConfiguration>

        expect(shouldResolveIssue(issue, prevConfig as any, nextConfig as any)).toBe(false)
      })

      it('resolves issue when nested entity path changes', () => {
        const issue: WorkflowIssue = {
          id: 'issue1',
          message: 'Test issue',
          stateId: 'state1',
          path: 'config.options.retries',
          configLine: 1,
        }

        const prevConfig: any = {
          states: [
            { id: 'state1', assistant_id: 'assistant1', _meta: { type: NodeTypes.ASSISTANT } },
          ],
          assistants: [{ id: 'assistant1', config: { options: { retries: 3 } } }],
        }

        const nextConfig: any = {
          states: [
            { id: 'state1', assistant_id: 'assistant1', _meta: { type: NodeTypes.ASSISTANT } },
          ],
          assistants: [{ id: 'assistant1', config: { options: { retries: 5 } } }],
        }

        expect(shouldResolveIssue(issue, prevConfig as any, nextConfig as any)).toBe(true)
      })
    })

    describe('tool entities', () => {
      it('resolves issue when tool entity changes', () => {
        const issue: WorkflowIssue = {
          id: 'issue1',
          message: 'Test issue',
          stateId: 'state1',
          path: 'config.timeout',
          configLine: 1,
        }

        const prevConfig: any = {
          states: [{ id: 'state1', tool_id: 'tool1', _meta: { type: NodeTypes.TOOL } }],
          tools: [{ id: 'tool1', config: { timeout: 30 } }],
        }

        const nextConfig: any = {
          states: [{ id: 'state1', tool_id: 'tool1', _meta: { type: NodeTypes.TOOL } }],
          tools: [{ id: 'tool1', config: { timeout: 60 } }],
        }

        expect(shouldResolveIssue(issue, prevConfig as any, nextConfig as any)).toBe(true)
      })
    })

    describe('custom_node entities', () => {
      it('resolves issue when custom_node entity changes', () => {
        const issue: WorkflowIssue = {
          id: 'issue1',
          message: 'Test issue',
          stateId: 'state1',
          path: 'code',
          configLine: 1,
        }

        const prevConfig: any = {
          states: [
            { id: 'state1', custom_node_id: 'transform1', _meta: { type: NodeTypes.TRANSFORM } },
          ],
          custom_nodes: [{ id: 'transform1', code: 'old code' }],
        }

        const nextConfig: any = {
          states: [
            { id: 'state1', custom_node_id: 'transform1', _meta: { type: NodeTypes.TRANSFORM } },
          ],
          custom_nodes: [{ id: 'transform1', code: 'new code' }],
        }

        expect(shouldResolveIssue(issue, prevConfig as any, nextConfig as any)).toBe(true)
      })
    })
  })

  describe('edge cases', () => {
    it('returns false when state has no entity (meta state)', () => {
      const issue: WorkflowIssue = {
        id: 'issue1',
        message: 'Test issue',
        stateId: 'state1',
        path: 'name',
        configLine: 1,
      }

      const prevConfig: Partial<WorkflowConfiguration> = {
        states: [{ id: 'state1', _meta: { type: NodeTypes.START } }],
      } as Partial<WorkflowConfiguration>

      const nextConfig: Partial<WorkflowConfiguration> = {
        states: [{ id: 'state1', _meta: { type: NodeTypes.START } }],
      } as Partial<WorkflowConfiguration>

      expect(shouldResolveIssue(issue, prevConfig as any, nextConfig as any)).toBe(false)
    })

    it('resolves issue when entity ID is missing (treats as entity removed)', () => {
      const issue: WorkflowIssue = {
        id: 'issue1',
        message: 'Test issue',
        stateId: 'state1',
        path: 'name',
        configLine: 1,
      }

      const prevConfig: Partial<WorkflowConfiguration> = {
        states: [
          // Missing assistant_id
          { id: 'state1', _meta: { type: NodeTypes.ASSISTANT } },
        ],
        assistants: [{ id: 'assistant1', name: 'Assistant 1' }],
      } as Partial<WorkflowConfiguration>

      const nextConfig: Partial<WorkflowConfiguration> = {
        states: [{ id: 'state1', _meta: { type: NodeTypes.ASSISTANT } }],
        assistants: [{ id: 'assistant1', name: 'Assistant 1' }],
      } as Partial<WorkflowConfiguration>

      // When entity ID is missing, entities can't be found, so issue is resolved
      expect(shouldResolveIssue(issue, prevConfig as any, nextConfig as any)).toBe(true)
    })

    it('resolves issue when state is missing _meta', () => {
      const issue: WorkflowIssue = {
        id: 'issue1',
        message: 'Test issue',
        stateId: 'state1',
        path: 'task',
        configLine: 1,
      }

      const prevConfig: Partial<WorkflowConfiguration> = {
        states: [{ id: 'state1', task: 'task', _meta: { type: NodeTypes.ASSISTANT } }],
      } as Partial<WorkflowConfiguration>

      const nextConfig: Partial<WorkflowConfiguration> = {
        states: [
          // Missing _meta
          { id: 'state1', task: 'task' },
        ],
      } as Partial<WorkflowConfiguration>

      expect(shouldResolveIssue(issue, prevConfig as any, nextConfig as any)).toBe(true)
    })
  })
})
