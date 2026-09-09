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

import { describe, it, expect, beforeAll } from 'vitest'

describe('theme.css font wiring', () => {
  let css: string

  beforeAll(() => {
    css = readFileSync(resolve(__dirname, '../theme.css'), 'utf-8')
  })

  it('binds the surface to the shared body sans custom property', () => {
    expect(css).toContain('font-family: var(--font-family-body-sans')
  })

  it('does not inherit the mono body font', () => {
    expect(css).not.toMatch(/font-family:\s*inherit/)
  })

  it('falls back to the Geist sans stack when the property is unset', () => {
    const decl = css.match(/font-family: var\(--font-family-body-sans[^;]*;/)
    expect(decl).not.toBeNull()
    expect(decl?.[0]).toContain('Geist, Arial, Helvetica, sans-serif')
  })

  it('does not duplicate the sans stack outside the fallback', () => {
    const occurrences = css.match(/Geist, Arial, Helvetica, sans-serif/g) ?? []
    expect(occurrences).toHaveLength(1)
  })
})
