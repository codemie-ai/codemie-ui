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
import { describe, it, expect } from 'vitest'

import { renderPage, mockAPI } from '@/test-utils/integration'

const baseRun = {
  id: 'run-123',
  scheduler: { id: 'sched-1', name: 'Daily Jira Report' },
  resource: { id: 'asst-1', name: 'Jira Reporter', type: 'Assistant' },
  project: { id: 'p1', name: 'epm-cdme' },
  status: 'completed',
  trigger: 'scheduled',
  startedAt: '2026-09-09T06:00:01Z',
  finishedAt: '2026-09-09T06:00:19Z',
  durationMs: 18000,
  executionId: 'exec-abc',
  schedulerConfig: {
    cron: '0 9 * * 1-5',
    humanReadableSchedule: 'Weekdays at 09:00',
    timezone: 'Europe/Kiev (UTC+3)',
  },
  input: { task: 'Generate the Jira report.' },
  result: { available: true, content: 'Report generated.' },
  logs: [
    {
      id: 'log-1',
      timestamp: '2026-09-09T06:00:01Z',
      level: 'info',
      message: 'Assistant started',
      step: 'execution',
    },
  ],
  metrics: { inputTokens: 1200, outputTokens: 480, cost: 0.0125 },
  conversationId: 'conv-xyz',
  resourceExecutionId: null,
}

describe('SchedulerRunDetailsPage', () => {
  it('renders Overview section from mocked GET /v1/scheduler-runs/{runId}', async () => {
    mockAPI('GET', 'v1/scheduler-runs/run-123', baseRun)
    renderPage('/schedulers/sched-1/runs/run-123')

    await waitFor(() => {
      expect(screen.getAllByText('Daily Jira Report').length).toBeGreaterThan(0)
      expect(screen.getAllByText('exec-abc').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Weekdays at 09:00').length).toBeGreaterThan(0)
    })
  })

  it('renders Input section for Assistant resource', async () => {
    mockAPI('GET', 'v1/scheduler-runs/run-123', baseRun)
    renderPage('/schedulers/sched-1/runs/run-123')

    await waitFor(() => {
      expect(screen.getByText('Generate the Jira report.')).toBeInTheDocument()
    })
  })

  it('hides Input section for Datasource resource', async () => {
    const datasourceRun = {
      ...baseRun,
      resource: { id: 'ds-1', name: 'My Datasource', type: 'Datasource' },
      input: { task: 'Should not show' },
    }
    mockAPI('GET', 'v1/scheduler-runs/run-123', datasourceRun)
    renderPage('/schedulers/sched-1/runs/run-123')

    await waitFor(() => {
      expect(screen.queryByText('Should not show')).not.toBeInTheDocument()
    })
  })

  it('renders Result link for Assistant resource', async () => {
    mockAPI('GET', 'v1/scheduler-runs/run-123', baseRun)
    renderPage('/schedulers/sched-1/runs/run-123')

    await waitFor(() => {
      const link = screen.getByRole('link', { name: 'View Chat' })
      expect(link).toHaveAttribute('href', '/#/chats/conv-xyz')
    })
  })

  it('renders Result link for Datasource resource', async () => {
    const datasourceRun = {
      ...baseRun,
      resource: { id: 'ds-1', name: 'My Datasource', type: 'Datasource' },
      result: { available: true },
      input: null,
    }
    mockAPI('GET', 'v1/scheduler-runs/run-123', datasourceRun)
    renderPage('/schedulers/sched-1/runs/run-123')

    await waitFor(() => {
      const link = screen.getByRole('link', { name: 'View Datasource' })
      expect(link).toHaveAttribute('href', '/#/data-sources/ds-1')
    })
  })

  it('shows "Result not available" when result.available is false', async () => {
    const runWithNoResult = { ...baseRun, result: { available: false }, conversationId: null }
    mockAPI('GET', 'v1/scheduler-runs/run-123', runWithNoResult)
    renderPage('/schedulers/sched-1/runs/run-123')

    await waitFor(() => {
      expect(screen.getByText('Result not available')).toBeInTheDocument()
    })
  })

  it('renders Logs section', async () => {
    mockAPI('GET', 'v1/scheduler-runs/run-123', baseRun)
    renderPage('/schedulers/sched-1/runs/run-123')

    await waitFor(() => {
      expect(screen.getByText('Assistant started')).toBeInTheDocument()
      expect(screen.getByText('execution')).toBeInTheDocument()
    })
  })
})
