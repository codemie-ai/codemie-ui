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

import {
  FC,
  KeyboardEvent,
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useSnapshot } from 'valtio'

import AiGenerateSvg from '@/assets/icons/ai-generate.svg?react'
import CurrencySvg from '@/assets/icons/currency.svg?react'
import DeleteSvg from '@/assets/icons/delete.svg?react'
import AnalyticsSvg from '@/assets/icons/diagram-duotone.svg?react'
import InfoSvg from '@/assets/icons/info.svg?react'
import ImportSvg from '@/assets/icons/input.svg?react'
import PlusFilledSvg from '@/assets/icons/plus-filled.svg?react'
import UserAvatar from '@/components/Avatar/UserAvatar'
import Button from '@/components/Button'
import ConfirmationModal from '@/components/ConfirmationModal'
import Select from '@/components/form/Select'
import NavigationMore, { NavigationMenuItem } from '@/components/NavigationMore'
import Pagination from '@/components/Pagination'
import Spinner from '@/components/Spinner'
import StatusBadge, { StatusEnum } from '@/components/StatusBadge/StatusBadge'
import Table from '@/components/Table'
import { ButtonSize, ButtonType, DECIMAL_PAGINATION_OPTIONS } from '@/constants'
import { useTableSelection } from '@/hooks/useTableSelection'
import { useVueRouter } from '@/hooks/useVueRouter'
import { getErrorMessage } from '@/pages/integrations/utils/getErrorMessage'
import AddUserModal, {
  AddUserFormData,
} from '@/pages/settings/administration/components/AddUserModal'
import ProjectMembersBulkActions from '@/pages/settings/administration/components/projectsManagement/ProjectMembersBulkActions'
import { analyticsStore } from '@/store/analytics'
import { appInfoStore } from '@/store/appInfo'
import { projectBudgetsStore } from '@/store/projectBudgets'
import { userStore } from '@/store/user'
import { userModelOverridesStore } from '@/store/userModelOverrides'
import { BudgetCategory } from '@/types/entity/budget'
import { ProjectRole, ProjectType } from '@/types/entity/project'
import { ProjectBudget, ProjectBudgetMemberAllocation } from '@/types/entity/projectBudget'
import { ProjectDetail } from '@/types/entity/projectManagement'
import { UserListItem } from '@/types/entity/user'
import { ProjectMemberSpendingRow } from '@/types/entity/userProjectSpending'
import { ColumnDefinition, DefinitionTypes } from '@/types/table'
import { isEnterpriseEdition } from '@/utils/enterpriseEdition'
import { isUserManagementEnabled } from '@/utils/featureFlags'
import { getAnalyticsMemberLink } from '@/utils/getAnalyticsMemberLink'
import { canAccessUsersTab } from '@/utils/permissions'
import toaster from '@/utils/toaster'

import MemberAllocationOverrideModal, {
  MemberAllocationOverrideUpdate,
} from './components/MemberAllocationOverrideModal'
import ProjectMemberModelOverrideModal, {
  ModelOverrideMap,
} from './components/ProjectMemberModelOverrideModal'
import { isModelAllowed } from './components/projectModelConfiguration'
import UserBudgetsCell, {
  BudgetAllocationLookup,
  getUserBudgetUsage,
} from './components/UserBudgetsCell'
import ImportUsersModal from './ImportUsersModal'
import ProjectMembersFilters, {
  ALL_USAGE_RANGES,
  getInitialFilters,
  BudgetUsageFilter,
  isDefaultBudgetUsageFilter,
  ModelSettingsFilter,
  ProjectMembersFiltersState,
} from './ProjectMembersFilters'

const isExplicitModelOverride = ([, value]: [string, ModelOverrideMap[string]]) =>
  value !== 'project'

const getExplicitModelOverrides = (overrides: ModelOverrideMap): ModelOverrideMap =>
  Object.fromEntries(Object.entries(overrides).filter(isExplicitModelOverride))

interface PersistModelOverridesArgs {
  userIds: string[]
  overrides: ModelOverrideMap
  defaultModel: string | undefined
  projectAvailability: Record<string, boolean>
  /** Models users were already granted that the modal does not list; kept so a re-save cannot drop them. */
  preservedModels: string[]
}

const persistModelOverrides = async (
  projectName: string,
  {
    userIds,
    overrides,
    defaultModel,
    projectAvailability,
    preservedModels,
  }: PersistModelOverridesArgs
): Promise<void> => {
  const payloadDefaultModel = defaultModel ?? null
  // Every selected user receives the same list (the union shown in the modal, as edited).
  // The backend requires allowed_models on every create, even when only the default changed.
  const allowedModels = [
    ...Object.entries(overrides)
      .filter(([modelId, value]) => isModelAllowed(modelId, value, projectAvailability))
      .map(([modelId]) => modelId),
    ...preservedModels,
  ]

  if (userIds.length === 1) {
    await userModelOverridesStore.setUserModelOverride(
      projectName,
      userIds[0],
      {
        allowed_models: allowedModels,
        default_model: payloadDefaultModel,
      },
      true
    )
    return
  }

  await userModelOverridesStore.batchUserModelOverrides(
    projectName,
    {
      operation: 'grant',
      user_ids: userIds,
      allowed_models: allowedModels,
      default_model: payloadDefaultModel,
    },
    true
  )
}

