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

import InfoSvg from '@/assets/icons/info.svg?react'
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
import { UserListItem } from '@/types/entity/user'
import { ColumnDefinition, DefinitionTypes } from '@/types/table'

import UserDetailsPopup from './usersManagement/components/popups/UserDetailsPopup'
import UsersManagementBulkActions from './usersManagement/components/UsersManagementBulkActions'
import UsersManagementFilters from './usersManagement/components/UsersManagementFilters'
import { useUsersManagementFilters } from './usersManagement/hooks/useUsersManagementFilters'

const columnDefinitions: ColumnDefinition[] = [
  {
    key: 'select',
    type: DefinitionTypes.Selection,
  },
  {
    key: 'name',
    label: 'Name',
    type: DefinitionTypes.String,
    headClassNames: 'w-[15%]',
  },
  {
    key: 'email',
    label: 'Email',
    type: DefinitionTypes.Custom,
    headClassNames: 'w-[15%]',
  },
  {
    key: 'superadmin',
    label: 'Project Admin',
    type: DefinitionTypes.Custom,
    headClassNames: 'w-[5%]',
  },
  {
    key: 'is_admin',
    label: 'Super Admin',
    type: DefinitionTypes.Custom,
    headClassNames: 'w-[5%]',
  },
  {
    key: 'projects',
    label: 'Projects',
    type: DefinitionTypes.Custom,
    headClassNames: 'w-[34%]',
  },
  {
    key: 'actions',
    label: 'Actions',
    type: DefinitionTypes.Custom,
    headClassNames: 'w-[5%]',
  },
]

const UsersManagementPage: FC = () => {
  const { filters, handleFilterChange } = useUsersManagementFilters()

  const [isLoading, setIsLoading] = useState(true)
  const [isSelectAllLoading, setIsSelectAllLoading] = useState(false)
  const [users, setUsers] = useState<UserListItem[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 0,
    perPage: 10,
    totalPages: 0,
    totalCount: 0,
  })

  const tableSelection = useTableSelection<UserListItem>({
    totalCount: pagination.totalCount,
    currentItems: users,
    onFetchAll: async () => {
      const response = await userStore.getUsers({
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
    [onSelectAllChange, pagination.totalCount, pagination.perPage]
  )

  const selection = {
    ...tableSelection,
    onSelectAllChange: handleSelectAllChange,
  }

  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null)
  const [isDetailsPopupOpen, setIsDetailsPopupOpen] = useState(false)

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

  const refreshFromFirstPage = useCallback(() => {
    loadUsers(0, pagination.perPage, filters)
    clearSelection()
  }, [pagination.perPage, filters, loadUsers, clearSelection])

  useEffect(() => {
    loadUsers(0, 10, filters)
    clearSelection()
  }, [filters, loadUsers, clearSelection])

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
            ]}
          />
        )
      },
    }),
    [handleOpenDetailsPopup]
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
              totalCount={pagination.totalCount}
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
        </div>
      }
    />
  )
}

export default UsersManagementPage
