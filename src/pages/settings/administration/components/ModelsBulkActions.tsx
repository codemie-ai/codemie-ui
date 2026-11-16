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

import { FC } from 'react'

import DropdownButton from '@/components/DropdownButton/DropdownButton'
import BulkActions from '@/components/Table/BulkActions'
import { AdminModel } from '@/types/entity/adminModel'
import { ModelStatus } from '@/types/entity/configuration'

interface ModelsBulkActionsProps {
  selectedModels: AdminModel[]
  onClearSelection: () => void
  onStatusChange: (models: AdminModel[], status: ModelStatus) => void
  disabled?: boolean
}

const ModelsBulkActions: FC<ModelsBulkActionsProps> = ({
  selectedModels,
  onClearSelection,
  onStatusChange,
  disabled = false,
}) => (
  <BulkActions selected={selectedModels.length} onUnselect={onClearSelection}>
    <DropdownButton
      label="Bulk Actions"
      items={[
        { label: 'Enable', onClick: () => onStatusChange(selectedModels, 'enabled') },
        { label: 'Disable', onClick: () => onStatusChange(selectedModels, 'disabled') },
        { label: 'Deprecate', onClick: () => onStatusChange(selectedModels, 'deprecated') },
      ]}
      size="medium"
      disabled={disabled}
    />
  </BulkActions>
)

export default ModelsBulkActions
