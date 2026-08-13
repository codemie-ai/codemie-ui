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
import { render } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Vitest hoists vi.mock calls before imports, so these mocks apply to the
// Markdown import below even though they appear after the static imports above.
import Markdown from '@/components/markdown/Markdown'

// Mock heavy sub-components that require Prism, Mermaid, or browser-specific globals.
// The XSS surface under test is sanitizeMessage() + DOMPurify, not code highlighting.
vi.mock('@/components/CodeBlock/CodeBlock', () => ({
  default: ({ text }: { text: string }) => <pre data-testid="code-block">{text}</pre>,
}))
vi.mock('@/components/markdown/tokens/MermaidDiagram', () => ({
  default: ({ code }: { code: string }) => <pre data-testid="mermaid">{code}</pre>,
}))

// Cast via unknown to satisfy TypeScript's strict Window overlap check.
const win = window as unknown as Record<string, unknown>

describe('Markdown XSS protection — full render pipeline', () => {
  beforeEach(() => {
    delete win.__xss
  })

  it('does not inject or execute <script> from LLM output', () => {
    const { container } = render(<Markdown content="<script>window.__xss = 1</script>" />)
    expect(win.__xss).toBeUndefined()
    expect(container.querySelector('script')).toBeNull()
  })

  it('does not execute onerror handler from <img> in LLM output', () => {
    render(<Markdown content='<img src="x" onerror="window.__xss = 1">' />)
    expect(win.__xss).toBeUndefined()
  })

  it('strips event handler attributes injected via LLM HTML', () => {
    const { container } = render(
      <Markdown content='<div onclick="window.__xss = 1">click me</div>' />
    )
    expect(win.__xss).toBeUndefined()
    expect(container.querySelector('[onclick]')).toBeNull()
  })

  it('strips javascript: href from LLM-generated markdown link', () => {
    // eslint-disable-next-line no-script-url
    const jsUrl = 'javascript:window.__xss=1' // NOSONAR — intentional: test verifies this URL is blocked
    const { container } = render(<Markdown content={`[click me](${jsUrl})`} />)
    expect(win.__xss).toBeUndefined()
    // DOMPurify either strips the href entirely (null) or replaces it with a safe value.
    const href = container.querySelector('a')?.getAttribute('href') ?? null
    // eslint-disable-next-line no-script-url
    expect(!href?.includes('javascript:')).toBe(true) // NOSONAR — intentional: asserting the URL was stripped
  })

  it('renders entity-injected &lt;script&gt; as visible text, not as a live tag', () => {
    const { container } = render(<Markdown content="&lt;script&gt;window.__xss=1&lt;/script&gt;" />)
    expect(win.__xss).toBeUndefined()
    expect(container.querySelector('script')).toBeNull()
  })

  it('displays & in LLM plain text output as the literal & character', () => {
    const { container } = render(<Markdown content="Tom & Jerry" />)
    expect(container.textContent).toContain('Tom & Jerry')
  })

  it('displays &amp; entity in LLM output as the & character', () => {
    const { container } = render(<Markdown content="Tom &amp; Jerry" />)
    expect(container.textContent).toContain('Tom & Jerry')
  })

  it('renders a markdown code span containing < > without executing XSS', () => {
    const { container } = render(<Markdown content="`<script>alert(1)</script>`" />)
    expect(win.__xss).toBeUndefined()
    const code = container.querySelector('code')
    expect(code).not.toBeNull()
    expect(code?.textContent).toContain('script')
  })

  it('renders bold markdown (**text**) without stripping it', () => {
    const { container } = render(<Markdown content="**hello world**" />)
    const bold = container.querySelector('strong')
    expect(bold).not.toBeNull()
    expect(bold?.textContent).toBe('hello world')
  })

  it('renders markdown link with safe href and target=_blank', () => {
    const { container } = render(<Markdown content="[link](https://example.com)" />)
    const link = container.querySelector('a')
    expect(link?.getAttribute('href')).toBe('https://example.com')
    expect(link?.getAttribute('target')).toBe('_blank')
    expect(link?.getAttribute('rel')).toContain('noopener')
  })
})
