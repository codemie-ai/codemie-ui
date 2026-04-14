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
import BudgetAssignmentsModal from '@/pages/settings/administration/components/BudgetAssignmentsModal'
import { userStore } from '@/store/user'
import { BudgetAssignment, BUDGET_CATEGORY_OPTIONS } from '@/types/entity/budget'
import { UserListItem } from '@/types/entity/user'

import AssignToProjectPopup from './bulkPopups/AssignToProjectPopup'
import BulkResetBudgetsPopup from './bulkPopups/BulkResetBudgetsPopup'
import ChangeRolePopup from './bulkPopups/ChangeRolePopup'
import UnassignBudgetsPopup from './bulkPopups/UnassignBudgetsPopup'
import UnassignFromProjectPopup from './bulkPopups/UnassignFromProjectPopup'

const EMPTY_BUDGET_ASSIGNMENTS: BudgetAssignment[] = BUDGET_CATEGORY_OPTIONS.map((o) => ({
  category: o.value,
  budget_id: null,
}))

type ActivePopup =
  | 'changeRole'
  | 'assignToProject'
  | 'unassignFromProject'
  | 'assignBudgets'
  | 'unassignBudgets'
  | 'resetBudgets'

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
      { label: 'Assign Budgets', onClick: () => openPopup('assignBudgets') },
      { label: 'Unassign Budgets', onClick: () => openPopup('unassignBudgets') },
      { label: 'Reset Budgets', onClick: () => openPopup('resetBudgets') },
    ],
    [openPopup]
  )

  const handleBudgetSubmit = async (assignments: BudgetAssignment[]) => {
    const userIds = selectedUsers.map((u) => u.id)
    await userStore.bulkSetBudgets(userIds, assignments)
    closePopup(true)
  }

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

      <BudgetAssignmentsModal
        visible={activePopup === 'assignBudgets'}
        header="Assign Budgets"
        initialAssignments={EMPTY_BUDGET_ASSIGNMENTS}
        onHide={() => closePopup()}
        onSubmit={handleBudgetSubmit}
      />

      <UnassignBudgetsPopup
        selectedUsers={selectedUsers}
        isOpen={activePopup === 'unassignBudgets'}
        onClose={() => closePopup()}
        onSave={() => closePopup(true)}
      />

      <BulkResetBudgetsPopup
        selectedUsers={selectedUsers}
        isOpen={activePopup === 'resetBudgets'}
        onClose={() => closePopup()}
        onSave={() => closePopup(true)}
      />
    </>
  )
}

export default UsersManagementBulkActions
