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
import { projectsStore } from '@/store/projects'
import { ProjectListItem } from '@/types/entity/projectManagement'

interface UnassignFromCostCenterConfirmationPopupProps {
  isOpen: boolean
  selectedProjects: ProjectListItem[]
  onClose: () => void
  onSave: () => void
}

const UnassignFromCostCenterConfirmationPopup: FC<UnassignFromCostCenterConfirmationPopupProps> = ({
  isOpen,
  selectedProjects,
  onClose,
  onSave,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConfirm = async () => {
    setIsSubmitting(true)
    try {
      await Promise.all(
        selectedProjects.map((project) =>
          projectsStore.updateProject(project.name, {
            clear_cost_center: true,
          })
        )
      )
      onSave()
    } catch (error) {
      console.error('Failed to unassign projects from cost center:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ConfirmationModal
      visible={isOpen}
      onCancel={onClose}
      header="Unassign Projects from Cost Center?"
      message={`Are you sure you want to unassign ${selectedProjects.length} project(s) from this cost center?`}
      confirmText="Unassign"
      confirmButtonType={ButtonType.DELETE}
      onConfirm={handleConfirm}
      confirmDisabled={isSubmitting}
      hideIcon
    />
  )
}

export default UnassignFromCostCenterConfirmationPopup
