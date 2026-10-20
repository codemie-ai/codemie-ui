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

import { act, render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { ProjectBudget } from '@/types/entity/projectBudget'
import { ProjectDetail, ProjectSpendingWidgetRow } from '@/types/entity/projectManagement'

import ProjectBudgetsSection from '../ProjectBudgetsSection'

// helpers.ts imports @/router which cascades into the a2ui build-time failure.
vi.mock('@/utils/helpers', () => ({
  formatDateTime: (d: string | null) => d ?? '',
  formatCurrency: (v: number | null) => (v == null ? '—' : `$${v.toFixed(2)}`),
}))

// Capture the props the budget modal receives so the wiring can be asserted.
const modalProps = vi.fn()
vi.mock('@/pages/settings/administration/components/UnifiedProjectBudgetModal', () => ({
  default: (props: Record<string, unknown>) => {
    modalProps(props)
    return <div data-testid="unified-modal" />
  },
}))

const listProjectBudgets = vi.fn()
const listProjectBudgetGroups = vi.fn()
vi.mock('@/store/projectBudgets', () => ({
  projectBudgetsStore: {
    listProjectBudgets: (...a: unknown[]) => listProjectBudgets(...a),
    listProjectBudgetGroups: (...a: unknown[]) => listProjectBudgetGroups(...a),
  },
}))

vi.mock('@/utils/toaster', () => ({
  default: { info: vi.fn(), error: vi.fn(), success: vi.fn() },
}))

const project = {
  name: 'p1',
  project_type: 'shared',
  user_count: 1,
  admin_count: 1,
  chargeback_enabled: true,
  chargeback_attribution: 'cost_center',
  cost_center_id: 'cc-1',
  cost_center_name: 'eng-ops',
  members: [],
} as unknown as ProjectDetail

describe('ProjectBudgetsSection chargeback prop wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listProjectBudgets.mockResolvedValue([])
    listProjectBudgetGroups.mockResolvedValue([])
  })

  it('threads project and canManageBudgets to the budget modal (CR-004)', async () => {
    render(<ProjectBudgetsSection projectName="p1" access="full" project={project} />)

    await waitFor(() => expect(modalProps).toHaveBeenCalled())

    const props = modalProps.mock.calls.at(-1)![0]
    expect(props.projectName).toBe('p1')
    expect(props.project).toEqual(project)
    expect(props.canManageBudgets).toBe(true)
  })

  it('does not render the budget modal when access is not manage (CR-004)', async () => {
    render(<ProjectBudgetsSection projectName="p1" access="distribution" />)
    await waitFor(() => expect(listProjectBudgets).toHaveBeenCalled())
    expect(screen.queryByTestId('unified-modal')).not.toBeInTheDocument()
  })

  it('reloads budgets and the project after the budget modal saves', async () => {
    const onProjectChanged = vi.fn()
    render(
      <ProjectBudgetsSection
        projectName="p1"
        access="full"
        project={project}
        onProjectChanged={onProjectChanged}
      />
    )

    await waitFor(() => expect(modalProps).toHaveBeenCalled())
    listProjectBudgets.mockClear()

    const { onSaved } = modalProps.mock.calls.at(-1)![0] as { onSaved: () => Promise<void> }
    await act(async () => {
      await onSaved()
    })

    // Budgets reloaded and the project refetched (chargeback lives on the project).
    expect(listProjectBudgets).toHaveBeenCalled()
    expect(onProjectChanged).toHaveBeenCalled()
  })
})

const unassignedPremiumRow: ProjectSpendingWidgetRow = {
  budget_id: 'project-3-premium_models-8ebdcd4c',
  budget_category: 'premium_models',
  is_assigned: false,
  current_spending: 0.1444,
  budget_reset_at: '2026-10-01T00:00:00Z',
  time_until_reset: '1 day',
  budget_limit: null,
  total: 0,
}

describe('ProjectBudgetsSection unassigned category spend', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listProjectBudgets.mockResolvedValue([])
    listProjectBudgetGroups.mockResolvedValue([])
  })

  it('shows the spend of a category without an active budget on its empty card', async () => {
    render(
      <ProjectBudgetsSection projectName="p1" access="view" spendingRows={[unassignedPremiumRow]} />
    )

    expect(await screen.findByText('$0.14')).toBeInTheDocument()
  })

  it('does not put assigned rows on empty cards', async () => {
    render(
      <ProjectBudgetsSection
        projectName="p1"
        access="view"
        spendingRows={[{ ...unassignedPremiumRow, is_assigned: true }]}
      />
    )

    await waitFor(() => expect(listProjectBudgets).toHaveBeenCalled())
    expect(await screen.findAllByText('— not assigned —')).toHaveLength(3)
    expect(screen.queryByText('$0.14')).not.toBeInTheDocument()
  })
})

const platformBudget = (zeroLimitMemberCount?: number): ProjectBudget => ({
  budget_id: 'p1-platform',
  name: 'Platform budget',
  project_name: 'p1',
  budget_category: 'platform',
  soft_budget: 0.24,
  max_budget: 0.3,
  budget_duration: '30d',
  provider_sync_status: null,
  member_count: 70,
  allocated_member_budget_total: 0,
  member_allocations: [],
  ...(zeroLimitMemberCount === undefined ? {} : { zero_limit_member_count: zeroLimitMemberCount }),
})

describe('ProjectBudgetsSection zero member limit warning', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listProjectBudgetGroups.mockResolvedValue([])
  })

  it('warns when members of a category have a $0.00 limit', async () => {
    listProjectBudgets.mockResolvedValue([platformBudget(70)])
    render(<ProjectBudgetsSection projectName="p1" access="view" />)

    expect(
      await screen.findByText(
        'Platform budget is too small to split across members: 70 members have a $0.00 limit and cannot spend. Increase the budget or turn off Enforce member spend limits.'
      )
    ).toBeInTheDocument()
  })

  it('uses singular wording for one member', async () => {
    listProjectBudgets.mockResolvedValue([platformBudget(1)])
    render(<ProjectBudgetsSection projectName="p1" access="view" />)

    expect(await screen.findByText(/1 member has a \$0\.00 limit/)).toBeInTheDocument()
  })

  it.each([0, undefined])('does not warn when zero_limit_member_count is %s', async (count) => {
    listProjectBudgets.mockResolvedValue([platformBudget(count)])
    render(<ProjectBudgetsSection projectName="p1" access="view" />)

    await waitFor(() => expect(listProjectBudgets).toHaveBeenCalled())
    expect(await screen.findByText('Budget categories')).toBeInTheDocument()
    expect(screen.queryByText(/\$0\.00 limit/)).not.toBeInTheDocument()
  })
})
