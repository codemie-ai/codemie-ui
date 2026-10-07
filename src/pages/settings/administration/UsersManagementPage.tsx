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

import InfoSvg from '@/assets/icons/info.svg?react'
import PlusFilledSvg from '@/assets/icons/plus-filled.svg?react'
import RefreshSvg from '@/assets/icons/refresh.svg?react'
import Button from '@/components/Button'
import DetailsBadges, { BadgeItem } from '@/components/details/DetailsBadges'
import NavigationMore from '@/components/NavigationMore/NavigationMore'
import Spinner from '@/components/Spinner'
import Table from '@/components/Table'
import { ButtonSize, DECIMAL_PAGINATION_OPTIONS } from '@/constants'
import { PROJECTS_MANAGEMENT_DETAIL } from '@/constants/routes'
import { useBudgetManagementEnabled } from '@/hooks/useFeatureFlags'
import { useRouter } from '@/hooks/useRouter'
import { useTableSelection } from '@/hooks/useTableSelection'
import BudgetSpendCell from '@/pages/settings/administration/components/BudgetSpendCell'
import { MAX_DISPLAYED_PROJECTS } from '@/pages/settings/administration/usersManagement/constants'
import SettingsLayout from '@/pages/settings/components/SettingsLayout'
import { appInfoStore } from '@/store/appInfo'
import { userStore } from '@/store/user'
import { Pagination } from '@/types/common'
import { BudgetAssignment } from '@/types/entity/budget'
import { ProjectRoleBE } from '@/types/entity/project'
import { UserListItem } from '@/types/entity/user'
import { ColumnDefinition, DefinitionTypes } from '@/types/table'

import BudgetAssignmentsModal from './components/BudgetAssignmentsModal'
import CreateUserPopup from './usersManagement/components/popups/CreateUserPopup'
import ResetBudgetPopup from './usersManagement/components/popups/ResetBudgetPopup'
import UserDetailsPopup from './usersManagement/components/popups/UserDetailsPopup'
import UserProjectSpendingTable, {
  clearSpendingCache,
} from './usersManagement/components/UserProjectSpendingTable'
import UsersManagementBulkActions from './usersManagement/components/UsersManagementBulkActions'
import UsersManagementFilters from './usersManagement/components/UsersManagementFilters'
import { useUsersManagementFilters } from './usersManagement/hooks/useUsersManagementFilters'

const createCustomColumn = (key: string, label: string, width: string): ColumnDefinition => ({
  key,
  label,
  type: DefinitionTypes.Custom,
  headClassNames: `w-[${width}]`,
})

const AssignBudgetsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M8.91895 2C9.13841 2.00062 9.32297 2.07518 9.47266 2.22363C9.62241 2.37235 9.69723 2.55717 9.69629 2.77734V3.63379C10.1889 3.71157 10.6165 3.87029 10.9795 4.11035C11.3424 4.35037 11.6407 4.64477 11.874 4.99414C11.9907 5.16266 12.0134 5.35119 11.9424 5.55859C11.8713 5.76582 11.7256 5.91515 11.5049 6.00586C11.3234 6.08364 11.1349 6.08666 10.9404 6.01562C10.7461 5.94457 10.5649 5.81765 10.3965 5.63574C10.228 5.4538 10.0298 5.31518 9.80273 5.21875C9.57562 5.12231 9.29355 5.0733 8.95703 5.07227C8.38684 5.07232 7.95238 5.19917 7.6543 5.45215C7.3564 5.70513 7.20703 6.01928 7.20703 6.39453C7.20706 6.82227 7.40215 7.15899 7.79102 7.40527C8.17987 7.65153 8.85349 7.91143 9.8125 8.18359C10.7069 8.44284 11.3853 8.85386 11.8457 9.41797C12.3061 9.98208 12.5356 10.6338 12.5352 11.3721C12.5352 12.2924 12.2632 12.993 11.7188 13.4727C11.1743 13.9522 10.4999 14.2495 9.69629 14.3662V15.2227C9.69619 15.4426 9.62163 15.6272 9.47266 15.7764C9.32342 15.9256 9.13861 16.0004 8.91895 16C8.69858 16 8.51307 15.9257 8.36426 15.7764C8.21558 15.6271 8.14124 15.4423 8.14063 15.2227V14.3281C7.55732 14.1985 7.04522 13.9715 6.60449 13.6475C6.16375 13.3234 5.80738 12.8695 5.53516 12.2861C5.44444 12.1047 5.44094 11.9135 5.52539 11.7129C5.60989 11.5123 5.76263 11.3667 5.98242 11.2754C6.16381 11.1977 6.35157 11.2008 6.5459 11.2852C6.74034 11.3697 6.88946 11.5092 6.99316 11.7031C7.21352 12.092 7.49307 12.3867 7.83008 12.5879C8.16705 12.7889 8.58179 12.8892 9.07422 12.8887C9.6056 12.8886 10.0557 12.7688 10.4248 12.5293C10.794 12.2897 10.979 11.9172 10.9795 11.4111C10.9795 10.9574 10.8369 10.5975 10.5518 10.332C10.2665 10.0666 9.60516 9.76521 8.56836 9.42773C7.45368 9.07776 6.68922 8.65963 6.27441 8.17383C5.85962 7.688 5.65138 7.09501 5.65137 6.39453C5.65137 5.55194 5.92431 4.89733 6.46875 4.43066C7.01312 3.96409 7.57034 3.69863 8.14062 3.63379V2.77734C8.14072 2.55738 8.21532 2.37279 8.36426 2.22363C8.51359 2.0743 8.69909 1.99948 8.91895 2Z"
      fill="currentColor"
    />
  </svg>
)

const BASE_COLUMN_DEFINITIONS: ColumnDefinition[] = [
  { key: 'select', type: DefinitionTypes.Selection, headClassNames: '!w-[4%]' },
  { ...createCustomColumn('name', 'Name', '14%'), headerNoWrap: false },
  { ...createCustomColumn('email', 'Email', '16%'), headerNoWrap: false },
  { ...createCustomColumn('user_type', 'User Type', '7%'), headerNoWrap: false },
  { ...createCustomColumn('superadmin', 'Project Admin', '7%') },
  { ...createCustomColumn('is_admin', 'Super Admin', '7%') },
  { ...createCustomColumn('projects', 'Projects', '14%'), headerNoWrap: false },
  { ...createCustomColumn('budget_assignments', 'Budgets', '16%'), headerNoWrap: false },
  { ...createCustomColumn('actions', 'Actions', '3%'), headerNoWrap: false },
]

