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

import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ChatListDensity } from '@/store/chatViewSettings'

import FocusedChatSidebar from '../FocusedChatSidebar'

import type { FocusedChatSidebarViewModel } from '../chatSidebarListsHelpers'
import type { ReactNode } from 'react'

const persistenceMock = vi.hoisted(() => ({
  getPersistedSidebarSections: vi.fn(),
  setPersistedSidebarSection: vi.fn(),
  useResyncPersistedSidebarSections: vi.fn(),
}))
vi.mock('../useChatSidebarSectionPersistence', () => persistenceMock)

vi.mock('@/hooks/useInfiniteScroll', () => ({
  useInfiniteScroll: () => ({ current: null }),
}))

vi.mock('../ChatSidebarAccordion', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('../../ChatList/ChatList', () => ({
  default: () => null,
}))

vi.mock('../FocusedConversationSections', () => ({
  default: ({
    isPinnedExpanded,
    onTogglePinned,
    isRecentExpanded,
    onToggleRecent,
  }: {
    isPinnedExpanded: boolean
    onTogglePinned: () => void
    isRecentExpanded?: boolean
    onToggleRecent?: () => void
  }) => (
    <div>
      <span data-testid="pinned-expanded">{String(isPinnedExpanded)}</span>
      <button type="button" onClick={onTogglePinned}>
        toggle pinned
      </button>
      {onToggleRecent && (
        <>
          <span data-testid="recent-expanded">{String(isRecentExpanded)}</span>
          <button type="button" onClick={onToggleRecent}>
            toggle recent
          </button>
        </>
      )}
    </div>
  ),
}))

const viewModel: FocusedChatSidebarViewModel = {
  pinnedChats: [],
  recentChats: [],
  workflowChats: [],
  groups: [],
  chatLocations: {},
  assistantHistory: new Map(),
}

const renderRootView = () =>
  render(
    <FocusedChatSidebar
      view={{ type: 'root' }}
      viewModel={viewModel}
      chatActions={{ moveChat: vi.fn(), deleteChat: vi.fn() }}
      density={ChatListDensity.COMPACT}
      navigationSection={null}
      onViewChange={vi.fn()}
      onNewChat={vi.fn()}
      registerChatElement={vi.fn()}
    />
  )

describe('FocusedChatSidebar — Pinned persistence and Recent default (EPMCDME-15211)', () => {
  beforeEach(() => {
    persistenceMock.getPersistedSidebarSections.mockReset().mockReturnValue({
      pinnedExpanded: true,
      recentAssistantsExpanded: true,
    })
    persistenceMock.setPersistedSidebarSection.mockReset()
  })

  it('initializes Pinned from its persisted value and starts with Recent collapsed', () => {
    persistenceMock.getPersistedSidebarSections.mockReturnValue({
      pinnedExpanded: false,
      recentAssistantsExpanded: true,
    })

    renderRootView()

    expect(screen.getByTestId('pinned-expanded').textContent).toBe('false')
    expect(screen.getByTestId('recent-expanded').textContent).toBe('false')
  })

  it('persists the new value when the Pinned section is toggled', () => {
    renderRootView()

    fireEvent.click(screen.getByRole('button', { name: 'toggle pinned' }))

    expect(persistenceMock.setPersistedSidebarSection).toHaveBeenCalledWith({
      pinnedExpanded: false,
    })
  })

  it('toggles the Recent section without persisting it', () => {
    renderRootView()

    fireEvent.click(screen.getByRole('button', { name: 'toggle recent' }))

    expect(screen.getByTestId('recent-expanded').textContent).toBe('true')
    expect(persistenceMock.setPersistedSidebarSection).not.toHaveBeenCalled()
  })
})
