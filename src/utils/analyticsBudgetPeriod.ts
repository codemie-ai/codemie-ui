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

import { TimePeriod } from '@/types/analytics'
import type { ProjectBudget } from '@/types/entity/projectBudget'

type PeriodResult = { start_date: string; end_date: string } | { time_period: TimePeriod }

const DURATION_UNIT_MS: Record<string, number> = {
  d: 86_400_000,
  h: 3_600_000,
  m: 60_000,
}

const DURATION_PATTERN = /^(\d+)([dhm])$/

const TIME_STEPPER_MS = 30 * 60 * 1000

function floorToStepMs(ms: number, stepMs: number): number {
  return Math.floor(ms / stepMs) * stepMs
}

function durationMs(duration: string): number | null {
  const match = DURATION_PATTERN.exec(duration)
  if (!match) return null
  const [, amount, unit] = match
  return Number(amount) * DURATION_UNIT_MS[unit]
}

/**
 * Returns the {start, end} ms bounds of a budget's currently active period.
 *
 * budget_reset_at, when the backend has populated it, is the next scheduled
 * reset boundary, so the period start is one duration before it. In
 * practice the backend often never populates it (e.g. the "noop" provider
 * never triggers a reset), so this falls back to deriving the active period
 * from created_at: walk forward in duration-sized increments from creation
 * to find the period that contains `nowMs`.
 */
function currentPeriodBoundsMs(
  budget: ProjectBudget,
  nowMs: number
): { start: number; end: number } | null {
  const durMs = durationMs(budget.budget_duration)
  if (durMs === null || durMs <= 0) return null

  if (budget.budget_reset_at) {
    const resetMs = new Date(budget.budget_reset_at).getTime()
    if (!Number.isNaN(resetMs)) {
      return { start: resetMs - durMs, end: resetMs }
    }
  }

  if (!budget.created_at) return null
  const createdMs = new Date(budget.created_at).getTime()
  if (Number.isNaN(createdMs)) return null

  const elapsed = nowMs - createdMs
  const periodsElapsed = elapsed > 0 ? Math.floor(elapsed / durMs) : 0
  const start = createdMs + periodsElapsed * durMs
  return { start, end: start + durMs }
}

/**
 * Given a project's budgets, returns {start_date, end_date} spanning the
 * longest currently active period, or falls back to the Last-30-Days
 * TimePeriod constant when no valid period exists.
 *
 * The active period's end is always >= now by construction (see
 * currentPeriodBoundsMs), but analytics has no data for the future, so end is
 * clamped to now. Both bounds are then floored to the 30-minute stepper the
 * Analytics date pickers use, so the returned values land exactly on a
 * selectable tick.
 */
export function computeAnalyticsBudgetPeriod(
  budgets: ProjectBudget[],
  now: Date = new Date()
): PeriodResult {
  const nowMs = now.getTime()
  let earliest: { start: number; end: number } | null = null
  for (const budget of budgets) {
    const bounds = currentPeriodBoundsMs(budget, nowMs)
    if (!bounds) continue
    if (!earliest || bounds.start < earliest.start) {
      earliest = bounds
    }
  }
  if (!earliest) {
    return { time_period: TimePeriod.LAST_30_DAYS }
  }
  const start = floorToStepMs(earliest.start, TIME_STEPPER_MS)
  const end = Math.max(start, floorToStepMs(Math.min(earliest.end, nowMs), TIME_STEPPER_MS))
  return {
    start_date: new Date(start).toISOString(),
    end_date: new Date(end).toISOString(),
  }
}
