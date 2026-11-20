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

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ProjectMembersManager from '@/pages/settings/administration/projectsManagement/ProjectMembersManager'
import { appInfoStore } from '@/store/appInfo'
import { userStore } from '@/store/user'
import { userModelOverridesStore } from '@/store/userModelOverrides'
import { ProjectDetail } from '@/types/entity/projectManagement'

vi.mock('@/utils/toaster', () => ({
  default: { info: vi.fn(), error: vi.fn(), success: vi.fn() },
}))

const mockProject: ProjectDetail = {
  name: 'Test Project',
  description: 'Project description',
  project_type: 'shared',
  created_by: 'admin@epam.com',
  created_at: '2026-03-19T10:00:00Z',
  user_count: 2,
  admin_count: 1,
  cost_center_id: 'cc-1',
  cost_center_name: 'Cost Center',
  enforce_member_spend_limits: false,
  members: [],
} as unknown as ProjectDetail

const buildUser = (id: string, name: string, email: string) => ({
  id,
  name,
  username: name,
  email,
  is_admin: false,
  is_active: true,
  user_type: 'INTERNAL',
  auth_source: 'local',
  last_login_at: null,
  projects: [{ name: 'Test Project', is_project_admin: false }],
  picture: null,
  date: null,
})

const usersResponse = (data: unknown[]) => ({
  data,
  pagination: { page: 0, per_page: 10, total: data.length },
})

const openModelSettingsFilter = async () => {
  const label = await screen.findByText('Model Settings')
  const wrapper = label.closest('div')?.parentElement as HTMLElement
  const combobox = within(wrapper).getByRole('combobox')
  fireEvent.click(combobox)
  return combobox
}

