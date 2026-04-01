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

import { FC, useMemo, useCallback, useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'

import AssistantSvg from '@/assets/icons/assistant-alt.svg?react'
import Cross18Svg from '@/assets/icons/cross.svg?react'
import DataSourceSvg from '@/assets/icons/datasource.svg?react'
import DeleteSvg from '@/assets/icons/delete.svg?react'
import EditSvg from '@/assets/icons/edit.svg?react'
import IntegrationSvg from '@/assets/icons/integration.svg?react'
import SkillsSvg from '@/assets/icons/lightning.svg?react'
import PlusFilledSvg from '@/assets/icons/plus-filled.svg?react'
import SearchIcon from '@/assets/icons/search.svg?react'
import ViewSvg from '@/assets/icons/view.svg?react'
import WorkflowSvg from '@/assets/icons/workflow.svg?react'
import Button from '@/components/Button'
import ConfirmationModal from '@/components/ConfirmationModal'
import Input from '@/components/form/Input'
import InfoWarning from '@/components/InfoWarning'
import NavigationMore, { NavigationItem } from '@/components/NavigationMore/NavigationMore'
import Table from '@/components/Table'
import { ButtonSize, DECIMAL_PAGINATION_OPTIONS, ButtonType, InfoWarningType } from '@/constants'
import { useDebouncedApply } from '@/hooks/useDebounceApply'
import { useFeatureFlag } from '@/hooks/useFeatureFlags'
import { useVueRouter } from '@/hooks/useVueRouter'
import NameLinkCell from '@/pages/settings/administration/components/NameLinkCell'
import SettingsLayout from '@/pages/settings/components/SettingsLayout'
import { projectsStore } from '@/store/projects'
import { userStore } from '@/store/user'
import { Project, ProjectType } from '@/types/entity/project'
import { ColumnDefinition, DefinitionTypes } from '@/types/table'
import toaster from '@/utils/toaster'

import ProjectModal, { ProjectFormData } from './ProjectModal'

const TOOLTIPS = {
  ASSISTANTS: 'Project Assistants',
  WORKFLOWS: 'Workflows',
  INTEGRATIONS: 'Integrations',
  DATA_SOURCES: 'Data Sources',
  SKILLS: 'Skills',
}

const ERROR_MESSAGES = {
  DELETE_NO_COUNT_DATA: 'Cannot delete project: assignment count data unavailable',
  DELETE_HAS_ASSIGNMENTS:
    'This project has assigned entities and cannot be deleted. Remove all assignments first.',
}

const WARNING_MESSAGES = {
  DELETE_WITH_ASSIGNMENTS: 'This project has assigned entities. Deleting it may affect them.',
  DELETE_PERMANENT: 'This action cannot be undone. The project will be permanently removed.',
}

const FEATURE_FLAG_PROJECT_CREATION = 'features:userAbilityToCreateProject'
const FEATURE_FLAG_COST_CENTERS = 'features:costCenters'
const COST_CENTER_COLUMN_KEY = 'cost_center_name'

const calculateTotalAssignments = (project: Project): number => {
  const c = project.counters
  if (!c) return 0
  return (
    c.assistants_count +
    c.workflows_count +
    c.integrations_count +
    c.datasources_count +
    c.skills_count
  )
}

const columnDefinitions: ColumnDefinition[] = [
  {
    key: 'name',
    label: 'Name',
    type: DefinitionTypes.Custom,
    sortable: true,
    headClassNames: 'w-[22%] min-w-[180px]',
  },
  {
    key: COST_CENTER_COLUMN_KEY,
    label: 'Cost center',
    type: DefinitionTypes.Custom,
    headClassNames: 'w-[14%]',
  },
  { key: 'created_at', label: 'Created', type: DefinitionTypes.Date, headClassNames: 'w-[12%]' },
  {
    key: 'assignments',
    label: 'Assignments',
    type: DefinitionTypes.Custom,
    headClassNames: 'w-[26%]',
  },
  { key: 'users', label: 'Users', type: DefinitionTypes.Custom, headClassNames: 'w-[10%]' },
  { key: 'actions', label: 'Actions', type: DefinitionTypes.Custom, headClassNames: 'w-[8%]' },
]

const ProjectsManagementFull: FC = () => {
  const router = useVueRouter()
  const { user: currentUser } = useSnapshot(userStore)
  const { projects, pagination, loading } = useSnapshot(projectsStore)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [deletingProject, setDeletingProject] = useState<Project | null>(null)

  const isUserManagementEnabled = window._env_?.VITE_ENABLE_USER_MANAGEMENT === 'true'

  // Check if project creation feature is enabled
  const [isProjectCreationEnabled, isConfigLoaded] = useFeatureFlag(FEATURE_FLAG_PROJECT_CREATION)
  const [isCostCentersEnabled] = useFeatureFlag(FEATURE_FLAG_COST_CENTERS)

  const effectiveColumnDefinitions = useMemo(
    () =>
      isCostCentersEnabled
        ? columnDefinitions
        : columnDefinitions.filter((c) => c.key !== COST_CENTER_COLUMN_KEY),
    [isCostCentersEnabled]
  )

  const canManageProject = useCallback(
    (project: Project): boolean => {
      // Super Admin can manage all projects
      if (currentUser?.isAdmin) return true

      // Project Admin can manage their own projects
      return (
        currentUser?.applications?.includes(project.name) &&
        currentUser?.applicationsAdmin?.includes(project.name)
      )
    },
    [currentUser]
  )

  useEffect(() => {
    projectsStore
      .indexProjects(pagination.page, pagination.perPage, search || undefined)
      .catch((error) => {
        console.error('Failed to load projects:', error)
      })
  }, [pagination.page, pagination.perPage])

  useDebouncedApply(search, 500, () =>
    projectsStore.indexProjects(0, pagination.perPage, search || undefined).catch((error) => {
      console.error('Failed to load projects:', error)
    })
  )

  const handleAddProject = useCallback(() => {
    setEditingProject(null)
    setShowModal(true)
  }, [])

  const handleEditProject = useCallback((project: Project) => {
    setEditingProject(project)
    setShowModal(true)
  }, [])

  const handleDeleteProject = useCallback((project: Project) => {
    setDeletingProject(project)
  }, [])

  const handleOpenProjectDetails = useCallback(
    (projectName: string) => {
      router.push({
        name: 'projects-management-detail',
        params: { projectName },
      })
    },
    [router]
  )

  const refreshProjects = useCallback(() => {
    projectsStore
      .indexProjects(pagination.page, pagination.perPage, search || undefined)
      .catch((error) => {
        console.error('Failed to refresh projects:', error)
      })
  }, [pagination.page, pagination.perPage, search])

  const handleModalClose = useCallback(() => {
    setShowModal(false)
    setEditingProject(null)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!deletingProject) return

    try {
      await projectsStore.deleteProject(deletingProject.id)
      toaster.info('Project deleted successfully')
      setDeletingProject(null)
    } catch (error: any) {
      console.error('Failed to delete project:', error)
      toaster.error(error?.message || 'Failed to delete project')
    }
  }, [deletingProject])

  const handleModalSubmit = useCallback(
    async (data: ProjectFormData) => {
      const isEdit = !!editingProject

      try {
        if (isEdit) {
          await projectsStore.updateProject(editingProject.id, data)
          toaster.info('Project updated successfully')
        } else {
          await projectsStore.createProject(data)
          toaster.info('Project created successfully')
          await userStore.getCurrentUser()
        }
        handleModalClose()
        refreshProjects()
      } catch (error: any) {
        console.error(isEdit ? 'Failed to update project:' : 'Failed to create project:', error)
        const errorMessage =
          error?.parsedError?.message ||
          error?.message ||
          (isEdit ? 'Failed to update project' : 'Failed to create project')
        toaster.error(errorMessage)
      }
    },
    [editingProject, handleModalClose, refreshProjects]
  )

  const handlePageChange = useCallback(
    (page: number, newPerPage?: number) => {
      const perPage = newPerPage ?? pagination.perPage
      projectsStore.indexProjects(page, perPage, search || undefined).catch((error) => {
        console.error('Failed to load projects:', error)
      })
    },
    [pagination.perPage, search]
  )

  const customRenderColumns = useMemo(
    () => ({
      name: (item: Project) => {
        const isPersonal = item.project_type === ProjectType.PERSONAL

        return (
          <NameLinkCell
            disabled={isPersonal}
            onClick={() => handleOpenProjectDetails(item.name)}
            tooltip={isPersonal ? 'Personal projects cannot be viewed or updated.' : undefined}
          >
            {item.name}
          </NameLinkCell>
        )
      },
      [COST_CENTER_COLUMN_KEY]: (item: Project) => (
        <span className="text-text-primary break-all">{item.cost_center_name || '-'}</span>
      ),
      users: (item: Project) => <span className="text-text-primary">{item.user_count ?? 0}</span>,
      assignments: (item: Project) => {
        const c = item.counters

        return (
          <div className="flex gap-2 items-center">
            <div
              className="flex items-center border rounded-md px-2 py-1 border-border-structural w-[68px]"
              data-tooltip-id="react-tooltip"
              data-tooltip-content={TOOLTIPS.ASSISTANTS}
            >
              <AssistantSvg className="w-5 h-5" />
              <span className="ml-2">{c?.assistants_count ?? 0}</span>
            </div>
            <div
              className="flex items-center border rounded-md px-2 py-1 border-border-structural w-[68px]"
              data-tooltip-id="react-tooltip"
              data-tooltip-content={TOOLTIPS.WORKFLOWS}
            >
              <WorkflowSvg className="w-5 h-5" />
              <span className="ml-2">{c?.workflows_count ?? 0}</span>
            </div>
            <div
              className="flex items-center border rounded-md px-2 py-1 border-border-structural w-[68px]"
              data-tooltip-id="react-tooltip"
              data-tooltip-content={TOOLTIPS.INTEGRATIONS}
            >
              <IntegrationSvg className="w-5 h-5" />
              <span className="ml-2">{c?.integrations_count ?? 0}</span>
            </div>
            <div
              className="flex items-center border rounded-md px-2 py-1 border-border-structural w-[68px]"
              data-tooltip-id="react-tooltip"
              data-tooltip-content={TOOLTIPS.DATA_SOURCES}
            >
              <DataSourceSvg className="w-5 h-5" />
              <span className="ml-2">{c?.datasources_count ?? 0}</span>
            </div>
            <div
              className="flex items-center border rounded-md px-2 py-1 border-border-structural w-[68px]"
              data-tooltip-id="react-tooltip"
              data-tooltip-content={TOOLTIPS.SKILLS}
            >
              <SkillsSvg className="w-5 h-5" />
              <span className="ml-2">{c?.skills_count ?? 0}</span>
            </div>
          </div>
        )
      },
      actions: (item: Project) => {
        const isPersonal = item.project_type === ProjectType.PERSONAL

        if (isPersonal) return null

        const hasCountData = item.counters !== undefined
        const totalCount = calculateTotalAssignments(item)
        const shouldDisableDelete = !hasCountData || totalCount > 0

        let deleteTooltip: string | undefined
        if (!hasCountData) {
          deleteTooltip = ERROR_MESSAGES.DELETE_NO_COUNT_DATA
        } else if (totalCount > 0) {
          deleteTooltip = ERROR_MESSAGES.DELETE_HAS_ASSIGNMENTS
        }

        const canManage = canManageProject(item)

        const menuItems: NavigationItem[] = []

        if (isUserManagementEnabled) {
          menuItems.push({
            title: 'View',
            icon: <ViewSvg className="w-[18px] h-[18px]" />,
            onClick: () => handleOpenProjectDetails(item.name),
          })
        }

        // Only Project Admin/Super Admin can Edit, Delete
        if (canManage) {
          menuItems.push(
            {
              title: 'Edit',
              icon: <EditSvg />,
              onClick: () => handleEditProject(item),
            },
            {
              title: 'Delete',
              icon: <DeleteSvg />,
              onClick: () => handleDeleteProject(item),
              disabled: shouldDisableDelete,
              tooltip: deleteTooltip,
            }
          )
        }

        return (
          <div className="flex justify-end">
            <NavigationMore hideOnClickInside={true} items={menuItems} />
          </div>
        )
      },
    }),
    [
      handleEditProject,
      handleDeleteProject,
      handleOpenProjectDetails,
      canManageProject,
      isUserManagementEnabled,
    ]
  )

  const renderHeaderActions = useMemo(() => {
    if (!isConfigLoaded) return null
    if (!isProjectCreationEnabled) return null

    return (
      <Button onClick={handleAddProject} size={ButtonSize.MEDIUM}>
        <PlusFilledSvg />
        Create
      </Button>
    )
  }, [handleAddProject, isProjectCreationEnabled, isConfigLoaded])

  const renderContent = () => {
    return (
      <div className="flex flex-col h-full pt-4">
        <div className="mb-4 flex items-end gap-4">
          <div className="w-48">
            <Input
              label="Search"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<SearchIcon className="w-4 h-4 text-text-tertiary" />}
              className="w-full"
            />
          </div>
          {search && (
            <div className="flex items-end">
              <Button onClick={() => setSearch('')} variant="tertiary" className="gap-[5px] h-9">
                <Cross18Svg className="w-3.5 h-3.5" /> Clear All
              </Button>
            </div>
          )}
        </div>
        <Table
          items={projects || []}
          columnDefinitions={effectiveColumnDefinitions}
          customRenderColumns={customRenderColumns}
          loading={loading}
          pagination={{
            page: pagination.page,
            totalPages: pagination.totalPages,
            perPage: pagination.perPage,
          }}
          onPaginationChange={handlePageChange}
          perPageOptions={DECIMAL_PAGINATION_OPTIONS}
        />

        <ProjectModal
          visible={showModal}
          project={editingProject}
          onHide={handleModalClose}
          onSubmit={handleModalSubmit}
        />

        <ConfirmationModal
          visible={!!deletingProject}
          onCancel={() => setDeletingProject(null)}
          header="Delete Project?"
          message={`Are you sure you want to delete "${deletingProject?.name}"?`}
          confirmText="Delete"
          confirmButtonType={ButtonType.DELETE}
          confirmButtonIcon={<Cross18Svg className="w-4 mr-px" />}
          onConfirm={confirmDelete}
        >
          {deletingProject && calculateTotalAssignments(deletingProject) > 0 ? (
            <InfoWarning
              type={InfoWarningType.WARNING}
              message={WARNING_MESSAGES.DELETE_WITH_ASSIGNMENTS}
              className="mt-4"
            />
          ) : (
            <InfoWarning
              type={InfoWarningType.INFO}
              message={WARNING_MESSAGES.DELETE_PERMANENT}
              className="mt-4"
            />
          )}
        </ConfirmationModal>
      </div>
    )
  }

  return (
    <SettingsLayout
      contentTitle="Projects management"
      content={renderContent()}
      rightContent={renderHeaderActions}
    />
  )
}

export default ProjectsManagementFull
