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

import { screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Import order matters: @/test-utils/integration must evaluate BEFORE @/store/analytics.
// Entering the module graph through @/store/analytics triggers the circular chain
// @/store/analytics → @/utils/api → @/store (barrel), which leaves the barrel's re-exported
// userStore undefined and crashes SessionExpiredPopup (useSnapshot(undefined)) on every render.
// eslint-disable-next-line import/order
import { renderPage } from '@/test-utils/integration'
import { analyticsStore } from '@/store/analytics'
import { appInfoStore } from '@/store/appInfo'
import { requestRegistry } from '@/test-utils/_mock-state'
import type { TabularResponse } from '@/types/analytics'

// Analytics routes are always registered in the router but guarded at render time by
// FeatureGuard, which reads appInfoStore.configs. This mock suppresses isEnterpriseEdition()
// calls inside analytics utilities that use the non-reactive path (e.g. chart rendering).
vi.mock('@/utils/enterpriseEdition', () => ({
  isEnterpriseEdition: () => true,
}))

const makeJsonResponse = (data: unknown): Response =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })

const adminUser = {
  user_id: 'admin-1',
  id: 'admin-1',
  email: 'admin@test.com',
  name: 'Admin User',
  username: 'admin',
  is_admin: true,
  is_maintainer: false,
  user_type: 'INTERNAL',
  applications: [],
  projects: [],
}

const page0TabularResponse = {
  data: {
    columns: [{ id: 'user_email', label: 'User Email', type: 'string' }],
    rows: [{ user_email: 'alpha@test.com' }],
    totals: null,
  },
  pagination: { page: 0, per_page: 20, total_count: 50, has_more: true },
  metadata: { timestamp: '2024-01-01T00:00:00Z', data_as_of: '2024-01-01T00:00:00Z' },
}

const page1TabularResponse = {
  data: {
    columns: [{ id: 'user_email', label: 'User Email', type: 'string' }],
    rows: [{ user_email: 'beta@test.com' }],
    totals: null,
  },
  pagination: { page: 1, per_page: 20, total_count: 50, has_more: true },
  metadata: { timestamp: '2024-01-01T00:00:00Z', data_as_of: '2024-01-01T00:00:00Z' },
}

describe('UserEngagementDrillDownModal — pagination', () => {
  beforeEach(() => {
    requestRegistry.set('GET:v1/user', {
      factory: () => makeJsonResponse(adminUser),
    })
    requestRegistry.set('GET:v1/analytics/users', {
      factory: () => makeJsonResponse({ data: { users: [] } }),
    })
    // FeatureGuard reads appInfoStore.configs to gate the analytics route. Enable enterprise
    // edition so FeatureGuard renders <AnalyticsPage /> instead of throwing a 404.
    // isConfigFetched = true also prevents fetchCustomerConfig() from fetching GET:v1/config
    // and overwriting configs with [] after the initial render.
    appInfoStore.configs = [
      { id: 'features:enterpriseEdition', settings: { enabled: true } },
    ] as typeof appInfoStore.configs
    appInfoStore.isConfigFetched = true
    analyticsStore.userEngagementDrillDown.isOpen = true
    analyticsStore.userEngagementDrillDown.project = 'test-project'
    analyticsStore.userEngagementDrillDown.data = page0TabularResponse as unknown as TabularResponse
  })

  afterEach(() => {
    analyticsStore.clearState()
  })

  it('renders first-page items and shows a Next-page button', async () => {
    renderPage('/analytics?tab=adoption')

    await screen.findByText('alpha@test.com')
    expect(await screen.findByRole('button', { name: 'Next page' })).toBeInTheDocument()
  })

  it('has no Previous-page button on the first page', async () => {
    renderPage('/analytics?tab=adoption')

    await screen.findByText('alpha@test.com')
    // Anchor on the settled pagination before the negative assertion (see last-page test).
    await screen.findByRole('button', { name: 'Next page' })
    expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument()
  })

  it('loads the next page when the Next-page button is clicked', async () => {
    renderPage('/analytics?tab=adoption')
    await screen.findByText('alpha@test.com')

    // Replace the registry entry with a factory that inspects the request body.
    // If the frontend sends the wrong page number the factory returns null and
    // the test times out, confirming the correct page is requested.
    requestRegistry.set('POST:v1/analytics/ai-adoption-user-engagement/users', {
      factory: (body?: unknown) => {
        const data = (body as { page?: number })?.page === 1 ? page1TabularResponse : null
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      },
    })

    const nextBtn = await screen.findByRole('button', { name: 'Next page' })
    fireEvent.click(nextBtn)
    await screen.findByText('beta@test.com')
  })

  it('shows no pagination when all items fit on one page', async () => {
    analyticsStore.userEngagementDrillDown.data = {
      ...page0TabularResponse,
      pagination: { page: 0, per_page: 20, total_count: 10, has_more: false },
    } as unknown as TabularResponse
    renderPage('/analytics?tab=adoption')
    await screen.findByText('alpha@test.com')
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument()
  })

  it('has no Next-page button on the last page', async () => {
    // Pagination reads currentPage from the store's request-state `page`, not from
    // data.pagination — both must be set to model "user is on the last page".
    analyticsStore.userEngagementDrillDown.page = 2
    analyticsStore.userEngagementDrillDown.data = {
      ...page0TabularResponse,
      pagination: { page: 2, per_page: 20, total_count: 50, has_more: false },
    } as unknown as TabularResponse
    renderPage('/analytics?tab=adoption')
    await screen.findByText('alpha@test.com')
    // The initial v1/user fetch resolving briefly remounts page content, so wait for the
    // settled pagination (Previous present) before asserting the Next button is absent —
    // a sync queryByRole right after findByText can pass vacuously mid-remount.
    expect(await screen.findByRole('button', { name: 'Previous page' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument()
  })
})
