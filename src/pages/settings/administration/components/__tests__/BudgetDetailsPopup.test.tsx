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
import { describe, it, expect, vi } from 'vitest'

import api from '@/utils/api'

import BudgetDetailsPopup from '../BudgetDetailsPopup'

vi.mock('valtio', () => ({
  proxy: (obj: unknown) => obj,
  useSnapshot: vi.fn((store: unknown) => store),
  subscribe: vi.fn(() => vi.fn()),
}))
vi.mock('@/components/Popup', () => ({
  default: ({ children, visible, header }: any) =>
    visible ? (
      <div>
        <h2>{header}</h2>
        {children}
      </div>
    ) : null,
}))

const base = {
  budget_id: 'team-budget',
  name: 'Team Budget',
  description: 'For the platform team',
  soft_budget: 50,
  max_budget: 100,
  budget_duration: '30d',
  budget_category: 'platform' as const,
}

const renderPopup = (budget: any) => render(<BudgetDetailsPopup budget={budget} onHide={vi.fn()} />)

describe('BudgetDetailsPopup', () => {
  it('shows the budget details and the API-provided creator name', () => {
    renderPopup({ ...base, created_by: 'user-1', created_by_name: 'Jane Doe' })

    expect(screen.getByText('Budget details')).toBeInTheDocument()
    expect(screen.getByText('team-budget')).toBeInTheDocument()
    expect(screen.getByText('Team Budget')).toBeInTheDocument()
    expect(screen.getByText('For the platform team')).toBeInTheDocument()
    expect(screen.getByText('Created by')).toBeInTheDocument()
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
  })

  it('shows System for a preconfigured budget', () => {
    renderPopup({ ...base, created_by: 'system', created_by_name: null, is_preconfigured: true })

    expect(screen.getByText('System')).toBeInTheDocument()
  })

  it('shows a dash for a creator with no name from the API', () => {
    renderPopup({ ...base, description: 'x', created_by: 'deleted-user', created_by_name: null })

    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders nothing without a budget', () => {
    renderPopup(null)

    expect(screen.queryByText('Budget details')).not.toBeInTheDocument()
  })

  it('never looks up users to resolve a creator name', () => {
    const spy = vi.spyOn(api, 'get')
    renderPopup({ ...base, created_by: 'user-1', created_by_name: 'Jane Doe' })
    expect(spy).not.toHaveBeenCalledWith(
      expect.stringContaining('v1/admin/users'),
      expect.anything()
    )
  })
})
