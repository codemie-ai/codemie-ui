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
  }) =>
    isVisible ? (
      <div
        data-testid="sessions-modal"
        data-project-name={target.projectName ?? ''}
        data-project-unattributed={String(!!target.isProjectUnattributed)}
      >
        {target.title}
      </div>
    ) : null,
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

// Nested shape: the backend rolls branches up into each repository row and computes
// tool_success_rate itself (EPMCDME-15585) -- these fixtures mirror exactly what the real
// handler returns, not a flat per-branch list the UI would have to re-aggregate.
const MOCK_ROWS: RepositoryRow[] = [
  {
    repository: 'repo-a',
    session_count: 7,
    turns: 14,
    cost_usd: 0.6,
    files_changed: 4,
    lines_added: 105,
    lines_removed: 25,
    net_lines: 80,
    tool_calls: 20,
    tool_calls_success: 17,
    tool_success_rate: 85.0,
    branches: [
      {
        branch: 'main',
        session_count: 5,
        turns: 10,
        cost_usd: 0.5,
        files_changed: 3,
        lines_added: 80,
        lines_removed: 20,
        net_lines: 60,
        tool_calls: 10,
        tool_calls_success: 8,
        tool_success_rate: 80.0,
      },
      {
        branch: 'dev',
        session_count: 2,
        turns: 4,
        cost_usd: 0.1,
        files_changed: 1,
        lines_added: 25,
        lines_removed: 5,
        net_lines: 20,
        tool_calls: 10,
        tool_calls_success: 9,
        tool_success_rate: 90.0,
      },
    ],
  },
  {
    repository: 'repo-b',
    session_count: 3,
    turns: 6,
    cost_usd: 0.2,
    files_changed: 2,
    lines_added: 40,
    lines_removed: 10,
    net_lines: 30,
    tool_calls: 10,
    tool_calls_success: 7,
    tool_success_rate: 70.0,
    branches: [
      {
        branch: 'main',
        session_count: 3,
        turns: 6,
        cost_usd: 0.2,
        files_changed: 2,
        lines_added: 40,
        lines_removed: 10,
        net_lines: 30,
        tool_calls: 10,
        tool_calls_success: 7,
        tool_success_rate: 70.0,
      },
    ],
  },
]

const SWEEP_ROWS: RepositoryRow[] = [
  {
    repository: 'repo-x',
    session_count: 2,
    turns: 2,
    cost_usd: 0.2,
    files_changed: 2,
    lines_added: 2,
    lines_removed: 0,
    net_lines: 2,
    tool_calls: 4,
    tool_calls_success: 3,
    tool_success_rate: 75.0,
    branches: [
      {
        branch: 'sweep-cd',
        session_count: 1,
        turns: 1,
        cost_usd: 0.1,
        files_changed: 1,
        lines_added: 1,
        lines_removed: 0,
        net_lines: 1,
        tool_calls: 1,
        tool_calls_success: 0,
        tool_success_rate: 0.0,
      },
      {
        branch: 'sweep-cd-b',
        session_count: 1,
        turns: 1,
        cost_usd: 0.1,
        files_changed: 1,
        lines_added: 1,
        lines_removed: 0,
        net_lines: 1,
        tool_calls: 3,
        tool_calls_success: 3,
        tool_success_rate: 100.0,
      },
    ],
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

  it('passes the project of the clicked branch to the sessions modal', async () => {
    const user = userEvent.setup()
    vi.mocked(useCliAnalyticsRepositories).mockReturnValue({
      ...EMPTY_HOOK_RESULT,
      rows: MOCK_ROWS.map((r) => ({ ...r, project_name: 'P' })),
    })
    render(<RepositoriesView filters={MOCK_FILTERS} />)
    await user.click(screen.getAllByText('▶')[0])
    await user.click(screen.getByText('dev'))
    const modal = screen.getByTestId('sessions-modal')
    expect(modal).toHaveAttribute('data-project-name', 'P')
    expect(modal).toHaveAttribute('data-project-unattributed', 'false')
  })

  it('marks the sessions target project-unattributed for a branch under no project', async () => {
    const user = userEvent.setup()
    vi.mocked(useCliAnalyticsRepositories).mockReturnValue({
      ...EMPTY_HOOK_RESULT,
      rows: MOCK_ROWS.map((r) => ({ ...r, project_name: null })),
    })
    render(<RepositoriesView filters={MOCK_FILTERS} />)
    await user.click(screen.getAllByText('▶')[0])
    await user.click(screen.getByText('dev'))
    const modal = screen.getByTestId('sessions-modal')
    expect(modal).toHaveAttribute('data-project-name', '')
    expect(modal).toHaveAttribute('data-project-unattributed', 'true')
  })

  it('passes the project group to the sessions modal when a repository row is clicked', async () => {
    const user = userEvent.setup()
    vi.mocked(useCliAnalyticsRepositories).mockReturnValue({
      ...EMPTY_HOOK_RESULT,
      rows: MOCK_ROWS.map((r) => ({ ...r, project_name: 'P' })),
    })
    render(<RepositoriesView filters={MOCK_FILTERS} />)
    await user.click(screen.getByText('repo-a'))
    expect(screen.getByTestId('sessions-modal')).toHaveAttribute('data-project-name', 'P')
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

  it('aggregates repository tool_success_rate from raw counts, not a session-weighted average of percentages', () => {
    vi.mocked(useCliAnalyticsRepositories).mockReturnValue({
      ...EMPTY_HOOK_RESULT,
      rows: SWEEP_ROWS,
    })
    render(<RepositoriesView filters={MOCK_FILTERS} />)
    expect(screen.getByText('75.00%')).toBeInTheDocument()
    expect(screen.queryByText('50.00%')).not.toBeInTheDocument()
  })
})
