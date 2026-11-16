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

import { FC, useMemo } from 'react'

import CrossIcon from '@/assets/icons/cross.svg?react'
import SearchIcon from '@/assets/icons/search.svg?react'
import Button from '@/components/Button'
import { Checkbox } from '@/components/form/Checkbox'
import Input from '@/components/form/Input/Input'
import MultiSelect from '@/components/form/MultiSelect'
import Select from '@/components/form/Select/Select'
import { FilterOption } from '@/types/filters'
import { PROVIDER_LABELS } from '@/utils/modelCatalog'

import {
  MODELS_FILTERS_INITIAL_STATE,
  ModelsFilters,
  hasActiveModelsFilters,
} from '../utils/modelsFilters'

const ALL = 'all'

const STATUS_OPTIONS = [
  { label: 'Enabled', value: 'enabled' },
  { label: 'Disabled', value: 'disabled' },
  { label: 'Deprecated', value: 'deprecated' },
]

interface ModelsManagementFiltersProps {
  filters: ModelsFilters
  providers: string[]
  onChange: (filters: ModelsFilters) => void
}

const ModelsManagementFilters: FC<ModelsManagementFiltersProps> = ({
  filters,
  providers,
  onChange,
}) => {
  const providerOptions = useMemo<FilterOption[]>(
    () => [
      { label: 'All providers', value: ALL },
      ...providers.map((p) => ({ label: PROVIDER_LABELS[p] ?? p, value: p })),
    ],
    [providers]
  )

  const update = (patch: Partial<ModelsFilters>) => onChange({ ...filters, ...patch })

  return (
    <div className="flex items-end gap-4 flex-wrap">
      <div className="w-60">
        <Input
          label="Search"
          placeholder="Search models"
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          leftIcon={<SearchIcon className="w-4 h-4 text-text-tertiary" />}
          className="w-full"
        />
      </div>

      <div className="w-48">
        <Select
          label="Provider"
          options={providerOptions}
          value={filters.provider ?? ALL}
          onChangeValue={(value) =>
            update({ provider: !value || value === ALL ? null : String(value) })
          }
        />
      </div>

      <div className="w-40">
        <MultiSelect
          label="Status"
          placeholder="All statuses"
          options={STATUS_OPTIONS}
          value={filters.statuses}
          onChange={(e) => update({ statuses: e.value ?? [] })}
          showCheckbox
        />
      </div>

      <div className="flex items-center h-8">
        <Checkbox
          label="Premium only"
          checked={filters.premiumOnly}
          onChange={(premiumOnly) => update({ premiumOnly })}
        />
      </div>

      {hasActiveModelsFilters(filters) && (
        <Button
          onClick={() => onChange(MODELS_FILTERS_INITIAL_STATE)}
          variant="tertiary"
          className="gap-[5px] h-8"
        >
          <CrossIcon className="w-3.5 h-3.5" /> Clear All
        </Button>
      )}
    </div>
  )
}

export default ModelsManagementFilters
