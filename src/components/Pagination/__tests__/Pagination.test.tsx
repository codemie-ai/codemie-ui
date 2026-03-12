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

import { render, screen, fireEvent } from '@testing-library/react'
import { vi, expect, describe, it, beforeEach } from 'vitest'

import Pagination from '../Pagination'

vi.mock('@/assets/icons/chevron-down.svg?react', () => ({
  __esModule: true,
  default: () => <div data-testid="chevron-down-icon">ChevronDown</div>,
}))

describe('Pagination', () => {
  const mockSetPage = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls setPage with correct parameters when page number is clicked', () => {
    render(<Pagination currentPage={0} totalPages={10} setPage={mockSetPage} />)

    fireEvent.click(screen.getByText('2'))

    expect(mockSetPage).toHaveBeenCalledWith(1, undefined)
  })

  it('renders perPage selector when perPage prop is provided', () => {
    render(<Pagination currentPage={0} totalPages={10} setPage={mockSetPage} perPage={9} />)
    const perPageSelect = screen.getByRole('combobox')
    fireEvent.click(perPageSelect)

    expect(screen.getAllByText('Per Page')[0]).toBeInTheDocument()
    expect(screen.getByText(/12/i)).toBeInTheDocument()
    expect(screen.getByText(/24/i)).toBeInTheDocument()
    expect(screen.getByText(/45/i)).toBeInTheDocument()
    expect(screen.getByText(/90/i)).toBeInTheDocument()
  })

  it('calls setPage with correct parameters when perPage is changed', () => {
    render(<Pagination currentPage={0} totalPages={10} setPage={mockSetPage} perPage={12} />)

    const perPageSelect = screen.getByRole('combobox')
    fireEvent.click(perPageSelect)

    const option = screen.getByLabelText('24 items')
    fireEvent.click(option)

    expect(mockSetPage).toHaveBeenCalledWith(0, 24)
  })

  it('uses custom perPageOptions when provided', () => {
    const customOptions = [
      { value: '5', label: '5 items' },
      { value: '10', label: '10 items' },
    ]

    render(
      <Pagination
        currentPage={0}
        totalPages={10}
        setPage={mockSetPage}
        perPage={5}
        perPageOptions={customOptions}
      />
    )

    const perPageSelect = screen.getByRole('combobox')
    fireEvent.click(perPageSelect)

    expect(screen.getAllByLabelText('5 items')[0]).toBeInTheDocument()
    expect(screen.getByLabelText('10 items')).toBeInTheDocument()
  })

  it('renders ellipsis when there are many pages', () => {
    render(<Pagination currentPage={10} totalPages={30} setPage={mockSetPage} />)

    const ellipsis = screen.getAllByText('...')
    expect(ellipsis.length).toBeGreaterThan(0)
  })

  it('applies custom className when provided', () => {
    const customClassName = 'custom-pagination-class'

    render(
      <Pagination
        currentPage={0}
        totalPages={10}
        setPage={mockSetPage}
        className={customClassName}
      />
    )

    const paginationContainer = screen.getByText('1').closest('div')?.parentElement?.parentElement
    expect(paginationContainer).toHaveClass(customClassName)
  })

  it('handles invalid perPage value gracefully', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<Pagination currentPage={0} totalPages={10} setPage={mockSetPage} perPage={9} />)

    const perPageSelect = screen.getByRole('combobox')

    expect(() => {
      fireEvent.change(perPageSelect, { target: { value: 'invalid' } })
    }).not.toThrow()

    consoleErrorSpy.mockRestore()
  })

  it('handles navigation to first page when on a middle page', () => {
    render(<Pagination currentPage={15} totalPages={30} setPage={mockSetPage} />)

    fireEvent.click(screen.getByText('1'))

    expect(mockSetPage).toHaveBeenCalledWith(0, undefined)
  })

  it('handles navigation to last page when on a middle page', () => {
    render(<Pagination currentPage={15} totalPages={30} setPage={mockSetPage} />)

    fireEvent.click(screen.getByText('30'))

    expect(mockSetPage).toHaveBeenCalledWith(29, undefined)
  })
})
