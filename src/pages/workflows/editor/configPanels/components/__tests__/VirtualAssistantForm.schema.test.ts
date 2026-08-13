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

import { appInfoStore } from '@/store/appInfo'
import { ModelOption } from '@/types/entity/configuration'

import { virtualAssistantValidationSchema } from '../VirtualAssistantForm'

vi.mock('@/store/appInfo', () => ({
  appInfoStore: { llmModels: [] as ModelOption[] },
}))

const model = (over: Partial<ModelOption>): ModelOption => ({
  value: 'model-value',
  label: 'Model Label',
  isDefault: false,
  ...over,
})

const baseValues = {
  system_prompt: 'You are helpful',
  toolkits: [],
  mcp_servers: [],
  context: [],
}

describe('VirtualAssistantForm validation schema — temperature', () => {
  beforeEach(() => {
    appInfoStore.llmModels = [
      model({
        value: 'claude-3-5-sonnet',
        provider: 'aws_bedrock',
        label: 'Bedrock Claude 3.5 Sonnet',
      }),
      model({ value: 'gpt-4o-2024-08-06', provider: 'azure_openai', label: 'GPT-4o' }),
    ]
  })

  it('rejects temperature 1.5 when a Claude model is selected', async () => {
    await expect(
      virtualAssistantValidationSchema.validate({
        ...baseValues,
        llm_model_type: 'claude-3-5-sonnet',
        temperature: 1.5,
      })
    ).rejects.toThrow(/between 0 and 1 for Claude models/)
  })

  it('accepts temperature 1.5 when a non-Claude model is selected', async () => {
    await expect(
      virtualAssistantValidationSchema.validate({
        ...baseValues,
        llm_model_type: 'gpt-4o-2024-08-06',
        temperature: 1.5,
      })
    ).resolves.toBeDefined()
  })
})
