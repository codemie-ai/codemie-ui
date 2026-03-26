import { FC, useState, useMemo, useCallback, useEffect } from 'react'

import PlusSvg from '@/assets/icons/plus.svg?react'
import Button from '@/components/Button'
import ConfirmationModal from '@/components/ConfirmationModal'
import Select from '@/components/form/Select'
import Pagination from '@/components/Pagination'
import Table from '@/components/Table'
import { ButtonType } from '@/constants'
import useOptimistic from '@/hooks/useOptimistic'
import { userStore } from '@/store/user'
import { UserAssignedProject, UserListItem } from '@/types/entity'
import { ProjectRole } from '@/types/entity/project'
import { ColumnDefinition, DefinitionTypes } from '@/types/table'
import toaster from '@/utils/toaster'

import AddProjectPopup from './popups/AddProjectPopup'

interface UserProjectsTableProps {
  user: UserListItem
  onProjectsChange?: () => void
}

const ROLE_OPTIONS = [
  { label: 'User', value: ProjectRole.USER },
  { label: 'Project Admin', value: ProjectRole.ADMINISTRATOR },
]

const columnDefinitions: ColumnDefinition[] = [
  {
    key: 'project',
    label: 'Project',
    type: DefinitionTypes.Custom,
    headClassNames: 'w-[40%]',
  },
  {
    key: 'admin',
    label: 'Role',
    type: DefinitionTypes.Custom,
    headClassNames: 'w-[40%]',
  },
  {
    key: 'actions',
    label: '',
    type: DefinitionTypes.Custom,
    headClassNames: 'w-[20%]',
  },
]

const perPageOptions = [
  { value: '5', label: '5' },
  { value: '10', label: '10' },
  { value: '15', label: '15' },
  { value: '20', label: '20' },
]

