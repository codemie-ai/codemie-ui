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

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import TextBlock from '../TextBlock'

const lines = (count: number) =>
  Array.from({ length: count }, (_, index) => `Line ${index + 1}`).join('\n')

const displayedLines = (container: HTMLElement) =>
  Array.from(container.firstElementChild!.children)
    .filter((element) => element.tagName === 'DIV' && !element.querySelector('button'))
    .map((element) => element.textContent)

afterEach(cleanup)

describe('TextBlock disclosure', () => {
  it.each([0, 40, 59])('keeps %i lines full without a toggle', (count) => {
    const { container } = render(<TextBlock text={lines(count)} collapsible />)
    expect(displayedLines(container)).toHaveLength(count)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it.each([
    [60, 20, 'Line 41'],
    [100, 60, 'Line 81'],
  ])('previews exactly the first and last 20 of %i lines', (count, hidden, tail) => {
    const { container } = render(<TextBlock text={lines(Number(count))} collapsible />)
    const visible = displayedLines(container)
    expect(visible).toHaveLength(40)
    expect(visible.slice(0, 20)).toEqual(lines(20).split('\n'))
    expect(visible[20]).toBe(tail)
    expect(visible[39]).toBe(`Line ${count}`)
    const toggle = screen.getByRole('button', { name: `Show ${hidden} hidden lines` })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveClass('w-full', 'px-3', 'py-2', 'bg-surface-base-secondary')
    expect(toggle.previousElementSibling?.textContent).toBe('Line 20')
    expect(toggle.nextElementSibling?.textContent).toBe(tail)
  })

  it('keeps long default-off content full in its existing container', () => {
    const { container } = render(<TextBlock text={lines(100)} className="break-all" />)
    expect(displayedLines(container)).toHaveLength(100)
    expect(container.firstElementChild?.tagName).toBe('P')
    expect(container.firstElementChild).toHaveClass('break-all')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('preserves literal delimiters, empty filtering, whitespace and carriage returns', () => {
    const { container } = render(<TextBlock text={'first\\n\\n \n\nsecond\r\nlast'} collapsible />)
    expect(displayedLines(container)).toEqual(['first', ' ', 'second\r', 'last'])
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('counts whitespace and CR lines without counting empty actual or literal pieces', () => {
    const { container } = render(<TextBlock text={`${lines(58)}\n\n\\n \nlast\r\n`} collapsible />)
    expect(screen.getByRole('button', { name: 'Show 20 hidden lines' })).toBeInTheDocument()
    expect(displayedLines(container)).toHaveLength(40)
    expect(displayedLines(container).slice(-2)).toEqual([' ', 'last\r'])
  })

  it('preserves keyboard focus when moving between the middle row and top control bar', async () => {
    const user = userEvent.setup()
    const { container } = render(<TextBlock text={lines(60)} className="break-all" collapsible />)
    const toggle = screen.getByRole('button', { name: 'Show 20 hidden lines' })
    expect(container.firstElementChild?.tagName).toBe('DIV')
    expect(container.querySelector('p button')).toBeNull()
    expect(container.firstElementChild).toHaveClass('break-all')
    expect(toggle).toHaveAttribute('type', 'button')
    expect(toggle).toHaveClass(
      'text-xs',
      'text-text-primary',
      'cursor-pointer',
      'focus-visible:outline',
      'focus-visible:outline-2'
    )
    expect(toggle).not.toHaveClass('focus-visible:outline-none', 'text-text-link')
    await user.tab()
    expect(toggle).toHaveFocus()
    await user.keyboard('{Enter}')
    const collapse = screen.getByRole('button', { name: 'Collapse' })
    expect(collapse).toHaveAttribute('aria-expanded', 'true')
    expect(collapse).toHaveFocus()
    expect(collapse).toHaveClass('focus-visible:outline', 'focus-visible:outline-2')
    expect(displayedLines(container)).toEqual(lines(60).split('\n'))
    await user.keyboard(' ')
    const preview = screen.getByRole('button', { name: 'Show 20 hidden lines' })
    expect(preview).toHaveAttribute('aria-expanded', 'false')
    expect(preview).toHaveFocus()
    expect(screen.queryByText('Line 21')).not.toBeInTheDocument()
  })

  it('puts the only expanded control above the entire uninterrupted output', async () => {
    const user = userEvent.setup()
    const { container } = render(<TextBlock text={lines(60)} collapsible />)
    await user.click(screen.getByRole('button', { name: 'Show 20 hidden lines' }))
    const collapse = screen.getByRole('button', { name: 'Collapse' })
    expect(screen.getAllByRole('button')).toHaveLength(1)
    const bar = container.firstElementChild!.firstElementChild!
    expect(bar.contains(collapse)).toBe(true)
    expect(bar.nextElementSibling?.textContent).toBe('Line 1')
    expect(
      Array.from(bar.parentElement!.children)
        .slice(1)
        .map((line) => line.textContent)
    ).toEqual(lines(60).split('\n'))
  })

  it.each(['metadata', 'row', 'Collapse'])(
    'collapses from the expanded %s without making output interactive',
    async (target) => {
      const user = userEvent.setup()
      const { container } = render(<TextBlock text={lines(60)} collapsible />)
      await user.click(screen.getByRole('button', { name: 'Show 20 hidden lines' }))
      const collapse = screen.getByRole('button', { name: /Collapse/ })
      const metadata = screen.getByText('Full tool output · 60 lines')
      expect(collapse).toHaveAttribute('type', 'button')
      expect(collapse).toBe(container.firstElementChild!.firstElementChild)
      expect(collapse).toContainElement(metadata)
      expect(metadata).toHaveClass('text-left')
      expect(metadata).not.toHaveClass('text-text-quaternary')
      expect(screen.getByText('Collapse')).toHaveClass('ml-auto')
      expect(collapse).not.toHaveClass('sticky', 'fixed')
      const outputLine = screen.getByText('Line 21')
      expect(outputLine.closest('button, [role="button"]')).toBeNull()
      await user.click(outputLine)
      expect(collapse).toHaveAttribute('aria-expanded', 'true')
      const rowTarget = target === 'metadata' ? metadata : collapse
      await user.click(target === 'Collapse' ? screen.getByText('Collapse') : rowTarget)
      expect(screen.getByRole('button', { name: 'Show 20 hidden lines' })).toHaveAttribute(
        'aria-expanded',
        'false'
      )
    }
  )

  it('styles the expanded button as a full-width secondary content surface', async () => {
    const user = userEvent.setup()
    render(<TextBlock text={lines(60)} collapsible />)
    await user.click(screen.getByRole('button', { name: 'Show 20 hidden lines' }))
    expect(screen.getByRole('button', { name: /Collapse/ })).toHaveClass(
      'w-full',
      'flex',
      'items-center',
      'p-3',
      'rounded-lg',
      'border',
      'bg-surface-base-secondary',
      'text-text-primary'
    )
  })

  it('uses small decorative leading chevrons pointing right in preview and down when expanded', async () => {
    const user = userEvent.setup()
    render(<TextBlock text={lines(60)} collapsible />)
    const preview = screen.getByRole('button', { name: 'Show 20 hidden lines' })
    const previewChevron = preview.querySelector('svg')
    expect(previewChevron).not.toBeNull()
    expect(preview.firstElementChild).toBe(previewChevron)
    expect(previewChevron).toHaveAttribute('aria-hidden', 'true')
    expect(previewChevron).toHaveClass('size-3', 'shrink-0')
    expect(previewChevron).not.toHaveClass('rotate-90')
    await user.click(preview)
    const collapse = screen.getByRole('button', { name: /Collapse/ })
    const expandedChevron = collapse.querySelector('svg')
    expect(expandedChevron).not.toBeNull()
    expect(collapse.firstElementChild).toBe(expandedChevron)
    expect(expandedChevron).toHaveAttribute('aria-hidden', 'true')
    expect(expandedChevron).toHaveClass('size-3', 'shrink-0', 'rotate-90')
    expect(expandedChevron?.innerHTML).toBe(previewChevron?.innerHTML)
  })

  it('updates the streaming threshold, latest tail and hidden count without losing expansion', async () => {
    const user = userEvent.setup()
    const { container, rerender } = render(<TextBlock text={lines(59)} collapsible />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    rerender(<TextBlock text={lines(60)} collapsible />)
    expect(screen.getByRole('button', { name: 'Show 20 hidden lines' })).toBeInTheDocument()
    rerender(<TextBlock text={lines(100)} collapsible />)
    expect(screen.getByRole('button', { name: 'Show 60 hidden lines' })).toBeInTheDocument()
    expect(screen.queryByText('Line 41')).not.toBeInTheDocument()
    expect(screen.getByText('Line 81')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Show 60 hidden lines' }))
    rerender(<TextBlock text={lines(101)} collapsible />)
    expect(screen.getByRole('button', { name: 'Collapse' })).toHaveAttribute(
      'aria-expanded',
      'true'
    )
    expect(displayedLines(container)).toEqual(lines(101).split('\n'))
    await user.click(screen.getByRole('button', { name: 'Collapse' }))
    expect(screen.getByRole('button', { name: 'Show 61 hidden lines' })).toBeInTheDocument()
    expect(displayedLines(container)[20]).toBe('Line 82')
  })
})
