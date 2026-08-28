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

import { useUserManagementEnabled } from '@/hooks/useFeatureFlags'
import { appInfoStore } from '@/store/appInfo'
import { requestRegistry } from '@/test-utils/_mock-state'
import { mockAPI, renderPage } from '@/test-utils/integration'

// Allow MCPManagementPage to render: bypass the appInfoStore feature-flag check.
// Mock useUserManagementEnabled as a spy so per-suite setup can override the return value.
vi.mock('@/hooks/useFeatureFlags', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useFeatureFlags')>()
  return {
    ...actual,
    useMcpEnabled: (): [boolean, boolean] => [true, true],
    useUserManagementEnabled: vi.fn((): [boolean, boolean] => [false, true]),
  }
})

const makeJsonResponse = (data: unknown): Response =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })

const makeSinglePage = (response: unknown): unknown => {
  const r = response as Record<string, unknown>
  if (r.pagination && typeof r.pagination === 'object') {
    const pag = r.pagination as Record<string, unknown>
    return {
      ...r,
      pagination: {
        ...pag,
        total: 1,
        ...(pag.pages !== undefined ? { pages: 1 } : {}),
      },
    }
  }
  return { ...r, total: 1 }
}

const makeLastPage = (response: unknown): unknown => {
  const r = response as Record<string, unknown>
  if (r.pagination && typeof r.pagination === 'object') {
    const pag = r.pagination as Record<string, unknown>
    const perPage = pag.per_page as number
    const total = pag.total as number
    const lastPage = Math.ceil(total / perPage) - 1
    const totalPages = Math.ceil(total / perPage)
    return {
      ...r,
      pagination: {
        ...pag,
        page: lastPage,
        ...(pag.pages !== undefined ? { pages: totalPages } : {}),
      },
    }
  }
  const perPage = r.per_page as number
  const total = r.total as number
  const lastPage = Math.ceil(total / perPage) - 1
  return { ...r, page: lastPage }
}

type TableConfig = {
  label: string
  route: string
  apiUrl: string
  page0Response: unknown
  page1Response: unknown
  page0Text: string
  page1Text: string
  nextPageParams?: Record<string, string>
  setup?: () => void
  teardown?: () => void
}

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

const maintainerUser = {
  user_id: 'maintainer-1',
  id: 'maintainer-1',
  email: 'maintainer@test.com',
  name: 'Maintainer User',
  username: 'maintainer',
  is_admin: true,
  is_maintainer: true,
  user_type: 'INTERNAL',
  applications: [],
  projects: [],
}

