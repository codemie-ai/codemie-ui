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

  const mockRouters = [{ value: 'smart-router', label: 'Smart Router', tiers: {} as any }]

  beforeEach(() => {
    vi.clearAllMocks()
    chatsStore.currentChat = null
    chatsStore.filteredModels = []
    chatsStore.filteredRouters = []
    chatsStore.filteredModelsProjectId = null
    appInfoStore.llmModels = mockModels
    appInfoStore.llmRouters = mockRouters
  })

  afterEach(() => {
    chatsStore.currentChat = null
    chatsStore.filteredModels = []
    chatsStore.filteredRouters = []
    chatsStore.filteredModelsProjectId = null
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

  it('also filters routers by the project allow-list, same as models', async () => {
    chatsStore.currentChat = {
      id: '6',
      projectId: 'zoo',
      llmModel: 'gpt-4',
    } as any
    const mockFilteredRouters = [mockRouters[0]]

    vi.mocked(getFilteredModelsForProject)
      .mockResolvedValueOnce(mockFilteredModels)
      .mockResolvedValueOnce(mockFilteredRouters)

    await chatsStore.getModelsForCurrentChat()

    expect(vi.mocked(getFilteredModelsForProject)).toHaveBeenCalledWith('zoo', mockRouters)
    expect(chatsStore.filteredRouters).toEqual(mockFilteredRouters)
  })

  it('commits filteredModels and filteredRouters together, never one stale while the other is fresh', async () => {
    chatsStore.currentChat = {
      id: '7',
      projectId: 'zoo',
      llmModel: 'gpt-4',
    } as any

    type Resolver = (value: Awaited<ReturnType<typeof getFilteredModelsForProject>>) => void
    let resolveModelsCall: Resolver
    let resolveRoutersCall: Resolver
    let callCount = 0
    vi.mocked(getFilteredModelsForProject).mockImplementation(
      () =>
        new Promise((resolve) => {
          callCount += 1
          if (callCount === 1) resolveModelsCall = resolve
          else resolveRoutersCall = resolve
        })
    )

    const pending = chatsStore.getModelsForCurrentChat()

    // Both calls must already be in flight before either resolves — proves they were started
    // together (Promise.all), not one awaited before the other is even requested.
    expect(callCount).toBe(2)

    // The routers call settles first, but neither store field should update yet: committing one
    // list while the other is still stale is exactly the inconsistent-UI window this test guards.
    resolveRoutersCall!([mockRouters[0]])
    await Promise.resolve()
    await Promise.resolve()
    expect(chatsStore.filteredModels).toEqual([])
    expect(chatsStore.filteredRouters).toEqual([])

    resolveModelsCall!(mockFilteredModels)
    await pending

    expect(chatsStore.filteredModels).toEqual(mockFilteredModels)
    expect(chatsStore.filteredRouters).toEqual([mockRouters[0]])
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

  it('keeps the previous project identity until both new lists arrive', async () => {
    chatsStore.filteredModels = mockFilteredModels
    chatsStore.filteredModelsProjectId = 'previous-project'
    chatsStore.currentChat = { id: 'chat-b', projectId: 'next-project' } as any
    let resolveModels!: (models: typeof mockFilteredModels) => void
    const pendingModels = new Promise<typeof mockFilteredModels>((resolve) => {
      resolveModels = resolve
    })
    vi.mocked(getFilteredModelsForProject)
      .mockReturnValueOnce(pendingModels)
      .mockResolvedValueOnce(mockRouters)

    const pending = chatsStore.getModelsForCurrentChat()
    await Promise.resolve()

    expect(chatsStore.filteredModelsProjectId).toBe('previous-project')

    resolveModels(mockFilteredModels)
    await pending

    expect(chatsStore.filteredModelsProjectId).toBe('next-project')
    expect(chatsStore.filteredModels).toEqual(mockFilteredModels)
    expect(chatsStore.filteredRouters).toEqual(mockRouters)
  })

  it.each(['previous-project', 'next-project'])(
    'ignores an older response for %s arriving after the current request completes',
    async (previousProjectId) => {
      let resolvePreviousModels!: (models: typeof mockFilteredModels) => void
      const pendingModels = new Promise<typeof mockFilteredModels>((resolve) => {
        resolvePreviousModels = resolve
      })
      vi.mocked(getFilteredModelsForProject)
        .mockReturnValueOnce(pendingModels)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([mockModels[1]])
        .mockResolvedValueOnce(mockRouters)
      chatsStore.currentChat = { id: 'chat-a', projectId: previousProjectId } as any
      const previousRequest = chatsStore.getModelsForCurrentChat()

      chatsStore.currentChat = { id: 'chat-b', projectId: 'next-project' } as any
      await chatsStore.getModelsForCurrentChat()
      resolvePreviousModels(mockFilteredModels)
      await previousRequest

      expect(chatsStore.filteredModels).toEqual([mockModels[1]])
      expect(chatsStore.filteredRouters).toEqual(mockRouters)
      expect(chatsStore.filteredModelsProjectId).toBe('next-project')
    }
  )

  it('keeps loading the current project when an older request finishes first', async () => {
    let resolvePreviousModels!: (models: typeof mockFilteredModels) => void
    let resolveCurrentModels!: (models: typeof mockFilteredModels) => void
    const previousModels = new Promise<typeof mockFilteredModels>((resolve) => {
      resolvePreviousModels = resolve
    })
    const currentModels = new Promise<typeof mockFilteredModels>((resolve) => {
      resolveCurrentModels = resolve
    })
    vi.mocked(getFilteredModelsForProject)
      .mockReturnValueOnce(previousModels)
      .mockResolvedValueOnce([])
      .mockReturnValueOnce(currentModels)
      .mockResolvedValueOnce(mockRouters)
    chatsStore.currentChat = { id: 'chat-a', projectId: 'previous-project' } as any
    const previousRequest = chatsStore.getModelsForCurrentChat()
    chatsStore.currentChat = { id: 'chat-b', projectId: 'next-project' } as any
    const currentRequest = chatsStore.getModelsForCurrentChat()

    resolvePreviousModels(mockFilteredModels)
    await previousRequest

    expect(chatsStore.loading).toBe(true)
    expect(chatsStore.filteredModelsProjectId).toBeNull()
    expect(chatsStore.filteredModels).toEqual([])
    expect(chatsStore.filteredRouters).toEqual([])

    resolveCurrentModels([mockModels[1]])
    await currentRequest

    expect(chatsStore.loading).toBe(false)
    expect(chatsStore.filteredModelsProjectId).toBe('next-project')
    expect(chatsStore.filteredModels).toEqual([mockModels[1]])
    expect(chatsStore.filteredRouters).toEqual(mockRouters)
  })
})
