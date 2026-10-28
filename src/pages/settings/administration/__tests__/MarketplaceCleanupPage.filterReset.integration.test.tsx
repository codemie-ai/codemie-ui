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

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { marketplaceManagementStore } from '@/store/marketplaceManagement'
import { cleanupDeleteFixture } from '@/test-utils/fixtures/marketplace'
import { mockAPI } from '@/test-utils/integration'

import MarketplaceCleanupPage from '../MarketplaceCleanupPage'

// Integration test on purpose (real Valtio reactivity, only the API mocked
// — see setupTests.unit.ts vs setupTests.integration.ts): the bug needs the
// real store->render->URL-effect chain and react-router's `startTransition`
// lag, neither of which the unit-test valtio mock exposes.

// Replace PrimeReact's Dropdown with a plain <select>.
vi.mock('@/components/form/Select/Select', () => ({
  default: ({
    options,
    value,
    onChange,
    ...rest
  }: {
    options: Array<{ label: string; value: string }>
    value: string
    onChange?: (e: { value: string }) => void
    [key: string]: unknown
  }) => (
    <select
      data-testid={rest['data-testid'] as string}
      value={value}
      onChange={(e) => onChange?.({ value: e.target.value })}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}))

const MM_CLEANUP_URL = 'v1/marketplace-management/entities/assistants/cleanup'
const MM_FACETS_URL = 'v1/marketplace-management/entities/assistants/facets'
const MM_CONFIG_URL = 'v1/marketplace-management/entities/assistants/config'

const LocationProbe = () => {
  const location = useLocation()
  return <div data-testid="location-probe">{location.search}</div>
}

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <LocationProbe />
      <MarketplaceCleanupPage />
    </MemoryRouter>
  )

describe('MarketplaceCleanupPage — filters survive the assistant-details drawer', () => {
  beforeEach(() => {
    marketplaceManagementStore.resetCleanupFilters()
    marketplaceManagementStore.cleanup.loadError = null
    marketplaceManagementStore.isLoadingCleanup = false
    marketplaceManagementStore.facets = null

    mockAPI('GET', MM_CLEANUP_URL, cleanupDeleteFixture)
    mockAPI('GET', MM_FACETS_URL, {
      mcps: [],
      categories: [],
      reasons: [],
      tiers: [],
      buckets: [],
      rules: [],
    })
    mockAPI('GET', MM_CONFIG_URL, {})
  })

  it('keeps an applied filter after opening and closing the drawer, with no delay between the clicks', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getAllByTestId('cleanup-assistant-name').length).toBeGreaterThan(0)
    })

    // Dropdown applies to the store immediately, no debounce.
    fireEvent.change(screen.getByTestId('clnTier-select'), { target: { value: 'HOT' } })
    expect(marketplaceManagementStore.cleanup.tier).toBe('HOT')

    // The store drops the previous rows as soon as the filter changes, so wait for the
    // refetched rows — but not for the store->URL write to land.
    await waitFor(() => {
      expect(screen.getAllByTestId('cleanup-assistant-name').length).toBeGreaterThan(0)
    })

    // Open and close immediately — no wait for the store->URL write to land.
    fireEvent.click(screen.getAllByTestId('cleanup-assistant-name')[0])
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(marketplaceManagementStore.cleanup.tier).toBe('HOT')

    // Still true once the URL settles, not just optimistically.
    await waitFor(() => {
      expect(marketplaceManagementStore.cleanup.tier).toBe('HOT')
    })
  })

  it('keeps an applied filter after opening and closing the drawer once the URL has settled', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getAllByTestId('cleanup-assistant-name').length).toBeGreaterThan(0)
    })

    fireEvent.change(screen.getByTestId('clnTier-select'), { target: { value: 'HOT' } })
    expect(marketplaceManagementStore.cleanup.tier).toBe('HOT')

    // Realistic case: let the store->URL write land first.
    await waitFor(() => {
      expect(screen.getByTestId('location-probe').textContent).toContain('tier=HOT')
    })

    fireEvent.click(screen.getAllByTestId('cleanup-assistant-name')[0])
    await screen.findByRole('button', { name: 'Close' })
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(marketplaceManagementStore.cleanup.tier).toBe('HOT')
  })

  // mockAPI keys by method+url only, so page-1/page-2 can't coexist —
  // re-register right before triggering page 2.
  const page2Fixture = {
    ...cleanupDeleteFixture,
    total: 25,
    page: 2,
    items: cleanupDeleteFixture.items.map((item, i) => ({ ...item, id: `page2-${i}-${item.id}` })),
  }

  it('keeps the current page after opening the assistant details drawer', async () => {
    mockAPI('GET', MM_CLEANUP_URL, { ...cleanupDeleteFixture, total: 25, page: 1 })
    renderPage()
    await waitFor(() => {
      expect(screen.getAllByTestId('cleanup-assistant-name').length).toBeGreaterThan(0)
    })

    mockAPI('GET', MM_CLEANUP_URL, page2Fixture)
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(marketplaceManagementStore.cleanup.page).toBe(2)

    // Realistic case: let the page-2 fetch and URL write land first.
    await waitFor(() => {
      expect(screen.getByTestId('location-probe').textContent).toContain('page=2')
    })

    fireEvent.click(screen.getAllByTestId('cleanup-assistant-name')[0])
    await screen.findByRole('button', { name: 'Close' })

    expect(screen.getByTestId('location-probe').textContent).toContain('page=2')
    expect(marketplaceManagementStore.cleanup.page).toBe(2)
  })

  it('keeps the current page after opening the drawer with no delay between the clicks', async () => {
    mockAPI('GET', MM_CLEANUP_URL, { ...cleanupDeleteFixture, total: 25, page: 1 })
    renderPage()
    await waitFor(() => {
      expect(screen.getAllByTestId('cleanup-assistant-name').length).toBeGreaterThan(0)
    })

    mockAPI('GET', MM_CLEANUP_URL, page2Fixture)
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(marketplaceManagementStore.cleanup.page).toBe(2)

    // Table clears while the fetch is in flight, so page-2 rows are the
    // earliest a click lands — no further wait for the URL write.
    await screen.findAllByTestId('cleanup-assistant-name')
    fireEvent.click(screen.getAllByTestId('cleanup-assistant-name')[0])
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(marketplaceManagementStore.cleanup.page).toBe(2)
    await waitFor(() => {
      expect(screen.getByTestId('location-probe').textContent).toContain('page=2')
    })
  })
})
