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

import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'

import { renderPage, mockAPI } from '@/test-utils/integration'

describe('ProjectSettings - Pagination', () => {
  const mockAdminSetup = () => {
    mockAPI('GET', 'v1/user', {
      user_id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      username: 'testuser',
      is_admin: true,
      is_maintainer: false,
      user_type: 'INTERNAL',
      applications: [],
    })
    mockAPI('GET', 'v1/settings/user', {
      data: [],
      pagination: { page: 0, per_page: 10, pages: 0, total: 0 },
    })
    mockAPI('GET', 'v1/settings/project/users', [])
  }

  const switchToProjectTab = async () => {
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Project' })).toBeInTheDocument()
    })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Project' }))
  }

  const createProjectSettingFixture = (overrides = {}) => ({
    user_id: 'test-user-id',
    id: 'setting-1',
    date: '2024-01-01T00:00:00Z',
    alias: 'Setting 1',
    credential_type: 'jira',
    update_date: '2024-01-01T00:00:00Z',
    project_name: 'test-project',
    display_name: null,
    default: false,
    credential_values: [],
    setting_hash: null,
    is_global: false,
    setting_type: 'project',
    ...overrides,
  })

  const createProjectSettings = (count: number, prefix = 'Setting') =>
    Array.from({ length: count }, (_, i) =>
      createProjectSettingFixture({
        id: `setting-${i + 1}`,
        alias: `${prefix} ${i + 1}`,
      })
    )

  it('shows next page of project settings when pagination button is clicked', async () => {
    mockAdminSetup()
    mockAPI('GET', 'v1/settings/project', {
      data: createProjectSettings(25),
      pagination: { page: 0, per_page: 10, pages: 3, total: 25 },
    })

    renderPage('/integrations')
    await switchToProjectTab()

    await waitFor(() => {
      expect(screen.getByText('Setting 1')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument()
    })

    mockAPI('GET', 'v1/settings/project', {
      data: createProjectSettings(25).slice(10, 20),
      pagination: { page: 1, per_page: 10, pages: 3, total: 25 },
    })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Page 2' }))

    await waitFor(() => {
      expect(screen.getByText('Setting 11')).toBeInTheDocument()
      expect(screen.queryByText('Setting 1')).not.toBeInTheDocument()
    })
  })

  it('reloads project settings when per-page selection changes', async () => {
    mockAdminSetup()
    mockAPI('GET', 'v1/settings/project', {
      data: createProjectSettings(25),
      pagination: { page: 0, per_page: 10, pages: 3, total: 25 },
    })

    renderPage('/integrations')
    await switchToProjectTab()

    await waitFor(() => {
      expect(screen.getByText('Setting 1')).toBeInTheDocument()
    })

    mockAPI('GET', 'v1/settings/project', {
      data: [createProjectSettingFixture({ id: 'setting-perpage', alias: 'Setting PerPage' })],
      pagination: { page: 0, per_page: 20, pages: 2, total: 25 },
    })

    const perPageSelect = document.getElementById('per-page') as HTMLElement
    fireEvent.click(perPageSelect)
    fireEvent.click(screen.getByLabelText('20 items'))

    await waitFor(() => {
      expect(screen.getByText('Setting PerPage')).toBeInTheDocument()
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('per_page=20'),
      expect.anything()
    )
  })

  it('does not show pagination buttons when project settings fit on one page', async () => {
    mockAdminSetup()
    mockAPI('GET', 'v1/settings/project', {
      data: createProjectSettings(6),
      pagination: { page: 0, per_page: 10, pages: 1, total: 6 },
    })

    renderPage('/integrations')
    await switchToProjectTab()

    await waitFor(() => {
      expect(screen.getByText('Setting 1')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Page 2' })).not.toBeInTheDocument()
    })
  })

  it('Previous page button absent on first page', async () => {
    mockAdminSetup()
    mockAPI('GET', 'v1/settings/project', {
      data: createProjectSettings(25),
      pagination: { page: 0, per_page: 10, pages: 3, total: 25 },
    })

    renderPage('/integrations')
    await switchToProjectTab()

    await waitFor(() => {
      expect(screen.getByText('Setting 1')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument()
  })

  it('Next page button absent on last page', async () => {
    mockAdminSetup()
    mockAPI('GET', 'v1/settings/project', {
      data: createProjectSettings(25).slice(20, 25),
      pagination: { page: 2, per_page: 10, pages: 3, total: 25 },
    })

    renderPage('/integrations')
    await switchToProjectTab()

    await waitFor(() => {
      expect(screen.getByText('Setting 25')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument()
  })
})
