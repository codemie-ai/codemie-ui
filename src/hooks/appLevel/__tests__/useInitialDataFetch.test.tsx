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

import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchMissingChatAvatarData } from '@/store/utils/chatAvatarData'
import type { ChatListItem } from '@/types/entity/conversation'

import useInitialDataFetch from '../useInitialDataFetch'

const createChatListItem = (overrides: Partial<ChatListItem>): ChatListItem => ({
  id: 'chat-id',
  name: 'Chat',
  folder: null,
  pinned: false,
  date: '2026-01-01T00:00:00Z',
  assistantIds: [],
  initialAssistantId: null,
  initialWorkflowId: null,
  isGroup: false,
  isWorkflow: false,
  ...overrides,
})

const {
  mockAppInfoStore,
  mockApplicationsStore,
  mockAssistantsStore,
  mockChatsStore,
  mockPreferencesStore,
  mockSkillsStore,
  mockUserStore,
  mockWorkflowsStore,
} = vi.hoisted(() => ({
  mockAssistantsStore: {
    assistants: [] as { id: string }[],
    recentAssistants: [] as { id: string }[],
    pinnedAssistants: [] as { id: string }[],
    chatAssistants: [] as { id: string }[],
    getRecentAssistants: vi.fn(),
    fetchPinnedAssistants: vi.fn(),
    fetchAssistantsByIds: vi.fn(),
    loadShowNewAssistantAIPopup: vi.fn(),
    getAssistantCategories: vi.fn(),
    getDefaultAssistant: vi.fn(),
    getHelpAssistants: vi.fn(),
  },
  mockChatsStore: {
    getChats: vi.fn(),
    getFolders: vi.fn(),
  },
  mockUserStore: {
    user: { userId: 'user-1' },
    loadUser: vi.fn(),
  },
  mockAppInfoStore: {
    loadAppInfo: vi.fn(),
    fetchToolConfigs: vi.fn(),
    getLLMModels: vi.fn(),
    getEmbeddingsModels: vi.fn(),
    setIsNavigationExpanded: vi.fn(),
    setIsSidebarExpanded: vi.fn(),
    fetchCustomerConfig: vi.fn(),
  },
  mockApplicationsStore: {
    fetchApplications: vi.fn(),
  },
  mockPreferencesStore: {
    fetchPreferences: vi.fn(),
  },
  mockSkillsStore: {
    getSkillCategories: vi.fn(),
  },
  mockWorkflowsStore: {
    workflows: [] as { id: string }[],
    recentWorkflows: [] as { id: string }[],
    chatWorkflows: [] as { id: string }[],
    getRecentWorkflows: vi.fn(),
    fetchWorkflowsByIds: vi.fn(),
  },
}))

vi.mock('@/store', () => ({
  assistantsStore: mockAssistantsStore,
  chatsStore: mockChatsStore,
  userStore: mockUserStore,
}))

vi.mock('@/store/assistants', () => ({ assistantsStore: mockAssistantsStore }))

