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

import ChatListItem, { ChatListItemActions } from '../ChatListItem'

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: () => ({ push: vi.fn() }),
}))

vi.mock('valtio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('valtio')>()
  return {
    ...actual,
    useSnapshot: () => ({ renameChat: vi.fn(), pinChat: vi.fn() }),
  }
})

vi.mock('@/store/chats', () => ({
  chatsStore: { renameChat: vi.fn(), pinChat: vi.fn() },
}))

vi.mock('@/assets/icons/navigation-more.svg?react', () => ({
  default: () => <span data-testid="nav-more-icon" />,
}))

vi.mock('@/hooks/useFeatureFlags', () => ({
  useFeatureFlag: () => [false, true],
  useFavoritesEnabled: () => [false],
}))

const actions: ChatListItemActions = {
  moveChat: vi.fn(),
  deleteChat: vi.fn(),
}

const chat = {
  id: 'test-chat-id-123',
  name: 'My Test Chat',
  folder: '',
  pinned: false,
  date: '',
  assistantIds: [],
  initialAssistantId: null,
  initialWorkflowId: null,
  isGroup: false,
  isWorkflow: false,
}

describe('ChatListItem accessibility', () => {
  it('chat name button has id derived from chat.id', () => {
    render(<ChatListItem chat={chat} actions={actions} />)
    const chatNameBtn = screen.getByRole('button', { name: 'My Test Chat' })
    expect(chatNameBtn).toHaveAttribute('id', `chat-name-${chat.id}`)
  })

  it('More Options button has aria-labelledby referencing both button id and chat name id', () => {
    const { container } = render(<ChatListItem chat={chat} actions={actions} />)
    const moreBtn = container.querySelector('button[aria-haspopup]') as HTMLElement
    const chatNameId = `chat-name-${chat.id}`
    expect(moreBtn.getAttribute('aria-labelledby')).toBe(`${moreBtn.id} ${chatNameId}`)
  })
})
