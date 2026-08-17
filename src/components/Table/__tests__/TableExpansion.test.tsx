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
import { useCallback, useState } from 'react'
import { describe, it, expect, vi } from 'vitest'

import { ColumnDefinition, DefinitionTypes } from '@/types/table'

import Table from '../Table'

interface Row {
  id: string
  name: string
}

const items: Row[] = [
  { id: 'u-1', name: 'Jane' },
  { id: 'u-2', name: 'John' },
]

const columnDefinitions: ColumnDefinition[] = [
  { key: 'name', label: 'Name', type: DefinitionTypes.String },
]

// Hoisted to module scope so the reference is stable across Harness re-renders.
// `renderExpandedRow` is compared by reference in propsAreEqual — an inline arrow
// would change identity every render and short-circuit the comparator before it
// ever looks at `expandedRowIds`, making the regression guards below vacuous.
const renderNamedDetail = (item: Row) => <div>detail for {item.name}</div>
const renderDetailTestId = () => <div data-testid="detail">detail</div>

describe('Table row expansion', () => {
  it('renders a chevron button per row when onToggleExpand is provided', () => {
    render(
      <Table
        idPath="id"
        items={items}
        columnDefinitions={columnDefinitions}
        expandedRowIds={[]}
        onToggleExpand={vi.fn()}
        renderExpandedRow={() => <div>detail</div>}
      />
    )

    expect(screen.getAllByRole('button', { name: /expand row/i })).toHaveLength(2)
    expect(screen.queryByText('detail')).not.toBeInTheDocument()
  })

  it('calls onToggleExpand with the row id when the chevron is clicked', async () => {
    const user = userEvent.setup()
    const onToggleExpand = vi.fn()

    render(
      <Table
        idPath="id"
        items={items}
        columnDefinitions={columnDefinitions}
        expandedRowIds={[]}
        onToggleExpand={onToggleExpand}
        renderExpandedRow={() => <div>detail</div>}
      />
    )

    await user.click(screen.getAllByRole('button', { name: /expand row/i })[0])

    expect(onToggleExpand).toHaveBeenCalledWith('u-1')
  })

  // REGRESSION GUARD for the memoized propsAreEqual comparator.
  // Only `expandedRowIds` changes between renders here. If propsAreEqual does not
  // compare it, memo blocks the re-render and the detail row never appears —
  // which is exactly how this feature breaks in production.
  it('re-renders when only expandedRowIds changes', async () => {
    const user = userEvent.setup()

    const Harness = () => {
      const [expanded, setExpanded] = useState<string[]>([])
      // Stable identity: only `expandedRowIds` may change between renders.
      const onToggleExpand = useCallback((id: string) => {
        setExpanded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
      }, [])
      return (
        <Table
          idPath="id"
          items={items}
          columnDefinitions={columnDefinitions}
          expandedRowIds={expanded}
          onToggleExpand={onToggleExpand}
          renderExpandedRow={renderNamedDetail}
        />
      )
    }

    render(<Harness />)
    expect(screen.queryByText('detail for Jane')).not.toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: /expand row/i })[0])
    expect(screen.getByText('detail for Jane')).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: /collapse row/i })[0])
    expect(screen.queryByText('detail for Jane')).not.toBeInTheDocument()
  })

  it('spans the expansion cell across every column', async () => {
    const user = userEvent.setup()
    const wideColumns: ColumnDefinition[] = [
      { key: 'name', label: 'Name', type: DefinitionTypes.String },
      { key: 'id', label: 'Id', type: DefinitionTypes.String },
    ]

    const Harness = () => {
      const [expanded, setExpanded] = useState<string[]>([])
      // Stable identity: only `expandedRowIds` may change between renders.
      const onToggleExpand = useCallback((id: string) => setExpanded([id]), [])
      return (
        <Table
          idPath="id"
          items={items}
          columnDefinitions={wideColumns}
          expandedRowIds={expanded}
          onToggleExpand={onToggleExpand}
          renderExpandedRow={renderDetailTestId}
        />
      )
    }

    render(<Harness />)
    await user.click(screen.getAllByRole('button', { name: /expand row/i })[0])

    // 2 declared columns + the dedicated leading expand column.
    const cell = screen.getByTestId('detail').closest('td')
    expect(cell).toHaveAttribute('colspan', '3')
  })

  it('renders the chevron in its own dedicated leading cell', async () => {
    const user = userEvent.setup()

    render(
      <Table
        idPath="id"
        items={items}
        columnDefinitions={columnDefinitions}
        expandedRowIds={[]}
        onToggleExpand={vi.fn()}
        renderExpandedRow={renderDetailTestId}
      />
    )

    const chevron = screen.getAllByRole('button', { name: /expand row/i })[0]
    const cell = chevron.closest('td')

    expect(cell).toBeInTheDocument()
    // The chevron cell is the first cell of the row and holds nothing else.
    expect(cell).toBe(cell!.parentElement!.firstElementChild)
    expect(cell).not.toHaveTextContent('Jane')

    await user.click(chevron)
  })

  it('does not select the row when the chevron is clicked', async () => {
    const user = userEvent.setup()
    const onSelectRow = vi.fn()

    render(
      <Table
        idPath="id"
        items={items}
        columnDefinitions={columnDefinitions}
        selected={[]}
        onSelectRow={onSelectRow}
        expandedRowIds={[]}
        onToggleExpand={vi.fn()}
        renderExpandedRow={() => <div>detail</div>}
      />
    )

    await user.click(screen.getAllByRole('button', { name: /expand row/i })[0])

    expect(onSelectRow).not.toHaveBeenCalled()
  })

  it('renders no chevron when onToggleExpand is omitted', () => {
    render(<Table idPath="id" items={items} columnDefinitions={columnDefinitions} />)

    expect(screen.queryByRole('button', { name: /expand row/i })).not.toBeInTheDocument()
  })
})
