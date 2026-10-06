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
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import ExportConversationPopup from '../ChatHeaderDownloadConversationButton/ExportConversationPopup'

const { mockToaster, mockChatsStore } = vi.hoisted(() => {
  return {
    mockToaster: {
      info: vi.fn(),
      error: vi.fn(),
      success: vi.fn(),
      warning: vi.fn(),
    },
    mockChatsStore: {
      exportChat: vi.fn(),
    },
  }
})

vi.mock('@/utils/toaster', () => ({
  default: mockToaster,
}))

vi.mock('@/store/chats', () => ({
  chatsStore: mockChatsStore,
}))

describe('ExportConversationPopup', () => {
  const mockOnHide = vi.fn()

  beforeEach(() => {
    // `resetAllMocks`, not `clearAllMocks`: a test that installs its own
    // `mockReturnValue` (the in-flight cases below) would otherwise leak that
    // implementation into every test declared after it.
    vi.resetAllMocks()
    mockChatsStore.exportChat.mockResolvedValue(true)
  })

  it('does not render when isVisible is false', () => {
    render(<ExportConversationPopup isVisible={false} onHide={mockOnHide} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('defaults to JSON with the tool-outputs checkbox checked and disabled', () => {
    render(<ExportConversationPopup isVisible={true} onHide={mockOnHide} />)

    expect(screen.getByRole('radio', { name: 'JSON' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'DOCX' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'PDF' })).not.toBeChecked()
    const checkbox = screen.getByRole('checkbox', { name: 'Include tool outputs' })
    expect(checkbox).toBeChecked()
    expect(checkbox).toBeDisabled()
    expect(
      screen.getByText('Tool outputs are always included in JSON exports.')
    ).toBeInTheDocument()
  })

  it('exports the selected format without tool outputs by default', async () => {
    render(<ExportConversationPopup isVisible={true} onHide={mockOnHide} />)
    await userEvent.click(screen.getByRole('radio', { name: 'PDF' }))
    await userEvent.click(screen.getByRole('button', { name: 'Export' }))

    await waitFor(() => expect(mockChatsStore.exportChat).toHaveBeenCalledWith('pdf', false))
  })

  it('exports JSON without the tool-outputs flag even though the checkbox displays as checked', async () => {
    render(<ExportConversationPopup isVisible={true} onHide={mockOnHide} />)
    await userEvent.click(screen.getByRole('button', { name: 'Export' }))

    await waitFor(() => expect(mockChatsStore.exportChat).toHaveBeenCalledWith('json', false))
  })

  it('enables the tool-outputs checkbox for docx/pdf and includes it when checked', async () => {
    render(<ExportConversationPopup isVisible={true} onHide={mockOnHide} />)
    await userEvent.click(screen.getByRole('radio', { name: 'DOCX' }))

    const checkbox = screen.getByRole('checkbox', { name: 'Include tool outputs' })
    expect(checkbox).not.toBeDisabled()
    expect(
      screen.queryByText('Tool outputs are always included in JSON exports.')
    ).not.toBeInTheDocument()

    await userEvent.click(checkbox)
    await userEvent.click(screen.getByRole('button', { name: 'Export' }))

    await waitFor(() => expect(mockChatsStore.exportChat).toHaveBeenCalledWith('docx', true))
  })

  it('shows the tool-outputs checkbox as checked and disabled when switching back to JSON', async () => {
    render(<ExportConversationPopup isVisible={true} onHide={mockOnHide} />)
    await userEvent.click(screen.getByRole('radio', { name: 'DOCX' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Include tool outputs' }))
    await userEvent.click(screen.getByRole('radio', { name: 'JSON' }))

    const checkbox = screen.getByRole('checkbox', { name: 'Include tool outputs' })
    expect(checkbox).toBeDisabled()
    expect(checkbox).toBeChecked()
  })

  it('disables Cancel and Export while an export is in flight', async () => {
    // This is the mechanism a second real click relies on: `disabled` lands on
    // the actual DOM button before the export promise settles, so the browser
    // never dispatches a second click to the handler while one is in flight.
    let resolveExport: (v: boolean) => void = () => {}
    mockChatsStore.exportChat.mockReturnValue(
      new Promise((resolve) => {
        resolveExport = resolve
      })
    )
    render(<ExportConversationPopup isVisible={true} onHide={mockOnHide} />)
    await userEvent.click(screen.getByRole('button', { name: 'Export' }))

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled()

    resolveExport(true)
    await waitFor(() => expect(mockOnHide).toHaveBeenCalled())
  })

  it('calls onHide and names the exported variant in the success toast', async () => {
    render(<ExportConversationPopup isVisible={true} onHide={mockOnHide} />)
    await userEvent.click(screen.getByRole('radio', { name: 'DOCX' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Include tool outputs' }))
    await userEvent.click(screen.getByRole('button', { name: 'Export' }))

    await waitFor(() =>
      expect(mockToaster.info).toHaveBeenCalledWith(
        'Your conversation has been successfully exported as DOCX (with tool outputs). The file is now ready in your downloads folder.'
      )
    )
    expect(mockOnHide).toHaveBeenCalled()
  })

  it('names a plain export in the success toast when tool outputs are not included', async () => {
    render(<ExportConversationPopup isVisible={true} onHide={mockOnHide} />)
    await userEvent.click(screen.getByRole('radio', { name: 'PDF' }))
    await userEvent.click(screen.getByRole('button', { name: 'Export' }))

    await waitFor(() =>
      expect(mockToaster.info).toHaveBeenCalledWith(
        'Your conversation has been successfully exported as PDF. The file is now ready in your downloads folder.'
      )
    )
  })

  it('closes without a success toast when the export fails', async () => {
    mockChatsStore.exportChat.mockResolvedValue(false)
    render(<ExportConversationPopup isVisible={true} onHide={mockOnHide} />)
    await userEvent.click(screen.getByRole('button', { name: 'Export' }))

    await waitFor(() => expect(mockOnHide).toHaveBeenCalled())
    expect(mockToaster.info).not.toHaveBeenCalled()
  })
})
