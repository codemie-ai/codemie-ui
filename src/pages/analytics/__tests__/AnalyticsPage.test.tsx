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
import { describe, it, expect, vi, beforeEach } from 'vitest'

import AnalyticsPage from '../AnalyticsPage'

const mockSearchParams = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useSearchParams: vi.fn(() => [mockSearchParams]),
  }
})

vi.mock('@/hooks/useFeatureFlags', () => ({
  useFeatureFlag: vi.fn((flag: string) => {
    if (flag === 'feature:dashboardCustomization') return [true, true]
    if (flag === 'aiChampionsLeaderboard') return [true, true]
    return [false, true]
  }),
}))

vi.mock('@/store', () => ({
  userStore: {
    user: { id: 'test-user', email: 'test@test.com', isAdmin: true },
  },
}))

vi.mock('@/store/analytics', () => ({
  analyticsStore: {
    aiAdoptionConfig: null,
    loading: {},
    error: {},
    loadDashboards: vi.fn().mockResolvedValue([]),
    fetchAiAdoptionConfig: vi.fn().mockResolvedValue(null),
  },
}))

vi.mock('../hooks/useAnalyticsFilters', () => ({
  useAnalyticsFilters: vi.fn(() => ({
    filters: {},
    handleFilterChange: vi.fn(),
  })),
}))

vi.mock('../components/AnalyticsDashboard', () => ({
  default: () => <div data-testid="analytics-dashboard" />,
}))

vi.mock('../components/AnalyticsFilters', () => ({
  default: () => <div data-testid="analytics-filters" />,
}))

vi.mock('../components/DashboardListForm/DashboardListForm', () => ({
  default: () => <div data-testid="dashboard-list-form" />,
}))

vi.mock('@/components/Layouts/Layout/PageLayout', () => ({
  default: ({ children, rightContent }: any) => (
    <div>
      <div data-testid="right-content">{rightContent}</div>
      {children}
    </div>
  ),
}))

vi.mock('@/components/Sidebar', () => ({
  default: ({ children }: any) => <div data-testid="sidebar">{children}</div>,
}))

vi.mock('@/components/Button', () => ({
  default: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))

// Mock SVG imports
vi.mock('@/assets/icons/configuration.svg?react', () => ({
  default: () => <span>ConfigurationIcon</span>,
}))

vi.mock('@/assets/icons/configure.svg?react', () => ({
  default: () => <span>ConfigureIcon</span>,
}))

vi.mock('@/assets/icons/edit.svg?react', () => ({
  default: () => <span>EditIcon</span>,
}))

describe('AnalyticsPage - isCustomDashboard excludes leaderboard tab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should NOT show Edit Dashboard button when tab is leaderboard', () => {
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === 'tab') return 'leaderboard'
      return null
    })

    render(<AnalyticsPage />)

    expect(screen.queryByText('Edit Dashboard')).not.toBeInTheDocument()
  })

  it('should show Edit Dashboard button when tab is a custom dashboard id', () => {
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === 'tab') return 'some-custom-dashboard-id'
      return null
    })

    render(<AnalyticsPage />)

    expect(screen.getByText('Edit Dashboard')).toBeInTheDocument()
  })

  it('should NOT show Edit Dashboard button when tab is insights', () => {
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === 'tab') return 'insights'
      return null
    })

    render(<AnalyticsPage />)

    expect(screen.queryByText('Edit Dashboard')).not.toBeInTheDocument()
  })

  it('should NOT show Edit Dashboard button when tab is adoption', () => {
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === 'tab') return 'adoption'
      return null
    })

    render(<AnalyticsPage />)

    expect(screen.queryByText('Edit Dashboard')).not.toBeInTheDocument()
  })
})