const UsersManagementPage: FC = () => {
  const router = useRouter()
  const [isBudgetManagementEnabled] = useBudgetManagementEnabled()
  const { user: currentUser } = useSnapshot(userStore)
  useSnapshot(appInfoStore)
  const { filters, handleFilterChange } = useUsersManagementFilters()
  const isAdmin = currentUser?.isAdmin ?? false
  const isMaintainer = currentUser?.isMaintainer ?? false
  const isAuditor = currentUser?.isAuditor ?? false
  const isLocalAuth = appInfoStore.getIdpProvider() === 'local'
  const canViewBudgets = isBudgetManagementEnabled && (isAdmin || isMaintainer || isAuditor)
  const canManageBudgets = isBudgetManagementEnabled && (isAdmin || isMaintainer)
  const canCreateUser = (isAdmin || isMaintainer) && isLocalAuth
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false)
  const effectiveFilters = useMemo(
    () => ({
      ...filters,
      budgets: canViewBudgets ? filters.budgets : [],
      platform_role: (filters.platform_role ?? null) as ProjectRoleBE | null,
    }),
    [canViewBudgets, filters]
  )
  const columnDefinitions = useMemo(
    () =>
      canViewBudgets
        ? BASE_COLUMN_DEFINITIONS
        : BASE_COLUMN_DEFINITIONS.filter((c) => c.key !== 'budget_assignments'),
    [canViewBudgets]
  )

  const perPageRef = useRef(10)

  const [isLoading, setIsLoading] = useState(true)
  const [isSelectAllLoading, setIsSelectAllLoading] = useState(false)
  const [users, setUsers] = useState<UserListItem[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 0,
    perPage: 10,
    totalPages: 0,
    totalCount: 0,
  })
  perPageRef.current = pagination.perPage

  const tableSelection = useTableSelection<UserListItem>({
    totalCount: pagination.totalCount,
    currentItems: users,
    onFetchAll: async () => {
      const response = await userStore.getUsers({
        page: 0,
        perPage: pagination.totalCount,
        filters: effectiveFilters,
      })
      return response.data
    },
  })

  const { selected, clearSelection, onSelectAllChange } = tableSelection

  // Wrap onSelectAllChange to show loading state
  const handleSelectAllChange = useCallback(
    async (checked: boolean) => {
      if (checked) {
        setIsSelectAllLoading(true)
      }
      try {
        await onSelectAllChange(checked)
      } finally {
        setIsSelectAllLoading(false)
      }
    },
    [onSelectAllChange]
  )

  const selection = isAdmin
    ? {
        ...tableSelection,
        onSelectAllChange: handleSelectAllChange,
      }
    : undefined

  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null)
  const [isDetailsPopupOpen, setIsDetailsPopupOpen] = useState(false)
  const [budgetUser, setBudgetUser] = useState<UserListItem | null>(null)
  const [resetBudgetUser, setResetBudgetUser] = useState<UserListItem | null>(null)
  const [expandedRowIds, setExpandedRowIds] = useState<string[]>([])

  const handleOpenDetailsPopup = useCallback((user: UserListItem) => {
    setSelectedUser(user)
    setIsDetailsPopupOpen(true)
  }, [])

  const handleCloseDetailsPopup = useCallback(() => {
    setIsDetailsPopupOpen(false)
    setSelectedUser(null)
  }, [])

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedRowIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }, [])

  const renderExpandedRow = useCallback(
    (user: UserListItem) => <UserProjectSpendingTable userEmail={user.email} />,
    []
  )

  const loadUsers = useCallback(
    async (page: number, perPage: number, currentFilters: Record<string, any> = {}) => {
      setIsLoading(true)
      try {
        const response = await userStore.getUsers({ page, perPage, filters: currentFilters })

        setUsers(response.data)
        setPagination({
          page: response.pagination.page,
          perPage: response.pagination.per_page,
          totalPages: Math.ceil(response.pagination.total / response.pagination.per_page),
          totalCount: response.pagination.total,
        })
      } catch (error) {
        console.error('Failed to load users:', error)
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  const refresh = useCallback(() => {
    clearSpendingCache()
    loadUsers(pagination.page, pagination.perPage, effectiveFilters)
    clearSelection()
  }, [pagination.page, pagination.perPage, effectiveFilters, loadUsers, clearSelection])

  const handleOpenBudgetModal = useCallback(
    async (user: UserListItem) => {
      if (!canManageBudgets) return

      try {
        const assignments = await userStore.getUserBudgets(user.id)
        setBudgetUser({ ...user, budget_assignments: assignments })
      } catch {
        setBudgetUser(user)
      }
    },
    [canManageBudgets]
  )

  const handleBudgetSubmit = useCallback(
    async (assignments: BudgetAssignment[]) => {
      if (!canManageBudgets || !budgetUser) return
      await userStore.updateUserBudgets(budgetUser.id, assignments)
      setBudgetUser(null)
      refresh()
    },
    [budgetUser, canManageBudgets, refresh]
  )

  const refreshFromFirstPage = useCallback(() => {
    clearSpendingCache()
    loadUsers(0, pagination.perPage, effectiveFilters)
    clearSelection()
  }, [pagination.perPage, effectiveFilters, loadUsers, clearSelection])

  useEffect(() => {
    loadUsers(0, perPageRef.current, effectiveFilters)
  }, [effectiveFilters, loadUsers])

  const handlePageChange = useCallback(
    (page: number, newPerPage?: number) => {
      const perPage = newPerPage ?? pagination.perPage
      loadUsers(page, perPage, effectiveFilters)
    },
    [pagination.perPage, loadUsers, effectiveFilters]
  )

  const customRenderColumns = useMemo(
    () => ({
      name: (item: UserListItem) => (
        <div
          id={`user-name-${item.id}`}
          className="min-w-0 max-w-full text-xs font-medium break-words"
        >
          {item.name || item.username || '-'}
        </div>
      ),

      email: (item: UserListItem) => {
        return (
          <button
            onClick={() => handleOpenDetailsPopup(item)}
            className="min-w-0 max-w-full text-xs font-medium hover:opacity-75 cursor-pointer break-all text-left"
          >
            {item.email}
          </button>
        )
      },

      user_type: (item: UserListItem) => (
        <span className="text-xs font-medium capitalize">{item.user_type}</span>
      ),

      superadmin: (item: UserListItem) => {
        return (
          <p className="text-xs font-medium">
            {item.projects.some((p) => p.is_project_admin) ? 'Yes' : 'No'}
          </p>
        )
      },

      is_admin: (item: UserListItem) => {
        return <p className="text-xs font-medium">{item.is_admin ? 'Yes' : 'No'}</p>
      },

      projects: (item: UserListItem) => {
        // Only the first MAX_DISPLAYED_PROJECTS badges are visible at rest; the default must be one of them.
        const orderedProjects = [
          ...item.projects.filter((p) => p.is_default),
          ...item.projects.filter((p) => !p.is_default),
        ]
        const projectNames: BadgeItem[] = orderedProjects.map((p) => ({
          value: `${p.name} (${p.is_project_admin ? 'admin' : 'user'})`,
          href: router.resolve({
            name: PROJECTS_MANAGEMENT_DETAIL,
            params: { projectName: p.name },
          }).fullPath,
          icon: p.is_default ? (
            <span data-testid="default-project-marker" title="Default project">
              Default
            </span>
          ) : undefined,
        }))

        return (
          <DetailsBadges
            filled
            items={projectNames}
            emptyMessage={'-'}
            maxDisplayed={MAX_DISPLAYED_PROJECTS}
            className="min-w-0 max-w-full"
            badgeClassName="min-w-0 max-w-full whitespace-normal break-all text-[10px] leading-tight px-1.5 py-1"
          />
        )
      },

      budget_assignments: (item: UserListItem) => {
        const assigned = (item.budget_assignments ?? []).filter((a) => a.budget_id !== null)
        return (
          <BudgetSpendCell
            items={assigned.map((assignment) => ({
              key: `${item.id}-${assignment.category}`,
              category: assignment.category,
              max_budget: assignment.max_budget,
              current_spending: assignment.current_spending,
              tooltip: `Budget: ${assignment.budget_name || assignment.budget_id} · Duration: ${
                assignment.budget_duration ?? '-'
              } · Reset: ${assignment.budget_reset_at ?? '-'}`,
            }))}
          />
        )
      },

      actions: (item: UserListItem) => {
        return (
          <NavigationMore
            hideOnClickInside
            className="justify-end"
            buttonClassName="ml-auto"
            contextId={`user-name-${item.id}`}
            items={[
              {
                title: 'View details',
                icon: <InfoSvg />,
                onClick: () => handleOpenDetailsPopup(item),
              },
              ...(canManageBudgets
                ? [
                    {
                      title: 'Assign budgets',
                      icon: <AssignBudgetsIcon />,
                      onClick: () => handleOpenBudgetModal(item),
                    },
                    {
                      title: 'Reset budget',
                      icon: <RefreshSvg />,
                      onClick: () => setResetBudgetUser(item),
                    },
                  ]
                : []),
            ]}
          />
        )
      },
    }),
    [canManageBudgets, handleOpenDetailsPopup, handleOpenBudgetModal, setResetBudgetUser]
  )

  const effectiveColumnDefinitions = useMemo(() => {
    if (isAdmin) {
      return columnDefinitions
    }

    return columnDefinitions.filter((column) => column.key !== 'select')
  }, [columnDefinitions, isAdmin])

  const renderHeaderActions = useMemo(() => {
    if (!canCreateUser) return null

    return (
      <Button onClick={() => setIsCreateUserOpen(true)} size={ButtonSize.MEDIUM}>
        <PlusFilledSvg />
        Create
      </Button>
    )
  }, [canCreateUser])

  return (
    <SettingsLayout
      contentTitle="Users management"
      rightContent={renderHeaderActions}
      content={
        <div className="flex flex-col h-full">
          <div className="mt-4 flex items-end justify-between gap-4 pr-4 h-[68px] max-lg:h-auto max-lg:flex-wrap max-lg:pr-0">
            <UsersManagementFilters
              onFilterChange={handleFilterChange}
              filters={effectiveFilters}
              hasSelection={isAdmin && selected.length > 0}
              canManageBudgets={canManageBudgets}
            />
            <div className="flex items-center gap-4">
              {isAdmin && (
                <UsersManagementBulkActions
                  selectedUsers={selected}
                  refresh={refreshFromFirstPage}
                  onClearSelection={clearSelection}
                  canManageBudgets={canManageBudgets}
                />
              )}
            </div>
          </div>

          <div className="relative">
            <Table
              idPath="id"
              {...selection}
              items={users || []}
              selected={selected}
              columnDefinitions={effectiveColumnDefinitions}
              customRenderColumns={customRenderColumns}
              loading={isLoading}
              pagination={pagination}
              onPaginationChange={handlePageChange}
              perPageOptions={DECIMAL_PAGINATION_OPTIONS}
              tableClassName="table-fixed"
              expandedRowIds={canManageBudgets ? expandedRowIds : undefined}
              onToggleExpand={canManageBudgets ? handleToggleExpand : undefined}
              renderExpandedRow={canManageBudgets ? renderExpandedRow : undefined}
            />
            {isAdmin && isSelectAllLoading && (
              <div className="absolute top-0 left-0 right-0 bottom-[80px] flex items-center justify-center bg-surface-base-primary/80 backdrop-blur-sm rounded-lg z-[60]">
                <div className="flex flex-col items-center gap-3">
                  <Spinner inline rootClassName="min-h-0" />
                  <span className="text-sm text-text-quaternary">Selecting all users...</span>
                </div>
              </div>
            )}
          </div>

          <UserDetailsPopup
            isOpen={isDetailsPopupOpen}
            userId={selectedUser?.id}
            onClose={handleCloseDetailsPopup}
            onSave={refresh}
          />

          <CreateUserPopup
            isOpen={isCreateUserOpen}
            onClose={() => setIsCreateUserOpen(false)}
            onCreated={() => {
              setIsCreateUserOpen(false)
              refreshFromFirstPage()
            }}
          />

          {canManageBudgets && (
            <BudgetAssignmentsModal
              visible={!!budgetUser}
              header={`Assign budgets — ${budgetUser?.email ?? ''}`}
              initialAssignments={budgetUser?.budget_assignments}
              onHide={() => setBudgetUser(null)}
              onSubmit={handleBudgetSubmit}
            />
          )}

          {canManageBudgets && (
            <ResetBudgetPopup
              isOpen={!!resetBudgetUser}
              user={resetBudgetUser}
              onClose={() => setResetBudgetUser(null)}
              onSave={() => {
                setResetBudgetUser(null)
                refresh()
              }}
            />
          )}
        </div>
      }
    />
  )
}

export default UsersManagementPage
