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

import ConfigureSvg from '@/assets/icons/configure.svg?react'
import InfoSvg from '@/assets/icons/info.svg?react'
import RefreshSvg from '@/assets/icons/refresh.svg?react'
import DetailsBadges from '@/components/details/DetailsBadges'
import NavigationMore from '@/components/NavigationMore/NavigationMore'
import Spinner from '@/components/Spinner'
import Table from '@/components/Table'
import { DECIMAL_PAGINATION_OPTIONS } from '@/constants'
import { useTableSelection } from '@/hooks/useTableSelection'
import { MAX_DISPLAYED_PROJECTS } from '@/pages/settings/administration/usersManagement/constants'
import SettingsLayout from '@/pages/settings/components/SettingsLayout'
import { userStore } from '@/store/user'
import { Pagination } from '@/types/common'
import { getBudgetCategoryLabel, BudgetAssignment } from '@/types/entity/budget'
import { UserListItem } from '@/types/entity/user'
import { ColumnDefinition, DefinitionTypes } from '@/types/table'

import BudgetAssignmentsModal from './components/BudgetAssignmentsModal'
import ResetBudgetPopup from './usersManagement/components/popups/ResetBudgetPopup'
import UserDetailsPopup from './usersManagement/components/popups/UserDetailsPopup'
import UsersManagementBulkActions from './usersManagement/components/UsersManagementBulkActions'
import UsersManagementFilters from './usersManagement/components/UsersManagementFilters'
import { useUsersManagementFilters } from './usersManagement/hooks/useUsersManagementFilters'

const createCustomColumn = (key: string, label: string, width: string): ColumnDefinition => ({
  key,
  label,
  type: DefinitionTypes.Custom,
  headClassNames: `w-[${width}]`,
})

const BASE_COLUMN_DEFINITIONS: ColumnDefinition[] = [
  { key: 'select', type: DefinitionTypes.Selection },
  { key: 'name', label: 'Name', type: DefinitionTypes.String, headClassNames: 'w-[17%]' },
  createCustomColumn('email', 'Email', '15%'),
  createCustomColumn('user_type', 'User Type', '8%'),
  createCustomColumn('superadmin', 'Project Admin', '3%'),
  createCustomColumn('is_admin', 'Super Admin', '3%'),
  createCustomColumn('projects', 'Projects', '17%'),
  createCustomColumn('budget_assignments', 'Budgets', '25%'),
  createCustomColumn('actions', 'Actions', '5%'),
]

