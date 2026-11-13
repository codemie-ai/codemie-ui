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

import { Fragment, type FC, useCallback, useRef, useState } from 'react'

import ChevronDownIcon from '@/assets/icons/chevron-down.svg?react'
import ChevronRightIcon from '@/assets/icons/chevron-right.svg?react'
import Pagination from '@/components/Pagination'
import { DECIMAL_PAGINATION_OPTIONS } from '@/constants'
import { NO_PROJECT_LABEL, UNATTRIBUTED_LABEL } from '@/constants/cliAnalytics'
import type { AnalyticsQueryParams } from '@/types/analytics'
import type {
  ExtendedSessionsTarget,
  ProjectRow,
  RepositoryBranchRow,
  RepositoryRow,
} from '@/types/cliAnalytics'
import { formatSpend } from '@/utils/currency'
import { cn } from '@/utils/utils'

import AnalyticsWidget from '../../AnalyticsWidget'
import { buildRepoMetrics, formatLines, formatToolSuccess, linesTitle } from '../format'
import CostIncompleteNotice from './CostIncompleteNotice'
import ExtendedSessionsModal from './ExtendedSessionsModal'
import { useCliAnalyticsProjects } from '../hooks/useCliAnalyticsProjects'

const CELL = 'text-text-primary px-4 py-2 text-right border-b border-border-structural tabular-nums'

type CountsRow = Pick<
  ProjectRow,
  | 'session_count'
  | 'turns'
  | 'files_changed'
  | 'net_lines'
  | 'tool_success_rate'
  | 'tool_calls'
  | 'cost_usd'
>

// The six figures every level shows, in column order.
const CountCells: FC<{ row: CountsRow; bg: string }> = ({ row, bg }) => (
  <>
    <td className={cn(CELL, bg)}>{row.session_count}</td>
    <td className={cn(CELL, bg)}>{row.turns}</td>
    <td className={cn(CELL, bg)}>{row.files_changed}</td>
    <td className={cn(CELL, bg)} title={linesTitle(row.net_lines)}>
      {formatLines(row.net_lines)}
    </td>
    <td className={cn(CELL, bg)}>{formatToolSuccess(row.tool_success_rate, row.tool_calls)}</td>
    <td className={cn(CELL, bg, 'border-r')}>{formatSpend(row.cost_usd)}</td>
  </>
)

const Caret: FC<{
  open: boolean
  name: string
  onToggle: () => void
  disabled?: boolean
  className?: string
}> = ({ open, name, onToggle, disabled, className }) => (
  <button
    type="button"
    aria-label={`${open ? 'Collapse' : 'Expand'} ${name}`}
    aria-expanded={open}
    disabled={disabled}
    className={cn(
      'flex w-4 shrink-0 items-center justify-center text-text-heading hover:text-text-accent-hover transition-colors',
      'disabled:cursor-default disabled:hover:text-text-heading',
      className
    )}
    onClick={(e) => {
      e.stopPropagation()
      onToggle()
    }}
  >
    {/* The same chevrons as the filter accordions (FilterAccordionItem). */}
    {open ? <ChevronDownIcon className="w-[13px]" /> : <ChevronRightIcon className="w-[13px]" />}
  </button>
)

const HEAD = 'px-4 py-2.5 border-border-structural border-t border-b text-nowrap'

interface RepositoriesViewProps {
  filters: AnalyticsQueryParams
  repositories?: string[]
}

