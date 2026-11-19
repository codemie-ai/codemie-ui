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

import { UNATTRIBUTED_LABEL } from '@/constants/cliAnalytics'
import type { AnalyticsQueryParams } from '@/types/analytics'
import type { ProjectRow } from '@/types/cliAnalytics'

import { useCliAnalyticsProjects } from '../hooks/useCliAnalyticsProjects'
import RepositoriesView from '../views/RepositoriesView'

vi.mock('../hooks/useCliAnalyticsProjects')

vi.mock('../views/RepositoriesDrilldownModal', () => ({
  default: ({ project }: { project: ProjectRow; onClose: () => void }) => (
    <div data-testid="sessions-modal" data-project-name={project.project_name ?? ''}>
      {project.project_name ?? UNATTRIBUTED_LABEL}
    </div>
  ),
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

// A project row as the backend sends it: totals and tool_success_rate are computed on the server.
const project = (name: string | null, overrides: Partial<ProjectRow> = {}): ProjectRow => ({
  project_name: name,
  repository_count: 2,
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
  ...overrides,
})

const EMPTY_HOOK_RESULT = {
  costState: { incomplete: false, unpricedModels: [] },
  rows: [] as ProjectRow[],
  loading: false,
  error: null,
  page: 0,
  totalCount: 0,
  total: 1,
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

  it('opens the sessions modal for the whole project when a project row is clicked', async () => {
    const user = userEvent.setup()
    mockProjects([project('P')])
    render(<RepositoriesView filters={MOCK_FILTERS} />)
    await user.click(screen.getByText('P'))
    const modal = screen.getByTestId('sessions-modal')
    expect(modal).toHaveTextContent('P')
    expect(modal).toHaveAttribute('data-project-name', 'P')
  })

  it('opens the unattributed project as project-unattributed', async () => {
    const user = userEvent.setup()
    mockProjects([project(null)])
    render(<RepositoriesView filters={MOCK_FILTERS} />)
    await user.click(screen.getByText(UNATTRIBUTED_LABEL))
    const modal = screen.getByTestId('sessions-modal')
    expect(modal).toHaveTextContent(UNATTRIBUTED_LABEL)
    expect(modal).toHaveAttribute('data-project-name', '')
  })

  it('shows the project totals from the server', () => {
    mockProjects([project('P', { session_count: 42, tool_success_rate: 80.0 })])
    render(<RepositoriesView filters={MOCK_FILTERS} />)
    expect(screen.getByText('80.00%')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('pages projects through the hook with the shared pagination', async () => {
    const user = userEvent.setup()
    const setPage = vi.fn()
    mockProjects([project('P')], { totalPages: 2, setPage })
    render(<RepositoriesView filters={MOCK_FILTERS} />)

    await user.click(screen.getByRole('button', { name: 'Page 2' }))
    expect(setPage).toHaveBeenCalledWith(1, 10)
  })

  it('keeps the page-size selector when one page holds every project', () => {
    mockProjects([project('P')], { totalCount: 15, perPage: 20, totalPages: 1 })
    render(<RepositoriesView filters={MOCK_FILTERS} />)
    expect(screen.getByText('Show:')).toBeInTheDocument()
  })

  it('sends the typed search term to the hook', async () => {
    const user = userEvent.setup()
    const setSearch = vi.fn()
    mockProjects([], { setSearch })
    render(<RepositoriesView filters={MOCK_FILTERS} />)
    await user.type(screen.getByPlaceholderText('Search projects...'), 'a')
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

  it('shows the backend project tool_success_rate, not a session-weighted average', () => {
    mockProjects([project('P', { tool_success_rate: 75.0 })])
    render(<RepositoriesView filters={MOCK_FILTERS} />)
    expect(screen.getByText('75.00%')).toBeInTheDocument()
    expect(screen.queryByText('50.00%')).not.toBeInTheDocument()
  })

  describe('net lines', () => {
    const TITLE = 'Not reported - no line data was received'

    it('renders the marker with a title for null project net lines', () => {
      mockProjects([project('P', { net_lines: null })])
      render(<RepositoriesView filters={MOCK_FILTERS} />)
      expect(screen.getAllByTitle(TITLE)).toHaveLength(1)
    })

    it('renders 0 without title and groups thousands', () => {
      mockProjects([project('P', { net_lines: 0 }), project('Q', { net_lines: 1234 })])
      render(<RepositoriesView filters={MOCK_FILTERS} />)
      expect(screen.queryAllByTitle(TITLE)).toHaveLength(0)
      expect(screen.getByText((1234).toLocaleString())).toBeInTheDocument()
    })
  })
})
