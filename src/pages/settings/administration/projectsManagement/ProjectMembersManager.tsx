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

import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'

import ImportSvg from '@/assets/icons/input.svg?react'
import PlusFilledSvg from '@/assets/icons/plus-filled.svg?react'
import Button from '@/components/Button'
import ConfirmationModal from '@/components/ConfirmationModal'
import Select from '@/components/form/Select'
import Pagination from '@/components/Pagination'
import Spinner from '@/components/Spinner'
import Table from '@/components/Table'
import { ButtonSize, ButtonType, DECIMAL_PAGINATION_OPTIONS } from '@/constants'
import { useTableSelection } from '@/hooks/useTableSelection'
import { getErrorMessage } from '@/pages/integrations/utils/getErrorMessage'
import AddUserModal, {
  AddUserFormData,
} from '@/pages/settings/administration/components/AddUserModal'
import ProjectMembersBulkActions from '@/pages/settings/administration/components/projectsManagement/ProjectMembersBulkActions'
import UserAvatar from '@/pages/settings/administration/usersManagement/components/UserAvatar'
import { projectBudgetsStore } from '@/store/projectBudgets'
import { userStore } from '@/store/user'
import { BudgetCategory, getBudgetCategoryLabel } from '@/types/entity/budget'
import { ProjectRole, ProjectType } from '@/types/entity/project'
import {
  MemberAllocationOverridePayload,
  ProjectBudget,
  ProjectBudgetMemberAllocation,
} from '@/types/entity/projectBudget'
import { ProjectDetail } from '@/types/entity/projectManagement'
import { UserListItem } from '@/types/entity/user'
import { ColumnDefinition, DefinitionTypes } from '@/types/table'
import toaster from '@/utils/toaster'

import MemberAllocationOverrideModal from './components/MemberAllocationOverrideModal'
import ImportUsersModal from './ImportUsersModal'
import ProjectMembersFilters, {
  PROJECT_MEMBERS_INITIAL_FILTERS,
  ProjectMembersFiltersState,
} from './ProjectMembersFilters'

const BUDGET_CATEGORIES: BudgetCategory[] = ['platform', 'cli', 'premium_models']

