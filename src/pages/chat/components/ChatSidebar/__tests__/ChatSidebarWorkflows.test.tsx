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

import ChatSidebarWorkflows from '../ChatSidebarWorkflows'

vi.hoisted(() => vi.resetModules())

const mockRouter = { push: vi.fn() }

const { mockWorkflowsStore, mockChatsStore } = vi.hoisted(() => ({
  mockWorkflowsStore: {
    recentWorkflows: [] as any[],
    getRecentWorkflows: vi.fn(),
    updateRecentWorkflows: vi.fn(),
  },
  mockChatsStore: {
    startNewChat: vi.fn(),
  },
}))

vi.mock('@/hooks/useVueRouter', () => ({ useVueRouter: vi.fn(() => mockRouter) }))

vi.mock('valtio', () => ({
  proxy: (obj: any) => obj,
  useSnapshot: vi.fn((store) => {
    if (store === mockWorkflowsStore) return mockWorkflowsStore
    if (store === mockChatsStore) return mockChatsStore
    return store
  }),
  subscribe: vi.fn(),
}))

vi.mock('@/store/workflows', () => ({
  workflowsStore: mockWorkflowsStore,
  MAX_RECENT_WORKFLOWS: 5,
}))

vi.mock('@/store/chats', () => ({ chatsStore: mockChatsStore }))

vi.mock('@/components/Avatar/Avatar', () => ({
  default: ({ name }: any) => <div data-testid={`avatar-${name}`}>Avatar</div>,
}))

vi.mock('@/components/NavigationMore/NavigationMore', () => ({
  default: ({ items, contextId }: any) => (
    <div data-testid="navigation-more" data-context-id={contextId}>
      {items.map((item: any) => (
        <button
          key={item.title}
          onClick={item.onClick}
          data-testid={`menu-item-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
        >
          {item.title}
        </button>
      ))}
    </div>
  ),
}))

vi.mock('../ChatSidebarSection', () => ({
  default: ({ title, children }: any) => (
    <div data-testid="sidebar-section">
      <div>{title}</div>
      {children}
    </div>
  ),
}))

const mockWorkflow = { id: 42, name: 'Deploy Pipeline', icon_url: null }

describe('ChatSidebarWorkflows', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWorkflowsStore.recentWorkflows = []
    mockWorkflowsStore.getRecentWorkflows = vi.fn()
    mockWorkflowsStore.updateRecentWorkflows = vi.fn()
    mockChatsStore.startNewChat = vi.fn()
    mockRouter.push = vi.fn()
  })

  it('renders without crashing and fetches recent workflows', () => {
    render(<ChatSidebarWorkflows />)
    expect(mockWorkflowsStore.getRecentWorkflows).toHaveBeenCalledTimes(1)
  })

  it('renders workflow names', () => {
    mockWorkflowsStore.recentWorkflows = [mockWorkflow]
    render(<ChatSidebarWorkflows />)
    expect(screen.getByText('Deploy Pipeline')).toBeInTheDocument()
  })

  it('adds sidebar-prefixed id to name span and passes contextId to NavigationMore', () => {
    mockWorkflowsStore.recentWorkflows = [mockWorkflow]
    render(<ChatSidebarWorkflows />)

    const nameSpan = screen.getByText('Deploy Pipeline')
    expect(nameSpan).toHaveAttribute('id', 'sidebar-workflow-name-42')

    const navMore = screen.getByTestId('navigation-more')
    expect(navMore).toHaveAttribute('data-context-id', 'sidebar-workflow-name-42')
  })
})
