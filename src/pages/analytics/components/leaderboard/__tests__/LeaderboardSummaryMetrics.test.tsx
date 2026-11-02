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

import { ABSENT_VALUE_MARKER } from '@/utils/analyticsFormatters'

import LeaderboardSummaryMetrics from '../LeaderboardSummaryMetrics'

// The shape the leaderboard scorer writes: one figure per money pot, each followed by the three keys
// that qualify *that* figure, all flat in `summary_metrics`.
const buildSummaryMetrics = (
  overrides: Record<string, number | boolean | null> = {}
): Record<string, number | boolean | null> => ({
  cli_sessions: 12,
  total_spend: 1234.5,
  total_spend_unavailable: false,
  total_spend_partial: false,
  total_spend_missing_amount: null,
  cli_spend: 4.25,
  cli_spend_unavailable: false,
  cli_spend_partial: false,
  cli_spend_missing_amount: null,
  ...overrides,
})

/** The value paragraph of the tile labelled `label`, or `null` when no such tile is rendered. */
const tileValue = (label: string): string | null =>
  screen.queryByText(label)?.nextElementSibling?.textContent ?? null

describe('LeaderboardSummaryMetrics', () => {
  it('renders a priced figure as currency', () => {
    render(<LeaderboardSummaryMetrics summaryMetrics={buildSummaryMetrics()} />)

    expect(tileValue('Total Spend')).toBe('$1,234.50')
    expect(tileValue('CLI Spend')).toBe('$4.25')
  })

  it('renders the absent marker, and does not crash, when a figure is null', () => {
    render(
      <LeaderboardSummaryMetrics summaryMetrics={buildSummaryMetrics({ total_spend: null })} />
    )

    expect(tileValue('Total Spend')).toBe(ABSENT_VALUE_MARKER)
    // The other pot is untouched: absence is per figure, not per panel.
    expect(tileValue('CLI Spend')).toBe('$4.25')
  })

  it('keeps a measured zero distinguishable from an absent figure', () => {
    render(<LeaderboardSummaryMetrics summaryMetrics={buildSummaryMetrics({ cli_spend: 0 })} />)

    expect(tileValue('CLI Spend')).toBe('$0.00')
  })

  it('annotates a partial figure on its own tile', () => {
    render(
      <LeaderboardSummaryMetrics
        summaryMetrics={buildSummaryMetrics({
          total_spend_partial: true,
          total_spend_missing_amount: 12.5,
        })}
      />
    )

    expect(tileValue('Total Spend')).toBe('$1,234.50 (at least; $12.50 unattributed)')
    // The annotation qualifies one figure only; the other must not inherit it.
    expect(tileValue('CLI Spend')).toBe('$4.25')
  })

  it('annotates an unavailable figure it could still partly price', () => {
    render(
      <LeaderboardSummaryMetrics
        summaryMetrics={buildSummaryMetrics({ cli_spend_unavailable: true })}
      />
    )

    expect(tileValue('CLI Spend')).toBe('$4.25 (incomplete data)')
  })

  it('does not render the annotation keys as metric tiles of their own', () => {
    render(
      <LeaderboardSummaryMetrics
        summaryMetrics={buildSummaryMetrics({
          total_spend_unavailable: true,
          cli_spend_partial: true,
          cli_spend_missing_amount: 1,
        })}
      />
    )

    expect(screen.queryByText(/spend unavailable/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/spend partial/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/spend missing amount/i)).not.toBeInTheDocument()
    expect(screen.queryByText('true')).not.toBeInTheDocument()
    // Only the real metrics get a tile: two money figures plus the one count.
    expect(screen.getAllByText(/^(Total Spend|CLI Spend|CLI Sessions)$/)).toHaveLength(3)
  })

  it('renders nothing when there are no summary metrics', () => {
    const { container } = render(<LeaderboardSummaryMetrics summaryMetrics={{}} />)

    expect(container.firstChild).toBeNull()
  })
})
