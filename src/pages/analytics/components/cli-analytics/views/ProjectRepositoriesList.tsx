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

import { type FC, useCallback, useRef, useState } from 'react'

import { UNATTRIBUTED_LABEL } from '@/constants/cliAnalytics'
import type { AnalyticsQueryParams } from '@/types/analytics'
import type { ExtendedSessionsTarget, ProjectScope, RepositoryRow } from '@/types/cliAnalytics'

import { buildRepoMetrics } from '../format'
import ExtendedSessionsModal from './ExtendedSessionsModal'
import RepositoriesTable from './RepositoriesTable'
import RepositoryBranchesList from './RepositoryBranchesList'
import { useCliAnalyticsProjectRepositories } from '../hooks/useCliAnalyticsProjectRepositories'

interface ProjectRepositoriesListProps {
  filters: AnalyticsQueryParams
  scope: ProjectScope
}

const ProjectRepositoriesList: FC<ProjectRepositoriesListProps> = ({ filters, scope }) => {
  const { rows, loading, error, page, setPage, totalPages, perPage } =
    useCliAnalyticsProjectRepositories(filters, scope)
  const [selectedRepo, setSelectedRepo] = useState<RepositoryRow | null>(null)
  const clearSelectionRef = useRef<(() => void) | null>(null)

  const closeModal = useCallback(() => {
    setSelectedRepo(null)
    clearSelectionRef.current?.()
  }, [])

  const projectName = 'projectName' in scope ? scope.projectName : undefined
  const isProjectUnattributed = 'isProjectUnattributed' in scope ? true : undefined

  const target: ExtendedSessionsTarget | null = selectedRepo && {
    title: selectedRepo.repository ?? UNATTRIBUTED_LABEL,
    metrics: buildRepoMetrics(selectedRepo),
    sessionFilters: filters,
    repositories: selectedRepo.repository != null ? [selectedRepo.repository] : undefined,
    isUnattributed: selectedRepo.repository === null,
    projectName,
    isProjectUnattributed,
  }

  return (
    <>
      <RepositoriesTable
        title="Repositories"
        description={`Repositories of ${
          projectName ?? UNATTRIBUTED_LABEL
        }. Click a repository to view its branches and sessions.`}
        rows={rows}
        loading={loading}
        error={error}
        page={page + 1}
        setPage={(p) => setPage(p - 1)}
        totalPages={totalPages}
        perPage={perPage}
        onRowClick={setSelectedRepo}
        clearSelectionRef={clearSelectionRef}
      />
      {target && (
        <ExtendedSessionsModal
          target={target}
          isVisible
          onHide={closeModal}
          body={
            selectedRepo?.repository != null ? (
              <RepositoryBranchesList
                filters={filters}
                repository={selectedRepo.repository}
                scope={scope}
              />
            ) : undefined
          }
        />
      )}
    </>
  )
}

export default ProjectRepositoriesList
