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

import { declaration, readThemeCss, ruleBody } from './themeCssRules'

describe('theme.css choice picker layout', () => {
  let css: string

  beforeAll(() => {
    css = readThemeCss()
  })

  it('lays the picker root out as a column, filter box or not', () => {
    const body = ruleBody(css, 'div:has(> strong):has(> div)')

    expect(body).not.toBeNull()
    expect(declaration(body as string, 'flex-direction')).toBe('column')
    expect(declaration(body as string, 'gap')).not.toBeNull()
  })

  it('anchors the options to the picker root rather than to a sibling combinator', () => {
    // `strong + div` breaks when a filter box sits between label and options; `strong ~ div`
    // over-matches every later div sibling of any bold run.
    expect(css).not.toContain('.a2ui-scope strong + div')
    expect(css).not.toContain('.a2ui-scope strong ~ div')
    expect(css).toContain('.a2ui-scope div:has(> strong):has(> div) > div')
  })

  it('makes the chip row a flex container in its own right', () => {
    const body = ruleBody(css, 'div:has(> .chip)')

    expect(body).not.toBeNull()
    expect(declaration(body as string, 'display')).toBe('flex')
  })

  it('lets the root gap own the label spacing, clearing the margin exactly', () => {
    const body = ruleBody(css, 'div:has(> strong):has(> div) > strong')

    expect(body).not.toBeNull()
    // `0.25rem` would satisfy a looser check and restores the doubled first step.
    expect(declaration(body as string, 'margin-bottom')).toBe('0')
  })

  it('lets the option column shrink so a long option cannot widen the chat', () => {
    const body = ruleBody(css, 'div:has(> strong):has(> div) > div')

    expect(body).not.toBeNull()
    expect(declaration(body as string, 'min-width')).toBe('0')
  })
})
