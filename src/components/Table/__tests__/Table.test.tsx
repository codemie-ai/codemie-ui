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

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'

import { mockMobileLayout } from '@/test-utils/mobileLayout'
import { ColumnDefinition, DefinitionTypes } from '@/types/table'

import Table from '../Table'

describe('Table isModalFooter pagination positioning', () => {
  const pagination = { page: 0, totalPages: 2, perPage: 10 }

  it('renders pagination in normal flow (shrink-0, not fixed/sticky) when isModalFooter is true', () => {
    render(<Table items={[]} columnDefinitions={[]} pagination={pagination} isModalFooter />)
    // The root wrapper must not reserve bottom padding for a fixed footer
    const root = document.querySelector('.flex.flex-col.w-full')
    expect(root).toBeInTheDocument()
    expect(root).not.toHaveClass('pb-20')
    // Pagination must not be fixed or sticky — it sits in normal document flow
    expect(document.querySelector('.fixed.bottom-0')).not.toBeInTheDocument()
    expect(document.querySelector('.sticky.bottom-0')).not.toBeInTheDocument()
    // The pagination element is rendered as a shrink-0 child of the flex root
    const paginationEl = document.querySelector('[data-testid="pagination"], .shrink-0')
    expect(paginationEl).toBeInTheDocument()
  })

  it('uses fixed positioning when isModalFooter is false (default)', () => {
    render(<Table items={[]} columnDefinitions={[]} pagination={pagination} />)
    const paginationRoot = document.querySelector('.fixed.bottom-0')
    expect(paginationRoot).toBeInTheDocument()
    expect(document.querySelector('.sticky.bottom-0')).not.toBeInTheDocument()
  })

  it('root wrapper has flex-1 min-h-0 for bounded height when isModalFooter is true', () => {
    render(<Table items={[]} columnDefinitions={[]} pagination={pagination} isModalFooter />)
    const root = document.querySelector('.flex.flex-col.w-full')
    expect(root).toBeInTheDocument()
    expect(root).toHaveClass('flex-1')
    expect(root).toHaveClass('min-h-0')
  })

  it('scroll container has min-h-0 overflow-auto for bounded scrolling when isModalFooter is true', () => {
    render(<Table items={[]} columnDefinitions={[]} pagination={pagination} isModalFooter />)
    // The scroll container must be flex-1 min-h-0 overflow-auto (not a fixed min-h-[300px])
    const scrollContainer = document.querySelector('.overflow-auto.min-h-0')
    expect(scrollContainer).toBeInTheDocument()
    // Must NOT have the fixed min-height that would prevent bounded scrolling
    expect(scrollContainer).not.toHaveClass('min-h-[300px]')
  })
})

describe('Table aria-label', () => {
  it('sets aria-label on the table when ariaLabel is provided', () => {
    render(<Table items={[]} columnDefinitions={[]} ariaLabel="Widgets" />)
    expect(screen.getByRole('table', { name: 'Widgets' })).toBeInTheDocument()
  })

  it('renders no aria-label when ariaLabel is omitted', () => {
    render(<Table items={[]} columnDefinitions={[]} />)
    expect(screen.getByRole('table')).not.toHaveAttribute('aria-label')
  })
})

describe('Table row click', () => {
  interface Row {
    id: string
    name: string
    sessions: string
  }

  const rows: Row[] = [
    { id: 'r-1', name: 'Jane', sessions: '3' },
    { id: 'r-2', name: 'John', sessions: '5' },
  ]
  const columns: ColumnDefinition[] = [
    { key: 'name', label: 'User', type: DefinitionTypes.Custom },
    { key: 'sessions', label: 'Sessions', type: DefinitionTypes.String },
  ]
  const nameSpy = vi.fn()
  const customRenderColumns = {
    name: (item: Row) => (
      <button type="button" onClick={() => nameSpy(item.id)}>
        {item.name}
      </button>
    ),
  }

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    nameSpy.mockClear()
  })

  it('opens a row from a click anywhere in it', async () => {
    const onRowClick = vi.fn()
    render(
      <Table
        idPath="id"
        items={rows}
        columnDefinitions={columns}
        customRenderColumns={customRenderColumns}
        onRowClick={onRowClick}
      />
    )

    await userEvent.click(screen.getByText('5'))

    expect(onRowClick).toHaveBeenCalledExactlyOnceWith(rows[1])
    expect(screen.getByText('5').closest('tr')).toHaveClass('cursor-pointer')
  })

  it('leaves the controls in a row their own click', async () => {
    const onRowClick = vi.fn()
    render(
      <Table
        idPath="id"
        items={rows}
        columnDefinitions={columns}
        customRenderColumns={customRenderColumns}
        onRowClick={onRowClick}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Jane' }))

    expect(nameSpy).toHaveBeenCalledWith('r-1')
    expect(onRowClick).not.toHaveBeenCalled()
  })

  it('does not open a row while text in it is being selected', async () => {
    const onRowClick = vi.fn()
    vi.spyOn(window, 'getSelection').mockReturnValue({ toString: () => 'Jane' } as Selection)
    render(
      <Table
        idPath="id"
        items={rows}
        columnDefinitions={columns}
        customRenderColumns={customRenderColumns}
        onRowClick={onRowClick}
      />
    )

    await userEvent.click(screen.getByText('3'))

    expect(onRowClick).not.toHaveBeenCalled()
  })

  it('keeps rows plain without a handler', () => {
    render(
      <Table
        idPath="id"
        items={rows}
        columnDefinitions={columns}
        customRenderColumns={customRenderColumns}
      />
    )

    expect(screen.getByText('3').closest('tr')).not.toHaveClass('cursor-pointer')
  })
})

