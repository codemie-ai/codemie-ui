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

import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ASSISTANT_INDEX_SCOPES } from '@/constants/assistants'
import { userStore } from '@/store/user'
import * as filtersModule from '@/utils/filters'

import { useAssistantFilters } from '../useAssistantFilters'

vi.mock('@/utils/filters', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/filters')>()
  return {
    ...actual,
    getFilters: vi.fn(),
    setFilters: vi.fn(),
    updateUrlWithFilters: vi.fn(),
  }
})

describe('useAssistantFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    userStore.user = {
      userId: 'test-user-id',
      name: 'Test User',
      username: 'testuser',
    } as any
    vi.mocked(filtersModule.getFilters).mockReturnValue({})
  })

  it('strips persisted sort_by for non-marketplace scopes', () => {
    vi.mocked(filtersModule.getFilters).mockReturnValue({
      sort_by: 'usage',
      sort_order: 'asc',
    } as any)

    const { result } = renderHook(() =>
      useAssistantFilters({ scope: ASSISTANT_INDEX_SCOPES.VISIBLE_TO_USER })
    )

    expect(result.current.filters.sort_by).toBeNull()
  })

  it('preserves sort_by for marketplace scope', () => {
    vi.mocked(filtersModule.getFilters).mockReturnValue({
      sort_by: 'usage',
      sort_order: 'asc',
    } as any)

    const { result } = renderHook(() =>
      useAssistantFilters({ scope: ASSISTANT_INDEX_SCOPES.MARKETPLACE })
    )

    expect(result.current.filters.sort_by).toBe('usage')
    expect(result.current.filters.sort_order).toBe('asc')
  })
})
