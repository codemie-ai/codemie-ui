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

import { projectsStore } from '@/store/projects'
import { userStore } from '@/store/user'
import toaster from '@/utils/toaster'

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
  useUserManagementEnabled: vi.fn(() => [false, true]),
  useBudgetManagementEnabled: vi.fn(() => [false, true]),
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

vi.mock('@/pages/settings/administration/projectsManagement/ProjectModal', () => ({
  default: () => null,
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

const changeOwnershipModalMock = vi.fn()

vi.mock(
  '@/pages/settings/administration/components/projectsManagement/ChangeOwnershipModal',
  () => ({
    default: (props: any) => {
      changeOwnershipModalMock(props)
      return null
    },
  })
)

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
  created_by: 'owner-1',
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

describe('ProjectsManagementFull — ownership transfer', () => {
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

    projectsStore.transferOwnership = vi.fn().mockResolvedValue({
      id: 'my-project',
      name: 'my-project',
      created_by: 'owner-2',
      message: 'Ownership transferred successfully',
    })
    projectsStore.indexProjects = vi.fn().mockResolvedValue([mockProject])
    changeOwnershipModalMock.mockClear()
    vi.mocked(toaster.info).mockClear()
    vi.mocked(toaster.error).mockClear()
  })

  it('shows "Change ownership" in the menu when canManageProject is true', () => {
    render(<ProjectsManagementFull />)

    expect(screen.getByRole('button', { name: 'Change ownership' })).toBeTruthy()
  })

  it('does not show "Change ownership" for personal projects, like Delete', () => {
    vi.mocked(useSnapshot).mockImplementation((store) => {
      if (store === projectsStore) {
        return {
          projects: [{ ...mockProject, project_type: 'personal' }],
          pagination: { page: 1, perPage: 10, total: 1, totalPages: 1 },
          loading: false,
        }
      }
      if (store === userStore) {
        return { user: { platform_role: 'admin', isAdmin: true } }
      }
      return {}
    })

    render(<ProjectsManagementFull />)

    expect(screen.queryByRole('button', { name: 'Change ownership' })).toBeNull()
  })

  it('does not show "Change ownership" when canManageProject is false', () => {
    vi.mocked(useSnapshot).mockImplementation((store) => {
      if (store === projectsStore) {
        return {
          projects: [mockProject],
          pagination: { page: 1, perPage: 10, total: 1, totalPages: 1 },
          loading: false,
        }
      }
      if (store === userStore) {
        return { user: { platform_role: 'user', isAdmin: false, applications: [] } }
      }
      return {}
    })

    render(<ProjectsManagementFull />)

    expect(screen.queryByRole('button', { name: 'Change ownership' })).toBeNull()
  })

  it('opens the modal with visible=true and currentOwnerId set to the row created_by', () => {
    render(<ProjectsManagementFull />)

    fireEvent.click(screen.getByRole('button', { name: 'Change ownership' }))

    const lastProps = changeOwnershipModalMock.mock.calls.at(-1)![0]
    expect(lastProps.visible).toBe(true)
    expect(lastProps.currentOwnerId).toBe('owner-1')
  })

  it('calls transferOwnership, shows a success toast, closes the modal and reloads projects on submit', async () => {
    render(<ProjectsManagementFull />)

    fireEvent.click(screen.getByRole('button', { name: 'Change ownership' }))

    const { onSubmit } = changeOwnershipModalMock.mock.calls.at(-1)![0]
    await act(async () => {
      await onSubmit('owner-2')
    })

    expect(projectsStore.transferOwnership).toHaveBeenCalledWith('my-project', 'owner-2')
    expect(toaster.info).toHaveBeenCalledWith('Ownership transferred successfully')

    const lastProps = changeOwnershipModalMock.mock.calls.at(-1)![0]
    expect(lastProps.visible).toBe(false)

    expect(projectsStore.indexProjects).toHaveBeenCalled()
  })

  it('propagates the rejection and leaves the modal open when transferOwnership rejects', async () => {
    projectsStore.transferOwnership = vi.fn().mockRejectedValue(new Error('Transfer failed'))

    render(<ProjectsManagementFull />)

    fireEvent.click(screen.getByRole('button', { name: 'Change ownership' }))

    const { onSubmit } = changeOwnershipModalMock.mock.calls.at(-1)![0]
    await act(async () => {
      await expect(onSubmit('owner-2')).rejects.toThrow('Transfer failed')
    })

    // api.ts owns the error toast; the handler itself no longer toasts on failure.
    expect(toaster.error).not.toHaveBeenCalled()

    const lastProps = changeOwnershipModalMock.mock.calls.at(-1)![0]
    expect(lastProps.visible).toBe(true)
  })
})
