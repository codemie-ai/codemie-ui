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

import { getHeadroomSuggestions } from '../headroomCompleter'

const captions = (lines: string[], row: number) =>
  getHeadroomSuggestions(lines, row).map((s) => s.caption)

describe('getHeadroomSuggestions', () => {
  it('offers headroom at top level', () => {
    expect(captions(['name: x', 'hea'], 1)).toEqual(['headroom'])
  })

  it('offers headroom inside an assistants entry', () => {
    expect(captions(['assistants:', '  - id: a', '    hea'], 2)).toEqual(['headroom'])
  })

  it('offers the four keys inside the block', () => {
    expect(captions(['headroom:', '  '], 1)).toEqual([
      'enabled',
      'compress_user_messages',
      'compress_tool_outputs',
      'strategy',
    ])
  })

  it('offers strategy values and booleans', () => {
    expect(captions(['headroom:', '  strategy: '], 1)).toEqual([
      'lossless',
      'balanced',
      'aggressive',
    ])
    expect(captions(['headroom:', '  enabled: t'], 1)).toEqual(['true', 'false'])
  })

  it('offers nothing elsewhere', () => {
    expect(captions(['states:', '  - id: a', '    nex'], 2)).toEqual([])
  })
})
