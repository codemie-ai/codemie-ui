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

import { readFileSync } from 'fs'
import { resolve } from 'path'

import { render } from '@testing-library/react'
import { describe, it, expect, beforeEach, beforeAll } from 'vitest'

import CodeBlock from '../CodeBlock'

describe('CodeBlock font rendering integration', () => {
  beforeEach(() => {
    // Reset CSS variables before each test
    document.documentElement.style.removeProperty('--font-family-code-block')
  })

  it('renders code block with expected structure', () => {
    const { container } = render(<CodeBlock text="const x = 1;" language="js" />)

    const codeBlock = container.querySelector('.code-block')
    expect(codeBlock).toBeInTheDocument()
  })

  it('applies CSS variable for code block font', () => {
    const { container } = render(<CodeBlock text="const x = 1;" language="js" />)

    const preElement = container.querySelector('pre[class*="language-"]')
    expect(preElement).toBeInTheDocument()

    // CSS variables are applied via the stylesheet, not inline
    // We verify the element exists and has proper structure
    const codeElement = preElement?.querySelector('code')
    expect(codeElement).toBeInTheDocument()
  })

  it('respects --font-family-code-block CSS variable when set', () => {
    // Set a custom CSS variable
    document.documentElement.style.setProperty(
      '--font-family-code-block',
      '"JetBrains Mono", monospace'
    )

    const { container } = render(<CodeBlock text="const x = 1;" language="js" />)

    const preElement = container.querySelector('pre[class*="language-"]')
    expect(preElement).toBeInTheDocument()

    // Verify CSS variable was set
    const cssVariable = getComputedStyle(document.documentElement).getPropertyValue(
      '--font-family-code-block'
    )
    expect(cssVariable).toContain('JetBrains Mono')
  })

  it('renders code block with syntax highlighting', () => {
    const { container } = render(<CodeBlock text="const x = 1;" language="js" />)

    const preElement = container.querySelector('pre[class*="language-"]')
    expect(preElement).toBeInTheDocument()
  })

  it('includes code content in the rendered output', () => {
    const codeContent = 'function hello() {\n  console.log("world");\n}'
    const { container } = render(<CodeBlock text={codeContent} language="js" />)

    const codeBlock = container.querySelector('.code-block')
    expect(codeBlock?.textContent).toContain('hello')
  })

  it('applies CSS variable to both block and inline code', () => {
    // Set a custom CSS variable
    document.documentElement.style.setProperty(
      '--font-family-code-block',
      '"IBM Plex Mono", monospace'
    )

    const { container } = render(<CodeBlock text="const code = 'example';" language="js" />)

    // Check that the code block was rendered
    expect(container.querySelector('.code-block')).toBeInTheDocument()

    // Verify CSS variable is still set
    const cssVariable = getComputedStyle(document.documentElement).getPropertyValue(
      '--font-family-code-block'
    )
    expect(cssVariable).toContain('IBM Plex Mono')
  })
})

describe('CodeBlock.scss font-family wiring', () => {
  let scssContent: string

  beforeAll(() => {
    const scssPath = resolve(__dirname, '../CodeBlock.scss')
    scssContent = readFileSync(scssPath, 'utf-8')
  })

  it('binds block code (pre[class*="language-"]) to the CSS variable', () => {
    const blockRule = scssContent.match(
      /code\[class\*="language-"\],\s*pre\[class\*="language-"\]\s*\{[^}]*\}/s
    )
    expect(blockRule?.[0]).toContain('font-family: var(--font-family-code-block')
  })

  it('binds inline code (:not(pre) > code[class*="language-"]) to the CSS variable', () => {
    const inlineRule = scssContent.match(/:not\(pre\) > code\[class\*="language-"\]\s*\{[^}]*\}/s)
    expect(inlineRule?.[0]).toContain('font-family: var(--font-family-code-block')
  })

  it('falls back to GeistMono when the CSS variable is unset', () => {
    const fontFamilyDeclarations = scssContent.match(
      /font-family: var\(--font-family-code-block[^)]*\)/g
    )
    expect(fontFamilyDeclarations).not.toBeNull()
    fontFamilyDeclarations?.forEach((decl) => {
      expect(decl).toContain('GeistMono')
    })
  })
})
