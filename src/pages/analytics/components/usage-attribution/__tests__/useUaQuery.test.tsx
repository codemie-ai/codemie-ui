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

import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { toUaParams, usageAttributionStore } from '@/store/usageAttribution'
import { TimePeriod } from '@/types/analytics'
import type { UaAnalysisInfo } from '@/types/usageAttribution'

import { UA_MAX_POLLS, UA_POLL_MS } from '../constants'
import { useUaBaseParams, useUaPage, useUaPolling, withoutPoll } from '../hooks/useUaQuery'

const FILTERS = {
  time_period: TimePeriod.LAST_30_DAYS,
  projects: ['northwind-payments'],
  users: ['jane@example.com'],
}

const ANALYSIS: UaAnalysisInfo = {
  computed_at: '2026-10-14T08:00:00Z',
  duration_ms: 1200,
  cache: 'hit',
  stale: false,
  refreshing: false,
  error: null,
  ttl_s: 900,
  window: null,
  evidence_window: null,
  coverage: null,
  unclassified_reasons: null,
  allocated: null,
  timings: {},
  settings: { hash: 'h', defaults_hash: 'h', schema_version: 1, overridden: [], tier: null },
}

const resetStore = () => {
  usageAttributionStore.resetAnalysisStatus()
  usageAttributionStore.setOverrides({}, null)
  usageAttributionStore.refreshNonce = 0
  usageAttributionStore.pollNonce = 0
}

describe('toUaParams', () => {
  it('never sends projects or users', () => {
    const params = toUaParams(FILTERS, null, 0)

    expect(params).toEqual({ time_period: TimePeriod.LAST_30_DAYS })
  })

  it('sends the custom range, the overrides and the nonces, and still no projects or users', () => {
    const params = toUaParams(
      { ...FILTERS, start_date: '2026-10-01T00:00:00Z', end_date: '2026-10-14T00:00:00Z' },
      'eyJ4Ijox',
      2,
      3
    )

    expect(params).toEqual({
      time_period: TimePeriod.LAST_30_DAYS,
      start_date: '2026-10-01T00:00:00Z',
      end_date: '2026-10-14T00:00:00Z',
      overrides: 'eyJ4Ijox',
      _r: 2,
      _p: 3,
    })
  })
})

describe('useUaBaseParams', () => {
  beforeEach(resetStore)
  afterEach(cleanup)

  it('carries the period, the overrides and the poll, never the project or user filters', () => {
    usageAttributionStore.setOverrides({ shared_project_threshold: 500 }, 'eyJ4Ijox')
    usageAttributionStore.pollNonce = 4

    const { result } = renderHook(() => useUaBaseParams(FILTERS))

    expect(result.current).toEqual({
      time_period: TimePeriod.LAST_30_DAYS,
      overrides: 'eyJ4Ijox',
      _p: 4,
    })
  })
})

describe('withoutPoll', () => {
  const PARAMS = { time_period: TimePeriod.LAST_30_DAYS, overrides: 'eyJ4Ijox', _r: 1 }

  it('is the same for every poll of the same request', () => {
    expect(withoutPoll({ ...PARAMS, _p: 1 })).toBe(withoutPoll({ ...PARAMS, _p: 2 }))
    expect(withoutPoll({ ...PARAMS, _p: 1 })).toBe(withoutPoll(PARAMS))
  })

  it.each([
    ['the period', { time_period: TimePeriod.LAST_7_DAYS }],
    ['the settings', { overrides: 'eyJ5Ijoy' }],
    ['Recompute', { _r: 2 }],
  ])('changes with %s', (_what, change) => {
    expect(withoutPoll({ ...PARAMS, ...change, _p: 1 })).not.toBe(withoutPoll({ ...PARAMS, _p: 1 }))
  })
})

