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

import { ColumnDefinition, DefinitionTypes } from '@/types/table'
import { formatDateTime } from '@/utils/helpers'
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
}: TableCellProps<T>): React.ReactNode => {
  let content: React.ReactNode = null

  const getTooltipValue = (value: unknown, maxLength?: number) => {
    if (truncateInput(value as string, maxLength!) !== value) {
      return value
    }
    return ''
  }

  const isSelectionCell = definition.type === DefinitionTypes.Selection

  if (definition.type === DefinitionTypes.Date) {
    content = <span className="whitespace-nowrap">{formatDateTime(value[definition.key])}</span>
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
        'text-text-primary px-4 py-2 text-left bg-surface-base-secondary border-b border-border-structural',
        {
          'border-l': colIndex === 0,
          'border-r': colIndex === columnsLength - 1,
          'rounded-bl-lg': isLastRow && !hasFooter && colIndex === 0,
          'rounded-br-lg': isLastRow && !hasFooter && colIndex === columnsLength - 1,
          'font-bold': isSemiBold,
          'min-w-[120px] break-all': shrink,
          'whitespace-nowrap': noWrap,
          'pr-0.5': isSelectionCell,
        }
      )}
    >
      {content}
    </td>
  )
}

export default TableCell
