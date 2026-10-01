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

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { mockMobileLayout } from '@/test-utils/mobileLayout'
import { ColumnDefinition, DefinitionTypes } from '@/types/table'

import Table from '../Table'

interface Row {
  id: string
  name: string
  sessions: string
}

const items: Row[] = [
  { id: 'r-1', name: 'Jane', sessions: '3' },
  { id: 'r-2', name: 'John', sessions: '5' },
]

const actionSpy = vi.fn()
const customRenderColumns = {
  actions: (item: Row) => (
    <button type="button" onClick={() => actionSpy(item.id)}>
      More for {item.name}
    </button>
  ),
}

const drillDownColumns: ColumnDefinition[] = [
  { key: 'name', label: 'User', type: DefinitionTypes.String },
  { key: 'sessions', label: 'Sessions', type: DefinitionTypes.String, sortable: true },
  { key: 'actions', label: 'Actions', type: DefinitionTypes.Custom },
]

const selectionColumns: ColumnDefinition[] = [
  { key: 'select', type: DefinitionTypes.Selection },
  { key: 'name', label: 'User', type: DefinitionTypes.String },
]

// Hoisted so the reference stays stable for Table's memo comparison.
const renderDetails = (item: Row) => <div>details for {item.name}</div>

describe('Table on mobile (cards)', () => {
  let restoreLayout = () => {}

  beforeEach(() => {
    restoreLayout = mockMobileLayout().restore
  })

  afterEach(() => {
    cleanup()
    restoreLayout()
    vi.clearAllMocks()
  })

  it('renders one card per row, with the first column as the title and the rest as fields', () => {
    render(<Table idPath="id" items={items} columnDefinitions={drillDownColumns} />)

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    const cards = screen.getAllByRole('listitem')
    expect(cards).toHaveLength(2)
    expect(within(cards[0]).getByText('Jane')).toBeInTheDocument()
    expect(within(cards[0]).getByText('Sessions')).toBeInTheDocument()
    expect(within(cards[0]).getByText('3')).toBeInTheDocument()
  })

  it('shows an empty state without rows', () => {
    render(<Table idPath="id" items={[]} columnDefinitions={drillDownColumns} />)

    expect(screen.getByText('No data available')).toBeInTheDocument()
  })

  it('keeps the table for totals footers, custom rows and nested tables', () => {
    const { unmount } = render(
      <Table
        idPath="id"
        items={items}
        columnDefinitions={drillDownColumns}
        footer={
          <tr>
            <td>Total</td>
          </tr>
        }
      />
    )
    expect(screen.getByRole('table')).toBeInTheDocument()
    unmount()

    const customRow = {
      id: 'r-3',
      name: 'Custom',
      sessions: '0',
      _meta: {
        customRender: () => (
          <tr key="custom">
            <td>custom row</td>
          </tr>
        ),
      },
    }
    const { unmount: unmountCustom } = render(
      <Table idPath="id" items={[...items, customRow]} columnDefinitions={drillDownColumns} />
    )
    expect(screen.getByRole('table')).toBeInTheDocument()
    unmountCustom()

    render(
      <Table idPath="id" items={items} columnDefinitions={drillDownColumns} variant="nested" />
    )
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('selects a drill-down row from the whole card, by tap or keyboard', async () => {
    const user = userEvent.setup()
    const onSelectRow = vi.fn()
    render(
      <Table
        idPath="id"
        items={items}
        columnDefinitions={drillDownColumns}
        customRenderColumns={customRenderColumns}
        selected={[items[1]]}
        onSelectRow={onSelectRow}
      />
    )

    const janeCard = screen.getByRole('button', { name: 'Jane', pressed: false })
    expect(screen.getByRole('button', { name: 'John', pressed: true })).toBeInTheDocument()

    await user.click(janeCard)
    expect(onSelectRow).toHaveBeenCalledWith([items[1], items[0]])

    onSelectRow.mockClear()
    janeCard.focus()
    await user.keyboard('{Enter}')
    expect(onSelectRow).toHaveBeenCalledWith([items[1], items[0]])
  })

  it('keeps the controls inside a card separate from selecting it', async () => {
    const user = userEvent.setup()
    const onSelectRow = vi.fn()
    render(
      <Table
        idPath="id"
        items={items}
        columnDefinitions={drillDownColumns}
        customRenderColumns={customRenderColumns}
        selected={[]}
        onSelectRow={onSelectRow}
      />
    )

    await user.click(screen.getByRole('button', { name: 'More for John' }))

    expect(actionSpy).toHaveBeenCalledWith('r-2')
    expect(onSelectRow).not.toHaveBeenCalled()
  })

  it('selects through the checkbox when the table has a selection column', async () => {
    const user = userEvent.setup()
    const onSelectRow = vi.fn()
    render(
      <Table
        idPath="id"
        items={items}
        columnDefinitions={selectionColumns}
        selected={[]}
        onSelectRow={onSelectRow}
      />
    )

    expect(screen.queryByRole('button', { name: 'Jane' })).not.toBeInTheDocument()
    await user.click(within(screen.getAllByRole('listitem')[0]).getByRole('checkbox'))

    expect(onSelectRow).toHaveBeenCalledWith([items[0]])
  })

  it('selects every card on the page from the toolbar', async () => {
    const user = userEvent.setup()
    const onSelectRow = vi.fn()
    render(
      <Table
        idPath="id"
        items={items}
        columnDefinitions={selectionColumns}
        selected={[]}
        onSelectRow={onSelectRow}
      />
    )

    await user.click(screen.getByRole('checkbox', { name: 'Select all' }))

    expect(onSelectRow).toHaveBeenCalledWith(items)
  })

  it('asks for all rows across pages when selection is lazy', async () => {
    const user = userEvent.setup()
    const onSelectAllChange = vi.fn()
    render(
      <Table
        idPath="id"
        items={items}
        columnDefinitions={selectionColumns}
        selected={[]}
        onSelectRow={vi.fn()}
        onSelectAllChange={onSelectAllChange}
        pagination={{ page: 0, totalPages: 3, perPage: 2, totalCount: 6 }}
        embedded
      />
    )

    await user.click(screen.getByRole('checkbox', { name: 'Select all' }))

    expect(onSelectAllChange).toHaveBeenCalledWith(true)
  })

  it('sorts from the toolbar', async () => {
    const user = userEvent.setup()
    const onSort = vi.fn()
    render(
      <Table
        idPath="id"
        items={items}
        columnDefinitions={drillDownColumns}
        sort={{ sortKey: 'sessions', sortOrder: 'desc' }}
        onSort={onSort}
      />
    )

    expect(screen.getByText('Sort by')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Sessions' }))

    expect(onSort).toHaveBeenCalledWith('sessions')
  })

  it('expands a card and shows its details', async () => {
    const user = userEvent.setup()
    const onToggleExpand = vi.fn()
    const { rerender } = render(
      <Table
        idPath="id"
        items={items}
        columnDefinitions={drillDownColumns}
        expandedRowIds={[]}
        onToggleExpand={onToggleExpand}
        renderExpandedRow={renderDetails}
      />
    )

    await user.click(screen.getAllByRole('button', { name: /expand row/i })[0])
    expect(onToggleExpand).toHaveBeenCalledWith('r-1')

    rerender(
      <Table
        idPath="id"
        items={items}
        columnDefinitions={drillDownColumns}
        expandedRowIds={['r-1']}
        onToggleExpand={onToggleExpand}
        renderExpandedRow={renderDetails}
      />
    )
    expect(screen.getByText('details for Jane')).toBeInTheDocument()
    expect(screen.queryByText('details for John')).not.toBeInTheDocument()
  })
})
