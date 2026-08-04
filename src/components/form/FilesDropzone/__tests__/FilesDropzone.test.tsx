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
import { afterEach, describe, expect, it, vi } from 'vitest'

import FilesDropzone from '../FilesDropzone'

vi.mock('@/components/form/DropzoneArea', () => ({
  default: ({ children }: any) => <div>{children(false)}</div>,
}))

vi.mock('@/components/form/InfoBox', () => ({
  default: () => <div />,
}))

const noop = vi.fn()

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
})
