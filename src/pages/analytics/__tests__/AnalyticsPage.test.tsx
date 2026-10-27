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
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { useFeatureFlag } from '@/hooks/useFeatureFlags'
import { userStore } from '@/store'
import { userStore as realUserStore } from '@/store/user'
import {
  AnalyticsDashboard as AnalyticsDashboardType,
  type AnalyticsQueryParams,
  TimePeriod,
} from '@/types/analytics'
import type { User } from '@/types/entity/user'

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

const { mockUserStore } = vi.hoisted(() => ({
  mockUserStore: {
    user: { id: 'test-user', email: 'test@test.com', isAdmin: true },
    getAnalyticsUsers: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('@/store', () => ({
  userStore: mockUserStore,
}))

vi.mock('@/store/analytics', () => ({
  analyticsStore: {
    loading: {},
    error: {},
    dashboards: [{ id: 'some-custom-dashboard-id', name: 'Test Dashboard', sections: [] }],
    loadDashboards: vi.fn().mockResolvedValue([]),
  },
}))

const { mockUseAnalyticsFilters, realHook, filtersProps } = vi.hoisted(() => ({
  mockUseAnalyticsFilters: vi.fn((): { filters: object; handleFilterChange: unknown } => ({
    filters: {},
    handleFilterChange: vi.fn(),
  })),
  realHook: { current: null as null | (() => { filters: object; handleFilterChange: unknown }) },
  filtersProps: {
    onFiltersChange: null as null | ((f: Record<string, unknown>) => void),
  },
}))

vi.mock('../hooks/useAnalyticsFilters', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hooks/useAnalyticsFilters')>()
  realHook.current = actual.useAnalyticsFilters
  return { useAnalyticsFilters: mockUseAnalyticsFilters }
})

// Real storage (setupTests.unit mocks it) so persistence survives a remount.
vi.mock('@/utils/storage', async (importOriginal) => importOriginal())

vi.mock('../components/AnalyticsDashboard', () => ({
  default: ({
    activeTab,
    isCliAnalyticsEnabled,
    isLeaderboardEnabled,
    isUsageAttributionEnabled,
    filters,
  }) => (
    <div
      data-testid="analytics-dashboard"
      data-active-tab={activeTab}
      data-cli-analytics-enabled={isCliAnalyticsEnabled}
      data-leaderboard-enabled={isLeaderboardEnabled}
      data-usage-attribution-enabled={isUsageAttributionEnabled}
      data-filters={JSON.stringify(filters ?? {})}
    />
  ),
}))

vi.mock('../components/AnalyticsFilters', () => ({
  default: ({ filters, onFiltersChange, initialUserOptions }) => {
    filtersProps.onFiltersChange = onFiltersChange
    return (
      <div data-testid="analytics-filters" data-filters={JSON.stringify(filters ?? {})}>
        {(initialUserOptions ?? []).map((o: { label: string; value: string }) => (
          <span key={o.value}>{o.label}</span>
        ))}
      </div>
    )
  },
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
        if (flag === 'features:usageAttribution') return [true, true]
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
      // Let loadDashboards resolve so the redirect effect has run before asserting.
      await act(async () => {})
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

describe('AnalyticsPage - Usage Attribution tab gate', () => {
  const USAGE_ATTRIBUTION = 'features:usageAttribution'
  const BASE_USER = { userId: 'test-user', email: 'test@test.com', isAuthenticated: true }

  const ROLES: Array<[string, Partial<User>, boolean]> = [
    ['an admin', { isAdmin: true }, true],
    ['a maintainer', { isAdmin: false, isMaintainer: true }, true],
    ['an auditor', { isAdmin: false, isAuditor: true }, true],
    [
      'a project admin',
      {
        isAdmin: false,
        projects: [{ name: 'owned-project', is_project_admin: true, is_default: false }],
      },
      false,
    ],
    [
      'a plain user',
      {
        isAdmin: false,
        projects: [{ name: 'other-project', is_project_admin: false, is_default: false }],
      },
      false,
    ],
  ]

  /** Every role with the flag on and off: the tab is there only for admins, maintainers and auditors with the flag. */
  const MATRIX = ROLES.flatMap(([role, user, allowed]) => [
    [role, user, 'on', allowed] as const,
    [role, user, 'off', false] as const,
  ])

  const mockFlag = (enabled: boolean, loaded = true) => {
    vi.mocked(useFeatureFlag).mockImplementation((flag: string) => {
      if (flag === USAGE_ATTRIBUTION) return [enabled, loaded]
      return [false, true]
    })
  }

  const openTab = (tab: string) =>
    mockSearchParams.get.mockImplementation((key: string) => (key === 'tab' ? tab : null))

  /** Lets the dashboards load: the page checks the tab of the URL only after that. */
  const dashboardsLoaded = () => act(async () => {})

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAnalyticsFilters.mockReturnValue({ filters: {}, handleFilterChange: vi.fn() })
  })

  it.each(MATRIX)('%s with the flag %s: tab shown = %s', (_role, user, flag, allowed) => {
    userStore.user = { ...BASE_USER, isAdmin: false, ...user }
    mockFlag(flag === 'on')
    openTab(AnalyticsDashboardType.insights)

    render(<AnalyticsPage />)

    expect(screen.getByTestId('analytics-dashboard')).toHaveAttribute(
      'data-usage-attribution-enabled',
      String(allowed)
    )
  })

  it.each(MATRIX)(
    '%s with the flag %s opening ?tab=usageAttribution: kept = %s',
    async (_role, user, flag, allowed) => {
      userStore.user = { ...BASE_USER, isAdmin: false, ...user }
      mockFlag(flag === 'on')
      openTab(AnalyticsDashboardType.usageAttribution)

      render(<AnalyticsPage />)
      await dashboardsLoaded()

      if (allowed) {
        expect(mockSetSearchParams).not.toHaveBeenCalled()
      } else {
        expect(mockSetSearchParams).toHaveBeenCalledWith({ tab: 'insights' }, { replace: true })
      }
    }
  )

  it('keeps ?tab=usageAttribution while the flag is still loading', async () => {
    userStore.user = { ...BASE_USER, isAdmin: true }
    mockFlag(false, false)
    openTab(AnalyticsDashboardType.usageAttribution)

    render(<AnalyticsPage />)
    await dashboardsLoaded()

    expect(mockSetSearchParams).not.toHaveBeenCalled()
  })
})

describe('AnalyticsPage - seed user fetch guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSearchParams.get.mockReturnValue(null)
    mockUserStore.getAnalyticsUsers.mockResolvedValue([])
  })

  it('calls getAnalyticsUsers unscoped when users are present without projects', async () => {
    mockUseAnalyticsFilters.mockReturnValue({
      filters: { users: ['user-abc'] },
      handleFilterChange: vi.fn(),
    })

    render(<AnalyticsPage />)

    await waitFor(() => expect(mockUserStore.getAnalyticsUsers).toHaveBeenCalledWith({}))
  })

  it('calls getAnalyticsUsers scoped to the project when both users and projects are present', async () => {
    mockUseAnalyticsFilters.mockReturnValue({
      filters: { users: ['user-abc'], projects: ['project-x'] },
      handleFilterChange: vi.fn(),
    })

    render(<AnalyticsPage />)

    await vi.waitFor(() => Promise.resolve())

    expect(mockUserStore.getAnalyticsUsers).toHaveBeenCalledWith(
      expect.objectContaining({ projects: ['project-x'] })
    )
  })
})

describe('AnalyticsPage - filters persist across remount (EPMCDME-16054)', () => {
  const STORAGE_KEY = 'user-1_filters_analytics'
  const readProp = (testId: string): AnalyticsQueryParams =>
    JSON.parse(screen.getByTestId(testId).getAttribute('data-filters')!)

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockSearchParams.get.mockReturnValue(null)
    mockUserStore.getAnalyticsUsers.mockResolvedValue([])
    realUserStore.user = { userId: 'user-1', isAdmin: true } as typeof realUserStore.user
    mockUseAnalyticsFilters.mockImplementation(() => realHook.current!())
  })

  it('restores stored users without projects and shows their labels', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ users: ['u1'] }))
    mockUserStore.getAnalyticsUsers.mockResolvedValue([
      { label: 'User One', value: 'u1' },
      { label: 'Other', value: 'u2' },
    ])

    render(<AnalyticsPage />)

    await waitFor(() => expect(mockUserStore.getAnalyticsUsers).toHaveBeenCalledWith({}))
    expect(await screen.findByText('User One')).toBeInTheDocument()
    expect(screen.queryByText('Other')).not.toBeInTheDocument()
  })

  it('keeps the chosen time period and project after unmount and remount', async () => {
    const { unmount } = render(<AnalyticsPage />)
    act(() =>
      filtersProps.onFiltersChange!({ time_period: TimePeriod.LAST_7_DAYS, projects: ['p1'] })
    )
    unmount()

    const expected = { time_period: TimePeriod.LAST_7_DAYS, projects: ['p1'] }
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(expected)

    render(<AnalyticsPage />)

    expect(readProp('analytics-filters')).toEqual(expected)
    expect(readProp('analytics-dashboard')).toEqual(expected)
  })

  it('keeps cleared filters cleared after unmount and remount', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ time_period: TimePeriod.LAST_7_DAYS, projects: ['p1'], users: ['u1'] })
    )
    const { unmount } = render(<AnalyticsPage />)
    act(() => filtersProps.onFiltersChange!({}))
    unmount()

    render(<AnalyticsPage />)

    expect(readProp('analytics-filters')).toEqual({})
    expect(readProp('analytics-dashboard')).toEqual({})
  })

  describe('deferred dashboard refetch', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('shows a change in the filter bar at once and applies rapid changes to the dashboard once, after 1000 ms', () => {
      render(<AnalyticsPage />)
      const dashboardBefore = screen.getByTestId('analytics-dashboard').getAttribute('data-filters')

      act(() => filtersProps.onFiltersChange!({ projects: ['p1'] }))
      act(() => {
        vi.advanceTimersByTime(500)
      })
      act(() => filtersProps.onFiltersChange!({ projects: ['p1', 'p2'] }))

      expect(readProp('analytics-filters')).toEqual({ projects: ['p1', 'p2'] })
      act(() => {
        vi.advanceTimersByTime(999)
      })
      expect(screen.getByTestId('analytics-dashboard').getAttribute('data-filters')).toBe(
        dashboardBefore
      )

      act(() => {
        vi.advanceTimersByTime(1)
      })
      expect(readProp('analytics-dashboard')).toEqual({ projects: ['p1', 'p2'] })
    })
  })
})
