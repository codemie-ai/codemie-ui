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
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { ProjectBudget } from '@/types/entity/projectBudget'
import { ProjectSpendingWidgetRow } from '@/types/entity/projectManagement'

import ProjectBudgetCard from '../ProjectBudgetCard'

const baseBudget: ProjectBudget = {
  budget_id: 'b1',
  name: 'Budget',
  project_name: 'demo',
  budget_category: 'premium_models',
  soft_budget: 80,
  max_budget: 100,
  budget_duration: 'monthly',
  budget_reset_at: null,
  provider_sync_status: 'ok',
  member_count: 0,
  allocated_member_budget_total: 0,
  member_allocations: [],
}

describe('ProjectBudgetCard premium link', () => {
  it('shows the catalog link on the assigned premium_models card', () => {
    render(
      <MemoryRouter>
        <ProjectBudgetCard variant="assigned" mode="view" budget={baseBudget} />
      </MemoryRouter>
    )

    const link = screen.getByRole('link', { name: /view covered premium models/i })
    expect(link).toHaveAttribute('href', expect.stringContaining('/help/models'))
  })

  it('does not show the link for other categories', () => {
    render(
      <MemoryRouter>
        <ProjectBudgetCard
          variant="assigned"
          mode="view"
          budget={{ ...baseBudget, budget_category: 'platform' }}
        />
      </MemoryRouter>
    )

    expect(
      screen.queryByRole('link', { name: /view covered premium models/i })
    ).not.toBeInTheDocument()
  })

  it('does not show the link on the empty premium card', () => {
    render(
      <MemoryRouter>
        <ProjectBudgetCard variant="empty" mode="view" category="premium_models" />
      </MemoryRouter>
    )

    expect(
      screen.queryByRole('link', { name: /view covered premium models/i })
    ).not.toBeInTheDocument()
  })
})

describe('ProjectBudgetCard Budget Stopped indicator', () => {
  it('shows "Budget Stopped" indicator when is_active is false', () => {
    const inactiveBudget: ProjectBudget = {
      ...baseBudget,
      is_active: false,
    }

    render(
      <MemoryRouter>
        <ProjectBudgetCard variant="assigned" mode="view" budget={inactiveBudget} />
      </MemoryRouter>
    )

    expect(screen.getByText('Budget Stopped')).toBeInTheDocument()
  })

  it('does not show "Budget Stopped" when is_active is true', () => {
    const activeBudget: ProjectBudget = {
      ...baseBudget,
      is_active: true,
    }

    render(
      <MemoryRouter>
        <ProjectBudgetCard variant="assigned" mode="view" budget={activeBudget} />
      </MemoryRouter>
    )

    expect(screen.queryByText('Budget Stopped')).not.toBeInTheDocument()
  })

  it('does not show "Budget Stopped" when is_active is undefined', () => {
    const budgetWithoutField: ProjectBudget = {
      ...baseBudget,
      // is_active omitted — backward compatibility case
    }

    render(
      <MemoryRouter>
        <ProjectBudgetCard variant="assigned" mode="view" budget={budgetWithoutField} />
      </MemoryRouter>
    )

    expect(screen.queryByText('Budget Stopped')).not.toBeInTheDocument()
  })

  it('shows "Budget Stopped" indicator in manage mode when is_active is false', () => {
    const inactiveBudget: ProjectBudget = {
      ...baseBudget,
      is_active: false,
    }

    render(
      <MemoryRouter>
        <ProjectBudgetCard variant="assigned" mode="manage" budget={inactiveBudget} />
      </MemoryRouter>
    )

    expect(screen.getByText('Budget Stopped')).toBeInTheDocument()
  })

  it('does not show "Budget Stopped" when is_active is null', () => {
    const budgetWithNull: ProjectBudget = {
      ...baseBudget,
      is_active: null as unknown as boolean,
    }

    render(
      <MemoryRouter>
        <ProjectBudgetCard variant="assigned" mode="view" budget={budgetWithNull} />
      </MemoryRouter>
    )

    expect(screen.queryByText('Budget Stopped')).not.toBeInTheDocument()
  })
})

const unassignedPremiumRow: ProjectSpendingWidgetRow = {
  budget_id: 'project-3-premium_models-8ebdcd4c',
  budget_category: 'premium_models',
  is_assigned: false,
  current_spending: 0.1444,
  budget_reset_at: '2026-10-01T00:00:00Z',
  time_until_reset: '1 day',
  budget_limit: null,
  total: 0,
}

describe('ProjectBudgetCard unassigned category spend', () => {
  it('shows the current-period spend in the header next to the category name', () => {
    render(
      <MemoryRouter>
        <ProjectBudgetCard
          variant="empty"
          mode="view"
          category="premium_models"
          spendingRow={unassignedPremiumRow}
        />
      </MemoryRouter>
    )

    expect(screen.getByText('— not assigned —')).toBeInTheDocument()
    const header = screen.getByText('$0.14').closest('div')
    expect(header).toHaveTextContent('Premium models')
    expect(header).toHaveTextContent('Spend')
    expect(header).not.toHaveTextContent('— not assigned —')
  })

  it('shows no spend on an empty card without a spend row', () => {
    render(
      <MemoryRouter>
        <ProjectBudgetCard variant="empty" mode="view" category="premium_models" />
      </MemoryRouter>
    )

    expect(screen.getByText('— not assigned —')).toBeInTheDocument()
    expect(screen.queryByText('Spend')).not.toBeInTheDocument()
  })
})
