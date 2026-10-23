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

import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import type { AssistantFilters as AssistantFiltersType } from '@/pages/assistants/hooks/useAssistantFilters'

import AssistantFilters from '../AssistantFilters'

// Hoist mock functions so they can be referenced in vi.mock factories
const { mockUseResolvedProjectOptions, mockUseProjectOptions } = vi.hoisted(() => ({
  mockUseResolvedProjectOptions: vi.fn().mockReturnValue([]),
  mockUseProjectOptions: vi
    .fn()
    .mockReturnValue({ projectOptions: [], loadProjectOptions: vi.fn() }),
}))

vi.mock('@/hooks/useResolvedProjectOptions', () => ({
  useResolvedProjectOptions: mockUseResolvedProjectOptions,
}))

vi.mock('@/hooks/useProjectOptions', () => ({
  useProjectOptions: mockUseProjectOptions,
}))

// Skip the debounce — we are not testing timing in unit tests
vi.mock('@/hooks/useDebounceApply', () => ({
  useDebouncedApply: vi.fn(),
}))

// Render Filters as a simple stub that exposes the project filter's onFilter via an input
vi.mock('@/components/Filters', () => ({
  default: ({ filterDefinitions }: { filterDefinitions: any[] }) => {
    const projectDef = filterDefinitions?.find((d: any) => d.name === 'project')
    return (
      <input
        data-testid="project-filter-input"
        onChange={(e) => projectDef?.config?.onFilter?.(e.target.value)}
      />
    )
  },
}))

vi.mock('@/components/UserFilter', () => ({ default: () => null }))

vi.mock('@/store/assistants', () => ({
  assistantsStore: {
    assistantCategories: [],
    getAssistantCategories: vi.fn(),
  },
}))

vi.mock('@/store/user', () => ({
  userStore: {
    loadAssistantsUsers: vi.fn().mockResolvedValue([]),
    getProjects: vi.fn().mockResolvedValue([]),
  },
}))

const baseFilters: AssistantFiltersType = {
  search: '',
  project: [],
  created_by: '',
  is_global: null,
  shared: null,
  categories: [],
  integration_type: [],
  sort_by: null,
  sort_order: 'desc',
}

const requiredProps = {
  onFilterChange: vi.fn(),
  filters: baseFilters,
  activeScope: 'visible_to_user',
}

const opt1 = { label: 'Project A', value: 'project-a' }
const opt2 = { label: 'Project B', value: 'project-b' }
const opt3 = { label: 'Project C', value: 'project-c' }

describe('AssistantFilters project filter announcement', () => {
  it('announces result count when project filter has a term and options resolve', async () => {
    // Drive the raw search results via projectOptions (after CR-003 fix, announcement uses these)
    mockUseProjectOptions.mockReturnValue({ projectOptions: [], loadProjectOptions: vi.fn() })
    mockUseResolvedProjectOptions.mockReturnValue([])
    const { rerender } = render(<AssistantFilters {...requiredProps} />)

    // Set a project filter term — this sets projectFilterTerm.current
    fireEvent.change(screen.getByTestId('project-filter-input'), {
      target: { value: 'proj' },
    })

    // Simulate raw search results resolving (3 matches)
    mockUseProjectOptions.mockReturnValue({
      projectOptions: [opt1, opt2, opt3],
      loadProjectOptions: vi.fn(),
    })
    mockUseResolvedProjectOptions.mockReturnValue([opt1, opt2, opt3])
    rerender(<AssistantFilters {...requiredProps} />)

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('3 results found'))
  })

  it('announces "No results found" when project filter options resolve empty after a term', async () => {
    // Start with some options so the array reference changes on the subsequent render
    mockUseProjectOptions.mockReturnValue({ projectOptions: [opt1], loadProjectOptions: vi.fn() })
    mockUseResolvedProjectOptions.mockReturnValue([opt1])
    const { rerender } = render(<AssistantFilters {...requiredProps} />)

    // Set a project filter term
    fireEvent.change(screen.getByTestId('project-filter-input'), {
      target: { value: 'zzz' },
    })

    // Simulate raw search results resolving to empty
    mockUseProjectOptions.mockReturnValue({ projectOptions: [], loadProjectOptions: vi.fn() })
    mockUseResolvedProjectOptions.mockReturnValue([])
    rerender(<AssistantFilters {...requiredProps} />)

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('No results found'))
  })

  // CR-003: announced count must use raw search results, not the count inflated by pre-selected items
  it('announces raw search result count, not count inflated by pre-selected items', async () => {
    // Setup: 1 raw search result, but resolvedProjectOptions includes 2 pre-selected items too
    mockUseProjectOptions.mockReturnValue({ projectOptions: [], loadProjectOptions: vi.fn() })
    mockUseResolvedProjectOptions.mockReturnValue([opt1, opt2]) // 2 pre-selected, no new search yet

    const filtersWithPreSelected = { ...requiredProps.filters, project: ['project-a', 'project-b'] }
    const { rerender } = render(
      <AssistantFilters {...requiredProps} filters={filtersWithPreSelected} />
    )

    // User types a search term
    fireEvent.change(screen.getByTestId('project-filter-input'), {
      target: { value: 'proj' },
    })

    // Raw search result: 1 match; resolved (augmented) result: 3 (1 match + 2 pre-selected)
    mockUseProjectOptions.mockReturnValue({
      projectOptions: [opt3], // 1 raw result
      loadProjectOptions: vi.fn(),
    })
    mockUseResolvedProjectOptions.mockReturnValue([opt1, opt2, opt3]) // 3 augmented
    rerender(<AssistantFilters {...requiredProps} filters={filtersWithPreSelected} />)

    // With fix: announces '1 result found' (raw count), not '3 results found' (augmented count)
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('1 result found'))
  })
})