const TABLE_CONFIGS: TableConfig[] = [
  // ── Users ────────────────────────────────────────────────────────────────
  {
    label: 'Users',
    route: '/settings/administration/users',
    apiUrl: 'v1/admin/users',
    page0Response: {
      data: [
        {
          user_id: 'u1',
          id: 'u1',
          name: 'User Alpha',
          email: 'alpha@test.com',
          username: 'alpha',
          is_admin: false,
          user_type: 'INTERNAL',
          applications: [],
          projects: [],
          budget_assignments: [],
        },
      ],
      pagination: { page: 0, per_page: 10, total: 25 },
    },
    page1Response: {
      data: [
        {
          user_id: 'u2',
          id: 'u2',
          name: 'User Beta',
          email: 'beta@test.com',
          username: 'beta',
          is_admin: false,
          user_type: 'INTERNAL',
          applications: [],
          projects: [],
          budget_assignments: [],
        },
      ],
      pagination: { page: 1, per_page: 10, total: 25 },
    },
    page0Text: 'User Alpha',
    page1Text: 'User Beta',
  },

  // ── Cost Centers ─────────────────────────────────────────────────────────
  {
    label: 'Cost Centers',
    route: '/settings/administration/cost-centers',
    apiUrl: 'v1/admin/cost-centers',
    page0Response: {
      data: [
        {
          id: 'cc1',
          name: 'Alpha Cost Center',
          description: '',
          project_count: 0,
          created_by: 'admin',
          created_at: null,
        },
      ],
      pagination: { page: 0, per_page: 20, total: 50, pages: 3 },
    },
    page1Response: {
      data: [
        {
          id: 'cc2',
          name: 'Beta Cost Center',
          description: '',
          project_count: 0,
          created_by: 'admin',
          created_at: null,
        },
      ],
      pagination: { page: 1, per_page: 20, total: 50, pages: 3 },
    },
    page0Text: 'Alpha Cost Center',
    page1Text: 'Beta Cost Center',
    // The cost-centers route is gated behind features:costCenters via FeatureGuard,
    // which reads appInfoStore.configs. Enable it so the page renders instead of 404ing.
    setup: () => {
      appInfoStore.configs = [{ id: 'features:costCenters', settings: { enabled: true } }]
      appInfoStore.isConfigFetched = true
    },
  },

  // ── Categories ───────────────────────────────────────────────────────────
  {
    label: 'Categories',
    route: '/settings/administration/categories',
    apiUrl: 'v1/assistants/categories/list',
    page0Response: {
      categories: [{ id: 'cat1', name: 'Alpha Category', description: '' }],
      page: 0,
      per_page: 10,
      total: 25,
    },
    page1Response: {
      categories: [{ id: 'cat2', name: 'Beta Category', description: '' }],
      page: 1,
      per_page: 10,
      total: 25,
    },
    page0Text: 'Alpha Category',
    page1Text: 'Beta Category',
  },

  // ── MCPs ─────────────────────────────────────────────────────────────────
  {
    label: 'MCPs',
    route: '/settings/administration/mcps',
    apiUrl: 'v1/mcp-configs',
    page0Response: {
      configs: [
        {
          id: 'mcp1',
          name: 'Alpha MCP',
          description: '',
          is_active: true,
          is_public: false,
          categories: [],
        },
      ],
      page: 0,
      per_page: 20,
      total: 50,
    },
    page1Response: {
      configs: [
        {
          id: 'mcp2',
          name: 'Beta MCP',
          description: '',
          is_active: true,
          is_public: false,
          categories: [],
        },
      ],
      page: 1,
      per_page: 20,
      total: 50,
    },
    page0Text: 'Alpha MCP',
    page1Text: 'Beta MCP',
  },

  // ── Budgets ──────────────────────────────────────────────────────────────
  {
    label: 'Budgets',
    route: '/settings/administration/budgets',
    apiUrl: 'v1/admin/budgets',
    page0Response: {
      data: [
        {
          budget_id: 'b1',
          name: 'Alpha Budget',
          budget_category: 'ai',
          max_budget: 100,
          soft_budget: 50,
          is_preconfigured: false,
        },
      ],
      pagination: { page: 0, per_page: 10, total: 25 },
    },
    page1Response: {
      data: [
        {
          budget_id: 'b2',
          name: 'Beta Budget',
          budget_category: 'ai',
          max_budget: 100,
          soft_budget: 50,
          is_preconfigured: false,
        },
      ],
      pagination: { page: 1, per_page: 10, total: 25 },
    },
    page0Text: 'Alpha Budget',
    page1Text: 'Beta Budget',
    // Override the default non-admin user so canViewBudgets is true.
    setup: () => {
      requestRegistry.set('GET:v1/user', {
        factory: () => makeJsonResponse(adminUser),
      })
    },
  },

  // ── Projects (Full) ───────────────────────────────────────────────────────
  {
    label: 'Projects',
    route: '/settings/administration/projects',
    apiUrl: 'v1/projects',
    page0Response: {
      data: [{ id: 'p1', name: 'alpha-project' }],
      pagination: { page: 0, per_page: 10, total: 25, pages: 3 },
    },
    page1Response: {
      data: [{ id: 'p2', name: 'beta-project' }],
      pagination: { page: 1, per_page: 10, total: 25, pages: 3 },
    },
    page0Text: 'alpha-project',
    page1Text: 'beta-project',
    // Enable full project management view (otherwise renders the default non-paginated page).
    setup: () => {
      vi.mocked(useUserManagementEnabled).mockReturnValue([true, true])
    },
    teardown: () => {
      vi.mocked(useUserManagementEnabled).mockReturnValue([false, true])
    },
  },

  // ── Activity Events ───────────────────────────────────────────────────────
  {
    label: 'Activity Events',
    route: '/settings/administration/activity-events',
    apiUrl: 'v1/admin/activity-events',
    page0Response: {
      data: [
        {
          id: 'ae1',
          domain: 'alpha.example',
          event_type: 'created',
          entity_type: null,
          entity_id: null,
          actor_id: null,
          actor_email: null,
          actor_name: null,
          attributes: null,
          created_at: '2024-01-01T00:00:00Z',
        },
      ],
      pagination: { page: 0, per_page: 50, total: 125 },
    },
    page1Response: {
      data: [
        {
          id: 'ae2',
          domain: 'beta.example',
          event_type: 'updated',
          entity_type: null,
          entity_id: null,
          actor_id: null,
          actor_email: null,
          actor_name: null,
          attributes: null,
          created_at: '2024-01-02T00:00:00Z',
        },
      ],
      pagination: { page: 1, per_page: 50, total: 125 },
    },
    page0Text: 'alpha.example',
    page1Text: 'beta.example',
    // ActivityEventsPage uses offset-based pagination (?offset=50 for page 1).
    // matchRegistry performs a subset check, so { offset: '50' } matches any
    // request that includes offset=50 regardless of other query params.
    nextPageParams: { offset: '50' },
    // ActivityEventsPage requires isMaintainer === true; without it the page
    // navigates away and renders null.
    setup: () => {
      requestRegistry.set('GET:v1/user', { factory: () => makeJsonResponse(maintainerUser) })
    },
  },
]

