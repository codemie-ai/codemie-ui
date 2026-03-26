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

import { FC, useState } from 'react'

import ConfirmationModal from '@/components/ConfirmationModal'
import { ButtonType } from '@/constants'
import { userStore } from '@/store/user'
import { UserListItem } from '@/types/entity/user'

interface UnassignFromProjectConfirmationPopupProps {
  isOpen: boolean
  projectName: string
  selectedUsers: UserListItem[]
  onClose: () => void
  onSave: () => void
}

const UnassignFromProjectConfirmationPopup: FC<UnassignFromProjectConfirmationPopupProps> = ({
  isOpen,
  projectName,
  selectedUsers,
  onClose,
  onSave,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConfirm = async () => {
    const userIds = selectedUsers.map((user) => user.id)
    setIsSubmitting(true)
    try {
      await userStore.bulkUnassignFromProject(userIds, projectName)
      onSave()
    } catch (error) {
      console.error('Failed to unassign users from project:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ConfirmationModal
      visible={isOpen}
      onCancel={onClose}
      header="Unassign Users from Project?"
      message={`Are you sure you want to unassign ${selectedUsers.length} user(s) from project ${projectName}?`}
      confirmText="Unassign"
      confirmButtonType={ButtonType.DELETE}
      onConfirm={handleConfirm}
      confirmDisabled={isSubmitting}
      hideIcon
    />
  )
}

export default UnassignFromProjectConfirmationPopup
