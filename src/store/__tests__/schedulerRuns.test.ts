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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { schedulerRunsStore } from '@/store/schedulerRuns'
import api from '@/utils/api'

const mockToasterError = vi.fn()

vi.mock('@/utils/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}))

vi.mock('@/utils/toaster', () => ({
  default: {
    error: (...args: unknown[]) => mockToasterError(...args),
    success: vi.fn(),
  },
}))

const mockRunsResponse = {
  items: [
    {
      id: 'run-1',
      status: 'completed',
      trigger: 'scheduled',
      startedAt: '2026-09-09T06:00:00Z',
      finishedAt: '2026-09-09T06:00:18Z',
      durationMs: 18000,
      executionId: 'exec-1',
    },
  ],
  pagination: { page: 0, per_page: 10, total: 1, pages: 1 },
}

const mockStatsResponse = {
  total: 200,
  completed: 170,
  failed: 20,
  running: 5,
  cancelled: 5,
  successRate: 89.47,
  averageDurationMs: 28400,
}

describe('schedulerRunsStore.fetchRuns', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    schedulerRunsStore.runs = []
    schedulerRunsStore.pagination = { page: 0, perPage: 10, totalPages: 0, totalCount: 0 }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls GET /v1/scheduler-runs with schedulerId and populates store', async () => {
    vi.mocked(api.get).mockResolvedValue({
      json: async () => mockRunsResponse,
    } as Response)

    await schedulerRunsStore.fetchRuns({ schedulerId: 'sched-1', page: 0, pageSize: 10 })

    expect(api.get).toHaveBeenCalledWith('/v1/scheduler-runs', {
      params: expect.objectContaining({ schedulerId: 'sched-1', page: 0, pageSize: 10 }),
    })
    expect(schedulerRunsStore.runs).toHaveLength(1)
    expect(schedulerRunsStore.runs[0].id).toBe('run-1')
    expect(schedulerRunsStore.pagination.totalCount).toBe(1)
  })

  it('passes optional status filter', async () => {
    vi.mocked(api.get).mockResolvedValue({
      json: async () => ({ ...mockRunsResponse, items: [] }),
    } as Response)

    await schedulerRunsStore.fetchRuns({ schedulerId: 'sched-1', status: 'failed' })

    expect(api.get).toHaveBeenCalledWith('/v1/scheduler-runs', {
      params: expect.objectContaining({ schedulerId: 'sched-1', status: 'failed' }),
    })
  })
})

describe('schedulerRunsStore.fetchStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    schedulerRunsStore.stats = null
  })

  it('calls GET /v1/scheduler-runs/stats and populates stats', async () => {
    vi.mocked(api.get).mockResolvedValue({
      json: async () => mockStatsResponse,
    } as Response)

    await schedulerRunsStore.fetchStats({ schedulerId: 'sched-1' })

    expect(api.get).toHaveBeenCalledWith('/v1/scheduler-runs/stats', {
      params: expect.objectContaining({ schedulerId: 'sched-1' }),
    })
    expect(schedulerRunsStore.stats?.total).toBe(200)
    expect(schedulerRunsStore.stats?.successRate).toBe(89.47)
  })
})
