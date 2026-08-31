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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { appInfoStore } from '@/store/appInfo'

import ChatDisclaimer from '../ChatDisclaimer'

const setDisclaimer = (settings: { enabled: boolean; text: string }) => {
  appInfoStore.configs = [{ id: 'chatDisclaimer', settings }]
}

// jsdom has no layout, so the truncated branch needs a stub
vi.mock('@/hooks/useIsTruncated', () => ({ useIsTruncated: () => true }))

// split so the linter's no-script-url rule does not trip on the literal
const SCRIPT_SCHEME = `java${'script:'}`

describe('ChatDisclaimer', () => {
  beforeEach(() => {
    setDisclaimer({ enabled: true, text: 'Verify important information.' })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders the text when enabled', () => {
    render(<ChatDisclaimer />)

    expect(screen.getByText(/verify important information/i)).toBeInTheDocument()
  })

  it('renders nothing when disabled', () => {
    setDisclaimer({ enabled: false, text: 'Verify important information.' })

    const { container } = render(<ChatDisclaimer />)

    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when the text is blank', () => {
    setDisclaimer({ enabled: true, text: '   ' })

    const { container } = render(<ChatDisclaimer />)

    expect(container).toBeEmptyDOMElement()
  })

  it('renders a markdown link with safe attributes', () => {
    setDisclaimer({
      enabled: true,
      text: 'See the [policy](https://example.com/policy).',
    })

    render(<ChatDisclaimer />)

    const link = screen.getByRole('link', { name: 'policy' })
    expect(link).toHaveAttribute('href', 'https://example.com/policy')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
  })

  it('does not render a script-scheme url as an executable link', () => {
    setDisclaimer({
      enabled: true,
      text: `Click [here](${SCRIPT_SCHEME})alert(1)).`,
    })

    const { container } = render(<ChatDisclaimer />)

    const link = container.querySelector('a')
    expect(link?.getAttribute('href') ?? '').not.toContain(SCRIPT_SCHEME)
  })

  it('exposes the full text as a tooltip when truncated', () => {
    render(<ChatDisclaimer />)

    expect(screen.getByTestId('chat-disclaimer')).toHaveAttribute(
      'data-tooltip-content',
      'Verify important information.'
    )
  })

  it('shows readable text in the tooltip instead of markdown link syntax', () => {
    setDisclaimer({
      enabled: true,
      text: 'See the [acceptable use policy](https://example.com/policy) for details.',
    })

    render(<ChatDisclaimer />)

    expect(screen.getByTestId('chat-disclaimer')).toHaveAttribute(
      'data-tooltip-content',
      'See the acceptable use policy for details.'
    )
  })

  it('applies the informational colour token to the rendered text', () => {
    const { container } = render(<ChatDisclaimer />)

    expect(container.querySelector('.text-text-info')).not.toBeNull()
    expect(container.querySelector('.text-text-primary')).toBeNull()
  })

  it('bounds the block to two lines of text', () => {
    render(<ChatDisclaimer />)

    const block = screen.getByTestId('chat-disclaimer')
    expect(block.className).toContain('line-clamp-2')
    expect(block.className).toContain('text-sm-1')
  })

  it('renders the text inline, without block elements the clamp cannot truncate', () => {
    setDisclaimer({
      enabled: true,
      text: 'See the [policy](https://example.com/policy) before use.',
    })

    render(<ChatDisclaimer />)

    const block = screen.getByTestId('chat-disclaimer')
    expect(block.querySelector('p')).toBeNull()
    expect(block.querySelector('a')).not.toBeNull()
  })

  it('does not render script markup authored by an administrator', () => {
    setDisclaimer({
      enabled: true,
      text: 'Careful <img src=x onerror="alert(1)"> <script>alert(2)</script> text',
    })

    const { container } = render(<ChatDisclaimer />)

    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('img')?.getAttribute('onerror') ?? null).toBeNull()
  })
})
