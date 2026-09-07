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

import FileListItem from '../FileListItem'

describe('FileListItem', () => {
  it('renders the remove control as a button with a per-file accessible name', () => {
    render(<FileListItem fileName="report.pdf" onRemove={vi.fn()} />)

    expect(
      screen.getByRole('button', { name: 'Delete selected file report.pdf' })
    ).toBeInTheDocument()
  })

  it('exposes the remove control as a real button element of type button', () => {
    render(<FileListItem fileName="report.pdf" onRemove={vi.fn()} />)

    const button = screen.getByRole('button', { name: 'Delete selected file report.pdf' })

    expect(button.tagName).toBe('BUTTON')
    expect(button).toHaveAttribute('type', 'button')
  })

  it('calls onRemove when the remove button is activated with the keyboard', async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn()
    render(<FileListItem fileName="report.pdf" onRemove={onRemove} />)

    await user.tab()

    expect(screen.getByRole('button', { name: 'Delete selected file report.pdf' })).toHaveFocus()

    await user.keyboard('{Enter}')

    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('calls onRemove on click', async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn()
    render(<FileListItem fileName="report.pdf" onRemove={onRemove} />)

    await user.click(screen.getByRole('button', { name: 'Delete selected file report.pdf' }))

    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('names the control after the uploaded section when the row is an uploaded file', () => {
    render(<FileListItem fileName="report.pdf" fileKind="uploaded" onRemove={vi.fn()} />)

    expect(
      screen.getByRole('button', { name: 'Delete uploaded file report.pdf' })
    ).toBeInTheDocument()
  })

  it('gives the remove button a visible focus indicator', () => {
    render(<FileListItem fileName="report.pdf" onRemove={vi.fn()} />)

    const button = screen.getByRole('button', { name: 'Delete selected file report.pdf' })

    // An outline, not a ring: this project's Tailwind palette does not resolve ring colours
    // (`--tw-ring-color` stays transparent even for core colours), so a ring would be invisible.
    expect(button.className).toContain('focus-visible:outline-2')
    expect(button.className).toContain('outline-[rgb(var(--colors-border-accent))]')
  })

  it('hides the decorative icons from assistive technologies', () => {
    const { container } = render(<FileListItem fileName="report.pdf" onRemove={vi.fn()} />)

    const svgs = container.querySelectorAll('svg')

    expect(svgs.length).toBeGreaterThan(0)
    svgs.forEach((svg) => {
      expect(svg).toHaveAttribute('aria-hidden', 'true')
    })
  })
})
