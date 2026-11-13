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

import type { SessionRow } from '@/types/cliAnalytics'

import { cliAnalyticsStore } from '../cliAnalytics'

const mockApi = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@/utils/api', () => ({ default: mockApi }))

const respondWith = (body: unknown) => {
  mockApi.get.mockResolvedValueOnce({ json: () => Promise.resolve(body) })
}

const sessionRow = (trace_id: string, model_name: string): SessionRow => ({
  trace_id,
  developer_name: 'dev',
  repository: null,
  start_time: '2026-01-01T00:00:00Z',
  duration_ms: 1,
  model_name,
  input_tokens: 1,
  output_tokens: 1,
  cost_usd: 0.01,
  tool_call_count: 0,
  branch: null,
  cost_available: true,
})

describe('cliAnalyticsStore.clearRepositories', () => {
  it('resets the repositories slot to null', () => {
    cliAnalyticsStore.repositories = {
      rows: [
        {
          repository: 'stale-repo',
          session_count: 1,
          turns: 1,
          cost_usd: 1,
          files_changed: 1,
          lines_added: 1,
          lines_removed: 0,
          net_lines: 1,
          tool_calls: 1,
          tool_calls_success: 1,
          tool_success_rate: 100.0,
        },
      ],
      pagination: { page: 0, per_page: 10, total_count: 1, has_more: false },
    }

    cliAnalyticsStore.clearRepositories()

    expect(cliAnalyticsStore.repositories).toBeNull()
  })
})

describe('cliAnalyticsStore unpriced models', () => {
  beforeEach(() => {
    mockApi.get.mockReset()
  })

  it('fetchSessionDetail keeps metadata.unpriced_models on the detail', async () => {
    respondWith({
      data: { ...sessionRow('t1', 'mai-code-1.1-flash'), events: [], harness_name: 'claude' },
      metadata: { unpriced_models: ['mai-code-1.1-flash'] },
    })

    await cliAnalyticsStore.fetchSessionDetail('t1')

    expect(cliAnalyticsStore.sessionDetail.t1.unpriced_models).toEqual(['mai-code-1.1-flash'])
  })

  it('fetchSessionDetail stores an empty list when metadata is absent', async () => {
    respondWith({
      data: { ...sessionRow('t2', 'claude-sonnet-4-6'), events: [], harness_name: 'claude' },
    })

    await cliAnalyticsStore.fetchSessionDetail('t2')

    expect(cliAnalyticsStore.sessionDetail.t2.unpriced_models).toEqual([])
  })

  it('fetchSessions gives each row the unpriced models it used', async () => {
    respondWith({
      data: {
        sessions: [
          sessionRow('t1', 'claude-sonnet-4-6, mai-code-1.1-flash'),
          sessionRow('t2', 'claude-sonnet-4-6'),
        ],
        page: 0,
        per_page: 20,
        total: 2,
      },
      metadata: { unpriced_models: ['mai-code-1.1-flash'] },
    })

    await cliAnalyticsStore.fetchSessions({})

    expect(cliAnalyticsStore.sessions?.sessions.map((row) => row.unpriced_models)).toEqual([
      ['mai-code-1.1-flash'],
      [],
    ])
  })

  it('fetchSessions matches a Bedrock-wrapped unpriced name to the normalized row model', async () => {
    const wrapped = 'bedrock/converse/eu.anthropic.claude-haiku-4-5-20251001-v1:0'
    respondWith({
      data: {
        sessions: [
          sessionRow('t1', 'claude-sonnet-4-6, claude-haiku-4-5-20251001'),
          sessionRow('t2', 'claude-sonnet-4-6'),
        ],
        page: 0,
        per_page: 20,
        total: 2,
      },
      metadata: { unpriced_models: [wrapped] },
    })

    await cliAnalyticsStore.fetchSessions({})

    expect(cliAnalyticsStore.sessions?.sessions.map((row) => row.unpriced_models)).toEqual([
      [wrapped],
      [],
    ])
  })

  it('fetchSessions keeps the store unchanged when the body has no data key', async () => {
    cliAnalyticsStore.sessions = null
    respondWith({ metadata: { unpriced_models: ['mai-code-1.1-flash'] } })

    await expect(cliAnalyticsStore.fetchSessions({})).resolves.toBeUndefined()

    expect(cliAnalyticsStore.sessions).toBeNull()
    expect(cliAnalyticsStore.loading.sessions).toBe(false)
  })

  it('fetchSessionDetail records nothing when the body has no data key', async () => {
    respondWith({ metadata: { unpriced_models: ['mai-code-1.1-flash'] } })

    await cliAnalyticsStore.fetchSessionDetail('t3')

    expect(cliAnalyticsStore.sessionDetail.t3).toBeUndefined()
    expect(cliAnalyticsStore.loading['session:t3']).toBe(false)
  })

  it.each([
    ['bedrock/converse/eu.anthropic.claude-haiku-4-5-20251001-v1:0', 'claude-haiku-4-5-20251001'],
    ['bedrock/invoke/us.anthropic.claude-opus-4-1-20250805-v1:0', 'claude-opus-4-1-20250805'],
    ['invoke/anthropic.claude-sonnet-4-6', 'claude-sonnet-4-6'],
    ['claude-sonnet-4-6', 'claude-sonnet-4-6'],
  ])('matches raw backend model %s to the normalized row model %s', async (raw, normalized) => {
    respondWith({
      data: {
        sessions: [sessionRow('t1', `claude-sonnet-4-6, ${normalized}`)],
        page: 0,
        per_page: 20,
        total: 1,
      },
      metadata: { unpriced_models: [raw] },
    })

    await cliAnalyticsStore.fetchSessions({})

    expect(cliAnalyticsStore.sessions?.sessions[0].unpriced_models).toEqual([raw])
  })

  it('ignores empty segments in a row model list and empty unpriced names', async () => {
    respondWith({
      data: {
        sessions: [sessionRow('t1', 'claude-sonnet-4-6, , mai-code-1.1-flash,')],
        page: 0,
        per_page: 20,
        total: 1,
      },
      metadata: { unpriced_models: ['', 'mai-code-1.1-flash'] },
    })

    await cliAnalyticsStore.fetchSessions({})

    expect(cliAnalyticsStore.sessions?.sessions[0].unpriced_models).toEqual(['mai-code-1.1-flash'])
  })
})

