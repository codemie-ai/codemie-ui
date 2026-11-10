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
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'

import HostedArtifactUpload from '../HostedArtifactUpload'

const change = vi.fn()
beforeEach(() => change.mockClear())
it('accepts HTML/ZIP using the shared picker and rejects invalid/empty artifacts', () => {
  render(<HostedArtifactUpload file={null} onChange={change} />)
  const input = screen.getByLabelText('Application file')
  expect(input).toHaveAttribute('accept', '.html,.htm,.zip')
  fireEvent.change(input, { target: { files: [new File(['bad'], 'server.js')] } })
  expect(screen.getByText('Choose an HTML file or a ZIP containing a static build.')).toBeVisible()
  expect(change).not.toHaveBeenCalled()
  fireEvent.change(input, { target: { files: [new File([], 'empty.html')] } })
  expect(screen.getByText('HTML files must be between 1 byte and 20 MiB.')).toBeVisible()
  fireEvent.change(input, { target: { files: [new File(['<h1>Visual</h1>'], 'visual.html')] } })
  expect(change).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ name: 'visual.html' }))
})
it('uses keyboard-accessible shared drag/drop and ignores a late file selection while disabled', () => {
  const { rerender } = render(<HostedArtifactUpload file={null} onChange={change} />)
  // A native, enabled <button>: focusable and operable with Enter/Space without a tabindex.
  const dropTarget = screen.getByRole('button', { name: 'Upload or drop files: Application file' })
  expect(dropTarget.tagName).toBe('BUTTON')
  expect(dropTarget).toBeEnabled()
  dropTarget.focus()
  expect(dropTarget).toHaveFocus()
  rerender(<HostedArtifactUpload file={null} onChange={change} disabled />)
  const input = screen.getByLabelText('Application file')
  expect(input).toBeDisabled()
  fireEvent.change(input, { target: { files: [new File(['new'], 'visual.html')] } })
  expect(change).not.toHaveBeenCalled()
})
