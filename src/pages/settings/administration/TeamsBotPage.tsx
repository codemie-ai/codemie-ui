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

import { FC, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useSnapshot } from 'valtio'

import ConfigureIcon from '@/assets/icons/configure.svg?react'
import SearchIcon from '@/assets/icons/search.svg?react'
import Button from '@/components/Button'
import Input from '@/components/form/Input'
import Table from '@/components/Table'
import { ButtonSize, DEFAULT_PAGINATION_OPTIONS } from '@/constants'
import { useDebouncedApply } from '@/hooks/useDebounceApply'
import { useTeamsEnabled } from '@/hooks/useFeatureFlags'
import SettingsLayout from '@/pages/settings/components/SettingsLayout'
import { projectsStore } from '@/store/projects'
import { ColumnDefinition, DefinitionTypes } from '@/types/table'

const columnDefinitions: ColumnDefinition[] = [
  { key: 'name', label: 'Project Name', type: DefinitionTypes.Custom, headClassNames: 'w-[80%]' },
  { key: 'actions', label: '', type: DefinitionTypes.Custom, headClassNames: 'w-[20%]' },
]

interface ProjectNameCellProps {
  name: string
}

const ProjectNameCell: FC<ProjectNameCellProps> = ({ name }) => <span>{name}</span>

interface ProjectActionsCellProps {
  name: string
  onConfigure: (name: string) => void
}

const ProjectActionsCell: FC<ProjectActionsCellProps> = ({ name, onConfigure }) => (
  <div className="flex justify-end">
    <Button size={ButtonSize.MEDIUM} onClick={() => onConfigure(name)}>
      <ConfigureIcon className="w-4 h-4" />
      Configure
    </Button>
  </div>
)

const renderProjectName = (item: { name: string }) => <ProjectNameCell name={item.name} />

const createProjectActionsRenderer =
  (onConfigure: (name: string) => void) => (item: { name: string }) =>
    <ProjectActionsCell name={item.name} onConfigure={onConfigure} />

const TeamsBotPage: FC = () => {
  const navigate = useNavigate()
  const { projects, pagination, loading } = useSnapshot(projectsStore)
  const [isTeamsFeatureEnabled, isConfigLoaded] = useTeamsEnabled()
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (isConfigLoaded && !isTeamsFeatureEnabled) {
      navigate('/settings/administration', { replace: true })
    }
  }, [isTeamsFeatureEnabled, isConfigLoaded, navigate])

  const loadProjects = useCallback((page: number, perPage: number, currentSearch: string) => {
    projectsStore.indexProjects(page, perPage, currentSearch || undefined)
  }, [])

  useDebouncedApply(search, 300, () => {
    loadProjects(0, pagination.perPage, search)
  })

  useEffect(() => {
    loadProjects(0, projectsStore.pagination.perPage, '')
  }, [loadProjects])

  const handlePageChange = useCallback(
    (page: number, newPerPage?: number) => {
      loadProjects(page, newPerPage ?? pagination.perPage, search)
    },
    [pagination.perPage, search, loadProjects]
  )

  const handleConfigure = useCallback(
    (name: string) => {
      navigate(`/settings/administration/teams/${encodeURIComponent(name)}`)
    },
    [navigate]
  )

  const customRenderColumns = useMemo(
    () => ({
      name: renderProjectName,
      actions: createProjectActionsRenderer(handleConfigure),
    }),
    [handleConfigure]
  )

  if (!isConfigLoaded) return null
  if (!isTeamsFeatureEnabled) return null

  const renderContent = () => (
    <div className="flex flex-col h-full pt-4">
      <div className="mb-4 flex items-center gap-2">
        <div className="w-48">
          <Input
            value={search}
            label="Search"
            placeholder="Search projects"
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<SearchIcon className="w-4 h-4 text-text-tertiary" />}
          />
        </div>
      </div>
      <Table
        items={projects}
        columnDefinitions={columnDefinitions}
        customRenderColumns={customRenderColumns}
        loading={loading}
        pagination={{
          page: pagination.page,
          totalPages: pagination.totalPages,
          perPage: pagination.perPage,
        }}
        onPaginationChange={handlePageChange}
        perPageOptions={DEFAULT_PAGINATION_OPTIONS}
      />
    </div>
  )

  return <SettingsLayout contentTitle="Teams bot integration" content={renderContent()} />
}

export default TeamsBotPage
