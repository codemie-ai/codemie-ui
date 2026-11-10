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
import { afterEach, describe, expect, it, vi } from 'vitest'

import toaster from '@/utils/toaster'

import { FileDropArea } from '../components/FileDropArea'

const MiB = 1024 * 1024
const props = { name: 'files', files: [], uploadedFilesCount: 0, onChange: vi.fn(), maxFiles: 10 }

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('FileDropArea', () => {
  it('keeps the generic names when the consumer gives no label', () => {
    render(<FileDropArea {...props} />)

    expect(screen.getByRole('button', { name: 'Upload or drop files' })).toBeInTheDocument()
    expect(screen.getByLabelText('Select files to upload')).toHaveAttribute('type', 'file')
    expect(screen.getByText('Files', { selector: 'label' })).toBeInTheDocument()
  })

  it('names the drop target after the consumer label', () => {
    render(<FileDropArea {...props} label="Application file" />)

    // A native, enabled <button>: focusable and operable with Enter/Space without a tabindex.
    const dropTarget = screen.getByRole('button', {
      name: 'Upload or drop files: Application file',
    })
    expect(dropTarget.tagName).toBe('BUTTON')
    expect(dropTarget).toBeEnabled()
    dropTarget.focus()
    expect(dropTarget).toHaveFocus()
    expect(screen.getAllByLabelText('Application file')).toEqual([
      screen.getByLabelText('Application file', { selector: 'input' }),
    ])
  })

  it('keeps two labelled drop targets distinguishable', () => {
    render(
      <>
        <FileDropArea {...props} name="logo" label="Logo" />
        <FileDropArea {...props} name="banner" label="Banner" />
      </>
    )

    expect(screen.getByRole('button', { name: 'Upload or drop files: Logo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upload or drop files: Banner' })).toBeInTheDocument()
  })

  it('skips and reports files above a consumer size limit', () => {
    const onChange = vi.fn()
    render(<FileDropArea {...props} onChange={onChange} maxFileSizeBytes={1.5 * MiB} />)
    const small = new File(['small'], 'small.txt')

    fireEvent.change(screen.getByLabelText('Select files to upload'), {
      target: { files: [{ name: 'large.zip', size: 2 * MiB }, small] },
    })

    expect(toaster.error).toHaveBeenCalledWith(
      '1 file exceeds the 1.5MB size limit and was not added'
    )
    expect(onChange).toHaveBeenCalledWith([small])
  })

  it('keeps the shared 100MB limit by default', () => {
    const onChange = vi.fn()
    render(<FileDropArea {...props} onChange={onChange} />)

    fireEvent.change(screen.getByLabelText('Select files to upload'), {
      target: { files: [{ name: 'large.zip', size: 101 * MiB }] },
    })

    expect(toaster.error).toHaveBeenCalledWith(
      '1 file exceeds the 100MB size limit and was not added'
    )
    expect(onChange).not.toHaveBeenCalled()
  })
})
