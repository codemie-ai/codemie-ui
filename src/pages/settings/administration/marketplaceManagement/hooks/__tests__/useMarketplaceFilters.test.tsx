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

import { renderHook, act, waitFor } from '@testing-library/react'
import { FC, ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, it, expect, beforeEach } from 'vitest'

import { marketplaceManagementStore } from '@/store/marketplaceManagement'

import { useMarketplaceFilters, ALL_BUCKETS } from '../useMarketplaceFilters'

const wrapperFor = (initialUrl: string): FC<{ children: ReactNode }> =>
  function Wrapper({ children }) {
    return <MemoryRouter initialEntries={[initialUrl]}>{children}</MemoryRouter>
  }

const renderAt = (url: string) =>
  renderHook(() => useMarketplaceFilters(), { wrapper: wrapperFor(url) })

/** Put the store into a dirty state, as a previous visit would leave it. */
const dirtyTheStore = (): void => {
  const { cleanup } = marketplaceManagementStore
  cleanup.bucket = 'VERIFIED'
  // A real CleanupReason: hydration screens this param now, so an invented
  // code would be dropped and the test would stop proving what it claims.
  cleanup.reason = 'duplicate'
  cleanup.tier = 'HOT'
  cleanup.mcp = 'github'
  cleanup.category = 'devops'
  cleanup.query = 'leftover'
  cleanup.rule = 'description_length'
  cleanup.page = 4
}

describe('useMarketplaceFilters', () => {
  beforeEach(() => {
    marketplaceManagementStore.resetCleanupFilters()
  })

  it('applies filters present in the URL', async () => {
    renderAt(
      '/cleanup?bucket=VERIFIED&reason=duplicate&tier=HOT&mcp=github&category=devops&q=abc&page=2'
    )

    await waitFor(() => {
      const { cleanup } = marketplaceManagementStore
      expect(cleanup.bucket).toBe('VERIFIED')
      expect(cleanup.reason).toBe('duplicate')
      expect(cleanup.tier).toBe('HOT')
      expect(cleanup.mcp).toBe('github')
      expect(cleanup.category).toBe('devops')
      expect(cleanup.query).toBe('abc')
      expect(cleanup.page).toBe(2)
    })
  })

  // The regression this hook was rebuilt for: hydration used to be
  // `if (param) set(param)` with no else, so filters left in the module-level
  // store by a previous visit survived a navigation to a URL that omitted them
  // and silently narrowed the table.
  it('clears store filters that the URL omits', async () => {
    dirtyTheStore()

    renderAt('/cleanup?bucket=COMMUNITY')

    await waitFor(() => {
      const { cleanup } = marketplaceManagementStore
      expect(cleanup.bucket).toBe('COMMUNITY')
      expect(cleanup.reason).toBeNull()
      expect(cleanup.tier).toBeNull()
      expect(cleanup.mcp).toBeNull()
      expect(cleanup.category).toBeNull()
      expect(cleanup.rule).toBeNull()
      expect(cleanup.query).toBe('')
      expect(cleanup.page).toBe(1)
    })
  })

  it('falls back to the ALL bucket when the URL has no bucket param', async () => {
    dirtyTheStore()

    renderAt('/cleanup')

    await waitFor(() => {
      expect(marketplaceManagementStore.cleanup.bucket).toBe(ALL_BUCKETS)
    })
  })

  it('treats an explicitly empty bucket as "all buckets", normalised to ALL', async () => {
    renderAt('/cleanup?bucket=')

    await waitFor(() => {
      expect(marketplaceManagementStore.cleanup.bucket).toBe(ALL_BUCKETS)
    })
  })

  it('ignores an unrecognised bucket value instead of forwarding it to the API', async () => {
    renderAt('/cleanup?bucket=NOT_A_BUCKET')

    await waitFor(() => {
      expect(marketplaceManagementStore.cleanup.bucket).toBe(ALL_BUCKETS)
    })
  })

  it('ignores a non-numeric or out-of-range page', async () => {
    renderAt('/cleanup?page=abc')
    await waitFor(() => expect(marketplaceManagementStore.cleanup.page).toBe(1))

    marketplaceManagementStore.resetCleanupFilters()
    renderAt('/cleanup?page=-3')
    await waitFor(() => expect(marketplaceManagementStore.cleanup.page).toBe(1))
  })

  it('reacts to a later URL change, not only to the first render', async () => {
    const { rerender } = renderHook(() => useMarketplaceFilters(), {
      wrapper: wrapperFor('/cleanup?bucket=VERIFIED&tier=HOT'),
    })

    await waitFor(() => {
      expect(marketplaceManagementStore.cleanup.tier).toBe('HOT')
    })

    // A store write is what the filter bar does; the hook must not revert it.
    act(() => {
      marketplaceManagementStore.cleanup.tier = 'COLD'
    })
    rerender()

    expect(marketplaceManagementStore.cleanup.tier).toBe('COLD')
  })

  it('carries the failed-check filter from an Overview drill-down link', async () => {
    renderAt('/cleanup?bucket=&rule=description_length')

    await waitFor(() => {
      expect(marketplaceManagementStore.cleanup.rule).toBe('description_length')
      // A failed check is not confined to the DELETE bucket, so the link must
      // widen the bucket or most matches would be hidden.
      expect(marketplaceManagementStore.cleanup.bucket).toBe(ALL_BUCKETS)
    })
  })
})

