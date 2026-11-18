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

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { costCentersStore } from '@/store/costCenters'
import { userStore } from '@/store/user'
import { CostCenterListItem } from '@/types/entity/costCenter'

import CostCentersManagementPage from '../CostCentersManagementPage'

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    resolve: vi.fn(() => ({ href: '/', path: '/', searchParamsString: '' })),
    currentRoute: { value: { query: {}, path: '/' } },
  }),
}))

vi.mock('@/pages/settings/components/SettingsLayout', () => ({
  default: ({ content, rightContent }: any) => (
    <div>
      <div data-testid="header-actions">{rightContent}</div>
      {content}
    </div>
  ),
}))

vi.mock('@/components/Table', () => ({
  default: ({ items, customRenderColumns }: any) => (
    <div>
      {items.map((item: any) => (
        <div key={item.id} data-testid={`row-${item.id}`}>
          {customRenderColumns?.actions?.(item)}
        </div>
      ))}
    </div>
  ),
}))

vi.mock('@/components/NavigationMore/NavigationMore', () => ({
  default: ({ items }: any) => (
    <ul>
      {items.map((item: any) => (
        <li key={item.title}>{item.title}</li>
      ))}
    </ul>
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

const costCenter: CostCenterListItem = {
  id: 'cc-1',
  name: 'Cost Center 1',
  description: 'desc',
  created_by: 'admin@epam.com',
  created_at: '2026-03-19T10:00:00Z',
  project_count: 0,
}

const renderPage = async () => {
  render(
    <MemoryRouter>
      <CostCentersManagementPage />
    </MemoryRouter>
  )
  return screen.findByTestId('row-cc-1')
}

describe('CostCentersManagementPage — write controls by role (EPMCDME-17380)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(costCentersStore.getCostCenters).mockResolvedValue({
      data: [costCenter],
      pagination: { page: 0, per_page: 20, total: 1, pages: 1 },
    })
  })

  it('auditor sees the list with View only: no Create, Edit or Delete', async () => {
    userStore.user = { userId: 'auditor-1', isAdmin: false, isAuditor: true } as never

    const row = await renderPage()

    expect(screen.getByText('View')).toBeInTheDocument()
    expect(row).not.toHaveTextContent('Edit')
    expect(row).not.toHaveTextContent('Delete')
    expect(screen.queryByRole('button', { name: /create/i })).not.toBeInTheDocument()
  })

  it('admin sees Create, Edit and Delete', async () => {
    userStore.user = { userId: 'admin-1', isAdmin: true } as never

    const row = await renderPage()

    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
    expect(row).toHaveTextContent('View')
    expect(row).toHaveTextContent('Edit')
    expect(row).toHaveTextContent('Delete')
  })

  it('maintainer sees Create, Edit and Delete', async () => {
    userStore.user = { userId: 'maintainer-1', isAdmin: false, isMaintainer: true } as never

    const row = await renderPage()

    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
    expect(row).toHaveTextContent('Edit')
    expect(row).toHaveTextContent('Delete')
  })
})