describe('useUaPage', () => {
  const PERIOD = { time_period: TimePeriod.LAST_30_DAYS }

  afterEach(cleanup)

  const renderPage = (params: Record<string, unknown>) =>
    renderHook(({ params: p }) => useUaPage(p), { initialProps: { params } })

  it('keeps page 2 when a poll asks again', () => {
    const { result, rerender } = renderPage({ ...PERIOD, _p: 1 })
    act(() => result.current[1](1))
    expect(result.current[0]).toBe(1)

    rerender({ params: { ...PERIOD, _p: 2 } })
    rerender({ params: { ...PERIOD, _p: 3 } })

    expect(result.current[0]).toBe(1)
  })

  it.each([
    ['another period', { time_period: TimePeriod.LAST_7_DAYS }],
    ['other settings', { ...PERIOD, overrides: 'eyJ4Ijox' }],
    ['Recompute', { ...PERIOD, _r: 1 }],
  ])('starts again on the first page for %s', (_what, params) => {
    const { result, rerender } = renderPage(PERIOD)
    act(() => result.current[1](1))

    rerender({ params })

    expect(result.current[0]).toBe(0)
  })
})

describe('useUaPolling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetStore()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  /** A response arrives: the store has a new analysis (the snapshot is not reactive in unit tests). */
  const answer = (rerender: () => void, fields: Partial<UaAnalysisInfo>) => {
    usageAttributionStore.lastAnalysis = { ...ANALYSIS, ...fields }
    rerender()
  }

  const wait = (ms: number) =>
    act(() => {
      vi.advanceTimersByTime(ms)
    })

  it('asks every widget again after UA_POLL_MS while a newer analysis is computed', () => {
    const { rerender } = renderHook(() => useUaPolling())
    answer(rerender, { stale: true, refreshing: true })

    wait(UA_POLL_MS - 1)
    expect(usageAttributionStore.pollNonce).toBe(0)
    wait(1)

    expect(usageAttributionStore.pollNonce).toBe(1)
    expect(usageAttributionStore.polls).toBe(1)
  })

  it(`stops after UA_MAX_POLLS (${UA_MAX_POLLS}) polls`, () => {
    const { rerender } = renderHook(() => useUaPolling())

    for (let i = 0; i < UA_MAX_POLLS + 5; i += 1) {
      answer(rerender, { stale: true, refreshing: true })
      wait(UA_POLL_MS)
    }

    expect(usageAttributionStore.polls).toBe(UA_MAX_POLLS)
  })

  it('counts the polls again for another period or other settings', () => {
    const { rerender } = renderHook(() => useUaPolling())
    usageAttributionStore.polls = UA_MAX_POLLS
    answer(rerender, { stale: true, refreshing: true })
    wait(UA_POLL_MS)
    expect(usageAttributionStore.pollNonce).toBe(0)

    usageAttributionStore.resetAnalysisStatus()
    answer(rerender, { stale: true, refreshing: true })
    wait(UA_POLL_MS)

    expect(usageAttributionStore.pollNonce).toBe(1)
  })

  it('stops once the newer analysis is there', () => {
    const { rerender } = renderHook(() => useUaPolling())
    answer(rerender, { stale: true, refreshing: true })
    wait(UA_POLL_MS)

    answer(rerender, { computed_at: '2026-10-14T08:10:00Z' })
    wait(UA_POLL_MS * 3)

    expect(usageAttributionStore.polls).toBe(1)
  })

  it('stops when the earlier analysis comes back with the limit reached, not refreshing', () => {
    const { rerender } = renderHook(() => useUaPolling())
    answer(rerender, { stale: true, refreshing: true })
    wait(UA_POLL_MS)

    answer(rerender, {
      stale: true,
      refreshing: false,
      error:
        'the limit of 10 computations with custom settings an hour is reached; try again in 12 minutes, or reset to the defaults.',
    })
    wait(UA_POLL_MS * 3)

    expect(usageAttributionStore.polls).toBe(1)
  })

  it('does not ask again after the tab is closed', () => {
    const { rerender, unmount } = renderHook(() => useUaPolling())
    answer(rerender, { stale: true, refreshing: true })

    unmount()
    wait(UA_POLL_MS * 2)

    expect(usageAttributionStore.polls).toBe(0)
  })
})
