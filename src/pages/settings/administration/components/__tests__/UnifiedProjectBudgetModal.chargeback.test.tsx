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
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { ProjectDetail } from '@/types/entity/projectManagement'

import UnifiedProjectBudgetModal, {
  UnifiedProjectBudgetModalProps,
} from '../UnifiedProjectBudgetModal'

// ─── Mocks ───────────────────────────────────────────────────────────────────

const chargebackFlag = vi.fn(() => [true, true] as [boolean, boolean])
const costCentersFlag = vi.fn(() => [true, true] as [boolean, boolean])

vi.mock('@/hooks/useFeatureFlags', () => ({
  useProjectChargebackEnabled: () => chargebackFlag(),
  useFeatureFlag: () => costCentersFlag(),
}))

const updateProject = vi.fn()
vi.mock('@/store/projects', () => ({
  projectsStore: {
    updateProject: (...args: unknown[]) => updateProject(...args),
  },
}))

const listProjectBudgetGroups = vi.fn()
const getProjectBudgetGroup = vi.fn()
const updateProjectBudgetGroup = vi.fn()
const createProjectBudgetGroup = vi.fn()
vi.mock('@/store/projectBudgets', () => ({
  projectBudgetsStore: {
    listProjectBudgetGroups: (...a: unknown[]) => listProjectBudgetGroups(...a),
    getProjectBudgetGroup: (...a: unknown[]) => getProjectBudgetGroup(...a),
    updateProjectBudgetGroup: (...a: unknown[]) => updateProjectBudgetGroup(...a),
    createProjectBudgetGroup: (...a: unknown[]) => createProjectBudgetGroup(...a),
  },
}))

vi.mock('@/utils/toaster', () => ({
  default: { info: vi.fn(), error: vi.fn(), success: vi.fn() },
}))

vi.mock('../UnifiedBudgetDragBar', () => ({ default: () => <div data-testid="dragbar" /> }))
vi.mock('../BudgetCategoryTable', () => ({ default: () => <div data-testid="cat-table" /> }))

