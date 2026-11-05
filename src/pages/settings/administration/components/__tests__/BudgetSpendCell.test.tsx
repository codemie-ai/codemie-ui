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
  it('renders a whole total unqualified when every part resolved', () => {
    render(
      <BudgetSpendCell
        items={[
          item({ category: 'platform', current_spending: 10, max_budget: 100 }),
          item({ category: 'cli', current_spending: 5, max_budget: 50 }),
        ]}
      />
    )

    expect(screen.getByText('$15.00 / $150.00')).toBeInTheDocument()
    expect(screen.queryByText(/at least/)).not.toBeInTheDocument()
    expect(screen.queryByText(/incomplete data/)).not.toBeInTheDocument()
  })

  it('qualifies the Total when one category has no figure and the others do', () => {
    // The headline defect: the sum of the two that resolved used to render indistinguishably
    // from a whole total.
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

  it('inherits a partial part and names the summed unattributed amount', () => {
    render(
      <BudgetSpendCell
        items={[
          item({
            category: 'platform',
            current_spending: 10,
            max_budget: 100,
            spend_partial: true,
            spend_missing_amount: 2,
          }),
          item({
            category: 'cli',
            current_spending: 5,
            max_budget: 50,
            spend_partial: true,
            spend_missing_amount: 3,
          }),
        ]}
      />
    )

    expect(screen.getByText('$15.00 / $150.00')).toBeInTheDocument()
  })

  it('names no amount when one contributing part does not know its own', () => {
    // An unknown hole must not be reported as the computable half of itself.
    render(
      <BudgetSpendCell
        items={[
          item({
            category: 'platform',
            current_spending: 10,
            max_budget: 100,
            spend_partial: true,
            spend_missing_amount: 2,
          }),
          item({
            category: 'cli',
            current_spending: 5,
            max_budget: 50,
            spend_partial: true,
            spend_missing_amount: null,
          }),
        ]}
      />
    )

    expect(screen.getByText('$15.00 / $150.00')).toBeInTheDocument()
  })

  it('marks the Total incomplete when a part had no coverage', () => {
    render(
      <BudgetSpendCell
        items={[
          item({ category: 'platform', current_spending: 10, max_budget: 100 }),
          item({
            category: 'cli',
            current_spending: 5,
            max_budget: 50,
            spend_unavailable: true,
          }),
        ]}
      />
    )

    expect(screen.getByText('$15.00 / $150.00')).toBeInTheDocument()
  })

  it('renders a dash and no suffix when every category is absent', () => {
    render(
      <BudgetSpendCell
        items={[
          item({ category: 'platform', current_spending: null, max_budget: 100 }),
          item({ category: 'cli', current_spending: null, max_budget: 50 }),
        ]}
      />
    )

    expect(screen.getByText('- / $150.00')).toBeInTheDocument()
    expect(screen.queryByText(/at least/)).not.toBeInTheDocument()
  })

  it('qualifies the category row that is partial and leaves the others alone', () => {
    render(
      <BudgetSpendCell
        items={[
          item({
            category: 'platform',
            current_spending: 10,
            max_budget: 100,
            spend_partial: true,
            spend_missing_amount: 2,
          }),
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
