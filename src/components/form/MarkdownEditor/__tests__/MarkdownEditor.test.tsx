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
// Regression coverage for hoisting markdownComponents out of MarkdownEditor
// (typescript:S6478 — React components should not be nested). The renderers
// must still produce identical markup, and the code renderer must still pick
// up the live theme via its own useTheme() call now that it's hoisted.

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import MarkdownEditor from '../MarkdownEditor'

vi.mock('@/assets/icons/expand.svg?react', () => ({
  default: () => <svg data-testid="expand-icon" />,
}))

vi.mock('@/components/Popup', () => ({
  default: ({ visible, children }: { visible: boolean; children: React.ReactNode }) =>
    visible ? <div data-testid="popup">{children}</div> : null,
}))

let mockIsDark = false
vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ isDark: mockIsDark }),
}))

vi.mock('react-syntax-highlighter', () => ({
  Prism: ({ children, style, language }: any) => (
    <div data-testid="syntax-highlighter" data-language={language} data-style={style?.name}>
      {children}
    </div>
  ),
}))

vi.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
  dracula: { name: 'dracula' },
  prism: { name: 'prism' },
}))

const renderAndShowPreview = (value: string) => {
  render(<MarkdownEditor value={value} onChange={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Show preview' }))
}

describe('MarkdownEditor preview rendering', () => {
  it('renders headings, emphasis, links, images, lists, and blockquotes', () => {
    renderAndShowPreview(
      [
        '# Heading',
        '**bold** and *italic*',
        '[link](https://example.com)',
        // Relative path: same-origin per isImageAllowed's Tier 6 (EPMCDME-12950),
        // and react-markdown's own default sanitizer leaves relative URLs
        // untouched (unlike e.g. data: URIs, which it strips outright) — keeps
        // this test about markdown image syntax, not the allow-list feature.
        '![alt text](/api/v1/files/test.png)',
        '- item one',
        '> a quote',
      ].join('\n\n')
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Heading' })).toBeInTheDocument()
    expect(screen.getByText('bold').tagName).toBe('STRONG')
    expect(screen.getByText('italic').tagName).toBe('EM')
    expect(screen.getByRole('link', { name: 'link' })).toHaveAttribute(
      'href',
      'https://example.com'
    )
    expect(screen.getByRole('img', { name: 'alt text' })).toHaveAttribute(
      'src',
      expect.stringContaining('/api/v1/files/test.png')
    )
    expect(screen.getByText('item one').tagName).toBe('LI')
    expect(screen.getByText('a quote').closest('blockquote')).toBeInTheDocument()
  })

  it('renders a fenced code block through the syntax highlighter with the light theme', () => {
    mockIsDark = false
    renderAndShowPreview('```js\nconst x = 1\n```')

    const block = screen.getByTestId('syntax-highlighter')
    expect(block).toHaveAttribute('data-language', 'js')
    expect(block).toHaveAttribute('data-style', 'prism')
  })

  it('switches the fenced code block to the dark theme when useTheme reports isDark', () => {
    mockIsDark = true
    renderAndShowPreview('```js\nconst x = 1\n```')

    expect(screen.getByTestId('syntax-highlighter')).toHaveAttribute('data-style', 'dracula')
  })

  it('renders inline code as a plain code element, not the syntax highlighter', () => {
    mockIsDark = false
    renderAndShowPreview('use `inlineCode()` here')

    expect(screen.getByText('inlineCode()').tagName).toBe('CODE')
    expect(screen.queryByTestId('syntax-highlighter')).not.toBeInTheDocument()
  })

  it('strips exactly one trailing newline from a multi-line fenced code block', () => {
    mockIsDark = false
    renderAndShowPreview('```js\nconst x = 1\nconst y = 2\n```')

    expect(screen.getByTestId('syntax-highlighter')).toHaveTextContent('const x = 1 const y = 2')
  })
})
