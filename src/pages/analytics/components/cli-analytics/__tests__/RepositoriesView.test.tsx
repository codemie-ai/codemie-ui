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
import type { ExtendedSessionsTarget, ProjectRow, RepositoryRow } from '@/types/cliAnalytics'

import { useCliAnalyticsProjects } from '../hooks/useCliAnalyticsProjects'
import RepositoriesView from '../views/RepositoriesView'

vi.mock('../hooks/useCliAnalyticsProjects')

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
        data-repositories={target.repositories?.join(',') ?? ''}
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

// A project row as the backend sends it: totals and tool_success_rate are computed on the server.
const project = (
  name: string | null,
  repositories: RepositoryRow[],
  overrides: Partial<ProjectRow> = {}
): ProjectRow => ({
  project_name: name,
  repository_count: repositories.length,
  session_count: 10,
  turns: 20,
  cost_usd: 0.8,
  files_changed: 6,
  lines_added: 145,
  lines_removed: 35,
  net_lines: 110,
  tool_calls: 30,
  tool_calls_success: 24,
  tool_success_rate: 80.0,
  repositories: repositories.map((r) => ({ ...r, project_name: name })),
  ...overrides,
})

const EMPTY_HOOK_RESULT = {
  costState: { incomplete: false, unpricedModels: [] },
  rows: [] as ProjectRow[],
  loading: false,
  error: null,
  page: 0,
  totalCount: 0,
  totalPages: 1,
  perPage: 10,
  setPage: vi.fn(),
  search: '',
  setSearch: vi.fn(),
  appliedSearch: '',
}

const mockProjects = (rows: ProjectRow[], extra: Partial<typeof EMPTY_HOOK_RESULT> = {}) =>
  vi.mocked(useCliAnalyticsProjects).mockReturnValue({ ...EMPTY_HOOK_RESULT, rows, ...extra })

