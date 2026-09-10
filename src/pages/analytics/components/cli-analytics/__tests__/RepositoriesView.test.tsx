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

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { AnalyticsQueryParams } from '@/types/analytics'
import type { ExtendedSessionsTarget, RepositoryRow } from '@/types/cliAnalytics'

import { useCliAnalyticsRepositories } from '../hooks/useCliAnalyticsRepositories'
import RepositoriesView from '../views/RepositoriesView'

vi.mock('../hooks/useCliAnalyticsRepositories')

vi.mock('../views/ExtendedSessionsModal', () => ({
  default: ({
    target,
    isVisible,
  }: {
    target: ExtendedSessionsTarget
    isVisible: boolean
    onHide: () => void
  }) => (isVisible ? <div data-testid="sessions-modal">{target.title}</div> : null),
}))

vi.mock('../../AnalyticsWidget', () => ({
  default: ({
    title,
    children,
    error,
  }: {
    title: string
    children: React.ReactNode
    error?: { message: string } | null
  }) => (
    <div data-testid={`widget-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <h3>{title}</h3>
      {error && <span data-testid="widget-error">{error.message}</span>}
      {children}
    </div>
  ),
}))

const MOCK_FILTERS: AnalyticsQueryParams = { start_date: '2026-07-01', end_date: '2026-07-17' }

const MOCK_ROWS: RepositoryRow[] = [
  {
    repository: 'repo-a',
    branch: 'main',
    session_count: 5,
    turns: 10,
    cost_usd: 0.5,
    files_changed: 3,
    lines_added: 80,
    lines_removed: 20,
    net_lines: 60,
    tool_success_rate: 80,
  },
  {
    repository: 'repo-a',
    branch: 'dev',
    session_count: 2,
    turns: 4,
    cost_usd: 0.1,
    files_changed: 1,
    lines_added: 25,
    lines_removed: 5,
    net_lines: 20,
    tool_success_rate: 90,
  },
  {
    repository: 'repo-b',
    branch: 'main',
    session_count: 3,
    turns: 6,
    cost_usd: 0.2,
    files_changed: 2,
    lines_added: 40,
    lines_removed: 10,
    net_lines: 30,
    tool_success_rate: 70,
  },
]

const EMPTY_HOOK_RESULT = {
  rows: [] as RepositoryRow[],
  loading: false,
  error: null,
  page: 1,
  totalPages: 1,
  perPage: 20,
  setPage: vi.fn(),
  search: '',
  setSearch: vi.fn(),
}

describe('RepositoriesView', () => {
  it('renders the Repositories widget', () => {
    vi.mocked(useCliAnalyticsRepositories).mockReturnValue(EMPTY_HOOK_RESULT)
    render(<RepositoriesView filters={MOCK_FILTERS} />)
    expect(screen.getByTestId('widget-repositories')).toBeInTheDocument()
  })

  it('shows empty state when no data is returned', () => {
    vi.mocked(useCliAnalyticsRepositories).mockReturnValue(EMPTY_HOOK_RESULT)
    render(<RepositoriesView filters={MOCK_FILTERS} />)
    expect(screen.getByText('No repository data available')).toBeInTheDocument()
  })

  it('renders a row for each aggregated repository', () => {
    vi.mocked(useCliAnalyticsRepositories).mockReturnValue({
      ...EMPTY_HOOK_RESULT,
      rows: MOCK_ROWS,
    })
    render(<RepositoriesView filters={MOCK_FILTERS} />)
    expect(screen.getByText('repo-a')).toBeInTheDocument()
    expect(screen.getByText('repo-b')).toBeInTheDocument()
  })

  it('expands repository branches when the expand arrow is clicked', async () => {
    const user = userEvent.setup()
    vi.mocked(useCliAnalyticsRepositories).mockReturnValue({
      ...EMPTY_HOOK_RESULT,
      rows: MOCK_ROWS,
    })
    render(<RepositoriesView filters={MOCK_FILTERS} />)
    await user.click(screen.getAllByText('▶')[0])
    expect(screen.getByText('dev')).toBeInTheDocument()
  })

  it('opens the sessions modal when a repository row is clicked', async () => {
    const user = userEvent.setup()
    vi.mocked(useCliAnalyticsRepositories).mockReturnValue({
      ...EMPTY_HOOK_RESULT,
      rows: MOCK_ROWS,
    })
    render(<RepositoriesView filters={MOCK_FILTERS} />)
    await user.click(screen.getByText('repo-a'))
    expect(screen.getByTestId('sessions-modal')).toHaveTextContent('repo-a')
  })

  it('clicking the expand arrow does not open the sessions modal', async () => {
    const user = userEvent.setup()
    vi.mocked(useCliAnalyticsRepositories).mockReturnValue({
      ...EMPTY_HOOK_RESULT,
      rows: MOCK_ROWS,
    })
    render(<RepositoriesView filters={MOCK_FILTERS} />)
    await user.click(screen.getAllByText('▶')[0])
    expect(screen.queryByTestId('sessions-modal')).not.toBeInTheDocument()
  })

  it('opens the sessions modal filtered to branch when a branch row is clicked', async () => {
    const user = userEvent.setup()
    vi.mocked(useCliAnalyticsRepositories).mockReturnValue({
      ...EMPTY_HOOK_RESULT,
      rows: MOCK_ROWS,
    })
    render(<RepositoriesView filters={MOCK_FILTERS} />)
    await user.click(screen.getAllByText('▶')[0])
    await user.click(screen.getByText('dev'))
    expect(screen.getByTestId('sessions-modal')).toHaveTextContent('dev')
  })

  it('shows widget error when the hook returns an error', () => {
    vi.mocked(useCliAnalyticsRepositories).mockReturnValue({
      ...EMPTY_HOOK_RESULT,
      error: 'Failed to fetch repositories',
    })
    render(<RepositoriesView filters={MOCK_FILTERS} />)
    expect(screen.getByTestId('widget-error')).toBeInTheDocument()
    expect(screen.getByText('Failed to fetch repositories')).toBeInTheDocument()
  })

  it('forwards the repositories prop to the hook', () => {
    vi.mocked(useCliAnalyticsRepositories).mockReturnValue(EMPTY_HOOK_RESULT)
    render(<RepositoriesView filters={MOCK_FILTERS} repositories={['repo-a']} />)
    expect(vi.mocked(useCliAnalyticsRepositories)).toHaveBeenCalledWith(
      MOCK_FILTERS,
      ['repo-a'],
      true,
      0
    )
  })

  it('calls the hook with undefined repositories when prop is omitted', () => {
    vi.mocked(useCliAnalyticsRepositories).mockReturnValue(EMPTY_HOOK_RESULT)
    render(<RepositoriesView filters={MOCK_FILTERS} />)
    expect(vi.mocked(useCliAnalyticsRepositories)).toHaveBeenCalledWith(
      MOCK_FILTERS,
      undefined,
      true,
      0
    )
  })
})
