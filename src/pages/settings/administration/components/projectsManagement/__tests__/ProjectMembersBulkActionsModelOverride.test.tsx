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

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ProjectMembersBulkActions from '@/pages/settings/administration/components/projectsManagement/ProjectMembersBulkActions'
import { UserListItem } from '@/types/entity/user'

vi.mock('@/utils/toaster', () => ({
  default: { info: vi.fn(), error: vi.fn(), success: vi.fn() },
}))

const buildUser = (id: string, name: string): UserListItem =>
  ({
    id,
    name,
    username: name,
    email: `${id}@epam.com`,
    is_admin: false,
    is_active: true,
    user_type: 'INTERNAL',
    auth_source: 'local',
    last_login_at: null,
    projects: [],
    picture: null,
    date: null,
  } as unknown as UserListItem)

const baseProps = {
  projectName: 'Test Project',
  selectedUsers: [buildUser('u-1', 'User One')],
  currentUserId: 'admin-1',
  isProjectAdmin: false,
  canManageBudgets: false,
  onClearSelection: vi.fn(),
  refresh: vi.fn(),
  budgets: [],
  budgetAllocationLookup: null,
}

const openBulkActionsMenu = () => {
  fireEvent.click(screen.getByText('Bulk Actions'))
}

describe('ProjectMembersBulkActions — Override models gating', () => {
  afterEach(cleanup)

  it('shows "Override models" when isUserModelOverrideEnabled is true', () => {
    render(
      <ProjectMembersBulkActions
        {...baseProps}
        canManageProject
        isUserModelOverrideEnabled
        onOverrideModels={vi.fn()}
      />
    )
    openBulkActionsMenu()
    expect(screen.getByText('Override models')).toBeInTheDocument()
  })

  it('hides "Override models" when isUserModelOverrideEnabled is false', () => {
    render(
      <ProjectMembersBulkActions
        {...baseProps}
        canManageProject
        isUserModelOverrideEnabled={false}
        onOverrideModels={vi.fn()}
      />
    )
    openBulkActionsMenu()
    expect(screen.queryByText('Override models')).not.toBeInTheDocument()
  })

  it('renders nothing when canManageProject is false', () => {
    const { container } = render(
      <ProjectMembersBulkActions
        {...baseProps}
        canManageProject={false}
        isUserModelOverrideEnabled
        onOverrideModels={vi.fn()}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the bulk actions bar when canManageProject is true', () => {
    render(
      <ProjectMembersBulkActions
        {...baseProps}
        canManageProject
        isUserModelOverrideEnabled
        onOverrideModels={vi.fn()}
      />
    )
    expect(screen.getByText('Bulk Actions')).toBeInTheDocument()
  })

  it('invokes onOverrideModels when "Override models" is clicked', () => {
    const onOverrideModels = vi.fn()
    render(
      <ProjectMembersBulkActions
        {...baseProps}
        canManageProject
        isUserModelOverrideEnabled
        onOverrideModels={onOverrideModels}
      />
    )
    openBulkActionsMenu()
    fireEvent.click(screen.getByText('Override models'))
    expect(onOverrideModels).toHaveBeenCalledTimes(1)
  })
})