describe('RepositoriesView', () => {
  const expandProject = async (user: ReturnType<typeof userEvent.setup>, name = '(no project)') =>
    user.click(screen.getByRole('button', { name: `Expand ${name}` }))

  it('renders the Repositories widget', () => {
    mockProjects([])
    render(<RepositoriesView filters={MOCK_FILTERS} />)
    expect(screen.getByTestId('widget-repositories')).toBeInTheDocument()
  })

  it('shows empty state when no data is returned', () => {
    mockProjects([])
    render(<RepositoriesView filters={MOCK_FILTERS} />)
    expect(screen.getByText('No repository data available')).toBeInTheDocument()
  })

  it('renders a row for each repository of an expanded project', async () => {
    const user = userEvent.setup()
    mockProjects([project(null, MOCK_ROWS)])
    render(<RepositoriesView filters={MOCK_FILTERS} />)
    await expandProject(user)
    expect(screen.getByText('repo-a')).toBeInTheDocument()
    expect(screen.getByText('repo-b')).toBeInTheDocument()
  })

  it('expands repository branches when the expand arrow is clicked', async () => {
    const user = userEvent.setup()
    mockProjects([project(null, MOCK_ROWS)])
    render(<RepositoriesView filters={MOCK_FILTERS} />)
    await expandProject(user)
    await user.click(screen.getByRole('button', { name: 'Expand repo-a' }))
    expect(screen.getByText('dev')).toBeInTheDocument()
  })

  it('opens the sessions modal when a repository row is clicked', async () => {
    const user = userEvent.setup()
    mockProjects([project(null, MOCK_ROWS)])
    render(<RepositoriesView filters={MOCK_FILTERS} />)
    await expandProject(user)
    await user.click(screen.getByText('repo-a'))
    expect(screen.getByTestId('sessions-modal')).toHaveTextContent('repo-a')
  })

  it('clicking the expand arrow does not open the sessions modal', async () => {
    const user = userEvent.setup()
    mockProjects([project(null, MOCK_ROWS)])
    render(<RepositoriesView filters={MOCK_FILTERS} />)
    await expandProject(user)
    await user.click(screen.getByRole('button', { name: 'Expand repo-a' }))
    expect(screen.queryByTestId('sessions-modal')).not.toBeInTheDocument()
  })

  it('opens the sessions modal filtered to branch when a branch row is clicked', async () => {
    const user = userEvent.setup()
    mockProjects([project(null, MOCK_ROWS)])
    render(<RepositoriesView filters={MOCK_FILTERS} />)
    await expandProject(user)
    await user.click(screen.getByRole('button', { name: 'Expand repo-a' }))
    await user.click(screen.getByText('dev'))
    expect(screen.getByTestId('sessions-modal')).toHaveTextContent('dev')
  })

  it('passes the project of the clicked branch to the sessions modal', async () => {
    const user = userEvent.setup()
    mockProjects([project('P', MOCK_ROWS)])
    render(<RepositoriesView filters={MOCK_FILTERS} />)
    await expandProject(user, 'P')
    await user.click(screen.getByRole('button', { name: 'Expand repo-a' }))
    await user.click(screen.getByText('dev'))
    const modal = screen.getByTestId('sessions-modal')
    expect(modal).toHaveAttribute('data-project-name', 'P')
    expect(modal).toHaveAttribute('data-project-unattributed', 'false')
  })

  it('marks the sessions target project-unattributed for a branch under no project', async () => {
    const user = userEvent.setup()
    mockProjects([project(null, MOCK_ROWS)])
    render(<RepositoriesView filters={MOCK_FILTERS} />)
    await expandProject(user)
    await user.click(screen.getByRole('button', { name: 'Expand repo-a' }))
    await user.click(screen.getByText('dev'))
    const modal = screen.getByTestId('sessions-modal')
    expect(modal).toHaveAttribute('data-project-name', '')
    expect(modal).toHaveAttribute('data-project-unattributed', 'true')
  })

  it('passes the project group to the sessions modal when a repository row is clicked', async () => {
    const user = userEvent.setup()
    mockProjects([project('P', MOCK_ROWS)])
    render(<RepositoriesView filters={MOCK_FILTERS} />)
    await expandProject(user, 'P')
    await user.click(screen.getByText('repo-a'))
    expect(screen.getByTestId('sessions-modal')).toHaveAttribute('data-project-name', 'P')
  })

  it('starts with projects collapsed, in the order the server sends them', () => {
    mockProjects([
      project('dear', [MOCK_ROWS[1]]),
      project('cheap', [MOCK_ROWS[0]]),
      project(null, [MOCK_ROWS[1]]),
    ])
    render(<RepositoriesView filters={MOCK_FILTERS} />)

    const names = screen
      .getAllByRole('button', { name: /^Expand / })
      .map((b) => b.getAttribute('aria-label'))
    expect(names).toEqual(['Expand dear', 'Expand cheap', 'Expand (no project)'])
    expect(screen.queryByText('repo-a')).not.toBeInTheDocument()
  })

  it('opens the sessions modal for the whole project when a project row is clicked', async () => {
    const user = userEvent.setup()
    mockProjects([project('P', MOCK_ROWS)])
    render(<RepositoriesView filters={MOCK_FILTERS} />)
    await user.click(screen.getByText('P'))
    const modal = screen.getByTestId('sessions-modal')
    expect(modal).toHaveTextContent('P')
    expect(modal).toHaveAttribute('data-project-name', 'P')
  })

  it('shows the project totals from the server', () => {
    mockProjects([project('P', MOCK_ROWS, { session_count: 42, tool_success_rate: 80.0 })])
    render(<RepositoriesView filters={MOCK_FILTERS} />)
    expect(screen.getByText('80.00%')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('pages projects through the hook with the shared pagination', async () => {
    const user = userEvent.setup()
    const setPage = vi.fn()
    mockProjects([project('P', MOCK_ROWS)], { totalPages: 2, setPage })
    render(<RepositoriesView filters={MOCK_FILTERS} />)

    await user.click(screen.getByRole('button', { name: 'Page 2' }))
    expect(setPage).toHaveBeenCalledWith(1, 10)
  })

  it('expands every project while a search term is set, with the project caret disabled', () => {
    mockProjects([project(null, MOCK_ROWS)], { search: 'repo', appliedSearch: 'repo' })
    render(<RepositoriesView filters={MOCK_FILTERS} />)
    expect(screen.getByText('repo-a')).toBeInTheDocument()
    expect(screen.getByText('repo-b')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Collapse (no project)' })).toBeDisabled()
  })

  it('does not expand the current page before the typed term is sent', () => {
    mockProjects([project(null, MOCK_ROWS)], { search: 'repo', appliedSearch: '' })
    render(<RepositoriesView filters={MOCK_FILTERS} />)
    expect(screen.queryByText('repo-a')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Expand (no project)' })).toBeEnabled()
  })

  it('limits a searched project to its matching repositories when its name does not match', async () => {
    const user = userEvent.setup()
    mockProjects([project('Platform', [MOCK_ROWS[0]])], {
      search: 'repo-a',
      appliedSearch: 'repo-a',
    })
    render(<RepositoriesView filters={MOCK_FILTERS} />)
    await user.click(screen.getByText('Platform'))
    expect(screen.getByTestId('sessions-modal')).toHaveAttribute('data-repositories', 'repo-a')
  })

  it('opens every session of a searched project that matches by name', async () => {
    const user = userEvent.setup()
    mockProjects([project('Platform', MOCK_ROWS)], { search: 'plat', appliedSearch: 'plat' })
    render(<RepositoriesView filters={MOCK_FILTERS} />)
    await user.click(screen.getByText('Platform'))
    expect(screen.getByTestId('sessions-modal')).toHaveAttribute('data-repositories', '')
  })

  it('opens the unattributed project as project-unattributed', async () => {
    const user = userEvent.setup()
    mockProjects([project(null, MOCK_ROWS)])
    render(<RepositoriesView filters={MOCK_FILTERS} />)
    await user.click(screen.getByText('(no project)'))
    const modal = screen.getByTestId('sessions-modal')
    expect(modal).toHaveTextContent('(no project)')
    expect(modal).toHaveAttribute('data-project-name', '')
    expect(modal).toHaveAttribute('data-project-unattributed', 'true')
    expect(modal).toHaveAttribute('data-repositories', '')
  })

  it('keeps the page-size selector when one page holds every project', () => {
    mockProjects([project('P', MOCK_ROWS)], { totalCount: 15, perPage: 20, totalPages: 1 })
    render(<RepositoriesView filters={MOCK_FILTERS} />)
    expect(screen.getByText('Show:')).toBeInTheDocument()
  })

  it('sends the typed search term to the hook', async () => {
    const user = userEvent.setup()
    const setSearch = vi.fn()
    mockProjects([], { setSearch })
    render(<RepositoriesView filters={MOCK_FILTERS} />)
    await user.type(screen.getByPlaceholderText('Search projects or repositories...'), 'a')
    expect(setSearch).toHaveBeenCalledWith('a')
  })

  it('shows widget error when the hook returns an error', () => {
    vi.mocked(useCliAnalyticsProjects).mockReturnValue({
      ...EMPTY_HOOK_RESULT,
      error: 'Failed to fetch repositories',
    })
    render(<RepositoriesView filters={MOCK_FILTERS} />)
    expect(screen.getByTestId('widget-error')).toBeInTheDocument()
    expect(screen.getByText('Failed to fetch repositories')).toBeInTheDocument()
  })

  it('forwards the filters and repositories prop to the hook', () => {
    mockProjects([])
    render(<RepositoriesView filters={MOCK_FILTERS} repositories={['repo-a']} />)
    expect(vi.mocked(useCliAnalyticsProjects)).toHaveBeenCalledWith(MOCK_FILTERS, ['repo-a'])
  })

  it('shows the backend repository tool_success_rate, not a session-weighted average', async () => {
    const user = userEvent.setup()
    mockProjects([project(null, SWEEP_ROWS, { tool_success_rate: 75.0 })])
    render(<RepositoriesView filters={MOCK_FILTERS} />)
    await expandProject(user)
    expect(screen.getAllByText('75.00%')).toHaveLength(2) // project and repository rows
    expect(screen.queryByText('50.00%')).not.toBeInTheDocument()
  })

  describe('net lines', () => {
    const TITLE = 'Not reported - no line data was received'
    const withNet = (repoNet: number | null, branchNet: number | null): ProjectRow[] => [
      project(
        null,
        [
          {
            ...MOCK_ROWS[0],
            net_lines: repoNet,
            branches: [{ ...MOCK_ROWS[0].branches![0], net_lines: branchNet }],
          },
        ],
        { net_lines: repoNet }
      ),
    ]

    it('renders the marker with a title for null project, repo and branch net lines', async () => {
      const user = userEvent.setup()
      mockProjects(withNet(null, null))
      render(<RepositoriesView filters={MOCK_FILTERS} />)
      await expandProject(user)
      await user.click(screen.getByRole('button', { name: 'Expand repo-a' }))
      // project, repository and branch rows
      expect(screen.getAllByTitle(TITLE)).toHaveLength(3)
    })

    it('renders 0 without title and groups thousands', async () => {
      const user = userEvent.setup()
      mockProjects(withNet(0, 1234))
      render(<RepositoriesView filters={MOCK_FILTERS} />)
      await expandProject(user)
      await user.click(screen.getByRole('button', { name: 'Expand repo-a' }))
      expect(screen.queryAllByTitle(TITLE)).toHaveLength(0)
      expect(screen.getByText((1234).toLocaleString())).toBeInTheDocument()
    })
  })
})
