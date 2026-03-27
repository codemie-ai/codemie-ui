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
import { useSnapshot } from 'valtio'

import ImportSvg from '@/assets/icons/input.svg?react'
import PlusFilledSvg from '@/assets/icons/plus-filled.svg?react'
import SearchIcon from '@/assets/icons/search.svg?react'
import Button from '@/components/Button'
import ConfirmationModal from '@/components/ConfirmationModal'
import Input from '@/components/form/Input/Input'
import Select from '@/components/form/Select'
import Pagination from '@/components/Pagination'
import Spinner from '@/components/Spinner'
import Table from '@/components/Table'
import { ButtonSize, ButtonType, DECIMAL_PAGINATION_OPTIONS } from '@/constants'
import { useDebouncedApply } from '@/hooks/useDebounceApply'
import { useTableSelection } from '@/hooks/useTableSelection'
import { getErrorMessage } from '@/pages/integrations/utils/getErrorMessage'
import AddUserModal, {
  AddUserFormData,
} from '@/pages/settings/administration/components/AddUserModal'
import ProjectMembersBulkActions from '@/pages/settings/administration/components/projectsManagement/ProjectMembersBulkActions'
import UserAvatar from '@/pages/settings/administration/usersManagement/components/UserAvatar'
import { userStore } from '@/store/user'
import { ProjectRole, ProjectType } from '@/types/entity/project'
import { ProjectDetail } from '@/types/entity/projectManagement'
import { UserListItem } from '@/types/entity/user'
import { ColumnDefinition, DefinitionTypes } from '@/types/table'
import toaster from '@/utils/toaster'

import ImportUsersModal from './ImportUsersModal'

interface ProjectMembersManagerProps {
  project: ProjectDetail
  onMembersChanged?: () => Promise<void> | void
}

const personalProjectTooltip = (action: string) =>
  `You cannot ${action} a personal project. Create a separate one instead.`

const ROLE_OPTIONS = [
  { label: 'User', value: ProjectRole.USER },
  { label: 'Project Admin', value: ProjectRole.ADMINISTRATOR },
]

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
      key: 'user',
      label: 'User',
      type: DefinitionTypes.Custom,
      headClassNames: canManage ? 'w-[42%]' : 'w-[52%]',
    },
    {
      key: 'role',
      label: 'Role',
      type: DefinitionTypes.Custom,
      headClassNames: canManage ? 'w-[28%]' : 'w-[48%]',
    }
  )

  if (canManage) {
    columns.push({
      key: 'actions',
      label: '',
      type: DefinitionTypes.Custom,
      headClassNames: 'w-[18%]',
    })
  }

  return columns
}

const ProjectMembersManager: FC<ProjectMembersManagerProps> = ({ project, onMembersChanged }) => {
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
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({
    page: 0,
    per_page: 10,
    total: 0,
  })
  const [localFilters, setLocalFilters] = useState({ search: '' })
  const [hasScroll, setHasScroll] = useState(false)
  const [isSelectAllLoading, setIsSelectAllLoading] = useState(false)

  const tableContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) {
        setHasScroll(node.scrollHeight > node.clientHeight)
      }
    },
    [users]
  )

  const isSuperAdmin = currentUser?.isAdmin ?? false
  const isProjectAdmin =
    !isSuperAdmin && (currentUser?.applicationsAdmin?.includes(project.name || '') ?? false)
  const canManageProject = isSuperAdmin || isProjectAdmin
  const isPersonal = project.project_type === ProjectType.PERSONAL

  const columnDefinitions = useMemo(
    () => getColumnDefinitions(canManageProject),
    [canManageProject]
  )

  const fetchUsers = useCallback(
    async (page: number, perPage: number, search?: string) => {
      const result = await userStore.getUsers({
        page,
        perPage,
        filters: {
          projects: [project.name],
          search: search || undefined,
        },
      })
      setUsers(result.data)
      setPagination(result.pagination)
      return result
    },
    [project.name, pagination.per_page]
  )

  const tableSelection = useTableSelection<UserListItem>({
    totalCount: pagination.total,
    currentItems: users,
    onFetchAll: async () => {
      const response = await userStore.getUsers({
        filters: {
          projects: [project.name],
          search: localFilters.search || undefined,
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
      await fetchUsers(0, pagination.per_page, '')
      clearSelection()
      setLocalFilters({ search: '' })
    } catch (error) {
      console.error('Failed to load users:', error)
      toaster.error('Failed to load project users')
    } finally {
      setLoading(false)
    }
  }, [fetchUsers, pagination.per_page, clearSelection])

  useEffect(() => {
    loadUsers()
  }, [loadUsers, project.name])

  const handlePageChange = useCallback(
    async (page: number, newPerPage?: number) => {
      const perPage = newPerPage ?? pagination.per_page
      setLoading(true)
      try {
        await fetchUsers(page, perPage, localFilters.search)
      } catch (error) {
        console.error('Failed to load users:', error)
        toaster.error('Failed to load project users')
      } finally {
        setLoading(false)
      }
    },
    [pagination.per_page, fetchUsers, localFilters.search]
  )

  const reloadUsers = useCallback(
    async (shouldClearSelection: boolean = true) => {
      try {
        await fetchUsers(pagination.page, pagination.per_page, localFilters.search)
        if (shouldClearSelection) clearSelection()
      } catch (error) {
        console.error('Failed to reload users:', error)
        toaster.error('Failed to load project users')
      }
    },
    [fetchUsers, pagination.page, pagination.per_page, clearSelection, localFilters.search]
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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalFilters({ search: e.target.value })
  }

  const applySearch = useCallback(async () => {
    setLoading(true)
    try {
      clearSelection()
      await fetchUsers(0, pagination.per_page, localFilters.search)
    } catch (error) {
      console.error('Failed to load users:', error)
      toaster.error('Failed to load project users')
    } finally {
      setLoading(false)
    }
  }, [clearSelection, fetchUsers, pagination.per_page, localFilters.search])

  useDebouncedApply(localFilters.search, 500, applySearch)

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
      actions: (user: UserListItem) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <span
            data-tooltip-id="react-tooltip"
            data-tooltip-content={isPersonal ? personalProjectTooltip('unassign from') : undefined}
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
        </div>
      ),
    }),
    [
      currentUser?.userId,
      canManageProject,
      isProjectAdmin,
      isPersonal,
      getUserRole,
      handleRoleChange,
      handleDeleteUser,
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
          <div className="w-64">
            <Input
              placeholder="Search"
              value={localFilters.search}
              onChange={handleSearchChange}
              leftIcon={<SearchIcon className="w-4 h-4 text-text-tertiary" />}
              className="w-full"
            />
          </div>
          {canManageProject && (
            <ProjectMembersBulkActions
              projectName={project.name}
              selectedUsers={selected}
              totalCount={pagination.total}
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
    </>
  )
}

export default ProjectMembersManager
