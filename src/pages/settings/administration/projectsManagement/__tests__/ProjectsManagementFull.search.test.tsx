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

import { projectsStore } from '@/store/projects'
import { userStore } from '@/store/user'

import ProjectsManagementFull from '../ProjectsManagementFull'

const mockGet = vi.fn()

vi.mock('@/utils/api', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
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

vi.mock('@/hooks/useFeatureFlags', () => ({
  useFeatureFlag: vi.fn(() => [false, true]),
}))

vi.mock('@/pages/settings/components/SettingsLayout', () => ({
  default: ({ content }: any) => <div>{content}</div>,
}))

vi.mock('@/components/Table', () => ({
  default: ({ items }: any) => (
    <div>
      {items.map((item: any) => (
        <div key={item.name} data-testid={`row-${item.name}`} />
      ))}
    </div>
  ),
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
  default: () => null,
}))

vi.mock('@/components/Button', () => ({
  default: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}))

vi.mock('@/components/InfoWarning', () => ({
  default: () => null,
}))

vi.mock('@/utils/toaster', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
  },
}))

describe('ProjectsManagementFull — search', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockGet.mockReset()
    mockGet.mockResolvedValue({
      // A large total simulates a production org with many projects (many pages
      // at the backend's per_page cap) - the historical bug fanned this out into
      // one request per page as soon as a search term was typed (EPMCDME-13520).
      json: async () => ({ data: [], pagination: { page: 0, per_page: 10, total: 5000 } }),
    })
    userStore.user = { isAdmin: true, applications: [], applicationsAdmin: [] } as any
    projectsStore.projects = []
    projectsStore.pagination = { page: 0, perPage: 10, totalPages: 0, totalCount: 0 }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('issues exactly one request per search update, even with many total projects', async () => {
    render(<ProjectsManagementFull />)

    // Initial mount load.
    expect(mockGet).toHaveBeenCalledTimes(1)

    const searchInput = screen.getByPlaceholderText('Search')
    fireEvent.change(searchInput, { target: { value: 'cod' } })

    // Debounce (500ms) hasn't elapsed yet - no extra request.
    expect(mockGet).toHaveBeenCalledTimes(1)

    await act(async () => {
      vi.advanceTimersByTime(500)
    })

    // Exactly one additional request for the search - never a fan-out across pages.
    expect(mockGet).toHaveBeenCalledTimes(2)
    const searchUrl = mockGet.mock.calls[1][0] as string
    expect(searchUrl).toContain('search=cod')
  })
})
