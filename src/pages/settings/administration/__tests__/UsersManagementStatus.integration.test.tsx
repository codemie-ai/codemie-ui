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

import { screen, fireEvent, waitFor, within } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Import order matters: see UsersManagementSpending.integration.test.tsx.
// eslint-disable-next-line import/order
import { mockAPI, renderPage } from '@/test-utils/integration'
import { clearSpendingCache } from '@/pages/settings/administration/usersManagement/components/UserProjectSpendingTable'
import { userStore } from '@/store/user'
import { getSelectedDropdownValue, selectDropdownOption } from '@/test-utils/component-interactions'
import toaster from '@/utils/toaster'

const USERS_PATH = '/settings/administration/users'

const currentUser = (overrides: Record<string, unknown> = {}) => ({
  user_id: 'admin-1',
  id: 'admin-1',
  email: 'admin@test.com',
  name: 'Admin User',
  username: 'admin',
  is_admin: true,
  is_maintainer: false,
  user_type: 'INTERNAL',
  applications: [],
  projects: [],
  ...overrides,
})

const listUser = (id: string, name: string, is_active: boolean) => ({
  user_id: id,
  id,
  name,
  email: `${name.toLowerCase()}@epam.com`,
  username: name.toLowerCase(),
  is_admin: false,
  is_active,
  user_type: 'INTERNAL',
  applications: [],
  projects: [],
  budget_assignments: [],
})

const usersResponse = (data: unknown[]) => ({
  data,
  pagination: { page: 0, per_page: 10, total: data.length },
})

const listRequests = () =>
  vi
    .mocked(fetch)
    .mock.calls.map(([input]) => String(input instanceof Request ? input.url : input))
    .filter((url) => /v1\/admin\/users\?/.test(url))

const lastListFilters = () => {
  const url = listRequests().at(-1) as string
  const raw = new URL(url, 'http://localhost').searchParams.get('filters')
  return raw ? JSON.parse(raw) : undefined
}

const openRowMenu = async (email: string) => {
  const cell = await screen.findByText(email)
  const row = cell.closest('tr') as HTMLElement
  fireEvent.click(within(row).getByRole('button', { name: /More options/ }))
  return row
}

const chooseStatus = (label: string) => selectDropdownOption('Status', label)

