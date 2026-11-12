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

import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { cliAnalyticsStore } from '@/store/cliAnalytics'
import { TimePeriod } from '@/types/analytics'
import type { AnalyticsQueryParams } from '@/types/analytics'

import { useCliAnalyticsTools } from '../useCliAnalyticsTools'

vi.mock('valtio', async () => {
  const actual = await vi.importActual<typeof import('valtio')>('valtio')
  return { ...actual, useSnapshot: vi.fn((store: unknown) => store) }
})

const BASE_FILTERS: AnalyticsQueryParams = { time_period: TimePeriod.LAST_HOUR }

describe('useCliAnalyticsTools', () => {
  beforeEach(() => {
    cliAnalyticsStore.tools = null
    cliAnalyticsStore.loading = {}
    cliAnalyticsStore.error = {}
    vi.spyOn(cliAnalyticsStore, 'fetchTools').mockResolvedValue(undefined)
  })

  it('calls fetchTools on mount', async () => {
    renderHook(() => useCliAnalyticsTools(BASE_FILTERS))
    await waitFor(() => expect(cliAnalyticsStore.fetchTools).toHaveBeenCalledTimes(1))
    expect(cliAnalyticsStore.fetchTools).toHaveBeenCalledWith({
      time_period: TimePeriod.LAST_HOUR,
      start_date: undefined,
      end_date: undefined,
      users: undefined,
      projects: undefined,
      repositories: undefined,
    })
  })

  it('returns empty arrays when tools is null', () => {
    const { result } = renderHook(() => useCliAnalyticsTools(BASE_FILTERS))
    expect(result.current.toolUsage).toEqual([])
    expect(result.current.tokensByModel).toEqual([])
    expect(result.current.skillsInvoked).toEqual([])
    expect(result.current.agentSubtypes).toEqual([])
    expect(result.current.slashCommands).toEqual([])
  })

  it('returns loading=true from store', () => {
    cliAnalyticsStore.loading = { tools: true }
    const { result } = renderHook(() => useCliAnalyticsTools(BASE_FILTERS))
    expect(result.current.loading).toBe(true)
  })

  it('returns error message from store', () => {
    cliAnalyticsStore.error = { tools: { message: 'Network error' } }
    const { result } = renderHook(() => useCliAnalyticsTools(BASE_FILTERS))
    expect(result.current.error).toBe('Network error')
  })

  it('returns data when store has tools', () => {
    cliAnalyticsStore.tools = {
      tool_usage: [{ tool_name: 'Read', call_count: 10, success_count: 9, success_rate: 90.0 }],
      tokens_by_model: [{ model_name: 'claude-sonnet-4-6', total_tokens: 1_000_000 }],
      skills_invoked: [{ name: 'code-reviewer', count: 5 }],
      agent_subtypes: [{ name: 'Explore', count: 3 }],
      slash_commands: [{ name: '/help', count: 7 }],
    }
    const { result } = renderHook(() => useCliAnalyticsTools(BASE_FILTERS))
    expect(result.current.toolUsage[0].tool_name).toBe('Read')
    expect(result.current.tokensByModel[0].total_tokens).toBe(1_000_000)
    expect(result.current.skillsInvoked[0].name).toBe('code-reviewer')
    expect(result.current.agentSubtypes[0].name).toBe('Explore')
    expect(result.current.slashCommands[0].name).toBe('/help')
  })

  it('joins repositories as comma-separated string', async () => {
    renderHook(() => useCliAnalyticsTools(BASE_FILTERS, ['C:/Repos/A', 'C:/Repos/B']))
    await waitFor(() => expect(cliAnalyticsStore.fetchTools).toHaveBeenCalledTimes(1))
    expect(cliAnalyticsStore.fetchTools).toHaveBeenCalledWith(
      expect.objectContaining({ repositories: 'C:/Repos/A,C:/Repos/B' })
    )
  })
})
