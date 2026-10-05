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

import React from 'react'

import Select from '@/components/form/Select'
import {
  WORK_ITEM_PRIORITY_OPTIONS,
  WORK_ITEM_STATUS_OPTIONS,
  WORK_ITEM_TYPE_OPTIONS,
} from '@/constants/workItems'
import { WorkItemFilters } from '@/types/entity/workItem'

const ALL_OPTION = { label: 'All', value: '' }

const TYPE_OPTIONS = [ALL_OPTION, ...WORK_ITEM_TYPE_OPTIONS]
const PRIORITY_OPTIONS = [ALL_OPTION, ...WORK_ITEM_PRIORITY_OPTIONS]
const STATUS_OPTIONS = [ALL_OPTION, ...WORK_ITEM_STATUS_OPTIONS]

interface WorkItemFiltersProps {
  filters: WorkItemFilters
  onChange: (updated: Partial<WorkItemFilters>) => void
}

const WorkItemFiltersComponent: React.FC<WorkItemFiltersProps> = ({ filters, onChange }) => {
  return (
    <div className="flex flex-col gap-3 p-4">
      <Select
        label="Type"
        value={filters.type ?? ''}
        onChangeValue={(val) => onChange({ type: (val ?? '') as WorkItemFilters['type'] })}
        options={TYPE_OPTIONS}
      />
      <Select
        label="Priority"
        value={filters.priority ?? ''}
        onChangeValue={(val) => onChange({ priority: (val ?? '') as WorkItemFilters['priority'] })}
        options={PRIORITY_OPTIONS}
      />
      <Select
        label="Status"
        value={filters.status ?? ''}
        onChangeValue={(val) => onChange({ status: (val ?? '') as WorkItemFilters['status'] })}
        options={STATUS_OPTIONS}
      />
    </div>
  )
}

export default WorkItemFiltersComponent
