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

// Payloads below were captured from the live CLI-analytics database by driving the real
// reader SQL, LocalAnalyticsHandler and the Pydantic response models. A and B both carry
// tool_success_rate 0.0 and differ only in tool_calls, which is the whole point.
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ColumnType, MetricFormat, type Metric } from '@/types/analytics'
import { formatMetricValue } from '@/utils/analyticsFormatters'

import MetricCard from '../../widgets/MetricCard'
import { formatToolSuccess } from '../format'

// --- live payloads -----------------------------------------------------------------
// A: window 2026-10-19T07:55:00..07:55:20, users=[admin@codemie.ai], session 68817c66
const LIVE_A = {
  overview: { total_tool_calls: 0, tool_call_success_rate: 0.0 },
  user: { session_count: 1, turns: 0, tool_calls: 0, tool_success_rate: 0.0 },
}
// B: window 2026-10-05T12:00:00..13:30, all users -> admin@codemie.ai row
const LIVE_B = {
  overview: { total_tool_calls: 4, tool_call_success_rate: 75.0 },
  user: { session_count: 1, turns: 1, tool_calls: 1, tool_success_rate: 0.0 },
}
// C: window 2026-10-05T21:00:00..22:00, users=[admin@codemie.ai]
const LIVE_C = {
  overview: { total_tool_calls: 317, tool_call_success_rate: 98.7 },
  user: { session_count: 1, turns: 36, tool_calls: 317, tool_success_rate: 98.7 },
}

// The exact expression OverviewView:80-83 builds for the TOOL CALLS card subtitle.
const overviewSubtitle = (k: { total_tool_calls: number; tool_call_success_rate: number }) =>
  k.total_tool_calls > 0 ? `${k.tool_call_success_rate.toFixed(1)}% success` : '—'

// The exact Metric buildUserMetrics produces for the modal summary tile.
const modalTile = (row: { tool_success_rate?: number; tool_calls?: number }): Metric => ({
  id: 'tool_success_rate',
  label: 'Tool Success',
  type: ColumnType.STRING,
  value: formatToolSuccess(row.tool_success_rate, row.tool_calls),
})

describe('live data — scenario A: 1 session, zero tool calls (the reported bug)', () => {
  it('Overview summary subtitle shows a dash', () => {
    expect(overviewSubtitle(LIVE_A.overview)).toBe('—')
  })

  it('Users per-user detail cell shows a dash', () => {
    expect(formatToolSuccess(LIVE_A.user.tool_success_rate, LIVE_A.user.tool_calls)).toBe('—')
  })

  it('user modal summary tile renders a dash through the real MetricCard', () => {
    render(<MetricCard metric={modalTile(LIVE_A.user)} />)
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument()
    expect(screen.queryByText(/0\.00%/)).not.toBeInTheDocument()
  })

  it('old behaviour would have shown 0.00% for this same payload', () => {
    expect(formatMetricValue(LIVE_A.user.tool_success_rate ?? 0, MetricFormat.PERCENTAGE)).toBe(
      '0.00%'
    )
  })
})

describe('live data — scenario B: 1 tool call, none succeeded (a real 0%)', () => {
  it('Users cell keeps a real 0.00%, not a dash', () => {
    expect(formatToolSuccess(LIVE_B.user.tool_success_rate, LIVE_B.user.tool_calls)).toBe('0.00%')
  })

  it('user modal summary tile renders 0.00% through the real MetricCard', () => {
    render(<MetricCard metric={modalTile(LIVE_B.user)} />)
    expect(screen.getByText('0.00%')).toBeInTheDocument()
  })

  it('Overview summary subtitle keeps its percentage', () => {
    expect(overviewSubtitle(LIVE_B.overview)).toBe('75.0% success')
  })
})

describe('live data — scenario C: a healthy rate is untouched', () => {
  it('Users cell renders the percentage', () => {
    expect(formatToolSuccess(LIVE_C.user.tool_success_rate, LIVE_C.user.tool_calls)).toBe('98.70%')
  })

  it('Overview summary subtitle renders the percentage', () => {
    expect(overviewSubtitle(LIVE_C.overview)).toBe('98.7% success')
  })

  it('user modal summary tile renders the percentage through the real MetricCard', () => {
    render(<MetricCard metric={modalTile(LIVE_C.user)} />)
    expect(screen.getByText('98.70%')).toBeInTheDocument()
  })
})

describe('live data — A and B are distinguishable only by the counter', () => {
  it('both carry tool_success_rate 0.0', () => {
    expect(LIVE_A.user.tool_success_rate).toBe(0)
    expect(LIVE_B.user.tool_success_rate).toBe(0)
  })

  it('yet render differently, so the guard cannot be reading the rate', () => {
    const a = formatToolSuccess(LIVE_A.user.tool_success_rate, LIVE_A.user.tool_calls)
    const b = formatToolSuccess(LIVE_B.user.tool_success_rate, LIVE_B.user.tool_calls)
    expect(a).toBe('—')
    expect(b).toBe('0.00%')
    expect(a).not.toBe(b)
  })
})
