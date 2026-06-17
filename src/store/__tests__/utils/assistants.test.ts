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

import { transformAssistantToCreateDTO } from '@/store/utils/assistants'
import type { Assistant } from '@/types/entity/assistant'

const buildAssistant = (overrides: Partial<Assistant> = {}): Assistant =>
  ({
    name: 'Test Assistant',
    conversation_starters: [],
    ...overrides,
  }) as Assistant

describe('transformAssistantToCreateDTO — tools_tokens_size_limit', () => {
  it('passes a set value through to the DTO', () => {
    const dto = transformAssistantToCreateDTO(buildAssistant({ tools_tokens_size_limit: 30000 }))
    expect(dto.tools_tokens_size_limit).toBe(30000)
  })

  it('leaves the field undefined when not set', () => {
    const dto = transformAssistantToCreateDTO(buildAssistant())
    expect(dto.tools_tokens_size_limit).toBeUndefined()
  })
})
