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

import { act, render } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'

import { SkillsFilters } from '@/types/entity/skill'

import SkillsFiltersComponent from '../SkillsFilters'

let capturedOnProjectFilter: (value: string) => void = () => {}

vi.mock('@/components/Filters', () => ({
  default: ({ filterDefinitions }: { filterDefinitions: any[] }) => {
    const projectDef = filterDefinitions?.find((d: any) => d.name === 'project')
    if (projectDef?.config?.onFilter) capturedOnProjectFilter = projectDef.config.onFilter
    return null
  },
}))

vi.mock('@/components/UserFilter', () => ({ default: () => null }))

const mockLoadProjectOptions = vi.fn().mockResolvedValue(undefined)
vi.mock('@/hooks/useProjectOptions', () => ({
  useProjectOptions: () => ({ projectOptions: [], loadProjectOptions: mockLoadProjectOptions }),
}))

vi.mock('@/hooks/useProjectDisplayNames', () => ({
  useProjectDisplayNames: () => new Map(),
}))

vi.mock('@/store/skills', () => ({
  skillsStore: { getSkillCategories: vi.fn().mockResolvedValue([]) },
}))

vi.mock('@/store/user', () => ({
  userStore: { loadSkillsUsers: vi.fn().mockResolvedValue([]) },
}))

vi.mock('@/utils/filters', () => ({
  checkEmptyFilters: () => true,
}))

describe('SkillsFilters — project search debounce', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    capturedOnProjectFilter = () => {}
  })

  it('debounces project search: rapid keystrokes produce a single request after 1 second', async () => {
    vi.useFakeTimers()

    render(
      <SkillsFiltersComponent
        onFilterChange={vi.fn()}
        filters={{} as SkillsFilters}
        activeScope="all"
      />
    )

    // Let initial effects settle (initial loadProjectOptions('') call on mount)
    await act(async () => {})

    // Reset — only count debounce-triggered calls from here
    mockLoadProjectOptions.mockClear()

    // Simulate rapid typing: 3 keystrokes within debounce window
    act(() => {
      capturedOnProjectFilter('a')
    })
    act(() => {
      capturedOnProjectFilter('ab')
    })
    act(() => {
      capturedOnProjectFilter('abc')
    })

    // No request fired yet (all within 1000ms debounce window)
    expect(mockLoadProjectOptions).not.toHaveBeenCalled()

    // Advance past the 1000ms debounce
    await act(async () => {
      vi.advanceTimersByTime(1100)
    })

    // Exactly one request with the final search term
    expect(mockLoadProjectOptions).toHaveBeenCalledTimes(1)
    expect(mockLoadProjectOptions).toHaveBeenCalledWith('abc')
  })
})
