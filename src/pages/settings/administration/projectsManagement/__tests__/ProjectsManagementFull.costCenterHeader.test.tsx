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

import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { projectsStore } from '@/store/projects'
import { userStore } from '@/store/user'
import { getFilters } from '@/utils/filters'

import ProjectsManagementFull from '../ProjectsManagementFull'

const mockGet = vi.fn()
vi.mock('@/utils/api', () => ({ default: { get: (...args: unknown[]) => mockGet(...args) } }))

vi.mock('@/utils/filters', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/filters')>()
  return { ...actual, getFilters: vi.fn(), setFilters: vi.fn() }
})

vi.mock('@/hooks/useFeatureFlags', () => ({
  useFeatureFlag: vi.fn(() => [true, true]),
  useUserManagementEnabled: vi.fn(() => [false, true]),
  useBudgetManagementEnabled: vi.fn(() => [true, true]),
}))

vi.mock('@/components/form/Input', () => ({ default: () => null }))
vi.mock('@/components/form/Select', () => ({ default: () => null }))
vi.mock('@/pages/settings/components/SettingsLayout', () => ({
  default: ({ content }: any) => <div>{content}</div>,
}))
vi.mock('@/components/Button', () => ({
  default: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}))
vi.mock('@/components/InfoWarning', () => ({ default: () => null }))
vi.mock('@/components/NavigationMore/NavigationMore', () => ({
  default: () => null,
  NavigationItem: {},
}))
vi.mock('@/pages/settings/administration/components/NameLinkCell', () => ({
  default: ({ children }: any) => <div>{children}</div>,
}))
vi.mock('@/pages/settings/administration/components/BudgetSpendCell', () => ({
  default: () => null,
}))
vi.mock('@/pages/settings/administration/projectsManagement/ProjectModal', () => ({
  default: () => null,
}))
vi.mock('@/components/ConfirmationModal', () => ({ default: () => null }))
vi.mock('@/pages/settings/administration/projectsManagement/ProjectResourceCounters', () => ({
  default: () => null,
}))
vi.mock('@/utils/toaster', () => ({ default: { error: vi.fn(), info: vi.fn() } }))
vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    resolve: () => ({ href: '/', path: '/', searchParamsString: '' }),
    currentRoute: { value: { query: {}, path: '/' } },
  }),
}))
vi.mock('@/hooks/useDebounceApply', () => ({ useDebouncedApply: vi.fn() }))

const mockResponse = {
  json: async () => ({ data: [], pagination: { page: 0, per_page: 10, total: 0 } }),
}

beforeEach(() => {
  mockGet.mockReset()
  mockGet.mockResolvedValue(mockResponse)
  vi.mocked(getFilters).mockReturnValue({ budget_assignment: 'assigned' } as any)
  projectsStore.projects = []
  projectsStore.pagination = { page: 0, perPage: 10, totalPages: 0, totalCount: 0 } as any
  userStore.user = { platform_role: 'admin', isAdmin: true } as any
})

describe('ProjectsManagementFull cost center header', () => {
  it('gives Cost center and Created 10% header widths and leaves Budgets unconstrained', async () => {
    await act(async () => {
      render(<ProjectsManagementFull />)
    })

    expect(screen.getByRole('columnheader', { name: 'Cost center' })).toHaveClass('w-[10%]')
    expect(screen.getByRole('columnheader', { name: /Created/ })).toHaveClass('w-[10%]')
    expect(screen.getByRole('columnheader', { name: 'Budgets' }).className).not.toMatch(/\bw-\[/)
  })
})
