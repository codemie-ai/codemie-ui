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

import { UserListItem } from '@/types/entity/user'

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

vi.mock('../popups/AddProjectPopup', () => ({
  default: ({ onAdd }: any) => (
    <>
      <button data-testid="trigger-add-default" onClick={() => onAdd('proj-c', true)}>
        trigger add with default
      </button>
      <button data-testid="trigger-add-no-default" onClick={() => onAdd('proj-d', false)}>
        trigger add without default
      </button>
    </>
  ),
}))

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

describe('UserProjectsTable — default project toggle (EPMCDME-15112)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders a default marker on the project that is currently default', () => {
    const user = makeUser([
      { name: 'proj-a', is_project_admin: false, is_default: true },
      { name: 'proj-b', is_project_admin: false, is_default: false },
    ])

    render(<UserProjectsTable user={user} canManageProjects />)

    const rowA = screen.getByText('proj-a').closest('tr')
    const rowB = screen.getByText('proj-b').closest('tr')
    expect(
      (rowA?.querySelector('[data-testid="default-toggle"] input') as HTMLInputElement)?.checked
    ).toBe(true)
    expect(
      (rowB?.querySelector('[data-testid="default-toggle"] input') as HTMLInputElement)?.checked
    ).toBe(false)
  })

  it('clicking the already-default row is a no-op', () => {
    const user = makeUser([
      { name: 'proj-a', is_project_admin: false, is_default: true },
      { name: 'proj-b', is_project_admin: false, is_default: false },
    ])

    render(<UserProjectsTable user={user} canManageProjects />)

    const rowA = screen.getByText('proj-a').closest('tr') as HTMLElement
    fireEvent.click(rowA.querySelector('[data-testid="default-toggle"]') as HTMLElement)

    expect(mockUserStore.setDefaultProject).not.toHaveBeenCalled()
  })

  it('optimistically flips both rows while the request is in flight, then calls onProjectsChange on success', async () => {
    let resolveSetDefault: () => void = () => {}
    mockUserStore.setDefaultProject.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveSetDefault = resolve
      })
    )
    const onProjectsChange = vi.fn()
    const user = makeUser([
      { name: 'proj-a', is_project_admin: false, is_default: true },
      { name: 'proj-b', is_project_admin: false, is_default: false },
    ])

    render(<UserProjectsTable user={user} canManageProjects onProjectsChange={onProjectsChange} />)

    const rowB = screen.getByText('proj-b').closest('tr') as HTMLElement
    fireEvent.click(rowB.querySelector('[data-testid="default-toggle"]') as HTMLElement)

    await waitFor(() =>
      expect(mockUserStore.setDefaultProject).toHaveBeenCalledWith('target-1', 'proj-b')
    )

    // While the request is still pending, the optimistic flip is visible on both rows.
    const rowA = screen.getByText('proj-a').closest('tr')
    expect(
      (rowA?.querySelector('[data-testid="default-toggle"] input') as HTMLInputElement)?.checked
    ).toBe(false)
    expect(
      (rowB.querySelector('[data-testid="default-toggle"] input') as HTMLInputElement)?.checked
    ).toBe(true)

    resolveSetDefault()

    await waitFor(() => expect(onProjectsChange).toHaveBeenCalled())
  })

  it('rolls back both rows if the API call fails', async () => {
    mockUserStore.setDefaultProject.mockRejectedValue(new Error('boom'))
    const user = makeUser([
      { name: 'proj-a', is_project_admin: false, is_default: true },
      { name: 'proj-b', is_project_admin: false, is_default: false },
    ])

    render(<UserProjectsTable user={user} canManageProjects />)

    const rowB = screen.getByText('proj-b').closest('tr') as HTMLElement
    fireEvent.click(rowB.querySelector('[data-testid="default-toggle"]') as HTMLElement)

    await waitFor(() => expect(mockUserStore.setDefaultProject).toHaveBeenCalled())

    await waitFor(() => {
      const rowA = screen.getByText('proj-a').closest('tr')
      expect(
        (rowA?.querySelector('[data-testid="default-toggle"] input') as HTMLInputElement)?.checked
      ).toBe(true)
      expect(
        (rowB.querySelector('[data-testid="default-toggle"] input') as HTMLInputElement)?.checked
      ).toBe(false)
    })
  })

  it('disables the toggle when canManageProjects is false', () => {
    const user = makeUser([{ name: 'proj-a', is_project_admin: false, is_default: false }])

    render(<UserProjectsTable user={user} canManageProjects={false} />)

    const toggle = screen.getByTestId('default-toggle').querySelector('input')
    expect(toggle).toBeDisabled()
  })

  it('chains setDefaultProject after adding a project with the default switch on', async () => {
    mockUserStore.addUserProjectAccess.mockResolvedValue(undefined)
    mockUserStore.setDefaultProject.mockResolvedValue(undefined)
    const user = makeUser([{ name: 'proj-a', is_project_admin: false, is_default: true }])

    render(<UserProjectsTable user={user} canManageProjects />)

    fireEvent.click(screen.getByTestId('trigger-add-default'))

    await waitFor(() =>
      expect(mockUserStore.addUserProjectAccess).toHaveBeenCalledWith('target-1', 'proj-c', false)
    )
    await waitFor(() =>
      expect(mockUserStore.setDefaultProject).toHaveBeenCalledWith('target-1', 'proj-c')
    )
  })

  it('resyncs the table when the project is added but setting it as default fails', async () => {
    mockUserStore.addUserProjectAccess.mockResolvedValue(undefined)
    mockUserStore.setDefaultProject.mockRejectedValue(new Error('boom'))
    const onProjectsChange = vi.fn()
    const user = makeUser([{ name: 'proj-a', is_project_admin: false, is_default: true }])

    render(<UserProjectsTable user={user} canManageProjects onProjectsChange={onProjectsChange} />)

    fireEvent.click(screen.getByTestId('trigger-add-default'))

    await waitFor(() =>
      expect(mockUserStore.setDefaultProject).toHaveBeenCalledWith('target-1', 'proj-c')
    )
    await waitFor(() => expect(onProjectsChange).toHaveBeenCalledTimes(1))
  })

  it('does not resync when adding the project itself fails', async () => {
    mockUserStore.addUserProjectAccess.mockRejectedValue(new Error('boom'))
    const onProjectsChange = vi.fn()
    const user = makeUser([{ name: 'proj-a', is_project_admin: false, is_default: true }])

    render(<UserProjectsTable user={user} canManageProjects onProjectsChange={onProjectsChange} />)

    fireEvent.click(screen.getByTestId('trigger-add-default'))

    await waitFor(() => expect(mockUserStore.addUserProjectAccess).toHaveBeenCalled())
    expect(mockUserStore.setDefaultProject).not.toHaveBeenCalled()
    expect(onProjectsChange).not.toHaveBeenCalled()
  })

  it('gives the default toggle an accessible name', () => {
    const user = makeUser([
      { name: 'proj-a', is_project_admin: false, is_default: true },
      { name: 'proj-b', is_project_admin: false, is_default: false },
    ])

    render(<UserProjectsTable user={user} canManageProjects />)

    expect(screen.getByRole('radio', { name: 'Default project' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Set as default project' })).toBeInTheDocument()
  })

  it('does not call setDefaultProject when the add dialog default switch is off', async () => {
    mockUserStore.addUserProjectAccess.mockResolvedValue(undefined)
    const user = makeUser([{ name: 'proj-a', is_project_admin: false, is_default: true }])

    render(<UserProjectsTable user={user} canManageProjects />)

    fireEvent.click(screen.getByTestId('trigger-add-no-default'))

    await waitFor(() =>
      expect(mockUserStore.addUserProjectAccess).toHaveBeenCalledWith('target-1', 'proj-d', false)
    )
    expect(mockUserStore.setDefaultProject).not.toHaveBeenCalled()
  })
})
