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

import CrossIcon from '@/assets/icons/cross.svg?react'
import MultiSelect from '@/components/form/MultiSelect'
import { MultiSelectProps } from '@/components/form/MultiSelect/MultiSelect'

export type FilterMultiSelectProps = Omit<MultiSelectProps, 'value' | 'onChange'> & {
  value: string[]
  onChange: (value: string[]) => void
}

/** Checkbox multiselect with an inline clear button, shared by every list-page filter. */
const FilterMultiSelect: React.FC<FilterMultiSelectProps> = ({
  value,
  onChange,
  label,
  id,
  ...rest
}) => (
  <div className="flex flex-col gap-2 w-full">
    {label && (
      <label htmlFor={id} className="text-xs text-text-quaternary">
        {label}
      </label>
    )}
    <div className="relative w-full">
      <MultiSelect
        showCheckbox
        className="w-full h-[35px] tracking-normal"
        scrollHeight="200px"
        {...rest}
        id={id}
        label={label}
        hideLabel
        value={value}
        onChange={(event) => onChange((event.value as string[] | undefined) ?? [])}
      />
      {value.length > 0 && (
        <div className="multiselect-clear !top-4 !right-[29px] -translate-y-1/2">
          <CrossIcon className="w-3.5 h-3.5" onClick={() => onChange([])} />
        </div>
      )}
    </div>
  </div>
)

export default FilterMultiSelect
