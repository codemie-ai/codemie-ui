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

import { describe, expect, it } from 'vitest'

import type { OverviewKPIs } from '@/types/cliAnalytics'

import { buildOverviewSummaryGroups } from '../overviewMetrics'

const KPIS: OverviewKPIs = {
  total_sessions: 200,
  total_cost_usd: 100,
  duration_ms: 3_600_000,
  total_turns: 300,
  total_tool_calls: 640,
  tool_call_success_rate: 81.3,
  total_files_changed: 12,
  net_lines: 1500,
  dead_sessions: 150,
  total_input_tokens: 10,
  total_output_tokens: 20,
  total_cache_creation_tokens: 30,
  total_cache_read_tokens: 40,
  total_tokens: 100,
  cache_read_cost_usd: 41.5,
  bloat_pct: 41.5,
  avg_context_per_call: 1234.6,
}

const groups = (
  kpis: OverviewKPIs,
  users: number | null = 40,
  apiSpend: number | null = null,
  personal: number | null = null
) => buildOverviewSummaryGroups(kpis, users, apiSpend, personal)

const byId = (...args: Parameters<typeof groups>) =>
  Object.fromEntries(
    groups(...args)
      .flatMap((g) => g.metrics)
      .map((m) => [m.id, m])
  )

const ids = (...args: Parameters<typeof groups>) =>
  groups(...args).map((g) => [g.id, g.metrics.map((m) => m.id)])

describe('buildOverviewSummaryGroups', () => {
  it('builds the cost, tokens and sessions rows in the agreed order', () => {
    expect(ids(KPIS, 40, 35, 20)).toEqual([
      [
        'cost',
        [
          'total_cost_usd',
          'api_cost_usd',
          'subscription_cost_usd',
          'cache_read_cost_usd',
          'bloat_pct',
        ],
      ],
      [
        'tokens',
        [
          'total_tokens',
          'total_input_tokens',
          'total_output_tokens',
          'total_cache_read_tokens',
          'total_cache_creation_tokens',
        ],
      ],
      [
        'sessions',
        ['total_users', 'total_sessions', 'total_turns', 'total_tool_calls', 'dead_sessions'],
      ],
    ])
  })

  it('uses the agreed titles and captions', () => {
    const m = byId(KPIS, 40, 35, 20)
    const text = (id: string) => [m[id].label, m[id].description]
    expect(text('total_cost_usd')).toEqual(['Est. Cost', 'All usage at API rates'])
    expect(text('api_cost_usd')).toEqual(['API Spend', 'Billed per token'])
    expect(text('subscription_cost_usd')).toEqual([
      'Subscription Usage',
      'At API rates, not billed',
    ])
    expect(text('cache_read_cost_usd')).toEqual(['Cache Re-Read Cost', 'Spend on context re-reads'])
    expect(text('bloat_pct')).toEqual(['Bloat %', 'Cache reads / total cost'])
    expect(text('total_tokens')).toEqual(['Total Tokens', 'Input, output and cache'])
    expect(text('total_input_tokens')).toEqual(['Input Tokens', 'LLM input tokens'])
    expect(text('total_output_tokens')).toEqual(['Output Tokens', 'LLM output tokens'])
    expect(text('total_cache_read_tokens')).toEqual(['Cache Read Tokens', 'Cached input tokens'])
    expect(text('total_cache_creation_tokens')).toEqual([
      'Cache Creation Tokens',
      'Tokens written to cache',
    ])
    expect(text('total_users')).toEqual(['Total Users', 'Distinct users'])
    expect(text('total_sessions')).toEqual(['Sessions', '5.0 per user'])
    expect(text('total_turns')).toEqual(['Turns', '1.5 per session'])
    expect(text('total_tool_calls')).toEqual(['Tool Calls', '81.30% succeeded'])
    expect(text('dead_sessions')).toEqual(['Sessions Without Changes', '75.00% of all sessions'])
  })

  it('shows token counts as full figures', () => {
    const m = byId({ ...KPIS, total_tokens: 2_621_585_847 })
    expect(m.total_tokens.value).toBe(2_621_585_847)
    expect(m.total_input_tokens.value).toBe(10)
    expect(m.total_cache_creation_tokens.value).toBe(30)
  })

  it('hides API Spend and Subscription Usage until a source exists', () => {
    expect(ids(KPIS)[0][1]).toEqual(['total_cost_usd', 'cache_read_cost_usd', 'bloat_pct'])
  })

  it('splits Est. Cost into API Spend and Subscription Usage, adding the personal cost back', () => {
    const m = byId(KPIS, 40, 35, 20)
    expect(m.api_cost_usd.value).toBe(35)
    // Est. Cost 100 - API 35 + personal 20
    expect(m.subscription_cost_usd.value).toBe(85)
    expect(byId(KPIS, 40, 35).subscription_cost_usd.value).toBe(65)
  })

  it('prefers the backend split over the CodeMie-proxy spend', () => {
    const m = byId({ ...KPIS, api_cost_usd: 40, subscription_cost_usd: 60 }, 40, 35, 20)
    expect(m.api_cost_usd.value).toBe(40)
    expect(m.subscription_cost_usd.value).toBe(60)
  })

  it('prefers the backend total_users and falls back to the fetched count', () => {
    expect(byId({ ...KPIS, total_users: 50 }, 40).total_users.value).toBe(50)
    expect(byId(KPIS, 40).total_users.value).toBe(40)
  })

  it('shows no per-user caption and an absent value until the user count loads', () => {
    const m = byId(KPIS, null)
    expect(m.total_users.value).toBeNull()
    expect(m.total_sessions.description).toBeUndefined()
  })

  it('dashes the Tool Calls caption with no calls and keeps a real 0%', () => {
    expect(
      byId({ ...KPIS, total_tool_calls: 0, tool_call_success_rate: 0 }).total_tool_calls.description
    ).toBe('—')
    expect(
      byId({ ...KPIS, total_tool_calls: 12, tool_call_success_rate: 0 }).total_tool_calls
        .description
    ).toBe('0.00% succeeded')
  })
})
