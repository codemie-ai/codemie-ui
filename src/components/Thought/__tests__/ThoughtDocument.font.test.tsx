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

import ThoughtDocument from '../ThoughtDocument'

describe('ThoughtDocument font class', () => {
  it('outer container does not carry font-geist', () => {
    const { container } = render(<ThoughtDocument title="Tool result" />)
    const root = container.firstElementChild
    expect(root?.className).not.toContain('font-geist')
  })

  it('toggle button does not carry font-geist', () => {
    const { container } = render(<ThoughtDocument title="Tool result" />)
    const button = container.querySelector('button')
    expect(button?.className).not.toContain('font-geist')
  })

  it('outer container carries the thought-document CSS class', () => {
    const { container } = render(<ThoughtDocument title="Tool result" />)
    const root = container.firstElementChild
    expect(root?.classList.contains('thought-document')).toBe(true)
  })

  it('toggle button carries the thought-document-toggle CSS class', () => {
    const { container } = render(<ThoughtDocument title="Tool result" />)
    const button = container.querySelector('button')
    expect(button?.classList.contains('thought-document-toggle')).toBe(true)
  })
})

describe('ThoughtDocument.scss font-family wiring', () => {
  let scssContent: string

  beforeAll(() => {
    scssContent = readFileSync(resolve(__dirname, '../ThoughtDocument.scss'), 'utf-8')
  })

  it('uses the shared --font-family-body-sans custom property', () => {
    expect(scssContent).toContain('font-family: var(--font-family-body-sans)')
  })

  it('does not duplicate the Geist fallback list locally', () => {
    expect(scssContent).not.toContain('Geist, Arial, Helvetica, sans-serif')
  })
})
