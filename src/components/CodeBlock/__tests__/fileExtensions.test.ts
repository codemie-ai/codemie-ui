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

import { describe, it, expect } from 'vitest'

import { getFileExtension } from '../fileExtensions'

describe('getFileExtension', () => {
  // EPMCDME-14735: data-format blocks were absent from the map and silently
  // fell back to 'txt', so a csv block downloaded as code.txt.
  it.each([
    ['csv', 'csv'],
    ['xlsx', 'xlsx'],
    ['pdf', 'pdf'],
    ['zip', 'zip'],
    ['md', 'md'],
  ])('maps data format %s to .%s', (language, expected) => {
    expect(getFileExtension(language as never)).toBe(expected)
  })

  it('keeps json mapped to .json', () => {
    expect(getFileExtension('json')).toBe('json')
  })

  it('is case insensitive', () => {
    expect(getFileExtension('CSV' as never)).toBe('csv')
  })

  it('falls back to txt for an unknown language', () => {
    expect(getFileExtension('not-a-language' as never)).toBe('txt')
  })
})
