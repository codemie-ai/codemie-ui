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

import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useBudgetManagementEnabled } from '@/hooks/useFeatureFlags'
import { projectsStore } from '@/store/projects'
import { userStore } from '@/store/user'

import ProjectsManagementFull from '../ProjectsManagementFull'

const captured = vi.hoisted(() => ({ onSort: null as null | ((key: string) => void) }))

vi.mock('@/utils/api', () => ({
  default: { get: vi.fn() },
}))

// Real storage (setupTests.unit mocks it) so the filters survive a remount.
vi.mock('@/utils/storage', async (importOriginal) => importOriginal())

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    resolve: () => ({ href: '/', path: '/', searchParamsString: '' }),
    currentRoute: { value: { query: {}, path: '/' } },
  }),
  replace: vi.fn(),
  push: vi.fn(),
  parseSearchParams: vi.fn(() => ({})),
}))

vi.mock('@/hooks/useFeatureFlags', () => ({
  useFeatureFlag: vi.fn(() => [false, true]),
  useUserManagementEnabled: vi.fn(() => [false, true]),
  useBudgetManagementEnabled: vi.fn(() => [false, true]),
}))

vi.mock('@/pages/settings/components/SettingsLayout', () => ({
  default: ({ content }: any) => <div>{content}</div>,
}))

vi.mock('@/components/Table', () => ({
  default: ({ sort, onSort }: any) => {
    captured.onSort = onSort
    return <div data-testid="projects-table" data-sort={JSON.stringify(sort ?? {})} />
  },
}))

vi.mock('@/pages/settings/administration/components/NameLinkCell', () => ({
  default: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('@/pages/settings/administration/components/BudgetSpendCell', () => ({
  default: () => null,
}))

vi.mock('@/pages/settings/administration/projectsManagement/ProjectResourceCounters', () => ({
  default: () => null,
}))

vi.mock('@/pages/settings/administration/projectsManagement/ProjectModal', () => ({
  default: () => null,
}))

vi.mock('@/components/ConfirmationModal', () => ({
  default: () => null,
}))

vi.mock('@/components/NavigationMore/NavigationMore', () => ({
  default: () => null,
  NavigationItem: {},
}))

vi.mock('@/components/form/Select', () => ({
  default: ({ id, value, onChangeValue, options }: any) => (
    <select data-testid={id} value={value} onChange={(e) => onChangeValue(e.target.value)}>
      {options.map((o: any) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}))

vi.mock('@/components/Button', () => ({
  default: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}))

vi.mock('@/components/InfoWarning', () => ({
  default: () => null,
}))

vi.mock('@/utils/toaster', () => ({
  default: { error: vi.fn(), info: vi.fn() },
}))

const STORAGE_KEY = 'user-1_filters_projects'
const tableSort = () => JSON.parse(screen.getByTestId('projects-table').getAttribute('data-sort')!)

describe('ProjectsManagementFull — filters persist across remount (EPMCDME-16054)', () => {
  let indexProjects: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    vi.mocked(useBudgetManagementEnabled).mockReturnValue([false, true])
    userStore.user = {
      userId: 'user-1',
      isAdmin: true,
      applications: [],
      applicationsAdmin: [],
    } as any
    projectsStore.projects = []
    projectsStore.pagination = { page: 0, perPage: 10, totalPages: 0, totalCount: 0 }
    indexProjects = vi.spyOn(projectsStore, 'indexProjects').mockResolvedValue(undefined as any)
  })

  afterEach(() => {
    indexProjects.mockRestore()
    vi.useRealTimers()
    localStorage.clear()
  })

  it('restores the column sort after unmount and remount', () => {
    const { unmount } = render(<ProjectsManagementFull />)
    act(() => captured.onSort!('name'))
    unmount()
    indexProjects.mockClear()

    render(<ProjectsManagementFull />)

    expect(tableSort()).toEqual({ sortKey: 'name', sortOrder: 'asc' })
    expect(indexProjects).toHaveBeenCalledWith(0, 10, undefined, 'name', 'asc', false, undefined)
  })

  it('keeps a reset sort reset after unmount and remount', () => {
    const { unmount } = render(<ProjectsManagementFull />)
    act(() => captured.onSort!('name'))
    act(() => captured.onSort!('name'))
    act(() => captured.onSort!('name'))
    unmount()
    indexProjects.mockClear()

    render(<ProjectsManagementFull />)

    expect(tableSort()).toEqual({})
    expect(indexProjects).toHaveBeenCalledWith(
      0,
      10,
      undefined,
      undefined,
      undefined,
      false,
      undefined
    )
  })

  it('restores the search after unmount and remount', () => {
    const { unmount } = render(<ProjectsManagementFull />)
    fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'apollo' } })
    act(() => {
      vi.advanceTimersByTime(500)
    })
    unmount()
    indexProjects.mockClear()

    render(<ProjectsManagementFull />)

    expect(screen.getByPlaceholderText('Search')).toHaveValue('apollo')
    expect(indexProjects).toHaveBeenCalledWith(
      0,
      10,
      'apollo',
      undefined,
      undefined,
      false,
      undefined
    )
  })

  it('keeps a cleared search cleared after unmount and remount', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ search: 'apollo' }))
    const { unmount } = render(<ProjectsManagementFull />)
    fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: '' } })
    act(() => {
      vi.advanceTimersByTime(500)
    })
    unmount()
    indexProjects.mockClear()

    render(<ProjectsManagementFull />)

    expect(screen.getByPlaceholderText('Search')).toHaveValue('')
    expect(indexProjects).toHaveBeenCalledWith(
      0,
      10,
      undefined,
      undefined,
      undefined,
      false,
      undefined
    )
  })

  it('restores budget assignment and category into the first request', () => {
    vi.mocked(useBudgetManagementEnabled).mockReturnValue([true, true])
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ budget_assignment: 'assigned', budget_category: 'platform' })
    )

    render(<ProjectsManagementFull />)

    expect(indexProjects).toHaveBeenCalledWith(0, 10, undefined, undefined, undefined, false, {
      includeBudgets: true,
      hasAssignedBudgets: true,
      budgetCategory: 'platform',
    })
  })

  it.each([
    ['budget-assignment-filter', { budget_assignment: 'assigned' }],
    ['budget-category-filter', { budget_category: 'platform' }],
  ])('keeps a cleared %s cleared after unmount and remount', (testId, stored) => {
    vi.mocked(useBudgetManagementEnabled).mockReturnValue([true, true])
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    const { unmount } = render(<ProjectsManagementFull />)
    fireEvent.change(screen.getByTestId(testId), { target: { value: 'all' } })
    unmount()
    indexProjects.mockClear()

    render(<ProjectsManagementFull />)

    expect(screen.getByTestId(testId)).toHaveValue('all')
    expect(indexProjects).toHaveBeenCalledWith(0, 10, undefined, undefined, undefined, false, {
      includeBudgets: true,
      hasAssignedBudgets: false,
      budgetCategory: null,
    })
  })
})
