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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { getFilteredModelsForProject } from '../../utils/projectModelFiltering'
import { appInfoStore } from '../appInfo'
import { chatsStore } from '../chats'

// Mock the getFilteredModelsForProject utility
vi.mock('../../utils/projectModelFiltering', () => ({
  getFilteredModelsForProject: vi.fn(),
  clearProjectConfigCache: vi.fn(),
}))

describe('chatsStore.getModelsForCurrentChat', () => {
  const mockModels = [
    { value: 'gpt-4', label: 'GPT-4', isPremium: true },
    { value: 'gpt-3.5', label: 'GPT-3.5', isPremium: false },
    { value: 'claude-3', label: 'Claude 3', isPremium: false },
  ]

  const mockFilteredModels = [
    { value: 'gpt-4', label: 'GPT-4', isPremium: true },
    { value: 'claude-3', label: 'Claude 3', isPremium: false },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    chatsStore.currentChat = null
    chatsStore.filteredModels = []
    appInfoStore.llmModels = mockModels
  })

  afterEach(() => {
    chatsStore.currentChat = null
    chatsStore.filteredModels = []
  })

  it('returns filtered models for chat with projectId', async () => {
    chatsStore.currentChat = {
      id: '1',
      projectId: 'zoo',
      llmModel: 'gpt-4',
    } as any

    vi.mocked(getFilteredModelsForProject).mockResolvedValue(mockFilteredModels)

    const result = await chatsStore.getModelsForCurrentChat()

    expect(result).toEqual(mockFilteredModels)
    expect(chatsStore.filteredModels).toEqual(mockFilteredModels)
  })

  it('returns all models for chat without projectId', async () => {
    chatsStore.currentChat = {
      id: '2',
      llmModel: 'gpt-4',
    } as any

    vi.mocked(getFilteredModelsForProject).mockResolvedValue(mockModels)

    const result = await chatsStore.getModelsForCurrentChat()

    expect(result).toEqual(mockModels)
  })

  it('calls getFilteredModelsForProject with current chat projectId', async () => {
    chatsStore.currentChat = {
      id: '3',
      projectId: 'zoo',
      llmModel: 'gpt-4',
    } as any

    vi.mocked(getFilteredModelsForProject).mockResolvedValue(mockFilteredModels)

    await chatsStore.getModelsForCurrentChat()

    expect(vi.mocked(getFilteredModelsForProject)).toHaveBeenCalledWith('zoo', mockModels)
  })

  it('updates chatsStore.filteredModels state on success', async () => {
    chatsStore.currentChat = {
      id: '4',
      projectId: 'zoo',
      llmModel: 'gpt-4',
    } as any

    vi.mocked(getFilteredModelsForProject).mockResolvedValue(mockFilteredModels)

    await chatsStore.getModelsForCurrentChat()

    expect(chatsStore.filteredModels).toEqual(mockFilteredModels)
  })

  it('handles errors gracefully', async () => {
    chatsStore.currentChat = {
      id: '5',
      projectId: 'invalid',
      llmModel: 'gpt-4',
    } as any

    vi.mocked(getFilteredModelsForProject).mockRejectedValue(new Error('Network error'))

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      await chatsStore.getModelsForCurrentChat()
    } catch {
      // Expected to fail
    }

    expect(consoleErrorSpy).toHaveBeenCalled()
    consoleErrorSpy.mockRestore()
  })
})
