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

describe('theme.css read-only affordance', () => {
  let css: string

  beforeAll(() => {
    css = readThemeCss()
  })

  it('dims the controls of a read-only surface', () => {
    const body = ruleBody(css, 'fieldset:disabled')

    expect(body).not.toBeNull()
    expect(declaration(body as string, 'opacity')).toBe('0.65')
  })

  it('keys the dimming off the disabled fieldset, not off :disabled alone', () => {
    // `:disabled` alone also matches a control the design system disabled on a LIVE
    // surface, overriding its own disabled and loading styling.
    expect(css).toMatch(/\.a2ui-scope fieldset:disabled/)
    expect(css).not.toMatch(/\.a2ui-scope :disabled\b/)
  })

  it('exempts the answered action so the surface still says which one was taken', () => {
    const body = ruleBody(css, 'fieldset:disabled :where(input, textarea, select, button)')

    expect(body).not.toBeNull()
    const selector = css.match(/\.a2ui-scope fieldset:disabled :where\([^{]*/)?.[0] ?? ''
    expect(selector).toContain('.a2ui-answered')
  })

  it('declares no cursor, which inherited pointer-events: none would make unreachable', () => {
    const body = ruleBody(css, 'fieldset:disabled :where(input, textarea, select, button)')

    expect(declaration(body as string, 'cursor')).toBeNull()
  })

  it('is not wrapped in an at-rule that would stop it applying', () => {
    expect(atRulesWrapping(css)).toEqual([])
  })
})
