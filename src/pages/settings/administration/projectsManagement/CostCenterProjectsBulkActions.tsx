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

import { FC, useMemo, useState } from 'react'

import DropdownButton from '@/components/DropdownButton/DropdownButton'
import BulkActions from '@/components/Table/BulkActions'
import { ProjectListItem } from '@/types/entity/projectManagement'

import UnassignFromCostCenterConfirmationPopup from './UnassignFromCostCenterConfirmationPopup'

interface CostCenterProjectsBulkActionsProps {
  selectedProjects: ProjectListItem[]
  onClearSelection: () => void
  refresh: () => void
}

const CostCenterProjectsBulkActions: FC<CostCenterProjectsBulkActionsProps> = ({
  selectedProjects,
  onClearSelection,
  refresh,
}) => {
  const [isUnassignPopupOpen, setIsUnassignPopupOpen] = useState(false)

  const bulkActionItems = useMemo(
    () => [{ label: 'Unassign from Cost Center', onClick: () => setIsUnassignPopupOpen(true) }],
    []
  )

  if (selectedProjects.length === 0) {
    return null
  }

  return (
    <>
      <BulkActions selected={selectedProjects.length} onUnselect={onClearSelection}>
        <DropdownButton size="medium" label="Unassign Projectd" items={bulkActionItems} />
      </BulkActions>

      <UnassignFromCostCenterConfirmationPopup
        isOpen={isUnassignPopupOpen}
        selectedProjects={selectedProjects}
        onClose={() => setIsUnassignPopupOpen(false)}
        onSave={() => {
          refresh()
          onClearSelection()
          setIsUnassignPopupOpen(false)
        }}
      />
    </>
  )
}

export default CostCenterProjectsBulkActions
