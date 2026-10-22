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

import CostCenterDetailsPage from '@/pages/settings/administration/CostCenterDetailsPage'
import { costCentersStore } from '@/store/costCenters'
import { CostCenterDetail } from '@/types/entity/costCenter'

const { budgetManagementFlag } = vi.hoisted(() => ({
  budgetManagementFlag: vi.fn(() => [true, true] as [boolean, boolean]),
}))

vi.mock('@/hooks/useFeatureFlags', () => ({
  useBudgetManagementEnabled: () => budgetManagementFlag(),
}))

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: () => ({
    push: vi.fn(),
    params: { costCenterId: 'cc-1' },
  }),
}))

vi.mock('@/store/costCenters')

const rollupCardMock = vi.fn()
vi.mock('@/pages/settings/administration/projectsManagement/CostCenterBudgetRollupCard', () => ({
  default: (props: any) => {
    rollupCardMock(props)
    return <div data-testid="cost-center-budget-rollup-card" />
  },
}))

vi.mock('@/pages/settings/administration/projectsManagement/CostCenterProjectsManager', () => ({
  default: ({ onProjectsChanged }: any) => (
    <button type="button" data-testid="trigger-projects-changed" onClick={onProjectsChanged}>
      Linked projects
    </button>
  ),
}))

vi.mock('@/utils/toaster', () => ({
  default: { info: vi.fn(), error: vi.fn() },
}))

const mockCostCenter: CostCenterDetail = {
  id: 'cc-1',
  name: 'Engineering',
  description: 'desc',
  created_by: 'admin@epam.com',
  created_at: '2026-01-01T00:00:00Z',
  project_count: 3,
  projects: [],
}

describe('CostCenterDetailsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    budgetManagementFlag.mockReturnValue([true, true])
    vi.mocked(costCentersStore.getCostCenter).mockResolvedValue(mockCostCenter)
  })

  it('does not render the budget rollup card when budgetManagement is disabled', async () => {
    budgetManagementFlag.mockReturnValue([false, true])

    render(<CostCenterDetailsPage />)

    await waitFor(() => {
      expect(screen.getByText('Engineering')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('cost-center-budget-rollup-card')).not.toBeInTheDocument()
    expect(rollupCardMock).not.toHaveBeenCalled()
  })

  it('renders the budget rollup card wired to the loaded cost center when the flag is on', async () => {
    render(<CostCenterDetailsPage />)

    await waitFor(() => {
      expect(screen.getByTestId('cost-center-budget-rollup-card')).toBeInTheDocument()
    })
    expect(rollupCardMock).toHaveBeenCalledWith(
      expect.objectContaining({ costCenterId: 'cc-1', projectCount: 3 })
    )
  })

  it('bumps refreshKey (forcing a rollup refetch) after the cost center reloads', async () => {
    render(<CostCenterDetailsPage />)

    await waitFor(() => {
      expect(rollupCardMock).toHaveBeenCalled()
    })
    const refreshKeyAfterInitialLoad = rollupCardMock.mock.calls.at(-1)?.[0].refreshKey

    fireEvent.click(screen.getByTestId('trigger-projects-changed'))

    await waitFor(() => {
      const latestRefreshKey = rollupCardMock.mock.calls.at(-1)?.[0].refreshKey
      expect(latestRefreshKey).toBeGreaterThan(refreshKeyAfterInitialLoad)
    })
    // the reload re-fetched the cost center too, not just bumped a local counter
    expect(costCentersStore.getCostCenter).toHaveBeenCalledTimes(2)
  })
})
