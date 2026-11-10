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

import type { TabularResponse } from '@/types/analytics'

// One axis for every weekday/hour chart: CLI Analytics already draws Mon-Sun and all 24 hours.
export const WEEKDAYS_MON_FIRST = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS_OF_DAY = Array.from({ length: 24 }, (_, hour) => hour)

const withRows = (data: TabularResponse, rows: Record<string, unknown>[]): TabularResponse => ({
  ...data,
  data: { ...data.data, rows },
  pagination: { ...data.pagination, per_page: rows.length, total_count: rows.length },
})

/**
 * Builds a transform that lays rows out on a fixed axis, in order: a bucket the backend omitted had
 * no activity, so it is drawn as 0 rather than dropped from the axis.
 */
const toFixedAxis =
  <T extends string | number>(axis: readonly T[], labelField: string, valueField: string) =>
  (data: TabularResponse): TabularResponse => {
    const byLabel = new Map(data.data.rows.map((row) => [String(row[labelField]), row]))
    const rows = axis.map(
      (label) => byLabel.get(String(label)) ?? { [labelField]: label, [valueField]: 0 }
    )
    return withRows(data, rows)
  }

/** CLI Insights returns weekdays Sun-first and only those with activity. */
export const toMonFirstWeekdays = toFixedAxis(WEEKDAYS_MON_FIRST, 'weekday', 'activity_count')

/** CLI Insights returns only the hours with activity. */
export const toAllHoursOfDay = toFixedAxis(HOURS_OF_DAY, 'hour', 'activity_count')
