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
import { projectsStore } from '@/store/projects'
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

vi.mock('@/pages/settings/administration/projectsManagement/ProjectModal', () => ({
  default: () => <div data-testid="project-modal" />,
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
  members: [],
}

describe('ProjectDetailsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    projectsStore.getProject = vi.fn().mockResolvedValue(mockProject)
    projectsStore.updateProject = vi.fn().mockResolvedValue(mockProject)
  })

  it('renders ProjectMembersManager with the loaded project', async () => {
    render(<ProjectDetailsPage />)

    await waitFor(() => {
      expect(projectsStore.getProject).toHaveBeenCalledWith('Test Project')
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
    expect(projectsStore.getProject).toHaveBeenNthCalledWith(2, 'Test Project')
  })
})
