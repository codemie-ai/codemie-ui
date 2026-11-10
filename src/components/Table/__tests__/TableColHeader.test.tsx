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
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ColumnDefinition, DefinitionTypes } from '@/types/table'

import TableColHeader from '../TableColHeader'

const renderHeader = (column: ColumnDefinition) =>
  render(
    <table>
      <thead>
        <tr>
          <TableColHeader
            column={column}
            isFirst={false}
            isLast={false}
            sortProps={{
              sort: { sortKey: undefined, sortOrder: undefined },
              onSort: () => undefined,
            }}
          />
        </tr>
      </thead>
    </table>
  )

describe('TableColHeader label overflow', () => {
  it('ellipsizes a sortable label while the sort icon cannot shrink', () => {
    renderHeader({ key: 'created', label: 'Created', type: DefinitionTypes.Custom, sortable: true })

    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('title', 'Created')
    expect(screen.getByText('Created')).toHaveClass('min-w-0', 'overflow-hidden', 'text-ellipsis')
    expect(button.querySelector('svg')?.closest('.shrink-0')).not.toBeNull()
  })

  it('ellipsizes a non-sortable label and keeps the full text as title', () => {
    renderHeader({ key: 'cost_center_name', label: 'Cost center', type: DefinitionTypes.Custom })

    const label = screen.getByText('Cost center')
    expect(label).toHaveClass('overflow-hidden', 'text-ellipsis')
    expect(label).toHaveAttribute('title', 'Cost center')
  })

  it.each([
    ['sortable', true],
    ['non-sortable', false],
  ])('does not force nowrap on the label of a %s headerNoWrap:false column', (_, sortable) => {
    renderHeader({
      key: 'name',
      label: 'Name',
      type: DefinitionTypes.Custom,
      sortable,
      headerNoWrap: false,
    })

    expect(screen.getByRole('columnheader')).toHaveClass('whitespace-normal', 'break-words')
    expect(screen.getByRole('columnheader')).not.toHaveClass('text-nowrap')
    expect(screen.getByText('Name').className).not.toMatch(/nowrap|truncate/)
  })
})
