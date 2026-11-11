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

import BudgetSpendMetrics from '../BudgetSpendMetrics'

vi.mock('@/pages/analytics/components/widgets/RatioWidget/utils', () => ({
  getStatusColor: (percentage: number, danger: number, warning: number) => {
    if (percentage > danger) return 'rgb(255, 0, 0)'
    if (percentage > warning) return 'rgb(255, 255, 0)'
    return 'rgb(0, 128, 0)'
  },
  getStatusColorWithOpacity: () => 'transparent',
}))

vi.mock('@/pages/analytics/components/widgets/SpendingProgressBar', () => ({
  default: ({ percentage }: { percentage: number }) => (
    <div data-testid="progress-bar">{percentage}</div>
  ),
}))

describe('BudgetSpendMetrics', () => {
  it('pairs Remaining and Soft limit with their own values', () => {
    render(<BudgetSpendMetrics spent={10} max={100} soft={80} remaining={90} />)

    expect(screen.getByText('Remaining').nextElementSibling).toHaveTextContent('$90.00')
    expect(screen.getByText('Soft limit').nextElementSibling).toHaveTextContent('$80.00')
  })

  it('renders a progress bar for a positive hard limit', () => {
    render(<BudgetSpendMetrics spent={25} max={100} soft={80} remaining={75} />)

    expect(screen.getByTestId('progress-bar')).toHaveTextContent('25')
  })

  it('renders "—" instead of a progress bar when the hard limit is zero', () => {
    render(<BudgetSpendMetrics spent={0} max={0} soft={0} remaining={0} />)

    expect(screen.queryByTestId('progress-bar')).not.toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it.each([
    [49, 'green', 'rgb(0, 128, 0)'],
    [50, 'yellow', 'rgb(255, 255, 0)'],
    [70, 'yellow', 'rgb(255, 255, 0)'],
    [71, 'red', 'rgb(255, 0, 0)'],
  ])('colours spend at %i percent of the limit %s', (spent, _name, color) => {
    render(<BudgetSpendMetrics spent={spent} max={100} soft={80} remaining={7} />)

    expect(screen.getByText(`$${spent}.00`)).toHaveStyle({ color })
  })
})
