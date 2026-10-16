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

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ModelOption } from '@/types/entity/configuration'
import { Conversation } from '@/types/entity/conversation'

import ChatPromptLlmSelector from '../ChatPromptLlmSelector'

const { mockChatsStore, mockAppInfoStore, mockProjectsStore } = vi.hoisted(() => ({
  mockChatsStore: {
    currentChat: null as Conversation | null,
    filteredModels: [] as ModelOption[],
    updateChat: vi.fn(),
    getModelsForCurrentChat: vi.fn(),
  },
  mockAppInfoStore: {
    llmModels: [] as ModelOption[],
    llmRouters: [] as ModelOption[],
    getLLMModels: vi.fn(),
  },
  mockProjectsStore: {
    getProject: vi.fn(),
  },
}))

vi.mock('valtio', () => ({
  proxy: (obj: any) => obj,
  useSnapshot: vi.fn((store) => {
    if (store === mockChatsStore) return mockChatsStore
    if (store === mockAppInfoStore) return mockAppInfoStore
    if (store === mockProjectsStore) return mockProjectsStore
    return store
  }),
  subscribe: vi.fn(),
}))

vi.mock('@/store/appInfo', () => ({ appInfoStore: mockAppInfoStore }))
vi.mock('@/store/chats', () => ({ chatsStore: mockChatsStore }))
vi.mock('@/store/projects', () => ({ projectsStore: mockProjectsStore }))
vi.mock('@/utils/toaster', () => ({ default: { info: vi.fn(), success: vi.fn() } }))

vi.mock('primereact/overlaypanel', () => ({
  OverlayPanel: React.forwardRef<any, any>(({ children, onShow }, ref) => {
    React.useImperativeHandle(ref, () => ({
      toggle: () => onShow?.(),
      show: () => onShow?.(),
      hide: vi.fn(),
    }))
    return <div data-testid="overlay-panel">{children}</div>
  }),
}))

const MODELS: ModelOption[] = [
  { label: 'Global Fallback', value: 'global-fallback', isDefault: true },
  { label: 'First Response', value: 'first-response', isDefault: false },
  { label: 'Second Response', value: 'second-response', isDefault: false },
]

const chat = (): Conversation =>
  ({
    id: 'chat-1',
    name: 'Chat',
    llmModel: null,
    project: 'proj',
    projectId: 'proj',
    isGroup: false,
    assistantData: [],
  } as unknown as Conversation)

const openDropdown = () => fireEvent.click(screen.getByRole('button', { name: 'Default' }))

describe('ChatPromptLlmSelector — dropdown-open default refetch (CR-002)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAppInfoStore.llmModels = []
    mockAppInfoStore.llmRouters = []
    mockChatsStore.filteredModels = MODELS
    mockChatsStore.getModelsForCurrentChat.mockResolvedValue(MODELS)
    mockChatsStore.currentChat = chat()
    Element.prototype.scrollIntoView = vi.fn()
  })

  afterEach(cleanup)

  it('ignores a stale response from an earlier dropdown-open call superseded by a later one', async () => {
    let resolveFirst: (value: { default_model: string }) => void = () => {}
    mockProjectsStore.getProject
      // Mount-effect fetch, resolved immediately.
      .mockResolvedValueOnce({ default_model: 'global-fallback' })
      // First dropdown-open call — left pending.
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve
          })
      )
      // Second dropdown-open call — resolves first.
      .mockResolvedValueOnce({ default_model: 'second-response' })

    render(<ChatPromptLlmSelector />)
    await waitFor(() => expect(mockProjectsStore.getProject).toHaveBeenCalledTimes(1))

    openDropdown()
    await waitFor(() => expect(mockProjectsStore.getProject).toHaveBeenCalledTimes(2))

    openDropdown()
    await waitFor(() => expect(mockProjectsStore.getProject).toHaveBeenCalledTimes(3))

    await waitFor(() => {
      const recommendedRow = document.getElementById('chat-llm-selector-option-recommended')
      expect(recommendedRow).toHaveTextContent('Second Response')
    })

    // The first call's response lands late; it must not clobber the second call's result.
    resolveFirst({ default_model: 'first-response' })
    await Promise.resolve()
    await Promise.resolve()

    const recommendedRow = document.getElementById('chat-llm-selector-option-recommended')
    expect(recommendedRow).toHaveTextContent('Second Response')
  })

  it('resets the stale default to null when a dropdown-open refetch fails', async () => {
    mockProjectsStore.getProject
      .mockResolvedValueOnce({ default_model: 'first-response' })
      .mockRejectedValueOnce(new Error('network error'))
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<ChatPromptLlmSelector />)
    await waitFor(() => {
      const recommendedRow = document.getElementById('chat-llm-selector-option-recommended')
      expect(recommendedRow).toHaveTextContent('First Response')
    })

    openDropdown()

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    await waitFor(() => {
      const recommendedRow = document.getElementById('chat-llm-selector-option-recommended')
      // Reset to null on failure, so it falls back instead of keeping the stale default.
      expect(recommendedRow).toHaveTextContent('Global Fallback')
    })

    consoleErrorSpy.mockRestore()
  })
})