describe('ProjectMembersManager — Model Settings filter', () => {
  afterEach(cleanup)

  beforeEach(() => {
    vi.clearAllMocks()
    userStore.user = { userId: 'admin-1', isAdmin: true } as never
    userStore.getUsers = vi
      .fn()
      .mockResolvedValue(
        usersResponse([
          buildUser('u-1', 'Custom User', 'custom@epam.com'),
          buildUser('u-2', 'Project User', 'project@epam.com'),
        ])
      )
    userModelOverridesStore.listUserModelOverrides = vi.fn().mockResolvedValue([
      {
        id: 'ov-1',
        user_id: 'u-1',
        project_name: 'Test Project',
        allowed_models: ['gpt-4'],
        default_model: 'gpt-4',
        created_at: '',
        updated_at: '',
      },
    ])
    appInfoStore.getLLMModels = vi.fn().mockResolvedValue([{ value: 'gpt-4', label: 'GPT-4' }])
  })

  it('shows all members when no filter is applied', async () => {
    render(<ProjectMembersManager project={mockProject} isUserModelOverrideEnabled />)

    expect(await screen.findByText('Custom User')).toBeInTheDocument()
    expect(await screen.findByText('Project User')).toBeInTheDocument()
  })

  it('does not wipe out the list when there is no budget data (regression)', async () => {
    // No `budgets` prop is passed, so every user has no budget-usage data.
    // Applying the Model Settings filter must not implicitly apply the
    // (always-failing) Budget Usage filter as well.
    render(<ProjectMembersManager project={mockProject} isUserModelOverrideEnabled />)

    await screen.findByText('Custom User')
    await waitFor(() => expect(userModelOverridesStore.listUserModelOverrides).toHaveBeenCalled())

    await openModelSettingsFilter()
    await waitFor(() => expect(screen.getByText('Project')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Project'))

    await waitFor(() => {
      expect(screen.getByText('Project User')).toBeInTheDocument()
    })
    expect(screen.queryByText('Custom User')).not.toBeInTheDocument()
  })

  it('filters to only users with override_enabled=true when "Custom" is selected', async () => {
    render(<ProjectMembersManager project={mockProject} isUserModelOverrideEnabled />)

    await screen.findByText('Custom User')
    await waitFor(() => expect(userModelOverridesStore.listUserModelOverrides).toHaveBeenCalled())

    await openModelSettingsFilter()
    await waitFor(() => expect(screen.getByText('Custom')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Custom'))

    await waitFor(() => {
      expect(screen.queryByText('Project User')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Custom User')).toBeInTheDocument()
  })

  it('filters to only users with override_enabled=false when "Project" is selected', async () => {
    render(<ProjectMembersManager project={mockProject} isUserModelOverrideEnabled />)

    await screen.findByText('Custom User')
    await waitFor(() => expect(userModelOverridesStore.listUserModelOverrides).toHaveBeenCalled())

    await openModelSettingsFilter()
    await waitFor(() => expect(screen.getByText('Project')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Project'))

    await waitFor(() => {
      expect(screen.queryByText('Custom User')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Project User')).toBeInTheDocument()
  })

  it('hides the model-override column entirely when the feature flag is off', async () => {
    const { container: withFlag } = render(
      <ProjectMembersManager project={mockProject} isUserModelOverrideEnabled />
    )
    await screen.findByText('Custom User')
    const headerCountWithFlag = withFlag.querySelectorAll('thead th').length
    cleanup()

    const { container: withoutFlag } = render(<ProjectMembersManager project={mockProject} />)
    await screen.findByText('Custom User')
    const headerCountWithoutFlag = withoutFlag.querySelectorAll('thead th').length

    expect(headerCountWithoutFlag).toBe(headerCountWithFlag - 1)
  })

  it('does not wipe the list under "Custom" while overrides are loading, then re-filters once they arrive', async () => {
    let resolveOverrides: (value: unknown[]) => void = () => {}
    userModelOverridesStore.listUserModelOverrides = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveOverrides = resolve
      })
    )

    render(<ProjectMembersManager project={mockProject} isUserModelOverrideEnabled />)

    await screen.findByText('Custom User')
    await openModelSettingsFilter()
    await waitFor(() => expect(screen.getByText('Custom')).toBeInTheDocument())
    const callsBefore = vi.mocked(userStore.getUsers).mock.calls.length
    fireEvent.click(screen.getByText('Custom'))

    await waitFor(() =>
      expect(vi.mocked(userStore.getUsers).mock.calls.length).toBeGreaterThan(callsBefore)
    )
    expect(screen.getByText('Custom User')).toBeInTheDocument()
    expect(screen.getByText('Project User')).toBeInTheDocument()

    resolveOverrides([
      {
        id: 'ov-1',
        user_id: 'u-1',
        project_name: 'Test Project',
        allowed_models: ['gpt-4'],
        default_model: 'gpt-4',
        created_at: '',
        updated_at: '',
      },
    ])

    await waitFor(() => expect(screen.queryByText('Project User')).not.toBeInTheDocument())
    expect(screen.getByText('Custom User')).toBeInTheDocument()
  })

  it('does not wipe the list under "Custom" when loading the overrides failed', async () => {
    userModelOverridesStore.listUserModelOverrides = vi.fn().mockRejectedValue(new Error('network'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<ProjectMembersManager project={mockProject} isUserModelOverrideEnabled />)

    await screen.findByText('Custom User')
    await waitFor(() => expect(userModelOverridesStore.listUserModelOverrides).toHaveBeenCalled())
    await openModelSettingsFilter()
    await waitFor(() => expect(screen.getByText('Custom')).toBeInTheDocument())
    const callsBefore = vi.mocked(userStore.getUsers).mock.calls.length
    fireEvent.click(screen.getByText('Custom'))

    await waitFor(() =>
      expect(vi.mocked(userStore.getUsers).mock.calls.length).toBeGreaterThan(callsBefore)
    )
    expect(screen.getByText('Custom User')).toBeInTheDocument()
    expect(screen.getByText('Project User')).toBeInTheDocument()
  })
})

describe('ProjectMembersManager — model overrides access', () => {
  afterEach(cleanup)

  beforeEach(() => {
    vi.clearAllMocks()
    userStore.getUsers = vi
      .fn()
      .mockResolvedValue(usersResponse([buildUser('u-1', 'Custom User', 'custom@epam.com')]))
    userModelOverridesStore.listUserModelOverrides = vi.fn().mockResolvedValue([])
    appInfoStore.getLLMModels = vi.fn().mockResolvedValue([{ value: 'gpt-4', label: 'GPT-4' }])
  })

  it('does not request overrides for a user who cannot manage the project', async () => {
    userStore.user = { userId: 'member-1', isAdmin: false, applicationsAdmin: [] } as never

    render(<ProjectMembersManager project={mockProject} isUserModelOverrideEnabled />)

    await screen.findByText('Custom User')
    expect(userModelOverridesStore.listUserModelOverrides).not.toHaveBeenCalled()
  })

  it('requests overrides for a project admin of this project', async () => {
    userStore.user = {
      userId: 'pa-1',
      isAdmin: false,
      applicationsAdmin: ['Test Project'],
    } as never

    render(<ProjectMembersManager project={mockProject} isUserModelOverrideEnabled />)

    await screen.findByText('Custom User')
    await waitFor(() =>
      expect(userModelOverridesStore.listUserModelOverrides).toHaveBeenCalledWith('Test Project')
    )
  })
})
