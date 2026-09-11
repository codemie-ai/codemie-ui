// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an “AS IS” BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { describe, expect, it } from 'vitest'

import { INDEX_TYPES } from '@/constants/dataSources'
import { ContextType } from '@/types/entity/assistant'
import {
  getContextTypeLabel,
  getFullIndexType,
  getIndexTypeCode,
  getIndexTypeDisplay,
  isCodeIndex,
  isGitFaqIndex,
  isGitIndex,
} from '@/utils/indexing'

describe('FAQ index type helpers', () => {
  it('maps the FE slug to the backend knowledge_base_git_faq type', () => {
    expect(getFullIndexType(INDEX_TYPES.GIT_FAQ)).toBe('knowledge_base_git_faq')
  })

  it('strips the llm_routing prefix back to the FE slug', () => {
    expect(getIndexTypeCode('knowledge_base_git_faq')).toBe(INDEX_TYPES.GIT_FAQ)
  })

  it('recognizes FAQ indexes via the llm_routing_faq substring', () => {
    expect(isGitFaqIndex({ index_type: 'knowledge_base_git_faq' })).toBe(true)
    expect(isGitFaqIndex({ index_type: 'llm_routing_google' })).toBe(false)
    expect(isGitFaqIndex({ index_type: 'knowledge_base_confluence' })).toBe(false)
  })

  it('buckets FAQ into the KNOWLEDGE_BASE context (retrieval is search_kb routing)', () => {
    expect(getContextTypeLabel('knowledge_base_git_faq')).toBe(ContextType.KNOWLEDGE_BASE)
    expect(getContextTypeLabel(INDEX_TYPES.GIT_FAQ)).toBe(ContextType.KNOWLEDGE_BASE)
  })

  it('does NOT classify FAQ as a git/code index (management goes through KB endpoints)', () => {
    expect(isGitIndex(INDEX_TYPES.GIT_FAQ)).toBe(false)
    expect(isCodeIndex(INDEX_TYPES.GIT_FAQ)).toBe(false)
  })

  it('displays FAQ as Git FAQ', () => {
    expect(getIndexTypeDisplay(INDEX_TYPES.GIT_FAQ)).toBe('Git FAQ')
    expect(getIndexTypeDisplay('knowledge_base_git_faq')).toBe('Git FAQ')
  })
})
