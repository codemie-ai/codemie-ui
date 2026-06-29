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

import { describe, expect, it } from 'vitest'

import { AssistantType } from '@/constants/assistants'
import { transformAssistantToCreateDTO } from '@/store/utils/assistants'
import { Assistant, HedgingConfig } from '@/types/entity/assistant'

const baseAssistant: Partial<Assistant> = {
  name: 'Test Assistant',
  description: 'A test assistant',
  system_prompt: 'You are helpful.',
  project: 'test-project',
  llm_model_type: 'gpt-4',
  shared: false,
  is_global: false,
  type: AssistantType.CODEMIE,
  toolkits: [],
  guardrail_assignments: [],
  skills: [],
  system_prompt_history: [],
}

describe('transformAssistantToCreateDTO', () => {
  describe('hedging_config', () => {
    it('includes hedging_config when provided', () => {
      const hedgingConfig: HedgingConfig = {
        tool: { name: 'web_search' },
        provider_tool: null,
        timeout_ms: 500,
        input_mapping: { query: '{{query}}' },
        output_field: 'result',
      }

      const dto = transformAssistantToCreateDTO({
        ...baseAssistant,
        hedging_config: hedgingConfig,
      } as Assistant)

      expect(dto.hedging_config).toEqual(hedgingConfig)
    })

    it('sets hedging_config to null when it is undefined', () => {
      const dto = transformAssistantToCreateDTO({
        ...baseAssistant,
        hedging_config: undefined,
      } as Assistant)

      expect(dto.hedging_config).toBeNull()
    })

    it('sets hedging_config to null when it is null', () => {
      const dto = transformAssistantToCreateDTO({
        ...baseAssistant,
        hedging_config: null,
      } as Assistant)

      expect(dto.hedging_config).toBeNull()
    })

    it('includes provider_tool hedging config', () => {
      const hedgingConfig: HedgingConfig = {
        tool: null,
        provider_tool: {
          provider_name: 'my-provider',
          toolkit_name: 'search-toolkit',
          tool_name: 'fast_search',
          result_condition: 'non_empty',
        },
        timeout_ms: 200,
        input_mapping: {},
        output_field: null,
      }

      const dto = transformAssistantToCreateDTO({
        ...baseAssistant,
        hedging_config: hedgingConfig,
      } as Assistant)

      expect(dto.hedging_config).toEqual(hedgingConfig)
      expect(dto.hedging_config?.provider_tool?.provider_name).toBe('my-provider')
      expect(dto.hedging_config?.provider_tool?.tool_name).toBe('fast_search')
    })

    it('preserves timeout_ms value', () => {
      const hedgingConfig: HedgingConfig = {
        tool: { name: 'search' },
        timeout_ms: 1500,
      }

      const dto = transformAssistantToCreateDTO({
        ...baseAssistant,
        hedging_config: hedgingConfig,
      } as Assistant)

      expect(dto.hedging_config?.timeout_ms).toBe(1500)
    })
  })

  describe('skill_ids', () => {
    it('extracts skill_ids from skills array when skill_ids not present', () => {
      const dto = transformAssistantToCreateDTO({
        ...baseAssistant,
        skills: [
          { id: 'skill-1', name: 'Skill 1' } as any,
          { id: 'skill-2', name: 'Skill 2' } as any,
        ],
      } as Assistant)

      expect(dto.skill_ids).toEqual(['skill-1', 'skill-2'])
    })

    it('prefers explicit skill_ids over skills array', () => {
      const dto = transformAssistantToCreateDTO({
        ...baseAssistant,
        skill_ids: ['explicit-1'],
        skills: [{ id: 'skill-from-array', name: 'Skill' } as any],
      } as any)

      expect(dto.skill_ids).toEqual(['explicit-1'])
    })
  })
})
