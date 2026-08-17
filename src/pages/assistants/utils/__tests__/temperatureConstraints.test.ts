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

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as Yup from 'yup'

import { appInfoStore } from '@/store/appInfo'
import { ModelOption } from '@/types/entity/configuration'

import {
  isClaudeOnAnthropicProvider,
  getTemperatureMax,
  buildTemperatureRule,
} from '../temperatureConstraints'

vi.mock('@/store/appInfo', () => ({
  appInfoStore: { llmModels: [] as ModelOption[] },
}))

const model = (over: Partial<ModelOption>): ModelOption => ({
  value: 'model-value',
  label: 'Model Label',
  isDefault: false,
  ...over,
})

describe('isClaudeOnAnthropicProvider', () => {
  it.each<[string, ModelOption | undefined, boolean]>([
    ['undefined model', undefined, false],
    ['gpt-4o on azure_openai', model({ value: 'gpt-4o', provider: 'azure_openai' }), false],
    [
      'gpt-4o on aws_bedrock (defensive)',
      model({ value: 'gpt-4o', provider: 'aws_bedrock' }),
      false,
    ],
    [
      'claude-3-5-sonnet on aws_bedrock',
      model({ value: 'claude-3-5-sonnet', provider: 'aws_bedrock' }),
      true,
    ],
    [
      'claude-4-opus on aws_bedrock',
      model({ value: 'claude-4-opus', provider: 'aws_bedrock' }),
      true,
    ],
    [
      'claude-sonnet-v2-vertex on google_vertexai',
      model({ value: 'claude-sonnet-v2-vertex', provider: 'google_vertexai' }),
      true,
    ],
    [
      'claude-sonnet-4 on vertex_ai-anthropic_models (canonical Vertex-Claude provider)',
      model({ value: 'claude-sonnet-4', provider: 'vertex_ai-anthropic_models' }),
      true,
    ],
    [
      'claude-3-5-sonnet on azure_openai (wrong provider)',
      model({ value: 'claude-3-5-sonnet', provider: 'azure_openai' }),
      false,
    ],
    ['claude on aws_bedrock with no provider field', model({ value: 'claude-3-5-sonnet' }), false],
    [
      'case-insensitive CLAUDE-4-OPUS on aws_bedrock',
      model({ value: 'CLAUDE-4-OPUS', provider: 'aws_bedrock' }),
      true,
    ],
  ])('%s -> %s', (_desc, input, expected) => {
    expect(isClaudeOnAnthropicProvider(input)).toBe(expected)
  })
})

describe('getTemperatureMax', () => {
  beforeEach(() => {
    appInfoStore.llmModels = [
      model({
        value: 'claude-3-5-sonnet',
        provider: 'aws_bedrock',
        label: 'Bedrock Claude 3.5 Sonnet',
      }),
      model({
        value: 'claude-sonnet-v2-vertex',
        provider: 'google_vertexai',
        label: 'Vertex Claude Sonnet v2',
      }),
      model({
        value: 'claude-sonnet-4',
        provider: 'vertex_ai-anthropic_models',
        label: 'Vertex Claude Sonnet 4',
      }),
      model({ value: 'gpt-4o-2024-08-06', provider: 'azure_openai', label: 'GPT-4o' }),
    ]
  })

  it('returns 1 for a Claude Bedrock model', () => {
    expect(getTemperatureMax('claude-3-5-sonnet')).toBe(1)
  })

  it('returns 1 for a Claude Vertex model on google_vertexai', () => {
    expect(getTemperatureMax('claude-sonnet-v2-vertex')).toBe(1)
  })

  it('returns 1 for a Claude Vertex model on vertex_ai-anthropic_models', () => {
    expect(getTemperatureMax('claude-sonnet-4')).toBe(1)
  })

  it('returns 2 for a non-Claude model', () => {
    expect(getTemperatureMax('gpt-4o-2024-08-06')).toBe(2)
  })

  it('returns 2 (safe default) for a non-Claude model not in the store', () => {
    expect(getTemperatureMax('does-not-exist')).toBe(2)
  })

  it('returns 2 for undefined model value', () => {
    expect(getTemperatureMax(undefined)).toBe(2)
  })

  it('returns 1 by name when a Claude model is not (yet) in the store', () => {
    // simulates the EditAssistant in-flight window and the getLLMModels-failure path
    appInfoStore.llmModels = []
    expect(getTemperatureMax('claude-3-5-sonnet')).toBe(1)
    expect(getTemperatureMax('claude-sonnet-v2-vertex')).toBe(1)
    expect(getTemperatureMax('CLAUDE-4-OPUS')).toBe(1)
  })

  it('returns 2 by name when a non-Claude model is not in the store', () => {
    appInfoStore.llmModels = []
    expect(getTemperatureMax('gpt-4o-2024-08-06')).toBe(2)
    expect(getTemperatureMax('gemini-2.5-pro')).toBe(2)
  })
})

describe('buildTemperatureRule', () => {
  beforeEach(() => {
    appInfoStore.llmModels = [
      model({
        value: 'claude-3-5-sonnet',
        provider: 'aws_bedrock',
        label: 'Bedrock Claude 3.5 Sonnet',
      }),
      model({
        value: 'claude-sonnet-4',
        provider: 'vertex_ai-anthropic_models',
        label: 'Vertex Claude Sonnet 4',
      }),
      model({ value: 'gpt-4o-2024-08-06', provider: 'azure_openai', label: 'GPT-4o' }),
    ]
  })

  const wrap = () =>
    Yup.object({
      llm_model_type: Yup.string(),
      temperature: buildTemperatureRule(),
    })

  it('accepts 0.5 for any selected model', async () => {
    await expect(
      wrap().validate({ llm_model_type: 'gpt-4o-2024-08-06', temperature: 0.5 })
    ).resolves.toBeDefined()
    await expect(
      wrap().validate({ llm_model_type: 'claude-3-5-sonnet', temperature: 0.5 })
    ).resolves.toBeDefined()
  })

  it('accepts boundary 1.0 for Claude', async () => {
    await expect(
      wrap().validate({ llm_model_type: 'claude-3-5-sonnet', temperature: 1 })
    ).resolves.toBeDefined()
  })

  it('rejects 1.5 for Claude with the Claude-specific message', async () => {
    await expect(
      wrap().validate({ llm_model_type: 'claude-3-5-sonnet', temperature: 1.5 })
    ).rejects.toThrow(/between 0 and 1 for Claude models/)
  })

  it('rejects 1.5 for Vertex Claude on vertex_ai-anthropic_models', async () => {
    await expect(
      wrap().validate({ llm_model_type: 'claude-sonnet-4', temperature: 1.5 })
    ).rejects.toThrow(/between 0 and 1 for Claude models/)
  })

  it('accepts 1.5 for a non-Claude model', async () => {
    await expect(
      wrap().validate({ llm_model_type: 'gpt-4o-2024-08-06', temperature: 1.5 })
    ).resolves.toBeDefined()
  })

  it('rejects 2.5 for a non-Claude model with the standard message', async () => {
    await expect(
      wrap().validate({ llm_model_type: 'gpt-4o-2024-08-06', temperature: 2.5 })
    ).rejects.toThrow(/between 0 and 2/)
  })

  it('rejects negative values with the min message', async () => {
    await expect(
      wrap().validate({ llm_model_type: 'gpt-4o-2024-08-06', temperature: -0.1 })
    ).rejects.toThrow(/at least 0/)
  })
})
