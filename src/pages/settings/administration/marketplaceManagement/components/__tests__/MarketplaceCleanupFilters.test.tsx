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

import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { marketplaceManagementStore } from '@/store/marketplaceManagement'
import api from '@/utils/api'

import MarketplaceCleanupPage from '../../../MarketplaceCleanupPage'
import MarketplaceCleanupFilters, { type CleanupFilterState } from '../MarketplaceCleanupFilters'

vi.mock('valtio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('valtio')>()
  return { ...actual, useSnapshot: (store: unknown) => store }
})

vi.mock('@/utils/api', () => ({
  default: {
    // /facets and /cleanup have different shapes; the component reads
    // `facets.mcps` unguarded, so a one-size-fits-all stub crashes the page.
    get: vi.fn((url: string) =>
      Promise.resolve({
        json: async () =>
          String(url).includes('/facets')
            ? { mcps: [], categories: [] }
            : { total: 0, items: [], page: 1, page_size: 20 },
      })
    ),
    post: vi.fn().mockResolvedValue({ json: async () => ({}) }),
  },
}))

const BASE_FILTERS: CleanupFilterState = {
  query: '',
  bucket: 'DELETE',
  reason: null,
  tier: null,
  verdict: null,
  mcp: null,
  category: null,
}

describe('MarketplaceCleanupFilters — Sort control removed (EPMCDME-15333)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    marketplaceManagementStore.resetCleanupFilters()
    marketplaceManagementStore.cleanup.items = []
    marketplaceManagementStore.facets = null
    marketplaceManagementStore.overview = null
  })

  it('does NOT render a Sort dropdown in the filter bar', () => {
    render(
      <MarketplaceCleanupFilters
        filters={BASE_FILTERS}
        facets={null}
        onApply={vi.fn()}
        onClear={vi.fn()}
      />
    )

    expect(screen.queryByTestId('clnSort-select')).toBeNull()
  })

  it('sends order_by from the URL through to the cleanup request', async () => {
    render(
      <MemoryRouter initialEntries={['/?bucket=&order_by=likes_desc']}>
        <MarketplaceCleanupPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      const urls = vi.mocked(api.get).mock.calls.map((c) => String(c[0]))
      expect(urls.some((u) => u.includes('/cleanup?') && u.includes('order_by=likes_desc'))).toBe(
        true
      )
    })
  })
})
