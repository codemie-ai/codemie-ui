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

import { FC, useCallback, useMemo, useState } from 'react'
import { useSnapshot } from 'valtio'

import SearchIcon from '@/assets/icons/search.svg?react'
import Button from '@/components/Button'
import ConfirmationModal from '@/components/ConfirmationModal'
import Input from '@/components/form/Input/Input'
import Pagination from '@/components/Pagination'
import Table from '@/components/Table'
import { ButtonSize, ButtonType, DECIMAL_PAGINATION_OPTIONS } from '@/constants'
import { useTableSelection } from '@/hooks/useTableSelection'
import { useVueRouter } from '@/hooks/useVueRouter'
import { projectsStore } from '@/store/projects'
import { userStore } from '@/store/user'
import { ProjectListItem } from '@/types/entity/projectManagement'
import { ColumnDefinition, DefinitionTypes } from '@/types/table'
import toaster from '@/utils/toaster'

import AssignProjectToCostCenterPopup from './AssignProjectToCostCenterPopup'
import CostCenterProjectsBulkActions from './CostCenterProjectsBulkActions'

interface CostCenterProjectsManagerProps {
  costCenterId: string
  projects: ProjectListItem[]
  onProjectsChanged?: () => Promise<void> | void
}

const PAGE_SIZE = 10

const getColumnDefinitions = (canManage: boolean): ColumnDefinition[] => {
  const columns: ColumnDefinition[] = []

  if (canManage) {
    columns.push({
      key: 'select',
      type: DefinitionTypes.Selection,
      headClassNames: '!w-[4%]',
    })
  }

  columns.push(
    {
      key: 'name',
      label: 'Project',
      type: DefinitionTypes.Custom,
      headClassNames: canManage ? 'w-[20%]' : 'w-[24%]',
    },
    {
      key: 'description',
      label: 'Description',
      type: DefinitionTypes.String,
      headClassNames: 'w-[24%]',
      maxLength: 80,
    },
    { key: 'project_type', label: 'Type', type: DefinitionTypes.String, headClassNames: 'w-[10%]' },
    { key: 'user_count', label: 'Users', type: DefinitionTypes.String, headClassNames: 'w-[8%]' },
    { key: 'admin_count', label: 'Admins', type: DefinitionTypes.String, headClassNames: 'w-[8%]' },
    {
      key: 'created_by',
      label: 'Created by',
      type: DefinitionTypes.String,
      headClassNames: 'w-[12%]',
    },
    {
      key: 'created_at',
      label: 'Created at',
      type: DefinitionTypes.Date,
      headClassNames: 'w-[10%]',
    }
  )

  if (canManage) {
    columns.push({
      key: 'actions',
      label: '',
      type: DefinitionTypes.Custom,
      headClassNames: 'w-[12%]',
    })
  }

  return columns
}

const CostCenterProjectsManager: FC<CostCenterProjectsManagerProps> = ({
  costCenterId,
  projects,
  onProjectsChanged,
}) => {
  const router = useVueRouter()
  const { user } = useSnapshot(userStore)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [projectToUnassign, setProjectToUnassign] = useState<ProjectListItem | null>(null)
  const [isAssignPopupOpen, setIsAssignPopupOpen] = useState(false)

  const canManage = !!user?.isAdmin

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return projects

    return projects.filter((project) => {
      const haystack = [
        project.name,
        project.description || '',
        project.project_type || '',
        project.created_by || '',
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(query)
    })
  }, [projects, search])

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / PAGE_SIZE))

  const pagedProjects = useMemo(() => {
    const start = page * PAGE_SIZE
    return filteredProjects.slice(start, start + PAGE_SIZE)
  }, [filteredProjects, page])

  const tableSelection = useTableSelection<ProjectListItem>({
    totalCount: filteredProjects.length,
    currentItems: pagedProjects,
    onFetchAll: async () => filteredProjects,
  })

  const { selected, clearSelection, onSelectAllChange } = tableSelection

  const columnDefinitions = useMemo(() => getColumnDefinitions(canManage), [canManage])

  const handleOpenProject = useCallback(
    (projectName: string) => {
      router.push({
        name: 'projects-management-detail',
        params: { projectName },
      })
    },
    [router]
  )

  const refresh = useCallback(async () => {
    await onProjectsChanged?.()
  }, [onProjectsChanged])

  const handlePaginationChange = useCallback((nextPage: number) => {
    setPage(nextPage)
  }, [])

  const handleUnassignProject = useCallback(async () => {
    if (!projectToUnassign) return

    await projectsStore.updateProject(projectToUnassign.name, {
      clear_cost_center: true,
    })
    toaster.info(`Project ${projectToUnassign.name} unassigned from cost center`)
    setProjectToUnassign(null)
    await refresh()
  }, [projectToUnassign, refresh])

  const customRenderColumns = useMemo(
    () => ({
      name: (project: ProjectListItem) => (
        <button
          type="button"
          className="text-left text-text-accent-status hover:text-text-accent-status-hover break-all"
          onClick={() => handleOpenProject(project.name)}
        >
          {project.name}
        </button>
      ),
      actions: (project: ProjectListItem) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <Button
            size={ButtonSize.MEDIUM}
            type={ButtonType.DELETE}
            onClick={() => setProjectToUnassign(project)}
            disabled={!canManage}
          >
            Unassign
          </Button>
        </div>
      ),
    }),
    [handleOpenProject, canManage]
  )

  return (
    <>
      <section>
        <div className="flex justify-between items-center gap-4 h-10 mb-5">
          <div className="w-64">
            <Input
              placeholder="Search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(0)
                clearSelection()
              }}
              leftIcon={<SearchIcon className="w-4 h-4 text-text-tertiary" />}
              className="w-full"
            />
          </div>
          {canManage && (
            <CostCenterProjectsBulkActions
              selectedProjects={selected}
              onClearSelection={clearSelection}
              refresh={refresh}
            />
          )}

          {canManage && (
            <Button
              size={ButtonSize.MEDIUM}
              type={ButtonType.PRIMARY}
              onClick={() => setIsAssignPopupOpen(true)}
            >
              Assign to Cost Center
            </Button>
          )}
        </div>

        <Table
          idPath="name"
          {...(canManage
            ? {
                selected,
                onSelectRow: tableSelection.onSelectRow,
                isAllSelected: tableSelection.isAllSelected,
                onSelectAllChange,
              }
            : {})}
          items={pagedProjects}
          columnDefinitions={columnDefinitions}
          customRenderColumns={customRenderColumns}
          loading={false}
          embedded
          className="!mb-0 !mt-0"
        />

        {filteredProjects.length > PAGE_SIZE && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            setPage={handlePaginationChange}
            perPage={PAGE_SIZE}
            perPageOptions={DECIMAL_PAGINATION_OPTIONS}
            className="w-full !bg-transparent !border-t-0 !p-0 !mb-4 !bg-none"
          />
        )}
      </section>

      <ConfirmationModal
        visible={!!projectToUnassign}
        onCancel={() => setProjectToUnassign(null)}
        header="Unassign Project?"
        message={`Are you sure you want to remove ${projectToUnassign?.name} from this cost center?`}
        confirmText="Unassign"
        confirmButtonType={ButtonType.DELETE}
        onConfirm={handleUnassignProject}
        hideIcon
      />

      <AssignProjectToCostCenterPopup
        visible={isAssignPopupOpen}
        costCenterId={costCenterId}
        onClose={() => setIsAssignPopupOpen(false)}
        onSave={async () => {
          setIsAssignPopupOpen(false)
          await refresh()
        }}
      />
    </>
  )
}

export default CostCenterProjectsManager
