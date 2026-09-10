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

import { Fragment, type FC, useCallback, useMemo, useRef, useState } from 'react'

import { UNATTRIBUTED_LABEL } from '@/constants/cliAnalytics'
import { MetricFormat, type AnalyticsQueryParams } from '@/types/analytics'
import type { ExtendedSessionsTarget, RepositoryRow } from '@/types/cliAnalytics'
import { formatMetricValue } from '@/utils/analyticsFormatters'
import { formatCliAnalyticsCost } from '@/utils/currency'

import AnalyticsWidget from '../../AnalyticsWidget'
import { buildRepoMetrics } from '../format'
import ExtendedSessionsModal from './ExtendedSessionsModal'
import { useCliAnalyticsRepositories } from '../hooks/useCliAnalyticsRepositories'

interface RepoSummary {
  repository: string | null
  session_count: number
  turns: number
  files_changed: number
  net_lines: number
  tool_success_rate: number
  cost_usd: number
  project_name?: string | null
  branches: RepositoryRow[]
}

interface ProjectGroup {
  project_name: string | null
  repos: RepoSummary[]
}

function aggregateRepos(rows: RepositoryRow[]): ProjectGroup[] {
  const projectMap = new Map<string | null, Map<string | null, RepositoryRow[]>>()

  for (const row of rows) {
    const projectKey = row.project_name || null
    if (!projectMap.has(projectKey)) {
      projectMap.set(projectKey, new Map())
    }
    const repoMap = projectMap.get(projectKey)!
    const group = repoMap.get(row.repository) ?? []
    group.push(row)
    repoMap.set(row.repository, group)
  }

  const groups: ProjectGroup[] = []
  for (const [projectName, repoMap] of projectMap) {
    const repos: RepoSummary[] = []
    for (const [repository, branches] of repoMap) {
      const session_count = branches.reduce((s, b) => s + b.session_count, 0)
      const turns = branches.reduce((s, b) => s + b.turns, 0)
      const files_changed = branches.reduce((s, b) => s + b.files_changed, 0)
      const net_lines = branches.reduce((s, b) => s + b.net_lines, 0)
      const cost_usd = branches.reduce((s, b) => s + b.cost_usd, 0)
      const tool_success_rate =
        session_count > 0
          ? branches.reduce((s, b) => s + b.tool_success_rate * b.session_count, 0) / session_count
          : 0
      repos.push({
        repository,
        session_count,
        turns,
        files_changed,
        net_lines,
        tool_success_rate,
        cost_usd,
        project_name: projectName,
        branches,
      })
    }
    repos.sort((a, b) => b.session_count - a.session_count)
    groups.push({ project_name: projectName, repos })
  }

  return groups.sort((a, b) => {
    const aName = a.project_name || '(no project)'
    const bName = b.project_name || '(no project)'
    return aName.localeCompare(bName)
  })
}

interface RepositoriesViewProps {
  filters: AnalyticsQueryParams
  repositories?: string[]
}