vi.mock('@/components/Popup', () => ({
  default: ({ visible, children, onSubmit, submitText = 'Submit', headerContent }: any) => {
    if (!visible) return null
    return (
      <dialog open>
        {headerContent}
        {children}
        <button type="button" onClick={onSubmit}>
          {submitText}
        </button>
      </dialog>
    )
  },
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

const activePlan = {
  group_id: 'g1',
  name: 'My Budget',
  description: 'desc',
  budget_duration: '30d',
  total_amount: 1000,
  categories: [
    { category: 'platform', max_budget: 300, soft_budget: 100 },
    { category: 'cli', max_budget: 600, soft_budget: 200 },
    { category: 'premium_models', max_budget: 100, soft_budget: 50 },
  ],
}

const makeProject = (overrides: Partial<ProjectDetail> = {}): ProjectDetail =>
  ({
    name: 'p1',
    project_type: 'shared',
    user_count: 1,
    admin_count: 1,
    ...overrides,
  } as ProjectDetail)

const withCostCenter = (attribution: 'project' | 'cost_center') =>
  makeProject({
    chargeback_enabled: true,
    chargeback_attribution: attribution,
    cost_center_id: 'cc-1',
    cost_center_name: 'eng-ops',
  })

const enableToggle = () => document.getElementById('chargeback_enabled') as HTMLInputElement | null
const costCenterToggle = () =>
  document.getElementById('chargeback_use_cost_center') as HTMLInputElement | null

function Wrapper(props: Readonly<Omit<UnifiedProjectBudgetModalProps, 'visible' | 'onHide'>>) {
  const [visible, setVisible] = useState(true)
  return <UnifiedProjectBudgetModal {...props} visible={visible} onHide={() => setVisible(false)} />
}

async function renderPopulated(props: Omit<UnifiedProjectBudgetModalProps, 'visible' | 'onHide'>) {
  render(<Wrapper {...props} />)
  await waitFor(() => expect(screen.getByDisplayValue('My Budget')).toBeInTheDocument())
}

describe('UnifiedProjectBudgetModal chargeback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    chargebackFlag.mockReturnValue([true, true])
    costCentersFlag.mockReturnValue([true, true])
    listProjectBudgetGroups.mockResolvedValue([{ group_id: 'g1', deleted_at: null }])
    getProjectBudgetGroup.mockResolvedValue(activePlan)
    updateProjectBudgetGroup.mockResolvedValue({})
    createProjectBudgetGroup.mockResolvedValue({})
    updateProject.mockResolvedValue({})
  })

  it('renders the enable + cost-center toggles when the flag and permission allow', async () => {
    await renderPopulated({
      projectName: 'p1',
      project: withCostCenter('project'),
      canManageBudgets: true,
    })

    expect(enableToggle()).toBeEnabled()
    expect(costCenterToggle()).toBeEnabled()
  })

  it('does not render chargeback controls when the flag is off', async () => {
    chargebackFlag.mockReturnValue([false, true])

    await renderPopulated({
      projectName: 'p1',
      project: makeProject({ chargeback_enabled: true, chargeback_attribution: 'project' }),
      canManageBudgets: true,
    })

    expect(enableToggle()).not.toBeInTheDocument()
  })

  it('disables chargeback controls for a non-editor', async () => {
    await renderPopulated({
      projectName: 'p1',
      project: withCostCenter('project'),
      canManageBudgets: false,
    })

    expect(enableToggle()).toBeDisabled()
    expect(costCenterToggle()).toBeDisabled()
  })

  it('disables the cost-center toggle when the project has no linked cost center', async () => {
    await renderPopulated({
      projectName: 'p1',
      project: makeProject({ chargeback_enabled: true, chargeback_attribution: 'project' }),
      canManageBudgets: true,
    })

    expect(costCenterToggle()).toBeDisabled()
  })

  it('saves the chargeback enable + attribution before the budget, without a cost center id', async () => {
    const user = userEvent.setup()

    await renderPopulated({
      projectName: 'p1',
      project: withCostCenter('cost_center'),
      canManageBudgets: true,
    })

    await user.click(screen.getByRole('button', { name: 'Update Budget' }))

    await waitFor(() =>
      expect(updateProject).toHaveBeenCalledWith('p1', {
        chargeback_enabled: true,
        chargeback_attribution: 'cost_center',
      })
    )
    expect(updateProjectBudgetGroup).toHaveBeenCalled()
    expect(updateProject.mock.invocationCallOrder[0]).toBeLessThan(
      updateProjectBudgetGroup.mock.invocationCallOrder[0]
    )
  })

  it('hides the cost-center toggle and forces project attribution when cost centers are disabled', async () => {
    const user = userEvent.setup()
    costCentersFlag.mockReturnValue([false, true])

    // The project was previously attributed to a cost center, but the feature is now off.
    await renderPopulated({
      projectName: 'p1',
      project: withCostCenter('cost_center'),
      canManageBudgets: true,
    })

    // Enable toggle is still available; the cost-center attribution toggle is not.
    expect(enableToggle()).toBeInTheDocument()
    expect(costCenterToggle()).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Update Budget' }))

    // Attribution is coerced to project regardless of the stale cost_center value.
    await waitFor(() =>
      expect(updateProject).toHaveBeenCalledWith('p1', {
        chargeback_enabled: true,
        chargeback_attribution: 'project',
      })
    )
  })

  it('persists cost_center attribution when the toggle is switched on', async () => {
    const user = userEvent.setup()

    await renderPopulated({
      projectName: 'p1',
      project: withCostCenter('project'),
      canManageBudgets: true,
    })

    fireEvent.click(costCenterToggle()!)
    await user.click(screen.getByRole('button', { name: 'Update Budget' }))

    await waitFor(() =>
      expect(updateProject).toHaveBeenCalledWith('p1', {
        chargeback_enabled: true,
        chargeback_attribution: 'cost_center',
      })
    )
  })

  it('stops at a failed chargeback save, keeps the modal open, and skips the budget save', async () => {
    const user = userEvent.setup()
    updateProject.mockRejectedValue(new Error('save failed'))

    await renderPopulated({
      projectName: 'p1',
      project: withCostCenter('cost_center'),
      canManageBudgets: true,
    })

    await user.click(screen.getByRole('button', { name: 'Update Budget' }))

    await waitFor(() => expect(updateProject).toHaveBeenCalled())
    expect(updateProjectBudgetGroup).not.toHaveBeenCalled()
    expect(screen.getByText(/could not save chargeback settings/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Update Budget' })).toBeInTheDocument()
  })

  it('does not re-seed chargeback edits when the project prop changes while open', async () => {
    const user = userEvent.setup()
    const project = withCostCenter('cost_center')

    function Host() {
      const [p, setP] = useState(project)
      return (
        <>
          <button type="button" onClick={() => setP({ ...project })}>
            rerender-project
          </button>
          <UnifiedProjectBudgetModal
            visible
            onHide={() => {}}
            projectName="p1"
            project={p}
            canManageBudgets
          />
        </>
      )
    }

    render(<Host />)
    await waitFor(() => expect(screen.getByDisplayValue('My Budget')).toBeInTheDocument())

    // User switches attribution away from the seeded cost_center value.
    fireEvent.click(costCenterToggle()!)
    expect(costCenterToggle()).not.toBeChecked()

    // Parent passes a fresh project object identity while the modal stays open.
    await user.click(screen.getByRole('button', { name: 'rerender-project' }))

    // The in-progress edit must survive the re-render.
    expect(costCenterToggle()).not.toBeChecked()
  })
})
