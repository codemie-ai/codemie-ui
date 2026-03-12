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

import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent, { UserEvent } from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import File, { FileMetadata } from '../File'

vi.hoisted(() => vi.resetModules())

const { mockFilesStore } = vi.hoisted(() => {
  return {
    mockFilesStore: {
      downloadFile: vi.fn(),
      getFileURL: vi.fn((url) => `mocked-url-${url}`),
    },
  }
})

vi.mock('valtio', () => ({
  proxy: (obj: any) => obj,
  useSnapshot: vi.fn(() => mockFilesStore),
  subscribe: vi.fn(),
}))

vi.mock('@/store/files', () => ({
  filesStore: mockFilesStore,
}))

vi.mock('@/components/Spinner', () => ({
  default: ({ inline, rootClassName }: any) => (
    <div data-testid="spinner" data-inline={inline} data-root-class={rootClassName}>
      Loading...
    </div>
  ),
}))

vi.mock('@/assets/icons/download.svg?react', () => ({
  default: () => <svg data-testid="download-icon">Download</svg>,
}))

vi.mock('@/assets/icons/file.svg?react', () => ({
  default: () => <svg data-testid="file-icon">File</svg>,
}))

vi.mock('@/assets/icons/delete.svg?react', () => ({
  default: () => <svg data-testid="basket-icon">Basket</svg>,
}))

vi.mock('@/assets/icons/chevron-down.svg?react', () => ({
  default: () => <svg data-testid="chevron-down-icon">ChevronDown</svg>,
}))

vi.mock('@/assets/icons/chevron-up.svg?react', () => ({
  default: () => <svg data-testid="chevron-up-icon">ChevronUp</svg>,
}))

const mockImageFile: FileMetadata = {
  fileId: 'image-file-123',
  fileName: 'test-image.png',
  mimeType: 'image/png',
  user: 'user-123',
  isUploading: false,
}

const mockDocFile: FileMetadata = {
  fileId: 'doc-file-456',
  fileName: 'document.pdf',
  mimeType: 'application/pdf',
  user: 'user-123',
  isUploading: false,
}

const mockUploadingFile: FileMetadata = {
  fileName: 'uploading.txt',
  mimeType: 'text/plain',
  user: 'user-123',
  isUploading: true,
}

