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

import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'

import { renderPage, mockAPI } from '@/test-utils/integration'

const createLeaderboardFixture = (overrides: Record<string, unknown> = {}) => ({
  user_id: 'user-1',
  username: 'user-1',
  completed_count: 3,
  in_progress_count: 1,
  rank: 1,
  ...overrides,
})

const createLeaderboard = (count: number) =>
  Array.from({ length: count }, (_, i) =>
    createLeaderboardFixture({
      user_id: `user-${i + 1}`,
      username: `user-${i + 1}`,
      rank: i + 1,
    })
  )

describe('KatasPage - Leaderboard - Pagination (narrowed: no pagination UI in production)', () => {
  beforeEach(() => {
    mockAPI('GET', 'v1/config', [])
  })

  it('never renders pagination controls when the leaderboard has many rows', async () => {
    mockAPI('GET', 'v1/katas/leaderboard', createLeaderboard(150))

    renderPage('/katas/leaderboard')

    await waitFor(() => {
      expect(screen.getByText('#1')).toBeInTheDocument()
      // Production renders every row the API returns with no client-side slicing
      // (LeaderboardContent has no page-size limit beyond the fixed `limit=100`
      // request param) — asserting a specific row like '#101' is absent would be
      // asserting behavior the component doesn't implement. The only guarantee to
      // check here is that pagination controls never render, regardless of count.
      expect(screen.getByText('#150')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Page 2' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument()
  })

  it('never renders pagination controls when the leaderboard has few rows', async () => {
    mockAPI('GET', 'v1/katas/leaderboard', createLeaderboard(3))

    renderPage('/katas/leaderboard')

    await waitFor(() => {
      expect(screen.getByText('#1')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Page 2' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument()
  })

  it('always requests the leaderboard with the fixed limit of 100', async () => {
    mockAPI('GET', 'v1/katas/leaderboard', createLeaderboard(10))

    renderPage('/katas/leaderboard')

    await waitFor(() => {
      expect(screen.getByText('#1')).toBeInTheDocument()
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('limit=100'),
      expect.anything()
    )
  })
})
