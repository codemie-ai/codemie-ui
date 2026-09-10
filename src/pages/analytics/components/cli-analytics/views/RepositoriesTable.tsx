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

import { type FC, useEffect, useMemo, useState } from 'react'

import Pagination from '@/components/Pagination'
import Table from '@/components/Table'
import { DECIMAL_PAGINATION_OPTIONS } from '@/constants'
import { UNATTRIBUTED_LABEL } from '@/constants/cliAnalytics'
import type { RepositoryRow } from '@/types/cliAnalytics'
import { DefinitionTypes } from '@/types/table'

import AnalyticsWidget from '../../AnalyticsWidget'

const RepositoryCell: FC<{ row: RepositoryRow }> = ({ row }) => (
  <div className="truncate max-w-xs" title={row.repository ?? UNATTRIBUTED_LABEL}>
    {row.repository ?? UNATTRIBUTED_LABEL}
  </div>
)

const SessionCountCell: FC<{ row: RepositoryRow }> = ({ row }) => (
  <div className="text-right">{row.session_count.toLocaleString()}</div>
)

const FilesChangedCell: FC<{ row: RepositoryRow }> = ({ row }) => (
  <div className="text-right">{row.files_changed.toLocaleString()}</div>
)

const LinesAddedCell: FC<{ row: RepositoryRow }> = ({ row }) => (
  <div className="text-right">{row.lines_added.toLocaleString()}</div>
)

const LinesRemovedCell: FC<{ row: RepositoryRow }> = ({ row }) => (
  <div className="text-right">{row.lines_removed.toLocaleString()}</div>
)

const NetLinesCell: FC<{ row: RepositoryRow }> = ({ row }) => (
  <div className="text-right">{row.net_lines.toLocaleString()}</div>
)

const REPOSITORY_CELL_RENDERERS = {
  repository: (r: RepositoryRow) => <RepositoryCell row={r} />,
  session_count: (r: RepositoryRow) => <SessionCountCell row={r} />,
  files_changed: (r: RepositoryRow) => <FilesChangedCell row={r} />,
  lines_added: (r: RepositoryRow) => <LinesAddedCell row={r} />,
  lines_removed: (r: RepositoryRow) => <LinesRemovedCell row={r} />,
  net_lines: (r: RepositoryRow) => <NetLinesCell row={r} />,
}

interface RepositoriesTableProps {
  rows: RepositoryRow[]
  loading: boolean
  error: string | null
  page?: number
  totalPages?: number
  perPage?: number
  setPage?: (page: number, perPage?: number) => void
  onRowClick?: (row: RepositoryRow) => void
  clearSelectionRef?: { current: (() => void) | null }
  search?: string
  onSearchChange?: (s: string) => void
}

const RepositoriesTable: FC<RepositoriesTableProps> = ({
  rows,
  loading,
  error,
  page,
  totalPages,
  perPage,
  setPage,
  onRowClick,
  clearSelectionRef,
  search,
  onSearchChange,
}) => {
  const [selected, setSelected] = useState<RepositoryRow[]>([])
  const showPagination =
    page !== undefined && totalPages !== undefined && perPage !== undefined && setPage !== undefined

  useEffect(() => {
    setSelected([])
  }, [rows])

  useEffect(() => {
    if (clearSelectionRef) {
      clearSelectionRef.current = () => setSelected([])
    }
  }, [clearSelectionRef])

  const customRenderColumns = REPOSITORY_CELL_RENDERERS

  const columnDefinitions = useMemo(
    () => [
      {
        key: 'repository',
        label: 'REPOSITORY',
        type: DefinitionTypes.Custom,
        sortable: false,
        headClassNames: '',
      },
      {
        key: 'session_count',
        label: 'SESSIONS',
        type: DefinitionTypes.Custom,
        sortable: false,
        headClassNames: 'text-right',
      },
      {
        key: 'files_changed',
        label: 'FILES',
        type: DefinitionTypes.Custom,
        sortable: false,
        headClassNames: 'text-right',
      },
      {
        key: 'lines_added',
        label: 'LINES+',
        type: DefinitionTypes.Custom,
        sortable: false,
        headClassNames: 'text-right',
      },
      {
        key: 'lines_removed',
        label: 'LINES−',
        type: DefinitionTypes.Custom,
        sortable: false,
        headClassNames: 'text-right',
      },
      {
        key: 'net_lines',
        label: 'NET LINES',
        type: DefinitionTypes.Custom,
        sortable: false,
        headClassNames: 'text-right',
      },
    ],
    []
  )

  const isEmpty = rows.length === 0 && !loading

  return (
    <AnalyticsWidget
      title="Top Repositories"
      description="Sessions by workspace"
      loading={loading}
      error={error ? { message: error } : null}
    >
      {onSearchChange && (
        <input
          type="text"
          placeholder="Search repositories..."
          value={search ?? ''}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full max-w-sm px-3 py-1.5 text-sm rounded-lg border border-border-structural bg-surface-base-secondary text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-border-accent"
        />
      )}
      {isEmpty ? (
        <div className="text-text-quaternary text-sm py-4">No repository data available</div>
      ) : (
        <>
          <Table<RepositoryRow>
            items={rows}
            columnDefinitions={columnDefinitions}
            customRenderColumns={customRenderColumns}
            idPath="repository"
            loading={loading}
            embedded={true}
            selected={selected}
            onSelectRow={(newRows) => {
              const clicked = newRows.find(
                (r) => !selected.some((s) => s.repository === r.repository)
              )
              if (clicked) onRowClick?.(clicked)
              setSelected(newRows)
            }}
          />
          {showPagination && (
            <Pagination
              currentPage={page - 1}
              totalPages={totalPages}
              setPage={(p, pp) => setPage(p + 1, pp)}
              perPage={perPage}
              perPageOptions={DECIMAL_PAGINATION_OPTIONS}
            />
          )}
        </>
      )}
    </AnalyticsWidget>
  )
}

export default RepositoriesTable
