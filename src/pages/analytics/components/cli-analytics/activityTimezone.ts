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

import type { CliAnalyticsActivityData } from '@/types/cliAnalytics'

const DAYS = 7
const HOURS = 24
const WEEK_HOURS = DAYS * HOURS

export const browserUtcOffsetMinutes = (): number => -new Date().getTimezoneOffset()

// The API buckets sessions by UTC weekday/hour. Each UTC hour bucket is moved to the local hour it
// begins in (non-whole-hour offsets round down), wrapping across weekdays (0=Mon..6=Sun).
// by_hour / by_weekday are re-derived from the shifted matrix, which holds the same session set.
export const shiftActivityToLocal = (
  data: CliAnalyticsActivityData,
  offsetMinutes: number
): CliAnalyticsActivityData => {
  const shift = Math.floor(offsetMinutes / 60)
  const heat = Array.from({ length: DAYS }, () => Array<number>(HOURS).fill(0))
  for (let wd = 0; wd < DAYS; wd += 1) {
    for (let h = 0; h < HOURS; h += 1) {
      const idx = (((wd * HOURS + h + shift) % WEEK_HOURS) + WEEK_HOURS) % WEEK_HOURS
      heat[Math.floor(idx / HOURS)][idx % HOURS] += data.heat[wd]?.[h] ?? 0
    }
  }
  const by_weekday = heat.map((row) => row.reduce((a, b) => a + b, 0))
  const by_hour = Array.from({ length: HOURS }, (_, h) => heat.reduce((a, row) => a + row[h], 0))
  return { ...data, heat, by_hour, by_weekday }
}
