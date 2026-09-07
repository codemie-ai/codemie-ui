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

import { getFullIndexType, getIndexTypeCode, isXWikiIndex } from '@/utils/indexing'

describe('isXWikiIndex', () => {
  it('matches the xwiki knowledge base index type', () => {
    expect(isXWikiIndex({ index_type: 'knowledge_base_xwiki' })).toBe(true)
  })

  it('does not match other knowledge base types', () => {
    expect(isXWikiIndex({ index_type: 'knowledge_base_confluence' })).toBe(false)
    expect(isXWikiIndex({ index_type: 'knowledge_base_azure_devops_wiki' })).toBe(false)
  })
})

describe('xwiki index type code round trip', () => {
  it('maps xwiki to knowledge_base_xwiki and back', () => {
    expect(getFullIndexType('xwiki')).toBe('knowledge_base_xwiki')
    expect(getIndexTypeCode('knowledge_base_xwiki')).toBe('xwiki')
  })
})
