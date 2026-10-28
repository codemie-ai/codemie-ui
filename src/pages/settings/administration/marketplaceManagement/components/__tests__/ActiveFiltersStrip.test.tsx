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
import { describe, expect, it, vi } from 'vitest'

import ActiveFiltersStrip from '../ActiveFiltersStrip'

/**
 * The active-filter chip used to re-derive its own reason/tier labels with a
 * generic snake_case humaniser instead of the shared vocabulary every other
 * surface (the table, the filter dropdown) uses — the exact per-surface
 * label-drift class of bug F-32/F-68 that ReasonChip/MarketplaceCleanupFilters'
 * own comments describe avoiding (EPMCDME-14234, CR-004). These assertions
 * pin the chip's text to the canonical label, not to a plausible-looking
 * re-derivation of it.
 */
describe('ActiveFiltersStrip label vocabulary', () => {
  it('renders the reason chip with the same label ReasonChip/the cleanup table use, not a re-derived one', () => {
    render(
      <ActiveFiltersStrip
        mcp={null}
        category={null}
        reason="semantic_clone"
        tier={null}
        verdictLabel={null}
        ruleLabel={null}
        onClear={vi.fn()}
      />
    )

    // Canonical label (ReasonChip.REASON_LABEL) is "Near-identical copy" — a
    // naive humaniser would instead produce "Semantic clone".
    expect(screen.getByTestId('active-filter-reason')).toHaveTextContent('Near-identical copy')
    expect(screen.queryByText(/Semantic clone/)).not.toBeInTheDocument()
  })

  it('renders the reason chip label for purpose_duplicate with the canonical word order', () => {
    render(
      <ActiveFiltersStrip
        mcp={null}
        category={null}
        reason="purpose_duplicate"
        tier={null}
        verdictLabel={null}
        ruleLabel={null}
        onClear={vi.fn()}
      />
    )

    // Canonical is "Duplicate purpose" — a naive humaniser would instead
    // produce "Purpose duplicate" (same words, wrong order).
    expect(screen.getByTestId('active-filter-reason')).toHaveTextContent('Duplicate purpose')
  })

  it('renders the tier chip in title case, matching TierChip, not the raw all-caps API value', () => {
    render(
      <ActiveFiltersStrip
        mcp={null}
        category={null}
        reason={null}
        tier="WARM"
        verdictLabel={null}
        ruleLabel={null}
        onClear={vi.fn()}
      />
    )

    // TierChip renders 'WARM' as 'Warm'; the old humaniser only uppercased
    // the first character, so an already-uppercase value passed through
    // unchanged as 'WARM'.
    expect(screen.getByTestId('active-filter-tier')).toHaveTextContent('Warm')
    expect(screen.queryByText('WARM')).not.toBeInTheDocument()
  })
})
