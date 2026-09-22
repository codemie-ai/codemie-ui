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

import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { useFeatureFlag } from '@/hooks/useFeatureFlags'
import { userStore } from '@/store'
import { AnalyticsDashboard as AnalyticsDashboardType } from '@/types/analytics'

import AnalyticsPage from '../AnalyticsPage'

const mockSetSearchParams = vi.hoisted(() => vi.fn())

const mockSearchParams = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useSearchParams: vi.fn(() => [mockSearchParams, mockSetSearchParams]),
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
    loading: {},
    error: {},
    dashboards: [{ id: 'some-custom-dashboard-id', name: 'Test Dashboard', sections: [] }],
    loadDashboards: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('../hooks/useAnalyticsFilters', () => ({
  useAnalyticsFilters: vi.fn(() => ({
    filters: {},
    handleFilterChange: vi.fn(),
  })),
}))

vi.mock('../components/AnalyticsDashboard', () => ({
  default: ({ activeTab, isCliAnalyticsEnabled, isLeaderboardEnabled }) => (
    <div
      data-testid="analytics-dashboard"
      data-active-tab={activeTab}
      data-cli-analytics-enabled={isCliAnalyticsEnabled}
      data-leaderboard-enabled={isLeaderboardEnabled}
    />
  ),
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

  it('should show Edit Dashboard button when tab is a custom dashboard id', async () => {
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === 'tab') return 'some-custom-dashboard-id'
      return null
    })

    render(<AnalyticsPage />)

    await waitFor(() => expect(screen.getByText('Edit Dashboard')).toBeInTheDocument())
  })

  it('should NOT show Edit Dashboard button when tab is insights', () => {
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === 'tab') return 'insights'
      return null
    })

    render(<AnalyticsPage />)

    expect(screen.queryByText('Edit Dashboard')).not.toBeInTheDocument()
  })

  it('should NOT show Edit Dashboard button when tab is cliAnalytics', () => {
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === 'tab') return 'cliAnalytics'
      return null
    })

    render(<AnalyticsPage />)

    expect(screen.queryByText('Edit Dashboard')).not.toBeInTheDocument()
  })
})

