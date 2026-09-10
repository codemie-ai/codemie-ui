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
import { describe, it, expect, vi } from 'vitest'

import type { RepositoryRow } from '@/types/cliAnalytics'

import RepositoriesTable from '../views/RepositoriesTable'

vi.mock('@/components/Table', () => ({
  default: ({
    items,
    customRenderColumns,
    onSelectRow,
  }: {
    items: RepositoryRow[]
    customRenderColumns?: Record<string, (r: RepositoryRow) => React.ReactNode>
    onSelectRow?: (rows: RepositoryRow[]) => void
  }) => (
    <div data-testid="table">
      {items.map((r, i) => (
        <button
          key={r.repository ?? `__none__-${i}`}
          data-testid={`row-${r.repository ?? '__none__'}`}
          onClick={() => onSelectRow?.([r])}
        >
          {customRenderColumns?.repository ? customRenderColumns.repository(r) : r.repository}
        </button>
      ))}
    </div>
  ),
}))

vi.mock('@/components/Pagination', () => ({
  default: () => <div data-testid="pagination" />,
}))

vi.mock('../../AnalyticsWidget', () => ({
  default: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid={`widget-${title.toLowerCase().replace(/\s+/g, '-')}`}>{children}</div>
  ),
}))

const MOCK_ROW: RepositoryRow = {
  repository: 'my-repo',
  session_count: 42,
  turns: 100,
  cost_usd: 2.5,
  files_changed: 15,
  lines_added: 200,
  lines_removed: 80,
  net_lines: 120,
  tool_success_rate: 95.0,
}

const DEFAULT_PROPS = {
  rows: [MOCK_ROW],
  loading: false,
  error: null,
  page: 1,
  totalPages: 1,
  perPage: 20,
  setPage: vi.fn(),
}

describe('RepositoriesTable', () => {
  it('renders inside Top Repositories widget', () => {
    render(<RepositoriesTable {...DEFAULT_PROPS} />)
    expect(screen.getByTestId('widget-top-repositories')).toBeInTheDocument()
  })

  it('renders repository rows', () => {
    render(<RepositoriesTable {...DEFAULT_PROPS} />)
    expect(screen.getByText('my-repo')).toBeInTheDocument()
  })

  it('renders pagination control', () => {
    render(<RepositoriesTable {...DEFAULT_PROPS} />)
    expect(screen.getByTestId('pagination')).toBeInTheDocument()
  })

  it('shows empty state when rows is empty and not loading', () => {
    render(<RepositoriesTable {...DEFAULT_PROPS} rows={[]} />)
    expect(screen.getByText('No repository data available')).toBeInTheDocument()
    expect(screen.queryByTestId('table')).not.toBeInTheDocument()
    expect(screen.queryByTestId('pagination')).not.toBeInTheDocument()
  })

  it('does not show empty state while loading', () => {
    render(<RepositoriesTable {...DEFAULT_PROPS} rows={[]} loading={true} />)
    expect(screen.queryByText('No repository data available')).not.toBeInTheDocument()
  })

  it('calls onRowClick with the full RepositoryRow when a row is clicked', async () => {
    const onRowClick = vi.fn()
    const user = userEvent.setup()
    render(<RepositoriesTable {...DEFAULT_PROPS} onRowClick={onRowClick} />)

    await user.click(screen.getByTestId('row-my-repo'))

    expect(onRowClick).toHaveBeenCalledWith(MOCK_ROW)
  })

  it('does not error when onRowClick is not provided', async () => {
    const user = userEvent.setup()
    render(<RepositoriesTable {...DEFAULT_PROPS} />)
    await expect(user.click(screen.getByTestId('row-my-repo'))).resolves.not.toThrow()
  })

  it('assigns a clear function to clearSelectionRef on mount', () => {
    const clearSelectionRef: { current: (() => void) | null } = { current: null }
    render(<RepositoriesTable {...DEFAULT_PROPS} clearSelectionRef={clearSelectionRef} />)
    expect(typeof clearSelectionRef.current).toBe('function')
  })

  it('renders Unattributed label for a row with null repository', () => {
    const nullRepoRow: RepositoryRow = { ...MOCK_ROW, repository: null }
    render(<RepositoriesTable {...DEFAULT_PROPS} rows={[nullRepoRow]} />)
    expect(screen.getByText('Unattributed')).toBeInTheDocument()
  })
})
