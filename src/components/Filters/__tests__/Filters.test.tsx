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

import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import '@testing-library/jest-dom'
import { FilterDefinitionType } from '@/types/filters'

import Filters from '../Filters'

const filterDefinitions = [
  {
    name: 'cat',
    label: 'Category',
    type: FilterDefinitionType.CheckboxList,
    options: [
      { label: 'Dog', value: 'dog' },
      { label: 'Cat', value: 'cat' },
    ],
    value: [],
  },
  {
    name: 'color',
    label: 'Color',
    type: FilterDefinitionType.Multiselect,
    options: [
      { label: 'Red', value: 'red' },
      { label: 'Green', value: 'green' },
    ],
    value: [],
  },
  {
    name: 'status',
    label: 'Status',
    type: FilterDefinitionType.Select,
    options: [
      { label: 'Active', value: 'active' },
      { label: 'Inactive', value: 'inactive' },
    ],
    value: '',
  },
  {
    name: 'desc_search',
    label: 'Desc',
    type: FilterDefinitionType.Autocomplete,
    options: [{ label: 'foo', value: 'foo' }],
    value: '',
  },
  {
    name: 'type_group',
    label: 'Type',
    type: FilterDefinitionType.RadioGroup,
    options: [{ label: 'One', value: '1' }],
    value: '',
  },
]

describe('Filters', () => {
  it('renders search input with initial value and calls onApply on submit', () => {
    const onApply = vi.fn()
    render(
      <Filters
        onApply={onApply}
        filterDefinitions={filterDefinitions}
        searchKey="search"
        searchPlaceholder="Type here"
        searchValue="findme"
        areFiltersEmpty={false}
      />
    )

    expect(screen.getByTestId('validation')).toHaveValue('findme')
    fireEvent.submit(screen.getByTestId('validation').closest('form')!)
    expect(onApply).toHaveBeenCalled()
  })

  it('does not re-arm a redundant debounced apply after clearing the search box', () => {
    vi.useFakeTimers()
    try {
      const onApply = vi.fn()
      const { rerender } = render(
        <Filters
          onApply={onApply}
          filterDefinitions={filterDefinitions}
          searchKey="search"
          searchValue="findme"
          areFiltersEmpty={false}
          refreshOnValuesUpdate
        />
      )

      fireEvent.change(screen.getByTestId('validation'), { target: { value: '' } })
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      expect(onApply).toHaveBeenCalledTimes(1)
      expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ search: '' }))

      // Parent commits the applied filters and passes the new searchValue back down —
      // the same round-trip that used to flip filters.search from '' to undefined
      // (filterValuesFromProps omitted the key for a falsy searchValue) and re-armed
      // a second debounced apply ~1s later.
      rerender(
        <Filters
          onApply={onApply}
          filterDefinitions={filterDefinitions}
          searchKey="search"
          searchValue=""
          areFiltersEmpty={false}
          refreshOnValuesUpdate
        />
      )

      act(() => {
        vi.advanceTimersByTime(2000)
      })
      expect(onApply).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('renders all major filter types', () => {
    render(
      <Filters
        onApply={vi.fn()}
        filterDefinitions={filterDefinitions}
        searchKey="search"
        areFiltersEmpty={false}
      />
    )

    expect(screen.getByText('Dog')).toBeInTheDocument()
    expect(screen.getByText('One')).toBeInTheDocument()
    expect(document.querySelector('.p-dropdown')).toBeInTheDocument()
    expect(document.querySelector('.p-multiselect ')).toBeInTheDocument()
    expect(document.querySelector('.p-autocomplete-input')).toBeInTheDocument()
  })
})
