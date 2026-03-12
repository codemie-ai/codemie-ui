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

import { NodeTypes } from '@/types/workflowEditor/base'
import {
  StateConfiguration,
  AssistantStateConfiguration,
  ToolStateConfiguration,
  CustomNodeStateConfiguration,
  TransformStateConfiguration,
  ConditionalStateConfiguration,
} from '@/types/workflowEditor/configuration'

import {
  isMetaState,
  isExecutionState,
  isDecisionState,
  isConnected,
  hasConditionLogic,
  hasSwitchLogic,
  hasMultipleNextStates,
  hasDecisionLogic,
  isIterator,
  isIteratorID,
  isIteratorParent,
} from '../stateTypeCheckers'

describe('stateTypeCheckers', () => {
  describe('isMetaState', () => {
    it('returns true for START node', () => {
      const state: StateConfiguration = {
        id: 'start',
        _meta: { type: NodeTypes.START },
      } as StateConfiguration

      expect(isMetaState(state)).toBe(true)
    })

    it('returns true for END node', () => {
      const state: StateConfiguration = {
        id: 'end',
        _meta: { type: NodeTypes.END },
      } as StateConfiguration

      expect(isMetaState(state)).toBe(true)
    })

    it('returns true for CONDITIONAL node', () => {
      const state: ConditionalStateConfiguration = {
        id: 'conditional_1',
        _meta: {
          type: NodeTypes.CONDITIONAL,
          data: {
            condition: {
              expression: 'test',
              then: 'state_1',
              otherwise: 'state_2',
            },
          },
        },
      } as ConditionalStateConfiguration

      expect(isMetaState(state)).toBe(true)
    })

    it('returns true for SWITCH node', () => {
      const state: StateConfiguration = {
        id: 'switch_1',
        _meta: { type: NodeTypes.SWITCH },
      } as StateConfiguration

      expect(isMetaState(state)).toBe(true)
    })

    it('returns true for ITERATOR node', () => {
      const state: StateConfiguration = {
        id: 'iterator_1',
        _meta: { type: NodeTypes.ITERATOR },
      } as StateConfiguration

      expect(isMetaState(state)).toBe(true)
    })

    it('returns true for NOTE node', () => {
      const state: StateConfiguration = {
        id: 'note_1',
        _meta: { type: NodeTypes.NOTE },
      } as StateConfiguration

      expect(isMetaState(state)).toBe(true)
    })

    it('returns false for ASSISTANT node', () => {
      const state: AssistantStateConfiguration = {
        id: 'assistant_1',
        assistant_id: 'assistant1',
        _meta: { type: NodeTypes.ASSISTANT },
      } as AssistantStateConfiguration

      expect(isMetaState(state)).toBe(false)
    })

    it('returns false for TOOL node', () => {
      const state: ToolStateConfiguration = {
        id: 'tool_1',
        tool_id: 'tool1',
        _meta: { type: NodeTypes.TOOL },
      } as ToolStateConfiguration

      expect(isMetaState(state)).toBe(false)
    })

    it('returns false for CUSTOM node', () => {
      const state: CustomNodeStateConfiguration = {
        id: 'custom_1',
        custom_node_id: 'custom1',
        _meta: { type: NodeTypes.CUSTOM },
      } as CustomNodeStateConfiguration

      expect(isMetaState(state)).toBe(false)
    })

    it('returns false for TRANSFORM node', () => {
      const state: TransformStateConfiguration = {
        id: 'transform_1',
        custom_node_id: 'transform1',
        _meta: { type: NodeTypes.TRANSFORM },
      } as TransformStateConfiguration

      expect(isMetaState(state)).toBe(false)
    })

    it('returns false for null state', () => {
      expect(isMetaState(null)).toBe(false)
    })

    it('returns false for state without _meta', () => {
      const state = { id: 'test' } as StateConfiguration
      expect(isMetaState(state)).toBe(false)
    })

    it('returns false for state without type', () => {
      const state = { id: 'test', _meta: {} } as StateConfiguration
      expect(isMetaState(state)).toBe(false)
    })
  })

  describe('isExecutionState', () => {
    it('returns true for ASSISTANT node', () => {
      const state: AssistantStateConfiguration = {
        id: 'assistant_1',
        assistant_id: 'assistant1',
        _meta: { type: NodeTypes.ASSISTANT },
      } as AssistantStateConfiguration

      expect(isExecutionState(state)).toBe(true)
    })

    it('returns true for TOOL node', () => {
      const state: ToolStateConfiguration = {
        id: 'tool_1',
        tool_id: 'tool1',
        _meta: { type: NodeTypes.TOOL },
      } as ToolStateConfiguration

      expect(isExecutionState(state)).toBe(true)
    })

    it('returns true for CUSTOM node', () => {
      const state: CustomNodeStateConfiguration = {
        id: 'custom_1',
        custom_node_id: 'custom1',
        _meta: { type: NodeTypes.CUSTOM },
      } as CustomNodeStateConfiguration

      expect(isExecutionState(state)).toBe(true)
    })

    it('returns true for TRANSFORM node', () => {
      const state: TransformStateConfiguration = {
        id: 'transform_1',
        custom_node_id: 'transform1',
        _meta: { type: NodeTypes.TRANSFORM },
      } as TransformStateConfiguration

      expect(isExecutionState(state)).toBe(true)
    })

    it('returns false for START node', () => {
      const state: StateConfiguration = {
        id: 'start',
        _meta: { type: NodeTypes.START },
      } as StateConfiguration

      expect(isExecutionState(state)).toBe(false)
    })

    it('returns false for END node', () => {
      const state: StateConfiguration = {
        id: 'end',
        _meta: { type: NodeTypes.END },
      } as StateConfiguration

      expect(isExecutionState(state)).toBe(false)
    })

    it('returns false for CONDITIONAL node', () => {
      const state: ConditionalStateConfiguration = {
        id: 'conditional_1',
        _meta: {
          type: NodeTypes.CONDITIONAL,
          data: {
            condition: {
              expression: 'test',
              then: 'state_1',
              otherwise: 'state_2',
            },
          },
        },
      } as ConditionalStateConfiguration

      expect(isExecutionState(state)).toBe(false)
    })

    it('returns false for SWITCH node', () => {
      const state: StateConfiguration = {
        id: 'switch_1',
        _meta: { type: NodeTypes.SWITCH },
      } as StateConfiguration

      expect(isExecutionState(state)).toBe(false)
    })

    it('returns false for ITERATOR node', () => {
      const state: StateConfiguration = {
        id: 'iterator_1',
        _meta: { type: NodeTypes.ITERATOR },
      } as StateConfiguration

      expect(isExecutionState(state)).toBe(false)
    })

    it('returns false for NOTE node', () => {
      const state: StateConfiguration = {
        id: 'note_1',
        _meta: { type: NodeTypes.NOTE },
      } as StateConfiguration

      expect(isExecutionState(state)).toBe(false)
    })

    it('returns false for null state', () => {
      expect(isExecutionState(null)).toBe(false)
    })

    it('returns false for state without _meta', () => {
      const state = { id: 'test' } as StateConfiguration
      expect(isExecutionState(state)).toBe(false)
    })

    it('returns false for state without type', () => {
      const state = { id: 'test', _meta: {} } as StateConfiguration
      expect(isExecutionState(state)).toBe(false)
    })
  })

  describe('isDecisionState', () => {
    it('returns true for CONDITIONAL node', () => {
      const state: ConditionalStateConfiguration = {
        id: 'conditional_1',
        _meta: {
          type: NodeTypes.CONDITIONAL,
          data: {
            condition: {
              expression: 'test',
              then: 'state_1',
              otherwise: 'state_2',
            },
          },
        },
      } as ConditionalStateConfiguration

      expect(isDecisionState(state)).toBe(true)
    })

    it('returns true for SWITCH node', () => {
      const state: StateConfiguration = {
        id: 'switch_1',
        _meta: { type: NodeTypes.SWITCH },
      } as StateConfiguration

      expect(isDecisionState(state)).toBe(true)
    })

    it('returns false for ASSISTANT node', () => {
      const state: AssistantStateConfiguration = {
        id: 'assistant_1',
        assistant_id: 'assistant1',
        _meta: { type: NodeTypes.ASSISTANT },
      } as AssistantStateConfiguration

      expect(isDecisionState(state)).toBe(false)
    })

    it('returns false for state without _meta', () => {
      const state = { id: 'test' } as StateConfiguration
      expect(isDecisionState(state)).toBe(false)
    })
  })

  describe('isConnected', () => {
    it('returns true when is_connected is true', () => {
      const state: StateConfiguration = {
        id: 'assistant_1',
        _meta: { type: NodeTypes.ASSISTANT, is_connected: true },
      } as StateConfiguration

      expect(isConnected(state)).toBe(true)
    })

    it('returns false when is_connected is false', () => {
      const state: StateConfiguration = {
        id: 'assistant_1',
        _meta: { type: NodeTypes.ASSISTANT, is_connected: false },
      } as StateConfiguration

      expect(isConnected(state)).toBe(false)
    })

    it('returns false when is_connected is undefined', () => {
      const state: StateConfiguration = {
        id: 'assistant_1',
        _meta: { type: NodeTypes.ASSISTANT },
      } as StateConfiguration

      expect(isConnected(state)).toBe(false)
    })

    it('returns false for null state', () => {
      expect(isConnected(null)).toBe(false)
    })
  })

  describe('isIterator', () => {
    it('returns true for ITERATOR node', () => {
      const state: StateConfiguration = {
        id: 'iterator_1',
        _meta: { type: NodeTypes.ITERATOR },
      } as StateConfiguration

      expect(isIterator(state)).toBe(true)
    })

    it('returns false for non-ITERATOR node', () => {
      const state: AssistantStateConfiguration = {
        id: 'assistant_1',
        assistant_id: 'assistant1',
        _meta: { type: NodeTypes.ASSISTANT },
      } as AssistantStateConfiguration

      expect(isIterator(state)).toBe(false)
    })
  })

  describe('isIteratorID', () => {
    it('returns true for ID with iterator prefix', () => {
      expect(isIteratorID('iterator_1')).toBe(true)
    })

    it('returns false for ID without iterator prefix', () => {
      expect(isIteratorID('assistant_1')).toBe(false)
    })
  })

  describe('isIteratorParent', () => {
    it('returns true when state has iter_key in next', () => {
      const state: StateConfiguration = {
        id: 'assistant_1',
        next: { iter_key: 'items' },
        _meta: { type: NodeTypes.ASSISTANT },
      } as StateConfiguration

      expect(isIteratorParent(state)).toBe(true)
    })

    it('returns false when state has no iter_key', () => {
      const state: StateConfiguration = {
        id: 'assistant_1',
        next: {},
        _meta: { type: NodeTypes.ASSISTANT },
      } as StateConfiguration

      expect(isIteratorParent(state)).toBe(false)
    })

    it('returns false when state has no next', () => {
      const state: StateConfiguration = {
        id: 'assistant_1',
        _meta: { type: NodeTypes.ASSISTANT },
      } as StateConfiguration

      expect(isIteratorParent(state)).toBe(false)
    })
  })

  describe('hasConditionLogic', () => {
    it('returns true when state has condition in next', () => {
      const state: StateConfiguration = {
        id: 'assistant_1',
        next: {
          condition: {
            expression: 'test',
            then: 'state_1',
            otherwise: 'state_2',
          },
        },
        _meta: { type: NodeTypes.ASSISTANT },
      } as StateConfiguration

      expect(hasConditionLogic(state)).toBe(true)
    })

    it('returns false when state has no condition', () => {
      const state: StateConfiguration = {
        id: 'assistant_1',
        next: {},
        _meta: { type: NodeTypes.ASSISTANT },
      } as StateConfiguration

      expect(hasConditionLogic(state)).toBe(false)
    })
  })

  describe('hasSwitchLogic', () => {
    it('returns true when state has switch in next', () => {
      const state: StateConfiguration = {
        id: 'assistant_1',
        next: {
          switch: {
            cases: [],
            default: 'default_state',
          },
        },
        _meta: { type: NodeTypes.ASSISTANT },
      } as StateConfiguration

      expect(hasSwitchLogic(state)).toBe(true)
    })

    it('returns false when state has no switch', () => {
      const state: StateConfiguration = {
        id: 'assistant_1',
        next: {},
        _meta: { type: NodeTypes.ASSISTANT },
      } as StateConfiguration

      expect(hasSwitchLogic(state)).toBe(false)
    })
  })

  describe('hasMultipleNextStates', () => {
    it('returns true when state has state_ids array with items', () => {
      const state: StateConfiguration = {
        id: 'assistant_1',
        next: { state_ids: ['state_1', 'state_2'] },
        _meta: { type: NodeTypes.ASSISTANT },
      } as StateConfiguration

      expect(hasMultipleNextStates(state)).toBe(true)
    })

    it('returns false when state_ids is empty', () => {
      const state: StateConfiguration = {
        id: 'assistant_1',
        next: { state_ids: [] },
        _meta: { type: NodeTypes.ASSISTANT },
      } as StateConfiguration

      expect(hasMultipleNextStates(state)).toBe(false)
    })

    it('returns false when state has no state_ids', () => {
      const state: StateConfiguration = {
        id: 'assistant_1',
        next: {},
        _meta: { type: NodeTypes.ASSISTANT },
      } as StateConfiguration

      expect(hasMultipleNextStates(state)).toBe(false)
    })
  })

  describe('hasDecisionLogic', () => {
    it('returns true when state has condition', () => {
      const state: StateConfiguration = {
        id: 'assistant_1',
        next: {
          condition: {
            expression: 'test',
            then: 'state_1',
            otherwise: 'state_2',
          },
        },
        _meta: { type: NodeTypes.ASSISTANT },
      } as StateConfiguration

      expect(hasDecisionLogic(state)).toBe(true)
    })

    it('returns true when state has switch', () => {
      const state: StateConfiguration = {
        id: 'assistant_1',
        next: {
          switch: {
            cases: [],
            default: 'default_state',
          },
        },
        _meta: { type: NodeTypes.ASSISTANT },
      } as StateConfiguration

      expect(hasDecisionLogic(state)).toBe(true)
    })

    it('returns false when state has neither condition nor switch', () => {
      const state: StateConfiguration = {
        id: 'assistant_1',
        next: {},
        _meta: { type: NodeTypes.ASSISTANT },
      } as StateConfiguration

      expect(hasDecisionLogic(state)).toBe(false)
    })
  })
})