describe('cliAnalyticsStore.fetchUserCount', () => {
  beforeEach(() => {
    mockApi.get.mockReset()
    cliAnalyticsStore.userCount = null
    cliAnalyticsStore.users = null
  })

  it('asks the users endpoint for one row and keeps only total_count in its own slot', async () => {
    respondWith({ data: { rows: [], total_count: 212, avg_session_duration_ms: null } })

    await cliAnalyticsStore.fetchUserCount({ time_period: 'last_30_days' })

    expect(mockApi.get).toHaveBeenCalledWith(
      'v1/analytics/cli-analytics/users',
      expect.objectContaining({
        params: expect.objectContaining({
          time_period: 'last_30_days',
          page: 0,
          per_page: 1,
          include_daily_activity: false,
          include_avg_duration: false,
        }),
      })
    )
    expect(cliAnalyticsStore.userCount).toBe(212)
    // The Users tab owns the `users` slot; the count must not overwrite its table.
    expect(cliAnalyticsStore.users).toBeNull()
  })

  it('drops the previous count when the next request fails', async () => {
    cliAnalyticsStore.userCount = 12
    mockApi.get.mockRejectedValueOnce(new Error('boom'))

    await cliAnalyticsStore.fetchUserCount({ time_period: 'last_7_days' })

    expect(cliAnalyticsStore.userCount).toBeNull()
  })
})

