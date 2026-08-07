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
import { describe, it, expect, beforeAll } from 'vitest'

import Markdown from '../Markdown'

describe('Markdown font-geist class removal', () => {
  it('root div does not carry the hardcoded font-geist Tailwind class', () => {
    const { container } = render(<Markdown content="hello" />)
    const root = container.firstElementChild
    expect(root?.className).not.toContain('font-geist')
  })
})

describe('Markdown.scss font-family wiring', () => {
  let scssContent: string

  beforeAll(() => {
    scssContent = readFileSync(resolve(__dirname, '../Markdown.scss'), 'utf-8')
  })

  it('inline code rule does not use @apply font-geist', () => {
    expect(scssContent).not.toMatch(/@apply[^;]*font-geist[^-]/)
  })

  it('inline code rule uses --font-family-code-block CSS variable', () => {
    expect(scssContent).toContain('font-family: var(--font-family-code-block')
  })

  it('falls back to GeistMono when the CSS variable is unset', () => {
    const decls = scssContent.match(/font-family: var\(--font-family-code-block[^)]*\)/g)
    expect(decls).not.toBeNull()
    decls?.forEach((d) => expect(d).toContain('GeistMono'))
  })

  it('.markdown block uses the shared --font-family-body-sans custom property', () => {
    expect(scssContent).toContain('font-family: var(--font-family-body-sans)')
  })

  it('.markdown block does not duplicate the Geist fallback list locally', () => {
    expect(scssContent).not.toContain('Geist, Arial, Helvetica, sans-serif')
  })
})
