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

import type { Setting } from '@/types/entity/setting'

import { isAutoLookupEnabled } from '../toolkit'

const pinned = { id: 'int-1', alias: 'My Jira' } as Setting

describe('isAutoLookupEnabled', () => {
  it('reports pinned slots as not automatic, whatever the stored flag says', () => {
    // Legacy assistants come back from the API with the flag defaulted to true, and workflow tool
    // configuration has nowhere to store it at all. The pinned integration is the reliable signal.
    expect(isAutoLookupEnabled({ settings: pinned, auto_credentials_lookup: true })).toBe(false)
    expect(isAutoLookupEnabled({ settings: pinned })).toBe(false)
    expect(isAutoLookupEnabled({ settings: pinned, auto_credentials_lookup: false })).toBe(false)
  })

  it('lets the stored flag decide when nothing is pinned', () => {
    expect(isAutoLookupEnabled({ auto_credentials_lookup: false })).toBe(false)
    expect(isAutoLookupEnabled({ auto_credentials_lookup: true })).toBe(true)
  })

  it('treats an absent flag on an unpinned slot as automatic', () => {
    expect(isAutoLookupEnabled({})).toBe(true)
    expect(isAutoLookupEnabled(undefined)).toBe(true)
    expect(isAutoLookupEnabled(null)).toBe(true)
  })
})
