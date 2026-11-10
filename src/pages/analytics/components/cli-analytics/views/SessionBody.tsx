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
import { formatMetricValue, formatTokens } from '@/utils/analyticsFormatters'
import { formatSpend } from '@/utils/currency'
import { formatDateTime } from '@/utils/helpers'

import MetricGroups, { type MetricGroup } from './MetricGroups'
import SessionCostValue from './SessionCostValue'
import SessionTimeline from './SessionTimeline'
import AnalyticsWidget from '../../AnalyticsWidget'
import BarChartWidget from '../../widgets/BarChartWidget'
import { METRIC_VALUE_CLASS_NAME } from '../../widgets/MetricCard'
import {
  describeSessionCount,
  describeSessionToolCalls,
  formatDuration,
  type SessionCount,
} from '../format'

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
      ticks: { callback: (v: any) => formatSpend(v as number) },
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

// Unknown cost: no cost series, so the cost axis would only print a meaningless $0 scale.
const growthChartOptionsWithoutCost = {
  ...growthChartOptions,
  scales: {
    ...growthChartOptions.scales,
    y: { ...growthChartOptions.scales.y, display: false },
  },
}

// Build a Metric object with a pre-formatted string value so MetricCard renders
// it verbatim without a secondary formatMetricValue transformation.
function m(id: string, label: string, value: string, description?: string): Metric {
  return { id, label, type: ColumnType.STRING, value, description }
}

// A finalized count has no qualifier ("Provisional", "Not reported"), so it gets a plain caption
// instead: an empty caption next to captioned cards reads as unfinished.
const countMetric = (id: string, label: string, c: SessionCount, caption: string): Metric =>
  m(id, label, c.value, c.note || caption)

interface SessionBodyProps {
  session: SessionDetail
}

const SessionBody: FC<SessionBodyProps> = ({ session }) => {
  const totalTokens =
    (session.input_tokens ?? 0) +
    (session.output_tokens ?? 0) +
    (session.cache_read_tokens ?? 0) +
    (session.cache_creation_tokens ?? 0)

  const costMetrics: Metric[] = [
    m('cost_usd', 'Est. Cost', formatSpend(session.cost_usd), 'from token usage'),
    m(
      'cache_read_cost',
      'Cache Read Cost',
      session.cache_read_cost_usd != null ? formatSpend(session.cache_read_cost_usd) : '—',
      'spend on context re-reads'
    ),
    m('duration', 'Duration', formatDuration(session.duration_ms), 'wall-clock'),
    m(
      'active',
      'Active',
      session.active_ms != null ? formatDuration(session.active_ms) : '—',
      'excludes idle'
    ),
    m('started', 'Started', formatDateTime(session.start_time, 'short'), 'first event'),
  ]

  // Unknown or understated money replaces the plain value; a fully priced session renders it as is.
  const costIsQualified =
    session.cost_available === false || (session.unpriced_models?.length ?? 0) > 0
  const costOverrides: Record<string, number | null | undefined> = {
    cost_usd: session.cost_usd,
    cache_read_cost: session.cache_read_cost_usd,
  }
  const costValueOverride = (id: string) =>
    costIsQualified && id in costOverrides ? (
      <p className={METRIC_VALUE_CLASS_NAME}>
        <SessionCostValue
          value={costOverrides[id]}
          costAvailable={session.cost_available}
          unpricedModels={session.unpriced_models}
        />
      </p>
    ) : undefined

  // Same order as the Overview tokens row. Only the first card keeps "Total".
  // Full figures, since "2.9B" reads as "2.98".
  const tokenMetrics: Metric[] = [
    m('total_tokens', 'Total Tokens', formatMetricValue(totalTokens), 'Total LLM tokens'),
    m('input', 'Input Tokens', formatMetricValue(session.input_tokens), 'LLM input tokens'),
    m('output', 'Output Tokens', formatMetricValue(session.output_tokens), 'LLM output tokens'),
    m(
      'cache_read',
      'Cache Read Tokens',
      formatMetricValue(session.cache_read_tokens ?? 0),
      'Cached input tokens'
    ),
    m(
      'cache_create',
      'Cache Creation Tokens',
      formatMetricValue(session.cache_creation_tokens ?? 0),
      'Cache creation tokens'
    ),
  ]

  const activityMetrics: Metric[] = [
    countMetric(
      'turns',
      'Turns',
      describeSessionCount(session.turns, session, 'turns'),
      'prompts submitted'
    ),
    countMetric('tool_calls', 'Tool Calls', describeSessionToolCalls(session), 'tools run'),
    countMetric(
      'agents',
      'Agents',
      describeSessionCount(session.agent_count, session, 'agents'),
      'subagents dispatched'
    ),
    countMetric(
      'skills',
      'Skills',
      describeSessionCount(session.skill_count, session, 'skills'),
      'skills invoked'
    ),
  ]

  const metricGroups: MetricGroup[] = [
    { id: 'cost', title: 'Cost & Time', metrics: costMetrics },
    { id: 'tokens', title: 'Tokens', metrics: tokenMetrics },
    {
      id: 'activity',
      title: 'Activity',
      metrics: activityMetrics,
      // qualifiers ("Provisional · 1 observed of 3 total · 100% ok") need more than the default 3 lines
      mutedTextClassName: 'text-text-quaternary line-clamp-5',
    },
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
      <AnalyticsWidget title="Summary" expandable={false}>
        <MetricGroups
          groups={metricGroups}
          valueOverride={(metric) => costValueOverride(metric.id)}
        />
      </AnalyticsWidget>

      <AnalyticsWidget
        title="Token & Cost Growth"
        description="Cumulative cost and tokens per turn."
      >
        {growthData ? (
          // h-[240px]: explicit design-specified container height for the growth chart
          <div className="h-[240px]">
            <Line
              data={{
                labels: growthData.labels,
                datasets: [
                  // An unknown cost has no curve: the per-turn zeros are not a confirmed $0.
                  ...(session.cost_available === false
                    ? []
                    : [
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
                      ]),
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
              options={
                session.cost_available === false
                  ? growthChartOptionsWithoutCost
                  : growthChartOptions
              }
            />
          </div>
        ) : (
          <p className="text-text-quaternary text-sm">
            Per-turn data not available for this session.
          </p>
        )}
      </AnalyticsWidget>

      <AnalyticsWidget title="Timeline" description="Main session and dispatched agents over time.">
        <SessionTimeline
          dispatches={session.dispatches ?? []}
          sessionDurationMs={session.duration_ms}
          costAvailable={session.cost_available}
        />
      </AnalyticsWidget>

      <BarChartWidget
        title="Most Used Tools"
        description="Tool calls in this session."
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