const UserProjectsTable: FC<UserProjectsTableProps> = ({ user, onProjectsChange }) => {
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false)
  const [projects, setProjects] = useOptimistic(user.projects)
  const [currentPage, setCurrentPage] = useState(0)
  const [perPage, setPerPage] = useState(5)
  const [pendingRoleChange, setPendingRoleChange] = useState<{
    projectName: string
    newRole: ProjectRole
  } | null>(null)
  const [deletingProject, setDeletingProject] = useState<string | null>(null)

  const totalPages = Math.ceil(projects.length / perPage)
  const paginatedProjects = useMemo(() => {
    const startIndex = currentPage * perPage
    const endIndex = startIndex + perPage
    return projects.slice(startIndex, endIndex)
  }, [projects, currentPage, perPage])

  useEffect(() => {
    if (currentPage >= totalPages && totalPages > 0) {
      setCurrentPage(totalPages - 1)
    }
  }, [currentPage, totalPages])

  const handlePaginationChange = useCallback((newPage: number, newPerPage?: number) => {
    setCurrentPage(newPage)
    if (newPerPage !== undefined) {
      setPerPage(newPerPage)
    }
  }, [])

  const handleRemoveProject = useCallback((projectName: string) => {
    setDeletingProject(projectName)
  }, [])

  const confirmRemoveProject = useCallback(async () => {
    if (!deletingProject) return

    try {
      await setProjects(
        (projects) => projects.filter((p) => p.name !== deletingProject),
        () => userStore.removeUserProjectAccess(user.id, deletingProject)
      )
      toaster.info(`Removed from project`)
      setDeletingProject(null)
      onProjectsChange?.()
    } catch (error) {
      console.error('Failed to remove project:', error)
    }
  }, [deletingProject, user.id, setProjects, onProjectsChange])

  const handleAddProject = useCallback(
    async (projectName: string) => {
      if (projects.find((p) => p.name === projectName)) {
        toaster.info('Project is already assigned to this user')
        return
      }

      const newProject: UserAssignedProject = { name: projectName, is_project_admin: false }

      try {
        await setProjects(
          (projects) => [...projects, newProject],
          () => userStore.addUserProjectAccess(user.id, projectName, false)
        )
        toaster.info(`User added to project`)
        onProjectsChange?.()
      } catch (error) {
        console.error('Failed to add project:', error)
      }
    },
    [user.id, projects, setProjects, onProjectsChange]
  )

  const handleRoleChange = useCallback((projectName: string, newRole: ProjectRole) => {
    setPendingRoleChange({ projectName, newRole })
  }, [])

  const confirmRoleChange = useCallback(async () => {
    if (!pendingRoleChange) return

    const isAdmin = pendingRoleChange.newRole === ProjectRole.ADMINISTRATOR

    try {
      await setProjects(
        (projects) =>
          projects.map((p) =>
            p.name === pendingRoleChange.projectName ? { ...p, is_project_admin: isAdmin } : p
          ),
        () => userStore.updateUserProjectAccess(user.id, pendingRoleChange.projectName, isAdmin)
      )
      toaster.info('Role updated successfully')
      setPendingRoleChange(null)
      onProjectsChange?.()
    } catch (error: any) {
      console.error('Failed to update role:', error)
      toaster.error(error?.parsedError?.message || 'Failed to update role')
    }
  }, [pendingRoleChange, user.id, setProjects, onProjectsChange])

  const customRenderColumns = useMemo(
    () => ({
      project: (item: UserAssignedProject) => (
        <div className="text-text-primary text-sm break-all min-w-0 max-w-[200px]">{item.name}</div>
      ),
      admin: (item: UserAssignedProject) => {
        const currentRole = item.is_project_admin ? ProjectRole.ADMINISTRATOR : ProjectRole.USER
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <Select
              id={`role-${item.name}`}
              name={`role-${item.name}`}
              value={currentRole}
              onChange={(e) => handleRoleChange(item.name, e.value)}
              options={ROLE_OPTIONS}
              rootClassName="w-48"
            />
          </div>
        )
      },
      actions: (item: UserAssignedProject) => {
        return (
          <Button variant="delete" onClick={() => handleRemoveProject(item.name)}>
            Unassign
          </Button>
        )
      },
    }),
    [handleRoleChange, handleRemoveProject]
  )

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-text-quaternary">Projects</p>
        <Button variant="primary" onClick={() => setIsAddProjectOpen(true)}>
          <PlusSvg />
          Add Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <p className="text-sm text-text-quaternary mt-2">No assigned projects</p>
      ) : (
        <div className="flex flex-col w-full overflow-x-auto">
          <Table
            embedded
            items={paginatedProjects}
            columnDefinitions={columnDefinitions}
            customRenderColumns={customRenderColumns}
          />

          {projects.length > 5 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              setPage={handlePaginationChange}
              perPage={perPage}
              perPageOptions={perPageOptions}
              className="mt-3 bg-transparent !bg-none border-0"
            />
          )}
        </div>
      )}

      <AddProjectPopup
        isOpen={isAddProjectOpen}
        onClose={() => setIsAddProjectOpen(false)}
        onAdd={handleAddProject}
      />

      <ConfirmationModal
        visible={!!pendingRoleChange}
        onCancel={() => setPendingRoleChange(null)}
        header="Change User Role?"
        message={`Are you sure you want to change the role to ${
          pendingRoleChange?.newRole === ProjectRole.ADMINISTRATOR ? 'Project Admin' : 'User'
        }?`}
        confirmText="Change Role"
        confirmButtonType={ButtonType.PRIMARY}
        onConfirm={confirmRoleChange}
        hideIcon
      />

      <ConfirmationModal
        visible={!!deletingProject}
        onCancel={() => setDeletingProject(null)}
        header="Unassign from Project?"
        message={`Are you sure you want to unassign this user from ${deletingProject}?`}
        confirmText="Unassign"
        confirmButtonType={ButtonType.DELETE}
        onConfirm={confirmRemoveProject}
        hideIcon
      />
    </div>
  )
}

export default UserProjectsTable
