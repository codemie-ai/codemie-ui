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

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import TableBlock from '../TableBlock'

const { mockCopyToClipboard } = vi.hoisted(() => ({
  mockCopyToClipboard: vi.fn(),
}))

vi.mock('@/utils/utils', async () => {
  const actual = await vi.importActual('@/utils/utils')
  return {
    ...actual,
    copyToClipboard: mockCopyToClipboard,
  }
})

vi.mock('@/assets/icons/copy.svg?react', () => ({
  default: () => <svg data-testid="copy-icon">Copy</svg>,
}))

describe('TableBlock', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the provided table HTML', () => {
    const { container } = render(
      <TableBlock
        html="<table><tbody><tr><td>Cell</td></tr></tbody></table>"
        raw="| Cell |\n|---|"
      />
    )
    expect(container.querySelector('table')).toBeInTheDocument()
    expect(container.querySelector('td')).toHaveTextContent('Cell')
  })

  it('renders a copy button with accessible label "Copy table"', () => {
    render(<TableBlock html="<table></table>" raw="| a |\n|---|" />)
    expect(screen.getByRole('button', { name: 'Copy table' })).toBeInTheDocument()
  })

  it('calls copyToClipboard with raw markdown and correct notification when button is clicked', () => {
    const raw = '| Name | Age |\n|---|---|\n| Alice | 30 |'
    render(<TableBlock html="<table></table>" raw={raw} />)

    fireEvent.click(screen.getByRole('button', { name: 'Copy table' }))

    expect(mockCopyToClipboard).toHaveBeenCalledTimes(1)
    expect(mockCopyToClipboard).toHaveBeenCalledWith(raw, 'Table copied to clipboard')
  })
})
