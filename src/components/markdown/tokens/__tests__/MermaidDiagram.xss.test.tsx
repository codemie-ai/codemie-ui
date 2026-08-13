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

// Tests that the unSanitizeMessage(cleanMermaidCode(code)) path inside
// MermaidDiagram does not allow XSS payloads to execute or reach the DOM as
// live HTML.  These tests intentionally render the REAL MermaidDiagram
// component so the unescape logic at MermaidDiagram.tsx:138 and :298 is
// actually exercised — the Markdown.xss test suite skips this by mocking the
// component away.

import { render, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { filesStore } from '@/store/files'

import MermaidDiagram from '../MermaidDiagram'

vi.mock('@/store/files', () => ({
  filesStore: {
    getMermaidFile: vi.fn().mockResolvedValue('<svg><text>graph TD</text></svg>'),
    clearMermaidCache: vi.fn(),
  },
}))

vi.mock('@/components/Button', () => ({
  default: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}))

vi.mock('@/components/NavigationMore/NavigationMore', () => ({
  default: () => <div />,
}))

vi.mock('@/components/ZoomableImage', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/CodeBlock/CodeBlock', () => ({
  default: ({ text }: { text: string }) => <pre data-testid="code-block">{text}</pre>,
}))

vi.mock('@/components/markdown/tokens/MermaidCodePopup', () => ({
  default: () => null,
}))

vi.mock('@/assets/icons/file.svg?react', () => ({ default: () => null }))
vi.mock('@/assets/icons/view.svg?react', () => ({ default: () => null }))

const win = window as unknown as Record<string, unknown>

describe('MermaidDiagram XSS — unescape path (lines 138 and 298)', () => {
  beforeEach(() => {
    delete win.__xss
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('does not execute a <script> payload that arrives as HTML entities', async () => {
    // sanitizeMessage converts <script>window.__xss=1</script>
    // to &lt;script&gt;window.__xss=1&lt;/script&gt; before the code
    // reaches MermaidDiagram.  Verify unSanitizeMessage restores the text
    // but never executes it.
    const htmlEntityCode = '&lt;script&gt;window.__xss=1&lt;/script&gt;'

    render(<MermaidDiagram code={htmlEntityCode} />)

    await act(async () => {
      vi.advanceTimersByTime(300)
      await Promise.resolve()
    })

    expect(win.__xss).toBeUndefined()
    expect(document.querySelector('script')).toBeNull()
  })

  it('passes unescaped mermaid syntax (not raw HTML entities) to the render API', async () => {
    // HTML entities in valid mermaid syntax must be decoded before the
    // server-side renderer sees them.
    const entityCode = 'graph TD\nA --&gt; B'

    render(<MermaidDiagram code={entityCode} />)

    await act(async () => {
      vi.advanceTimersByTime(300)
      await Promise.resolve()
    })

    const calledWith = vi.mocked(filesStore.getMermaidFile).mock.calls[0]?.[0] ?? ''
    // The API should receive "-->" not the entity form "--&gt;"
    expect(calledWith).toContain('-->')
    expect(calledWith).not.toContain('&gt;')
  })

  it('sanitizes the SVG returned from the render API before inserting into the DOM', async () => {
    // Even if the server returns a malicious SVG (compromise or injection),
    // DOMPurify must strip any script payloads.
    vi.mocked(filesStore.getMermaidFile).mockResolvedValueOnce(
      '<svg><script>window.__xss=1</script><text>ok</text></svg>'
    )

    render(<MermaidDiagram code="graph TD\nA --> B" />)

    await act(async () => {
      vi.advanceTimersByTime(300)
      await Promise.resolve()
    })

    expect(win.__xss).toBeUndefined()
    expect(document.querySelector('script')).toBeNull()
  })
})
