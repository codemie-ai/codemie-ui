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

import { ABSENT_VALUE_MARKER } from '@/constants'
import { ColumnType, Metric, MetricFormat } from '@/types/analytics'

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

describe('MetricCard', () => {
  it('renders a plain currency figure', () => {
    render(<MetricCard metric={buildMetric()} />)

    expect(cardValue()).toBe('$1,234.56')
  })

  it('renders an absent figure as the marker, never as a zero', () => {
    render(<MetricCard metric={buildMetric({ value: null as unknown as number })} />)

    expect(cardValue()).toBe(ABSENT_VALUE_MARKER)
  })

  it('keeps a measured zero as a zero', () => {
    render(<MetricCard metric={buildMetric({ value: 0 })} />)

    expect(cardValue()).toBe('$0.00')
  })

  it('leaves a value override untouched', () => {
    render(<MetricCard metric={buildMetric()} valueOverride={<span>custom</span>} />)

    expect(cardValue()).toBe('custom')
  })
})

describe('MetricCard description', () => {
  it('starts the caption with a capital letter', () => {
    render(<MetricCard metric={buildMetric({ description: 'net +5 lines' })} />)

    expect(screen.getByText('Net +5 lines')).toBeInTheDocument()
  })
})