describe('UsersManagementPage — user status (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    clearSpendingCache()
    mockAPI('GET', 'v1/user', currentUser())
    mockAPI('GET', 'v1/admin/users', usersResponse([listUser('u-1', 'Alice', true)]))
    mockAPI('GET', 'v1/admin/budgets', { data: [] })
  })

  it('loads all users without an is_active filter and labels deactivated users', async () => {
    mockAPI(
      'GET',
      'v1/admin/users',
      usersResponse([listUser('u-1', 'Alice', true), listUser('u-2', 'Bob', false)])
    )
    renderPage(USERS_PATH)

    const bobRow = (await screen.findByText('bob@epam.com')).closest('tr') as HTMLElement
    expect(within(bobRow).getByText('Deactivated')).toBeInTheDocument()
    const aliceRow = (await screen.findByText('alice@epam.com')).closest('tr') as HTMLElement
    expect(within(aliceRow).queryByText('Deactivated')).not.toBeInTheDocument()
    expect(lastListFilters()?.is_active).toBeUndefined()
  })

  it('sends the chosen status, omits it for All, and restores it after a remount', async () => {
    const { unmount } = renderPage(USERS_PATH)
    await screen.findByText('alice@epam.com')

    await chooseStatus('Deactivated')
    await waitFor(() => expect(lastListFilters()?.is_active).toBe(false))

    unmount()
    renderPage(USERS_PATH)
    await screen.findByText('alice@epam.com')
    expect(lastListFilters()?.is_active).toBe(false)
    expect(await getSelectedDropdownValue('Status')).toBe('Deactivated')

    await chooseStatus('Active')
    await waitFor(() => expect(lastListFilters()?.is_active).toBe(true))

    await chooseStatus('All')
    await waitFor(() => expect(lastListFilters()).toBeUndefined())
    expect(listRequests().at(-1)).not.toContain('is_active')
  })

  it('deactivates a user after confirmation and shows the updated row', async () => {
    mockAPI('DELETE', 'v1/admin/users/u-1', { message: 'deactivated' })
    renderPage(USERS_PATH)
    await openRowMenu('alice@epam.com')

    fireEvent.click(await screen.findByRole('menuitem', { name: 'Deactivate user' }))
    expect(await screen.findByText(/Are you sure you want to deactivate Alice/)).toBeInTheDocument()

    mockAPI('GET', 'v1/admin/users', usersResponse([listUser('u-1', 'Alice', false)]))
    const before = listRequests().length
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }))

    await waitFor(() => expect(listRequests().length).toBeGreaterThan(before))
    const row = (await screen.findByText('alice@epam.com')).closest('tr') as HTMLElement
    await waitFor(() => expect(within(row).getByText('Deactivated')).toBeInTheDocument())
    expect(toaster.info).toHaveBeenCalledWith('User deactivated successfully')
  })

  it('reactivates a deactivated user after confirmation', async () => {
    mockAPI('GET', 'v1/admin/users', usersResponse([listUser('u-2', 'Bob', false)]))
    mockAPI('POST', 'v1/admin/users/u-2/reactivate', listUser('u-2', 'Bob', true))
    renderPage(USERS_PATH)
    await openRowMenu('bob@epam.com')

    fireEvent.click(await screen.findByRole('menuitem', { name: 'Reactivate user' }))
    mockAPI('GET', 'v1/admin/users', usersResponse([listUser('u-2', 'Bob', true)]))
    fireEvent.click(await screen.findByRole('button', { name: 'Reactivate' }))

    await waitFor(() => expect(toaster.info).toHaveBeenCalledWith('User reactivated successfully'))
    const row = (await screen.findByText('bob@epam.com')).closest('tr') as HTMLElement
    await waitFor(() => expect(within(row).queryByText('Deactivated')).not.toBeInTheDocument())
  })

  it('toasts the backend message and leaves the list untouched when deactivation fails', async () => {
    mockAPI(
      'DELETE',
      'v1/admin/users/u-1',
      { error: { message: 'Cannot deactivate the last super admin' } },
      403
    )
    renderPage(USERS_PATH)
    await openRowMenu('alice@epam.com')
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Deactivate user' }))
    await screen.findByText(/Are you sure you want to deactivate Alice/)
    const before = listRequests().length

    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }))

    await waitFor(() =>
      expect(toaster.error).toHaveBeenCalledWith('Cannot deactivate the last super admin')
    )
    await waitFor(() =>
      expect(screen.queryByText(/Are you sure you want to deactivate/)).not.toBeInTheDocument()
    )
    expect(listRequests().length).toBe(before)
    expect(toaster.info).not.toHaveBeenCalledWith('User deactivated successfully')
  })

  it('offers no actions to an auditor', async () => {
    mockAPI('GET', 'v1/user', currentUser({ is_admin: false, is_auditor: true }))
    renderPage(USERS_PATH)
    const row = (await screen.findByText('alice@epam.com')).closest('tr') as HTMLElement

    fireEvent.click(within(row).getByRole('button', { name: /More options/ }))
    expect(await screen.findByRole('menuitem', { name: 'View details' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /activate user/ })).not.toBeInTheDocument()
  })

  it('does not offer Deactivate on the signed-in user own row', async () => {
    mockAPI(
      'GET',
      'v1/admin/users',
      usersResponse([
        { ...listUser('admin-1', 'Admin', true), email: 'admin@test.com' },
        listUser('u-1', 'Alice', true),
      ])
    )
    renderPage(USERS_PATH)

    await openRowMenu('admin@test.com')
    expect(await screen.findByRole('menuitem', { name: 'View details' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Deactivate user' })).not.toBeInTheDocument()
  })

  it('restricts picker searches to active users', async () => {
    mockAPI('GET', 'v1/admin/users', usersResponse([listUser('u-1', 'Alice', true)]))

    await userStore.searchUsers('ali', 10)

    expect(lastListFilters()).toEqual({ is_active: true })
    expect(listRequests().at(-1)).toContain('search=ali')
  })
})
