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

import { ColumnType, Metric, MetricFormat } from '@/types/analytics'
import { ABSENT_VALUE_MARKER, formatSpendQualificationSuffix } from '@/utils/analyticsFormatters'

import MetricCard from '../MetricCard'

const buildMetric = (overrides: Partial<Metric> = {}): Metric =>
  ({
    id: 'total_money_spent',
    label: 'Total Money Spent',
    type: ColumnType.NUMBER,
    format: MetricFormat.CURRENCY,
    value: 1234.56,
    ...overrides,
  } as Metric)

const cardValue = (label = 'Total Money Spent'): string | null =>
  screen.getByText(label).parentElement?.nextElementSibling?.textContent ?? null

describe('MetricCard spend qualification', () => {
  it('renders an unqualified figure with no annotation', () => {
    render(<MetricCard metric={buildMetric()} />)

    expect(cardValue()).toBe('$1,234.56')
  })

  it('marks a partial figure as a floor, naming the unattributed amount', () => {
    render(<MetricCard metric={buildMetric({ spend_partial: true, spend_missing_amount: 40 })} />)

    expect(cardValue()).toBe('$1,234.56')
  })

  it('marks a partial figure whose hole nobody could size', () => {
    render(<MetricCard metric={buildMetric({ spend_partial: true, spend_missing_amount: null })} />)

    expect(cardValue()).toBe('$1,234.56')
  })

  it('marks a figure the backend could not fully cover', () => {
    render(<MetricCard metric={buildMetric({ spend_unavailable: true })} />)

    expect(cardValue()).toBe('$1,234.56')
  })

  it('renders an absent figure as the marker, never as a zero', () => {
    render(<MetricCard metric={buildMetric({ value: null as unknown as number })} />)

    expect(cardValue()).toBe(ABSENT_VALUE_MARKER)
  })

  it('still qualifies an absent figure, so the gap is explained rather than bare', () => {
    const metric = buildMetric({ value: null as unknown as number, spend_unavailable: true })

    render(<MetricCard metric={metric} />)

    expect(cardValue()).toBe(`${ABSENT_VALUE_MARKER}${formatSpendQualificationSuffix(metric)}`)
  })

  it('keeps a measured zero as a zero', () => {
    render(<MetricCard metric={buildMetric({ value: 0 })} />)

    expect(cardValue()).toBe('$0.00')
  })

  it('does not annotate a non-currency metric, whose qualification would misattribute', () => {
    render(
      <MetricCard
        metric={buildMetric({
          id: 'cli_sessions',
          label: 'CLI Sessions',
          format: undefined,
          value: 12,
          spend_partial: true,
          spend_missing_amount: 40,
        })}
      />
    )

    expect(cardValue('CLI Sessions')).toBe('12')
  })

  it('renders no qualification line while the suffix is switched off', () => {
    render(<MetricCard metric={buildMetric({ spend_partial: true, spend_missing_amount: null })} />)

    expect(screen.queryByText(/unattributed/)).not.toBeInTheDocument()
    expect(cardValue()).toBe('$1,234.56')
  })

  it('leaves a value override untouched', () => {
    render(
      <MetricCard
        metric={buildMetric({ spend_partial: true })}
        valueOverride={<span>custom</span>}
      />
    )

    expect(cardValue()).toBe('custom')
  })
})
