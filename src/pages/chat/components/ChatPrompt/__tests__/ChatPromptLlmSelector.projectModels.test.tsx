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

import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ModelOption } from '@/types/entity/configuration'
import { Conversation } from '@/types/entity/conversation'

import ChatPromptLlmSelector from '../ChatPromptLlmSelector'

const { mockChatsStore, mockAppInfoStore, mockToastInfo } = vi.hoisted(() => ({
  mockChatsStore: {
    currentChat: null as Conversation | null,
    llmModels: [] as ModelOption[],
    llmRouters: [] as ModelOption[],
    filteredModels: [] as ModelOption[],
    filteredRouters: [] as ModelOption[],
    filteredModelsProjectId: null as string | null,
    updateChat: vi.fn(),
    getModelsForCurrentChat: vi.fn(),
  },
  mockAppInfoStore: {
    llmModels: [] as ModelOption[],
    llmRouters: [] as ModelOption[],
    getLLMModels: vi.fn(),
  },
  mockToastInfo: vi.fn(),
}))

vi.mock('valtio', () => ({
  proxy: (obj: any) => obj,
  useSnapshot: vi.fn((store) => store),
  subscribe: vi.fn(),
}))

vi.mock('@/store/appInfo', () => ({
  appInfoStore: mockAppInfoStore,
}))

vi.mock('@/store/chats', () => ({ chatsStore: mockChatsStore }))

vi.mock('@/store/projects', () => ({
  projectsStore: { getProject: vi.fn().mockResolvedValue({}) },
}))

vi.mock('@/utils/toaster', () => ({ default: { info: mockToastInfo } }))

const ALLOWED: ModelOption[] = [
  { label: 'Model A', value: 'model-a', isDefault: true },
  { label: 'Model B', value: 'model-b', isDefault: false },
]

const chat = (llmModel: string | null): Conversation =>
  ({
    id: 'chat-1',
    name: 'Chat',
    llmModel,
    project: 'restricted',
    projectId: 'restricted',
    isGroup: false,
    assistantData: [],
  } as unknown as Conversation)

