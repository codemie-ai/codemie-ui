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

import { useCliAnalyticsSession } from '../useCliAnalyticsSession'

vi.mock('valtio', async () => {
  const actual = await vi.importActual<typeof import('valtio')>('valtio')
  return { ...actual, useSnapshot: vi.fn((store: unknown) => store) }
})

const MOCK_SESSION = {
  trace_id: 'abc123',
  developer_name: 'alice@co.com',
  repository: 'svc',
  branch: null,
  start_time: '2026-07-01T09:00:00Z',
  duration_ms: 45000,
  model_name: 'claude-sonnet-4-5',
  input_tokens: 8500,
  output_tokens: 1800,
  cost_usd: 0.085,
  tool_call_count: 12,
  events: [],
}

describe('useCliAnalyticsSession', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    cliAnalyticsStore.sessionDetail = {}
    cliAnalyticsStore.loading = {}
    cliAnalyticsStore.error = {}
  })

  it('calls fetchSessionDetail with the traceId', async () => {
    const fetchSessionDetail = vi
      .spyOn(cliAnalyticsStore, 'fetchSessionDetail')
      .mockResolvedValue(undefined)

    renderHook(() => useCliAnalyticsSession('abc123'))

    await waitFor(() => {
      expect(fetchSessionDetail).toHaveBeenCalledWith('abc123')
      expect(fetchSessionDetail).toHaveBeenCalledTimes(1)
    })
  })

  it('does not call fetchSessionDetail when traceId is null', () => {
    const fetchSessionDetail = vi
      .spyOn(cliAnalyticsStore, 'fetchSessionDetail')
      .mockResolvedValue(undefined)

    renderHook(() => useCliAnalyticsSession(null))

    expect(fetchSessionDetail).not.toHaveBeenCalled()
  })

  it('returns null session when sessionDetail is empty', () => {
    vi.spyOn(cliAnalyticsStore, 'fetchSessionDetail').mockResolvedValue(undefined)

    const { result } = renderHook(() => useCliAnalyticsSession('abc123'))

    expect(result.current.session).toBeNull()
  })

  it('returns session when pre-populated in store', () => {
    vi.spyOn(cliAnalyticsStore, 'fetchSessionDetail').mockResolvedValue(undefined)
    cliAnalyticsStore.sessionDetail.abc123 = MOCK_SESSION

    const { result } = renderHook(() => useCliAnalyticsSession('abc123'))

    expect(result.current.session).toEqual(MOCK_SESSION)
  })
})