vi.mock('@/store/appInfo', () => ({ appInfoStore: mockAppInfoStore }))
vi.mock('@/store/applications', () => ({ applicationsStore: mockApplicationsStore }))
vi.mock('@/store/preferences', () => ({ preferencesStore: mockPreferencesStore }))
vi.mock('@/store/skills', () => ({ skillsStore: mockSkillsStore }))
vi.mock('@/store/workflows', () => ({ workflowsStore: mockWorkflowsStore }))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('useInitialDataFetch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAssistantsStore.assistants = []
    mockAssistantsStore.recentAssistants = []
    mockAssistantsStore.pinnedAssistants = []
    mockAssistantsStore.chatAssistants = []
    mockWorkflowsStore.workflows = []
    mockWorkflowsStore.recentWorkflows = []
    mockWorkflowsStore.chatWorkflows = []
    mockUserStore.user = { userId: 'user-1' }

    mockUserStore.loadUser.mockResolvedValue(undefined)
    mockPreferencesStore.fetchPreferences.mockResolvedValue(undefined)
    mockAssistantsStore.getRecentAssistants.mockResolvedValue(undefined)
    mockAssistantsStore.fetchPinnedAssistants.mockResolvedValue(undefined)
    mockAssistantsStore.fetchAssistantsByIds.mockResolvedValue(undefined)
    mockWorkflowsStore.getRecentWorkflows.mockResolvedValue(undefined)
    mockWorkflowsStore.fetchWorkflowsByIds.mockResolvedValue(undefined)
    mockChatsStore.getChats.mockResolvedValue([])
    mockChatsStore.getFolders.mockResolvedValue([])
    mockAppInfoStore.fetchCustomerConfig.mockResolvedValue(undefined)
    mockAppInfoStore.fetchToolConfigs.mockResolvedValue(undefined)
  })

  it('leaves chat-only metadata loading to the chat sidebar', async () => {
    renderHook(() => useInitialDataFetch())

    await waitFor(() => expect(mockChatsStore.getChats).toHaveBeenCalled())
    expect(mockAssistantsStore.getRecentAssistants).not.toHaveBeenCalled()
    expect(mockWorkflowsStore.getRecentWorkflows).not.toHaveBeenCalled()
    expect(mockAssistantsStore.fetchAssistantsByIds).not.toHaveBeenCalled()
    expect(mockWorkflowsStore.fetchWorkflowsByIds).not.toHaveBeenCalled()
  })

  it('loads customer config before requesting the current user', async () => {
    let resolveCustomerConfig: (() => void) | undefined
    mockAppInfoStore.fetchCustomerConfig.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveCustomerConfig = resolve
      })
    )

    renderHook(() => useInitialDataFetch())

    await waitFor(() => expect(mockAppInfoStore.fetchCustomerConfig).toHaveBeenCalled())
    expect(mockUserStore.loadUser).not.toHaveBeenCalled()

    resolveCustomerConfig?.()

    await waitFor(() => expect(mockUserStore.loadUser).toHaveBeenCalled())
  })

  it('fetches only unique assistant ids that are not already known', async () => {
    mockAssistantsStore.assistants = [{ id: 'loaded-assistant' }]
    mockAssistantsStore.recentAssistants = [{ id: 'recent-assistant' }]
    mockAssistantsStore.pinnedAssistants = [{ id: 'pinned-assistant' }]
    mockAssistantsStore.chatAssistants = [{ id: 'cached-chat-assistant' }]
    await fetchMissingChatAvatarData([
      createChatListItem({
        isGroup: true,
        assistantIds: [
          'loaded-assistant',
          'recent-assistant',
          'pinned-assistant',
          'cached-chat-assistant',
          'missing-assistant',
          'missing-assistant',
          '',
        ],
      }),
      createChatListItem({
        id: 'non-group-chat',
        assistantIds: ['non-group-assistant'],
      }),
    ])

    expect(mockAssistantsStore.fetchAssistantsByIds).toHaveBeenCalledWith(['missing-assistant'])
  })

  it('fetches workflow metadata missing from workflow stores', async () => {
    mockWorkflowsStore.workflows = [{ id: 'loaded-workflow' }]
    mockWorkflowsStore.recentWorkflows = [{ id: 'recent-workflow' }]
    mockWorkflowsStore.chatWorkflows = [{ id: 'cached-workflow' }]
    await fetchMissingChatAvatarData([
      createChatListItem({ isWorkflow: true, initialWorkflowId: 'loaded-workflow' }),
      createChatListItem({ isWorkflow: true, initialWorkflowId: 'recent-workflow' }),
      createChatListItem({ isWorkflow: true, initialWorkflowId: 'cached-workflow' }),
      createChatListItem({ isWorkflow: true, initialWorkflowId: 'missing-workflow' }),
      createChatListItem({ isWorkflow: true, initialWorkflowId: 'missing-workflow' }),
      createChatListItem({ initialWorkflowId: 'assistant-chat-workflow' }),
    ])

    expect(mockWorkflowsStore.fetchWorkflowsByIds).toHaveBeenCalledWith(['missing-workflow'])
  })

  it('continues initialization when chats fail to load', async () => {
    const chatsError = new Error('Chats failed')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockChatsStore.getChats.mockRejectedValue(chatsError)

    renderHook(() => useInitialDataFetch())

    await waitFor(() => expect(mockAssistantsStore.getDefaultAssistant).toHaveBeenCalled())
    expect(consoleError).toHaveBeenCalledWith(
      '[useInitialDataFetch] failed to fetch chats:',
      chatsError
    )
  })
})
