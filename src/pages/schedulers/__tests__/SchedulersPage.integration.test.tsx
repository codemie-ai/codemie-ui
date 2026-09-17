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

import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { IntegrationOption } from '@/constants/integration'
import { schedulersStore } from '@/store/schedulers'
import { mockAPI, renderPage } from '@/test-utils/integration'

const mockSchedulersResponse = {
  items: [],
  pagination: { page: 0, per_page: 10, total: 0, pages: 0 },
}

const mockFilterOptionsResponse = {
  resources: [
    { id: 'r1', name: 'Daily Jira Reporter', type: 'Assistant' },
    { id: 'r2', name: 'Sales Pipeline Sync', type: 'Workflow' },
  ],
  projects: [{ id: 'p1', name: 'Platform Team' }],
}

describe('SchedulersPage', () => {
  beforeEach(() => {
    schedulersStore.schedulers = []
    schedulersStore.filterOptions = { resources: [], projects: [] }
    mockAPI('GET', 'v1/schedulers', mockSchedulersResponse)
    mockAPI('GET', 'v1/schedulers/filter-options', mockFilterOptionsResponse)
  })

  afterEach(() => {
    schedulersStore.schedulers = []
    schedulersStore.filterOptions = { resources: [], projects: [] }
  })

  it('calls GET /v1/schedulers/filter-options on mount', async () => {
    renderPage('/schedulers')
    await waitFor(() => {
      expect(schedulersStore.filterOptions.resources).toHaveLength(2)
    })
  })

  it('shows resource names in the Resource filter dropdown', async () => {
    const { container } = renderPage('/schedulers')
    await waitFor(() => {
      expect(schedulersStore.filterOptions.resources).toHaveLength(2)
    })
    // Resource is the second .p-multiselect (Project first, Resource second)
    const triggers = container.querySelectorAll('.p-multiselect')
    fireEvent.click(triggers[1])
    expect(screen.getByText('Daily Jira Reporter')).toBeInTheDocument()
    expect(screen.getByText('Sales Pipeline Sync')).toBeInTheDocument()
  })

  it('shows project names in the Project filter dropdown', async () => {
    const { container } = renderPage('/schedulers')
    await waitFor(() => {
      expect(schedulersStore.filterOptions.projects).toHaveLength(1)
    })
    const triggers = container.querySelectorAll('.p-multiselect')
    fireEvent.click(triggers[0])
    expect(screen.getByText('Platform Team')).toBeInTheDocument()
  })

  it('accepts ownerType in fetchSchedulers query', async () => {
    mockAPI('GET', 'v1/schedulers', mockSchedulersResponse)
    await schedulersStore.fetchSchedulers({ ownerType: IntegrationOption.USER })
    expect(schedulersStore.schedulers).toBeDefined()
  })

  describe('Scheduler Type switch', () => {
    it('renders the type switch with only User option for non-admin users', async () => {
      // default v1/user mock in setupTests returns is_admin: false — no override needed
      renderPage('/schedulers')
      await waitFor(() => {
        expect(schedulersStore.schedulers).toBeDefined()
      })
      expect(screen.getByText('Scheduler Type:')).toBeInTheDocument()
      // PrimeReact SelectButton renders options as role="button" divs
      const switchWrapper = screen.getByText('Scheduler Type:').closest('div')!.parentElement!
      const optionButtons = switchWrapper.querySelectorAll('[role="button"]')
      expect(optionButtons).toHaveLength(1)
      expect(optionButtons[0]).toHaveTextContent('User')
    })

    it('always renders the Create button', async () => {
      renderPage('/schedulers')
      await waitFor(() => {
        expect(schedulersStore.schedulers).toBeDefined()
      })
      expect(screen.getByText('Create')).toBeInTheDocument()
    })

    it('renders the type switch for admin users', async () => {
      mockAPI('GET', 'v1/user', {
        user_id: 'admin-id',
        email: 'admin@example.com',
        name: 'Admin User',
        username: 'adminuser',
        is_admin: true,
        is_maintainer: false,
        user_type: 'INTERNAL',
        applications: ['demo'],
        applications_admin: ['demo'],
      })
      renderPage('/schedulers')
      await waitFor(() => {
        expect(screen.getByText('Scheduler Type:')).toBeInTheDocument()
      })
    })
  })
})