describe('Table alwaysShowPerPage', () => {
  const pagination = { page: 0, perPage: 10, totalPages: 1, totalCount: 3 }

  afterEach(() => cleanup())

  it('shows the per-page selector on a single page when alwaysShowPerPage is set', () => {
    render(
      <Table
        items={[]}
        columnDefinitions={[]}
        pagination={pagination}
        onPaginationChange={vi.fn()}
        alwaysShowPerPage
      />
    )
    expect(screen.getByText('Show:')).toBeInTheDocument()
  })

  it('hides the per-page selector on a single page by default', () => {
    render(
      <Table
        items={[]}
        columnDefinitions={[]}
        pagination={pagination}
        onPaginationChange={vi.fn()}
      />
    )
    expect(screen.queryByText('Show:')).not.toBeInTheDocument()
  })
})

const selectionItems = [
  { id: 'plain', name: 'Plain model' },
  { id: 'router', name: 'Router' },
]
const selectionColumns: ColumnDefinition[] = [
  { key: 'select', type: DefinitionTypes.Selection },
  { key: 'name', type: DefinitionTypes.String, label: 'Model' },
]
const canSelectPlain = (item: (typeof selectionItems)[number]) => item.id === 'plain'

describe.each([false, true])('Table row eligibility (mobile=%s)', (mobile) => {
  let restoreLayout = () => {}
  beforeEach(() => {
    restoreLayout = mockMobileLayout(mobile).restore
  })
  afterEach(() => {
    cleanup()
    restoreLayout()
  })

  it('disables the ineligible checkbox and excludes its row from Select all', () => {
    const onSelectRow = vi.fn()
    const props = {
      items: selectionItems,
      columnDefinitions: selectionColumns,
      idPath: 'id' as const,
      onSelectRow,
      isRowSelectable: canSelectPlain,
    }
    const { rerender } = render(<Table {...props} selected={[]} />)
    const router = screen.getByText('Router').closest(mobile ? 'li' : 'tr')!
    expect(within(router).getByRole('checkbox')).toBeDisabled()
    fireEvent.click(screen.getByText('Router'))
    fireEvent.click(within(router).getByRole('checkbox'))
    expect(onSelectRow).not.toHaveBeenCalled()

    fireEvent.click(screen.getAllByRole('checkbox')[0])
    expect(onSelectRow).toHaveBeenCalledWith([selectionItems[0]])
    rerender(<Table {...props} selected={[selectionItems[0]]} />)
    expect(screen.getAllByRole('checkbox')[0]).toBeChecked()
    fireEvent.click(screen.getAllByRole('checkbox')[0])
    expect(onSelectRow).toHaveBeenLastCalledWith([])
  })

  it('disables Select all when every row is ineligible', () => {
    render(
      <Table
        items={[selectionItems[1]]}
        columnDefinitions={selectionColumns}
        idPath="id"
        selected={[]}
        onSelectRow={vi.fn()}
        isRowSelectable={canSelectPlain}
      />
    )
    for (const checkbox of screen.getAllByRole('checkbox')) {
      expect(checkbox).toBeDisabled()
    }
  })

  it('re-renders eligibility when the predicate changes', () => {
    const onSelectRow = vi.fn()
    const props = {
      items: selectionItems,
      columnDefinitions: selectionColumns,
      idPath: 'id' as const,
      onSelectRow,
    }
    const { rerender } = render(<Table {...props} isRowSelectable={canSelectPlain} />)
    rerender(<Table {...props} isRowSelectable={() => true} />)
    expect(
      screen.getAllByRole('checkbox').every((checkbox) => !checkbox.hasAttribute('disabled'))
    ).toBe(true)
    fireEvent.click(screen.getAllByRole('checkbox')[0])
    expect(onSelectRow).toHaveBeenCalledWith(selectionItems)
  })
})

describe('Table row highlight', () => {
  const columns: ColumnDefinition[] = [{ key: 'name', label: 'Name', type: DefinitionTypes.String }]
  const rows = [
    { id: 'a', name: 'Alpha' },
    { id: 'b', name: 'Beta' },
  ]

  it('marks only the rows the predicate selects with data-highlighted', () => {
    render(
      <Table
        items={rows}
        columnDefinitions={columns}
        idPath="id"
        rowTestIdPrefix="row"
        isRowHighlighted={(item) => item.id === 'b'}
      />
    )

    expect(screen.getByTestId('row-b')).toHaveAttribute('data-highlighted', 'true')
    expect(screen.getByTestId('row-a')).not.toHaveAttribute('data-highlighted')
  })
})
