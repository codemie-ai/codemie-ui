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

import { SelectButton as PrimeSelectButton } from 'primereact/selectbutton'
import { classNames } from 'primereact/utils'
import { FC } from 'react'

export interface SelectButtonOption {
  label: string
  value: string
  icon?: React.ComponentType<{ className?: string }>
}

interface Props {
  caption?: string
  value?: string
  options?: string[] | SelectButtonOption[]
  onChange(value: string): void
}

const SelectButton: FC<Props> = ({ caption, value = '', options = [], onChange }) => {
  // Normalize options to always have the same structure
  const normalizedOptions = options.map((option) => {
    if (typeof option === 'string') {
      return { label: option, value: option }
    }
    return option
  })

  const itemTemplate = (option: SelectButtonOption) => {
    if (!option.icon) {
      return <span>{option.label}</span>
    }

    const Icon = option.icon
    return (
      <div className="flex gap-2 items-center">
        <Icon className="w-4 h-4" />
        <span>{option.label}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {caption ? <div className="text-h5 text-text-primary">{caption}</div> : null}
      <PrimeSelectButton
        pt={{
          root: {
            className: [
              'flex border border-border-specific-panel-outline rounded-lg text-h5 leading-[18px] font-semibold overflow-hidden',
              'bg-surface-base-secondary',
              'text-text-primary',
            ].join(' '),
          },
          button: ({ context }: { context: { selected: boolean } }) => ({
            className: classNames(
              'border rounded-lg transition-colors',
              'hover:text-text-accent hover:bg-surface-specific-table-header ',
              {
                'border-transparent px-4 py-1': !context.selected,
                'px-[17px] py-[5px] border-border-primary': context.selected,
              },
              context.selected && [
                'bg-surface-specific-table-header ',
                'text-text-accent',
                'border-text-accent',
              ]
            ),
          }),
        }}
        value={value}
        options={normalizedOptions}
        optionLabel="label"
        optionValue="value"
        itemTemplate={itemTemplate}
        onChange={(e) => {
          if (e.value !== null) onChange(e.value)
        }}
      />
    </div>
  )
}

export default SelectButton
