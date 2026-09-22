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

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ChatListItem } from '@/types/entity/conversation'

import RemoveChatFromFolderPopup from '../ChatList/RemoveChatFromFolderPopup'

const selectedChat: ChatListItem = {
  id: 'chat-1',
  name: 'Chat',
  folder: 'FAQ',
  pinned: false,
  date: '2026-08-04T12:00:00.000Z',
  assistantIds: [],
  initialAssistantId: null,
  initialWorkflowId: null,
  isGroup: false,
  isWorkflow: false,
}

afterEach(cleanup)

describe('RemoveChatFromFolderPopup', () => {
  it('renders quotation marks without monospace glyph spacing around the folder name', () => {
    render(
      <RemoveChatFromFolderPopup
        isVisible
        selectedChat={selectedChat}
        onHide={vi.fn()}
        onRemove={vi.fn()}
      />
    )

    const message = screen.getByRole('dialog').querySelector('p')

    expect(message?.textContent).toBe(
      'This chat will be removed from “FAQ”.You will not lose this chat.'
    )
    expect(screen.getByText('“')).toHaveClass('font-geist', 'font-semibold', 'text-text-primary')
    expect(screen.getByText('”')).toHaveClass('font-geist', 'font-semibold', 'text-text-primary')
  })
})
