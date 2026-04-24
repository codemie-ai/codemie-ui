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

import { FC, useMemo, useCallback, useEffect, useRef, useState } from 'react'
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
import Select from '@/components/form/Select'
import InfoWarning from '@/components/InfoWarning'
import NavigationMore, { NavigationItem } from '@/components/NavigationMore/NavigationMore'
import Table from '@/components/Table'
import { ButtonSize, DECIMAL_PAGINATION_OPTIONS, ButtonType, InfoWarningType } from '@/constants'
import { useDebouncedApply } from '@/hooks/useDebounceApply'
import { useFeatureFlag } from '@/hooks/useFeatureFlags'
import { useVueRouter } from '@/hooks/useVueRouter'
import BudgetSpendCell from '@/pages/settings/administration/components/BudgetSpendCell'
import NameLinkCell from '@/pages/settings/administration/components/NameLinkCell'
import SettingsLayout from '@/pages/settings/components/SettingsLayout'
import { projectsStore } from '@/store/projects'
import { userStore } from '@/store/user'
import {
  BudgetCategory,
  BUDGET_CATEGORY_OPTIONS,
} from '@/types/entity/budget'
import { Project, ProjectType } from '@/types/entity/project'
import { ColumnDefinition, DefinitionTypes, SortState } from '@/types/table'
import toaster from '@/utils/toaster'
import { displayValue } from '@/utils/utils'

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
const BUDGETS_COLUMN_KEY = 'budgets'

const budgetAssignmentFilterOptions = [
  { label: 'All projects', value: 'all' },
  { label: 'With assigned budgets', value: 'assigned' },
]

const budgetCategoryFilterOptions = [
  { label: 'All categories', value: '' },
  ...BUDGET_CATEGORY_OPTIONS,
]

const parseBudgetAssignmentFilter = (value: unknown): 'all' | 'assigned' =>
  value === 'assigned' ? 'assigned' : 'all'

const parseBudgetCategoryFilter = (value: unknown): BudgetCategory | '' =>
  BUDGET_CATEGORY_OPTIONS.some((option) => option.value === value) ? (value as BudgetCategory) : ''

