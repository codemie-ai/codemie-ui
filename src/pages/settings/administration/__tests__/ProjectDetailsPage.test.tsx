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

import { FEATURE_FLAGS } from '@/constants/featureFlags'
import ProjectDetailsPage from '@/pages/settings/administration/ProjectDetailsPage'
import { projectDisplayNamesStore } from '@/store/projectDisplayNames'
import { projectsStore } from '@/store/projects'
import { userStore } from '@/store/user'
import { ProjectDetail } from '@/types/entity/projectManagement'

const routeState = vi.hoisted(() => ({ name: 'projects-management-detail' }))
const pushMock = vi.fn()
const projectMembersManagerMock = vi.fn()
const projectBudgetsSectionMock = vi.fn()

const { mockUserStore } = vi.hoisted(() => ({
  mockUserStore: {
    user: null as null | {
      isAdmin: boolean
      isMaintainer: boolean
      isAuditor: boolean
      applicationsAdmin: string[]
    },
    getCurrentUser: vi.fn(),
  },
}))

vi.mock('valtio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('valtio')>()
  return {
    ...actual,
    useSnapshot: vi.fn((store: unknown) => store),
  }
})

vi.mock('@/store/user', () => ({ userStore: mockUserStore }))

vi.mock('@/pages/settings/administration/projectsManagement/ProjectBudgetsSection', () => ({
  default: (props: any) => {
    projectBudgetsSectionMock(props)
    return <div data-testid="project-budgets-section" data-access={props.access} />
  },
  ProjectBudgetManagementControl: () => <div data-testid="project-budget-management-control" />,
}))

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: () => ({
    push: pushMock,
    params: { projectName: 'Test Project' },
    name: routeState.name,
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

const { costCentersFlag, budgetManagementFlag } = vi.hoisted(() => ({
  costCentersFlag: vi.fn(() => [true, true] as [boolean, boolean]),
  budgetManagementFlag: vi.fn(() => [false, true] as [boolean, boolean]),
}))

vi.mock('@/hooks/useFeatureFlags', () => ({
  useFeatureFlag: (flag: string) =>
    flag === FEATURE_FLAGS.COST_CENTERS ? costCentersFlag() : [true, true],
  useBudgetManagementEnabled: () => budgetManagementFlag(),
  useProjectChargebackEnabled: () => [false, true] as [boolean, boolean],
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
    routeState.name = 'projects-management-overview'
    mockUserStore.user = null
    costCentersFlag.mockReturnValue([true, true])
    projectsStore.getProject = vi.fn().mockResolvedValue(mockProject)
    projectsStore.updateProject = vi.fn().mockResolvedValue(mockProject)
    userStore.user = { isAdmin: true } as any
    userStore.getCurrentUser = vi.fn().mockResolvedValue(userStore.user)
    projectDisplayNamesStore.invalidate = vi.fn()
  })

  it('renders ProjectMembersManager with the loaded project', async () => {
    routeState.name = 'projects-management-members'
    render(<ProjectDetailsPage />)

    await waitFor(() => {
      expect(projectsStore.getProject).toHaveBeenCalledWith('Test Project', true)
    })

    expect(await screen.findByTestId('project-members-manager')).toHaveTextContent('Test Project')
    expect(screen.getByRole('tab', { name: 'Members' })).toHaveAttribute('aria-selected', 'true')
  })

  it('renders Members as a route-level section', async () => {
    routeState.name = 'projects-management-members'
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
    routeState.name = 'projects-management-detail'
  })

  it('renders the no-value placeholder when the project description is null (EPMCDME-14336)', async () => {
    projectsStore.getProject = vi.fn().mockResolvedValue({
      ...mockProject,
      description: null,
    })

    render(<ProjectDetailsPage />)

    const descriptionLabel = await screen.findByText('Description')
    const descriptionSection = descriptionLabel.parentElement
    expect(descriptionSection).toBeTruthy()
    expect(descriptionSection?.textContent).toContain('No description')
  })

  it('explains why Members is unavailable for a personal project', async () => {
    routeState.name = 'projects-management-members'
    projectsStore.getProject = vi.fn().mockResolvedValue({
      ...mockProject,
      project_type: 'personal',
    })

    render(<ProjectDetailsPage />)

    expect(
      await screen.findByText('This section is not available for personal projects.')
    ).toBeInTheDocument()
    expect(projectMembersManagerMock).not.toHaveBeenCalled()

    routeState.name = 'projects-management-detail'
  })

  it('renders project member budget tracking status', async () => {
    render(<ProjectDetailsPage />)

    expect(await screen.findByText('Member spend limits')).toBeInTheDocument()
    expect(screen.getAllByText('Enabled').length).toBeGreaterThan(0)
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

describe('budgetsAccess — project-admin access control (EPMCDME-13962)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routeState.name = 'projects-management-budgets'
    projectsStore.getProject = vi.fn().mockResolvedValue(mockProject)
    budgetManagementFlag.mockReturnValue([true, true])
  })

  it('project admin of this project gets distribution access when flag is on and project is not personal', async () => {
    mockUserStore.user = {
      isAdmin: false,
      isMaintainer: false,
      isAuditor: false,
      applicationsAdmin: ['Test Project'],
    }

    render(<ProjectDetailsPage />)

    await waitFor(() => {
      expect(projectBudgetsSectionMock).toHaveBeenCalled()
    })

    expect(projectBudgetsSectionMock).toHaveBeenCalledWith(
      expect.objectContaining({ access: 'distribution' })
    )
  })

  it('project admin of this project does not see the budget section when project is personal', async () => {
    mockUserStore.user = {
      isAdmin: false,
      isMaintainer: false,
      isAuditor: false,
      applicationsAdmin: ['Test Project'],
    }
    projectsStore.getProject = vi.fn().mockResolvedValue({
      ...mockProject,
      project_type: 'personal',
    })

    render(<ProjectDetailsPage />)

    await waitFor(() => {
      expect(projectsStore.getProject).toHaveBeenCalled()
    })

    expect(screen.queryByTestId('project-budgets-section')).not.toBeInTheDocument()
  })

  it('project admin of a different project does not see the budget section', async () => {
    mockUserStore.user = {
      isAdmin: false,
      isMaintainer: false,
      isAuditor: false,
      applicationsAdmin: ['Other Project'],
    }

    render(<ProjectDetailsPage />)

    await waitFor(() => {
      expect(projectsStore.getProject).toHaveBeenCalled()
    })

    expect(screen.queryByTestId('project-budgets-section')).not.toBeInTheDocument()
  })

  it('platform admin gets distribution access', async () => {
    mockUserStore.user = {
      isAdmin: true,
      isMaintainer: false,
      isAuditor: false,
      applicationsAdmin: [],
    }

    render(<ProjectDetailsPage />)

    await waitFor(() => {
      expect(projectBudgetsSectionMock).toHaveBeenCalled()
    })

    expect(projectBudgetsSectionMock).toHaveBeenCalledWith(
      expect.objectContaining({ access: 'distribution' })
    )
  })

  it('maintainer gets full access', async () => {
    mockUserStore.user = {
      isAdmin: false,
      isMaintainer: true,
      isAuditor: false,
      applicationsAdmin: [],
    }

    render(<ProjectDetailsPage />)

    await waitFor(() => {
      expect(projectBudgetsSectionMock).toHaveBeenCalled()
    })

    expect(projectBudgetsSectionMock).toHaveBeenCalledWith(
      expect.objectContaining({ access: 'full' })
    )
  })

  it('auditor gets view access', async () => {
    mockUserStore.user = {
      isAdmin: false,
      isMaintainer: false,
      isAuditor: true,
      applicationsAdmin: [],
    }

    render(<ProjectDetailsPage />)

    await waitFor(() => {
      expect(projectBudgetsSectionMock).toHaveBeenCalled()
    })

    expect(projectBudgetsSectionMock).toHaveBeenCalledWith(
      expect.objectContaining({ access: 'view' })
    )
  })

  it('regular user does not see the budget section', async () => {
    mockUserStore.user = {
      isAdmin: false,
      isMaintainer: false,
      isAuditor: false,
      applicationsAdmin: [],
    }

    render(<ProjectDetailsPage />)

    await waitFor(() => {
      expect(projectsStore.getProject).toHaveBeenCalled()
    })

    expect(screen.queryByTestId('project-budgets-section')).not.toBeInTheDocument()
  })

  describe('member budget override props (EPMCDME-15234)', () => {
    const lastMembersProps = () => projectMembersManagerMock.mock.calls.at(-1)?.[0]
    const lastSectionProps = () => projectBudgetsSectionMock.mock.calls.at(-1)?.[0]
    const user = (overrides: Partial<NonNullable<typeof mockUserStore.user>>) => ({
      isAdmin: false,
      isMaintainer: false,
      isAuditor: false,
      applicationsAdmin: [] as string[],
      ...overrides,
    })

    // ProjectDetailsPage now renders one tab at a time, so Members and Budgets props
    // can't be observed from the same render — check each tab separately.
    const renderMembersTab = async () => {
      routeState.name = 'projects-management-members'
      render(<ProjectDetailsPage />)
      await waitFor(() => expect(projectMembersManagerMock).toHaveBeenCalled())
    }

    const renderBudgetsTab = async () => {
      routeState.name = 'projects-management-budgets'
      render(<ProjectDetailsPage />)
      await waitFor(() => expect(projectBudgetsSectionMock).toHaveBeenCalled())
    }

    const expectMemberBudgetPropsGranted = async () => {
      expect(Array.isArray(lastMembersProps().budgets)).toBe(true)
      expect(typeof lastMembersProps().onBudgetsChanged).toBe('function')

      vi.clearAllMocks()
      await renderBudgetsTab()
      expect(typeof lastSectionProps().onBudgetsChanged).toBe('function')
    }

    const expectMemberBudgetPropsWithheld = () => {
      expect(lastMembersProps().budgets).toBeUndefined()
      expect(lastMembersProps().onBudgetsChanged).toBeUndefined()
    }

    it('project admin of this project gets member budgets and the override callback', async () => {
      mockUserStore.user = user({ applicationsAdmin: ['Test Project'] })

      await renderMembersTab()
      mockUserStore.user = user({ applicationsAdmin: ['Test Project'] })
      await expectMemberBudgetPropsGranted()
    })

    it('maintainer keeps member budgets and the override callback', async () => {
      mockUserStore.user = user({ isMaintainer: true })

      await renderMembersTab()
      mockUserStore.user = user({ isMaintainer: true })
      await expectMemberBudgetPropsGranted()
    })

    it('regular user does not get member budgets', async () => {
      mockUserStore.user = user({})

      await renderMembersTab()
      expectMemberBudgetPropsWithheld()
    })

    it('project admin of a different project does not get member budgets', async () => {
      mockUserStore.user = user({ applicationsAdmin: ['Other Project'] })

      await renderMembersTab()
      expectMemberBudgetPropsWithheld()
    })

    it('super admin who is not a maintainer does not get member budgets but keeps distribution access', async () => {
      mockUserStore.user = user({ isAdmin: true })

      await renderMembersTab()
      expectMemberBudgetPropsWithheld()

      vi.clearAllMocks()
      mockUserStore.user = user({ isAdmin: true })
      await renderBudgetsTab()
      expect(lastSectionProps().onBudgetsChanged).toBeUndefined()
      expect(lastSectionProps().access).toBe('distribution')
    })

    it('grants member budgets when the project admin user resolves after the project loads', async () => {
      mockUserStore.user = null
      routeState.name = 'projects-management-members'

      const { rerender } = render(<ProjectDetailsPage />)

      await waitFor(() => expect(projectMembersManagerMock).toHaveBeenCalled())
      expect(lastMembersProps().onBudgetsChanged).toBeUndefined()

      mockUserStore.user = user({ applicationsAdmin: ['Test Project'] })
      rerender(<ProjectDetailsPage />)

      await waitFor(() => {
        expect(Array.isArray(lastMembersProps().budgets)).toBe(true)
        expect(typeof lastMembersProps().onBudgetsChanged).toBe('function')
      })
    })
  })
})