const UsersManagementPage: FC = () => {
  const isBudgetManagementEnabled = window._env_?.VITE_ENABLE_BUDGET_MANAGEMENT === 'true'
  const columnDefinitions = useMemo(
    () =>
      isBudgetManagementEnabled
        ? BASE_COLUMN_DEFINITIONS
        : BASE_COLUMN_DEFINITIONS.filter((c) => c.key !== 'budget_assignments'),
    [isBudgetManagementEnabled]
  )

  const { filters, handleFilterChange } = useUsersManagementFilters()

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
        filters,
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

  const selection = {
    ...tableSelection,
    onSelectAllChange: handleSelectAllChange,
  }

  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null)
  const [isDetailsPopupOpen, setIsDetailsPopupOpen] = useState(false)
  const [budgetUser, setBudgetUser] = useState<UserListItem | null>(null)
  const [resetBudgetUser, setResetBudgetUser] = useState<UserListItem | null>(null)

  const handleOpenDetailsPopup = useCallback((user: UserListItem) => {
    setSelectedUser(user)
    setIsDetailsPopupOpen(true)
  }, [])

  const handleCloseDetailsPopup = useCallback(() => {
    setIsDetailsPopupOpen(false)
    setSelectedUser(null)
  }, [])

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
    loadUsers(pagination.page, pagination.perPage, filters)
    clearSelection()
  }, [pagination.page, pagination.perPage, filters, loadUsers, clearSelection])

  const handleOpenBudgetModal = useCallback(async (user: UserListItem) => {
    try {
      const assignments = await userStore.getUserBudgets(user.id)
      setBudgetUser({ ...user, budget_assignments: assignments })
    } catch {
      setBudgetUser(user)
    }
  }, [])

  const handleBudgetSubmit = useCallback(
    async (assignments: BudgetAssignment[]) => {
      if (!budgetUser) return
      await userStore.updateUserBudgets(budgetUser.id, assignments)
      setBudgetUser(null)
      refresh()
    },
    [budgetUser, refresh]
  )

  const refreshFromFirstPage = useCallback(() => {
    loadUsers(0, pagination.perPage, filters)
    clearSelection()
  }, [pagination.perPage, filters, loadUsers, clearSelection])

  useEffect(() => {
    loadUsers(0, perPageRef.current, filters)
  }, [filters, loadUsers])

  const handlePageChange = useCallback(
    (page: number, newPerPage?: number) => {
      const perPage = newPerPage ?? pagination.perPage
      loadUsers(page, perPage, filters)
    },
    [pagination.perPage, loadUsers, filters]
  )

  const customRenderColumns = useMemo(
    () => ({
      email: (item: UserListItem) => {
        return (
          <button
            onClick={() => handleOpenDetailsPopup(item)}
            className="text-xs font-medium hover:opacity-75 cursor-pointer"
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
        const projectNames = item.projects.map((p) => ({
          value: `${p.name} (${p.is_project_admin ? 'admin' : 'user'})`,
        }))

        return (
          <DetailsBadges
            filled
            items={projectNames}
            emptyMessage={'-'}
            maxDisplayed={MAX_DISPLAYED_PROJECTS}
          />
        )
      },

      budget_assignments: (item: UserListItem) => {
        const assigned = (item.budget_assignments ?? []).filter((a) => a.budget_id !== null)
        return (
          <DetailsBadges
            filled
            items={assigned.map((a) => ({
              value: `${getBudgetCategoryLabel(a.category)}: ${a.budget_name || a.budget_id}`,
            }))}
            emptyMessage="-"
          />
        )
      },

      actions: (item: UserListItem) => {
        return (
          <NavigationMore
            hideOnClickInside
            items={[
              {
                title: 'View details',
                icon: <InfoSvg />,
                onClick: () => handleOpenDetailsPopup(item),
              },
              ...(isBudgetManagementEnabled
                ? [
                    {
                      title: 'Assign budgets',
                      icon: <ConfigureSvg />,
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
    [handleOpenDetailsPopup, handleOpenBudgetModal, setResetBudgetUser]
  )

  return (
    <SettingsLayout
      contentTitle="Users management"
      content={
        <div className="flex flex-col h-full">
          <div className="mt-4 flex items-end justify-between gap-4 pr-4 h-[68px]">
            <UsersManagementFilters
              onFilterChange={handleFilterChange}
              filters={filters}
              hasSelection={selected.length > 0}
            />
            <UsersManagementBulkActions
              selectedUsers={selected}
              refresh={refreshFromFirstPage}
              onClearSelection={clearSelection}
            />
          </div>

          <div className="relative">
            <Table
              idPath="id"
              {...selection}
              items={users || []}
              selected={selected}
              columnDefinitions={columnDefinitions}
              customRenderColumns={customRenderColumns}
              loading={isLoading}
              pagination={pagination}
              onPaginationChange={handlePageChange}
              perPageOptions={DECIMAL_PAGINATION_OPTIONS}
            />
            {isSelectAllLoading && (
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

          {isBudgetManagementEnabled && (
            <BudgetAssignmentsModal
              visible={!!budgetUser}
              header={`Assign budgets — ${budgetUser?.email ?? ''}`}
              initialAssignments={budgetUser?.budget_assignments}
              onHide={() => setBudgetUser(null)}
              onSubmit={handleBudgetSubmit}
            />
          )}

          {isBudgetManagementEnabled && (
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
