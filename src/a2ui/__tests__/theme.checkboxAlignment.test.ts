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

/** Counts (id, class-ish, element) the way CSS does, for the selectors used here. */
const specificity = (selector: string): [number, number, number] => {
  const withoutNot = selector.replace(/:not\(([^)]*)\)/g, ' $1 ')
  const ids = (withoutNot.match(/#[\w-]+/g) ?? []).length
  const classes = (withoutNot.match(/\.[\w-]+|\[[^\]]+\]|:[\w-]+(?!\()/g) ?? []).length
  const elements = (withoutNot.match(/(^|[\s+>~])[a-z]+/g) ?? []).length
  return [ids, classes, elements]
}

const compare = (a: [number, number, number], b: [number, number, number]) =>
  a[0] - b[0] || a[1] - b[1] || a[2] - b[2]

describe('theme.css checkbox label alignment', () => {
  let css: string

  beforeAll(() => {
    css = readThemeCss()
  })

  it('the checkbox label rule out-specifies the generic field label rule', () => {
    const generic = css.match(/\.a2ui-scope label\[for\][^{]*/)?.[0].trim() ?? ''
    const checkbox = css.match(/\.a2ui-scope input \+ label\[for\][^{]*/)?.[0].trim() ?? ''

    expect(generic).not.toBe('')
    expect(checkbox).not.toBe('')
    expect(compare(specificity(checkbox), specificity(generic))).toBeGreaterThan(0)
  })

  it('the checkbox label clears the block label bottom margin exactly, not merely shrinks it', () => {
    const body = ruleBody(css, 'input + label[for]')

    expect(body).not.toBeNull()
    // `0.5rem` would satisfy a looser check and is precisely the regression this guards.
    expect(declaration(body as string, 'margin-bottom')).toBe('0')
  })
})