/**
 * Phase 4.2 changed `GET /cleanup` from "unknown filter value -> 200 with
 * total 0" to "unknown filter value -> 422". Measured against the live
 * backend:
 *
 *   reason=OBSOLETE      -> 422 query.reason: Input should be 'duplicate',
 *                           'purpose_duplicate', 'semantic_clone', 'invalid'
 *                           or 'dead'
 *   tier=COOL            -> 422 query.tier: Input should be 'HOT', 'WARM',
 *                           'COLD' or 'DEAD'
 *   rule=made_up_rule    -> 422 query.rule: Input should be 'name_length', …
 *
 * The URL is a shareable, bookmarkable surface, and the nine invented
 * SCREAMING_SNAKE reason codes behind F-68 were linked from the old Overview.
 * `bucket` has been screened since it was written; `reason`, `tier` and
 * `rule` were forwarded verbatim, which now turns a stale bookmark into a
 * red error banner instead of an unfiltered table.
 */
describe('useMarketplaceFilters screens URL values the API would reject with 422', () => {
  beforeEach(() => {
    marketplaceManagementStore.resetCleanupFilters()
  })

  it('drops a reason outside the CleanupReason enum', async () => {
    renderAt('/cleanup?bucket=&reason=OBSOLETE')

    await waitFor(() => {
      expect(marketplaceManagementStore.cleanup.reason).toBeNull()
    })
  })

  it('keeps a reason the API accepts', async () => {
    renderAt('/cleanup?bucket=&reason=invalid')

    await waitFor(() => {
      expect(marketplaceManagementStore.cleanup.reason).toBe('invalid')
    })
  })

  it('drops a tier outside the UsageTier enum', async () => {
    renderAt('/cleanup?tier=COOL')

    await waitFor(() => {
      expect(marketplaceManagementStore.cleanup.tier).toBeNull()
    })
  })

  it('drops a rule outside the GateRule enum', async () => {
    renderAt('/cleanup?bucket=&rule=made_up_rule')

    await waitFor(() => {
      expect(marketplaceManagementStore.cleanup.rule).toBeNull()
    })
  })
})

describe('bucket=ALL — saying "all buckets" out loud', () => {
  /**
   * "All buckets" used to be encoded as an empty value, which is
   * indistinguishable from an unset parameter: `/cleanup?bucket=` reads as a
   * serialization slip, and during manual testing it was taken for one — while
   * sitting beside a parameter that genuinely was being dropped.
   *
   * The empty form is still hydrated, because every filter link and bookmark
   * already in the wild sends it.
   */
  it('writes ALL rather than an empty value', () => {
    renderAt('?bucket=')

    expect(marketplaceManagementStore.cleanup.bucket).toBe(ALL_BUCKETS)
  })

  it('hydrates the legacy empty form to the same state', () => {
    renderAt('?bucket=')
    const fromEmpty = marketplaceManagementStore.cleanup.bucket

    renderAt('?bucket=ALL')

    expect(marketplaceManagementStore.cleanup.bucket).toBe(fromEmpty)
  })

  it('still treats an absent bucket as the ALL default', () => {
    renderAt('?reason=invalid')

    expect(marketplaceManagementStore.cleanup.bucket).toBe(ALL_BUCKETS)
  })

  it('still falls back to the default for an unknown bucket', () => {
    renderAt('?bucket=BOGUS')

    expect(marketplaceManagementStore.cleanup.bucket).toBe(ALL_BUCKETS)
  })
})
