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

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ProjectMembersManager from '@/pages/settings/administration/projectsManagement/ProjectMembersManager'
import { appInfoStore } from '@/store/appInfo'
import { userStore } from '@/store/user'
import { userModelOverridesStore } from '@/store/userModelOverrides'
import { ProjectDetail } from '@/types/entity/projectManagement'
import toaster from '@/utils/toaster'

vi.mock('@/utils/toaster', () => ({
  default: { info: vi.fn(), error: vi.fn(), success: vi.fn() },
}))

// The modal's own argument-building logic has its own tests
// (ProjectMemberModelOverrideModal.test.tsx). Here the modal is replaced entirely so each test
// can hand ProjectMembersManager's onApply handler exact (overrides, defaultModel,
// hasCustomDefault) arguments and assert the resulting store calls, independent of the modal's
// internal UI/state machine.
let latestOnApply:
  | ((
      overrides: Record<string, 'project' | 'enabled' | 'disabled' | 'mixed'>,
      defaultModel: string | undefined,
      hasCustomDefault: boolean,
      projectAvailability: Record<string, boolean>
    ) => Promise<void>)
  | undefined

let latestModalProps: any

vi.mock(
  '@/pages/settings/administration/projectsManagement/components/ProjectMemberModelOverrideModal',
  () => ({
    default: (props: any) => {
      latestOnApply = props.onApply
      latestModalProps = props
      return props.isOpen ? <div data-testid="model-override-modal" /> : null
    },
  })
)

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

const CATALOG = [
  { label: 'GPT-4', value: 'gpt-4', isDefault: true },
  { label: 'Claude 3', value: 'claude-3', isDefault: false },
  { label: 'Llama', value: 'llama', isDefault: false },
]

const openUserRowMenu = (userName: string) => {
  const row = screen.getByText(userName).closest('tr') as HTMLElement
  const trigger = row.querySelector('button[aria-haspopup="menu"]') as HTMLElement
  fireEvent.click(trigger)
}

const getRowCheckboxes = (container: HTMLElement) =>
  Array.from(
    container.querySelectorAll<HTMLInputElement>('[data-selection-checkbox] input[type="checkbox"]')
  )

const openOverrideModalForRow = async (userName: string) => {
  openUserRowMenu(userName)
  const overrideItem = await screen.findByText('Override models')
  fireEvent.click(overrideItem)
  await screen.findByTestId('model-override-modal')
}

