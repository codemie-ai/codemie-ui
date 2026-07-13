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
import { useSnapshot } from 'valtio'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { projectDisplayNamesStore } from '@/store/projectDisplayNames'
import { projectsStore } from '@/store/projects'
import { userStore } from '@/store/user'

import ProjectsManagementFull from '../ProjectsManagementFull'

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
  default: ({ items, customRenderColumns }: any) => (
    <div>
      {items.map((item: any) => (
        <div key={item.name} data-testid={`row-${item.name}`}>
          {customRenderColumns?.actions?.(item)}
        </div>
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

const projectModalMock = vi.fn()

vi.mock('@/pages/settings/administration/projectsManagement/ProjectModal', () => ({
  default: (props: any) => {
    projectModalMock(props)
    return null
  },
}))

vi.mock('@/components/ConfirmationModal', () => ({
  default: () => null,
}))

vi.mock('@/components/NavigationMore/NavigationMore', () => ({
  default: ({ items }: any) => (
    <div>
      {items.map((item: any) => (
        <button key={item.title} disabled={item.disabled} onClick={item.onClick}>
          {item.title}
        </button>
      ))}
    </div>
  ),
  NavigationItem: {},
}))

vi.mock('@/components/form/Input', () => ({
  default: () => null,
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

vi.mock('@/hooks/useDebounceApply', () => ({
  useDebouncedApply: vi.fn(),
}))

vi.mock('@/utils/toaster', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('valtio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('valtio')>()
  return {
    ...actual,
    useSnapshot: vi.fn(),
  }
})

const mockProject = {
  name: 'my-project',
  id: 'my-project',
  project_type: 'standard',
  user_count: 5,
  counters: {
    assistants_count: 0,
    workflows_count: 0,
    integrations_count: 0,
    datasources_count: 0,
    skills_count: 0,
  },
}

describe('ProjectsManagementFull — edit save flow', () => {
  beforeEach(() => {
    vi.mocked(useSnapshot).mockImplementation((store) => {
      if (store === projectsStore) {
        return {
          projects: [mockProject],
          pagination: { page: 1, perPage: 10, total: 1, totalPages: 1 },
          loading: false,
        }
      }
      if (store === userStore) {
        return { user: { platform_role: 'admin', isAdmin: true } }
      }
      return {}
    })

    projectsStore.updateProject = vi.fn().mockResolvedValue(mockProject)
    userStore.getCurrentUser = vi.fn().mockResolvedValue(userStore.user)
    projectDisplayNamesStore.invalidate = vi.fn()
    projectModalMock.mockClear()
  })

  it('forwards display_name on edit save and refreshes stale display-name caches', async () => {
    render(<ProjectsManagementFull />)

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))

    const { onSubmit } = projectModalMock.mock.calls.at(-1)[0]
    await act(async () => {
      await onSubmit({
        name: 'my-project',
        display_name: 'New Display Name',
        description: 'desc',
        cost_center_id: '',
        enforce_member_spend_limits: false,
      })
    })

    expect(projectsStore.updateProject).toHaveBeenCalledWith(
      'my-project',
      expect.objectContaining({ display_name: 'New Display Name' })
    )
    expect(projectDisplayNamesStore.invalidate).toHaveBeenCalledWith('my-project')
    expect(userStore.getCurrentUser).toHaveBeenCalled()
  })
})
