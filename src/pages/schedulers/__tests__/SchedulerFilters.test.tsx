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

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { SchedulerFilterOptions } from '@/store/schedulers'
import { userStore } from '@/store/user'

import SchedulerFilters from '../SchedulerFilters'

const filterOptions: SchedulerFilterOptions = {
  resources: [
    { id: 'r1', name: 'Daily Jira Reporter', type: 'Assistant' },
    { id: 'r2', name: 'Sales Pipeline Sync', type: 'Workflow' },
  ],
  projects: [
    { id: 'p1', name: 'Platform Team' },
    { id: 'p2', name: 'Growth Squad' },
  ],
}

const noop = vi.fn()

const PROJECT_SEARCH_INPUT = '.p-multiselect-panel input[type="text"]'

const openMultiselect = (container: HTMLElement, index = 0) => {
  const triggers = container.querySelectorAll('.p-multiselect')
  fireEvent.click(triggers[index])
}

describe('SchedulerFilters', () => {
  beforeEach(() => {
    vi.spyOn(userStore, 'getProjects').mockResolvedValue([
      { name: 'Platform Team' },
      { name: 'Growth Squad' },
    ])
  })

  afterEach(() => {
    vi.restoreAllMocks()
    noop.mockClear()
  })

  it('renders human-readable resource names when Resource multiselect is opened', () => {
    const { container } = render(
      <SchedulerFilters filterOptions={filterOptions} values={{}} onApply={noop} />
    )
    // Resource is the second multiselect (after Project)
    openMultiselect(container, 1)
    expect(screen.getByText('Daily Jira Reporter')).toBeInTheDocument()
    expect(screen.getByText('Sales Pipeline Sync')).toBeInTheDocument()
  })

  it('renders project names and a search input when Project multiselect is opened', async () => {
    const { container } = render(
      <SchedulerFilters filterOptions={filterOptions} values={{}} onApply={noop} />
    )
    await waitFor(() => expect(userStore.getProjects).toHaveBeenCalled())
    // Project is the first multiselect
    openMultiselect(container, 0)
    await waitFor(() => {
      expect(screen.getByText('Platform Team')).toBeInTheDocument()
    })
    expect(screen.getByText('Growth Squad')).toBeInTheDocument()
    expect(document.querySelector(PROJECT_SEARCH_INPUT)).toBeInTheDocument()
  })

  it('applies the selected project as projectId', async () => {
    const onApply = vi.fn()
    const { container } = render(
      <SchedulerFilters filterOptions={filterOptions} values={{}} onApply={onApply} />
    )
    openMultiselect(container, 0)
    fireEvent.click(await screen.findByText('Platform Team'))
    await waitFor(() => {
      expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'Platform Team' }))
    })
  })

  it('clears projectId when the selected project is unchecked', async () => {
    const onApply = vi.fn()
    const { container } = render(
      <SchedulerFilters
        filterOptions={filterOptions}
        values={{ projectId: 'Platform Team' }}
        onApply={onApply}
      />
    )
    openMultiselect(container, 0)
    const panel = await waitFor(() => {
      const el = document.querySelector('.p-multiselect-panel') as HTMLElement
      expect(el).toBeInTheDocument()
      expect(el.textContent).toContain('Platform Team')
      return el
    })
    const item = Array.from(panel.querySelectorAll('.p-multiselect-item')).find((el) =>
      el.textContent?.includes('Platform Team')
    ) as HTMLElement
    fireEvent.click(item)
    await waitFor(() => {
      expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ projectId: undefined }))
    })
  })

  it('renders Resource Type options in order All, Assistant, Workflow, Datasource with All selected', () => {
    const { container } = render(
      <SchedulerFilters filterOptions={filterOptions} values={{}} onApply={noop} />
    )
    const inputs = Array.from(
      container.querySelectorAll<HTMLInputElement>('input[name="resourceType"]')
    )
    const labels = inputs.map((input) => input.closest('label')?.textContent?.trim())
    expect(labels).toEqual(['All', 'Assistant', 'Workflow', 'Datasource'])
    expect(inputs[0]).toBeChecked()
    expect(inputs.slice(1).every((input) => !input.checked)).toBe(true)
  })
})
