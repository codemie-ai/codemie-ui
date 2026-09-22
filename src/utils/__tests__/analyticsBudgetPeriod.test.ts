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

import { TimePeriod } from '@/types/analytics'
import type { ProjectBudget } from '@/types/entity/projectBudget'

import { computeAnalyticsBudgetPeriod } from '../analyticsBudgetPeriod'

const baseBudget = (overrides: Partial<ProjectBudget> = {}): ProjectBudget => ({
  budget_id: 'b-1',
  name: 'Test Budget',
  project_name: 'test-project',
  budget_category: 'platform',
  soft_budget: 100,
  max_budget: 200,
  budget_duration: '30d',
  budget_reset_at: '2026-02-01T00:00:00.000Z',
  provider_sync_status: null,
  member_count: 0,
  allocated_member_budget_total: 0,
  member_allocations: [],
  ...overrides,
})

describe('computeAnalyticsBudgetPeriod', () => {
  it('returns LAST_30_DAYS time_period when given an empty array', () => {
    const result = computeAnalyticsBudgetPeriod([])
    expect(result).toEqual({ time_period: TimePeriod.LAST_30_DAYS })
  })

  it('computes start_date for a real "7d" budget_duration (the format the API actually sends)', () => {
    const budget = baseBudget({
      budget_duration: '7d',
      budget_reset_at: '2026-06-15T00:00:00.000Z',
    })
    const result = computeAnalyticsBudgetPeriod([budget])
    expect('start_date' in result).toBe(true)
    if ('start_date' in result) {
      const start = new Date(result.start_date)
      const reset = new Date('2026-06-15T00:00:00.000Z')
      expect(reset.getTime() - start.getTime()).toBe(7 * 86_400_000)
    }
  })

  it('computes start_date for a daily (1d) budget (reset_at minus 1 day)', () => {
    const budget = baseBudget({
      budget_duration: '1d',
      budget_reset_at: '2026-06-15T00:00:00.000Z',
    })
    const result = computeAnalyticsBudgetPeriod([budget])
    expect('start_date' in result).toBe(true)
    if ('start_date' in result) {
      const start = new Date(result.start_date)
      const reset = new Date('2026-06-15T00:00:00.000Z')
      const diffMs = reset.getTime() - start.getTime()
      expect(diffMs).toBe(86_400_000) // exactly 1 day
      expect(result.end_date).toBe('2026-06-15T00:00:00.000Z')
    }
  })

  it('computes start_date for a weekly (7d) budget (reset_at minus 7 days)', () => {
    const budget = baseBudget({
      budget_duration: '7d',
      budget_reset_at: '2026-06-15T00:00:00.000Z',
    })
    const result = computeAnalyticsBudgetPeriod([budget])
    expect('start_date' in result).toBe(true)
    if ('start_date' in result) {
      const start = new Date(result.start_date)
      const reset = new Date('2026-06-15T00:00:00.000Z')
      const diffMs = reset.getTime() - start.getTime()
      expect(diffMs).toBe(7 * 86_400_000) // exactly 7 days
      expect(result.end_date).toBe('2026-06-15T00:00:00.000Z')
    }
  })

  it('computes start_date for a monthly (30d) budget (reset_at minus 30 days)', () => {
    const budget = baseBudget({
      budget_duration: '30d',
      budget_reset_at: '2026-03-31T00:00:00.000Z',
    })
    const result = computeAnalyticsBudgetPeriod([budget])
    expect('start_date' in result).toBe(true)
    if ('start_date' in result) {
      const start = new Date(result.start_date)
      const reset = new Date('2026-03-31T00:00:00.000Z')
      const diffMs = reset.getTime() - start.getTime()
      expect(diffMs).toBe(30 * 86_400_000) // exactly 30 days, not a calendar month
      expect(result.end_date).toBe('2026-03-31T00:00:00.000Z')
    }
  })

  it('selects the earliest start (longest period) when multiple budgets exist', () => {
    const weekly = baseBudget({
      budget_id: 'b-weekly',
      budget_duration: '7d',
      budget_reset_at: '2026-06-15T00:00:00.000Z',
    })
    const monthly = baseBudget({
      budget_id: 'b-monthly',
      budget_duration: '30d',
      budget_reset_at: '2026-06-15T00:00:00.000Z',
    })
    const daily = baseBudget({
      budget_id: 'b-daily',
      budget_duration: '1d',
      budget_reset_at: '2026-06-15T00:00:00.000Z',
    })
    const result = computeAnalyticsBudgetPeriod([weekly, monthly, daily])
    expect('start_date' in result).toBe(true)
    if ('start_date' in result) {
      // Monthly (30d) has the earliest start (May 16) — largest window
      const start = new Date(result.start_date)
      expect(start.getUTCMonth()).toBe(4) // May
      expect(start.getUTCDate()).toBe(16)
    }
  })

  it('treats an unrecognized budget_duration as invalid and skips it', () => {
    const budget = baseBudget({
      budget_duration: 'monthly',
      budget_reset_at: '2026-06-15T00:00:00.000Z',
    })
    const result = computeAnalyticsBudgetPeriod([budget])
    expect(result).toEqual({ time_period: TimePeriod.LAST_30_DAYS })
  })

  it('skips budgets with null budget_reset_at and uses the valid one', () => {
    const nullBudget = baseBudget({ budget_id: 'b-null', budget_reset_at: null })
    const validBudget = baseBudget({
      budget_id: 'b-valid',
      budget_duration: '1d',
      budget_reset_at: '2026-06-15T00:00:00.000Z',
    })
    const result = computeAnalyticsBudgetPeriod([nullBudget, validBudget])
    expect('start_date' in result).toBe(true)
    if ('start_date' in result) {
      expect(result.end_date).toBe('2026-06-15T00:00:00.000Z')
    }
  })

  it('returns LAST_30_DAYS when all budgets have null budget_reset_at', () => {
    const b1 = baseBudget({ budget_id: 'b-1', budget_reset_at: null })
    const b2 = baseBudget({ budget_id: 'b-2', budget_reset_at: null })
    const result = computeAnalyticsBudgetPeriod([b1, b2])
    expect(result).toEqual({ time_period: TimePeriod.LAST_30_DAYS })
  })

  it('returns LAST_30_DAYS when budget_reset_at is an invalid date string', () => {
    const budget = baseBudget({ budget_reset_at: 'not-a-date' })
    const result = computeAnalyticsBudgetPeriod([budget])
    expect(result).toEqual({ time_period: TimePeriod.LAST_30_DAYS })
  })

  describe('when budget_reset_at is null (the real backend behavior for a "noop" provider)', () => {
    it('derives the current period from created_at when now is within the first cycle', () => {
      const budget = baseBudget({
        budget_duration: '7d',
        budget_reset_at: null,
        created_at: '2026-09-17T08:41:33.328Z',
      })
      const now = new Date('2026-09-17T12:48:03.685Z') // a few hours into the first 7d cycle
      const result = computeAnalyticsBudgetPeriod([budget], now)
      expect('start_date' in result).toBe(true)
      if ('start_date' in result) {
        // Period end (2026-09-24) is in the future relative to `now`, so it is
        // clamped to `now` — and both bounds are floored to the 30-min stepper.
        expect(result.start_date).toBe('2026-09-17T08:30:00.000Z')
        expect(result.end_date).toBe('2026-09-17T12:30:00.000Z')
      }
    })

    it('advances to the current cycle when now is past the first period boundary', () => {
      const budget = baseBudget({
        budget_duration: '7d',
        budget_reset_at: null,
        created_at: '2026-09-01T00:00:00.000Z',
      })
      const now = new Date('2026-09-17T00:00:00.000Z') // 16 days later → 2 full 7d cycles elapsed
      const result = computeAnalyticsBudgetPeriod([budget], now)
      expect('start_date' in result).toBe(true)
      if ('start_date' in result) {
        expect(result.start_date).toBe('2026-09-15T00:00:00.000Z') // created_at + 2 * 7d
        // Period end (2026-09-22) is in the future relative to `now`, so it is clamped to `now`.
        expect(result.end_date).toBe('2026-09-17T00:00:00.000Z')
      }
    })

    it('prefers budget_reset_at over created_at when both are present', () => {
      const budget = baseBudget({
        budget_duration: '7d',
        budget_reset_at: '2026-09-20T00:00:00.000Z',
        created_at: '2026-01-01T00:00:00.000Z',
      })
      const result = computeAnalyticsBudgetPeriod([budget], new Date('2026-09-17T00:00:00.000Z'))
      expect('start_date' in result).toBe(true)
      if ('start_date' in result) {
        expect(result.start_date).toBe('2026-09-13T00:00:00.000Z')
        // Period end (2026-09-20) is in the future relative to `now`, so it is clamped to `now`.
        expect(result.end_date).toBe('2026-09-17T00:00:00.000Z')
      }
    })

    it('falls back to LAST_30_DAYS when both budget_reset_at and created_at are null', () => {
      const budget = baseBudget({ budget_reset_at: null, created_at: null })
      const result = computeAnalyticsBudgetPeriod([budget])
      expect(result).toEqual({ time_period: TimePeriod.LAST_30_DAYS })
    })
  })

  describe('30-minute stepper alignment and future-end clamping', () => {
    it('floors start_date to the nearest earlier 30-minute tick and clamps end_date to now, also floored', () => {
      const budget = baseBudget({
        budget_duration: '7d',
        budget_reset_at: null,
        created_at: '2026-09-17T08:41:33.328Z',
      })
      const now = new Date('2026-09-17T15:41:00.000Z')
      const result = computeAnalyticsBudgetPeriod([budget], now)
      expect('start_date' in result).toBe(true)
      if ('start_date' in result) {
        expect(result.start_date).toBe('2026-09-17T08:30:00.000Z')
        expect(result.end_date).toBe('2026-09-17T15:30:00.000Z')
      }
    })

    it('does not clamp end_date when the period has already fully elapsed relative to now', () => {
      const budget = baseBudget({
        budget_duration: '7d',
        budget_reset_at: '2026-09-10T00:00:00.000Z',
      })
      const result = computeAnalyticsBudgetPeriod([budget], new Date('2026-09-17T00:00:00.000Z'))
      expect('start_date' in result).toBe(true)
      if ('start_date' in result) {
        expect(result.end_date).toBe('2026-09-10T00:00:00.000Z')
      }
    })
  })
})
