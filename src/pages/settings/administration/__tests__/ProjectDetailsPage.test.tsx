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

import { act, render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import ProjectDetailsPage from '@/pages/settings/administration/ProjectDetailsPage'
import { projectDisplayNamesStore } from '@/store/projectDisplayNames'
import { projectsStore } from '@/store/projects'
import { userStore } from '@/store/user'
import { ProjectDetail } from '@/types/entity/projectManagement'

const pushMock = vi.fn()
const projectMembersManagerMock = vi.fn()

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: () => ({
    push: pushMock,
    params: { projectName: 'Test Project' },
  }),
}))

vi.mock('@/components/Button', () => ({
  default: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))

vi.mock('@/components/Spinner', () => ({
  default: () => <div data-testid="spinner" />,
}))

vi.mock('@/pages/settings/components/SettingsLayout', () => ({
  default: ({ contentTitle, content, rightContent }: any) => (
    <div>
      <h1>{contentTitle}</h1>
      {rightContent}
      {content}
    </div>
  ),
}))

const projectModalMock = vi.fn()

vi.mock('@/pages/settings/administration/projectsManagement/ProjectModal', () => ({
  default: (props: any) => {
    projectModalMock(props)
    return <div data-testid="project-modal" />
  },
}))

vi.mock('@/pages/settings/administration/projectsManagement/ProjectMembersManager', () => ({
  default: (props: any) => {
    projectMembersManagerMock(props)
    return <div data-testid="project-members-manager">{props.project.name}</div>
  },
}))

vi.mock('@/utils/toaster', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
  },
}))

const { chargebackFlag, costCentersFlag } = vi.hoisted(() => ({
  chargebackFlag: vi.fn(() => [false, true] as [boolean, boolean]),
  costCentersFlag: vi.fn(() => [true, true] as [boolean, boolean]),
}))

vi.mock('@/hooks/useFeatureFlags', () => ({
  useFeatureFlag: () => costCentersFlag(),
  useBudgetManagementEnabled: () => [false, true],
  useProjectChargebackEnabled: () => chargebackFlag(),
}))

const mockProject: ProjectDetail = {
  name: 'Test Project',
  description: 'Project description',
  project_type: 'shared',
  created_by: 'admin@epam.com',
  created_at: '2026-03-19T10:00:00Z',
  user_count: 3,
  admin_count: 1,
  cost_center_id: 'cc-1',
  cost_center_name: 'Cost Center',
  enforce_member_spend_limits: true,
  members: [],
}

