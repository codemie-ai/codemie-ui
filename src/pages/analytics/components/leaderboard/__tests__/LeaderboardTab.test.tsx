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

import { act, render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import LeaderboardTab from '../LeaderboardTab'

const { mockUserStore, captured } = vi.hoisted(() => ({
  mockUserStore: { user: { userId: 'user-1' } as { userId: string } | null },
  captured: {
    onFiltersChange: null as null | ((patch: Record<string, unknown>) => void),
    onSort: null as null | ((key: string) => void),
  },
}))

vi.mock('@/store/user', () => ({ userStore: mockUserStore }))
// Real storage (setupTests.unit mocks it) so the filters survive a remount.
vi.mock('@/utils/storage', async (importOriginal) => importOriginal())
vi.mock('../useLeaderboardSeasons', () => ({
  useLeaderboardSeasons: () => ({
    seasonKey: null,
    seasons: [],
    seasonsLoading: false,
    setSeasonKey: vi.fn(),
  }),
}))

const mockSetSelectedUserId = vi.fn()

vi.mock('react', async () => {
  const actual = await vi.importActual('react')
  return {
    ...actual,
    useState: vi.fn((init: unknown) => {
      // Intercept only the selectedUserId state (first useState call with null)
      if (init === null) {
        return [null, mockSetSelectedUserId]
      }
      // For filters and refreshTrigger, use real useState
      return (actual as any).useState(init)
    }),
  }
})

vi.mock('../LeaderboardFilters', () => ({
  default: ({ filters, onChange }: any) => {
    captured.onFiltersChange = onChange
    return <div data-testid="leaderboard-filters" data-filters={JSON.stringify(filters)} />
  },
}))

vi.mock('../LeaderboardFrameworkDimensions', () => ({
  default: () => <div data-testid="leaderboard-framework-dimensions" />,
}))

vi.mock('../LeaderboardTopPerformers', () => ({
  default: () => <div data-testid="leaderboard-top-performers" />,
}))

vi.mock('../LeaderboardUserDetailModal', () => ({
  default: ({ userId }: { userId: string | null }) => (
    <div data-testid="user-detail-modal" data-user-id={userId ?? ''} />
  ),
}))

vi.mock('../../widgets/BarChartWidget', () => ({
  default: () => <div data-testid="bar-chart-widget" />,
}))

vi.mock('../../widgets/DonutChartWidget', () => ({
  default: () => <div data-testid="donut-chart-widget" />,
}))

vi.mock('../../widgets/MetricsWidget', () => ({
  default: () => <div data-testid="metrics-widget" />,
}))

// Mock TableWidget to expose row data via rendered buttons
vi.mock('../../widgets/TableWidget', () => ({
  default: ({ customRenderColumns, filters, sort, onSort, actions }: any) => {
    const renderUserName = customRenderColumns?.user_name
    if (onSort) captured.onSort = onSort
    return (
      <div
        data-testid="table-widget"
        data-filters={JSON.stringify(filters ?? null)}
        data-sort={JSON.stringify(sort ?? null)}
      >
        {actions}
        {renderUserName && (
          <div data-testid="rendered-rows">
            {/* Row with user_id string */}
            {renderUserName({
              user_name: 'Alice',
              user_id: 'uid-123',
              user_email: 'alice@example.com',
            })}
            {/* Row with non-string user_id but string user_email */}
            {renderUserName({
              user_name: 'Bob',
              user_id: 42,
              user_email: 'bob@example.com',
            })}
            {/* Row with neither field as string */}
            {renderUserName({
              user_name: 'Charlie',
              user_id: undefined,
              user_email: undefined,
            })}
          </div>
        )}
      </div>
    )
  },
}))

describe('LeaderboardTab - handleRowClick', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should set selectedUserId to user_id when row has a string user_id', () => {
    render(<LeaderboardTab />)

    const buttons = screen.getAllByRole('button')
    const aliceButton = buttons.find((btn) => btn.textContent === 'Alice')
    expect(aliceButton).toBeDefined()

    fireEvent.click(aliceButton!)

    expect(mockSetSelectedUserId).toHaveBeenCalledWith('uid-123')
  })

  it('should fall back to user_email when user_id is not a string', () => {
    render(<LeaderboardTab />)

    const buttons = screen.getAllByRole('button')
    const bobButton = buttons.find((btn) => btn.textContent === 'Bob')
    expect(bobButton).toBeDefined()

    fireEvent.click(bobButton!)

    expect(mockSetSelectedUserId).toHaveBeenCalledWith('bob@example.com')
  })

  it('should not set selectedUserId when neither user_id nor user_email is a string', () => {
    render(<LeaderboardTab />)

    const buttons = screen.getAllByRole('button')
    const charlieButton = buttons.find((btn) => btn.textContent === 'Charlie')
    expect(charlieButton).toBeDefined()

    fireEvent.click(charlieButton!)

    expect(mockSetSelectedUserId).not.toHaveBeenCalled()
  })
})

describe('LeaderboardTab - filters persist across remount (EPMCDME-16054)', () => {
  const tableWidget = () =>
    screen.getAllByTestId('table-widget').find((el) => el.getAttribute('data-filters') !== 'null')!
  const tableFilters = () => JSON.parse(tableWidget().getAttribute('data-filters')!)
  const controlFilters = () =>
    JSON.parse(screen.getByTestId('leaderboard-filters').getAttribute('data-filters')!)

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockUserStore.user = { userId: 'user-1' }
  })

  it('restores tier, search and sort after unmount and remount', () => {
    const { unmount } = render(<LeaderboardTab />)
    act(() => captured.onFiltersChange!({ tier: 'gold', search: 'ann' }))
    act(() => captured.onSort!('tier_name'))
    unmount()

    render(<LeaderboardTab />)

    expect(controlFilters()).toEqual(expect.objectContaining({ tier: 'gold', search: 'ann' }))
    expect(JSON.parse(tableWidget().getAttribute('data-sort')!)).toEqual({
      sortKey: 'tier_name',
      sortOrder: 'desc',
    })
    expect(tableFilters()).toEqual(
      expect.objectContaining({
        tier: 'gold',
        search: 'ann',
        sort_by: 'tier_level',
        sort_order: 'desc',
      })
    )
  })

  it('keeps a cleared filter cleared after remount', () => {
    const { unmount } = render(<LeaderboardTab />)
    act(() => captured.onFiltersChange!({ tier: 'gold' }))
    act(() => captured.onFiltersChange!({ tier: undefined }))
    unmount()

    render(<LeaderboardTab />)

    expect(tableFilters()).not.toHaveProperty('tier')
  })

  it('keeps a reset sort reset after remount instead of restoring the default', () => {
    const { unmount } = render(<LeaderboardTab />)
    // Default is total_score desc: one click flips it to asc, the next clears it.
    act(() => captured.onSort!('total_score'))
    act(() => captured.onSort!('total_score'))
    expect(tableFilters()).not.toHaveProperty('sort_by')
    unmount()

    render(<LeaderboardTab />)

    expect(tableFilters()).not.toHaveProperty('sort_by')
    expect(tableFilters()).not.toHaveProperty('sort_order')
  })

  it('never writes Leaderboard filters to the URL', () => {
    const before = window.location.search
    render(<LeaderboardTab />)
    act(() => captured.onFiltersChange!({ tier: 'gold', search: 'ann' }))
    act(() => captured.onSort!('tier_name'))

    expect(window.location.search).toBe(before)
  })
})