const formatCurrency = (value: number | null | undefined): string => {
  if (value == null) return '-'
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

interface UserBudgetsCellProps {
  user: UserListItem
  budgetAllocationLookup: Record<
    string,
    Record<BudgetCategory, ProjectBudgetMemberAllocation>
  > | null
  onOverride: (userId: string, category: BudgetCategory) => void
}

const UserBudgetsCell: FC<UserBudgetsCellProps> = ({
  user,
  budgetAllocationLookup,
  onOverride,
}) => {
  if (!budgetAllocationLookup) return null
  const userAllocations = budgetAllocationLookup[user.id]
  if (!userAllocations || !Object.keys(userAllocations).length) {
    return <span className="text-xs text-text-quaternary">—</span>
  }
  return (
    <div className="flex flex-col gap-1">
      {BUDGET_CATEGORIES.map((cat) => {
        const alloc = userAllocations[cat]
        if (!alloc) return null
        const isFixed = alloc.allocation_mode === 'fixed'
        return (
          <button
            key={cat}
            type="button"
            className="flex items-center gap-2 text-xs text-left w-full hover:bg-surface-specific-dropdown-hover rounded px-1 -mx-1 transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              onOverride(user.id, cat)
            }}
            data-tooltip-id="react-tooltip"
            data-tooltip-content="Click to override allocation"
          >
            <span className="text-text-quaternary w-28 shrink-0">
              {getBudgetCategoryLabel(cat)}
            </span>
            <span className={isFixed ? 'text-text-warning' : 'text-text-primary'}>
              {formatCurrency(alloc.allocated_max_budget)}
              {isFixed && <span className="ml-1 text-text-warning">★</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}

interface ProjectMembersManagerProps {
  project: ProjectDetail
  onMembersChanged?: () => Promise<void> | void
  budgets?: ProjectBudget[]
  onBudgetsChanged?: (budgets: ProjectBudget[]) => void
}

const personalProjectTooltip = (action: string) =>
  `You cannot ${action} a personal project. Create a separate one instead.`

const ROLE_OPTIONS = [
  { label: 'User', value: ProjectRole.USER },
  { label: 'Project Admin', value: ProjectRole.ADMINISTRATOR },
]

const getColumnDefinitions = (canManage: boolean, showBudgets: boolean): ColumnDefinition[] => {
  const columns: ColumnDefinition[] = []

  if (canManage) {
    columns.push({
      key: 'select',
      type: DefinitionTypes.Selection,
      headClassNames: '!w-[4%]',
    })
  }

  let userColumnWidth = 'w-[52%]'
  if (canManage && showBudgets) {
    userColumnWidth = 'w-[24%]'
  } else if (canManage) {
    userColumnWidth = 'w-[42%]'
  } else if (showBudgets) {
    userColumnWidth = 'w-[28%]'
  }

  let roleColumnWidth = 'w-[48%]'
  if (canManage && showBudgets) {
    roleColumnWidth = 'w-[18%]'
  } else if (canManage) {
    roleColumnWidth = 'w-[28%]'
  } else if (showBudgets) {
    roleColumnWidth = 'w-[24%]'
  }

  columns.push(
    {
      key: 'user',
      label: 'User',
      type: DefinitionTypes.Custom,
      headClassNames: userColumnWidth,
    },
    {
      key: 'role',
      label: 'Role',
      type: DefinitionTypes.Custom,
      headClassNames: roleColumnWidth,
    }
  )

  if (showBudgets) {
    columns.push({
      key: 'budgets',
      label: 'Budget Allocations',
      type: DefinitionTypes.Custom,
      headClassNames: canManage ? 'w-[42%]' : 'w-[48%]',
    })
  }

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

const ProjectMembersManager: FC<ProjectMembersManagerProps> = ({
  project,
  onMembersChanged,
  budgets,
  onBudgetsChanged,
}) => {
  const snap = useSnapshot(userStore)
  const currentUser = snap.user

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
  const [filters, setFilters] = useState<ProjectMembersFiltersState>(
    PROJECT_MEMBERS_INITIAL_FILTERS
  )
  const [hasScroll, setHasScroll] = useState(false)
  const [isSelectAllLoading, setIsSelectAllLoading] = useState(false)
  const [overrideContext, setOverrideContext] = useState<{
    userId: string
    category: BudgetCategory
  } | null>(null)

  const tableContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) {
        setHasScroll(node.scrollHeight > node.clientHeight)
      }
    },
    [users]
  )

  const isAdmin = currentUser?.isAdmin ?? false
  const isProjectAdmin =
    !isAdmin && (currentUser?.applicationsAdmin?.includes(project.name || '') ?? false)
  const canManageProject = isAdmin || isProjectAdmin
  const isPersonal = project.project_type === ProjectType.PERSONAL

  const showBudgets = !!budgets?.length

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

  const columnDefinitions = useMemo(
    () => getColumnDefinitions(canManageProject, showBudgets),
    [canManageProject, showBudgets]
  )

  const perPageRef = useRef(pagination.per_page)
  perPageRef.current = pagination.per_page

  const fetchUsers = useCallback(
    async (page: number, perPage: number) => {
      const result = await userStore.getUsers({
        page,
        perPage,
        filters: {
          projects: [project.name],
          search: filters.search || undefined,
          platform_role: filters.role === 'all' ? null : filters.role,
        },
      })
      setUsers(result.data)
      setPagination(result.pagination)
      return result
    },
    [project.name, filters]
  )

  const tableSelection = useTableSelection<UserListItem>({
    totalCount: pagination.total,
    currentItems: users,
    onFetchAll: async () => {
      const response = await userStore.getUsers({
        page: 0,
        perPage: pagination.total,
        filters: {
          projects: [project.name],
          search: filters.search || undefined,
          platform_role: filters.role === 'all' ? null : filters.role,
        },
      })
      return response.data
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
      } catch (error: any) {
        console.error('Failed to add user:', error)
        toaster.error(getErrorMessage(error, 'Failed to add user to project'))
      }
    },
    [project.name, reloadUsers, onMembersChanged]
  )

  const handleImportSuccess = useCallback(async () => {
    await reloadUsers()
    await onMembersChanged?.()
  }, [reloadUsers, onMembersChanged])

  const refreshBudgets = useCallback(async () => {
    if (!budgets?.length) return
    const updated = await projectBudgetsStore.listProjectBudgets({ projectName: project.name })
    onBudgetsChanged?.(updated)
  }, [project.name, budgets, onBudgetsChanged])

  const handleOverrideMember = useCallback(
    async (budgetId: string, userId: string, payload: MemberAllocationOverridePayload) => {
      await projectBudgetsStore.overrideMemberAllocation(budgetId, userId, payload)
      toaster.info('Member allocation overridden successfully')
      setOverrideContext(null)
      await refreshBudgets()
    },
    [refreshBudgets]
  )

  const handleClearMemberOverride = useCallback(
    async (budgetId: string, userId: string) => {
      await projectBudgetsStore.clearMemberOverride(budgetId, userId)
      toaster.info('Member override cleared successfully')
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

  const customRenderColumns = useMemo(
    () => ({
      user: (user: UserListItem) => (
        <div className="flex items-center gap-3">
          <UserAvatar src={user.picture} name={user.name ?? undefined} size="md" />
          <div className="flex flex-col gap-0.5 max-w-[250px]">
            <span className="text-sm font-medium text-text-primary whitespace-nowrap overflow-hidden text-ellipsis">
              {user.name}
            </span>
            <span className="text-xs text-text-primary whitespace-nowrap overflow-hidden text-ellipsis">
              {user.email}
            </span>
          </div>
        </div>
      ),
      role: (user: UserListItem) => {
        const currentRole = getUserRole(user)
        const isCurrentUser = currentUser?.userId === user.id
        const isDisabled = isPersonal || !canManageProject || (isProjectAdmin && isCurrentUser)

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
                rootClassName="w-48"
              />
            </span>
          </div>
        )
      },
      budgets: (user: UserListItem) => (
        <UserBudgetsCell
          user={user}
          budgetAllocationLookup={budgetAllocationLookup}
          onOverride={(userId, category) => setOverrideContext({ userId, category })}
        />
      ),
      actions: (user: UserListItem) => {
        const isCreator = user.id === project.created_by

        return (
          <div
            role="presentation"
            className="flex items-center justify-end gap-2"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {!isCreator && (
              <span
                data-tooltip-id="react-tooltip"
                data-tooltip-content={
                  isPersonal ? personalProjectTooltip('unassign from') : undefined
                }
              >
                <Button
                  onClick={() => handleDeleteUser(user)}
                  size={ButtonSize.MEDIUM}
                  type={ButtonType.DELETE}
                  disabled={isPersonal || !canManageProject}
                >
                  Unassign
                </Button>
              </span>
            )}
          </div>
        )
      },
    }),
    [
      currentUser?.userId,
      canManageProject,
      isProjectAdmin,
      isPersonal,
      getUserRole,
      handleRoleChange,
      handleDeleteUser,
      budgetAllocationLookup,
    ]
  )

  const headerActions = useMemo(
    () =>
      canManageProject && !isPersonal ? (
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
    [canManageProject, isPersonal]
  )

  return (
    <>
      <section>
        <div className="flex justify-between items-center mb-5">
          <div className="text-sm font-semibold text-text-primary">Project members</div>
          {headerActions}
        </div>

        <div className="flex justify-between items-center gap-4 h-10 mb-5">
          <ProjectMembersFilters onFilterChange={setFilters} />
          {canManageProject && (
            <ProjectMembersBulkActions
              projectName={project.name}
              selectedUsers={selected}
              currentUserId={currentUser?.userId}
              canManageProject={canManageProject}
              isProjectAdmin={isProjectAdmin}
              onClearSelection={clearSelection}
              refresh={refreshFromFirstPage}
              onSuccess={onMembersChanged}
            />
          )}
        </div>

        <div ref={tableContainerRef} className="overflow-y-auto show-scroll min-h-0 mb-5 relative">
          {loading ? (
            <div className="flex items-center justify-center min-h-[220px]">
              <Spinner inline rootClassName="min-h-0" />
            </div>
          ) : (
            <div className={hasScroll ? 'pr-4' : ''}>
              <div className="rounded-lg overflow-hidden relative">
                <Table
                  idPath="id"
                  {...(canManageProject ? selection : {})}
                  items={users}
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
            className="w-full !bg-transparent !border-t-0 !p-0 !mb-4 !bg-none"
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

      {showBudgets && budgets && (
        <MemberAllocationOverrideModal
          visible={!!overrideContext}
          userId={overrideContext?.userId ?? null}
          budgets={budgets}
          userAllocationsByCategory={
            overrideContext ? budgetAllocationLookup?.[overrideContext.userId] ?? null : null
          }
          initialCategory={overrideContext?.category ?? null}
          onHide={() => setOverrideContext(null)}
          onSubmit={handleOverrideMember}
          onClearOverride={handleClearMemberOverride}
        />
      )}
    </>
  )
}

export default ProjectMembersManager
