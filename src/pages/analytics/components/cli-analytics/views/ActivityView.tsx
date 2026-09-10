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

import React, { type FC, useMemo } from 'react'

import { ColumnType, type AnalyticsQueryParams, type TabularResponse } from '@/types/analytics'

import AnalyticsWidget from '../../AnalyticsWidget'
import BarChartWidget from '../../widgets/BarChartWidget'
import { useCliAnalyticsActivity } from '../hooks/useCliAnalyticsActivity'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

interface ActivityViewProps {
  filters: AnalyticsQueryParams
  repositories?: string[]
}

const ActivityView: FC<ActivityViewProps> = ({ filters, repositories }) => {
  const { data, loading, error } = useCliAnalyticsActivity(filters, repositories)

  const maxCell = useMemo(() => Math.max(...(data?.heat.flat() ?? []), 1), [data])

  const errorDetails = error ? { message: error } : null

  const hourlyTabularData: TabularResponse = useMemo(
    () => ({
      data: {
        columns: [
          { id: 'hour', label: 'Hour', type: ColumnType.STRING },
          { id: 'session_count', label: 'Sessions', type: ColumnType.INTEGER },
        ],
        rows: HOURS.map((h, i) => ({ hour: String(h), session_count: data?.by_hour[i] ?? 0 })),
      },
      metadata: { timestamp: '', data_as_of: '' },
      pagination: { page: 0, per_page: 24, total_count: 24, has_more: false },
    }),
    [data]
  )

  const weekdayTabularData: TabularResponse = useMemo(
    () => ({
      data: {
        columns: [
          { id: 'weekday', label: 'Weekday', type: ColumnType.STRING },
          { id: 'session_count', label: 'Sessions', type: ColumnType.INTEGER },
        ],
        rows: WEEKDAYS.map((d, i) => ({ weekday: d, session_count: data?.by_weekday[i] ?? 0 })),
      },
      metadata: { timestamp: '', data_as_of: '' },
      pagination: { page: 0, per_page: 7, total_count: 7, has_more: false },
    }),
    [data]
  )

  return (
    <div className="flex flex-col gap-6">
      <AnalyticsWidget title="Sessions by weekday × hour" loading={loading} error={errorDetails}>
        <div className="overflow-x-auto">
          <div
            className="grid gap-[3px] w-fit"
            style={{
              gridTemplateColumns: 'auto repeat(24, 22px)',
              gridAutoRows: '22px',
            }}
          >
            <div />
            {HOURS.map((h) => (
              <div
                key={h}
                className="flex items-center justify-center text-[9px] text-text-secondary"
              >
                {h % 6 === 0 ? h : ''}
              </div>
            ))}
            {WEEKDAYS.map((day, wd) => (
              <React.Fragment key={day}>
                <div className="flex items-center text-[10px] text-text-secondary pr-2">{day}</div>
                {HOURS.map((h) => {
                  const v = data?.heat[wd]?.[h] ?? 0
                  const alpha = v > 0 ? 0.15 + (v / maxCell) * 0.85 : 0
                  const sessionLabel = v === 1 ? 'session' : 'sessions'
                  const title = v > 0 ? `${day} ${h}:00 — ${v} ${sessionLabel}` : undefined
                  return (
                    <div
                      key={h}
                      className="rounded-sm"
                      style={{
                        background:
                          v > 0
                            ? `rgba(34,151,246,${alpha.toFixed(2)})`
                            : 'rgb(var(--colors-surface-base-tertiary))',
                      }}
                      title={title}
                    />
                  )
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </AnalyticsWidget>

      <div className="grid grid-cols-2 gap-4">
        <BarChartWidget
          title="By hour of day"
          labelField="hour"
          valueField="session_count"
          yAxisLabel="session_count"
          yAxisInteger
          dataOverride={hourlyTabularData}
        />
        <BarChartWidget
          title="By weekday"
          labelField="weekday"
          valueField="session_count"
          yAxisLabel="session_count"
          yAxisInteger
          dataOverride={weekdayTabularData}
        />
      </div>
    </div>
  )
}

export default ActivityView
