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

import { FC, useMemo, useState, useCallback } from 'react'

import DropdownButton from '@/components/DropdownButton/DropdownButton'
import BulkActions from '@/components/Table/BulkActions'
import { UserListItem } from '@/types/entity/user'

import AssignToProjectPopup from './bulkPopups/AssignToProjectPopup'
import ChangeRolePopup from './bulkPopups/ChangeRolePopup'
import UnassignFromProjectPopup from './bulkPopups/UnassignFromProjectPopup'

type ActivePopup = 'changeRole' | 'assignToProject' | 'unassignFromProject'

interface UsersManagementBulkActionsProps {
  selectedUsers: UserListItem[]
  onClearSelection: () => void
  refresh: () => void
}

const UsersManagementBulkActions: FC<UsersManagementBulkActionsProps> = ({
  selectedUsers,
  onClearSelection,
  refresh,
}) => {
  const [activePopup, setActivePopup] = useState<ActivePopup | null>(null)

  const openPopup = useCallback((popup: ActivePopup) => {
    setActivePopup(popup)
  }, [])

  const closePopup = useCallback(
    (shouldRefresh?: boolean) => {
      if (shouldRefresh) refresh()
      setActivePopup(null)
    },
    [refresh]
  )

  const bulkActionItems = useMemo(
    () => [
      // { label: 'Change Role', onClick: () => openPopup('changeRole') },
      { label: 'Assign to Project', onClick: () => openPopup('assignToProject') },
      { label: 'Unassign from Project', onClick: () => openPopup('unassignFromProject') },
    ],
    [openPopup]
  )

  return (
    <>
      <BulkActions selected={selectedUsers.length} onUnselect={onClearSelection}>
        <DropdownButton size="medium" label="Bulk Actions" items={bulkActionItems} />
      </BulkActions>

      <ChangeRolePopup
        selectedUsers={selectedUsers}
        isOpen={activePopup === 'changeRole'}
        onClose={closePopup}
        onSave={() => closePopup(true)}
      />

      <AssignToProjectPopup
        selectedUsers={selectedUsers}
        isOpen={activePopup === 'assignToProject'}
        onClose={closePopup}
        onSave={() => closePopup(true)}
      />

      <UnassignFromProjectPopup
        selectedUsers={selectedUsers}
        isOpen={activePopup === 'unassignFromProject'}
        onClose={closePopup}
        onSave={() => closePopup(true)}
      />
    </>
  )
}

export default UsersManagementBulkActions