describe('ChatPromptLlmSelector — project model settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockChatsStore.filteredModels = ALLOWED
    mockChatsStore.filteredRouters = []
    mockChatsStore.filteredModelsProjectId = 'restricted'
    mockChatsStore.getModelsForCurrentChat.mockResolvedValue(ALLOWED)
    mockAppInfoStore.llmRouters = []
  })

  afterEach(cleanup)

  it('resets a chat model the project hides and says so once', () => {
    mockChatsStore.currentChat = chat('hidden-model')

    const { rerender } = render(<ChatPromptLlmSelector />)
    rerender(<ChatPromptLlmSelector />)

    expect(mockChatsStore.updateChat).toHaveBeenCalledTimes(1)
    expect(mockChatsStore.updateChat).toHaveBeenCalledWith('chat-1', { llmModel: null })
    expect(mockToastInfo).toHaveBeenCalledTimes(1)
    expect(mockToastInfo).toHaveBeenCalledWith(
      'Model hidden-model is not available in project restricted. The default model will be used.'
    )
  })

  it('keeps an allowed chat model', () => {
    mockChatsStore.currentChat = chat('model-b')

    render(<ChatPromptLlmSelector />)

    expect(screen.getByRole('button', { name: 'Model B' })).toBeInTheDocument()
    expect(mockChatsStore.updateChat).not.toHaveBeenCalled()
    expect(mockToastInfo).not.toHaveBeenCalled()
  })

  it('waits for the project model list before judging the chat model', () => {
    mockChatsStore.filteredModels = []
    mockChatsStore.getModelsForCurrentChat.mockResolvedValue([])
    mockChatsStore.currentChat = chat('model-b')

    render(<ChatPromptLlmSelector />)

    expect(mockChatsStore.updateChat).not.toHaveBeenCalled()
  })

  it('resets a chat model that is a project-disabled router, same as a disabled model', () => {
    // The router still exists globally — only the project's filtered list excludes it.
    // Proves the lookup uses the project-scoped list, not the raw global router catalog.
    mockAppInfoStore.llmRouters = [
      { value: 'disabled-router', label: 'Disabled Router', isDefault: false },
    ]
    mockChatsStore.filteredRouters = []
    mockChatsStore.currentChat = chat('disabled-router')

    const { rerender } = render(<ChatPromptLlmSelector />)
    rerender(<ChatPromptLlmSelector />)

    expect(mockChatsStore.updateChat).toHaveBeenCalledWith('chat-1', { llmModel: null })
    expect(mockToastInfo).toHaveBeenCalledWith(
      'Model disabled-router is not available in project restricted. The default model will be used.'
    )
  })

  it('keeps a chat on a router the project still allows', () => {
    mockChatsStore.filteredRouters = [
      { value: 'smart-router', label: 'Smart Router', isDefault: false },
    ]
    mockChatsStore.currentChat = chat('smart-router')

    render(<ChatPromptLlmSelector />)

    expect(screen.getByRole('button', { name: 'Smart Router' })).toBeInTheDocument()
    expect(mockChatsStore.updateChat).not.toHaveBeenCalled()
    expect(mockToastInfo).not.toHaveBeenCalled()
  })

  it.each([
    { kind: 'router', value: 'smart-router', label: 'Smart Router', isDefault: false },
    { kind: 'model', value: 'model-c', label: 'Model C', isDefault: false },
  ])(
    'keeps the saved $kind when switching projects while the new list loads',
    async (selection) => {
      mockChatsStore.currentChat = chat('model-a')
      const { rerender } = render(<ChatPromptLlmSelector />)

      let resolveLists!: () => void
      const pending = new Promise<void>((resolve) => {
        resolveLists = resolve
      })
      mockChatsStore.getModelsForCurrentChat.mockImplementationOnce(async () => {
        await pending
        mockChatsStore.filteredModels = selection.kind === 'model' ? [selection] : ALLOWED
        mockChatsStore.filteredRouters = selection.kind === 'router' ? [selection] : []
        mockChatsStore.filteredModelsProjectId = 'other-project'
      })
      mockChatsStore.currentChat = {
        ...chat(selection.value),
        id: 'chat-b',
        projectId: 'other-project',
        project: 'Other Project',
      }

      rerender(<ChatPromptLlmSelector />)

      expect(mockChatsStore.updateChat).not.toHaveBeenCalled()
      expect(mockToastInfo).not.toHaveBeenCalled()

      await act(async () => resolveLists())
      rerender(<ChatPromptLlmSelector />)

      expect(screen.getByRole('button', { name: selection.label })).toBeInTheDocument()
      expect(mockChatsStore.updateChat).not.toHaveBeenCalled()
      expect(mockToastInfo).not.toHaveBeenCalled()
    }
  )

  it('only resets an excluded router after the new project list arrives', async () => {
    mockChatsStore.currentChat = chat('model-a')
    const { rerender } = render(<ChatPromptLlmSelector />)

    let resolveLists!: () => void
    const pending = new Promise<void>((resolve) => {
      resolveLists = resolve
    })
    mockChatsStore.getModelsForCurrentChat.mockImplementationOnce(async () => {
      await pending
      mockChatsStore.filteredModels = ALLOWED
      mockChatsStore.filteredRouters = []
      mockChatsStore.filteredModelsProjectId = 'other-project'
    })
    mockChatsStore.currentChat = {
      ...chat('disabled-router'),
      id: 'chat-b',
      projectId: 'other-project',
      project: 'Other Project',
    }

    rerender(<ChatPromptLlmSelector />)

    expect(mockChatsStore.updateChat).not.toHaveBeenCalled()
    expect(mockToastInfo).not.toHaveBeenCalled()

    await act(async () => resolveLists())
    rerender(<ChatPromptLlmSelector />)
    rerender(<ChatPromptLlmSelector />)

    expect(mockChatsStore.updateChat).toHaveBeenCalledTimes(1)
    expect(mockChatsStore.updateChat).toHaveBeenCalledWith('chat-b', { llmModel: null })
    expect(mockToastInfo).toHaveBeenCalledTimes(1)
    expect(mockToastInfo).toHaveBeenCalledWith(
      'Model disabled-router is not available in project Other Project. The default model will be used.'
    )
  })
})
