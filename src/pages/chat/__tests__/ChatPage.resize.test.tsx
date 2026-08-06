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
import { describe, it, expect, vi } from 'vitest'

import ChatPage from '../ChatPage'

vi.mock('../components/ChatSidebar/ChatSidebar', () => ({
  default: () => <div data-testid="chat-sidebar-content">sidebar</div>,
}))
vi.mock('../components/ChatHeader/ChatHeader', () => ({ default: () => <div /> }))
vi.mock('../components/ChatConfiguration/ChatConfiguration', () => ({ default: () => <div /> }))
vi.mock('../components/ChatHistory/ChatHistory', () => ({ default: () => <div /> }))
vi.mock('../components/ChatPrompt/ChatPrompt', () => ({ default: () => <div /> }))
vi.mock('@/pages/integrations/components/NewIntegrationPopup', () => ({ default: () => <div /> }))
vi.mock('@/hooks/useNewIntegrationPopup', () => ({
  useNewIntegrationPopup: () => ({
    showNewIntegration: false,
    showNewIntegrationPopup: vi.fn(),
    hideNewIntegrationPopup: vi.fn(),
    onIntegrationSuccess: vi.fn(),
  }),
}))
vi.mock('../hooks/useChatNavigation', () => ({ useChatNavigation: vi.fn() }))
vi.mock('../hooks/useChatInitialPrompt', () => ({ useChatInitialPrompt: vi.fn() }))
vi.mock('../hooks/useChatAuthCallbacks', () => ({ useChatAuthCallbacks: vi.fn() }))
vi.mock('../hooks/useChatConfiguration', () => ({ useChatConfiguration: () => ({}) }))
vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: () => ({ currentRoute: { value: { params: {} } }, push: vi.fn() }),
}))
vi.mock('@/store/chats', () => ({ chatsStore: { currentChat: null } }))
vi.mock('../hooks/useChatPromptResize', () => ({
  useChatPromptResize: vi.fn(() => ({
    defaultLayout: undefined,
    debouncedOnLayoutChanged: vi.fn(),
    userId: 'test-user',
  })),
}))
vi.mock('../components/ChatSidebar/useChatSidebarResize', () => ({
  useChatSidebarResize: vi.fn(() => ({
    panelRef: { current: null },
    initialWidth: 250,
    handleResize: vi.fn(),
  })),
}))
vi.mock('../components/ChatConfiguration/useChatConfigResize', () => ({
  useChatConfigResize: vi.fn(() => ({
    panelRef: { current: null },
    handleResize: vi.fn(),
  })),
}))

describe('ChatPage resizable sidebar', () => {
  it('renders the sidebar inside a resizable Group/Panel structure', () => {
    const { container } = render(<ChatPage />)

    expect(screen.getByTestId('chat-sidebar-content')).toBeInTheDocument()
    expect(container.querySelector('[data-group]')).toBeInTheDocument()
    expect(container.querySelectorAll('[data-panel]')).toHaveLength(4)
    expect(container.querySelector('[data-separator]')).toBeInTheDocument()
  })
})
