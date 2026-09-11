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

import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { projectsStore } from '@/store/projects'
import { userStore } from '@/store/user'
import { getFilters } from '@/utils/filters'

import ProjectsManagementFull from '../ProjectsManagementFull'

const mockGet = vi.fn()
vi.mock('@/utils/api', () => ({ default: { get: (...args: unknown[]) => mockGet(...args) } }))

// importOriginal spreads all real exports (including FILTER_ENTITY enum) and overrides only
// getFilters and setFilters — a plain factory would drop FILTER_ENTITY, crashing useProjectsFilters.
vi.mock('@/utils/filters', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/filters')>()
  return { ...actual, getFilters: vi.fn(), setFilters: vi.fn() }
})

vi.mock('@/hooks/useFeatureFlags', () => ({
  useFeatureFlag: vi.fn(() => [false, true]),
  useUserManagementEnabled: vi.fn(() => [false, true]),
  useBudgetManagementEnabled: vi.fn(() => [true, true]), // already enabled on mount — reproduces bug
}))

vi.mock('@/components/form/Input', () => ({ default: () => null }))

vi.mock('@/components/form/Select', () => ({ default: () => null }))

vi.mock('@/pages/settings/components/SettingsLayout', () => ({
  default: ({ content }: any) => <div>{content}</div>,
}))

let triggerPageChange: ((page: number, perPage?: number) => void) | null = null
vi.mock('@/components/Table', () => ({
  default: ({ items, onPaginationChange }: any) => {
    triggerPageChange = onPaginationChange
    return (
      <div>
        {(items ?? []).map((item: any) => (
          <div key={item.name} data-testid={`row-${item.name}`} />
        ))}
      </div>
    )
  },
}))

vi.mock('@/components/Button', () => ({
  default: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}))

vi.mock('@/components/InfoWarning', () => ({
  default: () => null,
}))

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

vi.mock('@/components/ConfirmationModal', () => ({
  default: () => null,
}))

vi.mock('@/pages/settings/administration/projectsManagement/ProjectResourceCounters', () => ({
  default: () => null,
}))

vi.mock('@/utils/toaster', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    resolve: () => ({ href: '/', path: '/', searchParamsString: '' }),
    currentRoute: { value: { query: {}, path: '/' } },
  }),
}))

vi.mock('@/hooks/useDebounceApply', () => ({
  useDebouncedApply: vi.fn(),
}))

// indexProjects does response.json() — a plain object has no .json() and throws into catch.
const mockResponse = {
  json: async () => ({ data: [], pagination: { page: 0, per_page: 10, total: 0 } }),
}

beforeEach(() => {
  mockGet.mockReset() // vitest.config does not set clearMocks — reset to prevent cross-test accumulation
  mockGet.mockResolvedValue(mockResponse)
  vi.mocked(getFilters).mockReturnValue({ budget_assignment: 'assigned' } as any)
  triggerPageChange = null
  projectsStore.projects = []
  projectsStore.pagination = { page: 0, perPage: 10, totalPages: 0, totalCount: 0 } as any
  userStore.user = { platform_role: 'admin', isAdmin: true } as any
})

describe('ProjectsManagementFull — pagination deduplication', () => {
  // Unit tests cannot cover this: setupTests.unit replaces useSnapshot with the identity
  // function, so a store write never re-renders and the page-dependent effect never re-runs.
  // The duplicate only appears with real Valtio reactivity.
  const respondWithPage = (page: number, perPage = 10) => {
    mockGet.mockReset()
    mockGet.mockResolvedValue({
      json: async () => ({ data: [], pagination: { page, per_page: perPage, total: 40 } }),
    })
  }

  it('fires api.get exactly once when the user moves to another page', async () => {
    await act(async () => {
      render(<ProjectsManagementFull />)
    })

    respondWithPage(2)
    await act(async () => {
      triggerPageChange?.(2)
    })

    expect(mockGet).toHaveBeenCalledTimes(1)
    expect(mockGet.mock.calls[0][0]).toContain('page=2')
  })

  it('fires api.get exactly once when the per-page size changes', async () => {
    await act(async () => {
      render(<ProjectsManagementFull />)
    })

    respondWithPage(0, 20)
    await act(async () => {
      triggerPageChange?.(0, 20)
    })

    expect(mockGet).toHaveBeenCalledTimes(1)
    expect(mockGet.mock.calls[0][0]).toContain('per_page=20')
  })
})