describe('cliAnalyticsStore.fetchApiSpend', () => {
  beforeEach(() => {
    mockApi.get.mockReset()
    cliAnalyticsStore.apiSpend = null
    cliAnalyticsStore.overview = null
  })

  it('asks the overview for CodeMie-proxy sessions and keeps only their cost in its own slot', async () => {
    respondWith({
      data: { kpis: { total_cost_usd: 412.3 }, daily_buckets: [], model_breakdown: [] },
    })

    await cliAnalyticsStore.fetchApiSpend({ time_period: 'last_30_days' })

    expect(mockApi.get).toHaveBeenCalledWith(
      'v1/analytics/cli-analytics/overview',
      expect.objectContaining({
        params: expect.objectContaining({
          time_period: 'last_30_days',
          subscription_type: 'codemie',
          include_class_lists: false,
          include_buckets: false,
        }),
      })
    )
    expect(cliAnalyticsStore.apiSpend).toBe(412.3)
    // The Overview tab owns the `overview` slot; the filtered request must not overwrite it.
    expect(cliAnalyticsStore.overview).toBeNull()
  })

  it('drops the previous spend while the next request is pending and when it fails', async () => {
    cliAnalyticsStore.apiSpend = 600
    let reject: (e: Error) => void = () => {}
    mockApi.get.mockReturnValueOnce(
      new Promise((_, r) => {
        reject = r
      })
    )

    const pending = cliAnalyticsStore.fetchApiSpend({ time_period: 'last_7_days' })
    expect(cliAnalyticsStore.apiSpend).toBeNull()

    reject(new Error('boom'))
    await pending
    expect(cliAnalyticsStore.apiSpend).toBeNull()
  })
})

describe('cliAnalyticsStore.fetchProjects', () => {
  beforeEach(() => {
    mockApi.get.mockReset()
    cliAnalyticsStore.projects = null
    cliAnalyticsStore.repositories = null
  })

  it('requests one page of projects and keeps it in its own slot', async () => {
    const page = {
      rows: [{ project_name: 'P', repositories: [] }],
      pagination: { page: 1, per_page: 10, total_count: 12, has_more: false },
    }
    respondWith({ data: page })

    await cliAnalyticsStore.fetchProjects({ time_period: 'last_30_days', page: 1, per_page: 10 })

    expect(mockApi.get).toHaveBeenCalledWith(
      'v1/analytics/cli-analytics/projects',
      expect.objectContaining({
        params: expect.objectContaining({ page: 1, per_page: 10 }),
      })
    )
    expect(cliAnalyticsStore.projects).toEqual({
      ...page,
      cost_incomplete: false,
      unpriced_models: [],
    })
    expect(cliAnalyticsStore.repositories).toBeNull()
  })
})

describe('cliAnalyticsStore.fetchActivity', () => {
  beforeEach(() => {
    mockApi.get.mockReset()
    vi.restoreAllMocks()
  })

  it('sends the browser IANA time zone so the API buckets each session with its own DST offset', async () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      timeZone: 'Europe/Madrid',
    } as Intl.ResolvedDateTimeFormatOptions)
    respondWith({ data: { heat: [], by_hour: [], by_weekday: [] } })

    await cliAnalyticsStore.fetchActivity({ time_period: 'last_30_days' })

    expect(mockApi.get).toHaveBeenCalledWith(
      'v1/analytics/cli-analytics/activity',
      expect.objectContaining({
        params: expect.objectContaining({ time_period: 'last_30_days', tz: 'Europe/Madrid' }),
      })
    )
  })
})

describe('cliAnalyticsStore.fetchCost', () => {
  beforeEach(() => {
    mockApi.get.mockReset()
  })

  it('turns off the class lists and buckets the Cost tab does not read', async () => {
    respondWith({ data: { kpis: null, cost_by_user: [], cost_by_model: [] } })

    await cliAnalyticsStore.fetchCost({ time_period: 'last_hour' })

    expect(mockApi.get).toHaveBeenCalledWith(
      'v1/analytics/cli-analytics/cost',
      expect.objectContaining({
        params: expect.objectContaining({
          time_period: 'last_hour',
          include_class_lists: false,
          include_buckets: false,
        }),
      })
    )
  })
})

describe('cliAnalyticsStore.fetchOverview', () => {
  beforeEach(() => {
    mockApi.get.mockReset()
  })

  it('turns off the class lists and buckets the Overview tab does not read', async () => {
    respondWith({ data: { kpis: null, daily_buckets: [], model_breakdown: [] } })

    await cliAnalyticsStore.fetchOverview({ time_period: 'last_30_days' })

    expect(mockApi.get).toHaveBeenCalledWith(
      'v1/analytics/cli-analytics/overview',
      expect.objectContaining({
        params: expect.objectContaining({
          time_period: 'last_30_days',
          include_class_lists: false,
          include_buckets: false,
        }),
      })
    )
  })
})