const RepositoriesView: FC<RepositoriesViewProps> = ({ filters, repositories }) => {
  const { rows, loading, error, search, setSearch } = useCliAnalyticsRepositories(
    filters,
    repositories,
    true,
    0
  )
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [selectedTarget, setSelectedTarget] = useState<ExtendedSessionsTarget | null>(null)
  const clearSelectionRef = useRef<(() => void) | null>(null)

  const projectGroups = useMemo(() => aggregateRepos(rows), [rows])

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

  const handleRepoClick = useCallback(
    (repo: RepoSummary) => {
      setSelectedTarget({
        title: repo.repository ?? UNATTRIBUTED_LABEL,
        metrics: buildRepoMetrics({
          ...repo,
          branch: null,
          lines_added: 0,
          lines_removed: 0,
        }),
        sessionFilters: filters,
        repositories: repo.repository != null ? [repo.repository] : undefined,
        isUnattributed: repo.repository === null,
      })
    },
    [filters]
  )

  const handleBranchClick = useCallback(
    (repo: RepoSummary, branch: RepositoryRow) => {
      if (repo.repository === null) {
        setSelectedTarget({
          title: UNATTRIBUTED_LABEL,
          metrics: buildRepoMetrics(branch),
          sessionFilters: filters,
          repositories: undefined,
          isUnattributed: true,
        })
      } else {
        setSelectedTarget({
          title: branch.branch ?? repo.repository,
          metrics: buildRepoMetrics(branch),
          sessionFilters: filters,
          repositories: [repo.repository],
          isUnattributed: false,
          branch: branch.branch ?? undefined,
        })
      }
    },
    [filters]
  )

  const closeModal = useCallback(() => {
    setSelectedTarget(null)
    clearSelectionRef.current?.()
  }, [])

  const isEmpty = projectGroups.length === 0 && !loading

  return (
    <>
      <AnalyticsWidget
        title="Repositories"
        description="Repositories grouped by project. Click a repository or branch to view its sessions."
        loading={loading}
        error={error ? { message: error } : null}
      >
        <div className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Search repositories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm px-3 py-1.5 text-sm rounded-lg border border-border-structural bg-surface-base-secondary text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-border-accent"
          />
          {isEmpty ? (
            <div className="text-text-quaternary text-sm py-4">No repository data available</div>
          ) : (
            <div className="space-y-6">
              {projectGroups.map((group) => (
                <div key={group.project_name || 'no-project'} className="flex flex-col gap-3">
                  <h3 className="text-sm font-semibold text-text-primary">
                    {group.project_name || '(no project)'}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="border-separate border-spacing-0 w-full text-[12px] leading-tight">
                      <thead className="bg-surface-base-tertiary text-text-primary sticky top-0 z-20">
                        <tr className="font-semibold border-y">
                          <th className="px-2 py-2.5 border-border-structural border-t border-b rounded-tl-lg border-l w-6" />
                          <th className="text-left px-4 py-2.5 border-border-structural border-t border-b text-nowrap">
                            Repository / Branch
                          </th>
                          <th className="text-right px-4 py-2.5 border-border-structural border-t border-b text-nowrap w-20">
                            Sessions
                          </th>
                          <th className="text-right px-4 py-2.5 border-border-structural border-t border-b text-nowrap w-20">
                            Turns
                          </th>
                          <th className="text-right px-4 py-2.5 border-border-structural border-t border-b text-nowrap w-20">
                            Files
                          </th>
                          <th className="text-right px-4 py-2.5 border-border-structural border-t border-b text-nowrap w-24">
                            Net Lines
                          </th>
                          <th className="text-right px-4 py-2.5 border-border-structural border-t border-b text-nowrap w-28">
                            Tool Success
                          </th>
                          <th className="text-right px-4 py-2.5 border-border-structural border-t border-b text-nowrap w-24 rounded-tr-lg border-r">
                            Cost
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.repos.map((repo) => {
                          const repoKey = `${group.project_name ?? '__none__'}::${
                            repo.repository ?? UNATTRIBUTED_LABEL
                          }`
                          return (
                            <Fragment key={repoKey}>
                              <tr
                                className="cursor-pointer [&_td]:hover:bg-surface-base-tertiary"
                                onClick={() => handleRepoClick(repo)}
                              >
                                <td
                                  className="text-text-tertiary px-2 py-2 text-center bg-surface-base-secondary border-b border-border-structural border-l w-6 shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleExpand(repoKey)
                                  }}
                                >
                                  {expanded.has(repoKey) ? '▼' : '▶'}
                                </td>
                                <td className="text-text-primary px-4 py-2 bg-surface-base-secondary border-b border-border-structural min-w-0">
                                  <span
                                    className="truncate"
                                    title={repo.repository ?? UNATTRIBUTED_LABEL}
                                  >
                                    {repo.repository ?? UNATTRIBUTED_LABEL}
                                  </span>
                                </td>
                                <td className="text-text-primary px-4 py-2 text-right bg-surface-base-secondary border-b border-border-structural tabular-nums">
                                  {repo.session_count}
                                </td>
                                <td className="text-text-primary px-4 py-2 text-right bg-surface-base-secondary border-b border-border-structural tabular-nums">
                                  {repo.turns}
                                </td>
                                <td className="text-text-primary px-4 py-2 text-right bg-surface-base-secondary border-b border-border-structural tabular-nums">
                                  {repo.files_changed}
                                </td>
                                <td className="text-text-primary px-4 py-2 text-right bg-surface-base-secondary border-b border-border-structural tabular-nums">
                                  {repo.net_lines}
                                </td>
                                <td className="text-text-primary px-4 py-2 text-right bg-surface-base-secondary border-b border-border-structural tabular-nums">
                                  {formatMetricValue(
                                    repo.tool_success_rate,
                                    MetricFormat.PERCENTAGE
                                  )}
                                </td>
                                <td className="text-text-primary px-4 py-2 text-right bg-surface-base-secondary border-b border-border-structural border-r tabular-nums">
                                  {formatCliAnalyticsCost(repo.cost_usd)}
                                </td>
                              </tr>
                              {expanded.has(repoKey) &&
                                repo.branches.map((b) => (
                                  <tr
                                    key={`${repo.repository ?? UNATTRIBUTED_LABEL}::${b.branch}`}
                                    className="cursor-pointer [&_td]:hover:bg-surface-base-secondary"
                                    onClick={handleBranchClick.bind(null, repo, b)}
                                  >
                                    <td className="bg-surface-base-tertiary border-b border-border-structural border-l w-6" />
                                    <td className="text-text-primary pr-4 pl-8 py-2 bg-surface-base-tertiary border-b border-border-structural min-w-0">
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
                                    <td className="text-text-primary px-4 py-2 text-right bg-surface-base-tertiary border-b border-border-structural tabular-nums">
                                      {b.session_count}
                                    </td>
                                    <td className="text-text-primary px-4 py-2 text-right bg-surface-base-tertiary border-b border-border-structural tabular-nums">
                                      {b.turns}
                                    </td>
                                    <td className="text-text-primary px-4 py-2 text-right bg-surface-base-tertiary border-b border-border-structural tabular-nums">
                                      {b.files_changed}
                                    </td>
                                    <td className="text-text-primary px-4 py-2 text-right bg-surface-base-tertiary border-b border-border-structural tabular-nums">
                                      {b.net_lines}
                                    </td>
                                    <td className="text-text-primary px-4 py-2 text-right bg-surface-base-tertiary border-b border-border-structural tabular-nums">
                                      {formatMetricValue(
                                        b.tool_success_rate,
                                        MetricFormat.PERCENTAGE
                                      )}
                                    </td>
                                    <td className="text-text-primary px-4 py-2 text-right bg-surface-base-tertiary border-b border-border-structural border-r tabular-nums">
                                      {formatCliAnalyticsCost(b.cost_usd)}
                                    </td>
                                  </tr>
                                ))}
                            </Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </AnalyticsWidget>
      {selectedTarget && (
        <ExtendedSessionsModal target={selectedTarget} isVisible onHide={closeModal} />
      )}
    </>
  )
}

export default RepositoriesView
