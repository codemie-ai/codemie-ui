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

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { UserAssignedProject, UserListItem } from '@/types/entity/user'

import UserProjectsTable from '../UserProjectsTable'

const { mockUserStore } = vi.hoisted(() => ({
  mockUserStore: {
    addUserProjectAccess: vi.fn(),
    updateUserProjectAccess: vi.fn(),
    removeUserProjectAccess: vi.fn(),
    setDefaultProject: vi.fn(),
  },
}))
vi.mock('@/store/user', () => ({ userStore: mockUserStore }))
vi.mock('../popups/AddProjectPopup', () => ({ default: () => null }))
vi.mock('@/components/ConfirmationModal', () => ({
  default: ({ visible, confirmText, onConfirm }: any) =>
    visible ? <button onClick={onConfirm}>{`confirm ${confirmText}`}</button> : null,
}))
vi.mock('@/components/form/Select', () => ({
  default: ({ id, value, onChange, options }: any) => (
    <select data-testid={id} value={value} onChange={(e) => onChange({ value: e.target.value })}>
      {options.map((o: any) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}))

const PROJECTS: UserAssignedProject[] = [
  { name: 'proj-a', is_project_admin: false, is_default: true },
  { name: 'proj-b', is_project_admin: false, is_default: false },
]

const makeUser = (projects: UserListItem['projects']): UserListItem => ({
  id: 'target-1',
  name: 'Target User',
  username: 'target',
  email: 'target@example.com',
  is_admin: false,
  is_active: true,
  user_type: 'regular',
  auth_source: 'internal',
  last_login_at: null,
  projects,
  picture: null,
  date: null,
})

// The details popup refreshes in place after each change (EPMCDME-15747), so every change must
// hand it the confirmed update: without one the old row or role shows until the refetch lands.
describe('UserProjectsTable — confirmed changes reach the details popup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes the removal to onProjectsChange', async () => {
    mockUserStore.removeUserProjectAccess.mockResolvedValue(undefined)
    const onProjectsChange = vi.fn()
    render(
      <UserProjectsTable
        user={makeUser(PROJECTS)}
        canManageProjects
        onProjectsChange={onProjectsChange}
      />
    )

    const rowB = screen.getByText('proj-b').closest('tr') as HTMLElement
    fireEvent.click(rowB.querySelector('button') as HTMLElement)
    fireEvent.click(screen.getByText('confirm Unassign'))

    await waitFor(() => expect(onProjectsChange).toHaveBeenCalledTimes(1))
    const update = onProjectsChange.mock.calls[0][0]
    expect(update(PROJECTS).map((p: UserAssignedProject) => p.name)).toEqual(['proj-a'])
  })

  it('passes the role change to onProjectsChange', async () => {
    mockUserStore.updateUserProjectAccess.mockResolvedValue(undefined)
    const onProjectsChange = vi.fn()
    render(
      <UserProjectsTable
        user={makeUser(PROJECTS)}
        canManageProjects
        onProjectsChange={onProjectsChange}
      />
    )

    fireEvent.change(screen.getByTestId('role-proj-b'), { target: { value: 'administrator' } })
    fireEvent.click(screen.getByText('confirm Change Role'))

    await waitFor(() => expect(onProjectsChange).toHaveBeenCalledTimes(1))
    const update = onProjectsChange.mock.calls[0][0]
    expect(update(PROJECTS)).toEqual([
      PROJECTS[0],
      { name: 'proj-b', is_project_admin: true, is_default: false },
    ])
  })
})
