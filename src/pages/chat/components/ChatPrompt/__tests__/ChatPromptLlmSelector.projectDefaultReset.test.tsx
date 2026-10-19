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

import { act, cleanup, render, waitFor } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ModelOption } from '@/types/entity/configuration'
import { Conversation } from '@/types/entity/conversation'

import ChatPromptLlmSelector from '../ChatPromptLlmSelector'

const { mockChatsStore, mockAppInfoStore, mockProjectsStore } = vi.hoisted(() => ({
  mockChatsStore: {
    currentChat: null as Conversation | null,
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

// `isDefault` on one model gives the effect's fallback (`modelsToDisplay.find(isDefault)`)
// a distinct, recognizable value, so tests can tell "reset to null" apart from
// "still showing the stale project default" instead of both landing on the
// list's first entry by coincidence.
const MODELS: ModelOption[] = [
  { label: 'Global Fallback', value: 'global-fallback', isDefault: true },
  { label: 'Proj A Default', value: 'proj-a-default', isDefault: false },
  { label: 'Proj B Default', value: 'proj-b-default', isDefault: false },
]

const chat = (projectId: string | null): Conversation =>
  ({
    id: 'chat-1',
    name: 'Chat',
    llmModel: null,
    project: projectId,
    projectId,
    isGroup: false,
    assistantData: [],
  } as unknown as Conversation)

describe('ChatPromptLlmSelector — project-default-fetch effect resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProjectsStore.getProject.mockReset()
    mockAppInfoStore.llmModels = []
    mockAppInfoStore.llmRouters = []
    mockChatsStore.filteredModels = MODELS
    mockChatsStore.filteredRouters = []
    mockChatsStore.filteredModelsProjectId = 'proj-a'
    mockChatsStore.getModelsForCurrentChat.mockResolvedValue(MODELS)
    Element.prototype.scrollIntoView = vi.fn()
  })

  afterEach(cleanup)

  it('clears a stale project default when the chat leaves project context (CR-001)', async () => {
    mockProjectsStore.getProject.mockResolvedValue({ default_model: 'proj-a-default' })
    mockChatsStore.currentChat = chat('proj-a')

    const { rerender } = render(<ChatPromptLlmSelector />)

    await waitFor(() => {
      const recommendedRow = document.getElementById('chat-llm-selector-option-recommended')
      expect(recommendedRow).toHaveTextContent('Proj A Default')
    })

    // Leave project context entirely — no project, no project default should linger.
    mockChatsStore.currentChat = chat(null)
    mockAppInfoStore.llmModels = MODELS
    rerender(<ChatPromptLlmSelector />)

    await waitFor(() => {
      const recommendedRow = document.getElementById('chat-llm-selector-option-recommended')
      // Falls back to the plain isDefault model, not the stale project default.
      expect(recommendedRow).toHaveTextContent('Global Fallback')
    })
  })

  it('ignores a stale getProject response that resolves after switching to another project (CR-002)', async () => {
    let resolveProjectA: (value: { default_model: string }) => void = () => {}
    mockProjectsStore.getProject.mockImplementation((projectId: string) => {
      if (projectId === 'proj-a') {
        return new Promise((resolve) => {
          resolveProjectA = resolve
        })
      }
      return Promise.resolve({ default_model: 'proj-b-default' })
    })

    mockChatsStore.currentChat = chat('proj-a')
    const { rerender } = render(<ChatPromptLlmSelector />)

    await waitFor(() => expect(mockProjectsStore.getProject).toHaveBeenCalledWith('proj-a'))

    // Switch to project B before project A's fetch resolves.
    mockChatsStore.currentChat = chat('proj-b')
    mockChatsStore.filteredModelsProjectId = 'proj-b'
    rerender(<ChatPromptLlmSelector />)

    await waitFor(() => {
      const recommendedRow = document.getElementById('chat-llm-selector-option-recommended')
      expect(recommendedRow).toHaveTextContent('Proj B Default')
    })

    // The stale project-A response lands late; it must not clobber project B's default.
    await act(async () => resolveProjectA({ default_model: 'proj-a-default' }))

    const recommendedRow = document.getElementById('chat-llm-selector-option-recommended')
    expect(recommendedRow).toHaveTextContent('Proj B Default')
  })

  it('resets the stale default to null when the fetch fails (CR-003)', async () => {
    mockProjectsStore.getProject
      .mockResolvedValueOnce({ default_model: 'proj-a-default' })
      .mockRejectedValueOnce(new Error('network error'))
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    mockChatsStore.currentChat = chat('proj-a')
    const { rerender } = render(<ChatPromptLlmSelector />)

    await waitFor(() => {
      const recommendedRow = document.getElementById('chat-llm-selector-option-recommended')
      expect(recommendedRow).toHaveTextContent('Proj A Default')
    })

    mockChatsStore.currentChat = chat('proj-b')
    mockChatsStore.filteredModelsProjectId = 'proj-b'
    rerender(<ChatPromptLlmSelector />)

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    await waitFor(() => {
      const recommendedRow = document.getElementById('chat-llm-selector-option-recommended')
      // Reset to null on failure, so it falls back instead of keeping project A's stale default.
      expect(recommendedRow).toHaveTextContent('Global Fallback')
    })

    consoleErrorSpy.mockRestore()
  })
})
