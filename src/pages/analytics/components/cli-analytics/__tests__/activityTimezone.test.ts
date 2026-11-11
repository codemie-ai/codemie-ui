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

import { afterEach, describe, expect, it, vi } from 'vitest'

import type { CliAnalyticsActivityData } from '@/types/cliAnalytics'

import { browserUtcOffsetMinutes, shiftActivityToLocal } from '../activityTimezone'

const emptyHeat = (): number[][] => Array.from({ length: 7 }, () => Array(24).fill(0))

const withCell = (wd: number, h: number, v = 1): CliAnalyticsActivityData => {
  const heat = emptyHeat()
  heat[wd][h] = v
  const by_hour = Array(24).fill(0)
  by_hour[h] = v
  const by_weekday = Array(7).fill(0)
  by_weekday[wd] = v
  return { heat, by_hour, by_weekday }
}

const expectOnlyCell = (data: CliAnalyticsActivityData, wd: number, h: number, v = 1) => {
  const expectedHeat = emptyHeat()
  expectedHeat[wd][h] = v
  const expectedHour = Array(24).fill(0)
  expectedHour[h] = v
  const expectedWeekday = Array(7).fill(0)
  expectedWeekday[wd] = v
  expect(data.heat).toEqual(expectedHeat)
  expect(data.by_hour).toEqual(expectedHour)
  expect(data.by_weekday).toEqual(expectedWeekday)
}

describe('shiftActivityToLocal', () => {
  it('moves a bucket forward by one hour for UTC+1', () => {
    expectOnlyCell(shiftActivityToLocal(withCell(5, 18), 60), 5, 19)
  })

  it('moves a bucket back for a negative offset', () => {
    expectOnlyCell(shiftActivityToLocal(withCell(2, 10, 3), -120), 2, 8, 3)
  })

  it('returns the API buckets unchanged for a zero offset', () => {
    const heat = emptyHeat()
    heat[0][3] = 2
    heat[4][15] = 5
    heat[6][23] = 1
    const by_hour = Array.from({ length: 24 }, (_, h) => heat.reduce((a, row) => a + row[h], 0))
    const by_weekday = heat.map((row) => row.reduce((a, b) => a + b, 0))

    const result = shiftActivityToLocal({ heat, by_hour, by_weekday }, 0)

    expect(result.heat).toEqual(heat)
    expect(result.by_hour).toEqual(by_hour)
    expect(result.by_weekday).toEqual(by_weekday)
  })

  it('wraps forward into the next weekday', () => {
    expectOnlyCell(shiftActivityToLocal(withCell(1, 22), 180), 2, 1)
  })

  it('wraps back into the previous weekday', () => {
    expectOnlyCell(shiftActivityToLocal(withCell(3, 0), -60), 2, 23)
  })

  it('wraps Sunday 23 UTC to Monday 0 for UTC+1', () => {
    expectOnlyCell(shiftActivityToLocal(withCell(6, 23), 60), 0, 0)
  })

  it('wraps Monday 0 UTC to Sunday 23 for UTC-1', () => {
    expectOnlyCell(shiftActivityToLocal(withCell(0, 0), -60), 6, 23)
  })

  it('rounds a positive non-whole-hour offset down', () => {
    expectOnlyCell(shiftActivityToLocal(withCell(5, 10), 330), 5, 15)
  })

  it('rounds a negative non-whole-hour offset down', () => {
    expectOnlyCell(shiftActivityToLocal(withCell(5, 10), -210), 5, 6)
  })

  it('does not mutate the input', () => {
    const input = withCell(5, 18)
    const snapshot = structuredClone(input)

    const result = shiftActivityToLocal(input, 60)

    expect(input).toEqual(snapshot)
    expect(result).not.toBe(input)
    expect(result.heat).not.toBe(input.heat)
  })
})

describe('browserUtcOffsetMinutes', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns the browser offset east of UTC in minutes', () => {
    vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-60)

    expect(browserUtcOffsetMinutes()).toBe(60)
  })
})
