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

import { render, screen, waitFor } from '@testing-library/react'
import userEvent, { UserEvent } from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { Assistant } from '@/types/entity/assistant'

import ChatSidebarAssistants from '../ChatSidebarAssistants'

vi.hoisted(() => vi.resetModules())

const mockRouter = {
  push: vi.fn(),
}

const { mockAssistantsStore, mockChatsStore } = vi.hoisted(() => {
  return {
    mockAssistantsStore: {
      recentAssistants: [] as Assistant[],
      getRecentAssistants: vi.fn(),
      deleteRecentAssistant: vi.fn(),
      updateRecentAssistants: vi.fn(),
    },
    mockChatsStore: {
      createChat: vi.fn(),
    },
  }
})

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: vi.fn(() => mockRouter),
}))

vi.mock('valtio', () => ({
  proxy: (obj: any) => obj,
  useSnapshot: vi.fn((store) => {
    if (store === mockAssistantsStore) return mockAssistantsStore
    if (store === mockChatsStore) return mockChatsStore
    return store
  }),
  subscribe: vi.fn(),
}))

vi.mock('@/store/assistants', () => ({
  assistantsStore: mockAssistantsStore,
  MAX_RECENT_ASSISTANTS: 5,
}))

vi.mock('@/store/chats', () => ({
  chatsStore: mockChatsStore,
}))

vi.mock('@/utils/entity', () => ({
  canEdit: vi.fn((entity) => entity.canEdit !== false),
}))

