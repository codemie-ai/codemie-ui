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

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, it, expect, vi } from 'vitest'

import { ColumnDefinition, DefinitionTypes } from '@/types/table'

import Table from '../Table'

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
