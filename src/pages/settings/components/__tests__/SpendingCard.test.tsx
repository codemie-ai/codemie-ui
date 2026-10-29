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

import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { analyticsStore } from '@/store/analytics'

import SpendingCard from '../SpendingCard'

vi.hoisted(() => vi.resetModules())

vi.mock('@/store/analytics', () => ({
  analyticsStore: {
    fetchTabularData: vi.fn(),
  },
}))

vi.mock('react-chartjs-2', () => ({
  Doughnut: () => <div data-testid="doughnut" />,
}))

const columns = [
  { id: 'project_name', label: 'Project', type: 'string' },
  { id: 'current_spending', label: 'Current spending', type: 'number', format: 'currency' },
  { id: 'budget_limit', label: 'Budget limit', type: 'number', format: 'currency' },
  { id: 'total', label: 'Usage', type: 'number', format: 'percentage' },
]

const buildResponse = (rows: Record<string, unknown>[]) =>
  ({
    data: { columns, rows },
    metadata: {},
    pagination: {},
  } as any)

const row = (projectName: string, isDefault?: boolean) => ({
  project_name: projectName,
  current_spending: 10,
  budget_limit: 100,
  total: 10,
  ...(isDefault === undefined ? {} : { is_default: isDefault }),
})

describe('SpendingCard default project badge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a single DEFAULT badge beside the default project label', async () => {
    vi.mocked(analyticsStore.fetchTabularData).mockResolvedValue(
      buildResponse([row('alpha-project', true), row('beta-project', false)])
    )

    render(<SpendingCard />)

    const label = await screen.findByText('alpha-project')
    expect(screen.getAllByText('DEFAULT')).toHaveLength(1)
    expect(label.parentElement).toContainElement(screen.getByText('DEFAULT'))
    expect(screen.getByText('beta-project').parentElement).not.toHaveTextContent('DEFAULT')
  })

  it('shows no DEFAULT badge when is_default is false', async () => {
    vi.mocked(analyticsStore.fetchTabularData).mockResolvedValue(
      buildResponse([row('alpha-project', false), row('beta-project')])
    )

    render(<SpendingCard />)

    await waitFor(() => expect(screen.getByText('alpha-project')).toBeInTheDocument())
    expect(screen.queryByText('DEFAULT')).not.toBeInTheDocument()
  })
})