const revokeModelOverrides = async (projectName: string, userIds: string[]): Promise<void> => {
  if (userIds.length === 1) {
    await userModelOverridesStore.deleteUserModelOverride(projectName, userIds[0], true)
    return
  }
  await userModelOverridesStore.batchUserModelOverrides(
    projectName,
    { operation: 'revoke', user_ids: userIds },
    true
  )
}

const matchesBudgetUsage = (
  user: UserListItem,
  budgetAllocationLookup: BudgetAllocationLookup,
  spendingByUserId: Record<string, ProjectMemberSpendingRow>,
  filter: BudgetUsageFilter
): boolean => {
  const matchesUsage = filter.categories.some((category) => {
    const usage = getUserBudgetUsage(
      user,
      budgetAllocationLookup,
      spendingByUserId[user.id],
      category
    )
    // A member with an override but no spend yet still matches "Override only".
    if (usage == null) {
      return filter.overrideOnly && filter.usageRanges.length === ALL_USAGE_RANGES.length
    }

    return filter.usageRanges.some((range) => {
      if (range === 'low') return usage < 50
      if (range === 'medium') return usage >= 50 && usage <= 70
      return usage > 70
    })
  })

  if (!matchesUsage) return false
  if (!filter.overrideOnly) return true

  return filter.categories.some(
    (category) => budgetAllocationLookup?.[user.id]?.[category]?.allocation_mode === 'fixed'
  )
}

const matchesModelSettings = (
  user: UserListItem,
  modelOverrideEnabled: Record<string, boolean>,
  filter: ModelSettingsFilter
): boolean => {
  if (filter === 'all') return true

  const overrideEnabled = modelOverrideEnabled[user.id] === true
  return filter === 'custom' ? overrideEnabled === true : overrideEnabled === false
}

const isModelSettingsFilterActive = (
  isUserModelOverrideEnabled: boolean,
  filter: ModelSettingsFilter
): boolean => isUserModelOverrideEnabled && filter !== 'all'

// Stops the row-select click/keydown from bubbling past the actions cell without
// putting a literal onClick/onKeyDown JSX attribute on the wrapping div.
const stopRowPropagationProps = {
  onClick: (e: MouseEvent) => e.stopPropagation(),
  onKeyDown: (e: KeyboardEvent) => e.stopPropagation(),
}

interface ProjectMembersManagerProps {
  project: ProjectDetail
  onMembersChanged?: () => Promise<void> | void
  budgets?: ProjectBudget[]
  onBudgetsChanged?: () => void | Promise<void>
  isUserModelOverrideEnabled?: boolean
}

const personalProjectTooltip = (action: string) =>
  `You cannot ${action} a personal project. Create a separate one instead.`

const ROLE_OPTIONS = [
  { label: 'User', value: ProjectRole.USER },
  { label: 'Project Admin', value: ProjectRole.ADMINISTRATOR },
]

const getUserColumnWidth = (canManage: boolean, showBudgets: boolean): string => {
  if (canManage && showBudgets) return 'w-[34%]'
  if (canManage) return 'w-[56%]'
  if (showBudgets) return 'w-[28%]'
  return 'w-[52%]'
}

const getRoleColumnWidth = (canManage: boolean, showBudgets: boolean): string => {
  if (canManage && showBudgets) return 'w-[20%]'
  if (canManage) return 'w-[30%]'
  if (showBudgets) return 'w-[24%]'
  return 'w-[48%]'
}

const getColumnDefinitions = (
  canManage: boolean,
  showBudgets: boolean,
  showModelOverride: boolean
): ColumnDefinition[] => {
  const columns: ColumnDefinition[] = []

  if (canManage) {
    columns.push({
      key: 'select',
      type: DefinitionTypes.Selection,
      headClassNames: '!w-[4%]',
    })
  }

  const userColumnWidth = getUserColumnWidth(canManage, showBudgets)
  const modelOverrideColumnWidth = 'w-[4%]'
  const roleColumnWidth = getRoleColumnWidth(canManage, showBudgets)

  columns.push({
    key: 'user',
    label: 'User',
    type: DefinitionTypes.Custom,
    headClassNames: userColumnWidth,
  })

  if (showModelOverride) {
    columns.push({
      key: 'modelOverride',
      label: '',
      type: DefinitionTypes.Custom,
      headClassNames: modelOverrideColumnWidth,
    })
  }

  columns.push({
    key: 'role',
    label: 'Role',
    type: DefinitionTypes.Custom,
    headClassNames: roleColumnWidth,
  })

  if (showBudgets) {
    columns.push({
      key: 'budgets',
      label: 'Budget Allocations',
      type: DefinitionTypes.Custom,
      headClassNames: canManage ? 'w-[36%]' : 'w-[48%]',
    })
  }

  if (canManage) {
    columns.push({
      key: 'actions',
      label: '',
      type: DefinitionTypes.Custom,
      headClassNames: 'w-[10%]',
    })
  }

  return columns
}

const renderModelOverrideCell = (hasOverride: boolean) => {
  if (!hasOverride) return null
  return (
    <div className="flex items-center justify-center">
      <span
        data-tooltip-id="react-tooltip"
        data-tooltip-content="This user uses custom models instead of project settings"
      >
        <AiGenerateSvg className="w-4 h-4 text-icon-primary" />
      </span>
    </div>
  )
}

