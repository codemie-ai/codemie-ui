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

import SpendingAmount from '../SpendingAmount'

vi.mock('@/pages/settings/administration/projectsManagement/components/budgetSpending', () => ({
  // jsdom exposes no Tailwind CSS variables, so the real helper resolves every threshold color to
  // an empty string and no assertion could tell "colored" from "not colored". The stub keeps the
  // only rule these tests care about: a configured limit yields a color, no limit yields none.
  getHardLimitSpendColor: (_spend: number, limit: number | null | undefined) =>
    limit == null || limit <= 0 ? null : 'rgb(1, 2, 3)',
}))

describe('SpendingAmount', () => {
  it('renders the spend and limit inline', () => {
    render(<SpendingAmount spend={120.5} limit={500} />)
    expect(screen.getByText('$120.50 / $500.00')).toBeInTheDocument()
  })

  it('renders zero spend rather than a dash', () => {
    render(<SpendingAmount spend={0} limit={500} />)
    expect(screen.getByText('$0.00 / $500.00')).toBeInTheDocument()
  })

  it('renders a dash for spend when spend is absent', () => {
    render(<SpendingAmount spend={null} limit={500} />)
    expect(screen.getByText('- / $500.00')).toBeInTheDocument()
  })

  it('renders a dash for the limit when no limit is configured', () => {
    render(<SpendingAmount spend={40} limit={null} />)
    expect(screen.getByText('$40.00 / -')).toBeInTheDocument()
  })

  it('applies no color when no limit is configured', () => {
    render(<SpendingAmount spend={120.5} limit={null} />)
    expect(screen.getByText('$120.50 / -')).not.toHaveStyle({ color: expect.anything() })
  })

  it('does not render tooltip attributes', () => {
    render(<SpendingAmount spend={120.5} limit={500} />)
    const el = screen.getByText('$120.50 / $500.00')
    expect(el).not.toHaveAttribute('data-tooltip-id')
    expect(el).not.toHaveAttribute('data-tooltip-content')
  })

  it('renders exactly as before when no qualification is passed', () => {
    render(<SpendingAmount spend={120.5} limit={500} qualification={undefined} />)
    expect(screen.getByText('$120.50 / $500.00')).toBeInTheDocument()
  })

  it('adds no suffix for a figure that is neither partial nor short of coverage', () => {
    render(
      <SpendingAmount
        spend={120.5}
        limit={500}
        qualification={{
          spend_partial: false,
          spend_unavailable: false,
          spend_missing_amount: null,
        }}
      />
    )
    expect(screen.getByText('$120.50 / $500.00')).toBeInTheDocument()
  })

  it('names the unattributed amount on a partial figure', () => {
    render(
      <SpendingAmount
        spend={120.5}
        limit={500}
        qualification={{ spend_partial: true, spend_missing_amount: 12.25 }}
      />
    )
    expect(
      screen.getByText('$120.50 (at least; $12.25 unattributed) / $500.00')
    ).toBeInTheDocument()
  })

  it('still qualifies a partial figure when the unattributed amount is unknown', () => {
    render(
      <SpendingAmount
        spend={120.5}
        limit={500}
        qualification={{ spend_partial: true, spend_missing_amount: null }}
      />
    )
    expect(
      screen.getByText('$120.50 (at least; some spend unattributed) / $500.00')
    ).toBeInTheDocument()
  })

  it('attaches the suffix to the spend half, never after the limit', () => {
    render(
      <SpendingAmount
        spend={120.5}
        limit={500}
        qualification={{ spend_partial: true, spend_missing_amount: 12.25 }}
      />
    )
    // The doubt belongs to the spend: a limit is budget policy and is never partial.
    expect(
      screen.getByText(/\(at least; \$12\.25 unattributed\) \/ \$500\.00$/)
    ).toBeInTheDocument()
  })

  it('marks a figure short of coverage as incomplete', () => {
    render(<SpendingAmount spend={120.5} limit={500} qualification={{ spend_unavailable: true }} />)
    expect(screen.getByText('$120.50 (incomplete data) / $500.00')).toBeInTheDocument()
  })

  it('renders a measured zero as $0.00 even when qualified', () => {
    render(
      <SpendingAmount
        spend={0}
        limit={500}
        qualification={{ spend_partial: true, spend_missing_amount: null }}
      />
    )
    expect(
      screen.getByText('$0.00 (at least; some spend unattributed) / $500.00')
    ).toBeInTheDocument()
  })

  it('keeps the threshold color on a partial figure', () => {
    // The figure is a floor, so a color derived from it understates the risk. Dropping the color
    // would hide a member who is already over the limit.
    render(
      <SpendingAmount
        spend={480}
        limit={500}
        qualification={{ spend_partial: true, spend_missing_amount: null }}
      />
    )
    expect(screen.getByText(/^\$480\.00 \(at least/)).toHaveStyle({ color: 'rgb(1, 2, 3)' })
  })
})