const formatCurrency = (value: number): string =>
  `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const formatSpend = (value: number | null | undefined): string =>
  value == null ? '-' : formatCurrency(value)

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
    headClassNames: 'w-[15%]',
  },
  {
    key: COST_CENTER_COLUMN_KEY,
    label: 'Cost center',
    type: DefinitionTypes.Custom,
    headClassNames: 'w-[8%]',
  },
  {
    key: BUDGETS_COLUMN_KEY,
    label: 'Budgets',
    type: DefinitionTypes.Custom,
    headClassNames: 'w-[26%]',
  },
  {
    key: 'created_at',
    label: 'Created',
    type: DefinitionTypes.Date,
    sortable: true,
    headClassNames: 'w-[9%]',
  },
  {
    key: 'assignments',
    label: 'Assignments',
    type: DefinitionTypes.Custom,
    headClassNames: 'w-[21%]',
  },
  { key: 'users', label: 'Users', type: DefinitionTypes.Custom, headClassNames: 'w-[5%]' },
  { key: 'actions', label: 'Actions', type: DefinitionTypes.Custom, headClassNames: 'w-[6%]' },
]

const ProjectsManagementFull: FC = () => {
  const router = useVueRouter()
  const route = router.currentRoute.value
  const { user: currentUser } = useSnapshot(userStore)
  const { projects, pagination, loading } = useSnapshot(projectsStore)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortState>({})
  const [showModal, setShowModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [deletingProject, setDeletingProject] = useState<Project | null>(null)
  const [budgetAssignmentFilter, setBudgetAssignmentFilter] = useState<'all' | 'assigned'>(() =>
    parseBudgetAssignmentFilter(route.query.budget_assignment)
  )
  const [budgetCategory, setBudgetCategory] = useState<BudgetCategory | ''>(() =>
    parseBudgetCategoryFilter(route.query.budget_category)
  )
  const skipPaginationReloadRef = useRef(false)
  const previousBudgetFiltersRef = useRef({
    budgetAssignmentFilter: 'all' as 'all' | 'assigned',
    budgetCategory: '' as BudgetCategory | '',
  })

  const isUserManagementEnabled = window._env_?.VITE_ENABLE_USER_MANAGEMENT === 'true'
  const isBudgetManagementEnabled = window._env_?.VITE_ENABLE_BUDGET_MANAGEMENT === 'true'

  // Check if project creation feature is enabled
  const [isProjectCreationForNonAdminsEnabled, isConfigLoaded] = useFeatureFlag(
    FEATURE_FLAG_PROJECT_CREATION
  )
  const [isCostCentersEnabled] = useFeatureFlag(FEATURE_FLAG_COST_CENTERS)

  const budgetQueryParams = useMemo(
    () =>
      isBudgetManagementEnabled
        ? {
            includeBudgets: true,
            hasAssignedBudgets: budgetAssignmentFilter === 'assigned',
            budgetCategory: budgetCategory || null,
          }
        : undefined,
    [isBudgetManagementEnabled, budgetAssignmentFilter, budgetCategory]
  )
  const budgetQueryParamsRef = useRef(budgetQueryParams)

  useEffect(() => {
    budgetQueryParamsRef.current = budgetQueryParams
  }, [budgetQueryParams])

  useEffect(() => {
    const nextBudgetAssignmentFilter = parseBudgetAssignmentFilter(route.query.budget_assignment)
    const nextBudgetCategory = parseBudgetCategoryFilter(route.query.budget_category)

    setBudgetAssignmentFilter((current) =>
      current === nextBudgetAssignmentFilter ? current : nextBudgetAssignmentFilter
    )
    setBudgetCategory((current) => (current === nextBudgetCategory ? current : nextBudgetCategory))
  }, [route.query.budget_assignment, route.query.budget_category])

  useEffect(() => {
    const nextQuery = { ...route.query } as Record<string, string | number | boolean>

    if (budgetAssignmentFilter === 'assigned') {
      nextQuery.budget_assignment = budgetAssignmentFilter
    } else {
      delete nextQuery.budget_assignment
    }

    if (budgetCategory) {
      nextQuery.budget_category = budgetCategory
    } else {
      delete nextQuery.budget_category
    }

    const currentBudgetAssignment = parseBudgetAssignmentFilter(route.query.budget_assignment)
    const currentBudgetCategory = parseBudgetCategoryFilter(route.query.budget_category)

    if (
      currentBudgetAssignment === budgetAssignmentFilter &&
      currentBudgetCategory === budgetCategory
    ) {
      return
    }

    router.replace({
      path: route.path,
      query: nextQuery,
    })
  }, [budgetAssignmentFilter, budgetCategory, route.path, route.query, router])

  const effectiveColumnDefinitions = useMemo(
    () =>
      columnDefinitions.filter(
        (c) =>
          (isCostCentersEnabled || c.key !== COST_CENTER_COLUMN_KEY) &&
          (isBudgetManagementEnabled || c.key !== BUDGETS_COLUMN_KEY)
      ),
    [isCostCentersEnabled, isBudgetManagementEnabled]
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

  const loadProjects = useCallback(
    (
      page: number,
      perPage: number,
      nextSearch: string | undefined,
      nextSortKey: string | undefined,
      nextSortOrder: string | undefined,
      nextBudgetParams = budgetQueryParamsRef.current
    ) =>
      projectsStore.indexProjects(
        page,
        perPage,
        nextSearch,
        nextSortKey,
        nextSortOrder,
        false,
        nextBudgetParams
      ),
    []
  )

  const handleSort = useCallback(
    (key: string) => {
      let newOrder: 'asc' | 'desc' | undefined = 'asc'
      if (sort.sortKey === key) {
        newOrder = sort.sortOrder === 'asc' ? 'desc' : undefined
      }
      const newSort: SortState = { sortKey: newOrder ? key : undefined, sortOrder: newOrder }

      setSort(newSort)

      if (projectsStore.pagination.page !== 0) {
        skipPaginationReloadRef.current = true
        projectsStore.pagination.page = 0
      }

      loadProjects(
        0,
        pagination.perPage,
        search || undefined,
        newSort.sortKey,
        newSort.sortOrder
      ).catch((error) => {
        console.error('Failed to load projects:', error)
      })
    },
    [loadProjects, pagination.perPage, search, sort.sortKey, sort.sortOrder]
  )

  useEffect(() => {
    if (skipPaginationReloadRef.current) {
      skipPaginationReloadRef.current = false
      return
    }

    loadProjects(
      pagination.page,
      pagination.perPage,
      search || undefined,
      sort.sortKey,
      sort.sortOrder
    ).catch((error) => {
      console.error('Failed to load projects:', error)
    })
  }, [loadProjects, pagination.page, pagination.perPage])

  useEffect(() => {
    if (!isBudgetManagementEnabled) return

    const hasBudgetFiltersChanged =
      previousBudgetFiltersRef.current.budgetAssignmentFilter !== budgetAssignmentFilter ||
      previousBudgetFiltersRef.current.budgetCategory !== budgetCategory

    previousBudgetFiltersRef.current = {
      budgetAssignmentFilter,
      budgetCategory,
    }

    if (!hasBudgetFiltersChanged) return

    if (projectsStore.pagination.page !== 0) {
      skipPaginationReloadRef.current = true
      projectsStore.pagination.page = 0
    }

    loadProjects(
      0,
      pagination.perPage,
      search || undefined,
      sort.sortKey,
      sort.sortOrder,
      budgetQueryParamsRef.current
    ).catch((error) => {
      console.error('Failed to load projects:', error)
    })
  }, [
    budgetAssignmentFilter,
    budgetCategory,
    isBudgetManagementEnabled,
    loadProjects,
    pagination.perPage,
    search,
    sort.sortKey,
    sort.sortOrder,
  ])

  useDebouncedApply(search, 500, () => {
    // Clear sort when search changes — backend ignores sort_by during search (relevance ordering),
    // so resetting the indicator keeps the UI consistent with what the server actually returns.
    setSort({})
    if (projectsStore.pagination.page !== 0) {
      skipPaginationReloadRef.current = true
      projectsStore.pagination.page = 0
    }
    loadProjects(0, pagination.perPage, search || undefined, undefined, undefined).catch(
      (error) => {
        console.error('Failed to load projects:', error)
      }
    )
  })

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
    loadProjects(
      pagination.page,
      pagination.perPage,
      search || undefined,
      sort.sortKey,
      sort.sortOrder
    ).catch((error) => {
      console.error('Failed to refresh projects:', error)
    })
  }, [loadProjects, pagination.page, pagination.perPage, search, sort.sortKey, sort.sortOrder])

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
      loadProjects(page, perPage, search || undefined, sort.sortKey, sort.sortOrder).catch(
        (error) => {
          console.error('Failed to load projects:', error)
        }
      )
    },
    [loadProjects, pagination.perPage, search, sort.sortKey, sort.sortOrder]
  )

  const customRenderColumns = useMemo(
    () => ({
      name: (item: Project) => {
        return (
          <NameLinkCell onClick={() => handleOpenProjectDetails(item.name)}>
            {item.name}
          </NameLinkCell>
        )
      },
      [COST_CENTER_COLUMN_KEY]: (item: Project) => (
        <span className="text-text-primary break-all">{displayValue(item.cost_center_name)}</span>
      ),
      [BUDGETS_COLUMN_KEY]: (item: Project) => (
        <BudgetSpendCell
          items={(item.budgets ?? []).map((budget) => ({
            key: budget.budget_id,
            category: budget.budget_category,
            max_budget: budget.max_budget,
            current_spending: budget.current_spending,
            tooltip: `Spend: ${formatSpend(budget.current_spending)} · Soft: ${formatCurrency(
              budget.soft_budget
            )} · Duration: ${budget.budget_duration} · Sync: ${budget.provider_sync_status ?? '-'} · Members: ${
              budget.member_count
            } · Allocated total: ${formatCurrency(budget.allocated_member_budget_total)}`,
          }))}
        />
      ),
      users: (item: Project) => <span className="text-text-primary">{item.user_count ?? 0}</span>,
      assignments: (item: Project) => {
        const c = item.counters

        return (
          <div className="flex flex-wrap gap-2 items-center">
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
        const canManage = canManageProject(item)

        const menuItems: NavigationItem[] = []

        if (isUserManagementEnabled) {
          menuItems.push({
            title: 'View',
            icon: <ViewSvg className="w-[18px] h-[18px]" />,
            onClick: () => handleOpenProjectDetails(item.name),
          })
        }

        if (canManage) {
          menuItems.push({
            title: 'Edit',
            icon: <EditSvg />,
            onClick: () => handleEditProject(item),
          })

          if (!isPersonal) {
            const hasCountData = item.counters !== undefined
            const totalCount = calculateTotalAssignments(item)
            const shouldDisableDelete = !hasCountData || totalCount > 0

            let deleteTooltip: string | undefined
            if (!hasCountData) {
              deleteTooltip = ERROR_MESSAGES.DELETE_NO_COUNT_DATA
            } else if (totalCount > 0) {
              deleteTooltip = ERROR_MESSAGES.DELETE_HAS_ASSIGNMENTS
            }

            menuItems.push({
              title: 'Delete',
              icon: <DeleteSvg />,
              onClick: () => handleDeleteProject(item),
              disabled: shouldDisableDelete,
              tooltip: deleteTooltip,
            })
          }
        }

        if (menuItems.length === 0) return null

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
    if (!isProjectCreationForNonAdminsEnabled && !currentUser?.isAdmin) return null

    return (
      <Button onClick={handleAddProject} size={ButtonSize.MEDIUM}>
        <PlusFilledSvg />
        Create
      </Button>
    )
  }, [handleAddProject, isProjectCreationForNonAdminsEnabled, isConfigLoaded, currentUser?.isAdmin])

  const renderContent = () => {
    return (
      <div className="flex flex-col h-full pt-4">
        <div className="mb-4 flex flex-wrap items-end gap-4">
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
          {isBudgetManagementEnabled && (
            <>
              <div className="w-48">
                <Select
                  id="budget-assignment-filter"
                  name="budget-assignment-filter"
                  label="Budgets"
                  value={budgetAssignmentFilter}
                  onChangeValue={(value) => setBudgetAssignmentFilter(value ?? 'all')}
                  options={budgetAssignmentFilterOptions}
                />
              </div>
              <div className="w-48">
                <Select
                  id="budget-category-filter"
                  name="budget-category-filter"
                  label="Budget category"
                  value={budgetCategory}
                  onChangeValue={(value) => setBudgetCategory((value ?? '') as BudgetCategory | '')}
                  options={budgetCategoryFilterOptions}
                />
              </div>
            </>
          )}
        </div>
        <Table
          items={projects || []}
          columnDefinitions={effectiveColumnDefinitions}
          customRenderColumns={customRenderColumns}
          loading={loading}
          sort={sort}
          onSort={handleSort}
          pagination={{
            page: pagination.page,
            totalPages: pagination.totalPages,
            perPage: pagination.perPage,
          }}
          onPaginationChange={handlePageChange}
          perPageOptions={DECIMAL_PAGINATION_OPTIONS}
          tableClassName="table-fixed"
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
