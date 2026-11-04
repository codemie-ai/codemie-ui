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

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import UsersManagementFilters from '@/pages/settings/administration/usersManagement/components/UsersManagementFilters'
import {
  FILTER_INITIAL_STATE,
  UsersManagementFilters as Filters,
} from '@/pages/settings/administration/usersManagement/constants'

vi.mock('@/hooks/useFeatureFlags', () => ({ useBudgetManagementEnabled: () => [false] }))
vi.mock('@/components/ProjectSelector/ProjectSelector', () => ({ default: () => null }))
vi.mock('@/components/BudgetSelector', () => ({ default: () => null }))
vi.mock('@/components/form/Select/Select', () => ({
  default: ({ label, options, value, onChange }: any) => (
    <select
      aria-label={label}
      value={String(value)}
      onChange={(e) =>
        onChange({ value: options.find((o) => String(o.value) === e.target.value).value })
      }
    >
      {options.map((o: any) => (
        <option key={String(o.value)} value={String(o.value)}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}))

const renderFilters = (filters: Filters = FILTER_INITIAL_STATE) => {
  const onFilterChange = vi.fn()
  render(<UsersManagementFilters filters={filters} onFilterChange={onFilterChange} />)
  return onFilterChange
}

describe('UsersManagementFilters — status filter', () => {
  it('offers All, Active and Deactivated', () => {
    renderFilters()
    const options = Array.from(screen.getByLabelText('Status').querySelectorAll('option')).map(
      (o) => o.textContent
    )
    expect(options).toEqual(['All', 'Active', 'Deactivated'])
  })

  it('emits is_active=false when Deactivated is chosen', () => {
    const onFilterChange = renderFilters()
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'false' } })
    expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ is_active: false }))
  })

  it('emits is_active=true when Active is chosen', () => {
    const onFilterChange = renderFilters()
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'true' } })
    expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ is_active: true }))
  })

  it('emits is_active=null when All is chosen', () => {
    const onFilterChange = renderFilters({ ...FILTER_INITIAL_STATE, is_active: false })
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'all' } })
    expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ is_active: null }))
  })

  it('shows the selected status', () => {
    renderFilters({ ...FILTER_INITIAL_STATE, is_active: false })
    expect(screen.getByLabelText('Status')).toHaveValue('false')
  })

  it('shows Clear All when is_active is false and hides it when null', () => {
    const { unmount } = render(
      <UsersManagementFilters
        filters={{ ...FILTER_INITIAL_STATE, is_active: false }}
        onFilterChange={vi.fn()}
      />
    )
    expect(screen.getByText('Clear All')).toBeInTheDocument()
    unmount()
    render(<UsersManagementFilters filters={FILTER_INITIAL_STATE} onFilterChange={vi.fn()} />)
    expect(screen.queryByText('Clear All')).not.toBeInTheDocument()
  })
})
