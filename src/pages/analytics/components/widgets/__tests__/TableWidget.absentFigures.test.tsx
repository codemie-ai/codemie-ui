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

import { ABSENT_VALUE_MARKER } from '@/constants'
import { ColumnType, MetricFormat, TabularMetricType } from '@/types/analytics'
import type { TabularResponse } from '@/types/analytics'

import TableWidget from '../TableWidget'

vi.hoisted(() => vi.resetModules())

const { mockAnalyticsStore } = vi.hoisted(() => ({
  mockAnalyticsStore: {
    loading: {},
    loaded: {},
    error: {},
    aiAdoptionConfig: null,
    fetchTabularData: vi.fn(),
  },
}))

vi.mock('@/store/analytics', () => ({
  analyticsStore: mockAnalyticsStore,
}))

const MONEY_COLUMNS = [
  { id: 'user', label: 'User', type: ColumnType.STRING },
  { id: 'cost', label: 'Cost', type: ColumnType.NUMBER, format: MetricFormat.CURRENCY },
]

const buildResponse = (
  rows: Record<string, unknown>[],
  totals?: Record<string, unknown> | null
): TabularResponse => ({
  data: { columns: MONEY_COLUMNS, rows, totals: totals ?? null },
  metadata: { timestamp: '2026-08-27T00:00:00Z', data_as_of: '2026-08-27T00:00:00Z' },
  pagination: { page: 0, per_page: 10, total_count: rows.length, has_more: false },
})

const renderWidget = (data: TabularResponse) =>
  render(
    <TableWidget
      metricType={TabularMetricType.USERS_SPENDING}
      title=""
      initialData={data}
      hideWrapper
      hidePagination
    />
  )

describe('TableWidget absent figures', () => {
  it('renders an absent money figure as the absent marker, never as $0.00', () => {
    renderWidget(buildResponse([{ user: 'alice', cost: null }]))

    expect(screen.getByText('-')).toBeInTheDocument()
    expect(screen.queryByText('$0.00')).not.toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('renders a measured zero as $0.00', () => {
    renderWidget(buildResponse([{ user: 'alice', cost: 0 }]))

    expect(screen.getByText('$0.00')).toBeInTheDocument()
    expect(screen.queryByText('-')).not.toBeInTheDocument()
  })

  it('renders nothing in a footer slot the backend sends neither a total nor a flag for', () => {
    const { container } = renderWidget(buildResponse([{ user: 'alice', cost: 12.5 }], { other: 1 }))

    const footerCells = Array.from(container.querySelectorAll('tfoot td')).map(
      (cell) => cell.textContent
    )
    expect(footerCells).toStrictEqual(['Total', ''])
  })

  it('renders a money footer sent as its unavailable flag alone as the absent marker', () => {
    // What the backend sends when no row produced a figure: the money key is left out and only the
    // flag says the total is unknown. A blank cell under rows of "-" reads as "no total here".
    const { container } = renderWidget(
      buildResponse([{ user: 'alice', cost: null }], { cost_spend_unavailable: true })
    )

    const footerCells = Array.from(container.querySelectorAll('tfoot td')).map(
      (cell) => cell.textContent
    )
    expect(footerCells).toStrictEqual(['Total', ABSENT_VALUE_MARKER])
  })

  it('renders a footer total the backend footered but could not size as the absent marker', () => {
    // Distinct from the first case: there the backend footers no total for the column at all, and a
    // blank cell is right. Here it footers the column and the total is unknown, so a blank cell would
    // read as "this column has no total" rather than "nobody can size this one".
    renderWidget(
      buildResponse([{ user: 'alice', cost: null }], {
        cost: null,
        cost_spend_unavailable: true,
      })
    )

    const footerCells = Array.from(document.querySelectorAll('tfoot td')).map(
      (cell) => cell.textContent
    )
    expect(footerCells).toStrictEqual(['Total', ABSENT_VALUE_MARKER])
  })
})
