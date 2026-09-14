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
import { describe, expect, it, vi } from 'vitest'

import { FILTER_INITIAL_STATE } from '@/constants/assistants'

import AssistantFilters from '../AssistantFilters'

vi.mock('@/store/assistants', () => ({
  assistantsStore: { assistantCategories: [] },
}))
vi.mock('@/store/user', () => ({
  userStore: { loadAssistantsUsers: vi.fn().mockResolvedValue([]) },
}))
vi.mock('@/hooks/useProjectOptions', () => ({
  useProjectOptions: () => ({ projectOptions: [], loadProjectOptions: vi.fn() }),
}))
vi.mock('@/hooks/useResolvedProjectOptions', () => ({
  useResolvedProjectOptions: () => [],
}))
vi.mock('@/hooks/useDebounceApply', () => ({
  useDebouncedApply: vi.fn(),
}))

const defaultFilters = { ...FILTER_INITIAL_STATE }

describe('AssistantFilters — Clear all visibility', () => {
  it('does NOT show "Clear all" when all user-visible filters are at their default state', () => {
    render(
      <AssistantFilters
        filters={defaultFilters}
        onFilterChange={vi.fn()}
        activeScope="visible_to_user"
      />
    )
    expect(screen.queryByText(/clear all/i)).not.toBeInTheDocument()
  })

  it('shows "Clear all" when the search filter is non-empty', () => {
    render(
      <AssistantFilters
        filters={{ ...defaultFilters, search: 'my assistant' }}
        onFilterChange={vi.fn()}
        activeScope="visible_to_user"
      />
    )
    expect(screen.getByText(/clear all/i)).toBeInTheDocument()
  })

  it('shows "Clear all" when a project filter is selected', () => {
    render(
      <AssistantFilters
        filters={{ ...defaultFilters, project: ['proj-1'] }}
        onFilterChange={vi.fn()}
        activeScope="visible_to_user"
      />
    )
    expect(screen.getByText(/clear all/i)).toBeInTheDocument()
  })

  it('hides "Clear all" again after all user-visible filters are cleared', () => {
    render(
      <AssistantFilters
        filters={{
          ...defaultFilters,
          search: '',
          project: [],
          categories: [],
          created_by: '',
          shared: null,
          is_global: null,
        }}
        onFilterChange={vi.fn()}
        activeScope="visible_to_user"
      />
    )
    expect(screen.queryByText(/clear all/i)).not.toBeInTheDocument()
  })
})
