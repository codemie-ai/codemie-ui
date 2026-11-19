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
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { UNATTRIBUTED_LABEL } from '@/constants/cliAnalytics'
import type { AnalyticsQueryParams } from '@/types/analytics'
import type { ProjectRow, RepositoryBranchRow, RepositoryRow } from '@/types/cliAnalytics'

import { useCliAnalyticsBranches } from '../hooks/useCliAnalyticsBranches'
import { useCliAnalyticsProjectRepositories } from '../hooks/useCliAnalyticsProjectRepositories'
import RepositoriesDrilldownModal from '../views/RepositoriesDrilldownModal'

vi.mock('../hooks/useCliAnalyticsProjectRepositories')
vi.mock('../hooks/useCliAnalyticsBranches')

vi.mock('@/components/Popup', () => ({
  default: ({
    children,
    headerContent,
  }: {
    children: React.ReactNode
    headerContent: React.ReactNode
  }) => (
    <div>
      {headerContent}
      {children}
    </div>
  ),
}))

vi.mock('@/components/Pagination', () => ({
  default: ({ currentPage, totalPages }: { currentPage: number; totalPages: number }) => (
    <div data-testid="pagination">
      {currentPage}/{totalPages}
    </div>
  ),
}))

vi.mock('@/components/Table', () => ({
  default: ({
    items,
    customRenderColumns,
    onRowClick,
  }: {
    items: Array<{ __rowId: string }>
    customRenderColumns: Record<string, (row: any) => React.ReactNode>
    onRowClick: (row: any) => void
  }) => (
    <div>
      {items.map((row) => (
        <button key={row.__rowId} type="button" onClick={() => onRowClick(row)}>
          {customRenderColumns.label(row)}
        </button>
      ))}
    </div>
  ),
}))

vi.mock('../../AnalyticsWidget', () => ({
  default: ({
    title,
    children,
    error,
    actions,
  }: {
    title: string
    children: React.ReactNode
    error?: { message: string } | null
    actions?: React.ReactNode
  }) => (
    <div data-testid={`widget-${title.toLowerCase()}`}>
      <h3>{title}</h3>
      {error && <span data-testid="widget-error">{error.message}</span>}
      {actions}
      {children}
    </div>
  ),
}))

vi.mock('../views/SessionsView', () => ({
  default: (props: Record<string, unknown>) => (
    <div
      data-testid="sessions-view"
      data-branch={typeof props.branch === 'string' ? props.branch : ''}
    />
  ),
}))

const FILTERS: AnalyticsQueryParams = { start_date: '2026-07-01', end_date: '2026-07-17' }

const METRICS = {
  session_count: 3,
  turns: 5,
  cost_usd: 1,
  files_changed: 2,
  lines_added: 10,
  lines_removed: 4,
  net_lines: 6,
  tool_calls: 8,
  tool_calls_success: 6,
  tool_success_rate: 75,
}

const PROJECT: ProjectRow = { project_name: 'P', repository_count: 2, ...METRICS }
const repo = (name: string | null): RepositoryRow => ({ repository: name, ...METRICS })
const branch = (name: string | null): RepositoryBranchRow => ({ branch: name, ...METRICS })

const listResult = <T,>(rows: T[], extra: Record<string, unknown> = {}) => ({
  rows,
  loading: false,
  error: null,
  page: 0,
  setPage: vi.fn(),
  totalPages: 1,
  perPage: 10,
  retry: vi.fn(),
  ...extra,
})

const renderModal = (project: ProjectRow = PROJECT) =>
  render(<RepositoriesDrilldownModal project={project} filters={FILTERS} onClose={vi.fn()} />)

describe('RepositoriesDrilldownModal', () => {
  beforeEach(() => {
    vi.mocked(useCliAnalyticsProjectRepositories).mockReturnValue(listResult([repo('repo-a')]))
    vi.mocked(useCliAnalyticsBranches).mockReturnValue(listResult([branch('main')]))
  })

  it('requests the project repositories with the project scope', () => {
    renderModal()

    expect(useCliAnalyticsProjectRepositories).toHaveBeenCalledWith(
      FILTERS,
      { projectName: 'P' },
      expect.objectContaining({ initialPage: 0 })
    )
    expect(screen.getByText('repo-a')).toBeInTheDocument()
  })

  it('uses the unattributed scope for a project without a name', () => {
    renderModal({ ...PROJECT, project_name: null })

    expect(useCliAnalyticsProjectRepositories).toHaveBeenCalledWith(
      FILTERS,
      { isProjectUnattributed: true },
      expect.anything()
    )
  })

  it('shows the loading state without rows', () => {
    vi.mocked(useCliAnalyticsProjectRepositories).mockReturnValue(listResult([], { loading: true }))
    renderModal()

    expect(screen.queryByText('No repositories found.')).not.toBeInTheDocument()
    expect(screen.queryByText('repo-a')).not.toBeInTheDocument()
  })

  it('shows the error and retries', async () => {
    const retry = vi.fn()
    vi.mocked(useCliAnalyticsProjectRepositories).mockReturnValue(
      listResult([], { error: 'boom', retry })
    )
    renderModal()

    expect(screen.getByTestId('widget-error')).toHaveTextContent('boom')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }))

    expect(retry).toHaveBeenCalledTimes(1)
  })

  it('shows the empty state', () => {
    vi.mocked(useCliAnalyticsProjectRepositories).mockReturnValue(listResult([]))
    renderModal()

    expect(screen.getByText('No repositories found.')).toBeInTheDocument()
  })

  it('shows pagination only when there is more than one page', () => {
    vi.mocked(useCliAnalyticsProjectRepositories).mockReturnValue(
      listResult([repo('repo-a')], { totalPages: 3, page: 1 })
    )
    renderModal()

    expect(screen.getByTestId('pagination')).toHaveTextContent('1/3')
  })

  it('hides pagination for a single page', () => {
    renderModal()

    expect(screen.queryByTestId('pagination')).not.toBeInTheDocument()
  })

  it('drills from a repository to its branches and then to sessions', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByText('repo-a'))
    expect(useCliAnalyticsBranches).toHaveBeenCalledWith(
      FILTERS,
      'repo-a',
      { projectName: 'P' },
      expect.anything()
    )

    await user.click(screen.getByText('main'))
    expect(screen.getByTestId('sessions-view')).toHaveAttribute('data-branch', 'main')
  })

  it('opens sessions directly for the unattributed repository', async () => {
    vi.mocked(useCliAnalyticsProjectRepositories).mockReturnValue(listResult([repo(null)]))
    renderModal()

    await userEvent.setup().click(screen.getByText(UNATTRIBUTED_LABEL))

    expect(screen.getByTestId('sessions-view')).toBeInTheDocument()
    expect(useCliAnalyticsBranches).not.toHaveBeenCalled()
  })
})
