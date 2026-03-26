import { FC, useMemo, useState, useCallback } from 'react'

import DropdownButton from '@/components/DropdownButton/DropdownButton'
import BulkActions from '@/components/Table/BulkActions'
import { UserListItem } from '@/types/entity/user'
import toaster from '@/utils/toaster'

import ChangeProjectRolePopup from './ChangeProjectRolePopup'
import UnassignFromProjectConfirmationPopup from './UnassignFromProjectConfirmationPopup'

type ActivePopup = 'changeRole' | 'unassign'

interface ProjectMembersBulkActionsProps {
  projectName: string
  totalCount: number
  selectedUsers: UserListItem[]
  currentUserId: string | undefined
  canManageProject: boolean
  isProjectAdmin: boolean
  onClearSelection: () => void
  refresh: () => void
  onSuccess?: () => void
}

const ProjectMembersBulkActions: FC<ProjectMembersBulkActionsProps> = ({
  projectName,
  selectedUsers,
  totalCount,
  currentUserId,
  canManageProject,
  isProjectAdmin,
  onClearSelection,
  refresh,
  onSuccess,
}) => {
  const [activePopup, setActivePopup] = useState<ActivePopup | null>(null)

  const validateBulkAction = useCallback(
    (action: ActivePopup): boolean => {
      if (!canManageProject) {
        toaster.error('You do not have permission to perform this action')
        return false
      }

      if (
        isProjectAdmin &&
        selectedUsers.some((user) => user.id === currentUserId) &&
        action === 'changeRole'
      ) {
        toaster.error('Project admins cannot modify their own role')
        return false
      }
      return true
    },
    [canManageProject, isProjectAdmin, currentUserId, selectedUsers]
  )

  const openPopup = useCallback(
    (popup: ActivePopup) => {
      if (validateBulkAction(popup)) {
        setActivePopup(popup)
      }
    },
    [validateBulkAction]
  )

  const closePopup = useCallback(
    (shouldRefresh?: boolean) => {
      if (shouldRefresh) {
        refresh()
        onClearSelection()
        onSuccess?.()
      }
      setActivePopup(null)
    },
    [refresh, onClearSelection, onSuccess]
  )

  const bulkActionItems = useMemo(
    () => [
      { label: 'Change Role', onClick: () => openPopup('changeRole') },
      { label: 'Unassign from Project', onClick: () => openPopup('unassign') },
    ],
    [openPopup]
  )

  if (!canManageProject || selectedUsers.length === 0) {
    return null
  }

  return (
    <>
      <BulkActions selected={selectedUsers.length} total={totalCount} onUnselect={onClearSelection}>
        <DropdownButton size="medium" label="Bulk Actions" items={bulkActionItems} />
      </BulkActions>

      <ChangeProjectRolePopup
        projectName={projectName}
        selectedUsers={selectedUsers}
        isOpen={activePopup === 'changeRole'}
        onClose={() => closePopup()}
        onSave={() => closePopup(true)}
      />

      <UnassignFromProjectConfirmationPopup
        projectName={projectName}
        selectedUsers={selectedUsers}
        isOpen={activePopup === 'unassign'}
        onClose={() => closePopup()}
        onSave={() => closePopup(true)}
      />
    </>
  )
}

export default ProjectMembersBulkActions
