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

import { render as rtlRender, screen, waitFor } from '@testing-library/react'
import { ReactElement } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { analyticsStore } from '@/store/analytics'

import UserProjectSpendingTable, { clearSpendingCache } from '../UserProjectSpendingTable'

// Project names render as <Link>s, which requires a router context.
const render = (ui: ReactElement) => rtlRender(<MemoryRouter>{ui}</MemoryRouter>)

const response = {
  data: {
    columns: [],
    rows: [
      {
        project_name: 'project-6',
        display_name: 'Project 6',
        platform: 120.5,
        cli: 40,
        premium_models: 0,
        platform_limit: 500,
        cli_limit: null,
        premium_models_limit: null,
      },
    ],
  },
  metadata: { timestamp: '', data_as_of: '' },
  pagination: { page: 0, per_page: 50, total_count: 1, has_more: false },
}

describe('UserProjectSpendingTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearSpendingCache()
  })

  it('fetches spending for the given user', async () => {
    const spy = vi
      .spyOn(analyticsStore, 'fetchUserProjectSpending')
      .mockResolvedValue(response as never)

    render(<UserProjectSpendingTable userEmail="jane@epam.com" />)

    await waitFor(() => expect(spy).toHaveBeenCalledWith('jane@epam.com'))
  })

  it('renders a row per project with per-category amounts', async () => {
    vi.spyOn(analyticsStore, 'fetchUserProjectSpending').mockResolvedValue(response as never)

    render(<UserProjectSpendingTable userEmail="jane@epam.com" />)

    expect(await screen.findByText('Project 6')).toBeInTheDocument()
    expect(screen.getByText('$120.50 / $500.00')).toBeInTheDocument()
    expect(screen.getByText('$40.00 / -')).toBeInTheDocument()
    expect(screen.getByText('$0.00 / -')).toBeInTheDocument()
  })

  it('shows an empty state when the user has no projects', async () => {
    vi.spyOn(analyticsStore, 'fetchUserProjectSpending').mockResolvedValue({
      ...response,
      data: { columns: [], rows: [] },
    } as never)

    render(<UserProjectSpendingTable userEmail="jane@epam.com" />)

    expect(await screen.findByText(/no project spending/i)).toBeInTheDocument()
  })

  it('shows an inline warning when the request fails', async () => {
    vi.spyOn(analyticsStore, 'fetchUserProjectSpending').mockRejectedValue(new Error('boom'))

    render(<UserProjectSpendingTable userEmail="jane@epam.com" />)

    expect(await screen.findByText(/could not load project spending/i)).toBeInTheDocument()
  })

  it('falls back to the project name when no display name is set', async () => {
    vi.spyOn(analyticsStore, 'fetchUserProjectSpending').mockResolvedValue({
      ...response,
      data: {
        columns: [],
        rows: [{ ...response.data.rows[0], display_name: null }],
      },
    } as never)

    render(<UserProjectSpendingTable userEmail="jane@epam.com" />)

    expect(await screen.findByText('project-6')).toBeInTheDocument()
  })
})
