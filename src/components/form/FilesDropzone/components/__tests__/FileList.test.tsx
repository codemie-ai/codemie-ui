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
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { FileList } from '../FileList'

const makeFile = (name: string) => new File(['x'], name, { type: 'text/plain' })

describe('FileList', () => {
  it('renders nothing when there are no files at all', () => {
    render(<FileList files={[]} uploadedFiles={[]} onChange={vi.fn()} />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('gives every row its own uniquely named delete button', () => {
    render(
      <FileList
        files={[makeFile('new.txt')]}
        uploadedFiles={['old.pdf']}
        onChange={vi.fn()}
        onUploadedFileRemove={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: 'Delete uploaded file old.pdf' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete selected file new.txt' })).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })

  it('distinguishes an uploaded row from a selected row that share a file name', () => {
    render(
      <FileList
        files={[makeFile('spec.pdf')]}
        uploadedFiles={['spec.pdf']}
        onChange={vi.fn()}
        onUploadedFileRemove={vi.fn()}
      />
    )

    const names = screen.getAllByRole('button').map((button) => button.getAttribute('aria-label'))

    expect(new Set(names).size).toBe(2)
    expect(names).toContain('Delete uploaded file spec.pdf')
    expect(names).toContain('Delete selected file spec.pdf')
  })

  it('removes the file whose delete button was activated', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const first = makeFile('a.txt')
    const second = makeFile('b.txt')

    render(<FileList files={[first, second]} uploadedFiles={[]} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Delete selected file a.txt' }))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0]).toEqual([second])
  })

  it('reports the uploaded file name and index when an uploaded row is removed', async () => {
    const user = userEvent.setup()
    const onUploadedFileRemove = vi.fn()

    render(
      <FileList
        files={[]}
        uploadedFiles={['first.pdf', 'second.pdf']}
        onChange={vi.fn()}
        onUploadedFileRemove={onUploadedFileRemove}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Delete uploaded file second.pdf' }))

    expect(onUploadedFileRemove).toHaveBeenCalledWith('second.pdf', 1)
  })
})