describe('ProjectMembersManager — model override persistence', () => {
  afterEach(cleanup)

  beforeEach(() => {
    vi.clearAllMocks()
    latestOnApply = undefined
    userStore.user = { userId: 'admin-1', isAdmin: true } as never
    userModelOverridesStore.listUserModelOverrides = vi.fn().mockResolvedValue([])
    userModelOverridesStore.setUserModelOverride = vi.fn().mockResolvedValue({})
    userModelOverridesStore.batchUserModelOverrides = vi.fn().mockResolvedValue([])
    userModelOverridesStore.deleteUserModelOverride = vi.fn().mockResolvedValue(undefined)
    appInfoStore.getLLMModels = vi.fn().mockResolvedValue(CATALOG)
  })

  it('persists a single-user override via setUserModelOverride from the row action menu', async () => {
    userStore.getUsers = vi
      .fn()
      .mockResolvedValue(usersResponse([buildUser('u-1', 'Custom User', 'custom@epam.com')]))

    render(<ProjectMembersManager project={mockProject} isUserModelOverrideEnabled />)

    await screen.findByText('Custom User')
    await openOverrideModalForRow('Custom User')

    await latestOnApply!(
      { 'gpt-4': 'project', 'claude-3': 'disabled', llama: 'project' },
      'gpt-4',
      false,
      { 'gpt-4': true, 'claude-3': true, llama: true }
    )

    await waitFor(() =>
      expect(userModelOverridesStore.setUserModelOverride).toHaveBeenCalledWith(
        'Test Project',
        'u-1',
        { allowed_models: ['gpt-4', 'llama'], default_model: 'gpt-4' },
        true
      )
    )
    expect(userModelOverridesStore.batchUserModelOverrides).not.toHaveBeenCalled()
  })

  it('persists a uniform bulk override via batchUserModelOverrides for every selected user', async () => {
    userStore.getUsers = vi
      .fn()
      .mockResolvedValue(
        usersResponse([
          buildUser('u-1', 'Custom User', 'custom@epam.com'),
          buildUser('u-2', 'Project User', 'project@epam.com'),
        ])
      )

    const { container } = render(
      <ProjectMembersManager project={mockProject} isUserModelOverrideEnabled />
    )

    await screen.findByText('Custom User')
    await screen.findByText('Project User')

    const checkboxes = getRowCheckboxes(container)
    fireEvent.click(checkboxes[0])
    fireEvent.click(checkboxes[1])

    const bulkActionsButton = await screen.findByText('Bulk Actions')
    fireEvent.click(bulkActionsButton)
    const overrideItem = await screen.findByText('Override models')
    fireEvent.click(overrideItem)
    await screen.findByTestId('model-override-modal')

    await latestOnApply!(
      { 'gpt-4': 'project', 'claude-3': 'disabled', llama: 'project' },
      'gpt-4',
      false,
      { 'gpt-4': true, 'claude-3': true, llama: true }
    )

    await waitFor(() =>
      expect(userModelOverridesStore.batchUserModelOverrides).toHaveBeenCalledWith(
        'Test Project',
        {
          operation: 'grant',
          user_ids: ['u-1', 'u-2'],
          allowed_models: ['gpt-4', 'llama'],
          default_model: 'gpt-4',
        },
        true
      )
    )
    expect(userModelOverridesStore.setUserModelOverride).not.toHaveBeenCalled()
  })

  it('grants the same edited model list to every selected user in a bulk apply', async () => {
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
        allowed_models: ['gpt-4', 'claude-3'],
        default_model: 'gpt-4',
        created_at: '',
        updated_at: '',
      },
      {
        id: 'ov-2',
        user_id: 'u-2',
        project_name: 'Test Project',
        allowed_models: ['gpt-4'],
        default_model: 'gpt-4',
        created_at: '',
        updated_at: '',
      },
    ])

    const { container } = render(
      <ProjectMembersManager project={mockProject} isUserModelOverrideEnabled />
    )

    await screen.findByText('Custom User')
    await screen.findByText('Project User')
    await waitFor(() => expect(userModelOverridesStore.listUserModelOverrides).toHaveBeenCalled())

    const checkboxes = getRowCheckboxes(container)
    fireEvent.click(checkboxes[0])
    fireEvent.click(checkboxes[1])

    const bulkActionsButton = await screen.findByText('Bulk Actions')
    fireEvent.click(bulkActionsButton)
    const overrideItem = await screen.findByText('Override models')
    fireEvent.click(overrideItem)
    await screen.findByTestId('model-override-modal')

    // The modal shows the union (gpt-4, claude-3); the admin additionally enables llama.
    await latestOnApply!(
      { 'gpt-4': 'enabled', 'claude-3': 'enabled', llama: 'enabled' },
      'gpt-4',
      false,
      { 'gpt-4': true, 'claude-3': true, llama: true }
    )

    await waitFor(() =>
      expect(userModelOverridesStore.batchUserModelOverrides).toHaveBeenCalledWith(
        'Test Project',
        {
          operation: 'grant',
          user_ids: ['u-1', 'u-2'],
          allowed_models: ['gpt-4', 'claude-3', 'llama'],
          default_model: 'gpt-4',
        },
        true
      )
    )
    expect(userModelOverridesStore.setUserModelOverride).not.toHaveBeenCalled()
  })

  // The backend requires a non-empty allowed_models on every create, even when only the
  // default model changed.
  it('sends the project-available models as allowed_models when only the default model changed', async () => {
    userStore.getUsers = vi
      .fn()
      .mockResolvedValue(usersResponse([buildUser('u-1', 'Custom User', 'custom@epam.com')]))

    render(<ProjectMembersManager project={mockProject} isUserModelOverrideEnabled />)

    await screen.findByText('Custom User')
    await openOverrideModalForRow('Custom User')

    // No model entry is explicitly 'enabled'/'disabled' — every model is still 'project'.
    await latestOnApply!(
      { 'gpt-4': 'project', 'claude-3': 'project', llama: 'project' },
      'claude-3',
      true,
      { 'gpt-4': true, 'claude-3': true, llama: true }
    )

    await waitFor(() =>
      expect(userModelOverridesStore.setUserModelOverride).toHaveBeenCalledWith(
        'Test Project',
        'u-1',
        {
          allowed_models: ['gpt-4', 'claude-3', 'llama'],
          default_model: 'claude-3',
        },
        true
      )
    )
  })

  it('hands the stored override and custom default of a single user to the modal', async () => {
    userStore.getUsers = vi
      .fn()
      .mockResolvedValue(usersResponse([buildUser('u-1', 'Custom User', 'custom@epam.com')]))
    userModelOverridesStore.listUserModelOverrides = vi.fn().mockResolvedValue([
      {
        id: 'ov-1',
        user_id: 'u-1',
        project_name: 'Test Project',
        allowed_models: ['gpt-4', 'claude-3'],
        default_model: 'claude-3',
        created_at: '',
        updated_at: '',
      },
    ])

    render(<ProjectMembersManager project={mockProject} isUserModelOverrideEnabled />)

    await screen.findByText('Custom User')
    await waitFor(() => expect(userModelOverridesStore.listUserModelOverrides).toHaveBeenCalled())
    await openOverrideModalForRow('Custom User')

    expect(latestModalProps.defaultModel).toBe('claude-3')
    expect(latestModalProps.projectOverrides).toMatchObject({
      'gpt-4': 'enabled',
      'claude-3': 'enabled',
    })
  })

  it('keeps already-granted models that the modal does not list when re-saving', async () => {
    userStore.getUsers = vi
      .fn()
      .mockResolvedValue(usersResponse([buildUser('u-1', 'Custom User', 'custom@epam.com')]))
    userModelOverridesStore.listUserModelOverrides = vi.fn().mockResolvedValue([
      {
        id: 'ov-1',
        user_id: 'u-1',
        project_name: 'Test Project',
        allowed_models: ['gpt-4', 'router-model'],
        default_model: 'gpt-4',
        created_at: '',
        updated_at: '',
      },
    ])

    render(<ProjectMembersManager project={mockProject} isUserModelOverrideEnabled />)

    await screen.findByText('Custom User')
    await waitFor(() => expect(userModelOverridesStore.listUserModelOverrides).toHaveBeenCalled())
    await openOverrideModalForRow('Custom User')

    await latestOnApply!(
      { 'gpt-4': 'enabled', 'claude-3': 'enabled', llama: 'disabled' },
      'gpt-4',
      false,
      { 'gpt-4': true, 'claude-3': true, llama: true }
    )

    await waitFor(() =>
      expect(userModelOverridesStore.setUserModelOverride).toHaveBeenCalledWith(
        'Test Project',
        'u-1',
        {
          allowed_models: ['gpt-4', 'claude-3', 'router-model'],
          default_model: 'gpt-4',
        },
        true
      )
    )
  })

  it('refuses to open the override modal when loading the overrides failed', async () => {
    userStore.getUsers = vi
      .fn()
      .mockResolvedValue(usersResponse([buildUser('u-1', 'Custom User', 'custom@epam.com')]))
    userModelOverridesStore.listUserModelOverrides = vi.fn().mockRejectedValue(new Error('network'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<ProjectMembersManager project={mockProject} isUserModelOverrideEnabled />)

    await screen.findByText('Custom User')
    await waitFor(() => expect(userModelOverridesStore.listUserModelOverrides).toHaveBeenCalled())
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0)
    })

    openUserRowMenu('Custom User')
    fireEvent.click(await screen.findByText('Override models'))

    await waitFor(() =>
      expect(toaster.error).toHaveBeenCalledWith(expect.stringContaining('could not be loaded'))
    )
    expect(screen.queryByTestId('model-override-modal')).not.toBeInTheDocument()
  })

  it("gates the row context menu's Override models item on whether the row matches the single selection", async () => {
    const renderTwoUsers = () => {
      userStore.getUsers = vi
        .fn()
        .mockResolvedValue(
          usersResponse([
            buildUser('u-1', 'Custom User', 'custom@epam.com'),
            buildUser('u-2', 'Project User', 'project@epam.com'),
          ])
        )
      return render(<ProjectMembersManager project={mockProject} isUserModelOverrideEnabled />)
    }

    // Zero selected: stays enabled for any row (AC5's zero-selection path).
    renderTwoUsers()
    await screen.findByText('Custom User')
    await screen.findByText('Project User')
    await openOverrideModalForRow('Custom User')
    cleanup()

    // One selected, menu opened on that same row: stays enabled (AC5's single-user path).
    {
      const { container } = renderTwoUsers()
      await screen.findByText('Custom User')
      await screen.findByText('Project User')
      fireEvent.click(getRowCheckboxes(container)[0])
      await openOverrideModalForRow('Custom User')
      cleanup()
    }

    // One selected, menu opened on a different row: disabled.
    {
      const { container } = renderTwoUsers()
      await screen.findByText('Custom User')
      await screen.findByText('Project User')
      fireEvent.click(getRowCheckboxes(container)[0])
      openUserRowMenu('Project User')
      const overrideItem = await screen.findByText('Override models')
      expect(overrideItem.closest('button')).toBeDisabled()
      fireEvent.click(overrideItem)
      expect(screen.queryByTestId('model-override-modal')).not.toBeInTheDocument()
      cleanup()
    }

    // More than one selected: disabled regardless of row (unchanged from the prior fix).
    {
      const { container } = renderTwoUsers()
      await screen.findByText('Custom User')
      await screen.findByText('Project User')
      const checkboxes = getRowCheckboxes(container)
      fireEvent.click(checkboxes[0])
      fireEvent.click(checkboxes[1])
      openUserRowMenu('Custom User')
      const overrideItem = await screen.findByText('Override models')
      expect(overrideItem.closest('button')).toBeDisabled()
      fireEvent.click(overrideItem)
      expect(screen.queryByTestId('model-override-modal')).not.toBeInTheDocument()
    }
  })

  it('hides the Model Settings filter from users who cannot manage the project', async () => {
    userStore.user = { userId: 'member-1', isAdmin: false } as never
    userStore.getUsers = vi
      .fn()
      .mockResolvedValue(usersResponse([buildUser('u-1', 'Custom User', 'custom@epam.com')]))

    render(<ProjectMembersManager project={mockProject} isUserModelOverrideEnabled />)

    await screen.findByText('Custom User')

    expect(screen.queryByText('Model Settings')).not.toBeInTheDocument()
    expect(userModelOverridesStore.listUserModelOverrides).not.toHaveBeenCalled()
  })

  it('reloads overrides, closes the modal and confirms after a successful save', async () => {
    userStore.getUsers = vi
      .fn()
      .mockResolvedValue(usersResponse([buildUser('u-1', 'Custom User', 'custom@epam.com')]))

    render(<ProjectMembersManager project={mockProject} isUserModelOverrideEnabled />)

    await screen.findByText('Custom User')
    await waitFor(() =>
      expect(userModelOverridesStore.listUserModelOverrides).toHaveBeenCalledTimes(1)
    )
    await openOverrideModalForRow('Custom User')

    await latestOnApply!(
      { 'gpt-4': 'project', 'claude-3': 'disabled', llama: 'project' },
      'gpt-4',
      false,
      { 'gpt-4': true, 'claude-3': true, llama: true }
    )

    await waitFor(() =>
      expect(userModelOverridesStore.listUserModelOverrides).toHaveBeenCalledTimes(2)
    )
    await waitFor(() =>
      expect(screen.queryByTestId('model-override-modal')).not.toBeInTheDocument()
    )
    expect(toaster.info).toHaveBeenCalledWith('Model overrides updated')
  })

  it('keeps the modal open and shows an error when saving fails', async () => {
    userStore.getUsers = vi
      .fn()
      .mockResolvedValue(usersResponse([buildUser('u-1', 'Custom User', 'custom@epam.com')]))
    userModelOverridesStore.setUserModelOverride = vi.fn().mockRejectedValue(new Error('boom'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<ProjectMembersManager project={mockProject} isUserModelOverrideEnabled />)

    await screen.findByText('Custom User')
    await openOverrideModalForRow('Custom User')

    await latestOnApply!(
      { 'gpt-4': 'project', 'claude-3': 'disabled', llama: 'project' },
      'gpt-4',
      false,
      { 'gpt-4': true, 'claude-3': true, llama: true }
    )

    expect(toaster.error).toHaveBeenCalled()
    expect(toaster.info).not.toHaveBeenCalled()
    expect(screen.getByTestId('model-override-modal')).toBeInTheDocument()
  })

  describe('reset to project settings', () => {
    const overrideRecord = (userId: string) => ({
      id: `ov-${userId}`,
      user_id: userId,
      project_name: 'Test Project',
      allowed_models: ['gpt-4'],
      default_model: 'gpt-4',
      created_at: '',
      updated_at: '',
    })
    const ALL_PROJECT = { 'gpt-4': 'project', 'claude-3': 'project', llama: 'project' } as const
    const AVAILABILITY = { 'gpt-4': true, 'claude-3': true, llama: true }

    const selectBothAndOpenBulkModal = async (container: HTMLElement) => {
      await screen.findByText('Custom User')
      await screen.findByText('Project User')
      await waitFor(() => expect(userModelOverridesStore.listUserModelOverrides).toHaveBeenCalled())
      const checkboxes = getRowCheckboxes(container)
      fireEvent.click(checkboxes[0])
      fireEvent.click(checkboxes[1])
      fireEvent.click(await screen.findByText('Bulk Actions'))
      fireEvent.click(await screen.findByText('Override models'))
      await screen.findByTestId('model-override-modal')
    }

    const twoUsers = () =>
      vi
        .fn()
        .mockResolvedValue(
          usersResponse([
            buildUser('u-1', 'Custom User', 'custom@epam.com'),
            buildUser('u-2', 'Project User', 'project@epam.com'),
          ])
        )

    it('deletes the override of a single user', async () => {
      userStore.getUsers = vi
        .fn()
        .mockResolvedValue(usersResponse([buildUser('u-1', 'Custom User', 'custom@epam.com')]))
      userModelOverridesStore.listUserModelOverrides = vi
        .fn()
        .mockResolvedValue([overrideRecord('u-1')])

      render(<ProjectMembersManager project={mockProject} isUserModelOverrideEnabled />)
      await screen.findByText('Custom User')
      await waitFor(() => expect(userModelOverridesStore.listUserModelOverrides).toHaveBeenCalled())
      await openOverrideModalForRow('Custom User')

      await latestOnApply!({ ...ALL_PROJECT }, 'gpt-4', false, AVAILABILITY)

      await waitFor(() =>
        expect(userModelOverridesStore.deleteUserModelOverride).toHaveBeenCalledWith(
          'Test Project',
          'u-1',
          true
        )
      )
      expect(userModelOverridesStore.setUserModelOverride).not.toHaveBeenCalled()
    })

    it('revokes in bulk when every selected user has an override record', async () => {
      userStore.getUsers = twoUsers()
      userModelOverridesStore.listUserModelOverrides = vi
        .fn()
        .mockResolvedValue([overrideRecord('u-1'), overrideRecord('u-2')])

      const { container } = render(
        <ProjectMembersManager project={mockProject} isUserModelOverrideEnabled />
      )
      await selectBothAndOpenBulkModal(container)

      await latestOnApply!({ ...ALL_PROJECT }, 'gpt-4', false, AVAILABILITY)

      await waitFor(() =>
        expect(userModelOverridesStore.batchUserModelOverrides).toHaveBeenCalledWith(
          'Test Project',
          { operation: 'revoke', user_ids: ['u-1', 'u-2'] },
          true
        )
      )
    })

    it('skips users without an override record when revoking', async () => {
      userStore.getUsers = twoUsers()
      userModelOverridesStore.listUserModelOverrides = vi
        .fn()
        .mockResolvedValue([overrideRecord('u-1')])

      const { container } = render(
        <ProjectMembersManager project={mockProject} isUserModelOverrideEnabled />
      )
      await selectBothAndOpenBulkModal(container)

      await latestOnApply!({ ...ALL_PROJECT }, 'gpt-4', false, AVAILABILITY)

      await waitFor(() =>
        expect(userModelOverridesStore.deleteUserModelOverride).toHaveBeenCalledWith(
          'Test Project',
          'u-1',
          true
        )
      )
      expect(userModelOverridesStore.batchUserModelOverrides).not.toHaveBeenCalled()
    })

    it('closes the modal without calling the store when no selected user has an override', async () => {
      userStore.getUsers = twoUsers()

      const { container } = render(
        <ProjectMembersManager project={mockProject} isUserModelOverrideEnabled />
      )
      await selectBothAndOpenBulkModal(container)

      await latestOnApply!({ ...ALL_PROJECT }, 'gpt-4', false, AVAILABILITY)

      await waitFor(() =>
        expect(screen.queryByTestId('model-override-modal')).not.toBeInTheDocument()
      )
      expect(userModelOverridesStore.batchUserModelOverrides).not.toHaveBeenCalled()
      expect(userModelOverridesStore.deleteUserModelOverride).not.toHaveBeenCalled()
    })
  })

  it('shows an error instead of the success toast when the post-save reload fails', async () => {
    userStore.getUsers = vi
      .fn()
      .mockResolvedValue(usersResponse([buildUser('u-1', 'Custom User', 'custom@epam.com')]))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<ProjectMembersManager project={mockProject} isUserModelOverrideEnabled />)

    await screen.findByText('Custom User')
    await waitFor(() =>
      expect(userModelOverridesStore.listUserModelOverrides).toHaveBeenCalledTimes(1)
    )
    await openOverrideModalForRow('Custom User')
    userModelOverridesStore.listUserModelOverrides = vi.fn().mockRejectedValue(new Error('network'))

    await latestOnApply!(
      { 'gpt-4': 'project', 'claude-3': 'disabled', llama: 'project' },
      'gpt-4',
      false,
      { 'gpt-4': true, 'claude-3': true, llama: true }
    )

    await waitFor(() =>
      expect(toaster.error).toHaveBeenCalledWith(expect.stringContaining('could not be refreshed'))
    )
    expect(toaster.info).not.toHaveBeenCalled()
  })

  it('blocks the override modal while the overrides of a newly selected project are loading', async () => {
    userStore.getUsers = vi
      .fn()
      .mockResolvedValue(usersResponse([buildUser('u-1', 'Custom User', 'custom@epam.com')]))

    const { rerender } = render(
      <ProjectMembersManager project={mockProject} isUserModelOverrideEnabled />
    )
    await screen.findByText('Custom User')
    await waitFor(() =>
      expect(userModelOverridesStore.listUserModelOverrides).toHaveBeenCalledTimes(1)
    )

    userModelOverridesStore.listUserModelOverrides = vi.fn().mockReturnValue(new Promise(() => {}))
    rerender(
      <ProjectMembersManager
        project={{ ...mockProject, name: 'Other Project' }}
        isUserModelOverrideEnabled
      />
    )
    await waitFor(() =>
      expect(userModelOverridesStore.listUserModelOverrides).toHaveBeenCalledWith('Other Project')
    )

    openUserRowMenu(await screen.findByText('Custom User').then((el) => el.textContent as string))
    fireEvent.click(await screen.findByText('Override models'))

    await waitFor(() =>
      expect(toaster.error).toHaveBeenCalledWith(expect.stringContaining('still loading'))
    )
    expect(screen.queryByTestId('model-override-modal')).not.toBeInTheDocument()
  })
})
