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

import DetailsCopyField from '@/components/details/DetailsCopyField'
import DetailsProperty from '@/components/details/DetailsProperty'
import Select from '@/components/form/Select/Select'
import Popup from '@/components/Popup'
import Spinner from '@/components/Spinner'
import { USER_TYPES } from '@/constants/user'
import UserAvatar from '@/pages/settings/administration/usersManagement/components/UserAvatar'
import UserProjectsTable from '@/pages/settings/administration/usersManagement/components/UserProjectsTable'
import { userStore } from '@/store/user'
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

const UserDetailsPopup: FC<UserDetailsModalProps> = ({ userId, isOpen, onClose, onSave }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState<UserListItem | null>(null)
  const [userType, setUserType] = useState<UserType>('regular')
  const [hasChanges, setHasChanges] = useState(false)
  const { user: currentUser } = useSnapshot(userStore)
  const isSuperAdmin = currentUser?.isAdmin ?? false

  const fetchUserDetails = async () => {
    if (!userId) return

    setIsLoading(true)
    try {
      const details = await userStore.getUserById(userId)
      setUser(details)
      setUserType(details.user_type)
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
              {isSuperAdmin ? (
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

            <DetailsCopyField label="Email:" value={user.email} className="mb-2" />

            <div className="bg-border-structural h-px" />

            <UserProjectsTable user={user} onProjectsChange={handleProjectsChange} />
          </div>
        </div>
      )}
    </Popup>
  )
}

export default UserDetailsPopup
