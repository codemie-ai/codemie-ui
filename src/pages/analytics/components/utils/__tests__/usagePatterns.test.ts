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

import { describe, it, expect } from 'vitest'

import { ColumnType, type TabularResponse } from '@/types/analytics'

import { toAllHoursOfDay, toMonFirstWeekdays, WEEKDAYS_MON_FIRST } from '../usagePatterns'

const response = (labelField: string, rows: Record<string, unknown>[]): TabularResponse => ({
  data: {
    columns: [
      { id: labelField, label: labelField, type: ColumnType.STRING },
      { id: 'activity_count', label: 'Activity', type: ColumnType.INTEGER },
    ],
    rows,
  },
  metadata: { timestamp: '', data_as_of: '' },
  pagination: { page: 0, per_page: 20, total_count: rows.length, has_more: false },
})

describe('toMonFirstWeekdays', () => {
  it('reorders sparse Sun-first rows onto Mon..Sun and fills the gaps with 0', () => {
    const sun = { weekday: 'Sun', activity_count: 3, extra: 'kept' }
    const wed = { weekday: 'Wed', activity_count: 7 }

    const result = toMonFirstWeekdays(response('weekday', [sun, wed]))

    expect(result.data.rows.map((row) => row.weekday)).toEqual(WEEKDAYS_MON_FIRST)
    expect(result.data.rows.map((row) => row.activity_count)).toEqual([0, 0, 7, 0, 0, 0, 3])
    expect(result.data.rows[2]).toBe(wed)
    expect(result.data.rows[6]).toBe(sun)
    expect(result.pagination.total_count).toBe(7)
    expect(result.pagination.per_page).toBe(7)
  })
})

describe('toAllHoursOfDay', () => {
  it('lays sparse hour rows out on 0..23 and fills the gaps with 0', () => {
    const nine = { hour: 9, activity_count: 4 }
    const late = { hour: 23, activity_count: 1 }

    const result = toAllHoursOfDay(response('hour', [late, nine]))

    expect(result.data.rows.map((row) => row.hour)).toEqual(
      Array.from({ length: 24 }, (_, hour) => hour)
    )
    expect(result.data.rows[9]).toBe(nine)
    expect(result.data.rows[23]).toBe(late)
    expect(result.data.rows.filter((row) => row.activity_count === 0)).toHaveLength(22)
    expect(result.pagination.total_count).toBe(24)
  })

  it('matches hours sent as strings', () => {
    const result = toAllHoursOfDay(response('hour', [{ hour: '5', activity_count: 2 }]))

    expect(result.data.rows[5].activity_count).toBe(2)
  })
})
