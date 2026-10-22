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

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { costCentersStore } from '@/store/costCenters'
import { CostCenterBudgetSummary } from '@/types/entity/costCenter'

import CostCenterBudgetRollupCard from '../CostCenterBudgetRollupCard'

vi.mock('@/store/costCenters')

const { MockTooltip } = vi.hoisted(() => ({
  MockTooltip: vi.fn(() => null),
}))

vi.mock('@/components/Tooltip', () => ({
  default: MockTooltip,
}))

// Hint renders its tooltip text as Tooltip's children, mounted by Tooltip only on
// hover/trigger - not queryable via screen.getByText. Read it from the mocked Tooltip's
// captured props instead, matched by the Hint's target selector (`#<id>`).
const getHintText = (id: string): string | undefined =>
  (MockTooltip.mock.calls as any[]).find(([props]) => props.target === `#${id}`)?.[0]?.children

describe('CostCenterBudgetRollupCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders header and category figures from the summary', async () => {
    const mockSummary: CostCenterBudgetSummary = {
      current_spending: 15.0,
      budget_limit: 60.0,
      total_percent: 25.0,
      budgets: [
        {
          budget_category: 'platform',
          budget_duration: '30d',
          soft_budget: 25.0,
          max_budget: 50.0,
          member_count: 3,
          allocated_member_budget_total: 25.0,
          current_spending: 15.0,
          excluded_count: 0,
          unsynced_count: 0,
        },
      ],
    }

    vi.mocked(costCentersStore.getCostCenterBudgetSummary).mockResolvedValue(mockSummary)

    render(<CostCenterBudgetRollupCard costCenterId="test-id" projectCount={2} />)

    await waitFor(() => {
      expect(screen.getByText('$60.00')).toBeInTheDocument() // total budget
    })
    expect(screen.getAllByText('$15.00').length).toBeGreaterThanOrEqual(1) // header + category spend
    expect(screen.getByText('25.0%')).toBeInTheDocument() // header % used
    expect(screen.getByText('Total budget · Monthly · 30d')).toBeInTheDocument()
    expect(screen.getByText('Platform')).toBeInTheDocument()
    expect(screen.getByText('$35.00')).toBeInTheDocument() // remaining: 50 - 15
    expect(screen.getByText('3 members, $25.00 allocated')).toBeInTheDocument()
  })

  it('shows "No projects linked" instead of "not assigned" when the cost center has no projects', async () => {
    const mockSummary: CostCenterBudgetSummary = {
      current_spending: 0.0,
      budget_limit: null,
      total_percent: 0.0,
      budgets: [],
    }

    vi.mocked(costCentersStore.getCostCenterBudgetSummary).mockResolvedValue(mockSummary)

    render(<CostCenterBudgetRollupCard costCenterId="test-id" projectCount={0} />)

    await waitFor(() => {
      // one per category card; the header's own "— not assigned —" (no budget_limit) is separate
      expect(screen.getAllByText('No projects linked').length).toBe(3)
    })
  })

  it('shows "— not assigned —" for a category with no budget rows at all', async () => {
    const mockSummary: CostCenterBudgetSummary = {
      current_spending: 10.0,
      budget_limit: 50.0,
      total_percent: 20.0,
      budgets: [
        {
          budget_category: 'cli',
          budget_duration: '30d',
          soft_budget: 20.0,
          max_budget: 50.0,
          member_count: 2,
          allocated_member_budget_total: 20.0,
          current_spending: 10.0,
          excluded_count: 0,
          unsynced_count: 0,
        },
      ],
    }

    vi.mocked(costCentersStore.getCostCenterBudgetSummary).mockResolvedValue(mockSummary)

    render(<CostCenterBudgetRollupCard costCenterId="test-id" projectCount={1} />)

    await waitFor(() => {
      expect(screen.getByText('CLI')).toBeInTheDocument()
    })
    // platform and premium_models are absent from `budgets` entirely
    expect(screen.getAllByText('— not assigned —').length).toBe(2)
  })

  it('shows "No projects linked" even when a stale budget summary still has an accepted row', async () => {
    const mockSummary: CostCenterBudgetSummary = {
      current_spending: 15.0,
      budget_limit: 50.0,
      total_percent: 30.0,
      budgets: [
        {
          budget_category: 'platform',
          budget_duration: '30d',
          soft_budget: 25.0,
          max_budget: 50.0,
          member_count: 3,
          allocated_member_budget_total: 25.0,
          current_spending: 15.0,
          excluded_count: 0,
          unsynced_count: 0,
        },
      ],
    }

    vi.mocked(costCentersStore.getCostCenterBudgetSummary).mockResolvedValue(mockSummary)

    // projectCount=0 disagrees with a summary that still carries an accepted budget row
    render(<CostCenterBudgetRollupCard costCenterId="test-id" projectCount={0} />)

    await waitFor(() => {
      expect(screen.getAllByText('No projects linked').length).toBe(3)
    })
    // the full category card (member/allocation line) must not render despite the accepted row
    expect(screen.queryByText('3 members, $25.00 allocated')).not.toBeInTheDocument()
  })

  it('shows "—" for % used rather than trusting total_percent when budget_limit is a genuine zero', async () => {
    const mockSummary: CostCenterBudgetSummary = {
      current_spending: 0.0,
      budget_limit: 0.0,
      total_percent: 0.0,
      budgets: [
        {
          budget_category: 'platform',
          budget_duration: '30d',
          soft_budget: 0.0,
          max_budget: 0.0,
          member_count: 0,
          allocated_member_budget_total: 0.0,
          current_spending: 0.0,
          excluded_count: 0,
          unsynced_count: 0,
        },
      ],
    }

    vi.mocked(costCentersStore.getCostCenterBudgetSummary).mockResolvedValue(mockSummary)

    render(<CostCenterBudgetRollupCard costCenterId="test-id" projectCount={1} />)

    await waitFor(() => {
      expect(screen.getByText('% used').nextSibling).toHaveTextContent('—')
    })
  })

  it('only labels the header with a reset period when every category agrees on it', async () => {
    const mixedDurationSummary: CostCenterBudgetSummary = {
      current_spending: 10.0,
      budget_limit: 80.0,
      total_percent: 12.5,
      budgets: [
        {
          budget_category: 'platform',
          budget_duration: '30d',
          soft_budget: 25.0,
          max_budget: 50.0,
          member_count: 1,
          allocated_member_budget_total: 25.0,
          current_spending: 5.0,
          excluded_count: 0,
          unsynced_count: 0,
        },
        {
          budget_category: 'cli',
          budget_duration: '7d',
          soft_budget: 15.0,
          max_budget: 30.0,
          member_count: 1,
          allocated_member_budget_total: 15.0,
          current_spending: 5.0,
          excluded_count: 0,
          unsynced_count: 0,
        },
      ],
    }

    vi.mocked(costCentersStore.getCostCenterBudgetSummary).mockResolvedValue(mixedDurationSummary)

    render(<CostCenterBudgetRollupCard costCenterId="test-id" projectCount={1} />)

    await waitFor(() => {
      expect(screen.getByText('Total budget')).toBeInTheDocument()
    })
    // two categories disagree on budget_duration (30d vs 7d) - no single period to show
    expect(screen.queryByText(/Total budget ·/)).not.toBeInTheDocument()
  })

  it('shows "Not summed: different reset periods" instead of "— not assigned —" when categories disagree', async () => {
    const mockSummary: CostCenterBudgetSummary = {
      current_spending: 10.0,
      budget_limit: null,
      total_percent: 0.0,
      budgets: [
        {
          budget_category: 'platform',
          budget_duration: '30d',
          soft_budget: 25.0,
          max_budget: 50.0,
          member_count: 1,
          allocated_member_budget_total: 25.0,
          current_spending: 5.0,
          excluded_count: 0,
          unsynced_count: 0,
        },
        {
          budget_category: 'cli',
          budget_duration: '7d',
          soft_budget: 15.0,
          max_budget: 30.0,
          member_count: 1,
          allocated_member_budget_total: 15.0,
          current_spending: 5.0,
          excluded_count: 0,
          unsynced_count: 0,
        },
      ],
    }

    vi.mocked(costCentersStore.getCostCenterBudgetSummary).mockResolvedValue(mockSummary)

    render(<CostCenterBudgetRollupCard costCenterId="test-id" projectCount={1} />)

    await waitFor(() => {
      expect(screen.getByText('Not summed: different reset periods')).toBeInTheDocument()
    })
    // the category cards still show their real limits underneath (premium_models legitimately
    // has no budget rows at all in this fixture, so its own "— not assigned —" is expected)
    expect(screen.getByText(/\$50\.00/)).toBeInTheDocument()
    expect(screen.getByText(/\$30\.00/)).toBeInTheDocument()
  })

  it('still warns about mixed periods even if budget_limit is non-null, contradicting the durations', async () => {
    // A state the backend should never produce, but the warning must not depend on
    // budget_limit's null-ness alone to decide whether the categories actually agree.
    const mockSummary: CostCenterBudgetSummary = {
      current_spending: 10.0,
      budget_limit: 80.0,
      total_percent: 12.5,
      budgets: [
        {
          budget_category: 'platform',
          budget_duration: '30d',
          soft_budget: 25.0,
          max_budget: 50.0,
          member_count: 1,
          allocated_member_budget_total: 25.0,
          current_spending: 5.0,
          excluded_count: 0,
          unsynced_count: 0,
        },
        {
          budget_category: 'cli',
          budget_duration: '7d',
          soft_budget: 15.0,
          max_budget: 30.0,
          member_count: 1,
          allocated_member_budget_total: 15.0,
          current_spending: 5.0,
          excluded_count: 0,
          unsynced_count: 0,
        },
      ],
    }

    vi.mocked(costCentersStore.getCostCenterBudgetSummary).mockResolvedValue(mockSummary)

    render(<CostCenterBudgetRollupCard costCenterId="test-id" projectCount={1} />)

    await waitFor(() => {
      expect(screen.getByText('Not summed: different reset periods')).toBeInTheDocument()
    })
    expect(screen.queryByText('$80.00')).not.toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument() // % used falls back too
  })

  it('treats an empty-string budget_duration as no duration, not a real one', async () => {
    const mockSummary: CostCenterBudgetSummary = {
      current_spending: 5.0,
      budget_limit: 50.0,
      total_percent: 10.0,
      budgets: [
        {
          budget_category: 'platform',
          // an empty string is falsy, like null, but is NOT filtered by `!= null`
          budget_duration: '' as unknown as string,
          soft_budget: 25.0,
          max_budget: 50.0,
          member_count: 1,
          allocated_member_budget_total: 25.0,
          current_spending: 5.0,
          excluded_count: 0,
          unsynced_count: 0,
        },
      ],
    }

    vi.mocked(costCentersStore.getCostCenterBudgetSummary).mockResolvedValue(mockSummary)

    render(<CostCenterBudgetRollupCard costCenterId="test-id" projectCount={1} />)

    await waitFor(() => {
      expect(screen.getByText('Total budget')).toBeInTheDocument()
    })
    // no real duration exists, so no "· —" (or any) suffix should be appended
    expect(screen.queryByText(/Total budget ·/)).not.toBeInTheDocument()
  })

  it('does not fold an unrecognized budget_category into "key spend"', async () => {
    const mockSummary: CostCenterBudgetSummary = {
      current_spending: 1000.0,
      budget_limit: null,
      total_percent: 0.0,
      budgets: [
        {
          budget_category: 'platform',
          budget_duration: '30d',
          soft_budget: 25.0,
          max_budget: 50.0,
          member_count: 1,
          allocated_member_budget_total: 25.0,
          current_spending: 600.0,
          excluded_count: 0,
          unsynced_count: 0,
        },
        {
          // a category this build's BUDGET_CATEGORY_OPTIONS doesn't know about
          budget_category: 'future_category' as unknown as 'platform',
          budget_duration: '30d',
          soft_budget: 0.0,
          max_budget: 0.0,
          member_count: 0,
          allocated_member_budget_total: 0.0,
          current_spending: 400.0,
          excluded_count: 0,
          unsynced_count: 0,
        },
      ],
    }

    vi.mocked(costCentersStore.getCostCenterBudgetSummary).mockResolvedValue(mockSummary)

    render(<CostCenterBudgetRollupCard costCenterId="test-id" projectCount={1} />)

    await waitFor(() => {
      expect(screen.getByText('Platform')).toBeInTheDocument()
    })
    // unrecognized category's 400 spend must not be silently absorbed as "key spend" -
    // only the recognized category's 600 is subtracted, leaving a non-zero (positive) gap
    // that the hint still surfaces, rather than disappearing because 1000 - 600 - 400 = 0
    expect(document.getElementById('cost-center-budget-rollup-key-spend')).toBeInTheDocument()
    expect(getHintText('cost-center-budget-rollup-key-spend')).toBe(
      'Includes $400.00 API key spend'
    )
  })

  it('surfaces a negative key-spend gap instead of silently dropping the hint', async () => {
    const mockSummary: CostCenterBudgetSummary = {
      current_spending: 500.0,
      budget_limit: null,
      total_percent: 0.0,
      budgets: [
        {
          budget_category: 'platform',
          budget_duration: '30d',
          soft_budget: 25.0,
          max_budget: 50.0,
          member_count: 1,
          allocated_member_budget_total: 25.0,
          // category cards' total (600) exceeds the header's current_spending (500)
          current_spending: 600.0,
          excluded_count: 0,
          unsynced_count: 0,
        },
      ],
    }

    vi.mocked(costCentersStore.getCostCenterBudgetSummary).mockResolvedValue(mockSummary)

    render(<CostCenterBudgetRollupCard costCenterId="test-id" projectCount={1} />)

    await waitFor(() => {
      expect(screen.getByText('Platform')).toBeInTheDocument()
    })
    expect(document.getElementById('cost-center-budget-rollup-key-spend')).toBeInTheDocument()
    expect(getHintText('cost-center-budget-rollup-key-spend')).toBe(
      "Spend figures don't reconcile: category cards total $100.00 more than this"
    )
  })

  it('shows a hint on header Spend when it includes API key spend the category cards do not', async () => {
    const mockSummary: CostCenterBudgetSummary = {
      current_spending: 1300.0,
      budget_limit: 2000.0,
      total_percent: 65.0,
      budgets: [
        {
          budget_category: 'platform',
          budget_duration: '30d',
          soft_budget: 500.0,
          max_budget: 1000.0,
          member_count: 1,
          allocated_member_budget_total: 500.0,
          current_spending: 600.0,
          excluded_count: 0,
          unsynced_count: 0,
        },
        {
          budget_category: 'cli',
          budget_duration: '30d',
          soft_budget: 500.0,
          max_budget: 1000.0,
          member_count: 1,
          allocated_member_budget_total: 500.0,
          current_spending: 400.0,
          excluded_count: 0,
          unsynced_count: 0,
        },
      ],
    }

    vi.mocked(costCentersStore.getCostCenterBudgetSummary).mockResolvedValue(mockSummary)

    render(<CostCenterBudgetRollupCard costCenterId="test-id" projectCount={1} />)

    await waitFor(() => {
      expect(screen.getByText('$1,300.00')).toBeInTheDocument()
    })
    // 1300 header spend - (600 + 400) category spend = 300 key spend
    expect(document.getElementById('cost-center-budget-rollup-key-spend')).toBeInTheDocument()
    expect(getHintText('cost-center-budget-rollup-key-spend')).toBe(
      'Includes $300.00 API key spend'
    )
  })

  it('shows no key-spend hint when header spend equals the category totals', async () => {
    const mockSummary: CostCenterBudgetSummary = {
      current_spending: 1000.0,
      budget_limit: 2000.0,
      total_percent: 50.0,
      budgets: [
        {
          budget_category: 'platform',
          budget_duration: '30d',
          soft_budget: 500.0,
          max_budget: 1000.0,
          member_count: 1,
          allocated_member_budget_total: 500.0,
          current_spending: 600.0,
          excluded_count: 0,
          unsynced_count: 0,
        },
        {
          budget_category: 'cli',
          budget_duration: '30d',
          soft_budget: 500.0,
          max_budget: 1000.0,
          member_count: 1,
          allocated_member_budget_total: 500.0,
          current_spending: 400.0,
          excluded_count: 0,
          unsynced_count: 0,
        },
      ],
    }

    vi.mocked(costCentersStore.getCostCenterBudgetSummary).mockResolvedValue(mockSummary)

    render(<CostCenterBudgetRollupCard costCenterId="test-id" projectCount={1} />)

    await waitFor(() => {
      expect(screen.getByText('$1,000.00')).toBeInTheDocument()
    })
    expect(document.getElementById('cost-center-budget-rollup-key-spend')).not.toBeInTheDocument()
  })

  it('omits the reset-period suffix entirely when no category has a duration', async () => {
    const mockSummary: CostCenterBudgetSummary = {
      current_spending: 0.0,
      budget_limit: 0.0,
      total_percent: 0.0,
      budgets: [
        {
          budget_category: 'platform',
          budget_duration: null,
          soft_budget: 0.0,
          max_budget: 0.0,
          member_count: 0,
          allocated_member_budget_total: 0.0,
          current_spending: 0.0,
          excluded_count: 0,
          unsynced_count: 0,
        },
      ],
    }

    vi.mocked(costCentersStore.getCostCenterBudgetSummary).mockResolvedValue(mockSummary)

    render(<CostCenterBudgetRollupCard costCenterId="test-id" projectCount={1} />)

    await waitFor(() => {
      expect(screen.getByText('Total budget')).toBeInTheDocument()
    })
    expect(screen.queryByText(/Total budget ·/)).not.toBeInTheDocument()
  })

  it('does not render a negative hard limit as an accepted budget', async () => {
    const mockSummary: CostCenterBudgetSummary = {
      current_spending: 0.0,
      budget_limit: null,
      total_percent: 0.0,
      budgets: [
        {
          budget_category: 'cli',
          budget_duration: '30d',
          soft_budget: 0.0,
          max_budget: -10.0,
          member_count: 0,
          allocated_member_budget_total: 0.0,
          current_spending: 0.0,
          excluded_count: 0,
          unsynced_count: 0,
        },
      ],
    }

    vi.mocked(costCentersStore.getCostCenterBudgetSummary).mockResolvedValue(mockSummary)

    render(<CostCenterBudgetRollupCard costCenterId="test-id" projectCount={1} />)

    await waitFor(() => {
      expect(screen.getByText('CLI')).toBeInTheDocument()
    })
    expect(screen.queryByText(/-10\.00/)).not.toBeInTheDocument()
    // all three category cards are empty (the header's own "— not assigned —" is separate)
    expect(screen.getAllByText('— not assigned —').length).toBeGreaterThanOrEqual(3)
  })

  it('reports invalid budget data rather than "pending sync" for a negative max_budget', async () => {
    const mockSummary: CostCenterBudgetSummary = {
      current_spending: 0.0,
      budget_limit: null,
      total_percent: 0.0,
      budgets: [
        {
          budget_category: 'cli',
          budget_duration: '30d',
          soft_budget: 0.0,
          max_budget: -10.0,
          member_count: 0,
          allocated_member_budget_total: 0.0,
          current_spending: 0.0,
          // the row also has a pending-sync count, which must not win over the negative-data message
          unsynced_count: 1,
          excluded_count: 0,
        },
      ],
    }

    vi.mocked(costCentersStore.getCostCenterBudgetSummary).mockResolvedValue(mockSummary)

    render(<CostCenterBudgetRollupCard costCenterId="test-id" projectCount={1} />)

    await waitFor(() => {
      expect(screen.getByText('Invalid budget data')).toBeInTheDocument()
    })
    expect(screen.queryByText('1 pending sync')).not.toBeInTheDocument()
  })

  it('excludes an unrecognized category from the mixed-periods hint text', async () => {
    const mockSummary: CostCenterBudgetSummary = {
      current_spending: 10.0,
      budget_limit: null,
      total_percent: 0.0,
      budgets: [
        {
          budget_category: 'platform',
          budget_duration: '30d',
          soft_budget: 25.0,
          max_budget: 50.0,
          member_count: 1,
          allocated_member_budget_total: 25.0,
          current_spending: 5.0,
          excluded_count: 0,
          unsynced_count: 0,
        },
        {
          budget_category: 'cli',
          budget_duration: '7d',
          soft_budget: 15.0,
          max_budget: 30.0,
          member_count: 1,
          allocated_member_budget_total: 15.0,
          current_spending: 5.0,
          excluded_count: 0,
          unsynced_count: 0,
        },
        {
          // unrecognized category, also with a (third, distinct) duration
          budget_category: 'future_category' as unknown as 'platform',
          budget_duration: '1d',
          soft_budget: 0.0,
          max_budget: 5.0,
          member_count: 0,
          allocated_member_budget_total: 0.0,
          current_spending: 0.0,
          excluded_count: 0,
          unsynced_count: 0,
        },
      ],
    }

    vi.mocked(costCentersStore.getCostCenterBudgetSummary).mockResolvedValue(mockSummary)

    render(<CostCenterBudgetRollupCard costCenterId="test-id" projectCount={1} />)

    await waitFor(() => {
      expect(screen.getByText('Not summed: different reset periods')).toBeInTheDocument()
    })
    const hint = getHintText('cost-center-budget-rollup-mixed-periods')
    expect(hint).toContain('Platform: Monthly · 30d')
    expect(hint).toContain('CLI: Weekly · 7d')
    expect(hint).not.toContain('future_category')
    expect(hint).not.toContain('Daily · 1d')
  })

  it("excludes a pending-sync-only category's spend from the recognized-category total", async () => {
    const mockSummary: CostCenterBudgetSummary = {
      current_spending: 100.0,
      budget_limit: null,
      total_percent: 0.0,
      budgets: [
        {
          budget_category: 'platform',
          budget_duration: '30d',
          soft_budget: 25.0,
          max_budget: 50.0,
          member_count: 1,
          allocated_member_budget_total: 25.0,
          current_spending: 20.0,
          excluded_count: 0,
          unsynced_count: 0,
        },
        {
          // recognized category, but renders no card (no accepted rows) - its spend must
          // not be subtracted out of keySpend as if it were a visible category total
          budget_category: 'cli',
          budget_duration: null,
          soft_budget: 0.0,
          max_budget: 0.0,
          member_count: 0,
          allocated_member_budget_total: 0.0,
          current_spending: 30.0,
          excluded_count: 0,
          unsynced_count: 1,
        },
      ],
    }

    vi.mocked(costCentersStore.getCostCenterBudgetSummary).mockResolvedValue(mockSummary)

    render(<CostCenterBudgetRollupCard costCenterId="test-id" projectCount={1} />)

    await waitFor(() => {
      expect(screen.getByText('Platform')).toBeInTheDocument()
    })
    // 100 header spend - 20 (platform's own card total) = 80, not 100 - 20 - 30 = 50
    expect(getHintText('cost-center-budget-rollup-key-spend')).toBe('Includes $80.00 API key spend')
  })

  it('treats a negative budget_limit as invalid rather than a real total', async () => {
    const mockSummary: CostCenterBudgetSummary = {
      current_spending: 0.0,
      budget_limit: -50.0,
      total_percent: 0.0,
      budgets: [],
    }

    vi.mocked(costCentersStore.getCostCenterBudgetSummary).mockResolvedValue(mockSummary)

    render(<CostCenterBudgetRollupCard costCenterId="test-id" projectCount={1} />)

    await waitFor(() => {
      expect(screen.getByText('Total budget')).toBeInTheDocument()
    })
    expect(screen.queryByText(/-50\.00/)).not.toBeInTheDocument()
    expect(screen.getByText('% used').nextSibling).toHaveTextContent('—')
  })

  it('clears a prior error as soon as a new fetch starts, showing the spinner not the stale error', async () => {
    let resolveSecond: (value: CostCenterBudgetSummary) => void = () => {}
    const secondRequest = new Promise<CostCenterBudgetSummary>((resolve) => {
      resolveSecond = resolve
    })

    vi.mocked(costCentersStore.getCostCenterBudgetSummary)
      .mockRejectedValueOnce(new Error('network error'))
      .mockReturnValueOnce(secondRequest)

    const { rerender } = render(
      <CostCenterBudgetRollupCard costCenterId="cost-center-a" projectCount={1} />
    )

    await waitFor(() => {
      expect(
        screen.getByText('Failed to load cost center budget summary. Please try again later.')
      ).toBeInTheDocument()
    })

    // navigate to a different cost center right after the failure
    rerender(<CostCenterBudgetRollupCard costCenterId="cost-center-b" projectCount={1} />)

    // the stale error must be gone immediately, before the new request even resolves
    expect(
      screen.queryByText('Failed to load cost center budget summary. Please try again later.')
    ).not.toBeInTheDocument()

    resolveSecond({ current_spending: 0, budget_limit: null, total_percent: 0, budgets: [] })
    await waitFor(() => {
      expect(screen.getByText('Total budget')).toBeInTheDocument()
    })
  })

  it('renders a zero hard limit as "—" instead of an empty coloured bar', async () => {
    const mockSummary: CostCenterBudgetSummary = {
      current_spending: 0.0,
      budget_limit: null,
      total_percent: 0.0,
      budgets: [
        {
          budget_category: 'platform',
          budget_duration: '30d',
          soft_budget: 0.0,
          max_budget: 0.0,
          member_count: 1,
          allocated_member_budget_total: 0.0,
          current_spending: 0.0,
          excluded_count: 0,
          unsynced_count: 0,
        },
      ],
    }

    vi.mocked(costCentersStore.getCostCenterBudgetSummary).mockResolvedValue(mockSummary)

    render(<CostCenterBudgetRollupCard costCenterId="test-id" projectCount={1} />)

    await waitFor(() => {
      expect(screen.getByText('Platform')).toBeInTheDocument()
    })
    // genuine zero hard limit renders the full card (spend/remaining/soft-limit figures) ...
    expect(screen.getByText('Remaining')).toBeInTheDocument()
    expect(screen.getAllByText('$0.00').length).toBeGreaterThan(0)
    // ... with the "—" placeholder instead of a progress bar for the undefined percentage
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('shows a pending-sync message when a category has only unsynced rows', async () => {
    const mockSummary: CostCenterBudgetSummary = {
      current_spending: 0.0,
      budget_limit: null,
      total_percent: 0.0,
      budgets: [
        {
          budget_category: 'cli',
          budget_duration: null,
          soft_budget: 0.0,
          max_budget: 0.0,
          member_count: 0,
          allocated_member_budget_total: 0.0,
          current_spending: 0.0,
          excluded_count: 0,
          unsynced_count: 1,
        },
      ],
    }

    vi.mocked(costCentersStore.getCostCenterBudgetSummary).mockResolvedValue(mockSummary)

    render(<CostCenterBudgetRollupCard costCenterId="test-id" projectCount={1} />)

    await waitFor(() => {
      expect(screen.getByText('1 pending sync')).toBeInTheDocument()
    })
  })

  it('ignores the duration of a row that renders no card when checking for mixed periods', async () => {
    const mockSummary: CostCenterBudgetSummary = {
      current_spending: 10.0,
      budget_limit: 50.0,
      total_percent: 20.0,
      budgets: [
        {
          budget_category: 'platform',
          budget_duration: '30d',
          soft_budget: 25.0,
          max_budget: 50.0,
          member_count: 1,
          allocated_member_budget_total: 25.0,
          current_spending: 10.0,
          excluded_count: 0,
          unsynced_count: 0,
        },
        {
          // excluded-only row: renders no card, so its different duration must not count
          budget_category: 'cli',
          budget_duration: '7d',
          soft_budget: 0.0,
          max_budget: 0.0,
          member_count: 0,
          allocated_member_budget_total: 0.0,
          current_spending: 0.0,
          excluded_count: 1,
          unsynced_count: 0,
        },
      ],
    }

    vi.mocked(costCentersStore.getCostCenterBudgetSummary).mockResolvedValue(mockSummary)

    render(<CostCenterBudgetRollupCard costCenterId="test-id" projectCount={1} />)

    await waitFor(() => {
      expect(screen.getByText('Total budget · Monthly · 30d')).toBeInTheDocument()
    })
    expect(screen.queryByText('Not summed: different reset periods')).not.toBeInTheDocument()
    expect(screen.getAllByText('20.0%').length).toBeGreaterThanOrEqual(1)
  })

  it('ignores stale budget rows when no projects are linked', async () => {
    const mockSummary: CostCenterBudgetSummary = {
      current_spending: 10.0,
      budget_limit: 50.0,
      total_percent: 20.0,
      budgets: [
        {
          budget_category: 'platform',
          budget_duration: '30d',
          soft_budget: 25.0,
          max_budget: 50.0,
          member_count: 1,
          allocated_member_budget_total: 25.0,
          current_spending: 10.0,
          excluded_count: 0,
          unsynced_count: 0,
        },
        {
          budget_category: 'cli',
          budget_duration: '7d',
          soft_budget: 10.0,
          max_budget: 20.0,
          member_count: 1,
          allocated_member_budget_total: 10.0,
          current_spending: 0.0,
          excluded_count: 0,
          unsynced_count: 0,
        },
      ],
    }

    vi.mocked(costCentersStore.getCostCenterBudgetSummary).mockResolvedValue(mockSummary)

    render(<CostCenterBudgetRollupCard costCenterId="test-id" projectCount={0} />)

    await waitFor(() => {
      expect(screen.getByText('Total budget')).toBeInTheDocument()
    })
    expect(screen.queryByText(/Total budget ·/)).not.toBeInTheDocument()
    expect(screen.queryByText('Not summed: different reset periods')).not.toBeInTheDocument()
    expect(screen.getByText('20.0%')).toBeInTheDocument()
    expect(screen.getAllByText('No projects linked')).toHaveLength(3)
  })

  it('shows an excluded message when a category has only duration-mismatched rows', async () => {
    const mockSummary: CostCenterBudgetSummary = {
      current_spending: 0.0,
      budget_limit: null,
      total_percent: 0.0,
      budgets: [
        {
          budget_category: 'premium_models',
          budget_duration: null,
          soft_budget: 0.0,
          max_budget: 0.0,
          member_count: 0,
          allocated_member_budget_total: 0.0,
          current_spending: 0.0,
          excluded_count: 1,
          unsynced_count: 0,
        },
      ],
    }

    vi.mocked(costCentersStore.getCostCenterBudgetSummary).mockResolvedValue(mockSummary)

    render(<CostCenterBudgetRollupCard costCenterId="test-id" projectCount={1} />)

    await waitFor(() => {
      expect(screen.getByText('1 excluded (different reset window)')).toBeInTheDocument()
    })
  })

  it('ignores a slower, stale response that resolves after a newer request started', async () => {
    const summaryFor = (spend: number): CostCenterBudgetSummary => ({
      current_spending: spend,
      budget_limit: null,
      total_percent: 0,
      budgets: [],
    })

    let resolveFirst: (value: CostCenterBudgetSummary) => void = () => {}
    let resolveSecond: (value: CostCenterBudgetSummary) => void = () => {}
    const firstRequest = new Promise<CostCenterBudgetSummary>((resolve) => {
      resolveFirst = resolve
    })
    const secondRequest = new Promise<CostCenterBudgetSummary>((resolve) => {
      resolveSecond = resolve
    })

    vi.mocked(costCentersStore.getCostCenterBudgetSummary)
      .mockReturnValueOnce(firstRequest)
      .mockReturnValueOnce(secondRequest)

    const { rerender } = render(
      <CostCenterBudgetRollupCard costCenterId="cost-center-a" projectCount={1} />
    )

    // navigate to a different cost center while the first request is still in flight
    rerender(<CostCenterBudgetRollupCard costCenterId="cost-center-b" projectCount={1} />)

    // the newer request resolves first, then the stale one resolves after it
    resolveSecond(summaryFor(222))
    await waitFor(() => {
      expect(screen.getByText('$222.00')).toBeInTheDocument()
    })

    resolveFirst(summaryFor(111))
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })

    // the stale response must not have overwritten the newer one
    expect(screen.getByText('$222.00')).toBeInTheDocument()
    expect(screen.queryByText('$111.00')).not.toBeInTheDocument()
  })

  it('shows an inline error with a working retry button on failure', async () => {
    vi.mocked(costCentersStore.getCostCenterBudgetSummary)
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({
        current_spending: 0,
        budget_limit: null,
        total_percent: 0,
        budgets: [],
      })

    render(<CostCenterBudgetRollupCard costCenterId="test-id" projectCount={1} />)

    await waitFor(() => {
      expect(
        screen.getByText('Failed to load cost center budget summary. Please try again later.')
      ).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    await waitFor(() => {
      expect(costCentersStore.getCostCenterBudgetSummary).toHaveBeenCalledTimes(2)
    })
  })
})
