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
import { describe, it, expect } from 'vitest'

import BudgetSpendCell, { BudgetSpendCellItem } from '../BudgetSpendCell'

const item = (overrides: Partial<BudgetSpendCellItem>): BudgetSpendCellItem => ({
  key: `${overrides.category ?? 'platform'}-key`,
  category: 'platform',
  max_budget: 100,
  current_spending: 10,
  ...overrides,
})

describe('BudgetSpendCell', () => {
  it('renders a whole total when every part resolved', () => {
    render(
      <BudgetSpendCell
        items={[
          item({ category: 'platform', current_spending: 10, max_budget: 100 }),
          item({ category: 'cli', current_spending: 5, max_budget: 50 }),
        ]}
      />
    )

    expect(screen.getByText('$15.00 / $150.00')).toBeInTheDocument()
  })

  it("sums only the resolved parts, against every part's limit", () => {
    // premium_models has no figure but its limit still counts toward the total limit.
    render(
      <BudgetSpendCell
        items={[
          item({ category: 'platform', current_spending: 10, max_budget: 100 }),
          item({ category: 'cli', current_spending: 5, max_budget: 50 }),
          item({ category: 'premium_models', current_spending: null, max_budget: 25 }),
        ]}
      />
    )

    expect(screen.getByText('$15.00 / $175.00')).toBeInTheDocument()
  })

  it('renders a dash when every category is absent', () => {
    render(
      <BudgetSpendCell
        items={[
          item({ category: 'platform', current_spending: null, max_budget: 100 }),
          item({ category: 'cli', current_spending: null, max_budget: 50 }),
        ]}
      />
    )

    expect(screen.getByText('- / $150.00')).toBeInTheDocument()
  })

  it('renders each category row with its own spend and limit', () => {
    render(
      <BudgetSpendCell
        items={[
          item({ category: 'platform', current_spending: 10, max_budget: 100 }),
          item({ category: 'cli', current_spending: 5, max_budget: 50 }),
        ]}
      />
    )

    expect(screen.getByText('$10.00 / $100.00')).toBeInTheDocument()
    expect(screen.getByText('$5.00 / $50.00')).toBeInTheDocument()
  })

  it('renders a measured zero as $0.00 rather than a dash', () => {
    render(
      <BudgetSpendCell
        items={[item({ category: 'platform', current_spending: 0, max_budget: 100 })]}
      />
    )

    // Total row and category row both show the measured zero rather than the absent marker.
    expect(screen.getAllByText('$0.00 / $100.00')).toHaveLength(2)
  })

  it('renders a dash when there are no budget items at all', () => {
    render(<BudgetSpendCell items={[]} />)
    expect(screen.getByText('-')).toBeInTheDocument()
  })
})
