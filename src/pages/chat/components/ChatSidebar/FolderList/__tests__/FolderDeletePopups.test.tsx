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

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import AssistantFolderDeletePopup from '../AssistantFolderDeletePopup'
import DeleteFolderPopup from '../DeleteFolderPopup'

const mocks = vi.hoisted(() => ({
  clearCurrentChat: vi.fn(),
  deleteAssistantFolder: vi.fn(),
  deleteChatFolder: vi.fn(),
  onHide: vi.fn(),
  routerPush: vi.fn(),
}))

vi.mock('valtio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('valtio')>()
  return {
    ...actual,
    useSnapshot: (store: unknown) => store,
  }
})

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: () => ({ push: mocks.routerPush }),
}))

vi.mock('@/store/chats', () => ({
  chatsStore: {
    chats: [],
    currentChat: null,
    clearCurrentChat: mocks.clearCurrentChat,
    deleteAssistantFolder: mocks.deleteAssistantFolder,
    deleteChatFolder: mocks.deleteChatFolder,
  },
}))

vi.mock('@/components/Popup', () => ({
  default: ({ visible, header, children, footerContent }: any) =>
    visible ? (
      <section aria-label={header}>
        {children}
        {footerContent}
      </section>
    ) : null,
}))

vi.mock('@/assets/icons/delete.svg?react', () => ({
  default: () => <span aria-hidden="true" />,
}))

afterEach(cleanup)

beforeEach(() => {
  vi.clearAllMocks()
  mocks.deleteAssistantFolder.mockResolvedValue({
    deleted_conversation_ids: [],
    folder_deleted: false,
  })
  mocks.deleteChatFolder.mockResolvedValue(undefined)
})

describe('AssistantFolderDeletePopup', () => {
  it.each([
    ['Delete chats only', 'delete_chats_only'],
    ['Delete folder & chats', 'delete_folder_and_chats'],
  ] as const)('submits %s with the matching assistant-folder action', async (label, action) => {
    const user = userEvent.setup()
    render(
      <AssistantFolderDeletePopup
        assistantId="assistant-a"
        assistantName="Assistant A"
        isVisible
        onHide={mocks.onHide}
      />
    )

    await user.click(screen.getByRole('button', { name: label }))

    await waitFor(() =>
      expect(mocks.deleteAssistantFolder).toHaveBeenCalledWith('assistant-a', action)
    )
    expect(mocks.onHide).toHaveBeenCalledTimes(1)
  })
})

describe('DeleteFolderPopup', () => {
  it('always requests deletion of the custom folder together with its chats', async () => {
    const user = userEvent.setup()
    render(<DeleteFolderPopup selectedFolder="Project A" isVisible onHide={mocks.onHide} />)

    await user.click(screen.getByRole('button', { name: 'Delete folder and chats' }))

    await waitFor(() => expect(mocks.deleteChatFolder).toHaveBeenCalledWith('Project A', true))
    expect(mocks.onHide).toHaveBeenCalledTimes(1)
  })
})
