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

import {
  Chart as ChartJS,
  CategoryScale,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { type FC, useMemo } from 'react'
import { Line } from 'react-chartjs-2'

import { ColumnType, type Metric, type TabularResponse } from '@/types/analytics'
import type { SessionDetail } from '@/types/cliAnalytics'
import { formatTokens } from '@/utils/analyticsFormatters'
import { formatCliAnalyticsCost } from '@/utils/currency'
import { formatDateTime } from '@/utils/helpers'

import SessionTimeline from './SessionTimeline'
import AnalyticsWidget from '../../AnalyticsWidget'
import BarChartWidget from '../../widgets/BarChartWidget'
import MetricCard from '../../widgets/MetricCard'
import { formatDuration } from '../format'

ChartJS.register(
  CategoryScale,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
)

// Chart options defined outside the component to avoid recreation on each render.
const growthChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    legend: { display: true },
    // chartjs-plugin-datalabels is registered globally elsewhere; disable it here.
    datalabels: { display: false },
  },
  scales: {
    x: {
      ticks: {
        maxTicksLimit: 8,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        callback: (value: any) => `turn ${value}`,
      },
    },
    y: {
      type: 'linear' as const,
      position: 'left' as const,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ticks: { callback: (v: any) => formatCliAnalyticsCost(v as number) },
    },
    y1: {
      type: 'linear' as const,
      position: 'right' as const,
      grid: { drawOnChartArea: false },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ticks: { callback: (v: any) => formatTokens(v as number) },
    },
  },
}

// Build a Metric object with a pre-formatted string value so MetricCard renders
// it verbatim without a secondary formatMetricValue transformation.
function m(id: string, label: string, value: string, description?: string): Metric {
  return { id, label, type: ColumnType.STRING, value, description }
}

interface SessionBodyProps {
  session: SessionDetail
}

