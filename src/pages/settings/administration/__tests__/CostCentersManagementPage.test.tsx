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

import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { costCentersStore } from '@/store/costCenters'
import { userStore } from '@/store/user'
import { PaginatedResponse } from '@/types/common'
import { CostCenterListItem } from '@/types/entity/costCenter'

import CostCentersManagementPage from '../CostCentersManagementPage'

const resolveMock = vi.fn(({ query }) => {
  const searchParamsString = new URLSearchParams(
    Object.entries(query ?? {}).flatMap(([k, v]) =>
      Array.isArray(v) ? v.map((i: unknown) => [k, String(i)]) : [[k, String(v)]]
    )
  ).toString()
  return {
    href: `/settings/administration/projects`,
    path: `/settings/administration/projects`,
    searchParamsString,
  }
})

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    resolve: resolveMock,
    currentRoute: { value: { query: {}, path: '/' } },
  }),
}))

vi.mock('@/pages/settings/components/SettingsLayout', () => ({
  default: ({ content }: any) => <div>{content}</div>,
}))

vi.mock('@/components/Table', () => ({
  default: ({ items, customRenderColumns }: any) => (
    <div>
      {items.map((item: any) => (
        <div key={item.id} data-testid={`row-${item.id}`}>
          {customRenderColumns?.project_count?.(item)}
        </div>
      ))}
    </div>
  ),
}))

vi.mock('@/store/costCenters', () => ({
  costCentersStore: {
    getCostCenters: vi.fn(),
    createCostCenter: vi.fn(),
    updateCostCenter: vi.fn(),
    deleteCostCenter: vi.fn(),
  },
}))

const costCenterWithProjects: CostCenterListItem = {
  id: 'cc-1',
  name: 'Cost Center 1',
  description: 'Has projects',
  created_by: 'admin@epam.com',
  created_at: '2026-03-19T10:00:00Z',
  project_count: 3,
}

const costCenterWithoutProjects: CostCenterListItem = {
  id: 'cc-2',
  name: 'Cost Center 2',
  description: 'No projects',
  created_by: 'admin@epam.com',
  created_at: '2026-03-19T10:00:00Z',
  project_count: 0,
}

const mockResponse: PaginatedResponse<CostCenterListItem> = {
  data: [costCenterWithProjects, costCenterWithoutProjects],
  pagination: { page: 0, per_page: 20, total: 2, pages: 1 },
}

describe('CostCentersManagementPage — project-count badge navigation (EPMCDME-15632)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(costCentersStore.getCostCenters).mockResolvedValue(mockResponse)
    userStore.user = { userId: 'admin-1', isAdmin: true } as never
  })

  it('renders a clickable badge linking to the filtered Project Management page for a cost center with projects', async () => {
    render(
      <MemoryRouter>
        <CostCentersManagementPage />
      </MemoryRouter>
    )

    const row = await screen.findByTestId('row-cc-1')
    const link = within(row).getByRole('link', { name: 'Projects' })
    expect(within(row).getByText('3')).toBeInTheDocument()
    const href = link.getAttribute('href') ?? ''
    expect(href).toContain('/settings/administration/projects')
    expect(href).toContain('cost_center_ids=cc-1')
  })

  it('renders a clickable badge showing 0 for a cost center with no projects, linking to its own filter', async () => {
    render(
      <MemoryRouter>
        <CostCentersManagementPage />
      </MemoryRouter>
    )

    const row = await screen.findByTestId('row-cc-2')
    const link = row.querySelector('a')
    expect(link).not.toBeNull()
    expect(row).toHaveTextContent('0')
    const href = link?.getAttribute('href') ?? ''
    expect(href).toContain('/settings/administration/projects')
    expect(href).toContain('cost_center_ids=cc-2')
  })

  it('renders a clickable badge for a maintainer', async () => {
    userStore.user = { userId: 'maintainer-1', isAdmin: false, isMaintainer: true } as never
    render(
      <MemoryRouter>
        <CostCentersManagementPage />
      </MemoryRouter>
    )

    const row = await screen.findByTestId('row-cc-1')
    const href = within(row).getByRole('link', { name: 'Projects' }).getAttribute('href') ?? ''
    expect(href).toContain('cost_center_ids=cc-1')
  })

  it('renders a plain count without a link when the viewer cannot filter by cost center', async () => {
    userStore.user = { userId: 'user-1', isAdmin: false, isAuditor: true } as never
    render(
      <MemoryRouter>
        <CostCentersManagementPage />
      </MemoryRouter>
    )

    const row = await screen.findByTestId('row-cc-1')
    expect(within(row).getByText('3')).toBeInTheDocument()
    expect(within(row).getByLabelText('Projects')).toBeInTheDocument()
    expect(within(row).queryByRole('link')).not.toBeInTheDocument()
  })
})
