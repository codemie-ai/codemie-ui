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

import IconChevronDown from '@/assets/icons/chevron-down.svg?react'
import ConfigureSvg from '@/assets/icons/configure.svg?react'
import DeleteSvg from '@/assets/icons/delete.svg?react'
import EditSvg from '@/assets/icons/edit.svg?react'
import NavigationMore from '@/components/NavigationMore'
import BulkActions from '@/components/Table/BulkActions'
import BulkResetBudgetsPopup from '@/pages/settings/administration/usersManagement/components/bulkPopups/BulkResetBudgetsPopup'
import { projectBudgetsStore } from '@/store/projectBudgets'
import { BudgetCategory } from '@/types/entity/budget'
import { ProjectBudget, ProjectBudgetMemberAllocation } from '@/types/entity/projectBudget'
import { UserListItem } from '@/types/entity/user'
import toaster from '@/utils/toaster'

import BulkBudgetOverrideModal from './BulkBudgetOverrideModal'
import ChangeProjectRolePopup from './ChangeProjectRolePopup'
import UnassignFromProjectConfirmationPopup from './UnassignFromProjectConfirmationPopup'

type ActivePopup = 'changeRole' | 'unassign' | 'overrideBudgets' | 'resetBudgets'

interface ProjectMembersBulkActionsProps {
  projectName: string
  selectedUsers: UserListItem[]
  currentUserId: string | undefined
  canManageProject: boolean
  isProjectAdmin: boolean
  canManageBudgets: boolean
  onClearSelection: () => void
  refresh: () => void
  onSuccess?: () => void
  onOverrideModels: () => void
  isModelsConfigEnabled?: boolean
  budgets: ProjectBudget[]
  budgetAllocationLookup: Record<
    string,
    Record<BudgetCategory, ProjectBudgetMemberAllocation>
  > | null
}

const ProjectMembersBulkActions: FC<ProjectMembersBulkActionsProps> = ({
  projectName,
  selectedUsers,
  currentUserId,
  canManageProject,
  isProjectAdmin,
  canManageBudgets,
  onClearSelection,
  refresh,
  onSuccess,
  onOverrideModels,
  isModelsConfigEnabled = false,
  budgets,
  budgetAllocationLookup,
}) => {
  const [activePopup, setActivePopup] = useState<ActivePopup | null>(null)
  const [resetCategories, setResetCategories] = useState<BudgetCategory[]>([])

  const validateBulkAction = useCallback(
    (action: ActivePopup): boolean => {
      if (
        !canManageProject ||
        (['overrideBudgets', 'resetBudgets'].includes(action) && !canManageBudgets)
      ) {
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
    [canManageProject, canManageBudgets, isProjectAdmin, currentUserId, selectedUsers]
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
      setResetCategories([])
      setActivePopup(null)
    },
    [refresh, onClearSelection, onSuccess]
  )

  const bulkActionItems = useMemo(
    () => [
      {
        title: 'Change Role',
        icon: <EditSvg className="icon" />,
        onClick: () => openPopup('changeRole'),
      },
      ...(canManageBudgets
        ? [
            {
              title: 'Override budgets',
              icon: <ConfigureSvg className="icon" />,
              onClick: () => openPopup('overrideBudgets'),
            },
          ]
        : []),
      ...(isModelsConfigEnabled
        ? [
            {
              title: 'Override models',
              icon: <ConfigureSvg className="icon" />,
              onClick: onOverrideModels,
            },
          ]
        : []),
      { title: 'bulk-actions-divider', divider: true as const },
      {
        title: 'Unassign from Project',
        icon: <DeleteSvg className="icon" />,
        onClick: () => openPopup('unassign'),
      },
    ],
    [canManageBudgets, isModelsConfigEnabled, onOverrideModels, openPopup]
  )

  if (!canManageProject || selectedUsers.length === 0) {
    return null
  }

  return (
    <>
      <BulkActions selected={selectedUsers.length} onUnselect={onClearSelection}>
        <NavigationMore
          renderInRoot
          hideOnClickInside
          menuClassName="!w-[240px] !min-w-[240px]"
          customIcon={
            <span className="flex items-center gap-2 whitespace-nowrap">
              Bulk Actions
              <IconChevronDown className="size-4" />
            </span>
          }
          buttonClassName="!m-0 flex h-7 items-center justify-center gap-1.5 rounded-lg border button bg-button-primary-bg px-2 py-0.5 text-xs font-semibold leading-6 tracking-tight text-text-accent transition-colors whitespace-nowrap hover:bg-button-primary-bg-hover"
          items={bulkActionItems}
        />
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

      {canManageBudgets && (
        <BulkBudgetOverrideModal
          visible={activePopup === 'overrideBudgets'}
          users={selectedUsers}
          budgets={budgets}
          budgetAllocationLookup={budgetAllocationLookup}
          onHide={() => closePopup()}
          onSubmit={async (updates) => {
            const failedUserIds = new Set<string>()
            for (const { budgetId, userId, payload } of updates) {
              try {
                // Backend rebalances after every PATCH, so these updates must be sequential.
                // eslint-disable-next-line no-await-in-loop
                await projectBudgetsStore.overrideMemberAllocation(budgetId, userId, payload, true)
              } catch {
                failedUserIds.add(userId)
              }
            }
            const failedUsers = selectedUsers.filter((user) => failedUserIds.has(user.id))
            const succeededUsers = selectedUsers.filter((user) => !failedUserIds.has(user.id))
            const failedNames = failedUsers.map((user) => user.name || user.email).join(', ')
            if (!failedUsers.length) {
              toaster.success(
                `Updated budget overrides for ${succeededUsers.length} user(s) successfully`
              )
            } else if (succeededUsers.length) {
              toaster.error(
                `Updated ${succeededUsers.length} user(s); failed for ${failedUsers.length}: ${failedNames}`
              )
            } else {
              toaster.error(
                `Failed to update budgets for ${failedUsers.length} user(s): ${failedNames}`
              )
            }
            closePopup(true)
          }}
          onResetUsage={(category) => {
            setResetCategories(category ? [category] : [])
            setActivePopup('resetBudgets')
          }}
        />
      )}

      {canManageBudgets && (
        <BulkResetBudgetsPopup
          selectedUsers={selectedUsers}
          categories={resetCategories}
          isOpen={activePopup === 'resetBudgets'}
          onClose={() => closePopup()}
          onSave={() => closePopup(true)}
        />
      )}
    </>
  )
}

export default ProjectMembersBulkActions