describe('AnalyticsPage - CLI Analytics feature flag gate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useFeatureFlag).mockImplementation((flag: string) => {
      if (flag === 'feature:dashboardCustomization') return [true, true]
      if (flag === 'aiChampionsLeaderboard') return [true, true]
      return [false, true]
    })
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === 'tab') return 'insights'
      return null
    })
    userStore.user = {
      userId: 'test-user',
      email: 'test@test.com',
      isAdmin: true,
      isAuthenticated: true,
    }
  })

  it('passes isCliAnalyticsEnabled=true when admin and flag enabled', () => {
    vi.mocked(useFeatureFlag).mockImplementation((flag: string) => {
      if (flag === 'feature:dashboardCustomization') return [true, true]
      if (flag === 'aiChampionsLeaderboard') return [true, true]
      if (flag === 'features:cliAnalytics') return [true, true]
      return [false, true]
    })
    render(<AnalyticsPage />)
    expect(screen.getByTestId('analytics-dashboard')).toHaveAttribute(
      'data-cli-analytics-enabled',
      'true'
    )
  })

  it('passes isCliAnalyticsEnabled=false when flag disabled', () => {
    vi.mocked(useFeatureFlag).mockImplementation((flag: string) => {
      if (flag === 'feature:dashboardCustomization') return [true, true]
      if (flag === 'aiChampionsLeaderboard') return [true, true]
      if (flag === 'features:cliAnalytics') return [false, true]
      return [true, true]
    })
    render(<AnalyticsPage />)
    expect(screen.getByTestId('analytics-dashboard')).toHaveAttribute(
      'data-cli-analytics-enabled',
      'false'
    )
  })

  it('passes isCliAnalyticsEnabled=true for a project admin who is not a global admin', () => {
    userStore.user = {
      userId: 'test-user',
      email: 'test@test.com',
      isAdmin: false,
      isAuthenticated: true,
      projects: [
        { name: 'other-project', is_project_admin: false },
        { name: 'owned-project', is_project_admin: true },
      ],
    }
    vi.mocked(useFeatureFlag).mockImplementation((flag: string) => {
      if (flag === 'feature:dashboardCustomization') return [true, true]
      if (flag === 'aiChampionsLeaderboard') return [true, true]
      if (flag === 'features:cliAnalytics') return [true, true]
      return [false, true]
    })
    render(<AnalyticsPage />)
    expect(screen.getByTestId('analytics-dashboard')).toHaveAttribute(
      'data-cli-analytics-enabled',
      'true'
    )
  })

  it('passes isCliAnalyticsEnabled=false when the user admins no project', () => {
    userStore.user = {
      userId: 'test-user',
      email: 'test@test.com',
      isAdmin: false,
      isAuthenticated: true,
      projects: [{ name: 'other-project', is_project_admin: false }],
    }
    vi.mocked(useFeatureFlag).mockImplementation((flag: string) => {
      if (flag === 'feature:dashboardCustomization') return [true, true]
      if (flag === 'aiChampionsLeaderboard') return [true, true]
      if (flag === 'features:cliAnalytics') return [true, true]
      return [false, true]
    })
    render(<AnalyticsPage />)
    expect(screen.getByTestId('analytics-dashboard')).toHaveAttribute(
      'data-cli-analytics-enabled',
      'false'
    )
  })

  it('passes isCliAnalyticsEnabled=false when not admin even with flag enabled', () => {
    userStore.user = {
      userId: 'test-user',
      email: 'test@test.com',
      isAdmin: false,
      isAuthenticated: true,
    }
    vi.mocked(useFeatureFlag).mockImplementation((flag: string) => {
      if (flag === 'feature:dashboardCustomization') return [true, true]
      if (flag === 'aiChampionsLeaderboard') return [true, true]
      if (flag === 'features:cliAnalytics') return [true, true]
      return [false, true]
    })
    render(<AnalyticsPage />)
    expect(screen.getByTestId('analytics-dashboard')).toHaveAttribute(
      'data-cli-analytics-enabled',
      'false'
    )
  })

  it('redirects an unrecognised tab to insights once dashboards have loaded', async () => {
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === 'tab') return 'stale-unknown-tab'
      return null
    })
    render(<AnalyticsPage />)
    await waitFor(() =>
      expect(mockSetSearchParams).toHaveBeenCalledWith({ tab: 'insights' }, { replace: true })
    )
  })

  it.each(Object.values(AnalyticsDashboardType))(
    'does not redirect the built-in %s tab once dashboards have loaded',
    async (builtInTab) => {
      vi.mocked(useFeatureFlag).mockImplementation((flag: string) => {
        if (flag === 'feature:dashboardCustomization') return [true, true]
        if (flag === 'aiChampionsLeaderboard') return [true, true]
        if (flag === 'features:cliAnalytics') return [true, true]
        return [false, true]
      })
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'tab') return builtInTab
        return null
      })
      render(<AnalyticsPage />)
      await waitFor(() =>
        expect(screen.getByTestId('analytics-dashboard')).toHaveAttribute(
          'data-active-tab',
          builtInTab
        )
      )
      expect(mockSetSearchParams).not.toHaveBeenCalled()
    }
  )

  it('redirects the cliAnalytics tab to insights when its feature flag is disabled', async () => {
    vi.mocked(useFeatureFlag).mockImplementation((flag: string) => {
      if (flag === 'feature:dashboardCustomization') return [true, true]
      if (flag === 'aiChampionsLeaderboard') return [true, true]
      if (flag === 'features:cliAnalytics') return [false, true]
      return [false, true]
    })
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === 'tab') return AnalyticsDashboardType.cliAnalytics
      return null
    })
    render(<AnalyticsPage />)
    await waitFor(() =>
      expect(mockSetSearchParams).toHaveBeenCalledWith({ tab: 'insights' }, { replace: true })
    )
  })

  it('redirects the leaderboard tab to insights when its feature flag is disabled', async () => {
    vi.mocked(useFeatureFlag).mockImplementation((flag: string) => {
      if (flag === 'feature:dashboardCustomization') return [true, true]
      if (flag === 'aiChampionsLeaderboard') return [false, true]
      if (flag === 'features:cliAnalytics') return [true, true]
      return [false, true]
    })
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === 'tab') return AnalyticsDashboardType.leaderboard
      return null
    })
    render(<AnalyticsPage />)
    await waitFor(() =>
      expect(mockSetSearchParams).toHaveBeenCalledWith({ tab: 'insights' }, { replace: true })
    )
  })
})
