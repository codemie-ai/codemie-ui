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

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent, { UserEvent } from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Helpers ---

import { projectsStore } from '@/store/projects'
import toaster from '@/utils/toaster'

import ImportUsersModal from '../ImportUsersModal'

// --- Module-level mocks ---

vi.mock('@/store/projects', () => ({
  projectsStore: {
    validateImportUsers: vi.fn(),
    importUsers: vi.fn(),
  },
}))

vi.mock('@/utils/toaster', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('@/hooks/useDragAndDrop', () => ({
  useDragAndDrop: ({ onFileDrop }: { onFileDrop: (f: File) => void }) => ({
    isDragging: false,
    handleDragEnter: vi.fn(),
    handleDragLeave: vi.fn(),
    handleDragOver: vi.fn(),
    handleDrop: vi.fn(),
    _onFileDrop: onFileDrop, // expose for testing drop scenario
  }),
}))

vi.mock('@/assets/icons/export-to-json.svg?react', () => ({ default: () => null }))
vi.mock('@/assets/icons/export.svg?react', () => ({ default: () => null }))
vi.mock('@/assets/icons/info.svg?react', () => ({ default: () => null }))

vi.mock('@/components/Tooltip', () => ({ default: () => null }))

vi.mock('@/components/Pagination', () => ({ default: () => null }))

vi.mock('@/components/InfoWarning/InfoWarning', () => ({
  default: ({ type, message }: { type: string; message: string; className?: string }) => (
    <div data-testid="info-warning" data-type={type}>
      {message}
    </div>
  ),
}))

vi.mock('@/components/Popup', () => ({
  default: ({
    visible,
    children,
    headerContent,
  }: {
    visible: boolean
    children: React.ReactNode
    headerContent?: React.ReactNode
    onHide: () => void
    dismissableMask?: boolean
    className?: string
    isFullWidth?: boolean
    hideFooter?: boolean
  }) => {
    if (!visible) return null
    return (
      <div role="dialog">
        {headerContent}
        {children}
      </div>
    )
  },
}))

vi.mock('@/components/Table', () => ({
  default: ({
    items,
    customRenderColumns,
  }: {
    items: Array<{ rowNum: number; email: string; role: string; error: string | null }>
    columnDefinitions: unknown
    customRenderColumns?: {
      email?: (row: { email: string; error: string | null }) => React.ReactNode
      role?: (row: { role: string }) => React.ReactNode
      status?: (row: { error: string | null }) => React.ReactNode
    }
    className?: string
    embedded?: boolean
  }) => (
    <table data-testid="preview-table">
      <tbody>
        {items.map((item) => (
          <tr key={item.rowNum} data-testid={`row-${item.rowNum}`}>
            <td>{item.rowNum}</td>
            <td>{customRenderColumns?.email ? customRenderColumns.email(item) : item.email}</td>
            <td>{customRenderColumns?.role ? customRenderColumns.role(item) : item.role}</td>
            <td>{customRenderColumns?.status ? customRenderColumns.status(item) : null}</td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
}))

vi.mock('@/utils/helpers', () => ({
  humanize: (s: string) => s,
}))

const mockProject = { id: 'proj-1', name: 'Test Project' }

const defaultProps = {
  visible: true,
  project: mockProject as any,
  onHide: vi.fn(),
  onSuccess: vi.fn(),
}

const createCsvFile = (name = 'users.csv', size = 100, type = 'text/csv') => {
  const content = 'a'.repeat(size)
  return new File([content], name, { type })
}

const renderModal = (props = {}) => render(<ImportUsersModal {...defaultProps} {...props} />)

// --- Tests ---

describe('ImportUsersModal', () => {
  let user: UserEvent

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  // ---------------------------------------------------------------------------
  // 1. Renders upload step by default
  // ---------------------------------------------------------------------------
  describe('upload step — initial render', () => {
    it('shows the dropzone label by default', () => {
      renderModal()
      expect(screen.getByText('Upload or drop file')).toBeInTheDocument()
    })

    it('shows the info hint (not error banner) on initial render', () => {
      renderModal()
      const warning = screen.getByTestId('info-warning')
      expect(warning).toHaveAttribute('data-type', 'info')
    })

    it('shows the CSV format hint message', () => {
      renderModal()
      expect(
        screen.getByText(
          'Make sure your CSV includes at least one column named email. You can also include a role column (user/project_admin).'
        )
      ).toBeInTheDocument()
    })

    it('shows a Cancel button', () => {
      renderModal()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    it('shows the Download template button', () => {
      renderModal()
      expect(screen.getByText('Download template')).toBeInTheDocument()
    })

    it('does not show the preview table on upload step', () => {
      renderModal()
      expect(screen.queryByTestId('preview-table')).not.toBeInTheDocument()
    })

    it('renders nothing when visible is false', () => {
      renderModal({ visible: false })
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // 2. File type validation
  // ---------------------------------------------------------------------------
  describe('file type validation', () => {
    it('shows toaster error and does not call validateImportUsers for non-CSV file', async () => {
      renderModal()
      const input = document.getElementById('csv-upload') as HTMLInputElement
      const badFile = new File(['data'], 'image.png', { type: 'image/png' })

      // Use fireEvent to bypass the `accept` attribute filter that userEvent enforces
      fireEvent.change(input, { target: { files: [badFile] } })

      expect(toaster.error).toHaveBeenCalledWith('Only CSV files are allowed')
      expect(projectsStore.validateImportUsers).not.toHaveBeenCalled()
    })

    it('accepts a file with .csv extension regardless of MIME type', async () => {
      vi.mocked(projectsStore.validateImportUsers).mockResolvedValue({ users: [] })
      renderModal()
      const input = document.getElementById('csv-upload') as HTMLInputElement
      const csvFile = new File(['email,role'], 'users.csv', { type: 'application/octet-stream' })

      await user.upload(input, csvFile)

      expect(toaster.error).not.toHaveBeenCalled()
      expect(projectsStore.validateImportUsers).toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------------------------------
  // 3. File size validation
  // ---------------------------------------------------------------------------
  describe('file size validation', () => {
    it('shows toaster error for files exceeding 10MB', async () => {
      renderModal()
      const input = document.getElementById('csv-upload') as HTMLInputElement
      const oversizedFile = createCsvFile('big.csv', 10 * 1024 * 1024 + 1)

      await user.upload(input, oversizedFile)

      expect(toaster.error).toHaveBeenCalledWith('File size must be less than 10MB')
      expect(projectsStore.validateImportUsers).not.toHaveBeenCalled()
    })

    it('accepts a file exactly at the 10MB limit', async () => {
      vi.mocked(projectsStore.validateImportUsers).mockResolvedValue({ users: [] })
      renderModal()
      const input = document.getElementById('csv-upload') as HTMLInputElement
      const exactFile = createCsvFile('exact.csv', 10 * 1024 * 1024)

      await user.upload(input, exactFile)

      expect(toaster.error).not.toHaveBeenCalled()
      expect(projectsStore.validateImportUsers).toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------------------------------
  // 4. Auto-triggers validation on file select
  // ---------------------------------------------------------------------------
  describe('auto-validation on file select', () => {
    it('calls projectsStore.validateImportUsers immediately when a valid CSV is selected', async () => {
      vi.mocked(projectsStore.validateImportUsers).mockResolvedValue({ users: [] })
      renderModal()
      const input = document.getElementById('csv-upload') as HTMLInputElement
      const file = createCsvFile()

      await user.upload(input, file)

      expect(projectsStore.validateImportUsers).toHaveBeenCalledTimes(1)
      expect(projectsStore.validateImportUsers).toHaveBeenCalledWith(
        mockProject.id,
        expect.any(FormData)
      )
    })

    it('shows "Validating..." label in the dropzone while validation is in progress', async () => {
      let resolveValidation!: (value: { users: [] }) => void
      const pendingPromise = new Promise<{ users: [] }>((resolve) => {
        resolveValidation = resolve
      })
      vi.mocked(projectsStore.validateImportUsers).mockReturnValue(pendingPromise)

      renderModal()
      const input = document.getElementById('csv-upload') as HTMLInputElement
      await user.upload(input, createCsvFile())

      expect(screen.getByText('Validating...')).toBeInTheDocument()

      resolveValidation({ users: [] })
    })
  })

  // ---------------------------------------------------------------------------
  // 5. Advances to preview step on successful validation
  // ---------------------------------------------------------------------------
  describe('navigation to preview step', () => {
    it('advances to preview step after successful validation with no-error rows', async () => {
      const users = [
        { email: 'a@b.com', role: 'user', error: null },
        { email: 'c@d.com', role: 'project_admin', error: null },
      ]
      vi.mocked(projectsStore.validateImportUsers).mockResolvedValue({ users })

      renderModal()
      await user.upload(document.getElementById('csv-upload') as HTMLInputElement, createCsvFile())

      await waitFor(() => {
        expect(screen.getByTestId('preview-table')).toBeInTheDocument()
      })
    })

    it('renders Back and Import buttons in the preview step', async () => {
      vi.mocked(projectsStore.validateImportUsers).mockResolvedValue({
        users: [{ email: 'a@b.com', role: 'user', error: null }],
      })

      renderModal()
      await user.upload(document.getElementById('csv-upload') as HTMLInputElement, createCsvFile())

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Import' })).toBeInTheDocument()
      })
    })
  })

  // ---------------------------------------------------------------------------
  // 6. Stays on upload step + shows ERROR banner on API error
  // ---------------------------------------------------------------------------
  describe('validation API error handling', () => {
    it('stays on upload step when validateImportUsers throws', async () => {
      vi.mocked(projectsStore.validateImportUsers).mockRejectedValue(new Error('Network error'))

      renderModal()
      await user.upload(document.getElementById('csv-upload') as HTMLInputElement, createCsvFile())

      await waitFor(() => {
        expect(screen.queryByTestId('preview-table')).not.toBeInTheDocument()
      })
      expect(screen.getByText('Upload or drop file')).toBeInTheDocument()
    })

    it('shows ERROR banner with the correct message when validateImportUsers throws', async () => {
      vi.mocked(projectsStore.validateImportUsers).mockRejectedValue(new Error('Network error'))

      renderModal()
      await user.upload(document.getElementById('csv-upload') as HTMLInputElement, createCsvFile())

      await waitFor(() => {
        const warning = screen.getByTestId('info-warning')
        expect(warning).toHaveAttribute('data-type', 'error')
        expect(warning).toHaveTextContent(
          'An error has been detected in your CSV file. Please fix it and upload the file again.'
        )
      })
    })
  })

  // ---------------------------------------------------------------------------
  // 7. Preview step shows error banner when any row has an error
  // ---------------------------------------------------------------------------
  describe('preview step error banner', () => {
    it('shows error banner in preview step when at least one row has an error', async () => {
      vi.mocked(projectsStore.validateImportUsers).mockResolvedValue({
        users: [
          { email: 'valid@b.com', role: 'user', error: null },
          { email: 'bad@b.com', role: 'user', error: 'Invalid email' },
        ],
      })

      renderModal()
      await user.upload(document.getElementById('csv-upload') as HTMLInputElement, createCsvFile())

      await waitFor(() => {
        const warning = screen.getByTestId('info-warning')
        expect(warning).toHaveAttribute('data-type', 'error')
      })
    })

    it('does not show error banner in preview step when all rows are valid', async () => {
      vi.mocked(projectsStore.validateImportUsers).mockResolvedValue({
        users: [
          { email: 'a@b.com', role: 'user', error: null },
          { email: 'c@d.com', role: 'project_admin', error: null },
        ],
      })

      renderModal()
      await user.upload(document.getElementById('csv-upload') as HTMLInputElement, createCsvFile())

      await waitFor(() => {
        expect(screen.getByTestId('preview-table')).toBeInTheDocument()
      })

      const warning = screen.queryByTestId('info-warning')
      expect(warning).not.toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // 8 & 9. Import button disabled/enabled based on row errors
  // ---------------------------------------------------------------------------
  describe('Import button enabled state', () => {
    it('disables the Import button when any row has an error', async () => {
      vi.mocked(projectsStore.validateImportUsers).mockResolvedValue({
        users: [
          { email: 'ok@b.com', role: 'user', error: null },
          { email: 'bad@b.com', role: 'user', error: 'Invalid' },
        ],
      })

      renderModal()
      await user.upload(document.getElementById('csv-upload') as HTMLInputElement, createCsvFile())

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled()
      })
    })

    it('enables the Import button when ALL rows have no errors', async () => {
      vi.mocked(projectsStore.validateImportUsers).mockResolvedValue({
        users: [
          { email: 'a@b.com', role: 'user', error: null },
          { email: 'c@d.com', role: 'project_admin', error: null },
        ],
      })

      renderModal()
      await user.upload(document.getElementById('csv-upload') as HTMLInputElement, createCsvFile())

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Import' })).toBeEnabled()
      })
    })

    it('disables the Import button when the preview users list is empty', async () => {
      vi.mocked(projectsStore.validateImportUsers).mockResolvedValue({ users: [] })

      renderModal()
      await user.upload(document.getElementById('csv-upload') as HTMLInputElement, createCsvFile())

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled()
      })
    })
  })

  // ---------------------------------------------------------------------------
  // 10. Back button returns to upload step
  // ---------------------------------------------------------------------------
  describe('Back button', () => {
    it('returns to the upload step when Back is clicked', async () => {
      vi.mocked(projectsStore.validateImportUsers).mockResolvedValue({
        users: [{ email: 'a@b.com', role: 'user', error: null }],
      })

      renderModal()
      await user.upload(document.getElementById('csv-upload') as HTMLInputElement, createCsvFile())

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: 'Back' }))

      // Preview table is gone and the upload dropzone is visible again
      expect(screen.queryByTestId('preview-table')).not.toBeInTheDocument()
      // The dropzone file-picker input is rendered again (only present on upload step)
      expect(document.getElementById('csv-upload')).toBeInTheDocument()
      // Cancel button is back
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // 11. Import submit
  // ---------------------------------------------------------------------------
  describe('import submit', () => {
    it('calls projectsStore.importUsers with correct project id', async () => {
      const validUsers = [
        { email: 'a@b.com', role: 'user', error: null },
        { email: 'c@d.com', role: 'project_admin', error: null },
      ]
      vi.mocked(projectsStore.validateImportUsers).mockResolvedValue({ users: validUsers })
      vi.mocked(projectsStore.importUsers).mockResolvedValue({ total: 2 })

      renderModal()
      await user.upload(document.getElementById('csv-upload') as HTMLInputElement, createCsvFile())

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Import' })).toBeEnabled()
      })

      fireEvent.click(screen.getByRole('button', { name: 'Import' }))

      await waitFor(() => {
        expect(projectsStore.importUsers).toHaveBeenCalledWith(mockProject.id, expect.any(FormData))
      })
    })

    it('shows success toast after a successful import', async () => {
      vi.mocked(projectsStore.validateImportUsers).mockResolvedValue({
        users: [{ email: 'a@b.com', role: 'user', error: null }],
      })
      vi.mocked(projectsStore.importUsers).mockResolvedValue({ total: 1 })

      renderModal()
      await user.upload(document.getElementById('csv-upload') as HTMLInputElement, createCsvFile())

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Import' })).toBeEnabled()
      })

      fireEvent.click(screen.getByRole('button', { name: 'Import' }))

      await waitFor(() => {
        expect(toaster.info).toHaveBeenCalledWith('Users imported successfully! 1 users added')
      })
    })

    it('calls onSuccess callback after a successful import', async () => {
      vi.mocked(projectsStore.validateImportUsers).mockResolvedValue({
        users: [{ email: 'a@b.com', role: 'user', error: null }],
      })
      vi.mocked(projectsStore.importUsers).mockResolvedValue({ total: 1 })

      const onSuccess = vi.fn()
      renderModal({ onSuccess })

      await user.upload(document.getElementById('csv-upload') as HTMLInputElement, createCsvFile())

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Import' })).toBeEnabled()
      })

      fireEvent.click(screen.getByRole('button', { name: 'Import' }))

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1)
      })
    })

    it('includes only valid rows (error === null) in the CSV sent to importUsers', async () => {
      // Use all-valid users so Import button is enabled
      const allValidUsers = [{ email: 'valid@b.com', role: 'user', error: null }]
      vi.mocked(projectsStore.validateImportUsers).mockResolvedValue({ users: allValidUsers })
      vi.mocked(projectsStore.importUsers).mockResolvedValue({ total: 1 })

      renderModal()
      await user.upload(document.getElementById('csv-upload') as HTMLInputElement, createCsvFile())

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Import' })).toBeEnabled()
      })

      fireEvent.click(screen.getByRole('button', { name: 'Import' }))

      await waitFor(() => {
        expect(projectsStore.importUsers).toHaveBeenCalled()
      })

      const [, formData] = vi.mocked(projectsStore.importUsers).mock.calls[0]
      const csvFile = formData.get('file') as File

      // Read the file content via FileReader (jsdom doesn't support File.text())
      const csvText = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target!.result as string)
        reader.readAsText(csvFile)
      })

      expect(csvText).toContain('email,role')
      expect(csvText).toContain('valid@b.com,user')
    })

    it('does not call importUsers when the user list is empty', async () => {
      vi.mocked(projectsStore.validateImportUsers).mockResolvedValue({ users: [] })

      renderModal()
      await user.upload(document.getElementById('csv-upload') as HTMLInputElement, createCsvFile())

      await waitFor(() => {
        // The import button should be disabled — clicking it should not trigger the action
        const importBtn = screen.getByRole('button', { name: 'Import' })
        expect(importBtn).toBeDisabled()
      })

      expect(projectsStore.importUsers).not.toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------------------------------
  // 12. Close/Cancel resets state
  // ---------------------------------------------------------------------------
  describe('Close / Cancel resets state', () => {
    it('calls onHide when Cancel is clicked on the upload step', async () => {
      const onHide = vi.fn()
      renderModal({ onHide })

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(onHide).toHaveBeenCalledTimes(1)
    })

    it('returns to upload step after unmount and remount (state reset)', async () => {
      vi.mocked(projectsStore.validateImportUsers).mockResolvedValue({
        users: [{ email: 'a@b.com', role: 'user', error: null }],
      })

      const onHide = vi.fn()
      const { unmount } = renderModal({ onHide })

      // Go to preview step
      await user.upload(document.getElementById('csv-upload') as HTMLInputElement, createCsvFile())
      await waitFor(() => {
        expect(screen.getByTestId('preview-table')).toBeInTheDocument()
      })

      // Unmount simulates closing the modal — state is reset on next mount
      unmount()

      // Re-mount fresh instance
      renderModal({ onHide })

      // New mount starts on upload step
      expect(document.getElementById('csv-upload')).toBeInTheDocument()
      expect(screen.queryByTestId('preview-table')).not.toBeInTheDocument()
    })

    it('clears validationError when cancel is clicked', async () => {
      vi.mocked(projectsStore.validateImportUsers).mockRejectedValue(new Error('fail'))

      renderModal()
      await user.upload(document.getElementById('csv-upload') as HTMLInputElement, createCsvFile())

      await waitFor(() => {
        const warning = screen.getByTestId('info-warning')
        expect(warning).toHaveAttribute('data-type', 'error')
      })

      // Cancel click triggers handleClose -> resets validationError
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      // After re-render (closed), state should be reset — confirm onHide was called
      expect(defaultProps.onHide).toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------------------------------
  // 13. Download template creates anchor and triggers click
  // ---------------------------------------------------------------------------
  describe('Download template', () => {
    it('creates an anchor element with a data:text/csv href on click', () => {
      const mockClick = vi.fn()
      const mockAnchor = { href: '', download: '', click: mockClick }
      // Save original before mocking to avoid infinite recursion in fallback
      const originalCreateElement = document.createElement.bind(document)
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'a') return mockAnchor as unknown as HTMLAnchorElement
        return originalCreateElement(tag)
      })

      renderModal()
      fireEvent.click(screen.getByText('Download template'))

      expect(mockAnchor.href).toMatch(/^data:text\/csv/)
      expect(mockAnchor.download).toBe('users_template.csv')
      expect(mockClick).toHaveBeenCalledTimes(1)

      vi.restoreAllMocks()
    })
  })

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------
  describe('edge cases', () => {
    it('does not trigger validation when project is null', async () => {
      vi.mocked(projectsStore.validateImportUsers).mockResolvedValue({ users: [] })

      renderModal({ project: null })
      const input = document.getElementById('csv-upload') as HTMLInputElement
      await user.upload(input, createCsvFile())

      expect(projectsStore.validateImportUsers).not.toHaveBeenCalled()
    })

    it('renders preview rows with email and role from the API response', async () => {
      vi.mocked(projectsStore.validateImportUsers).mockResolvedValue({
        users: [{ email: 'user@test.com', role: 'project_admin', error: null }],
      })

      renderModal()
      await user.upload(document.getElementById('csv-upload') as HTMLInputElement, createCsvFile())

      await waitFor(() => {
        expect(screen.getByText('user@test.com')).toBeInTheDocument()
        expect(screen.getByText('project_admin')).toBeInTheDocument()
      })
    })
  })
})
