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

import { ProjectDetail } from '@/types/entity/projectManagement'

import ProjectOverviewSection from '../ProjectOverviewSection'

// helpers.ts imports @/router which cascades into the a2ui build-time failure.
vi.mock('@/utils/helpers', () => ({
  formatDateTime: (d: string | null) => d ?? '',
  pluralize: (n: number, word: string) => (n === 1 ? word : `${word}s`),
}))

vi.mock('@/hooks/useFeatureFlags', () => ({
  useFeatureFlag: () => [false, true] as [boolean, boolean],
}))

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/store/projectBudgets', () => ({
  projectBudgetsStore: { listProjectBudgets: vi.fn().mockResolvedValue([]) },
}))

vi.mock('@/store/user', () => ({
  userStore: { getUserById: vi.fn().mockRejectedValue(new Error('not found')) },
}))

vi.mock('@/store/analytics', () => ({
  analyticsStore: { fetchSummaries: vi.fn().mockResolvedValue(null) },
}))

vi.mock('@/pages/analytics/components/widgets/SpendingProgressBar', () => ({
  default: () => <div />,
}))

vi.mock('../components/ProjectOverviewIndicators', () => ({
  default: () => <div />,
}))

vi.mock('../ProjectBudgetsSection', () => ({
  ProjectBudgetManagementControl: () => <div />,
}))

const renderOverview = (overrides: Partial<ProjectDetail> = {}) =>
  render(
    <ProjectOverviewSection
      project={
        {
          name: 'p1',
          project_type: 'shared',
          user_count: 1,
          admin_count: 1,
          members: [],
          ...overrides,
        } as ProjectDetail
      }
      onCostCenterOpen={vi.fn()}
      budgetsAccess="view"
      canViewBudgets={false}
      canManageProject={false}
    />
  )

describe('ProjectOverviewSection - CLI Analytics status (EPMCDME-16025)', () => {
  it('O1 shows "Enabled" when the project carries cli_analytics_enabled: true', () => {
    renderOverview({ cli_analytics_enabled: true })

    expect(screen.getByText('CLI Analytics')).toBeTruthy()
    expect(screen.getByText('Enabled', { selector: 'div' })).toBeTruthy()
  })

  it('O1 shows "Disabled" when the project carries cli_analytics_enabled: false', () => {
    renderOverview({ cli_analytics_enabled: false })

    const label = screen.getByText('CLI Analytics')
    expect(label.nextElementSibling?.textContent).toBe('Disabled')
  })

  it('O2 renders no status when the key is absent', () => {
    renderOverview({})

    expect(screen.queryByText('CLI Analytics')).toBeNull()
  })

  it('O3 shows "Disabled" for a personal project carrying false', () => {
    renderOverview({ project_type: 'personal', cli_analytics_enabled: false })

    const label = screen.getByText('CLI Analytics')
    expect(label.nextElementSibling?.textContent).toBe('Disabled')
  })

  it('O4 shows "Enabled" for true', () => {
    renderOverview({ cli_analytics_enabled: true })

    const label = screen.getByText('CLI Analytics')
    expect(label.nextElementSibling?.textContent).toBe('Enabled')
  })
})
