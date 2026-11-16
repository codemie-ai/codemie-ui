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

import Select from '@/components/form/Select/Select'
import { AdminModel } from '@/types/entity/adminModel'
import { ModelStatus } from '@/types/entity/configuration'
import { FilterOption } from '@/types/filters'

import ModelStatusBadge from './ModelStatusBadge'
import { MODEL_STATUS_DESCRIPTIONS } from '../utils/modelStatusDescriptions'

const STATUS_OPTIONS: FilterOption[] = [
  { label: 'Enabled', value: 'enabled' },
  { label: 'Disabled', value: 'disabled' },
  { label: 'Deprecated', value: 'deprecated' },
]

const renderStatusOption = (option: FilterOption) => (
  <div className="flex flex-col gap-1 whitespace-normal px-2.5 py-2">
    <ModelStatusBadge status={option.value as ModelStatus} />
    <span className="text-xs text-text-quaternary">
      {MODEL_STATUS_DESCRIPTIONS[option.value as ModelStatus]}
    </span>
  </div>
)

interface ModelStatusSelectorProps {
  model: AdminModel
  onStatusChange: (model: AdminModel, status: ModelStatus) => void
  disabled?: boolean
}

const ModelStatusSelector = ({
  model,
  onStatusChange,
  disabled = false,
}: ModelStatusSelectorProps) => (
  <Select
    id={`model-status-${model.base_name}`}
    value={model.status}
    options={STATUS_OPTIONS}
    itemTemplate={renderStatusOption}
    onChangeValue={(value) => {
      if (value && value !== model.status) onStatusChange(model, value as ModelStatus)
    }}
    disabled={disabled}
    valueTemplate={<ModelStatusBadge status={model.status} />}
    className="border-transparent bg-transparent !px-1.5 hover:border-border-primary"
  />
)

export default ModelStatusSelector
