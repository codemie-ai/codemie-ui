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

import { classNames as cn } from 'primereact/utils'
import React from 'react'

import ChevronDownSvg from '@/assets/icons/chevron-down.svg?react'
import ChevronUpSvg from '@/assets/icons/chevron-up.svg?react'
import { ColumnDefinition, DefinitionTypes } from '@/types/table'
import { parseDate } from '@/utils/helpers'
import { createdBy, truncateInput } from '@/utils/utils'

import { Checkbox } from '../form/Checkbox'

interface TableCellProps<T = Record<string, unknown>> {
  index: number
  value: T
  definition: ColumnDefinition
  isLastRow?: boolean
  hasFooter?: boolean
  colIndex: number
  columnsLength: number
  customRender?: (item: T, i: number) => React.ReactNode
  shrink?: boolean
  noWrap?: boolean
  isSelected?: boolean
  onSelect?: () => void
  isExpanded?: boolean
  onToggleExpand?: () => void
}

const ExpandToggle = ({
  isExpanded,
  onToggleExpand,
}: {
  isExpanded: boolean
  onToggleExpand?: () => void
}) => (
  <button
    type="button"
    aria-expanded={isExpanded}
    aria-label={`${isExpanded ? 'Collapse' : 'Expand'} row`}
    className="flex shrink-0 items-center text-text-quaternary hover:text-text-primary h-7 ml-auto min-w-7 rounded-lg justify-center hover:bg-surface-specific-secondary-button-hover"
    onClick={onToggleExpand}
  >
    {isExpanded ? <ChevronUpSvg className="w-3 h-3" /> : <ChevronDownSvg className="w-3 h-3" />}
  </button>
)

const DateContent = ({ rawDate }: { rawDate: string | null | undefined }): React.ReactNode => {
  if (!rawDate) return <span>-</span>

  const date = parseDate(rawDate)

  return (
    <span className="flex min-w-0 flex-col">
      <span>{date.toLocaleString()}</span>
      <span className="text-text-quaternary">
        {date.toLocaleString({ hour: 'numeric', minute: '2-digit', second: '2-digit' })}
      </span>
    </span>
  )
}

const TableCell = <T,>({
  index,
  definition,
  value,
  isLastRow = false,
  hasFooter = false,
  colIndex,
  columnsLength,
  customRender,
  shrink = false,
  noWrap = false,
  isSelected,
  onSelect,
  isExpanded = false,
  onToggleExpand,
}: TableCellProps<T>): React.ReactNode => {
  let content: React.ReactNode = null

  const getTooltipValue = (value: unknown, maxLength?: number) => {
    if (truncateInput(value as string, maxLength!) !== value) {
      return value
    }
    return ''
  }

  const isSelectionCell = definition.type === DefinitionTypes.Selection
  const isExpandCell = definition.type === DefinitionTypes.Expand

  if (isExpandCell) {
    content = <ExpandToggle isExpanded={isExpanded} onToggleExpand={onToggleExpand} />
  } else if (definition.type === DefinitionTypes.Date) {
    content = <DateContent rawDate={value[definition.key] as string | null | undefined} />
  } else if (definition.type === DefinitionTypes.User) {
    content = <span>{createdBy(value[definition.key]) || '-'}</span>
  } else if (definition.type === DefinitionTypes.Boolean) {
    content = (
      <span>
        {typeof value[definition.key] === 'boolean' && value[definition.key] === true
          ? 'Yes'
          : 'No'}
      </span>
    )
  } else if (isSelectionCell) {
    content = (
      <div data-selection-checkbox="true">
        <Checkbox checked={isSelected} onChange={onSelect ?? (() => {})} />
      </div>
    )
  } else if (definition.type === DefinitionTypes.Custom && customRender) {
    content = customRender(value, index)
  } else {
    const tooltipValue = getTooltipValue(value[definition.key], definition.maxLength)
    content = (
      <span title={tooltipValue as string}>
        {truncateInput(value[definition.key], definition.maxLength!)}
      </span>
    )
  }

  const isSemiBold = definition.semiBold === true

  return (
    <td
      className={cn(
        'text-text-primary text-left bg-surface-base-secondary border-b border-border-structural',
        'px-4 py-2',
        {
          'border-l': colIndex === 0,
          'border-r': colIndex === columnsLength - 1,
          'rounded-bl-lg': isLastRow && !hasFooter && colIndex === 0,
          'rounded-br-lg': isLastRow && !hasFooter && colIndex === columnsLength - 1,
          'font-bold': isSemiBold,
          'min-w-[120px] break-all': shrink,
          'whitespace-nowrap': noWrap,
          'pr-0.5': isSelectionCell,
          'pl-0 pr-0': isExpandCell,
        }
      )}
    >
      {content}
    </td>
  )
}

export default TableCell
