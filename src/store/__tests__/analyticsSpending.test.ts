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

import { describe, it, expect, vi, beforeEach } from 'vitest'

import { analyticsStore } from '@/store/analytics'
import api from '@/utils/api'

// Asserted at the HTTP layer rather than against fetchTabularData: fetchUserProjectSpending
// deliberately bypasses it (see below), so spying on it would only prove an internal detail.
// The endpoint and params are the actual contract with the backend.
const mockOk = () =>
  vi.spyOn(api, 'get').mockResolvedValue({
    json: async () => ({ data: { columns: [], rows: [] } }),
  } as unknown as Response)

describe('analytics spending fetchers', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('requests user project spending for one user and sends no date params', async () => {
    const spy = mockOk()

    await analyticsStore.fetchUserProjectSpending('jane@epam.com')

    expect(spy).toHaveBeenCalledWith(
      'v1/analytics/user-project-spending',
      expect.objectContaining({ params: { users: ['jane@epam.com'] } })
    )
  })

  it('requests project member spending for one project', async () => {
    const spy = mockOk()

    await analyticsStore.fetchProjectMemberSpending('project-6')

    expect(spy).toHaveBeenCalledWith(
      'v1/analytics/project-member-spending',
      expect.objectContaining({ params: expect.objectContaining({ projects: ['project-6'] }) })
    )
  })

  // The endpoint paginates (20 rows by default); members past the first page used to render "-".
  it('fetches every page of project member spending and merges the rows', async () => {
    const page = (pageIndex: number, userIds: string[], hasMore: boolean) =>
      ({
        json: async () => ({
          data: { columns: [{ id: 'user_id' }], rows: userIds.map((user_id) => ({ user_id })) },
          pagination: { page: pageIndex, per_page: 2, total_count: 3, has_more: hasMore },
        }),
      } as unknown as Response)
    const spy = vi
      .spyOn(api, 'get')
      .mockResolvedValueOnce(page(0, ['u-1', 'u-2'], true))
      .mockResolvedValueOnce(page(1, ['u-3'], false))

    const result = await analyticsStore.fetchProjectMemberSpending('project-6')

    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy).toHaveBeenNthCalledWith(
      1,
      'v1/analytics/project-member-spending',
      expect.objectContaining({ params: expect.objectContaining({ page: 0, per_page: 1000 }) })
    )
    expect(spy).toHaveBeenNthCalledWith(
      2,
      'v1/analytics/project-member-spending',
      expect.objectContaining({ params: expect.objectContaining({ page: 1, per_page: 1000 }) })
    )
    expect(result?.data.rows.map((row) => row.user_id)).toEqual(['u-1', 'u-2', 'u-3'])
  })

  it('returns null when a later page fails, rather than a partial member list', async () => {
    vi.spyOn(api, 'get')
      .mockResolvedValueOnce({
        json: async () => ({
          data: { columns: [], rows: [{ user_id: 'u-1' }] },
          pagination: { page: 0, per_page: 1, total_count: 2, has_more: true },
        }),
      } as unknown as Response)
      .mockRejectedValueOnce(new Error('boom'))

    const result = await analyticsStore.fetchProjectMemberSpending('project-6')

    expect(result).toBeNull()
  })

  // Regression guard for the per-row cancellation bug: fetchTabularData keys its
  // AbortController by metric type alone, so routing through it made every expanded row
  // abort the previous row's in-flight request. Two concurrent fetches must both complete.
  it('does not cancel a previous user request when a second one starts', async () => {
    mockOk()

    const [first, second] = await Promise.all([
      analyticsStore.fetchUserProjectSpending('jane@epam.com'),
      analyticsStore.fetchUserProjectSpending('john@epam.com'),
    ])

    expect(first).not.toBeNull()
    expect(second).not.toBeNull()
  })
})
