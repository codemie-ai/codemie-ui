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

import { render, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetProjects = vi.fn()
const mockOnChange = vi.fn()
const { mockDisplayNames } = vi.hoisted(() => ({ mockDisplayNames: new Map<string, string>() }))

vi.mock('@/store/user', () => ({
  userStore: {
    getProjects: (...args: unknown[]) => mockGetProjects(...args),
  },
}))

vi.mock('@/hooks/useProjectDisplayNames', () => ({
  useProjectDisplayNames: () => mockDisplayNames,
}))

// Stub out the heavy PrimeReact MultiSelect with something inspectable
vi.mock('@/components/form/MultiSelect', () => ({
  default: ({ options }: { options: Array<{ label: string; value: string }> }) => (
    <div data-testid="multiselect">
      {options.map((o) => (
        <span key={o.value} data-testid={`option-${o.value}`}>
          {o.label}
        </span>
      ))}
    </div>
  ),
}))

describe('ProjectSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDisplayNames.clear()
  })

  it('shows "name (display_name)" as option label when display_name is available', async () => {
    mockGetProjects.mockResolvedValue([
      { name: 'proj-a', display_name: 'Project Alpha' },
      { name: 'proj-b', display_name: null },
    ])

    const { default: ProjectSelector } = await import('../ProjectSelector')
    const { getByTestId } = render(<ProjectSelector onChange={mockOnChange} />)

    await waitFor(() => {
      expect(getByTestId('option-proj-a').textContent).toBe('proj-a (Project Alpha)')
      expect(getByTestId('option-proj-b').textContent).toBe('proj-b')
    })
  })

  it('falls back to project name when display_name is undefined', async () => {
    mockGetProjects.mockResolvedValue([{ name: 'my-project' }])

    const { default: ProjectSelector } = await import('../ProjectSelector')
    const { getByTestId } = render(<ProjectSelector onChange={mockOnChange} />)

    await waitFor(() => {
      expect(getByTestId('option-my-project').textContent).toBe('my-project')
    })
  })

  it('injects current value into options when it is not returned by the API', async () => {
    mockGetProjects.mockResolvedValue([{ name: 'proj-a', display_name: 'Project A' }])

    const { default: ProjectSelector } = await import('../ProjectSelector')
    const { getByTestId } = render(<ProjectSelector value="proj-missing" onChange={mockOnChange} />)

    await waitFor(() => {
      // The missing project should be added to the options list
      expect(getByTestId('option-proj-missing')).toBeTruthy()
    })
  })

  it('resolves display_name for a current value not returned by the API, via useProjectDisplayNames (EPMCDME-13637)', async () => {
    mockGetProjects.mockResolvedValue([])
    mockDisplayNames.set('codemie', 'Super team')

    const { default: ProjectSelector } = await import('../ProjectSelector')
    const { getByTestId } = render(<ProjectSelector value="codemie" onChange={mockOnChange} />)

    await waitFor(() => {
      // Correct from the very first render — not only after typing a 3+
      // character search that happens to hit the backend.
      expect(getByTestId('option-codemie').textContent).toBe('codemie (Super team)')
    })
  })

  it('does not duplicate current value when it is already in the API response', async () => {
    mockGetProjects.mockResolvedValue([
      { name: 'proj-a', display_name: 'Project A' },
      { name: 'proj-b', display_name: null },
    ])

    const { default: ProjectSelector } = await import('../ProjectSelector')
    const { getAllByTestId } = render(<ProjectSelector value="proj-a" onChange={mockOnChange} />)

    await waitFor(() => {
      expect(getAllByTestId('option-proj-a')).toHaveLength(1)
    })
  })

  it('auto-selects the first project when no value is provided and selectDefault is true', async () => {
    mockGetProjects.mockResolvedValue([
      { name: 'first', display_name: null },
      { name: 'second', display_name: null },
    ])

    const { default: ProjectSelector } = await import('../ProjectSelector')
    render(<ProjectSelector onChange={mockOnChange} selectDefault />)

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith('first')
    })
  })

  it('does not auto-select when value is already set', async () => {
    mockGetProjects.mockResolvedValue([{ name: 'proj-a', display_name: null }])

    const { default: ProjectSelector } = await import('../ProjectSelector')
    render(<ProjectSelector value="proj-a" onChange={mockOnChange} selectDefault />)

    await waitFor(() => {
      expect(mockOnChange).not.toHaveBeenCalled()
    })
  })

  it('finds a project by its technical name even when display_name differs (EPMCDME-13637)', async () => {
    mockGetProjects.mockResolvedValue([{ name: 'epm-fdeg', display_name: 'FDE Group' }])

    const { default: ProjectSelector } = await import('../ProjectSelector')
    const { getByTestId } = render(<ProjectSelector onChange={mockOnChange} />)

    await waitFor(() => {
      // "epm-fdeg" is part of the label string, so PrimeReact's default
      // optionLabel-based filtering matches it without any filterBy override.
      expect(getByTestId('option-epm-fdeg').textContent).toBe('epm-fdeg (FDE Group)')
    })
  })
})