describe('File', () => {
  let user: UserEvent

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  it('renders file name correctly', () => {
    render(<File file={mockDocFile} />)
    expect(screen.getByText('document.pdf')).toBeInTheDocument()
  })

  it('renders file icon for regular files', () => {
    render(<File file={mockDocFile} />)
    expect(screen.getByTestId('file-icon')).toBeInTheDocument()
  })

  describe('File uploading state', () => {
    it('displays spinner when file is uploading', () => {
      render(<File file={mockUploadingFile} />)
      expect(screen.getByTestId('spinner')).toBeInTheDocument()
    })

    it('does not show file icon when uploading', () => {
      render(<File file={mockUploadingFile} />)
      expect(screen.queryByTestId('file-icon')).not.toBeInTheDocument()
    })

    it('does not show action buttons when uploading', () => {
      render(
        <File file={mockUploadingFile} withDelete withDownload withPreview onRemove={vi.fn()} />
      )
      expect(screen.queryByLabelText('Remove attached file')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Download file')).not.toBeInTheDocument()
    })
  })

  describe('Delete functionality', () => {
    it('shows remove button when withDelete is true', () => {
      render(<File file={mockDocFile} withDelete onRemove={vi.fn()} />)
      expect(screen.getByLabelText('Remove attached file')).toBeInTheDocument()
    })

    it('does not show remove button when withDelete is false', () => {
      render(<File file={mockDocFile} withDelete={false} />)
      expect(screen.queryByLabelText('Remove attached file')).not.toBeInTheDocument()
    })

    it('calls onRemove when remove button is clicked', async () => {
      const onRemoveMock = vi.fn()
      render(<File file={mockDocFile} withDelete onRemove={onRemoveMock} />)

      const removeButton = screen.getByLabelText('Remove attached file')
      await user.click(removeButton)

      expect(onRemoveMock).toHaveBeenCalledTimes(1)
    })

    it('stops event propagation when remove button is clicked', async () => {
      const onRemoveMock = vi.fn()
      const parentClickMock = vi.fn()

      render(
        <div onClick={parentClickMock}>
          <File file={mockDocFile} withDelete onRemove={onRemoveMock} />
        </div>
      )

      const removeButton = screen.getByLabelText('Remove attached file')
      await user.click(removeButton)

      expect(onRemoveMock).toHaveBeenCalledTimes(1)
      expect(parentClickMock).not.toHaveBeenCalled()
    })
  })

  describe('Download functionality', () => {
    it('shows download button when withDownload is true', () => {
      render(<File file={mockDocFile} withDownload />)
      expect(screen.getByLabelText('Download file')).toBeInTheDocument()
    })

    it('does not show download button when withDownload is false', () => {
      render(<File file={mockDocFile} withDownload={false} />)
      expect(screen.queryByLabelText('Download file')).not.toBeInTheDocument()
    })

    it('calls downloadFile when download button is clicked', async () => {
      render(<File file={mockDocFile} withDownload />)

      const downloadButton = screen.getByLabelText('Download file')
      await user.click(downloadButton)

      expect(mockFilesStore.downloadFile).toHaveBeenCalledWith('doc-file-456')
    })

    it('stops event propagation when download button is clicked', async () => {
      const parentClickMock = vi.fn()

      render(
        <div onClick={parentClickMock}>
          <File file={mockDocFile} withDownload />
        </div>
      )

      const downloadButton = screen.getByLabelText('Download file')
      await user.click(downloadButton)

      expect(mockFilesStore.downloadFile).toHaveBeenCalledWith('doc-file-456')
      expect(parentClickMock).not.toHaveBeenCalled()
    })

    it('does not call downloadFile when file has no fileId', async () => {
      const fileWithoutId = { ...mockDocFile, fileId: undefined }
      render(<File file={fileWithoutId} withDownload />)

      const downloadButton = screen.getByLabelText('Download file')
      await user.click(downloadButton)

      expect(mockFilesStore.downloadFile).not.toHaveBeenCalled()
    })
  })

  describe('Image preview functionality', () => {
    it('shows chevron icon for images when withPreview is true', () => {
      render(<File file={mockImageFile} withPreview />)
      expect(screen.getByTestId('chevron-down-icon')).toBeInTheDocument()
    })

    it('does not show chevron for non-image files', () => {
      render(<File file={mockDocFile} withPreview />)
      expect(screen.queryByTestId('chevron-down-icon')).not.toBeInTheDocument()
    })

    it('does not show chevron when withPreview is false', () => {
      render(<File file={mockImageFile} withPreview={false} />)
      expect(screen.queryByTestId('chevron-down-icon')).not.toBeInTheDocument()
    })

    it('toggles image preview when button is clicked', async () => {
      render(<File file={mockImageFile} withPreview />)

      const toggleButton = screen.getByRole('button', { name: 'Show preview' })

      // Initially no preview
      expect(screen.queryByAltText('test-image.png')).not.toBeInTheDocument()

      // Click to show preview
      await user.click(toggleButton)

      // Preview should be visible
      expect(screen.getByAltText('test-image.png')).toBeInTheDocument()
      expect(screen.getByTestId('chevron-up-icon')).toBeInTheDocument()

      // Click again to hide
      await user.click(toggleButton)

      // Preview should be hidden
      expect(screen.queryByAltText('test-image.png')).not.toBeInTheDocument()
      expect(screen.getByTestId('chevron-down-icon')).toBeInTheDocument()
    })

    it('calls getFileURL when preview is opened', async () => {
      render(<File file={mockImageFile} withPreview />)

      await user.click(screen.getByRole('button', { name: 'Show preview' }))

      expect(mockFilesStore.getFileURL).toHaveBeenCalledWith('image-file-123')
    })

    it('shows spinner while image is loading', async () => {
      render(<File file={mockImageFile} withPreview />)

      await user.click(screen.getByRole('button', { name: 'Show preview' }))

      // Spinner should be visible initially
      expect(screen.getByTestId('spinner')).toBeInTheDocument()

      // Image should exist but be hidden
      const image = screen.getByAltText('test-image.png')
      expect(image).toHaveClass('hidden')
    })

    it('hides spinner and shows image when loaded', async () => {
      render(<File file={mockImageFile} withPreview />)

      await user.click(screen.getByRole('button', { name: 'Show preview' }))

      const image = screen.getByAltText('test-image.png')

      // Simulate image load
      await act(async () => {
        image.dispatchEvent(new Event('load'))
      })

      await waitFor(() => {
        expect(screen.queryByTestId('spinner')).not.toBeInTheDocument()
      })

      expect(image).not.toHaveClass('hidden')
    })

    it('handles image loading errors', async () => {
      render(<File file={mockImageFile} withPreview />)

      await user.click(screen.getByRole('button', { name: 'Show preview' }))

      const image = screen.getByAltText('test-image.png')

      // Simulate image error
      await act(async () => {
        image.dispatchEvent(new Event('error'))
      })

      await waitFor(() => {
        expect(screen.queryByTestId('spinner')).not.toBeInTheDocument()
      })

      expect(image).not.toHaveClass('hidden')
    })
  })
})
