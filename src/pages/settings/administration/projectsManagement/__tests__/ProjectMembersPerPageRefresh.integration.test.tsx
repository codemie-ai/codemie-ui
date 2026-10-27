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

// Import order matters: @/test-utils/integration must evaluate BEFORE @/store/* imports.
// eslint-disable-next-line import/order
import { mockAPI } from '@/test-utils/integration'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, it, expect, vi } from 'vitest'

import ProjectDetailsPage from '@/pages/settings/administration/ProjectDetailsPage'
import { projectsStore } from '@/store/projects'
import { userStore } from '@/store/user'

// The global useVueRouter mock has empty params/name; give the page its Members route.
vi.mock('@/hooks/useVueRouter', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>()
  return {
    ...original,
    useVueRouter: vi.fn(() => ({
      path: '/settings/administration/projects/Alpha/members',
      name: 'projects-management-members',
      params: { projectName: 'Alpha' },
      query: {},
      hash: '',
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
      resolve: vi.fn(() => ({ fullPath: '/', path: '/', href: '/', searchParamsString: '' })),
      currentRoute: { value: { path: '/', name: '', params: {}, query: {}, hash: '' } },
    })),
  }
})

const PROJECT = 'Alpha'

const buildMember = (i: number) => ({
  id: `u-${i}`,
  name: `Member ${i}`,
  username: `member${i}`,
  email: `member${i}@epam.com`,
  is_admin: false,
  is_active: true,
  user_type: 'INTERNAL',
  auth_source: 'local',
  last_login_at: null,
  projects: [{ name: PROJECT, is_project_admin: false }],
  picture: null,
  date: null,
})

const members = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => buildMember(from + i))

const projectResponse = (userCount: number) => ({
  name: PROJECT,
  description: '',
  project_type: 'shared',
  created_by: 'owner-1',
  created_at: '2026-01-01T00:00:00Z',
  user_count: userCount,
  admin_count: 1,
  cost_center_id: null,
  cost_center_name: null,
  enforce_member_spend_limits: false,
  members: [],
})

const usersPage = (data: unknown[], perPage: number, total: number) => ({
  data,
  pagination: { page: 0, per_page: perPage, total },
})

const userRequests = () =>
  (global.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls
    .map((call) => String(call[0]))
    .filter((url) => url.includes('v1/admin/users?'))

const projectRequests = () =>
  (global.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls
    .map((call) => String(call[0]))
    .filter((url) => url.includes(`v1/projects/${PROJECT}?`))

describe('ProjectDetailsPage Members - page size survives member actions (EPMCDME-16408)', () => {
  it('keeps the chosen page size and the table mounted after unassigning a member', async () => {
    mockAPI('GET', 'v1/user', {
      user_id: 'admin-1',
      email: 'admin@example.com',
      name: 'Admin',
      username: 'admin',
      is_admin: true,
      is_maintainer: false,
      user_type: 'INTERNAL',
      applications: [],
    })
    userStore.user = { userId: 'admin-1', isAdmin: true } as never
    mockAPI('GET', `v1/projects/${PROJECT}`, projectResponse(25))
    mockAPI('GET', 'v1/admin/users', usersPage(members(1, 10), 10, 25), { per_page: 10 })

    render(
      <MemoryRouter>
        <ProjectDetailsPage />
      </MemoryRouter>
    )

    await screen.findByText('Member 1')

    mockAPI('GET', 'v1/admin/users', usersPage(members(1, 20), 20, 25), { per_page: 20 })
    fireEvent.click(document.getElementById('per-page') as HTMLElement)
    fireEvent.click(screen.getByLabelText('20 items'))

    await screen.findByText('Member 20')
    expect(document.getElementById('per-page')).toHaveTextContent('20')

    // Post-action API state: member 3 is gone, list and total reflect it, page size stays 20.
    mockAPI('DELETE', `v1/projects/${PROJECT}/assignment/u-3`, {})
    mockAPI('GET', `v1/projects/${PROJECT}`, projectResponse(24))
    mockAPI('GET', 'v1/admin/users', usersPage([...members(1, 2), ...members(4, 21)], 20, 24), {
      per_page: 20,
    })

    // Real network latency: with instant mocks React batches the loading flag away and the
    // spinner swap is never observable.
    const realGetProject = projectsStore.getProject.bind(projectsStore)
    vi.spyOn(projectsStore, 'getProject').mockImplementation(async (...args) => {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 50)
      })
      return realGetProject(...args)
    })
    const selectBefore = document.getElementById('per-page')
    const projectRequestsBefore = projectRequests().length
    const user = userEvent.setup()
    const kebab = document.querySelector('button[aria-labelledby$="user-more-u-3"]') as HTMLElement
    await user.click(kebab)
    await user.click(await screen.findByRole('menuitem', { name: /unassign from project/i }))
    await user.click(await screen.findByRole('button', { name: 'Unassign' }))

    // The list refetch lands first; wait for the follow-up background project refresh to
    // finish too, since that is the step that used to swap the table for the spinner.
    await waitFor(() => expect(projectRequests().length).toBeGreaterThan(projectRequestsBefore))
    await act(async () => {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 200)
      })
    })

    expect(screen.queryByText('Member 3')).not.toBeInTheDocument()
    expect(await screen.findByText('Member 21')).toBeInTheDocument()

    expect(screen.queryByText('24 project members')).not.toBeNull()
    expect(document.getElementById('per-page')).toBe(selectBefore)
    expect(document.getElementById('per-page')).toHaveTextContent('20')
    expect(userRequests().at(-1)).toContain('per_page=20')
    expect(userRequests().at(-1)).toContain('page=0')
  })
})
