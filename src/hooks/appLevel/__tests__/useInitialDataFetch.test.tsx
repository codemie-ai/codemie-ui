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

import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import useInitialDataFetch from '../useInitialDataFetch'

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
  })

  it('waits for recent assistants before calculating missing assistant ids', async () => {
    let resolveRecentAssistants!: () => void
    mockAssistantsStore.getRecentAssistants.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveRecentAssistants = resolve
        })
    )
    mockChatsStore.getChats.mockResolvedValue([
      { isGroup: true, assistantIds: ['recent-assistant', 'missing-assistant'] },
    ])

    renderHook(() => useInitialDataFetch())

    await waitFor(() => expect(mockAssistantsStore.getRecentAssistants).toHaveBeenCalled())
    expect(mockChatsStore.getChats).not.toHaveBeenCalled()

    act(() => {
      mockAssistantsStore.recentAssistants = [{ id: 'recent-assistant' }]
      resolveRecentAssistants()
    })

    await waitFor(() => {
      expect(mockAssistantsStore.fetchAssistantsByIds).toHaveBeenCalledWith(['missing-assistant'])
    })
  })

  it('fetches only unique assistant ids that are not already known', async () => {
    mockAssistantsStore.assistants = [{ id: 'loaded-assistant' }]
    mockAssistantsStore.recentAssistants = [{ id: 'recent-assistant' }]
    mockAssistantsStore.pinnedAssistants = [{ id: 'pinned-assistant' }]
    mockChatsStore.getChats.mockResolvedValue([
      {
        isGroup: true,
        assistantIds: [
          'loaded-assistant',
          'recent-assistant',
          'pinned-assistant',
          'missing-assistant',
          'missing-assistant',
          '',
        ],
      },
      { isGroup: false, assistantIds: ['non-group-assistant'] },
    ])

    renderHook(() => useInitialDataFetch())

    await waitFor(() => {
      expect(mockAssistantsStore.fetchAssistantsByIds).toHaveBeenCalledWith(['missing-assistant'])
    })
  })

  it('fetches workflow metadata missing from workflow stores', async () => {
    mockWorkflowsStore.workflows = [{ id: 'loaded-workflow' }]
    mockWorkflowsStore.recentWorkflows = [{ id: 'recent-workflow' }]
    mockWorkflowsStore.chatWorkflows = [{ id: 'cached-workflow' }]
    mockChatsStore.getChats.mockResolvedValue([
      { isWorkflow: true, initialWorkflowId: 'loaded-workflow' },
      { isWorkflow: true, initialWorkflowId: 'recent-workflow' },
      { isWorkflow: true, initialWorkflowId: 'cached-workflow' },
      { isWorkflow: true, initialWorkflowId: 'missing-workflow' },
      { isWorkflow: true, initialWorkflowId: 'missing-workflow' },
      { isWorkflow: false, initialWorkflowId: 'assistant-chat-workflow' },
    ])

    renderHook(() => useInitialDataFetch())

    await waitFor(() => {
      expect(mockWorkflowsStore.fetchWorkflowsByIds).toHaveBeenCalledWith(['missing-workflow'])
    })
  })

  it('continues initialization when recent assistants and chats fail to load', async () => {
    const recentError = new Error('Recent assistants failed')
    const chatsError = new Error('Chats failed')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockAssistantsStore.getRecentAssistants.mockRejectedValue(recentError)
    mockChatsStore.getChats.mockRejectedValue(chatsError)

    renderHook(() => useInitialDataFetch())

    await waitFor(() => expect(mockAssistantsStore.getDefaultAssistant).toHaveBeenCalled())
    expect(consoleError).toHaveBeenCalledWith(
      '[useInitialDataFetch] failed to fetch recent assistants:',
      recentError
    )
    expect(consoleError).toHaveBeenCalledWith(
      '[useInitialDataFetch] failed to fetch chats:',
      chatsError
    )
  })
})
