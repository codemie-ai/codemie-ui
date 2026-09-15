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

import type { SchedulerFilterOptions } from '@/store/schedulers'

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

const openMultiselect = (container: HTMLElement, index = 0) => {
  const triggers = container.querySelectorAll('.p-multiselect')
  fireEvent.click(triggers[index])
}

describe('SchedulerFilters', () => {
  it('renders human-readable resource names when Resource multiselect is opened', () => {
    const { container } = render(
      <SchedulerFilters filterOptions={filterOptions} values={{}} onApply={noop} />
    )
    // Resource is the second multiselect (after Project)
    openMultiselect(container, 1)
    expect(screen.getByText('Daily Jira Reporter')).toBeInTheDocument()
    expect(screen.getByText('Sales Pipeline Sync')).toBeInTheDocument()
  })

  it('renders human-readable project names when Project multiselect is opened', () => {
    const { container } = render(
      <SchedulerFilters filterOptions={filterOptions} values={{}} onApply={noop} />
    )
    // Project is the first multiselect
    openMultiselect(container, 0)
    expect(screen.getByText('Platform Team')).toBeInTheDocument()
    expect(screen.getByText('Growth Squad')).toBeInTheDocument()
  })
})
