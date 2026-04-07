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

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import LeaderboardTab from '../LeaderboardTab'

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
  default: () => <div data-testid="leaderboard-filters" />,
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
  default: ({ customRenderColumns }: any) => {
    const renderUserName = customRenderColumns?.user_name
    return (
      <div data-testid="table-widget">
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
