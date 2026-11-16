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

import { ColumnType, MetricFormat } from '@/types/analytics'
import type { TabularResponse } from '@/types/analytics'

import DistributionBarWidget from '../DistributionBarWidget'

const SHARE_COLUMNS = [
  { id: 'category', label: 'Category', type: ColumnType.STRING },
  { id: 'percentage', label: 'Share', type: ColumnType.NUMBER, format: MetricFormat.PERCENTAGE },
  { id: 'sessions', label: 'Sessions', type: ColumnType.NUMBER },
]

const COST_COLUMN = {
  id: 'cost',
  label: 'Cost',
  type: ColumnType.NUMBER,
  format: MetricFormat.CURRENCY,
}

const buildResponse = (
  rows: Record<string, unknown>[],
  columns = SHARE_COLUMNS
): TabularResponse => ({
  data: { columns, rows, totals: null },
  metadata: { timestamp: '2026-11-16T00:00:00Z', data_as_of: '2026-11-16T00:00:00Z' },
  pagination: { page: 0, per_page: 10, total_count: rows.length, has_more: false },
})

const renderWidget = (data: TabularResponse) =>
  render(
    <DistributionBarWidget
      data={data}
      title="Category Breakdown"
      labelField="category"
      valueField="percentage"
      secondaryValueField="cost"
    />
  )

const legendEntry = (text: string) =>
  screen.getByText((_, element) => element?.tagName === 'SPAN' && element.textContent === text)

describe('DistributionBarWidget legend', () => {
  it('shows the amount beside the share when the row has a cost', () => {
    renderWidget(
      buildResponse(
        [{ category: 'Feature', percentage: 0.6, sessions: 6, cost: 12.5 }],
        [...SHARE_COLUMNS, COST_COLUMN]
      )
    )

    expect(legendEntry('Feature: 60.0% ($12.50)')).toBeInTheDocument()
  })

  it('shows only the share, never $0.00, when the payload has no cost', () => {
    renderWidget(
      buildResponse([
        { category: 'Feature', percentage: 0.6, sessions: 6 },
        { category: 'Maintenance', percentage: 0.4, sessions: 4 },
      ])
    )

    expect(legendEntry('Feature: 60.0%')).toBeInTheDocument()
    expect(legendEntry('Maintenance: 40.0%')).toBeInTheDocument()
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument()
  })
})
