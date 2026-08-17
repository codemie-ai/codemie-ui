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
