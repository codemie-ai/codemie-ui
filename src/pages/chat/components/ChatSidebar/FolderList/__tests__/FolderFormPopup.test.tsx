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

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import FolderFormPopup from '../FolderFormPopup'

vi.mock('@/assets/icons/cross.svg?react', () => ({
  default: () => <span aria-label="close icon"></span>,
}))

describe('FolderFormPopup — accessibility', () => {
  afterEach(cleanup)

  it('gives the folder-name input the accessible name "Folder name" in create mode', () => {
    render(<FolderFormPopup isVisible onHide={vi.fn()} />)

    const input = screen.getByRole('textbox')
    expect(input).toHaveAccessibleName('Folder name')
  })

  it('gives the folder-name input the accessible name "Folder name" in edit mode', () => {
    render(<FolderFormPopup isEditing folder="Existing folder" isVisible onHide={vi.fn()} />)

    const input = screen.getByRole('textbox')
    expect(input).toHaveAccessibleName('Folder name')
  })
})

vi.mock('valtio', () => ({ useSnapshot: vi.fn((store) => store) }))

const mockCreateFolder = vi.fn()
const mockRenameChatFolder = vi.fn()
vi.mock('@/store/chats', () => ({
  chatsStore: {
    createFolder: (...args: unknown[]) => mockCreateFolder(...args),
    renameChatFolder: (...args: unknown[]) => mockRenameChatFolder(...args),
  },
}))

vi.mock('@/components/Popup', () => ({
  default: ({ children, onSubmit, submitText }: any) => (
    <div>
      {children}
      <button onClick={onSubmit}>{submitText}</button>
    </div>
  ),
}))

vi.mock('@/components/form/Input', () => ({
  default: ({ value, onChange, error }: any) => (
    <div>
      <input aria-label="folder-name-input" value={value ?? ''} onChange={onChange} />
      {error && <span>{error}</span>}
    </div>
  ),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('FolderFormPopup — submit trim', () => {
  it('trims the folder name before calling createFolder and onCreate', async () => {
    const onCreate = vi.fn()
    mockCreateFolder.mockResolvedValue(undefined)
    render(<FolderFormPopup isVisible onHide={vi.fn()} onCreate={onCreate} />)

    const input = screen.getByLabelText('folder-name-input')
    fireEvent.change(input, { target: { value: '  FAQ  ' } })
    fireEvent.click(screen.getByText('Create'))

    await vi.waitFor(() => expect(mockCreateFolder).toHaveBeenCalledWith('FAQ'))
    expect(onCreate).toHaveBeenCalledWith('FAQ')
  })

  it('trims both stored folder and submitted name before calling renameChatFolder', async () => {
    const onCreate = vi.fn()
    mockRenameChatFolder.mockResolvedValue(undefined)
    render(
      <FolderFormPopup isEditing folder="Old" isVisible onHide={vi.fn()} onCreate={onCreate} />
    )

    const input = screen.getByLabelText('folder-name-input')
    fireEvent.change(input, { target: { value: '  New  ' } })
    fireEvent.click(screen.getByText('Save'))

    await vi.waitFor(() => expect(mockRenameChatFolder).toHaveBeenCalledWith('Old', 'New'))
    expect(onCreate).toHaveBeenCalledWith('New')
  })
})
