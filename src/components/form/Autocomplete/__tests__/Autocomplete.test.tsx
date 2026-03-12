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

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { FilterOption } from '@/types/filters'

import Autocomplete, { AutocompleteProps } from '../Autocomplete'

const mockOnChange = vi.fn()
const mockOnSearch = vi.fn()

const mockOptions: FilterOption[] = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry' },
  { label: 'Date', value: 'date' },
]

const renderComponent = (props: Partial<AutocompleteProps> = {}) => {
  const defaultProps: AutocompleteProps = {
    options: mockOptions,
  }

  return render(<Autocomplete {...defaultProps} {...props} />)
}

let user

describe('Autocomplete', () => {
  beforeEach(() => {
    user = userEvent.setup()
    mockOnChange.mockClear()
    mockOnSearch.mockClear()
  })

  it('renders with label', () => {
    const label = 'Select a fruit'

    renderComponent({ label })

    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it('displays error message when provided', () => {
    const errorMessage = 'This field is required'
    renderComponent({ error: errorMessage })
    expect(screen.getByText(errorMessage)).toBeInTheDocument()
  })

  it('sets initial value correctly', () => {
    renderComponent({ value: 'banana' })
    const autocompleteInput = screen.getByRole('combobox') as HTMLInputElement
    expect(autocompleteInput.value).toBe('Banana')
  })

  it('filters options when typing (local filtering)', async () => {
    renderComponent()
    const autocompleteInput = screen.getByRole('combobox')

    await user.type(autocompleteInput, 'a')

    await waitFor(() => {
      expect(screen.getByText('Apple')).toBeInTheDocument()
      expect(screen.getByText('Banana')).toBeInTheDocument()
      expect(screen.queryByText('Cherry')).not.toBeInTheDocument()
    })
  })

  it('calls onSearch when external filtering is enabled', async () => {
    renderComponent({
      onSearch: mockOnSearch,
      localFilter: false,
      minSymbolsToSearch: 1,
    })

    const autocompleteInput = screen.getByRole('combobox')
    await user.type(autocompleteInput, 'ap')

    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledWith('ap')
    })
  })

  it('calls onChange when an option is selected', async () => {
    renderComponent({ onChange: mockOnChange })
    const autocompleteInput = screen.getByRole('combobox')

    await user.click(autocompleteInput)
    const cherryOption = await screen.findByText('Cherry')
    await user.click(cherryOption)

    expect(mockOnChange).toHaveBeenCalledWith('cherry')
  })

  it('resets to selected value on blur when allowNew is false', async () => {
    renderComponent({ value: 'banana', allowNew: false })
    const autocompleteInput = screen.getByRole('combobox') as HTMLInputElement

    await user.clear(autocompleteInput)
    await user.type(autocompleteInput, 'something else')
    await user.tab()

    expect(autocompleteInput.value).toBe('Banana')
  })

  it('allows custom text input when allowNew is true', async () => {
    renderComponent({ allowNew: true, onChange: mockOnChange })
    const autocompleteInput = screen.getByRole('combobox')

    await user.type(autocompleteInput, 'New Fruit')
    await user.tab()

    expect(mockOnChange).toHaveBeenCalledWith('New Fruit')
  })

  it('is disabled when disabled prop is true', () => {
    renderComponent({ disabled: true })
    const autocompleteInput = screen.getByRole('combobox')
    expect(autocompleteInput).toBeDisabled()
  })

  it('applies custom className', () => {
    const customClass = 'custom-class'
    const { container } = renderComponent({ className: customClass })

    const rootElement = container.firstChild as HTMLElement
    expect(rootElement).toHaveClass(customClass)
    expect(rootElement).toHaveClass('flex', 'flex-col')
  })
})
