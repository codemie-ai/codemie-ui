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
import { afterEach, describe, expect, it, vi } from 'vitest'

import FilesDropzone from '../FilesDropzone'

// The live region is written one animation frame after the file count changes.
const expectAnnouncement = (expected: string) =>
  waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(expected))

vi.mock('@/components/form/DropzoneArea', () => ({
  default: ({ children }: any) => <div>{children(false)}</div>,
}))

vi.mock('@/components/form/InfoBox', () => ({
  default: () => <div />,
}))

const noop = vi.fn()

const makeFile = (name: string) => new File(['x'], name, { type: 'text/plain' })

afterEach(() => {
  vi.clearAllMocks()
})

describe('FilesDropzone', () => {
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
