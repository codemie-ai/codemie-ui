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

import { describe, expect, it } from 'vitest'

import { buildA2uiDisplayText } from '@/a2ui/utils'

describe('buildA2uiDisplayText', () => {
  it('joins data model fields as "field: value" parts', () => {
    expect(buildA2uiDisplayText('submit', { name: 'Ada', team: 'Analytical Engines' })).toBe(
      'name: Ada · team: Analytical Engines'
    )
  })

  it('formats numbers, booleans and primitive arrays', () => {
    expect(buildA2uiDisplayText('submit', { count: 3, agreed: true, tags: ['a', 'b'] })).toBe(
      'count: 3 · agreed: true · tags: a, b'
    )
  })

  it('skips empty strings and nested objects', () => {
    expect(buildA2uiDisplayText('submit', { note: '', nested: { a: 1 }, name: 'Ada' })).toBe(
      'name: Ada'
    )
  })

  it('falls back to the humanized action name when the data model adds nothing', () => {
    expect(buildA2uiDisplayText('approve_request', {})).toBe('approve request')
    expect(buildA2uiDisplayText('approve-request', null)).toBe('approve request')
  })

  it('returns "Submitted" when there is neither data nor an action name', () => {
    expect(buildA2uiDisplayText('', {})).toBe('Submitted')
  })

  it('truncates overlong values', () => {
    const long = 'x'.repeat(200)
    const text = buildA2uiDisplayText('submit', { essay: long })
    expect(text.length).toBeLessThan(100)
    expect(text.endsWith('…')).toBe(true)
  })
})
