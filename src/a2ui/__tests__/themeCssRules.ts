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

/**
 * Helpers for asserting against theme.css.
 *
 * jsdom computes no layout and resolves no cascade, so these suites read the stylesheet as
 * text. That only means anything if an assertion is confined to ONE rule: a regex spanning
 * the whole file passes when two strings merely sit near each other, which would stay green
 * against the very regressions these suites exist to catch.
 */

const THEME_CSS_PATH = resolve(__dirname, '../theme.css')

export const readThemeCss = (): string => readFileSync(THEME_CSS_PATH, 'utf-8')

/** Strips comments so a declaration quoted in prose is never mistaken for a live one. */
const stripComments = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * Returns the declaration body of the first rule whose selector contains `selectorFragment`,
 * or `null` when no rule matches. Nested at-rules are not used in this stylesheet, so a
 * flat brace scan is sufficient — and if one is ever introduced, `atRulesWrapping` below is
 * what catches it.
 */
export const ruleBody = (css: string, selectorFragment: string): string | null => {
  const source = stripComments(css)
  let cursor = 0

  while (cursor < source.length) {
    const open = source.indexOf('{', cursor)
    if (open === -1) return null

    const close = source.indexOf('}', open)
    if (close === -1) return null

    const selector = source.slice(cursor, open).trim()
    if (selector.includes(selectorFragment)) return source.slice(open + 1, close)

    cursor = close + 1
  }

  return null
}

/**
 * Like `ruleBody`, but matches the selector exactly (after whitespace normalisation), so a
 * shared rule listing several selectors is never mistaken for the single-selector one.
 */
export const ruleBodyExact = (css: string, selector: string): string | null => {
  const source = stripComments(css)
  const wanted = selector.replace(/\s+/g, ' ').trim()
  let cursor = 0

  while (cursor < source.length) {
    const open = source.indexOf('{', cursor)
    if (open === -1) return null

    const close = source.indexOf('}', open)
    if (close === -1) return null

    if (source.slice(cursor, open).replace(/\s+/g, ' ').trim() === wanted) {
      return source.slice(open + 1, close)
    }

    cursor = close + 1
  }

  return null
}

/**
 * Every at-rule the stylesheet is wrapped in — a rule inside one may never apply.
 *
 * Split rather than matched: `@[a-z-]+[^{]*` overlaps its own two character classes, so the
 * engine can backtrack over where one ends and the next begins, which is super-linear on a
 * long run of letters with no brace. Splitting on the brace is linear and needs no regex.
 */
export const atRulesWrapping = (css: string): string[] =>
  stripComments(css)
    .split('{')
    .slice(0, -1)
    .map((prelude) => prelude.slice(prelude.lastIndexOf('}') + 1).trim())
    .filter((prelude) => prelude.startsWith('@'))

/**
 * The value of one declaration in a rule body, or `null` when the rule does not set it.
 *
 * Split rather than matched: a regex built from the property name would be assembled from a
 * variable, and the whole point of these helpers is to compare an exact value — `0` must not
 * be satisfied by `0.5rem` — which a prefix match would quietly allow.
 */
export const declaration = (body: string, property: string): string | null => {
  for (const chunk of body.split(';')) {
    const separator = chunk.indexOf(':')
    if (separator === -1) continue
    if (chunk.slice(0, separator).trim() !== property) continue

    return chunk.slice(separator + 1).trim()
  }

  return null
}