describe('ProjectDetailsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    chargebackFlag.mockReturnValue([false, true])
    costCentersFlag.mockReturnValue([true, true])
    projectsStore.getProject = vi.fn().mockResolvedValue(mockProject)
    projectsStore.updateProject = vi.fn().mockResolvedValue(mockProject)
    userStore.getCurrentUser = vi.fn().mockResolvedValue(userStore.user)
    projectDisplayNamesStore.invalidate = vi.fn()
  })

  it('shows chargeback enabled and attributed to a cost center in the details card', async () => {
    chargebackFlag.mockReturnValue([true, true])
    projectsStore.getProject = vi.fn().mockResolvedValue({
      ...mockProject,
      chargeback_enabled: true,
      chargeback_attribution: 'cost_center',
    })

    render(<ProjectDetailsPage />)

    expect(await screen.findByText('Chargeback')).toBeInTheDocument()
    expect(screen.getByText('Enabled, attributed to a cost center')).toBeInTheDocument()
  })

  it('does not surface cost-center attribution when cost centers are disabled', async () => {
    chargebackFlag.mockReturnValue([true, true])
    costCentersFlag.mockReturnValue([false, true])
    projectsStore.getProject = vi.fn().mockResolvedValue({
      ...mockProject,
      chargeback_enabled: true,
      chargeback_attribution: 'cost_center',
      enforce_member_spend_limits: false,
    })

    render(<ProjectDetailsPage />)

    expect(await screen.findByText('Chargeback')).toBeInTheDocument()
    // Cost centers are off, so the label degrades to a plain "Enabled".
    expect(screen.getByText('Enabled')).toBeInTheDocument()
    expect(screen.queryByText('Enabled, attributed to a cost center')).not.toBeInTheDocument()
  })

  it('shows chargeback disabled in the details card when off', async () => {
    chargebackFlag.mockReturnValue([true, true])
    projectsStore.getProject = vi.fn().mockResolvedValue({
      ...mockProject,
      chargeback_enabled: false,
      enforce_member_spend_limits: false,
    })

    render(<ProjectDetailsPage />)

    expect(await screen.findByText('Chargeback')).toBeInTheDocument()
    expect(screen.getAllByText('Disabled').length).toBeGreaterThan(0)
  })

  it('hides the chargeback field when the feature flag is off', async () => {
    render(<ProjectDetailsPage />)

    await waitFor(() => expect(projectsStore.getProject).toHaveBeenCalled())
    expect(screen.queryByText('Chargeback')).not.toBeInTheDocument()
  })

  it('renders ProjectMembersManager with the loaded project', async () => {
    render(<ProjectDetailsPage />)

    await waitFor(() => {
      expect(projectsStore.getProject).toHaveBeenCalledWith('Test Project', true)
    })

    expect(await screen.findByTestId('project-members-manager')).toHaveTextContent('Test Project')
    expect(projectMembersManagerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        project: mockProject,
        onMembersChanged: expect.any(Function),
      })
    )
  })

  it('refreshes project details through onMembersChanged callback', async () => {
    render(<ProjectDetailsPage />)

    await waitFor(() => {
      expect(projectMembersManagerMock).toHaveBeenCalled()
    })

    const { onMembersChanged } = projectMembersManagerMock.mock.calls[0][0]
    await act(async () => {
      await onMembersChanged()
    })

    expect(projectsStore.getProject).toHaveBeenCalledTimes(2)
    expect(projectsStore.getProject).toHaveBeenNthCalledWith(2, 'Test Project', true)
  })

  it('renders project member budget tracking status', async () => {
    render(<ProjectDetailsPage />)

    expect(await screen.findByText('Enforce member spend limits')).toBeInTheDocument()
    expect(screen.getByText('Enabled')).toBeInTheDocument()
  })

  it('forwards the edited display_name to updateProject and refreshes stale caches on save', async () => {
    render(<ProjectDetailsPage />)

    await waitFor(() => {
      expect(projectModalMock).toHaveBeenCalled()
    })

    const { onSubmit } = projectModalMock.mock.calls[0][0]
    await act(async () => {
      await onSubmit({
        name: 'Test Project',
        display_name: 'New Display Name',
        description: 'Project description',
        cost_center_id: 'cc-1',
        enforce_member_spend_limits: true,
      })
    })

    expect(projectsStore.updateProject).toHaveBeenCalledWith(
      'Test Project',
      expect.objectContaining({ display_name: 'New Display Name' })
    )
    expect(projectDisplayNamesStore.invalidate).toHaveBeenCalledWith('Test Project')
    expect(userStore.getCurrentUser).toHaveBeenCalled()
  })

  it('forwards clear_display_name to updateProject when the form requests clearing (EPMCDME-13486)', async () => {
    render(<ProjectDetailsPage />)

    await waitFor(() => {
      expect(projectModalMock).toHaveBeenCalled()
    })

    const { onSubmit } = projectModalMock.mock.calls[0][0]
    await act(async () => {
      await onSubmit({
        name: 'Test Project',
        display_name: undefined,
        clear_display_name: true,
        description: 'Project description',
        cost_center_id: 'cc-1',
        enforce_member_spend_limits: true,
      })
    })

    expect(projectsStore.updateProject).toHaveBeenCalledWith(
      'Test Project',
      expect.objectContaining({ clear_display_name: true })
    )
  })

  it('shows the project name in the success toast when name is omitted from the payload (EPMCDME-13165)', async () => {
    const { default: toaster } = await import('@/utils/toaster')

    render(<ProjectDetailsPage />)

    await waitFor(() => {
      expect(projectModalMock).toHaveBeenCalled()
    })

    const { onSubmit } = projectModalMock.mock.calls[0][0]
    await act(async () => {
      await onSubmit({
        name: undefined,
        display_name: 'New Display Name',
        description: 'Project description',
        cost_center_id: 'cc-1',
        enforce_member_spend_limits: true,
      })
    })

    expect(toaster.info).toHaveBeenCalledWith(expect.stringContaining('Test Project'))
  })
})
