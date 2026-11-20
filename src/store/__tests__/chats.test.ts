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

import { appInfoStore } from '../appInfo'
import { chatsStore } from '../chats'

describe('chatsStore.getModelsForCurrentChat', () => {
  const mockModels = [
    { value: 'gpt-4', label: 'GPT-4', isPremium: true },
    { value: 'gpt-3.5', label: 'GPT-3.5', isPremium: false },
    { value: 'claude-3', label: 'Claude 3', isPremium: false },
  ]

  const mockProjectModels = [
    { value: 'gpt-4', label: 'GPT-4', isPremium: true },
    { value: 'claude-3', label: 'Claude 3', isPremium: false },
  ]

  const mockRouters = [
    { value: 'smart-router', label: 'Smart Router', tiers: {} as any },
    { value: 'other-router', label: 'Other Router', tiers: {} as any },
  ]

  const projectRouterEntry = { value: 'smart-router', label: 'Smart Router', isRouter: true }

  const setProjectModels = (models: unknown[]) => {
    appInfoStore.getProjectLLMModels = vi.fn().mockResolvedValue(models)
  }

  beforeEach(() => {
    vi.clearAllMocks()
    chatsStore.currentChat = null
    chatsStore.filteredModels = []
    chatsStore.filteredRouters = []
    chatsStore.filteredModelsProjectId = null
    appInfoStore.llmModels = mockModels
    appInfoStore.llmRouters = mockRouters
    setProjectModels([...mockProjectModels, projectRouterEntry])
  })

  afterEach(() => {
    chatsStore.currentChat = null
    chatsStore.filteredModels = []
    chatsStore.filteredRouters = []
    chatsStore.filteredModelsProjectId = null
  })

  it('returns the project models without routers for a chat with projectId', async () => {
    chatsStore.currentChat = { id: '1', projectId: 'zoo', llmModel: 'gpt-4' } as any

    const result = await chatsStore.getModelsForCurrentChat()

    expect(appInfoStore.getProjectLLMModels).toHaveBeenCalledWith('zoo')
    expect(result).toEqual(mockProjectModels)
    expect(chatsStore.filteredModels).toEqual(mockProjectModels)
    expect(chatsStore.filteredModelsProjectId).toBe('zoo')
  })

  it('keeps only the routers the project list names, with their full router options', async () => {
    chatsStore.currentChat = { id: '2', projectId: 'zoo', llmModel: 'gpt-4' } as any

    await chatsStore.getModelsForCurrentChat()

    expect(chatsStore.filteredRouters).toEqual([mockRouters[0]])
  })

  it('returns all models and routers for a chat without projectId', async () => {
    chatsStore.currentChat = { id: '3', llmModel: 'gpt-4' } as any

    const result = await chatsStore.getModelsForCurrentChat()

    expect(appInfoStore.getProjectLLMModels).not.toHaveBeenCalled()
    expect(result).toEqual(mockModels)
    expect(chatsStore.filteredRouters).toEqual(mockRouters)
  })

  it('handles errors gracefully', async () => {
    chatsStore.currentChat = { id: '4', projectId: 'invalid', llmModel: 'gpt-4' } as any
    appInfoStore.getProjectLLMModels = vi.fn().mockRejectedValue(new Error('Network error'))
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(chatsStore.getModelsForCurrentChat()).rejects.toThrow('Network error')

    expect(consoleErrorSpy).toHaveBeenCalled()
    consoleErrorSpy.mockRestore()
  })

  it('keeps the previous project identity until the new lists arrive', async () => {
    chatsStore.filteredModels = mockProjectModels
    chatsStore.filteredModelsProjectId = 'previous-project'
    chatsStore.currentChat = { id: 'chat-b', projectId: 'next-project' } as any
    let resolveModels!: (models: unknown[]) => void
    appInfoStore.getProjectLLMModels = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveModels = resolve
      })
    )

    const pending = chatsStore.getModelsForCurrentChat()
    await Promise.resolve()

    expect(chatsStore.filteredModelsProjectId).toBe('previous-project')

    resolveModels([...mockProjectModels, projectRouterEntry])
    await pending

    expect(chatsStore.filteredModelsProjectId).toBe('next-project')
    expect(chatsStore.filteredModels).toEqual(mockProjectModels)
    expect(chatsStore.filteredRouters).toEqual([mockRouters[0]])
  })

  it.each(['previous-project', 'next-project'])(
    'ignores an older response for %s arriving after the current request completes',
    async (previousProjectId) => {
      let resolvePrevious!: (models: unknown[]) => void
      appInfoStore.getProjectLLMModels = vi
        .fn()
        .mockReturnValueOnce(
          new Promise((resolve) => {
            resolvePrevious = resolve
          })
        )
        .mockResolvedValueOnce([mockModels[1], projectRouterEntry])
      chatsStore.currentChat = { id: 'chat-a', projectId: previousProjectId } as any
      const previousRequest = chatsStore.getModelsForCurrentChat()

      chatsStore.currentChat = { id: 'chat-b', projectId: 'next-project' } as any
      await chatsStore.getModelsForCurrentChat()
      resolvePrevious(mockProjectModels)
      await previousRequest

      expect(chatsStore.filteredModels).toEqual([mockModels[1]])
      expect(chatsStore.filteredRouters).toEqual([mockRouters[0]])
      expect(chatsStore.filteredModelsProjectId).toBe('next-project')
    }
  )

  it('keeps loading the current project when an older request finishes first', async () => {
    let resolvePrevious!: (models: unknown[]) => void
    let resolveCurrent!: (models: unknown[]) => void
    appInfoStore.getProjectLLMModels = vi
      .fn()
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolvePrevious = resolve
        })
      )
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveCurrent = resolve
        })
      )
    chatsStore.currentChat = { id: 'chat-a', projectId: 'previous-project' } as any
    const previousRequest = chatsStore.getModelsForCurrentChat()
    chatsStore.currentChat = { id: 'chat-b', projectId: 'next-project' } as any
    const currentRequest = chatsStore.getModelsForCurrentChat()

    resolvePrevious(mockProjectModels)
    await previousRequest

    expect(chatsStore.loading).toBe(true)
    expect(chatsStore.filteredModelsProjectId).toBeNull()
    expect(chatsStore.filteredModels).toEqual([])
    expect(chatsStore.filteredRouters).toEqual([])

    resolveCurrent([mockModels[1], projectRouterEntry])
    await currentRequest

    expect(chatsStore.loading).toBe(false)
    expect(chatsStore.filteredModelsProjectId).toBe('next-project')
    expect(chatsStore.filteredModels).toEqual([mockModels[1]])
    expect(chatsStore.filteredRouters).toEqual([mockRouters[0]])
  })
})
