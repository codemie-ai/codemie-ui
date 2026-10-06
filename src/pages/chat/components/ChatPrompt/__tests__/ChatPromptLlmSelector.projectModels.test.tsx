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

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ModelOption } from '@/types/entity/configuration'
import { Conversation } from '@/types/entity/conversation'

import ChatPromptLlmSelector from '../ChatPromptLlmSelector'

const { mockChatsStore, mockToastInfo } = vi.hoisted(() => ({
  mockChatsStore: {
    currentChat: null as Conversation | null,
    llmModels: [] as ModelOption[],
    llmRouters: [] as ModelOption[],
    filteredModels: [] as ModelOption[],
    updateChat: vi.fn(),
    getModelsForCurrentChat: vi.fn(),
  },
  mockToastInfo: vi.fn(),
}))

vi.mock('valtio', () => ({
  proxy: (obj: any) => obj,
  useSnapshot: vi.fn((store) => store),
  subscribe: vi.fn(),
}))

vi.mock('@/store/appInfo', () => ({
  appInfoStore: { llmModels: [], llmRouters: [], getLLMModels: vi.fn() },
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
    mockChatsStore.getModelsForCurrentChat.mockResolvedValue(ALLOWED)
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
})
