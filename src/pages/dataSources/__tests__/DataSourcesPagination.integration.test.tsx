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
import { afterEach, beforeEach, describe, it, expect } from 'vitest'

import { renderPage, mockAPI } from '@/test-utils/integration'

describe('DataSourcesPage - Pagination', () => {
  // DataSourcesPage self-reschedules its status refresh via setTimeout after
  // each fetch resolves. If a fetch is still in flight when a test ends and
  // RTL tears the component down, the resolution can reschedule one more
  // timer that nothing clears — it later fires against a torn-down jsdom
  // environment (e.g. `ReferenceError: localStorage is not defined`) and can
  // crash an unrelated, later-running test. Track every real timer created
  // during each test here and force-clear it afterward so none can leak past
  // this file's teardown, regardless of how the component schedules them.
  const originalSetTimeout = global.setTimeout
  let pendingTimeoutIds: NodeJS.Timeout[] = []

  beforeEach(() => {
    pendingTimeoutIds = []
    global.setTimeout = ((
      handler: Parameters<typeof setTimeout>[0],
      timeout?: number,
      ...args: unknown[]
    ) => {
      const id = originalSetTimeout(handler, timeout, ...args) as unknown as NodeJS.Timeout
      pendingTimeoutIds.push(id)
      return id
    }) as typeof setTimeout
  })

  afterEach(() => {
    global.setTimeout = originalSetTimeout
    pendingTimeoutIds.forEach((id) => clearTimeout(id))
  })

  const mockIndexUsers = () => mockAPI('GET', 'v1/index/users', [])

  const createDataSourceFixture = (overrides = {}) => ({
    id: 'ds-1',
    project_name: 'test-project',
    repo_name: 'DataSource 1',
    index_type: 'confluence',
    created_by: { id: 'user-1', email: 'user1@example.com', name: 'User One', username: 'user1' },
    project_space_visible: true,
    link: null,
    date: '2024-01-01T00:00:00Z',
    update_date: '2024-01-01T00:00:00Z',
    text: '',
    full_name: 'DataSource 1',
    current_state: 0,
    complete_state: 0,
    current__chunks_state: 0,
    error: false,
    completed: true,
    is_fetching: false,
    is_queued: false,
    user_abilities: [],
    jira: { jql: '' },
    xray: { jql: '' },
    ...overrides,
  })

  const createDataSources = (count: number, prefix = 'DataSource') =>
    Array.from({ length: count }, (_, i) =>
      createDataSourceFixture({
        id: `ds-${i + 1}`,
        repo_name: `${prefix} ${i + 1}`,
      })
    )

  it('shows next page of data sources when pagination button is clicked', async () => {
    mockIndexUsers()
    mockAPI('GET', 'v1/index', {
      data: createDataSources(25),
      pagination: { page: 0, per_page: 10, pages: 3, total: 25 },
    })

    renderPage('/data-sources')

    await waitFor(() => {
      expect(screen.getByText('DataSource 1')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument()
    })

    mockAPI('GET', 'v1/index', {
      data: createDataSources(25).slice(10, 20),
      pagination: { page: 1, per_page: 10, pages: 3, total: 25 },
    })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Page 2' }))

    await waitFor(() => {
      expect(screen.getByText('DataSource 11')).toBeInTheDocument()
      expect(screen.queryByText('DataSource 1')).not.toBeInTheDocument()
    })
  })

  it('reloads data sources when per-page selection changes', async () => {
    mockIndexUsers()
    mockAPI('GET', 'v1/index', {
      data: createDataSources(25),
      pagination: { page: 0, per_page: 10, pages: 3, total: 25 },
    })

    renderPage('/data-sources')

    await waitFor(() => {
      expect(screen.getByText('DataSource 1')).toBeInTheDocument()
    })

    mockAPI('GET', 'v1/index', {
      data: [createDataSourceFixture({ id: 'ds-perpage', repo_name: 'DataSource PerPage' })],
      pagination: { page: 0, per_page: 20, pages: 2, total: 25 },
    })

    const perPageSelect = document.getElementById('per-page') as HTMLElement
    fireEvent.click(perPageSelect)
    fireEvent.click(screen.getByLabelText('20 items'))

    await waitFor(() => {
      expect(screen.getByText('DataSource PerPage')).toBeInTheDocument()
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('per_page=20'),
      expect.anything()
    )
  })

  it('does not show pagination buttons when data sources fit on one page', async () => {
    mockIndexUsers()
    mockAPI('GET', 'v1/index', {
      data: createDataSources(6),
      pagination: { page: 0, per_page: 10, pages: 1, total: 6 },
    })

    renderPage('/data-sources')

    await waitFor(() => {
      expect(screen.getByText('DataSource 1')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Page 2' })).not.toBeInTheDocument()
    })
  })

  it('Previous page button absent on first page', async () => {
    mockIndexUsers()
    mockAPI('GET', 'v1/index', {
      data: createDataSources(25),
      pagination: { page: 0, per_page: 10, pages: 3, total: 25 },
    })

    renderPage('/data-sources')

    await waitFor(() => {
      expect(screen.getByText('DataSource 1')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument()
  })

  it('Next page button absent on last page', async () => {
    mockIndexUsers()
    mockAPI('GET', 'v1/index', {
      data: createDataSources(25).slice(20, 25),
      pagination: { page: 2, per_page: 10, pages: 3, total: 25 },
    })

    renderPage('/data-sources')

    await waitFor(() => {
      expect(screen.getByText('DataSource 25')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument()
  })
})
