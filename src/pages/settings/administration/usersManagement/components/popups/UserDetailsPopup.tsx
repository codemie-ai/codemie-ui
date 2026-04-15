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

import { FC, useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'

import Button from '@/components/Button'
import DetailsCopyField from '@/components/details/DetailsCopyField'
import DetailsProperty from '@/components/details/DetailsProperty'
import Select from '@/components/form/Select/Select'
import Switch from '@/components/form/Switch'
import Popup from '@/components/Popup'
import Spinner from '@/components/Spinner'
import { USER_TYPES } from '@/constants/user'
import BudgetAssignmentsEditor from '@/pages/settings/administration/components/BudgetAssignmentsEditor'
import UserAvatar from '@/pages/settings/administration/usersManagement/components/UserAvatar'
import UserProjectsTable from '@/pages/settings/administration/usersManagement/components/UserProjectsTable'
import { userStore } from '@/store/user'
import { BudgetAssignment } from '@/types/entity/budget'
import { UserListItem, UserType } from '@/types/entity/user'
import { FilterOption } from '@/types/filters'

const USER_TYPE_OPTIONS: FilterOption[] = [
  { label: 'Regular', value: USER_TYPES.regular },
  { label: 'External User', value: USER_TYPES.external },
]

interface UserDetailsModalProps {
  userId?: string
  isOpen: boolean
  onClose: () => void
  onSave?: () => void
}

const isBudgetManagementEnabled = window._env_?.VITE_ENABLE_BUDGET_MANAGEMENT === 'true'

const UserDetailsPopup: FC<UserDetailsModalProps> = ({ userId, isOpen, onClose, onSave }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState<UserListItem | null>(null)
  const [userType, setUserType] = useState<UserType>('regular')
  const [budgetAssignments, setBudgetAssignments] = useState<BudgetAssignment[]>([])
  const [isBudgetEditing, setIsBudgetEditing] = useState(false)
  const [editedAssignments, setEditedAssignments] = useState<BudgetAssignment[]>([])
  const [isSavingBudgets, setIsSavingBudgets] = useState(false)
  const [roleFlags, setRoleFlags] = useState({ is_admin: false, is_maintainer: false })
  const [isUpdatingRoles, setIsUpdatingRoles] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const { user: currentUser } = useSnapshot(userStore)
  const isAdmin = currentUser?.isAdmin ?? false
  const isMaintainer = currentUser?.isMaintainer ?? false
  const canEditPlatformRoles = isMaintainer && currentUser?.userId !== userId

  const fetchUserDetails = async () => {
    if (!userId) return

    setIsLoading(true)
    try {
      const [details, budgets] = await Promise.all([
        userStore.getUserById(userId),
        userStore.getUserBudgets(userId),
      ])
      setUser(details)
      setUserType(details.user_type)
      setBudgetAssignments(budgets)
      setRoleFlags({
        is_admin: details.is_admin,
        is_maintainer: details.is_maintainer,
      })
    } catch (error) {
      console.error('Failed to fetch user details:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserDetails()
      setHasChanges(false)
      setIsBudgetEditing(false)
    }
  }, [isOpen, userId])

  const handleProjectsChange = () => {
    setHasChanges(true)
    fetchUserDetails()
  }

  const handleUserTypeChange = async (newType: UserType) => {
    if (!user || !userId) return

    const previousType = userType
    setUserType(newType)

    try {
      await userStore.updateUser(userId, { user_type: newType })
      setHasChanges(true)
    } catch {
      setUserType(previousType)
    }
  }

  const handleStartBudgetEdit = () => {
    setEditedAssignments([...budgetAssignments])
    setIsBudgetEditing(true)
  }

  const handleCancelBudgetEdit = () => {
    setIsBudgetEditing(false)
    setEditedAssignments([])
  }

  const handleSaveBudgets = async () => {
    if (!userId) return
    setIsSavingBudgets(true)
    try {
      await userStore.updateUserBudgets(userId, editedAssignments)
      setBudgetAssignments(editedAssignments)
      setIsBudgetEditing(false)
      setHasChanges(true)
    } finally {
      setIsSavingBudgets(false)
    }
  }

  const handleRoleChange = async (key: 'is_admin' | 'is_maintainer', value: boolean) => {
    if (!user || !userId || !canEditPlatformRoles || isUpdatingRoles) return

    const previousFlags = roleFlags
    const nextFlags = { ...roleFlags, [key]: value }

    if (key === 'is_maintainer' && value) {
      nextFlags.is_admin = true
    }

    if (key === 'is_admin' && !value && roleFlags.is_maintainer) {
      return
    }

    setRoleFlags(nextFlags)
    setIsUpdatingRoles(true)

    try {
      await userStore.updateUser(userId, nextFlags)
      setUser({ ...user, ...nextFlags })
      setHasChanges(true)
    } catch {
      setRoleFlags(previousFlags)
    } finally {
      setIsUpdatingRoles(false)
    }
  }

  const handleClose = () => {
    if (hasChanges && onSave) {
      onSave()
    }
    onClose()
  }

  return (
    <Popup
      hideFooter
      visible={isOpen}
      onHide={handleClose}
      header="User Details"
      className="w-[600px]"
    >
      {isLoading || !user ? (
        <Spinner inline rootClassName="py-32" />
      ) : (
        <div className="px-3 pt-1 pb-6">
          <div className="flex gap-4 items-center mb-5">
            <UserAvatar src={user.picture ?? undefined} name={user.name ?? undefined} size="lg" />

            <h3 className="text-lg font-semibold text-text-primary">{user.name}</h3>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex gap-12 items-center">
              {isAdmin ? (
                <div className="flex flex-row items-center gap-1.5">
                  <span className="text-xs text-text-primary">User Type:</span>
                  <Select
                    value={userType}
                    onChange={(e) => handleUserTypeChange(e.value as UserType)}
                    options={USER_TYPE_OPTIONS}
                    className="w-40"
                  />
                </div>
              ) : (
                <DetailsProperty
                  label="User Type"
                  value={<span className="capitalize">{user.user_type}</span>}
                  className="text-sm"
                />
              )}
            </div>

            {isMaintainer && (
              <div className="flex flex-col gap-3 rounded-lg border border-border-structural p-4">
                <span className="text-xs font-medium text-text-primary">Platform Roles</span>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-8">
                  <Switch
                    id="user-admin-role"
                    label="Admin"
                    value={roleFlags.is_admin}
                    disabled={!canEditPlatformRoles || isUpdatingRoles || roleFlags.is_maintainer}
                    onChange={(e) => handleRoleChange('is_admin', e.target.checked)}
                  />
                  <Switch
                    id="user-maintainer-role"
                    label="Maintainer"
                    value={roleFlags.is_maintainer}
                    disabled={!canEditPlatformRoles || isUpdatingRoles}
                    onChange={(e) => handleRoleChange('is_maintainer', e.target.checked)}
                  />
                </div>
              </div>
            )}

            <DetailsCopyField label="Email:" value={user.email} className="mb-2" />

            {isBudgetManagementEnabled && (
              <>
                <div className="bg-border-structural h-px" />

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-text-quaternary">Budget assignments</p>
                    {isAdmin && (
                      <div className="flex gap-2">
                        {isBudgetEditing ? (
                          <>
                            <Button
                              variant="tertiary"
                              onClick={handleCancelBudgetEdit}
                              disabled={isSavingBudgets}
                            >
                              Cancel
                            </Button>
                            <Button onClick={handleSaveBudgets} disabled={isSavingBudgets}>
                              Save
                            </Button>
                          </>
                        ) : (
                          <Button variant="primary" onClick={handleStartBudgetEdit}>
                            Edit
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  <BudgetAssignmentsEditor
                    value={isBudgetEditing ? editedAssignments : budgetAssignments}
                    onChange={setEditedAssignments}
                    readOnly={!isBudgetEditing}
                    hideTitle
                  />
                </div>
              </>
            )}

            <div className="bg-border-structural h-px" />

            <UserProjectsTable
              user={user}
              onProjectsChange={handleProjectsChange}
              canManageProjects={isAdmin}
            />
          </div>
        </div>
      )}
    </Popup>
  )
}

export default UserDetailsPopup
