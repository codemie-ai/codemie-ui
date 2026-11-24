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
import { extractHeadroomFieldErrors, transformAssistantToCreateDTO } from '@/store/utils/assistants'
import { Assistant, ContextType, HeadroomConfig, HedgingConfig } from '@/types/entity/assistant'

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
  describe('optional numeric model params', () => {
    it('keeps temperature and top_p when set, including top_p of 0', () => {
      const dto = transformAssistantToCreateDTO({
        ...baseAssistant,
        temperature: 0.7,
        top_p: 0,
      } as Assistant)

      expect(dto.temperature).toBe(0.7)
      expect(dto.top_p).toBe(0)
    })

    it('forwards explicit null so the backend clears the stored value', () => {
      const dto = transformAssistantToCreateDTO({
        ...baseAssistant,
        temperature: null,
        top_p: null,
      } as unknown as Assistant)

      expect(dto.temperature).toBeNull()
      expect(dto.top_p).toBeNull()
      expect(JSON.parse(JSON.stringify(dto))).toMatchObject({ temperature: null, top_p: null })
    })

    it('omits temperature and top_p when they are undefined', () => {
      const dto = transformAssistantToCreateDTO(baseAssistant as Assistant)

      expect(JSON.parse(JSON.stringify(dto))).not.toHaveProperty('temperature')
      expect(JSON.parse(JSON.stringify(dto))).not.toHaveProperty('top_p')
    })
  })

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

  describe('hide_tool_outputs', () => {
    it('forwards the boolean switch', () => {
      const dto = transformAssistantToCreateDTO({
        ...baseAssistant,
        hide_tool_outputs: true,
      } as Assistant)

      expect(dto.hide_tool_outputs).toBe(true)
    })

    it('defaults to false when the switch is absent', () => {
      const dto = transformAssistantToCreateDTO(baseAssistant as Assistant)

      expect(dto.hide_tool_outputs).toBe(false)
    })
  })

  describe('interactive_enabled', () => {
    it('forwards the boolean switch', () => {
      const dto = transformAssistantToCreateDTO({
        ...baseAssistant,
        interactive_enabled: true,
      } as Assistant)

      expect(dto.interactive_enabled).toBe(true)
    })

    it('defaults to false when the switch is absent', () => {
      const dto = transformAssistantToCreateDTO(baseAssistant as Assistant)

      expect(dto.interactive_enabled).toBe(false)
    })

    it('derives the switch from the legacy per-group config when the new field is missing', () => {
      const dto = transformAssistantToCreateDTO({
        ...baseAssistant,
        interactive_features: { action_buttons: false, choice: true, short_forms: false },
      } as unknown as Assistant)

      expect(dto.interactive_enabled).toBe(true)
    })

    it('stays false when the legacy config has every group disabled', () => {
      const dto = transformAssistantToCreateDTO({
        ...baseAssistant,
        interactive_features: { action_buttons: false, choice: false, short_forms: false },
      } as unknown as Assistant)

      expect(dto.interactive_enabled).toBe(false)
    })

    it('prefers an explicit false switch over an enabled legacy config', () => {
      const dto = transformAssistantToCreateDTO({
        ...baseAssistant,
        interactive_enabled: false,
        interactive_features: { action_buttons: true, choice: true, short_forms: true },
      } as unknown as Assistant)

      expect(dto.interactive_enabled).toBe(false)
    })

    it('ignores a legacy config that is not an object', () => {
      const dto = transformAssistantToCreateDTO({
        ...baseAssistant,
        interactive_features: null,
      } as unknown as Assistant)

      expect(dto.interactive_enabled).toBe(false)
    })
  })

  describe('source_assistant_id', () => {
    it('sets source_assistant_id when a source id is passed', () => {
      const dto = transformAssistantToCreateDTO(baseAssistant as Assistant, 'source-assistant-1')

      expect(dto.source_assistant_id).toBe('source-assistant-1')
    })

    it('omits source_assistant_id when no source id is passed', () => {
      const dto = transformAssistantToCreateDTO(baseAssistant as Assistant)

      expect(dto.source_assistant_id).toBeUndefined()
    })
  })

  describe('file_attachment_enabled', () => {
    it('includes file_attachment_enabled in the DTO', () => {
      const dto = transformAssistantToCreateDTO({
        ...baseAssistant,
        file_attachment_enabled: false,
      } as Assistant)

      expect(dto.file_attachment_enabled).toBe(false)
    })

    it('defaults file_attachment_enabled to true when unset', () => {
      const dto = transformAssistantToCreateDTO(baseAssistant as Assistant)

      expect(dto.file_attachment_enabled).toBe(true)
    })
  })

  describe('disabled_context_tools', () => {
    it('includes disabled_context_tools in the create DTO, defaulting to []', () => {
      const dto = transformAssistantToCreateDTO({
        ...baseAssistant,
        disabled_context_tools: ['search_kb'],
      } as Assistant)
      expect(dto.disabled_context_tools).toEqual(['search_kb'])
    })

    it('defaults disabled_context_tools to [] when the assistant has none', () => {
      const dto = transformAssistantToCreateDTO({
        ...baseAssistant,
        disabled_context_tools: undefined,
      } as Assistant)
      expect(dto.disabled_context_tools).toEqual([])
    })

    it('keeps default tools out of toolkits when a datasource is attached, and sends the deselection', () => {
      const toolkit = (name: string, tools: string[]) => ({
        toolkit: name,
        label: name,
        settings_config: false,
        is_external: false,
        tools: tools.map((toolName) => ({ name: toolName, label: toolName })),
      })
      const dto = transformAssistantToCreateDTO({
        ...baseAssistant,
        context: [{ name: 'repo', context_type: ContextType.CODE, id: '1' }],
        toolkits: [
          toolkit('Codebase Tools', ['get_repository_file_tree', 'read_file']),
          toolkit('Search', ['search_code_repo']),
        ],
        disabled_context_tools: ['get_repository_file_tree'],
      } as Assistant)

      expect(dto.toolkits?.map((tk) => tk.tools?.map((tool) => tool.name))).toEqual([['read_file']])
      expect(dto.disabled_context_tools).toEqual(['get_repository_file_tree'])
    })
  })

  describe('effort', () => {
    it('includes effort when provided', () => {
      const dto = transformAssistantToCreateDTO({
        ...baseAssistant,
        effort: 'high',
      } as Assistant)

      expect(dto.effort).toBe('high')
    })

    it('sets effort to undefined when it is not set', () => {
      const dto = transformAssistantToCreateDTO({
        ...baseAssistant,
      } as Assistant)

      expect(dto.effort).toBeUndefined()
    })
  })

  describe('headroom_config', () => {
    const cfg: HeadroomConfig = {
      enabled: true,
      compress_user_messages: false,
      compress_tool_outputs: true,
      strategy: 'lossless',
    }

    it('sends the whole object when present', () => {
      const dto = transformAssistantToCreateDTO({
        ...baseAssistant,
        headroom_config: cfg,
      } as Assistant)
      expect(dto.headroom_config).toEqual(cfg)
    })

    it('sends null when undefined', () => {
      const dto = transformAssistantToCreateDTO(baseAssistant as Assistant)
      expect(dto.headroom_config).toBeNull()
    })

    it('sends enabled:false object unchanged', () => {
      const off = { ...cfg, enabled: false }
      const dto = transformAssistantToCreateDTO({
        ...baseAssistant,
        headroom_config: off,
      } as Assistant)
      expect(dto.headroom_config).toEqual(off)
    })
  })

  describe('extractHeadroomFieldErrors', () => {
    it('maps FastAPI-style loc arrays', () => {
      const err = {
        parsedError: {
          message: 'Validation error',
          details: [{ loc: ['body', 'headroom_config', 'strategy'], msg: 'bad strategy' }],
        },
      }
      expect(extractHeadroomFieldErrors(err)).toEqual({
        'headroom_config.strategy': 'bad strategy',
      })
    })

    it('maps a details string mentioning the field', () => {
      const err = {
        parsedError: { message: 'Invalid', details: 'headroom_config.strategy: unsupported' },
      }
      expect(extractHeadroomFieldErrors(err)).toEqual({
        'headroom_config.strategy': 'headroom_config.strategy: unsupported',
      })
    })

    it('returns undefined for unrelated errors', () => {
      expect(
        extractHeadroomFieldErrors({ parsedError: { message: 'x', details: 'other' } })
      ).toBeUndefined()
      expect(extractHeadroomFieldErrors(new Error('x'))).toBeUndefined()
    })
  })
})