vi.mock('@/components/NavigationMore/NavigationMore', () => ({
  default: ({ items }: any) => (
    <div data-testid="navigation-more">
      {items.map((item: any, index: number) => (
        <button
          key={index}
          onClick={item.onClick}
          data-testid={`menu-item-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
        >
          {item.title}
        </button>
      ))}
    </div>
  ),
}))

vi.mock('@/components/Avatar/Avatar', () => ({
  default: ({ name }: any) => (
    <div data-testid={`avatar-${name}`} title={name}>
      Avatar
    </div>
  ),
}))

vi.mock('./ChatSidebarSection', () => ({
  default: ({ title, children }: any) => (
    <div data-testid="sidebar-section">
      <div data-testid="section-title">{title}</div>
      {children}
    </div>
  ),
}))

vi.mock('@/assets/icons/info.svg?react', () => ({
  default: () => <svg data-testid="info-icon" />,
}))

vi.mock('@/assets/icons/edit.svg?react', () => ({
  default: () => <svg data-testid="edit-icon" />,
}))

vi.mock('@/assets/icons/delete.svg?react', () => ({
  default: () => <svg data-testid="delete-icon" />,
}))

vi.mock('@/assets/icons/edit.svg?react', () => ({
  default: () => <svg data-testid="pencil-icon" />,
}))

const mockAssistants: Assistant[] = [
  {
    id: 'assistant-1',
    name: 'Code Helper',
    slug: 'code-helper',
    description: 'Helps with code',
    icon_url: 'icon1.png',
    is_global: false,
    shared: false,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    system_prompt: 'You are a code helper',
    type: 'USER',
    canEdit: true,
  },
  {
    id: 'assistant-2',
    name: 'Data Analyst',
    slug: 'data-analyst',
    description: 'Analyzes data',
    icon_url: 'icon2.png',
    is_global: false,
    shared: false,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    system_prompt: 'You are a data analyst',
    type: 'USER',
    canEdit: true,
  },
  {
    id: 'assistant-3',
    name: 'This is a very long assistant name that should be truncated',
    slug: 'long-name',
    description: 'Long name assistant',
    icon_url: 'icon3.png',
    is_global: true,
    shared: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    system_prompt: 'You have a long name',
    type: 'USER',
    canEdit: false,
  },
  {
    id: 'assistant-4',
    name: 'A2A Assistant',
    slug: 'a2a-assistant',
    description: 'A2A type assistant',
    icon_url: 'icon4.png',
    is_global: false,
    shared: false,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    system_prompt: 'A2A assistant',
    type: 'A2A',
  },
] as Assistant[]

describe('ChatSidebarAssistants', () => {
  let user: UserEvent

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
    mockAssistantsStore.recentAssistants = []
    mockAssistantsStore.getRecentAssistants = vi.fn()
    mockAssistantsStore.deleteRecentAssistant = vi.fn()
    mockAssistantsStore.updateRecentAssistants = vi.fn()
    mockChatsStore.createChat = vi.fn()
    mockRouter.push = vi.fn()
  })

  it('renders without crashing and fetches recent assistants', () => {
    const { container } = render(<ChatSidebarAssistants />)

    expect(container.firstChild).toBeInTheDocument()
    expect(mockAssistantsStore.getRecentAssistants).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Assistants')).toBeInTheDocument()
  })

  it('renders list of recent assistants', () => {
    mockAssistantsStore.recentAssistants = mockAssistants.slice(0, 2)
    render(<ChatSidebarAssistants />)

    expect(screen.getByText('Code Helper')).toBeInTheDocument()
    expect(screen.getByText('Data Analyst')).toBeInTheDocument()
  })

  it('renders assistant avatars', () => {
    mockAssistantsStore.recentAssistants = mockAssistants.slice(0, 2)
    render(<ChatSidebarAssistants />)

    expect(screen.getByTestId('avatar-Code Helper')).toBeInTheDocument()
    expect(screen.getByTestId('avatar-Data Analyst')).toBeInTheDocument()
  })

  it('truncates long assistant names', () => {
    mockAssistantsStore.recentAssistants = [mockAssistants[2]]
    render(<ChatSidebarAssistants />)

    const nameElement = screen.getByText(/This is a very long/)
    expect(nameElement.textContent).toMatch(/\.\.\./)
    expect(nameElement.textContent?.length).toBeLessThanOrEqual(23)
  })

  it('does not truncate short assistant names', () => {
    mockAssistantsStore.recentAssistants = [mockAssistants[0]]
    render(<ChatSidebarAssistants />)

    expect(screen.getByText('Code Helper')).toBeInTheDocument()
    expect(screen.queryByText(/\.\.\./)).not.toBeInTheDocument()
  })

  it('displays only first 5 assistants when more are available', () => {
    const manyAssistants = Array.from({ length: 10 }, (_, i) => ({
      ...mockAssistants[0],
      id: `assistant-${i}`,
      name: `Assistant ${i}`,
    }))
    mockAssistantsStore.recentAssistants = manyAssistants
    render(<ChatSidebarAssistants />)

    expect(screen.getByText('Assistant 0')).toBeInTheDocument()
    expect(screen.getByText('Assistant 4')).toBeInTheDocument()
    expect(screen.queryByText('Assistant 5')).not.toBeInTheDocument()
  })

  it('creates chat and navigates when assistant is clicked', async () => {
    const newChat = { id: 'chat-123', name: 'Code Helper Chat' }
    mockChatsStore.createChat = vi.fn().mockResolvedValue(newChat)
    mockAssistantsStore.recentAssistants = [mockAssistants[0]]
    render(<ChatSidebarAssistants />)

    await user.click(screen.getByText('Code Helper'))

    expect(mockChatsStore.createChat).toHaveBeenCalledWith('assistant-1', 'Code Helper', false)
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith({
        name: 'chats',
        params: { id: 'chat-123' },
      })
      expect(mockAssistantsStore.updateRecentAssistants).toHaveBeenCalledWith(mockAssistants[0])
    })
  })

  it('does not navigate when createChat returns no id', async () => {
    mockChatsStore.createChat = vi.fn().mockResolvedValue({})
    mockAssistantsStore.recentAssistants = [mockAssistants[0]]
    render(<ChatSidebarAssistants />)

    await user.click(screen.getByText('Code Helper'))

    await waitFor(() => {
      expect(mockChatsStore.createChat).toHaveBeenCalled()
    })
    expect(mockRouter.push).not.toHaveBeenCalled()
  })

  it('renders menu with all action items', () => {
    mockAssistantsStore.recentAssistants = [mockAssistants[0]]
    render(<ChatSidebarAssistants />)

    expect(screen.getByTestId('menu-item-new-chat')).toBeInTheDocument()
    expect(screen.getByTestId('menu-item-view')).toBeInTheDocument()
    expect(screen.getByTestId('menu-item-edit')).toBeInTheDocument()
    expect(screen.getByTestId('menu-item-remove')).toBeInTheDocument()
  })

  it('does not show Edit menu item when canEdit is false', () => {
    mockAssistantsStore.recentAssistants = [mockAssistants[2]]
    render(<ChatSidebarAssistants />)

    expect(screen.queryByTestId('menu-item-edit')).not.toBeInTheDocument()
    expect(screen.getByTestId('menu-item-new-chat')).toBeInTheDocument()
    expect(screen.getByTestId('menu-item-view')).toBeInTheDocument()
    expect(screen.getByTestId('menu-item-remove')).toBeInTheDocument()
  })

  it('does not show Edit menu item for A2A type assistants', () => {
    mockAssistantsStore.recentAssistants = [mockAssistants[3]]
    render(<ChatSidebarAssistants />)

    expect(screen.queryByTestId('menu-item-edit')).not.toBeInTheDocument()
  })

  it('navigates to assistant view page when View is clicked', async () => {
    mockAssistantsStore.recentAssistants = [mockAssistants[0]]
    render(<ChatSidebarAssistants />)

    await user.click(screen.getByTestId('menu-item-view'))

    expect(mockRouter.push).toHaveBeenCalledWith({
      name: 'assistant',
      params: { id: 'assistant-1' },
    })
  })

  it('navigates to edit assistant page when Edit is clicked', async () => {
    mockAssistantsStore.recentAssistants = [mockAssistants[0]]
    render(<ChatSidebarAssistants />)

    await user.click(screen.getByTestId('menu-item-edit'))

    expect(mockRouter.push).toHaveBeenCalledWith({
      name: 'edit-assistant',
      params: { id: 'assistant-1' },
    })
  })

  it('deletes assistant and refreshes list when Remove is clicked', async () => {
    mockAssistantsStore.deleteRecentAssistant = vi.fn().mockResolvedValue(undefined)
    mockAssistantsStore.recentAssistants = [mockAssistants[0]]
    render(<ChatSidebarAssistants />)

    await user.click(screen.getByTestId('menu-item-remove'))

    await waitFor(() => {
      expect(mockAssistantsStore.deleteRecentAssistant).toHaveBeenCalledWith('assistant-1')
      expect(mockAssistantsStore.getRecentAssistants).toHaveBeenCalled()
    })
  })

  it('creates new chat when New chat menu item is clicked', async () => {
    const newChat = { id: 'chat-456', name: 'New Chat' }
    mockChatsStore.createChat = vi.fn().mockResolvedValue(newChat)
    mockAssistantsStore.recentAssistants = [mockAssistants[0]]
    render(<ChatSidebarAssistants />)

    await user.click(screen.getByTestId('menu-item-new-chat'))

    expect(mockChatsStore.createChat).toHaveBeenCalledWith('assistant-1', 'Code Helper', false)
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith({
        name: 'chats',
        params: { id: 'chat-456' },
      })
    })
  })

  it('renders empty list when no recent assistants', () => {
    mockAssistantsStore.recentAssistants = []
    const { container } = render(<ChatSidebarAssistants />)

    expect(screen.queryByText('Code Helper')).not.toBeInTheDocument()
    expect(container.querySelector('.flex.flex-col')).toBeInTheDocument()
  })

  it('applies correct title attribute to assistant name', () => {
    mockAssistantsStore.recentAssistants = [mockAssistants[0]]
    render(<ChatSidebarAssistants />)

    const nameElement = screen.getByText('Code Helper')
    expect(nameElement).toHaveAttribute('title', 'Start a new conversation with this Assistant')
  })
})
