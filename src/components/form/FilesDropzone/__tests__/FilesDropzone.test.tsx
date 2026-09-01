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

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import toaster from '@/utils/toaster'

import FilesDropzone from '../FilesDropzone'

// The live region is written one animation frame after the file count changes.
const expectAnnouncement = (expected: string) =>
  waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(expected))

vi.mock('@/components/form/DropzoneArea', () => ({
  default: ({ children, onFilesDrop }: any) => (
    <div>
      <button
        type="button"
        onClick={() =>
          onFilesDrop(
            Array.from(
              { length: 13 },
              (_, index) =>
                new File(['file content'], `dropped-${index}.txt`, { type: 'text/plain' })
            )
          )
        }
      >
        Drop test files
      </button>
      {children(false)}
    </div>
  ),
}))

vi.mock('@/components/form/InfoBox', () => ({
  default: ({ text }: { text: string }) => <div>{text}</div>,
}))

vi.mock('@/utils/toaster', () => ({
  default: { error: vi.fn() },
}))

const noop = vi.fn()
const createFile = (name: string) => new File(['file content'], name, { type: 'text/plain' })

const makeFile = (name: string) => new File(['x'], name, { type: 'text/plain' })

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('FilesDropzone', () => {
  it('shows the configured maximum before files are selected', () => {
    render(<FilesDropzone name="files" files={[]} onChange={noop} maxFiles={12} />)

    expect(screen.getByText(/Maximum files: 12\./)).toBeInTheDocument()
  })

  it('uses the configured maximum when selecting more files than allowed', () => {
    const onChange = vi.fn()
    const selectedFiles = Array.from({ length: 13 }, (_, index) => createFile(`file-${index}.txt`))

    render(<FilesDropzone name="files" files={[]} onChange={onChange} maxFiles={12} />)

    fireEvent.change(screen.getByLabelText('Select files to upload'), {
      target: { files: selectedFiles },
    })

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0]).toHaveLength(12)
  })

  it('limits dropped files and reports the configured overflow limit', () => {
    const onChange = vi.fn()

    render(<FilesDropzone name="files" files={[]} onChange={onChange} maxFiles={12} />)

    fireEvent.click(screen.getByRole('button', { name: 'Drop test files' }))

    expect(onChange.mock.calls[0][0]).toHaveLength(12)
    expect(toaster.error).toHaveBeenCalledWith('Max 12 files allowed. 1 file was not added')
  })

  it('counts retained files against the configured edit limit', () => {
    render(
      <FilesDropzone
        name="files"
        files={[createFile('new-a.txt'), createFile('new-b.txt')]}
        uploadedFiles={Array.from({ length: 10 }, (_, index) => `stored-${index}.txt`)}
        onChange={noop}
        maxFiles={12}
      />
    )

    expect(screen.getByText('12 / 12 files selected')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Select files to upload'), {
      target: { files: [createFile('one-too-many.txt')] },
    })
    expect(noop).not.toHaveBeenCalled()
  })

  describe('error association', () => {
    it('links the file input to a single error wrapper via aria-describedby', () => {
      render(
        <FilesDropzone
          name="files"
          files={[]}
          onChange={noop}
          errors={[{ message: 'File too large' }]}
          showErrors
        />
      )

      const fileInput = screen.getByLabelText('Select files to upload')
      const errorText = screen.getByText('File too large')
      const wrapper = errorText.parentElement as HTMLElement

      expect(wrapper).toHaveAttribute('id', fileInput.getAttribute('aria-describedby'))
      expect(fileInput).toHaveAttribute('aria-invalid', 'true')
    })

    it('does not render aria-describedby or a wrapper when there are no errors', () => {
      render(<FilesDropzone name="files" files={[]} onChange={noop} />)

      const fileInput = screen.getByLabelText('Select files to upload')

      expect(fileInput).not.toHaveAttribute('aria-describedby')
      expect(fileInput).not.toHaveAttribute('aria-invalid')
    })

    it('groups multiple simultaneous error messages inside the same single wrapper id', () => {
      render(
        <FilesDropzone
          name="files"
          files={[]}
          onChange={noop}
          errors={[{ message: 'File too large' }, { message: 'Unsupported format' }]}
          showErrors
        />
      )

      const fileInput = screen.getByLabelText('Select files to upload')
      const describedBy = fileInput.getAttribute('aria-describedby')

      const firstError = screen.getByText('File too large')
      const secondError = screen.getByText('Unsupported format')

      expect(firstError.parentElement).toHaveAttribute('id', describedBy)
      expect(secondError.parentElement).toBe(firstError.parentElement)
    })

    it('uses a unique wrapper id per instance even when two dropzones share the same name', () => {
      render(
        <>
          <FilesDropzone
            name="files"
            files={[]}
            onChange={noop}
            errors={[{ message: 'File too large' }]}
            showErrors
          />
          <FilesDropzone
            name="files"
            files={[]}
            onChange={noop}
            errors={[{ message: 'Unsupported format' }]}
            showErrors
          />
        </>
      )

      const errorNodes = screen.getAllByRole('alert')
      const firstWrapperId = errorNodes[0].parentElement?.getAttribute('id')
      const secondWrapperId = errorNodes[1].parentElement?.getAttribute('id')

      expect(firstWrapperId).toBeTruthy()
      expect(secondWrapperId).toBeTruthy()
      expect(firstWrapperId).not.toBe(secondWrapperId)
    })
  })

  describe('file count announcements', () => {
    it('renders an empty status region on the initial render', () => {
      render(<FilesDropzone name="files" files={[makeFile('a.txt')]} onChange={noop} />)

      expect(screen.getByRole('status')).toHaveTextContent('')
    })

    it('announces the new total when a file is added', async () => {
      const { rerender } = render(<FilesDropzone name="files" files={[]} onChange={noop} />)

      rerender(<FilesDropzone name="files" files={[makeFile('a.txt')]} onChange={noop} />)

      await expectAnnouncement('1 of 10 files selected')
    })

    it('announces the remaining total when a file is removed', async () => {
      const { rerender } = render(
        <FilesDropzone
          name="files"
          files={[makeFile('a.txt'), makeFile('b.txt')]}
          onChange={noop}
        />
      )

      rerender(<FilesDropzone name="files" files={[makeFile('a.txt')]} onChange={noop} />)

      await expectAnnouncement('1 of 10 files selected')
    })

    it('announces that no files are selected when the last file is removed', async () => {
      const { rerender } = render(
        <FilesDropzone name="files" files={[makeFile('a.txt')]} onChange={noop} />
      )

      rerender(<FilesDropzone name="files" files={[]} onChange={noop} />)

      await expectAnnouncement('No files selected')
    })

    it('counts already uploaded files towards the announced total', async () => {
      const { rerender } = render(
        <FilesDropzone name="files" files={[]} onChange={noop} uploadedFiles={['old.txt']} />
      )

      rerender(
        <FilesDropzone
          name="files"
          files={[makeFile('a.txt')]}
          onChange={noop}
          uploadedFiles={['old.txt']}
        />
      )

      await expectAnnouncement('2 of 10 files selected')
    })
  })
})
