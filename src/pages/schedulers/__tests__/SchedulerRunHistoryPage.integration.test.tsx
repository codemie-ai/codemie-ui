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

import { screen, waitFor, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { schedulerRunsStore } from '@/store/schedulerRuns'
import { schedulersStore } from '@/store/schedulers'
import { renderPage, mockAPI } from '@/test-utils/integration'

const mockRunsResponse = {
  items: [
    {
      id: 'run-1',
      status: 'completed',
      trigger: 'scheduled',
      startedAt: '2026-09-09T06:00:00Z',
      finishedAt: '2026-09-09T06:00:18Z',
      durationMs: 18000,
      executionId: 'exec-abc',
    },
    {
      id: 'run-2',
      status: 'failed',
      trigger: 'manual',
      startedAt: '2026-09-08T10:00:00Z',
      finishedAt: '2026-09-08T10:00:05Z',
      durationMs: 5000,
      executionId: 'exec-def',
    },
  ],
  pagination: { page: 0, per_page: 10, total: 2, pages: 1 },
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

const mockSchedulersResponse = {
  items: [
    {
      id: 'sched-1',
      name: 'Daily Jira Report',
      resource: { id: 'r1', name: 'R1', type: 'Assistant' },
      project: { id: 'p1', name: 'P1' },
      schedule: { cron: '0 9 * * 1-5', description: 'Weekdays', timezone: 'UTC', nextRunAt: null },
      isEnabled: true,
      lastRun: null,
    },
  ],
  pagination: { page: 0, per_page: 10, total: 1, pages: 1 },
}

describe('SchedulerRunHistoryPage', () => {
  beforeEach(() => {
    schedulerRunsStore.runs = []
    schedulerRunsStore.stats = null
    schedulersStore.schedulers = mockSchedulersResponse.items as typeof schedulersStore.schedulers
    mockAPI('GET', 'v1/scheduler-runs', mockRunsResponse)
    mockAPI('GET', 'v1/scheduler-runs/stats', mockStatsResponse)
    mockAPI('GET', 'v1/schedulers', mockSchedulersResponse)
  })

  afterEach(() => {
    schedulerRunsStore.runs = []
    schedulerRunsStore.stats = null
    schedulersStore.schedulers = []
  })

  it('renders run table rows from mocked GET /v1/scheduler-runs', async () => {
    renderPage('/schedulers/sched-1/runs')

    await waitFor(() => {
      expect(screen.getByText('scheduled')).toBeInTheDocument()
      expect(screen.getByText('manual')).toBeInTheDocument()
    })
  })

  it('renders the scheduler name as the widget title', async () => {
    renderPage('/schedulers/sched-1/runs')

    await waitFor(() => {
      expect(screen.getByText('Daily Jira Report')).toBeInTheDocument()
    })
  })

  it('shows stats metrics in the widget after expanding the accordion', async () => {
    renderPage('/schedulers/sched-1/runs')

    // Wait for data to load first
    await waitFor(() => {
      expect(screen.getByText('Daily Jira Report')).toBeInTheDocument()
    })

    // Expand the accordion and assert metrics
    await act(async () => {
      screen.getByRole('button', { name: 'Expand summary metrics' }).click()
    })

    await waitFor(() => {
      // AnalyticsWidget renders MetricsGrid with total runs value
      expect(screen.getByText('200')).toBeInTheDocument()
    })
  })
})
