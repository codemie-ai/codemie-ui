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

import { type FC, useCallback, useMemo, useState } from 'react'

import Pagination from '@/components/Pagination'
import Table from '@/components/Table'
import { UNATTRIBUTED_LABEL } from '@/constants/cliAnalytics'
import type { AnalyticsQueryParams } from '@/types/analytics'
import type {
  ExtendedSessionsTarget,
  ProjectScope,
  RepositoryBranchRow,
} from '@/types/cliAnalytics'
import { DefinitionTypes } from '@/types/table'

import AnalyticsWidget from '../../AnalyticsWidget'
import { buildRepoMetrics, formatLines, linesTitle } from '../format'
import ExtendedSessionsModal from './ExtendedSessionsModal'
import { useCliAnalyticsBranches } from '../hooks/useCliAnalyticsBranches'

const right = (value: number | null) => (
  <div className="text-right" title={linesTitle(value)}>
    {formatLines(value)}
  </div>
)

const CELL_RENDERERS = {
  branch: (r: RepositoryBranchRow) => (
    <div className="truncate max-w-xs" title={r.branch ?? UNATTRIBUTED_LABEL}>
      {r.branch ?? UNATTRIBUTED_LABEL}
    </div>
  ),
  session_count: (r: RepositoryBranchRow) => (
    <div className="text-right">{r.session_count.toLocaleString()}</div>
  ),
  files_changed: (r: RepositoryBranchRow) => (
    <div className="text-right">{r.files_changed.toLocaleString()}</div>
  ),
  lines_added: (r: RepositoryBranchRow) => right(r.lines_added),
  lines_removed: (r: RepositoryBranchRow) => right(r.lines_removed),
  net_lines: (r: RepositoryBranchRow) => right(r.net_lines),
}

const col = (key: string, label: string, headClassNames = 'text-right') => ({
  key,
  label,
  type: DefinitionTypes.Custom,
  sortable: false,
  headClassNames,
})

interface RepositoryBranchesListProps {
  filters: AnalyticsQueryParams
  repository: string
  scope: ProjectScope
}

const RepositoryBranchesList: FC<RepositoryBranchesListProps> = ({
  filters,
  repository,
  scope,
}) => {
  const { rows, loading, error, page, setPage, totalPages, perPage } = useCliAnalyticsBranches(
    filters,
    repository,
    scope
  )
  const [selected, setSelected] = useState<RepositoryBranchRow[]>([])
  const [selectedBranch, setSelectedBranch] = useState<RepositoryBranchRow | null>(null)

  const columnDefinitions = useMemo(
    () => [
      col('branch', 'Branch', ''),
      col('session_count', 'Sessions'),
      col('files_changed', 'Files'),
      col('lines_added', 'Lines Added'),
      col('lines_removed', 'Lines Removed'),
      col('net_lines', 'Net Lines'),
    ],
    []
  )

  const closeModal = useCallback(() => {
    setSelectedBranch(null)
    setSelected([])
  }, [])

  const target: ExtendedSessionsTarget | null = selectedBranch && {
    title: selectedBranch.branch ?? UNATTRIBUTED_LABEL,
    metrics: buildRepoMetrics(selectedBranch),
    sessionFilters: filters,
    repositories: [repository],
    isUnattributed: false,
    projectName: 'projectName' in scope ? scope.projectName : undefined,
    isProjectUnattributed: 'isProjectUnattributed' in scope ? true : undefined,
    ...(selectedBranch.branch === null
      ? { isBranchUnattributed: true }
      : { branch: selectedBranch.branch }),
  }

  const isEmpty = rows.length === 0 && !loading

  return (
    <>
      <AnalyticsWidget
        title="Branches"
        description="Branches of the repository. Click a branch to view its sessions."
        loading={loading}
        error={error ? { message: error } : null}
      >
        {isEmpty ? (
          <div className="text-text-quaternary text-sm py-4">No branch data available</div>
        ) : (
          <>
            <Table<RepositoryBranchRow>
              items={rows}
              columnDefinitions={columnDefinitions}
              customRenderColumns={CELL_RENDERERS}
              idPath="branch"
              loading={loading}
              embedded
              selected={selected}
              onSelectRow={(newRows) => {
                const clicked = newRows.find((r) => !selected.some((s) => s.branch === r.branch))
                if (clicked) setSelectedBranch(clicked)
                setSelected(newRows)
              }}
            />
            {totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                setPage={(p) => setPage(p)}
                perPage={perPage}
              />
            )}
          </>
        )}
      </AnalyticsWidget>
      {target && <ExtendedSessionsModal target={target} isVisible onHide={closeModal} />}
    </>
  )
}

export default RepositoryBranchesList
