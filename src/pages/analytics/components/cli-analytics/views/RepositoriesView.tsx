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

import { type FC, useCallback, useState } from 'react'

import Pagination from '@/components/Pagination'
import { DECIMAL_PAGINATION_OPTIONS } from '@/constants'
import { UNATTRIBUTED_LABEL } from '@/constants/cliAnalytics'
import type { AnalyticsQueryParams } from '@/types/analytics'
import type { ProjectRow } from '@/types/cliAnalytics'
import { cn } from '@/utils/utils'

import AnalyticsWidget from '../../AnalyticsWidget'
import { formatLines, formatToolSuccess, linesTitle } from '../format'
import CostIncompleteNotice from './CostIncompleteNotice'
import RepositoriesDrilldownModal from './RepositoriesDrilldownModal'
import { AmountCost } from './SessionCostValue'
import { hasRowPricing } from '../costCompleteness'
import { useCliAnalyticsProjects } from '../hooks/useCliAnalyticsProjects'

const CELL = 'text-text-primary px-4 py-2 text-right border-b border-border-structural tabular-nums'
const HEAD = 'px-4 py-2.5 border-border-structural border-t border-b text-nowrap'

interface RepositoriesViewProps {
  filters: AnalyticsQueryParams
  repositories?: string[]
}

const RepositoriesView: FC<RepositoriesViewProps> = ({ filters, repositories }) => {
  // The server pages projects; a project's repositories load inside its modal.
  const {
    rows: projects,
    costState,
    loading,
    error,
    page,
    totalCount,
    totalPages,
    perPage,
    setPage,
    search,
    setSearch,
  } = useCliAnalyticsProjects(filters, repositories)
  const [selectedProject, setSelectedProject] = useState<ProjectRow | null>(null)

  const handleProjectClick = useCallback((project: ProjectRow) => {
    setSelectedProject(project)
  }, [])

  const closeModal = useCallback(() => {
    setSelectedProject(null)
  }, [])

  // The `repositories` prop narrows the project rows only; it is not passed to the modal lists, which
  // are scoped by project (the tab never sets this prop).
  const isEmpty = projects.length === 0 && !loading

  return (
    <>
      <AnalyticsWidget
        title="Repositories"
        // Per-amount pricing on every level replaces the selection notice; only an older backend needs it.
        actions={hasRowPricing(projects) ? null : <CostIncompleteNotice state={costState} />}
        description="Projects with their usage. Click a project to view its details."
        loading={loading}
        error={error ? { message: error } : null}
      >
        <div className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm px-3 py-1.5 text-sm rounded-lg border border-border-structural bg-surface-base-secondary text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-border-accent"
          />
          {isEmpty ? (
            <div className="text-text-quaternary text-sm py-4">No repository data available</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="border-separate border-spacing-0 w-full text-[12px] leading-tight">
                <thead className="bg-surface-base-tertiary text-text-primary sticky top-0 z-20">
                  <tr className="font-semibold">
                    <th className={cn(HEAD, 'text-left rounded-tl-lg border-l')}>Project</th>
                    <th className={cn(HEAD, 'text-right w-20')}>Sessions</th>
                    <th className={cn(HEAD, 'text-right w-20')}>Turns</th>
                    <th className={cn(HEAD, 'text-right w-20')}>Files</th>
                    <th className={cn(HEAD, 'text-right w-24')}>Net Lines</th>
                    <th className={cn(HEAD, 'text-right w-28')}>Tool Success</th>
                    <th className={cn(HEAD, 'text-right w-24 rounded-tr-lg border-r')}>
                      Est. Cost
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => {
                    const projectName = project.project_name ?? UNATTRIBUTED_LABEL
                    return (
                      <tr
                        key={`project::${project.project_name ?? '__none__'}`}
                        className="cursor-pointer [&_td]:hover:bg-surface-base-tertiary"
                        onClick={() => handleProjectClick(project)}
                      >
                        <td className="text-text-primary font-semibold px-4 py-2 bg-surface-base-primary border-b border-border-structural border-l min-w-0">
                          <span className="block truncate" title={projectName}>
                            {projectName}
                          </span>
                          {project.project_name === null && (
                            <span className="block truncate text-xs font-normal text-text-quaternary">
                              Sessions without a project
                            </span>
                          )}
                        </td>
                        <td className={cn(CELL, 'bg-surface-base-primary')}>
                          {project.session_count}
                        </td>
                        <td className={cn(CELL, 'bg-surface-base-primary')}>{project.turns}</td>
                        <td className={cn(CELL, 'bg-surface-base-primary')}>
                          {project.files_changed}
                        </td>
                        <td
                          className={cn(CELL, 'bg-surface-base-primary')}
                          title={linesTitle(project.net_lines)}
                        >
                          {formatLines(project.net_lines)}
                        </td>
                        <td className={cn(CELL, 'bg-surface-base-primary')}>
                          {formatToolSuccess(project.tool_success_rate, project.tool_calls)}
                        </td>
                        <td className={cn(CELL, 'bg-surface-base-primary border-r')}>
                          <AmountCost value={project.cost_usd} pricing={project} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            setPage={setPage}
            perPage={perPage}
            perPageOptions={DECIMAL_PAGINATION_OPTIONS}
            // Keep the size selector when one page holds every row, so a smaller size can be chosen again.
            alwaysShowPerPage={totalCount > Number(DECIMAL_PAGINATION_OPTIONS[0].value)}
            // Inside a widget the page-background band reads as a stray strip.
            className="!bg-transparent !border-t-0"
          />
        </div>
      </AnalyticsWidget>
      {selectedProject && (
        <RepositoriesDrilldownModal
          project={selectedProject}
          filters={filters}
          onClose={closeModal}
        />
      )}
    </>
  )
}

export default RepositoriesView
