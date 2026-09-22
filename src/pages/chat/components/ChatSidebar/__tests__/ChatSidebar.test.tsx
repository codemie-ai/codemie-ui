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

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ChatSidebar from '../ChatSidebar'

const mockChatsStore = vi.hoisted(() => ({
  chats: [],
  isChatsLoading: false,
  isInitialDataFetched: true,
}))

const mockChatViewSettingsStore = vi.hoisted(() => ({
  showRecentAssistants: true,
}))

vi.mock('valtio', () => ({
  useSnapshot: vi.fn((store) => store),
  proxy: vi.fn((obj: unknown) => obj),
  subscribe: vi.fn(),
}))

vi.mock('@/store/chats', () => ({ chatsStore: mockChatsStore }))
vi.mock('@/store/assistants', () => ({
  assistantsStore: { getRecentAssistants: vi.fn().mockResolvedValue(undefined) },
}))
vi.mock('@/store/workflows', () => ({
  workflowsStore: { getRecentWorkflows: vi.fn().mockResolvedValue(undefined) },
}))
vi.mock('@/store/chatViewSettings', () => ({ chatViewSettingsStore: mockChatViewSettingsStore }))
vi.mock('@/store/utils/chatAvatarData', () => ({ fetchMissingChatAvatarData: vi.fn() }))

vi.mock('@/components/Sidebar/Sidebar', () => ({
  default: ({ children, title }: any) => (
    <div data-testid="sidebar">
      <span>{title}</span>
      {children}
    </div>
  ),
}))

vi.mock('../ChatSidebarAssistants', () => ({
  default: () => <div data-testid="chat-sidebar-assistants" />,
}))

vi.mock('../ChatSidebarLists/ChatSidebarLists', () => ({
  default: (_props: any) => <div data-testid="chat-sidebar-lists" />,
}))

vi.mock('../ChatViewSettings', () => ({
  default: () => <div data-testid="chat-view-settings" />,
}))

vi.mock('../StartNewChatModal', () => ({
  default: () => <div data-testid="start-new-chat-modal" />,
}))

vi.mock('../../ChatSearchPanel/ChatSearchPanel', () => ({
  default: () => <div data-testid="chat-search-panel" />,
}))

vi.mock('@/assets/icons/plus.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/assets/icons/search.svg?react', () => ({ default: () => <svg /> }))

describe('ChatSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockChatsStore.chats = []
    mockChatsStore.isChatsLoading = false
    mockChatsStore.isInitialDataFetched = true
  })

  it('renders ChatSidebarAssistants when showRecentAssistants is true', () => {
    mockChatViewSettingsStore.showRecentAssistants = true
    render(<ChatSidebar />)

    expect(screen.getByTestId('chat-sidebar-assistants')).toBeInTheDocument()
  })

  it('hides ChatSidebarAssistants when showRecentAssistants is false', () => {
    mockChatViewSettingsStore.showRecentAssistants = false
    render(<ChatSidebar />)

    expect(screen.queryByTestId('chat-sidebar-assistants')).not.toBeInTheDocument()
  })
})