const RepositoriesView: FC<RepositoriesViewProps> = ({ filters, repositories }) => {
  // The server pages projects; each row carries its repositories and their branches.
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
    appliedSearch,
  } = useCliAnalyticsProjects(filters, repositories)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [selectedTarget, setSelectedTarget] = useState<ExtendedSessionsTarget | null>(null)
  const clearSelectionRef = useRef<(() => void) | null>(null)

  // Read the term the rows were requested with, so the page expands with the results, not before.
  const searchTerm = appliedSearch.trim().toLowerCase()
  const isSearching = searchTerm !== ''

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const handleProjectClick = useCallback(
    (project: ProjectRow) => {
      // Under a search a project that does not match by name lists only its matching repositories,
      // and its figures cover only those, so its sessions are limited to the same repositories.
      const matchedByName = project.project_name?.toLowerCase().includes(searchTerm) ?? false
      const matchingRepositories =
        isSearching && !matchedByName
          ? project.repositories.flatMap((repo) => (repo.repository ? [repo.repository] : []))
          : undefined
      setSelectedTarget({
        title: project.project_name ?? NO_PROJECT_LABEL,
        metrics: buildRepoMetrics(project),
        sessionFilters: filters,
        repositories: matchingRepositories,
        isUnattributed: false,
        projectName: project.project_name || undefined,
        isProjectUnattributed: !project.project_name,
      })
    },
    [filters, isSearching, searchTerm]
  )

  const handleRepoClick = useCallback(
    (repo: RepositoryRow) => {
      setSelectedTarget({
        title: repo.repository ?? UNATTRIBUTED_LABEL,
        metrics: buildRepoMetrics(repo),
        sessionFilters: filters,
        repositories: repo.repository != null ? [repo.repository] : undefined,
        isUnattributed: repo.repository === null,
        projectName: repo.project_name || undefined,
        isProjectUnattributed: !repo.project_name,
      })
    },
    [filters]
  )

  const handleBranchClick = useCallback(
    (repo: RepositoryRow, branch: RepositoryBranchRow) => {
      if (repo.repository === null) {
        setSelectedTarget({
          title: UNATTRIBUTED_LABEL,
          metrics: buildRepoMetrics(branch),
          sessionFilters: filters,
          repositories: undefined,
          isUnattributed: true,
          projectName: repo.project_name || undefined,
          isProjectUnattributed: !repo.project_name,
        })
      } else {
        setSelectedTarget({
          title: branch.branch ?? repo.repository,
          metrics: buildRepoMetrics(branch),
          sessionFilters: filters,
          repositories: [repo.repository],
          isUnattributed: false,
          branch: branch.branch ?? undefined,
          projectName: repo.project_name || undefined,
          isProjectUnattributed: !repo.project_name,
        })
      }
    },
    [filters]
  )

  const closeModal = useCallback(() => {
    setSelectedTarget(null)
    clearSelectionRef.current?.()
  }, [])

  const isEmpty = projects.length === 0 && !loading

  return (
    <>
      <AnalyticsWidget
        title="Repositories"
        description="Repositories grouped by project. Click a project, repository or branch to view its sessions."
        loading={loading}
        error={error ? { message: error } : null}
      >
        <div className="flex flex-col gap-4">
          <CostIncompleteNotice state={costState} />
          <input
            type="text"
            placeholder="Search projects or repositories..."
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
                    <th className={cn(HEAD, 'text-left rounded-tl-lg border-l')}>
                      Project / Repository / Branch
                    </th>
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
                    const projectName = project.project_name ?? NO_PROJECT_LABEL
                    const projectKey = `project::${project.project_name ?? '__none__'}`
                    const projectOpen = isSearching || expanded.has(projectKey)
                    return (
                      <Fragment key={projectKey}>
                        <tr
                          className="cursor-pointer [&_td]:hover:bg-surface-base-tertiary"
                          onClick={() => handleProjectClick(project)}
                        >
                          <td className="text-text-primary font-semibold px-4 py-2 bg-surface-base-primary border-b border-border-structural border-l min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <Caret
                                open={projectOpen}
                                name={projectName}
                                onToggle={() => toggleExpand(projectKey)}
                                // Every project is open while searching; a toggle would change nothing visible.
                                disabled={isSearching}
                              />
                              <span className="truncate" title={projectName}>
                                {projectName}
                              </span>
                            </div>
                          </td>
                          <CountCells row={project} bg="bg-surface-base-primary font-semibold" />
                        </tr>
                        {projectOpen &&
                          project.repositories.map((repo) => {
                            const repoName = repo.repository ?? UNATTRIBUTED_LABEL
                            const repoKey = `${project.project_name ?? '__none__'}::${repoName}`
                            const repoOpen = expanded.has(repoKey)
                            return (
                              <Fragment key={repoKey}>
                                <tr
                                  className="cursor-pointer [&_td]:hover:bg-surface-base-tertiary"
                                  onClick={() => handleRepoClick(repo)}
                                >
                                  <td className="text-text-primary pl-8 pr-4 py-2 bg-surface-base-secondary border-b border-border-structural border-l min-w-0">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <Caret
                                        open={repoOpen}
                                        name={repoName}
                                        onToggle={() => toggleExpand(repoKey)}
                                      />
                                      <span className="truncate" title={repoName}>
                                        {repoName}
                                      </span>
                                    </div>
                                  </td>
                                  <CountCells row={repo} bg="bg-surface-base-secondary" />
                                </tr>
                                {repoOpen &&
                                  (repo.branches ?? []).map((b) => (
                                    <tr
                                      key={`${repoKey}::${b.branch}`}
                                      className="cursor-pointer [&_td]:hover:bg-surface-base-secondary"
                                      onClick={handleBranchClick.bind(null, repo, b)}
                                    >
                                      <td className="text-text-primary pl-16 pr-4 py-2 bg-surface-base-tertiary border-b border-border-structural border-l min-w-0">
                                        <div className="flex items-center gap-1 min-w-0">
                                          <span className="text-text-tertiary shrink-0">⎇</span>
                                          <span
                                            className="text-text-secondary truncate"
                                            title={b.branch || '(none)'}
                                          >
                                            {b.branch || '(none)'}
                                          </span>
                                        </div>
                                      </td>
                                      <CountCells row={b} bg="bg-surface-base-tertiary" />
                                    </tr>
                                  ))}
                              </Fragment>
                            )
                          })}
                      </Fragment>
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
      {selectedTarget && (
        <ExtendedSessionsModal target={selectedTarget} isVisible onHide={closeModal} />
      )}
    </>
  )
}

export default RepositoriesView