const ProjectMembersManager: FC<ProjectMembersManagerProps> = ({
  project,
  onMembersChanged,
  budgets,
  onBudgetsChanged,
  isUserModelOverrideEnabled: isModelOverrideFlagEnabled = false,
}) => {
  const snap = useSnapshot(userStore)
  const { idpManagedEnabled, isAppInfoLoaded } = useSnapshot(appInfoStore)
  // Locked while the IDP setting is unknown, so nothing is offered that the backend would refuse
  const membershipLocked = idpManagedEnabled || !isAppInfoLoaded
  const currentUser = snap.user
  const router = useVueRouter()

  const [users, setUsers] = useState<UserListItem[]>([])
  const [deletingUser, setDeletingUser] = useState<UserListItem | null>(null)
  const [pendingRoleChange, setPendingRoleChange] = useState<{
    user: UserListItem
    newRole: ProjectRole
  } | null>(null)
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 0,
    per_page: 10,
    total: 0,
  })
  const [filters, setFilters] = useState<ProjectMembersFiltersState>(() =>
    getInitialFilters(router.query.overrides)
  )
  const [hasScroll, setHasScroll] = useState(false)
  const [isSelectAllLoading, setIsSelectAllLoading] = useState(false)
  const [overrideContext, setOverrideContext] = useState<{
    userId: string
    userName: string | null
    category: BudgetCategory | null
  } | null>(null)
  const [modelOverrideUsers, setModelOverrideUsers] = useState<UserListItem[]>([])
  const [modelOverrides, setModelOverrides] = useState<Record<string, ModelOverrideMap>>({})
  const [modelDefaults, setModelDefaults] = useState<Record<string, string>>({})
  const [modelOverrideEnabled, setModelOverrideEnabled] = useState<Record<string, boolean>>({})
  const [modelAllowedByUser, setModelAllowedByUser] = useState<Record<string, string[]>>({})
  const [modelOverridesStatus, setModelOverridesStatus] = useState<'loading' | 'ready' | 'failed'>(
    'loading'
  )
  const modelOverridesRequestRef = useRef(0)
  const modelOverridesStatusRef = useRef(modelOverridesStatus)
  modelOverridesStatusRef.current = modelOverridesStatus
  const [spendingByUserId, setSpendingByUserId] = useState<
    Record<string, ProjectMemberSpendingRow>
  >({})

  // Budgets fetched independently for the "View analytics" link — entirely
  // separate from the `budgets` prop which drives the Budget Allocations column.
  const [memberBudgets, setMemberBudgets] = useState<ProjectBudget[]>([])
  const [budgetsLoaded, setBudgetsLoaded] = useState(false)

  const tableContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      const measure = () => {
        if (node) setHasScroll(node.scrollHeight > node.clientHeight)
      }
      const observer = new ResizeObserver(measure)
      if (node) {
        measure()
        observer.observe(node)
      }
      return () => observer.disconnect()
    },
    [users, loading]
  )

  const isAdmin = currentUser?.isAdmin ?? false
  const isProjectAdmin =
    !isAdmin && (currentUser?.applicationsAdmin?.includes(project.name || '') ?? false)
  const canManageProject = isAdmin || isProjectAdmin
  const hasUsersTabAccess = canAccessUsersTab(currentUser)
  // Overrides are read and written only by managers; hide the column, filter and actions otherwise.
  const isUserModelOverrideEnabled = isModelOverrideFlagEnabled && canManageProject
  const isPersonal = project.project_type === ProjectType.PERSONAL

  const showBudgets = !!budgets?.length
  const canManageBudgets = showBudgets && (!!currentUser?.isMaintainer || canManageProject)

  const budgetAllocationLookup = useMemo(() => {
    if (!budgets?.length) return null
    const lookup: Record<string, Record<BudgetCategory, ProjectBudgetMemberAllocation>> = {}
    for (const budget of budgets) {
      for (const alloc of budget.member_allocations) {
        if (!lookup[alloc.user_id]) {
          lookup[alloc.user_id] = {} as Record<BudgetCategory, ProjectBudgetMemberAllocation>
        }
        lookup[alloc.user_id][budget.budget_category] = alloc
      }
    }
    return lookup
  }, [budgets])

  const budgetAllocationLookupRef = useRef(budgetAllocationLookup)
  budgetAllocationLookupRef.current = budgetAllocationLookup
  const spendingByUserIdRef = useRef(spendingByUserId)
  spendingByUserIdRef.current = spendingByUserId

  // Read through a ref so the async override load doesn't recreate fetchUsers and refetch members.
  const modelOverrideEnabledRef = useRef(modelOverrideEnabled)
  modelOverrideEnabledRef.current = modelOverrideEnabled

  const hasBudgetUsageFilter = !isDefaultBudgetUsageFilter(filters.budgetUsage)
  const hasModelSettingsFilter = isModelSettingsFilterActive(
    isUserModelOverrideEnabled,
    filters.modelSettings
  )
  const needsClientFiltering = hasBudgetUsageFilter || hasModelSettingsFilter
  // An empty override map from a pending or failed load would hide every user under "Custom".
  const matchesModelFilter = (user: UserListItem, overrideEnabled: Record<string, boolean>) =>
    !hasModelSettingsFilter ||
    modelOverridesStatusRef.current !== 'ready' ||
    matchesModelSettings(user, overrideEnabled, filters.modelSettings)
  const visibleUsers = users

  const handleFiltersChange = useCallback((nextFilters: ProjectMembersFiltersState) => {
    setFilters(nextFilters)
    setPagination((current) => ({ ...current, page: 0 }))
  }, [])

  const columnDefinitions = useMemo(
    () => getColumnDefinitions(canManageProject, showBudgets, isUserModelOverrideEnabled),
    [canManageProject, showBudgets, isUserModelOverrideEnabled]
  )

  const perPageRef = useRef(pagination.per_page)
  perPageRef.current = pagination.per_page

  const getBaseUserFilters = useCallback(
    () => ({
      projects: [project.name],
      search: filters.search || undefined,
      platform_role: filters.role === 'all' ? null : filters.role,
    }),
    [filters.role, filters.search, project.name]
  )

  const fetchAllMatchingUsers = useCallback(async () => {
    const pageSize = 100
    // Filters are computed once up front so every page request — including the parallel
    // ones below — uses the exact same snapshot, regardless of fetch order or timing.
    const filters = getBaseUserFilters()
    const firstPage = await userStore.getUsers({ page: 0, perPage: pageSize, filters })
    const totalPages = Math.ceil(firstPage.pagination.total / pageSize)

    const restPages = await Promise.all(
      Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) =>
        userStore.getUsers({ page: index + 1, perPage: pageSize, filters })
      )
    )

    return [firstPage, ...restPages].flatMap((result) => result.data)
  }, [getBaseUserFilters])

  const fetchUsers = useCallback(
    async (page: number, perPage: number) => {
      if (!needsClientFiltering) {
        const result = await userStore.getUsers({
          page,
          perPage,
          filters: getBaseUserFilters(),
        })
        setUsers(result.data)
        setPagination(result.pagination)
        return result
      }

      const allUsers = await fetchAllMatchingUsers()
      const filteredUsers = allUsers.filter(
        (user) =>
          (!hasBudgetUsageFilter ||
            matchesBudgetUsage(
              user,
              budgetAllocationLookupRef.current,
              spendingByUserIdRef.current,
              filters.budgetUsage
            )) &&
          matchesModelFilter(user, modelOverrideEnabledRef.current)
      )
      const start = page * perPage
      const result = {
        data: filteredUsers.slice(start, start + perPage),
        pagination: { page, per_page: perPage, total: filteredUsers.length },
      }
      setUsers(result.data)
      setPagination(result.pagination)
      return result
    },
    [
      fetchAllMatchingUsers,
      filters.budgetUsage,
      filters.modelSettings,
      getBaseUserFilters,
      hasBudgetUsageFilter,
      needsClientFiltering,
    ]
  )

  const tableSelection = useTableSelection<UserListItem>({
    totalCount: pagination.total,
    currentItems: visibleUsers,
    onFetchAll: async () => {
      const allUsers = await fetchAllMatchingUsers()
      return needsClientFiltering
        ? allUsers.filter(
            (user) =>
              (!hasBudgetUsageFilter ||
                matchesBudgetUsage(
                  user,
                  budgetAllocationLookupRef.current,
                  spendingByUserIdRef.current,
                  filters.budgetUsage
                )) &&
              matchesModelFilter(user, modelOverrideEnabled)
          )
        : allUsers
    },
  })

  const { selected, clearSelection, onSelectAllChange } = tableSelection

  const handleSelectAllChange = useCallback(
    async (checked: boolean) => {
      if (checked) setIsSelectAllLoading(true)
      try {
        await onSelectAllChange(checked)
      } finally {
        setIsSelectAllLoading(false)
      }
    },
    [onSelectAllChange]
  )

  const selection = {
    ...tableSelection,
    onSelectAllChange: handleSelectAllChange,
  }

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      await fetchUsers(0, perPageRef.current)
      clearSelection()
    } catch (error) {
      console.error('Failed to load users:', error)
      toaster.error('Failed to load project users')
    } finally {
      setLoading(false)
    }
  }, [fetchUsers, clearSelection])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  // Per-member spend inside this project — the left-hand number in the Budget Allocations column.
  const loadSpending = useCallback(async () => {
    try {
      const result = await analyticsStore.fetchProjectMemberSpending(project.name)
      const rows = (result?.data?.rows as unknown as ProjectMemberSpendingRow[]) ?? []
      setSpendingByUserId(Object.fromEntries(rows.map((row) => [row.user_id, row])))
    } catch (error) {
      console.error('Failed to fetch project member spending:', error)
      setSpendingByUserId({})
    }
  }, [project.name])

  useEffect(() => {
    if (showBudgets) loadSpending()
  }, [showBudgets, loadSpending])

  const isFirstOverrideEnabledRun = useRef(true)
  useEffect(() => {
    if (isFirstOverrideEnabledRun.current) {
      isFirstOverrideEnabledRun.current = false
      return
    }
    if (hasModelSettingsFilter) loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelOverrideEnabled])

  // Fetch project budgets independently for the "View analytics" link period calculation.
  // This is guarded by canManageProject and does NOT affect showBudgets or the budget column.
  useEffect(() => {
    let cancelled = false
    setBudgetsLoaded(false)
    if (canManageProject) {
      projectBudgetsStore
        .listProjectBudgets({ projectName: project.name })
        .then((result) => {
          if (!cancelled) setMemberBudgets(result)
        })
        .catch(console.error)
        .finally(() => {
          if (!cancelled) setBudgetsLoaded(true)
        })
    } else {
      setBudgetsLoaded(true)
    }
    return () => {
      cancelled = true
    }
  }, [canManageProject, project.name])

  const handlePageChange = useCallback(
    async (page: number, newPerPage?: number) => {
      const perPage = newPerPage ?? pagination.per_page
      setLoading(true)
      try {
        await fetchUsers(page, perPage)
      } catch (error) {
        console.error('Failed to load users:', error)
        toaster.error('Failed to load project users')
      } finally {
        setLoading(false)
      }
    },
    [pagination.per_page, fetchUsers]
  )

  const reloadUsers = useCallback(
    async (shouldClearSelection: boolean = true) => {
      try {
        await fetchUsers(pagination.page, pagination.per_page)
        if (shouldClearSelection) clearSelection()
      } catch (error) {
        console.error('Failed to reload users:', error)
        toaster.error('Failed to load project users')
      }
    },
    [fetchUsers, pagination.page, pagination.per_page, clearSelection]
  )

  const refreshFromFirstPage = useCallback(async () => {
    try {
      await handlePageChange(0)
      await onMembersChanged?.()
    } catch (error) {
      console.error('Failed to refresh users:', error)
      toaster.error('Failed to load project users')
    }
  }, [handlePageChange, onMembersChanged])

  const handleRoleChange = useCallback((user: UserListItem, newRole: ProjectRole) => {
    setPendingRoleChange({ user, newRole })
  }, [])

  const confirmRoleChange = useCallback(async () => {
    if (!pendingRoleChange) return

    try {
      await userStore.updateUserProjectRole(
        project.name,
        pendingRoleChange.user.id,
        pendingRoleChange.newRole
      )
      toaster.info('Role updated successfully')
      setPendingRoleChange(null)
      const newSelection = selected.filter((u) => u.id !== pendingRoleChange.user.id)
      selection.onSelectRow(newSelection)
      await handlePageChange(0)
      await onMembersChanged?.()
    } catch (error: any) {
      console.error('Failed to update role:', error)
      toaster.error(getErrorMessage(error, 'Failed to update role'))
    }
  }, [pendingRoleChange, project.name, selected, selection, handlePageChange, onMembersChanged])

  const handleDeleteUser = useCallback((user: UserListItem) => {
    setDeletingUser(user)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!deletingUser) return

    try {
      await userStore.unassignUserFromProject(project.name, deletingUser.id)
      toaster.info('User removed from project')
      setDeletingUser(null)
      const newSelection = selected.filter((u) => u.id !== deletingUser.id)
      selection.onSelectRow(newSelection)
      await handlePageChange(0)
      await onMembersChanged?.()
    } catch (error: any) {
      console.error('Failed to remove user:', error)
      toaster.error(getErrorMessage(error, 'Failed to remove user'))
    }
  }, [deletingUser, project.name, selected, selection, handlePageChange, onMembersChanged])

  const refreshBudgets = useCallback(async () => {
    if (!showBudgets) return
    await onBudgetsChanged?.()
  }, [showBudgets, onBudgetsChanged])

  const refreshBudgetData = useCallback(
    () => Promise.all([refreshBudgets(), showBudgets ? loadSpending() : undefined]),
    [refreshBudgets, loadSpending, showBudgets]
  )

  const handleAddUserSubmit = useCallback(
    async (data: AddUserFormData) => {
      const userId = Array.isArray(data.userIdentifier)
        ? data.userIdentifier[0]
        : data.userIdentifier

      try {
        await userStore.assignUserToProject(project.name, userId, data.role)
        toaster.info('User added to project')
        setShowAddUserModal(false)
        await reloadUsers()
        await onMembersChanged?.()
        await refreshBudgetData()
      } catch (error: any) {
        console.error('Failed to add user:', error)
        toaster.error(getErrorMessage(error, 'Failed to add user to project'))
      }
    },
    [project.name, reloadUsers, onMembersChanged, refreshBudgetData]
  )

  const handleImportSuccess = useCallback(async () => {
    await reloadUsers()
    await onMembersChanged?.()
    await refreshBudgetData()
  }, [reloadUsers, onMembersChanged, refreshBudgetData])

  const handleOverrideMember = useCallback(
    async (updates: MemberAllocationOverrideUpdate[]) => {
      try {
        // Backend rebalances after every request, so changed categories must be sequential.
        for (const { budgetId, userId, payload, removeOverride } of updates) {
          if (removeOverride) {
            // eslint-disable-next-line no-await-in-loop
            await projectBudgetsStore.clearMemberOverride(budgetId, userId, true)
          } else {
            // eslint-disable-next-line no-await-in-loop
            await projectBudgetsStore.overrideMemberAllocation(budgetId, userId, payload, true)
          }
        }
      } catch (error: any) {
        // silent=true above suppresses the store's own per-request toast so a multi-category
        // update doesn't show one per category; surface the backend's specific reason here
        // instead of a generic message that hides which category failed and why.
        const message =
          error?.parsedError?.message ??
          error?.message ??
          'Failed to update member budget configuration'
        toaster.error(message)
        throw error instanceof Error ? error : new Error(message)
      }
      toaster.success('Member budget configuration updated successfully')
      setOverrideContext(null)
      await refreshBudgets()
    },
    [refreshBudgets]
  )

  const getUserRole = useCallback(
    (user: UserListItem): string => {
      const userProject = user.projects?.find((p) => p.name === project.name)
      return userProject?.is_project_admin ? ProjectRole.ADMINISTRATOR : ProjectRole.USER
    },
    [project.name]
  )

  const openModelOverrides = useCallback(
    (members: UserListItem[]) => {
      // An empty map from a pending or failed load would make Apply revoke or overwrite real overrides.
      if (modelOverridesStatus !== 'ready') {
        toaster.error(
          modelOverridesStatus === 'failed'
            ? 'Model overrides could not be loaded. Reload the page and try again.'
            : 'Model overrides are still loading. Try again in a moment.'
        )
        return
      }
      setModelOverrideUsers(members)
    },
    [modelOverridesStatus]
  )

  // Returns false only when the overrides could not be (re)loaded.
  const loadModelOverrides = useCallback(async (): Promise<boolean> => {
    if (!isUserModelOverrideEnabled || !canManageProject) return true
    modelOverridesRequestRef.current += 1
    const requestId = modelOverridesRequestRef.current
    try {
      const [overrides, models] = await Promise.all([
        userModelOverridesStore.listUserModelOverrides(project.name),
        appInfoStore.getLLMModels(),
      ])
      const allModelIds = models.map((model) => model.value)

      const nextOverrides: Record<string, ModelOverrideMap> = {}
      const nextDefaults: Record<string, string> = {}
      const nextEnabled: Record<string, boolean> = {}
      const nextAllowed: Record<string, string[]> = {}
      overrides.forEach((override) => {
        nextAllowed[override.user_id] = override.allowed_models
        nextOverrides[override.user_id] = Object.fromEntries(
          allModelIds.map((modelId) => [
            modelId,
            override.allowed_models.includes(modelId) ? 'enabled' : 'disabled',
          ])
        ) as ModelOverrideMap
        if (override.default_model) {
          nextDefaults[override.user_id] = override.default_model
        }
        // A record existing is what makes the override active — there is no separate flag.
        nextEnabled[override.user_id] = true
      })

      if (requestId !== modelOverridesRequestRef.current) return true
      setModelOverrides(nextOverrides)
      setModelDefaults(nextDefaults)
      setModelOverrideEnabled(nextEnabled)
      setModelAllowedByUser(nextAllowed)
      setModelOverridesStatus('ready')
      return true
    } catch (error) {
      console.error('Failed to load model overrides:', error)
      if (requestId !== modelOverridesRequestRef.current) return true
      setModelOverrides({})
      setModelDefaults({})
      setModelOverrideEnabled({})
      setModelAllowedByUser({})
      setModelOverridesStatus('failed')
      return false
    }
  }, [project.name, isUserModelOverrideEnabled, canManageProject])

  // Another project's overrides must not stay usable while the new project's are loading.
  const lastOverridesProjectRef = useRef(project.name)
  useEffect(() => {
    if (lastOverridesProjectRef.current === project.name) return
    lastOverridesProjectRef.current = project.name
    setModelOverridesStatus('loading')
    setModelOverrides({})
    setModelDefaults({})
    setModelOverrideEnabled({})
    setModelAllowedByUser({})
  }, [project.name])

  useEffect(() => {
    loadModelOverrides()
  }, [loadModelOverrides])

  const customRenderColumns = useMemo(
    () => ({
      user: (user: UserListItem) => (
        <div className="flex items-center gap-3">
          <UserAvatar src={user.picture} name={user.name ?? undefined} size="md" />
          <div className="flex flex-col gap-0.5 max-w-[250px]">
            <span
              id={`user-more-${user.id}`}
              className="text-sm font-medium text-text-primary whitespace-nowrap overflow-hidden text-ellipsis"
            >
              {user.name}
            </span>
            <span className="text-xs text-text-primary whitespace-nowrap overflow-hidden text-ellipsis">
              {user.email}
            </span>
            {user.is_active === false && (
              <StatusBadge status={StatusEnum.Warning} text="Deactivated" className="mt-1" />
            )}
          </div>
        </div>
      ),
      modelOverride: (user: UserListItem) =>
        renderModelOverrideCell(modelOverrideEnabled[user.id] ?? false),
      role: (user: UserListItem) => {
        const currentRole = getUserRole(user)
        const isCurrentUser = currentUser?.userId === user.id
        const isDisabled =
          membershipLocked ||
          isPersonal ||
          !canManageProject ||
          (isProjectAdmin && isCurrentUser) ||
          user.is_active === false

        return (
          <div onClick={(e) => e.stopPropagation()}>
            <span
              data-tooltip-id="react-tooltip"
              data-tooltip-content={
                isPersonal ? personalProjectTooltip('change role in') : undefined
              }
            >
              <Select
                id={`role-${user.id}`}
                name={`role-${user.id}`}
                value={currentRole}
                disabled={isDisabled}
                onChange={(e) => handleRoleChange(user, e.value)}
                options={ROLE_OPTIONS}
                rootClassName="w-40"
              />
            </span>
          </div>
        )
      },
      budgets: (user: UserListItem) => (
        <UserBudgetsCell
          user={user}
          budgetAllocationLookup={budgetAllocationLookup}
          spendingRow={spendingByUserId[user.id]}
          onOverride={(userId, category) =>
            setOverrideContext({ userId, userName: user.name, category })
          }
        />
      ),
      actions: (user: UserListItem) => {
        const isCreator = user.id === project.created_by

        const menuItems: NavigationMenuItem[] = []
        const unassignHidden = isCreator || isPersonal || !canManageProject || membershipLocked

        if (isEnterpriseEdition()) {
          menuItems.push({
            title: 'View analytics',
            icon: <AnalyticsSvg className="w-[18px] h-[18px]" />,
            href: getAnalyticsMemberLink(router, project.name, user.id, memberBudgets),
            disabled: !budgetsLoaded,
          })
        }

        menuItems.push(
          {
            title: 'Details',
            icon: <InfoSvg className="w-[18px] h-[18px]" />,
            onClick: () => {
              if (isUserManagementEnabled()) {
                router.push({
                  name: 'administration-users',
                  query: {
                    search: user.name || user.email || user.username,
                  },
                })
              } else {
                toaster.info('Users Management is unavailable in this environment')
              }
            },
            hidden: !hasUsersTabAccess,
          },
          {
            title: 'Override budgets',
            icon: <CurrencySvg className="w-[18px] h-[18px]" />,
            onClick: () =>
              setOverrideContext({ userId: user.id, userName: user.name, category: null }),
            // Follows canManageBudgets: maintainer or project admin with budgets loaded.
            hidden: !canManageBudgets,
          },
          {
            title: 'Override models',
            icon: <AiGenerateSvg className="w-[18px] h-[18px]" />,
            onClick: () => openModelOverrides([user]),
            hidden: !isUserModelOverrideEnabled,
            disabled: selected.length > 1 || (selected.length === 1 && selected[0].id !== user.id),
          }
        )

        menuItems.push({
          title: 'Unassign from Project',
          icon: <DeleteSvg className="w-[18px] h-[18px]" />,
          onClick: () => handleDeleteUser(user),
          hidden: unassignHidden,
        })

        return (
          <div className="flex items-center justify-end" {...stopRowPropagationProps}>
            <NavigationMore
              renderInRoot
              hideOnClickInside
              items={menuItems}
              contextId={`user-more-${user.id}`}
            />
          </div>
        )
      },
    }),
    [
      project,
      canManageProject,
      isPersonal,
      membershipLocked,
      handleDeleteUser,
      budgetAllocationLookup,
      spendingByUserId,
      openModelOverrides,
      memberBudgets,
      budgetsLoaded,
      router,
      currentUser?.userId,
      isProjectAdmin,
      getUserRole,
      handleRoleChange,
      budgets,
      canManageBudgets,
      modelOverrideEnabled,
      isUserModelOverrideEnabled,
      selected,
    ]
  )

  const headerActions = useMemo(
    () =>
      canManageProject && !isPersonal && !membershipLocked ? (
        <div className="flex gap-2">
          <Button
            onClick={() => setShowImportModal(true)}
            size={ButtonSize.MEDIUM}
            type={ButtonType.PRIMARY}
          >
            <ImportSvg />
            Import Users
          </Button>
          <Button
            onClick={() => setShowAddUserModal(true)}
            size={ButtonSize.MEDIUM}
            type={ButtonType.PRIMARY}
          >
            <PlusFilledSvg />
            Add User to Project
          </Button>
        </div>
      ) : null,
    [canManageProject, isPersonal, membershipLocked]
  )

  return (
    <>
      <section className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 justify-between items-center mb-5">
          <div>
            <div className="text-sm font-semibold text-text-primary">Project members</div>
            <div className="text-xs text-text-quaternary mt-1">
              {project.user_count} project member{project.user_count === 1 ? '' : 's'}
            </div>
          </div>
          {headerActions}
        </div>

        <div className="shrink-0 mb-5">
          <ProjectMembersFilters
            initialFilters={filters}
            onFilterChange={handleFiltersChange}
            isUserModelOverrideEnabled={isUserModelOverrideEnabled}
          />
        </div>

        {canManageProject && (
          <div className="mb-4 flex shrink-0 justify-end">
            <ProjectMembersBulkActions
              projectName={project.name}
              selectedUsers={selected}
              currentUserId={currentUser?.userId}
              canManageProject={canManageProject}
              isProjectAdmin={isProjectAdmin}
              canManageBudgets={canManageBudgets}
              membershipLocked={membershipLocked}
              onClearSelection={clearSelection}
              refresh={refreshFromFirstPage}
              onSuccess={onMembersChanged}
              onBudgetsChanged={refreshBudgets}
              onOverrideModels={() => openModelOverrides(selected)}
              isUserModelOverrideEnabled={isUserModelOverrideEnabled}
              budgets={budgets ?? []}
              budgetAllocationLookup={budgetAllocationLookup}
            />
          </div>
        )}

        <div
          ref={tableContainerRef}
          data-testid="project-members-table-scroll"
          className="overflow-y-auto show-scroll flex-1 min-h-60 mb-5 relative"
        >
          {loading ? (
            <div className="flex items-center justify-center min-h-[220px]">
              <Spinner inline rootClassName="min-h-0" />
            </div>
          ) : (
            <div className={hasScroll ? 'pr-4' : ''}>
              <div className="rounded-lg overflow-clip relative isolate">
                <Table
                  idPath="id"
                  {...(canManageProject ? selection : {})}
                  items={visibleUsers}
                  selected={canManageProject ? selected : undefined}
                  columnDefinitions={columnDefinitions}
                  customRenderColumns={customRenderColumns}
                  loading={false}
                  embedded={true}
                  className="!mb-0 !mt-0 table-fixed"
                  pagination={{
                    page: pagination.page,
                    totalPages: Math.ceil(pagination.total / pagination.per_page),
                    perPage: pagination.per_page,
                    totalCount: pagination.total,
                  }}
                />
                {isSelectAllLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-surface-base-primary/80 backdrop-blur-sm rounded-lg z-50">
                    <div className="flex flex-col items-center gap-3">
                      <Spinner inline rootClassName="min-h-0" />
                      <span className="text-sm text-text-quaternary">Selecting all users...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {users.length > 0 && (
          <Pagination
            currentPage={pagination.page}
            totalPages={Math.ceil(pagination.total / pagination.per_page)}
            setPage={handlePageChange}
            perPage={pagination.per_page}
            perPageOptions={DECIMAL_PAGINATION_OPTIONS}
            alwaysShowPerPage
            className="w-full shrink-0 !bg-transparent !border-t-0 !p-0 !mb-4 !bg-none"
          />
        )}
      </section>

      <ConfirmationModal
        visible={!!deletingUser}
        onCancel={() => setDeletingUser(null)}
        header="Unassign User?"
        message={`Are you sure you want to unassign ${deletingUser?.name} from this project?`}
        confirmText="Unassign"
        confirmButtonType={ButtonType.DELETE}
        onConfirm={confirmDelete}
        hideIcon
      />

      <ConfirmationModal
        visible={!!pendingRoleChange}
        onCancel={() => setPendingRoleChange(null)}
        header="Change User Role?"
        message={`Are you sure you want to change ${pendingRoleChange?.user.name}'s role to ${
          pendingRoleChange?.newRole === ProjectRole.ADMINISTRATOR ? 'Project Admin' : 'User'
        }?`}
        confirmText="Change Role"
        confirmButtonType={ButtonType.PRIMARY}
        onConfirm={confirmRoleChange}
        hideIcon
      />

      <AddUserModal
        visible={showAddUserModal}
        onHide={() => setShowAddUserModal(false)}
        onSubmit={handleAddUserSubmit}
      />

      <ImportUsersModal
        visible={showImportModal}
        project={project as any}
        onHide={() => setShowImportModal(false)}
        onSuccess={handleImportSuccess}
      />

      {canManageBudgets && budgets && (
        <MemberAllocationOverrideModal
          visible={!!overrideContext}
          userId={overrideContext?.userId ?? null}
          userName={overrideContext?.userName ?? null}
          budgets={budgets}
          userAllocationsByCategory={
            overrideContext ? budgetAllocationLookup?.[overrideContext.userId] ?? null : null
          }
          initialCategory={overrideContext?.category ?? null}
          onHide={() => setOverrideContext(null)}
          onSubmit={handleOverrideMember}
        />
      )}

      <ProjectMemberModelOverrideModal
        isOpen={modelOverrideUsers.length > 0}
        users={modelOverrideUsers}
        projectName={project.name}
        projectOverrides={
          modelOverrideUsers.length === 1 ? modelOverrides[modelOverrideUsers[0].id] : {}
        }
        projectOverridesByUser={modelOverrides}
        defaultModel={
          modelOverrideUsers.length === 1 ? modelDefaults[modelOverrideUsers[0].id] : undefined
        }
        defaultModelsByUser={modelDefaults}
        onClose={() => setModelOverrideUsers([])}
        onApply={async (overrides, defaultModel, hasCustomDefault, projectAvailability) => {
          const hasExplicitOverrides = Object.keys(getExplicitModelOverrides(overrides)).length > 0
          const userIds = modelOverrideUsers.map((user) => user.id)
          const shouldPersist = hasExplicitOverrides || hasCustomDefault
          const preservedModels = Array.from(
            new Set(userIds.flatMap((userId) => modelAllowedByUser[userId] ?? []))
          ).filter((modelId) => !(modelId in overrides))

          try {
            if (shouldPersist) {
              await persistModelOverrides(project.name, {
                userIds,
                overrides,
                defaultModel,
                projectAvailability,
                preservedModels,
              })
            } else {
              // Revoking a user without an override record would fail or be a no-op.
              const userIdsWithOverride = userIds.filter((userId) => modelOverrideEnabled[userId])
              if (userIdsWithOverride.length) {
                await revokeModelOverrides(project.name, userIdsWithOverride)
              }
            }
            const reloaded = await loadModelOverrides()
            setModelOverrideUsers([])
            if (reloaded) {
              toaster.info('Model overrides updated')
            } else {
              toaster.error('Model overrides were saved, but the list could not be refreshed.')
            }
          } catch (error: any) {
            console.error('Failed to update model overrides:', error)
            toaster.error(getErrorMessage(error, 'Failed to update model overrides'))
          }
        }}
      />
    </>
  )
}

export default ProjectMembersManager
