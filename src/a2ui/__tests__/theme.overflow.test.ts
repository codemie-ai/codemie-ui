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

import { describe, it, expect, beforeAll } from 'vitest'

import { atRulesWrapping, declaration, readThemeCss, ruleBody } from './themeCssRules'

describe('theme.css narrow-width containment', () => {
  let css: string

  beforeAll(() => {
    css = readThemeCss()
  })

  it('lets the catalog row wrap instead of forcing one line', () => {
    const body = ruleBody(css, "div[style*='flex-direction: row']")

    expect(body).not.toBeNull()
    expect(declaration(body as string, 'flex-wrap')).toBe('wrap')
    expect(declaration(body as string, 'min-width')).toBe('0')
  })

  it('leaves the horizontal List scroller alone', () => {
    // A horizontal List carries the same inline flex-direction plus overflow-x: auto;
    // wrapping it turns one designed line into a vertically clipped grid.
    const selectors = css.match(/\.a2ui-scope div\[style\*='flex-direction: row'\][^{]*/g) ?? []

    expect(selectors.length).toBeGreaterThan(0)
    selectors.forEach((selector) => expect(selector).toContain("not([style*='overflow-x: auto']"))
  })

  it('keeps the surface itself inside its column', () => {
    const body = ruleBody(css, '.a2ui-scope')

    expect(body).not.toBeNull()
    expect(declaration(body as string, 'max-width')).toBe('100%')
    expect(declaration(body as string, 'min-width')).toBe('0')
  })

  it('lets a long chip wrap rather than widen the column', () => {
    const body = ruleBody(css, '.a2ui-scope .chip')

    expect(body).not.toBeNull()
    expect(declaration(body as string, 'max-width')).toBe('100%')
    expect(declaration(body as string, 'overflow-wrap')).toBe('anywhere')
  })

  it('is not wrapped in an at-rule that would stop it applying', () => {
    expect(atRulesWrapping(css)).toEqual([])
  })
})
