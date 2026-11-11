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
