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
vi.mock('@/store/budgets', () => ({
  budgetsStore: {
    budgets: [],
    pagination: { page: 1, perPage: 20, pages: 1, totalCount: 0 },
    loading: false,
    syncing: false,
    listBudgets: vi.fn().mockResolvedValue(undefined),
  },
}))
vi.mock('@/utils/toaster', () => ({
  default: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}))
vi.mock('@/pages/settings/components/SettingsLayout', () => ({
  default: ({ content }: any) => <div>{content}</div>,
}))
vi.mock('@/components/form/Select/Select', () => ({
  default: ({ value, options }: any) => {
    const selected = options?.find((o: any) => o.value === value)
    return <div data-testid="category-select">{selected?.label ?? ''}</div>
  },
}))

describe('BudgetsManagementPage category filter', () => {
  it('shows "All categories" label on initial render', () => {
    render(<BudgetsManagementPage />)
    expect(screen.getByTestId('category-select')).toHaveTextContent('All categories')
  })
})
