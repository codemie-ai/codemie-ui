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

import { act, render, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { ProjectDetail } from '@/types/entity/projectManagement'

import ProjectBudgetsSection from '../ProjectBudgetsSection'

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

  it('passes null project and canManageBudgets=false through by default (CR-004)', async () => {
    render(<ProjectBudgetsSection projectName="p1" access="distribution" />)

    await waitFor(() => expect(modalProps).toHaveBeenCalled())

    const props = modalProps.mock.calls.at(-1)![0]
    expect(props.project).toBeNull()
    expect(props.canManageBudgets).toBe(false)
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
