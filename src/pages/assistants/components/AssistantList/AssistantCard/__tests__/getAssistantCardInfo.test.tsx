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

import { expect, describe, it, vi } from 'vitest'

import { Assistant } from '@/types/entity/assistant'

import { getAssistantCardInfo } from '../getAssistantCardInfo'

vi.mock('@/constants/assistant', () => ({
  ASSISTANT_DESCRIPTION_LIMIT: 10,
  ASSISTANT_NAME_LIMIT: 5,
}))

describe('getAssistantCardInfo', () => {
  const createMockAssistant = (
    name = 'Test Assistant',
    description = 'Test Description',
    shared = false,
    userId = 'user-123'
  ): Assistant =>
    ({
      id: 'test-id',
      name,
      description,
      shared,
      created_by: {
        id: userId,
        name: 'Test User',
      },
    } as Assistant)

  const mockUser = {
    userId: 'user-123',
    name: 'Test User',
  }

  it('returns correct info for assistant with short name and description', () => {
    const assistant = createMockAssistant('Short', 'Brief desc')

    const result = getAssistantCardInfo(assistant, mockUser)

    expect(result).toEqual({
      name: 'Short',
      description: 'Brief desc',
      isShared: false,
      isOwned: true,
    })
  })

  it('correctly identifies shared assistant', () => {
    const assistant = createMockAssistant('Name', 'Description', true)

    const result = getAssistantCardInfo(assistant, mockUser)

    expect(result.isShared).toBe(true)
  })

  it('correctly identifies owned assistant', () => {
    const assistant = createMockAssistant('Name', 'Description', false, 'user-123')

    const result = getAssistantCardInfo(assistant, mockUser)

    expect(result.isOwned).toBe(true)
  })

  it('correctly identifies non-owned assistant', () => {
    const assistant = createMockAssistant('Name', 'Description', false, 'different-user')

    const result = getAssistantCardInfo(assistant, mockUser)

    expect(result.isOwned).toBe(false)
  })

  it('handles undefined user', () => {
    const assistant = createMockAssistant()

    const result = getAssistantCardInfo(assistant, undefined)

    expect(result.isOwned).toBe(false)
  })
})
