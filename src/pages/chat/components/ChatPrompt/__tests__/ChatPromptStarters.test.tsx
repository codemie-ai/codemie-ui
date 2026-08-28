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

import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ChatPromptStarters from '../ChatPromptStarters'

const { mockChatsStore, mockAssistantsStore, mockWorkflowsStore } = vi.hoisted(() => ({
  mockChatsStore: {
    currentChat: {
      id: 'chat-1',
      isWorkflow: false,
      assistantIds: ['entity-1'],
      assistantData: [
        { id: 'entity-1', name: 'My Assistant', iconUrl: null, conversationStarters: [] },
      ],
    },
  },
  mockAssistantsStore: {
    assistants: [],
    getAssistant: vi.fn(
      (): Promise<{ description: string | null }> =>
        Promise.resolve({ description: 'Assistant description' })
    ),
  },
  mockWorkflowsStore: {
    workflows: [],
    getWorkflow: vi.fn(
      (): Promise<{ description: string | null }> =>
        Promise.resolve({ description: 'Workflow description' })
    ),
  },
}))

vi.mock('valtio', () => ({
  proxy: <T extends object>(obj: T): T => obj,
  useSnapshot: vi.fn((store) => store),
  subscribe: vi.fn(),
  ref: vi.fn((v) => v),
}))

vi.mock('@/store/chats', () => ({ chatsStore: mockChatsStore }))
vi.mock('@/store/assistants', () => ({ assistantsStore: mockAssistantsStore }))
vi.mock('@/store/workflows', () => ({ workflowsStore: mockWorkflowsStore }))
vi.mock('@/hooks/useTheme', () => ({ useTheme: () => ({ appearance: null }) }))

afterEach(() => {
  cleanup()
  mockChatsStore.currentChat = {
    id: 'chat-1',
    isWorkflow: false,
    assistantIds: ['entity-1'],
    assistantData: [
      { id: 'entity-1', name: 'My Assistant', iconUrl: null, conversationStarters: [] },
    ],
  }
  mockAssistantsStore.assistants = []
  mockAssistantsStore.getAssistant = vi.fn(
    (): Promise<{ description: string | null }> =>
      Promise.resolve({ description: 'Assistant description' })
  )
  mockWorkflowsStore.workflows = []
  mockWorkflowsStore.getWorkflow = vi.fn(
    (): Promise<{ description: string | null }> =>
      Promise.resolve({ description: 'Workflow description' })
  )
})

describe('ChatPromptStarters', () => {
  it('shows the assistant description when the chat is an assistant chat', async () => {
    render(<ChatPromptStarters onStarterClick={vi.fn()} />)

    await waitFor(() => expect(screen.getByText('Assistant description')).toBeInTheDocument())
    expect(mockWorkflowsStore.getWorkflow).not.toHaveBeenCalled()
  })

  it('does not show a description when the assistant has none', async () => {
    mockAssistantsStore.getAssistant = vi.fn(
      (): Promise<{ description: string | null }> => Promise.resolve({ description: null })
    )

    render(<ChatPromptStarters onStarterClick={vi.fn()} />)

    await waitFor(() => expect(mockAssistantsStore.getAssistant).toHaveBeenCalled())
    expect(screen.queryByText('Assistant description')).not.toBeInTheDocument()
  })

  it('shows the workflow description when the chat is a workflow chat', async () => {
    mockChatsStore.currentChat = {
      id: 'chat-1',
      isWorkflow: true,
      assistantIds: ['entity-1'],
      assistantData: [
        { id: 'entity-1', name: 'My Workflow', iconUrl: null, conversationStarters: [] },
      ],
    }

    render(<ChatPromptStarters onStarterClick={vi.fn()} />)

    await waitFor(() => expect(screen.getByText('Workflow description')).toBeInTheDocument())
    expect(mockWorkflowsStore.getWorkflow).toHaveBeenCalledWith('entity-1', true)
    expect(mockAssistantsStore.getAssistant).not.toHaveBeenCalled()
  })

  it('does not show a placeholder when the workflow has no description configured', async () => {
    mockChatsStore.currentChat = {
      id: 'chat-1',
      isWorkflow: true,
      assistantIds: ['entity-1'],
      assistantData: [
        { id: 'entity-1', name: 'My Workflow', iconUrl: null, conversationStarters: [] },
      ],
    }
    mockWorkflowsStore.getWorkflow = vi.fn(
      (): Promise<{ description: string | null }> => Promise.resolve({ description: null })
    )

    render(<ChatPromptStarters onStarterClick={vi.fn()} />)

    await waitFor(() => expect(mockWorkflowsStore.getWorkflow).toHaveBeenCalled())
    expect(screen.queryByText('Workflow description')).not.toBeInTheDocument()
  })

  it('degrades to no description when the workflow fetch fails', async () => {
    mockChatsStore.currentChat = {
      id: 'chat-1',
      isWorkflow: true,
      assistantIds: ['entity-1'],
      assistantData: [
        { id: 'entity-1', name: 'My Workflow', iconUrl: null, conversationStarters: [] },
      ],
    }
    mockWorkflowsStore.getWorkflow = vi.fn(() => Promise.reject(new Error('network error')))

    render(<ChatPromptStarters onStarterClick={vi.fn()} />)

    await waitFor(() => expect(mockWorkflowsStore.getWorkflow).toHaveBeenCalled())
    expect(screen.queryByText('Workflow description')).not.toBeInTheDocument()
    expect(screen.getByText('My Workflow')).toBeInTheDocument()
  })
})
