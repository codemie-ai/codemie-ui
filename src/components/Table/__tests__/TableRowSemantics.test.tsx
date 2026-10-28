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
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import Table from '@/components/Table'
import { ColumnDefinition, DefinitionTypes } from '@/types/table'

/**
 * F-65. A selectable `<tr>` used to declare `role="button"`, which REPLACES
 * the implicit `row` role: the element stops being a row, the `<table>` stops
 * being a table to assistive technology, and `getByRole('row')` finds nothing
 * — app-wide, on every table in the product. Selection state was reported as
 * `aria-pressed`, which belongs to a toggle button, not to a row.
 *
 * The fix keeps the keyboard behaviour (rows that act on selection must be
 * reachable by Tab and activatable with Enter/Space) and reports selection as
 * `aria-selected`, which is what a row uses.
 */
interface Row extends Record<string, unknown> {
  id: string
  name: string
}

const COLUMNS: ColumnDefinition[] = [
  { key: 'select', type: DefinitionTypes.Selection },
  { key: 'name', label: 'Name', type: DefinitionTypes.String },
]

const ITEMS: Row[] = [
  { id: 'a', name: 'Alpha' },
  { id: 'b', name: 'Beta' },
]

const renderTable = (selected: Row[] = [], onSelectRow = vi.fn()) => {
  render(
    <Table<Row>
      idPath="id"
      items={ITEMS}
      columnDefinitions={COLUMNS}
      selected={selected}
      onSelectRow={onSelectRow}
      rowTestIdPrefix="probe-row"
    />
  )
  return onSelectRow
}

describe('Table row semantics', () => {
  it('keeps selectable rows as rows inside a table', () => {
    renderTable()

    expect(screen.getByRole('table')).toBeInTheDocument()
    // header row + two body rows
    expect(screen.getAllByRole('row')).toHaveLength(3)
    const row = screen.getByTestId('probe-row-a')
    expect(row).not.toHaveAttribute('role')
    expect(row).not.toHaveAttribute('aria-pressed')
  })

  it('reports selection as aria-selected, not aria-pressed', () => {
    renderTable([ITEMS[0]])

    expect(screen.getByTestId('probe-row-a')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('probe-row-b')).toHaveAttribute('aria-selected', 'false')
  })

  it('is still keyboard-activatable', async () => {
    const onSelectRow = renderTable()

    const row = screen.getByTestId('probe-row-a')
    expect(row).toHaveAttribute('tabindex', '0')
    row.focus()
    await userEvent.keyboard('{Enter}')

    expect(onSelectRow).toHaveBeenCalledWith([ITEMS[0]])
  })
})