const SessionBody: FC<SessionBodyProps> = ({ session }) => {
  const totalTokens =
    (session.input_tokens ?? 0) +
    (session.output_tokens ?? 0) +
    (session.cache_read_tokens ?? 0) +
    (session.cache_creation_tokens ?? 0)

  const toolCallsOkLabel: string | undefined =
    session.tool_calls_success != null && (session.tool_call_count ?? 0) > 0
      ? `${Math.round((session.tool_calls_success / session.tool_call_count) * 100)}% ok`
      : undefined

  const costMetrics: Metric[] = [
    m('cost_usd', 'Cost', formatCliAnalyticsCost(session.cost_usd), 'API-equivalent'),
    m(
      'cache_read_cost',
      'Cache-read',
      session.cache_read_cost_usd != null
        ? formatCliAnalyticsCost(session.cache_read_cost_usd)
        : '—'
    ),
    m('duration', 'Duration', formatDuration(session.duration_ms), 'wall-clock'),
    m(
      'active',
      'Active',
      session.active_ms != null ? formatDuration(session.active_ms) : '—',
      'excludes idle'
    ),
    m('started', 'Started', formatDateTime(session.start_time, 'short')),
  ]

  const tokenMetrics: Metric[] = [
    m('input', 'Input', formatTokens(session.input_tokens)),
    m('output', 'Output', formatTokens(session.output_tokens)),
    m('cache_read', 'Cache read', formatTokens(session.cache_read_tokens ?? 0)),
    m('cache_create', 'Cache create', formatTokens(session.cache_creation_tokens ?? 0)),
    m('total_tokens', 'Total', formatTokens(totalTokens)),
  ]

  const activityMetrics: Metric[] = [
    m('turns', 'Turns', (session.turns ?? 0).toLocaleString()),
    m(
      'tool_calls',
      'Tool calls',
      (session.tool_call_count ?? 0).toLocaleString(),
      toolCallsOkLabel
    ),
    m('agents', 'Agents', session.agent_count != null ? String(session.agent_count) : '—'),
    m('skills', 'Skills', session.skill_count != null ? String(session.skill_count) : '—'),
  ]

  const growthData = useMemo(() => {
    const sorted = [...(session.events ?? [])].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
    const apiEvents = sorted.filter((e) => e.cost_usd != null || e.input_tokens != null)
    if (apiEvents.length < 2) return null

    let cumCost = 0
    let cumTokens = 0
    const costSeries: number[] = []
    const tokenSeries: number[] = []
    const labels: string[] = []

    apiEvents.forEach((e, i) => {
      cumCost += e.cost_usd ?? 0
      cumTokens += (e.input_tokens ?? 0) + (e.output_tokens ?? 0) + (e.cache_read_tokens ?? 0)
      costSeries.push(cumCost)
      tokenSeries.push(cumTokens)
      labels.push(String(i + 1))
    })

    return { labels, costSeries, tokenSeries }
  }, [session.events])

  const toolsTabular = useMemo((): TabularResponse => {
    const tools = session.tools ?? []
    return {
      data: {
        columns: [
          { id: 'tool_name', label: 'Tool', type: ColumnType.STRING },
          { id: 'call_count', label: 'Calls', type: ColumnType.INTEGER },
        ],
        rows: tools as unknown as Record<string, unknown>[],
      },
      metadata: { timestamp: '', data_as_of: '' },
      pagination: { page: 0, per_page: tools.length, total_count: tools.length, has_more: false },
    }
  }, [session.tools])

  return (
    <div className="flex flex-col gap-6 pb-6">
      <div className="grid grid-cols-3 gap-4">
        <AnalyticsWidget title="Cost & Time" expandable={false}>
          <div className="grid grid-cols-2 gap-3">
            {costMetrics.map((metric) => (
              <MetricCard key={metric.id} metric={metric} />
            ))}
          </div>
        </AnalyticsWidget>

        <AnalyticsWidget title="Token usage" expandable={false}>
          <div className="grid grid-cols-2 gap-3">
            {tokenMetrics.map((metric) => (
              <MetricCard key={metric.id} metric={metric} />
            ))}
          </div>
        </AnalyticsWidget>

        <AnalyticsWidget title="Activity" expandable={false}>
          <div className="grid grid-cols-2 gap-3">
            {activityMetrics.map((metric) => (
              <MetricCard key={metric.id} metric={metric} />
            ))}
          </div>
        </AnalyticsWidget>
      </div>

      <AnalyticsWidget title="Token & cost growth" description="cumulative per turn">
        {growthData ? (
          // h-[240px]: explicit design-specified container height for the growth chart
          <div className="h-[240px]">
            <Line
              data={{
                labels: growthData.labels,
                datasets: [
                  {
                    label: 'Cost ($)',
                    data: growthData.costSeries,
                    borderColor: '#7C5CFC',
                    backgroundColor: 'rgba(124,92,252,0.1)',
                    yAxisID: 'y',
                    fill: true,
                    tension: 0.25,
                    pointRadius: 0,
                  },
                  {
                    label: 'Tokens',
                    data: growthData.tokenSeries,
                    borderColor: '#F5A534',
                    backgroundColor: 'transparent',
                    yAxisID: 'y1',
                    fill: false,
                    tension: 0.25,
                    pointRadius: 0,
                  },
                ],
              }}
              options={growthChartOptions}
            />
          </div>
        ) : (
          <p className="text-text-quaternary text-sm">
            Per-turn data not available for this session.
          </p>
        )}
      </AnalyticsWidget>

      <AnalyticsWidget title="Timeline">
        <SessionTimeline
          dispatches={session.dispatches ?? []}
          sessionDurationMs={session.duration_ms}
        />
      </AnalyticsWidget>

      <BarChartWidget
        title="Most Used Tools"
        labelField="tool_name"
        valueField="call_count"
        yAxisLabel="call_count"
        yAxisInteger
        horizontal
        dataOverride={toolsTabular}
      />
    </div>
  )
}

export default SessionBody
