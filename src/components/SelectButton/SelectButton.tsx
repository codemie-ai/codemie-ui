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
  disabled?: boolean
  /** Shown as a tooltip, typically to explain why the option is disabled. */
  tooltip?: string
}

interface Props {
  caption?: string
  value?: string
  options?: string[] | SelectButtonOption[]
  disabled?: boolean
  /** Id of an external element (e.g. a field label) that names this group for assistive tech. */
  ariaLabelledBy?: string
  onChange(value: string): void
}

const SelectButton: FC<Props> = ({
  caption,
  value = '',
  options = [],
  disabled = false,
  ariaLabelledBy,
  onChange,
}) => {
  // Normalize options to always have the same structure
  const normalizedOptions = options.map((option) => {
    if (typeof option === 'string') {
      return { label: option, value: option }
    }
    return option
  })

  const itemTemplate = (option: SelectButtonOption) => {
    const tooltipProps: Record<string, string> =
      option.disabled && option.tooltip
        ? {
            'data-tooltip-id': 'react-tooltip',
            'data-tooltip-content': option.tooltip,
          }
        : {}

    // The disabled button blocks pointer events; the tooltip target must still receive them.
    const tooltipClass = tooltipProps['data-tooltip-id'] ? 'pointer-events-auto' : undefined

    // The tooltip itself only shows on hover, and the disabled button is skipped by Tab, so a
    // keyboard or screen reader user never sees it. A visually hidden copy rides along with the
    // option's accessible name instead.
    const srReason =
      option.disabled && option.tooltip ? <span className="sr-only">{option.tooltip}</span> : null

    if (!option.icon) {
      return (
        <span {...tooltipProps} className={tooltipClass}>
          {option.label}
          {srReason}
        </span>
      )
    }

    const Icon = option.icon
    return (
      <div className={classNames('flex gap-2 items-center', tooltipClass)} {...tooltipProps}>
        <Icon className="w-4 h-4" />
        <span>{option.label}</span>
        {srReason}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {caption ? (
        // Headers have no room for the caption on small screens; screen readers keep it.
        <div className="text-h5 text-text-primary max-lg:sr-only">{caption}</div>
      ) : null}
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
              '[&.p-disabled]:opacity-60 [&.p-disabled]:cursor-not-allowed [&.p-disabled]:hover:bg-transparent',
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
        optionDisabled="disabled"
        disabled={disabled}
        ariaLabelledBy={ariaLabelledBy}
        itemTemplate={itemTemplate}
        onChange={(e) => {
          if (e.value !== null) onChange(e.value)
        }}
      />
    </div>
  )
}

export default SelectButton