describe.each(TABLE_CONFIGS)(
  'Admin $label table — pagination',
  ({
    route,
    apiUrl,
    page0Response,
    page1Response,
    page0Text,
    page1Text,
    nextPageParams,
    setup,
    teardown,
  }) => {
    beforeEach(() => {
      setup?.()
      mockAPI('GET', apiUrl, page0Response)
    })

    afterEach(() => {
      teardown?.()
    })

    it('renders first-page items and shows a Next-page button', async () => {
      renderPage(route)

      await screen.findByText(page0Text)
      expect(screen.getByRole('button', { name: 'Next page' })).toBeInTheDocument()
    })

    it('has no Previous-page button on the first page', async () => {
      renderPage(route)

      await screen.findByText(page0Text)
      // Anchor on settled pagination before the negative assertion — without this,
      // the test passes vacuously if pagination fails to render at all.
      await screen.findByRole('button', { name: 'Next page' })
      expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument()
    })

    it('loads the next page when the Next-page button is clicked', async () => {
      renderPage(route)
      await screen.findByText(page0Text)

      // Overwrite with a params-filtered mock: only matches when ?page=1 is sent.
      // If the frontend sends the wrong page param the entry won't match and the test
      // will time out, confirming the correct page number is requested.
      mockAPI('GET', apiUrl, page1Response, nextPageParams ?? { page: '1' })

      fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
      await screen.findByText(page1Text)
    })

    it('shows no pagination when all items fit on one page', async () => {
      mockAPI('GET', apiUrl, makeSinglePage(page0Response))
      renderPage(route)
      await screen.findByText(page0Text)
      expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument()
    })

    it('has no Next-page button on the last page', async () => {
      mockAPI('GET', apiUrl, makeLastPage(page0Response))
      renderPage(route)
      await screen.findByText(page0Text)
      expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Previous page' })).toBeInTheDocument()
    })
  }
)
