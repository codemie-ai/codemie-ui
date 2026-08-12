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

import { render, screen, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import MermaidDiagram from '../MermaidDiagram'

// Real NavigationMore is intentionally NOT mocked — this test verifies the
// "Export diagram" direct action-label wiring in the production component.

vi.mock('@/store/files', () => ({
  filesStore: {
    getMermaidFile: vi.fn().mockResolvedValue('<svg><text>Test Diagram</text></svg>'),
  },
}))

vi.mock('@/assets/icons/navigation-more.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/assets/icons/file.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/assets/icons/view.svg?react', () => ({ default: () => <svg /> }))

vi.mock('@/components/ZoomableImage', () => ({
  default: ({ children }: any) => <div>{children}</div>,
}))
vi.mock('@/components/Button', () => ({
  default: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}))
vi.mock('@/components/CodeBlock/CodeBlock', () => ({ default: () => null }))
vi.mock('../MermaidCodePopup', () => ({ default: () => null }))

vi.mock('dompurify', () => ({
  default: { sanitize: (_input: string) => _input },
}))

vi.mock('@/utils/messageHelpers', () => ({
  unSanitizeMessage: (s: string) => s,
}))

vi.mock('@/constants', () => ({
  ButtonType: { TERTIARY: 'tertiary' },
  ButtonSize: { MEDIUM: 'medium' },
}))

describe('MermaidDiagram accessibility — Export diagram direct label', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders an "Export diagram" button with aria-label after diagram loads', async () => {
    render(<MermaidDiagram code="graph TD; A-->B" />)

    await act(async () => {
      vi.advanceTimersByTime(350)
      await Promise.resolve()
    })

    const trigger = screen.getByRole('button', { name: 'Export diagram' })
    expect(trigger).toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-label', 'Export diagram')
  })

  it('the Export diagram trigger has no aria-labelledby', async () => {
    render(<MermaidDiagram code="graph TD; A-->B" />)

    await act(async () => {
      vi.advanceTimersByTime(350)
      await Promise.resolve()
    })

    const trigger = screen.getByRole('button', { name: 'Export diagram' })
    expect(trigger).not.toHaveAttribute('aria-labelledby')
  })

  it('the Export diagram trigger has aria-haspopup="menu"', async () => {
    render(<MermaidDiagram code="graph TD; A-->B" />)

    await act(async () => {
      vi.advanceTimersByTime(350)
      await Promise.resolve()
    })

    const trigger = screen.getByRole('button', { name: 'Export diagram' })
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
  })
})
