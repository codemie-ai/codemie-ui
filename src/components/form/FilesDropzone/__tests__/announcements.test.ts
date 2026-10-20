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

import { buildFileAnnouncements } from '../announcements'

describe('buildFileAnnouncements', () => {
  it('returns nothing when the file list is unchanged', () => {
    expect(buildFileAnnouncements(['a.txt'], ['a.txt'], 10)).toEqual([])
  })

  it('names the single added file and keeps the running total', () => {
    expect(buildFileAnnouncements([], ['report.pdf'], 10)).toEqual([
      'report.pdf added. 1 of 10 files selected',
    ])
  })

  it('aggregates several added files into one message', () => {
    expect(buildFileAnnouncements([], ['a.txt', 'b.txt'], 10)).toEqual([
      '2 files added: a.txt, b.txt. 2 of 10 files selected',
    ])
  })

  it('truncates long lists of added files', () => {
    expect(buildFileAnnouncements([], ['a.txt', 'b.txt', 'c.txt', 'd.txt', 'e.txt'], 10)).toEqual([
      '5 files added: a.txt, b.txt, c.txt and 2 more. 5 of 10 files selected',
    ])
  })

  it('names the removed file', () => {
    expect(buildFileAnnouncements(['a.txt', 'b.txt'], ['a.txt'], 10)).toEqual([
      'b.txt removed. 1 of 10 files selected',
    ])
  })

  it('reports an empty selection when the last file is removed', () => {
    expect(buildFileAnnouncements(['a.txt'], [], 10)).toEqual(['a.txt removed. No files selected'])
  })

  it('announces a replacement that keeps the count unchanged', () => {
    expect(buildFileAnnouncements(['a.txt'], ['b.txt'], 10)).toEqual([
      'b.txt added. 1 of 10 files selected',
      'a.txt removed. 1 of 10 files selected',
    ])
  })

  it('treats repeated names as distinct entries', () => {
    expect(buildFileAnnouncements(['a.txt'], ['a.txt', 'a.txt'], 10)).toEqual([
      'a.txt added. 2 of 10 files selected',
    ])
  })
})
