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

/**
 * Unit tests for the column-sort helpers exported from MarketplaceCleanupPage
 * (EPMCDME-15333). `computeNextSort` was removed when the sort cycle moved
 * into useTableFilters — see src/hooks/__tests__/useTableFilters.test.ts for
 * the equivalent cycle coverage.
 */

import { describe, expect, it } from 'vitest'

import { COL_TO_BACKEND, computeOrderBy } from '../MarketplaceCleanupPage'

describe('computeOrderBy', () => {
  it('maps assistant key to name_desc when sort order is desc', () => {
    expect(computeOrderBy({ sortKey: 'assistant', sortOrder: 'desc' })).toBe('name_desc')
  })

  it('maps assistant key to name_asc when sort order is asc', () => {
    expect(computeOrderBy({ sortKey: 'assistant', sortOrder: 'asc' })).toBe('name_asc')
  })

  it('maps users key directly to users_asc / users_desc', () => {
    expect(computeOrderBy({ sortKey: 'users', sortOrder: 'desc' })).toBe('users_desc')
    expect(computeOrderBy({ sortKey: 'users', sortOrder: 'asc' })).toBe('users_asc')
  })

  it('maps likes key directly to likes_asc / likes_desc', () => {
    expect(computeOrderBy({ sortKey: 'likes', sortOrder: 'desc' })).toBe('likes_desc')
    expect(computeOrderBy({ sortKey: 'likes', sortOrder: 'asc' })).toBe('likes_asc')
  })

  it('returns undefined when sort is empty', () => {
    expect(computeOrderBy({})).toBeUndefined()
  })
})

describe('COL_TO_BACKEND mapping', () => {
  it('maps the three sortable columns to their backend field names', () => {
    expect(COL_TO_BACKEND.users).toBe('users')
    expect(COL_TO_BACKEND.likes).toBe('likes')
    expect(COL_TO_BACKEND.assistant).toBe('name')
  })
})
