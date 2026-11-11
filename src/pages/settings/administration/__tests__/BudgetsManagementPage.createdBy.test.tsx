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
import { describe, it, expect, vi } from 'vitest'

import api from '@/utils/api'

import BudgetsManagementPage from '../BudgetsManagementPage'

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return { ...actual, useNavigate: () => vi.fn() }
})
vi.mock('valtio', () => ({
  proxy: (obj: unknown) => obj,
  useSnapshot: vi.fn((store: unknown) => store),
  subscribe: vi.fn(() => vi.fn()),
}))
vi.mock('@/router', () => ({ router: { state: { matches: [] }, navigate: vi.fn() } }))
vi.mock('@/hooks/useVueRouter', () => ({ router: { push: vi.fn() }, findRouteObject: vi.fn() }))
vi.mock('@/store/user', () => ({
  userStore: { user: { isAdmin: true, isMaintainer: true, isAuditor: true } },
}))
vi.mock('@/store/budgets', () => {
  const base = {
    description: null,
    soft_budget: 1,
    max_budget: 2,
    budget_duration: '1d',
    budget_category: 'platform',
    is_preconfigured: false,
  }
  return {
    budgetsStore: {
      budgets: [
        { ...base, budget_id: 'b1', name: 'B1', created_by: 'user-1', created_by_name: 'Jane Doe' },
        {
          ...base,
          budget_id: 'b2',
          name: 'B2',
          created_by: 'user-2',
          created_by_name: 'jdoe_user',
        },
        {
          ...base,
          budget_id: 'b3',
          name: 'B3',
          created_by: 'system',
          is_preconfigured: true,
          created_by_name: null,
        },
        {
          ...base,
          budget_id: 'b4',
          name: 'B4',
          created_by: 'deleted-user',
          created_by_name: null,
        },
      ],
      pagination: { page: 0, perPage: 20, totalPages: 1 },
      loading: false,
      syncing: false,
      listBudgets: vi.fn().mockResolvedValue(undefined),
    },
  }
})
vi.mock('@/utils/toaster', () => ({
  default: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}))
vi.mock('@/pages/settings/administration/components/BudgetModal', () => ({ default: () => null }))
vi.mock('@/pages/settings/components/SettingsLayout', () => ({
  default: ({ content }: any) => <div>{content}</div>,
}))
vi.mock('@/components/form/Select/Select', () => ({ default: () => <div /> }))

describe('BudgetsManagementPage Created By column', () => {
  it('renders the API-provided creator names, System and em dash', () => {
    render(<BudgetsManagementPage />)
    expect(screen.getByText('Created By')).toBeInTheDocument()
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('jdoe_user')).toBeInTheDocument()
    expect(screen.getByText('System')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('never looks up users to resolve a creator name', () => {
    const spy = vi.spyOn(api, 'get')
    render(<BudgetsManagementPage />)
    expect(spy).not.toHaveBeenCalledWith(
      expect.stringContaining('v1/admin/users'),
      expect.anything()
    )
  })
})
