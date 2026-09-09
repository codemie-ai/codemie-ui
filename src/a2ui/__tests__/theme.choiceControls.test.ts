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

import { declaration, readThemeCss, ruleBody, ruleBodyExact } from './themeCssRules'

describe('theme.css choice controls', () => {
  let css: string

  beforeAll(() => {
    css = readThemeCss()
  })

  it('takes painting away from the native control', () => {
    const body = ruleBody(css, "input[type='radio']")

    expect(body).not.toBeNull()
    expect(declaration(body as string, 'appearance')).toBe('none')
  })

  it('declares the box itself, so a bare picker option does not collapse', () => {
    // The catalog CheckBox carries an inline width/height; a picker option does not, and
    // without an intrinsic native box it is 0x0 once appearance is cleared.
    const body = ruleBody(css, "input[type='radio']")

    expect(declaration(body as string, 'width')).toBe('var(--a2ui-checkbox-size)')
    expect(declaration(body as string, 'height')).toBe('var(--a2ui-checkbox-size)')
    expect(declaration(body as string, 'border')).toBe('var(--a2ui-checkbox-border)')
  })

  it('sizes the checkbox like the design system checkbox', () => {
    const body = ruleBody(css, '.a2ui-scope')

    expect(declaration(body as string, '--a2ui-checkbox-size')).toBe('1rem')
    expect(declaration(body as string, '--a2ui-checkbox-border-radius')).toBe('0.25rem')
  })

  it('gives the resting control a visible border through the catalog property', () => {
    const body = ruleBody(css, '.a2ui-scope')

    expect(declaration(body as string, '--a2ui-checkbox-border')).toContain(
      'colors-border-primary'
    )
  })

  it('renders the radio as a circle', () => {
    const body = ruleBodyExact(css, ".a2ui-scope input[type='radio']:not(.a2ui-own, .a2ui-own *)")

    expect(body).not.toBeNull()
    expect(declaration(body as string, 'border-radius')).toContain('50%')
  })

  it('fills a checked checkbox with the accent colour', () => {
    const body = ruleBody(css, "input[type='checkbox']:not(.a2ui-own, .a2ui-own *):checked")

    expect(body).not.toBeNull()
    expect(declaration(body as string, 'background')).toContain('colors-text-accent-status')
  })

  it('draws a check glyph on a checked checkbox', () => {
    const body = ruleBody(css, "input[type='checkbox']:not(.a2ui-own, .a2ui-own *):checked::after")

    expect(body).not.toBeNull()
    expect(declaration(body as string, 'content')).toBe("''")
  })

  it('draws a dot inside a checked radio', () => {
    const body = ruleBody(css, "input[type='radio']:not(.a2ui-own, .a2ui-own *):checked::after")

    expect(body).not.toBeNull()
    expect(declaration(body as string, 'border-radius')).toBe('50%')
  })

  it('moves the border to accent on hover', () => {
    const body = ruleBody(css, ':not(.a2ui-own, .a2ui-own *):hover')

    expect(body).not.toBeNull()
    expect(declaration(body as string, 'border-color')).toContain('colors-text-accent-status')
  })

  it('forces the focus ring past the catalog inline outline: none', () => {
    const body = ruleBody(css, "input[type='radio']:not(.a2ui-own, .a2ui-own *):focus-visible")

    expect(body).not.toBeNull()
    expect(declaration(body as string, 'outline')).toContain('!important')
  })

  it('leaves our own renderers alone, element included', () => {
    const selector = css.match(/\.a2ui-scope input\[type='radio'\][^{]*/)?.[0] ?? ''

    expect(selector).toContain('.a2ui-own, .a2ui-own *')
  })
})
