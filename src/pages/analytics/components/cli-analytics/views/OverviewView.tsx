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

import { type FC, useCallback, useMemo, useRef, useState } from 'react'

import Select from '@/components/form/Select'
import { UNATTRIBUTED_LABEL } from '@/constants/cliAnalytics'
import {
  ColumnType,
  MetricFormat,
  TabularMetricType,
  type AnalyticsQueryParams,
  type Metric,
  type TabularResponse,
} from '@/types/analytics'
import type { ExtendedSessionsTarget, OverviewKPIs, RepositoryRow } from '@/types/cliAnalytics'
import { formatMetricValue } from '@/utils/analyticsFormatters'

import ExtendedSessionsModal from './ExtendedSessionsModal'
import RepositoriesTable from './RepositoriesTable'
import AnalyticsWidget from '../../AnalyticsWidget'
import { TopNFilter, TOP_N_OPTIONS, toTopN, type TopN } from '../../utils/topNFilter'
import BarChartWidget from '../../widgets/BarChartWidget'
import DonutChartWidget from '../../widgets/DonutChartWidget'
import MetricCard from '../../widgets/MetricCard'
import { buildRepoMetrics, formatDuration } from '../format'
import { useCliAnalyticsOverview } from '../hooks/useCliAnalyticsOverview'
import { useCliAnalyticsRepositories } from '../hooks/useCliAnalyticsRepositories'

interface OverviewViewProps {
  filters: AnalyticsQueryParams
  repositories?: string[]
}

function describeNetLines(netLines: number | null | undefined): string {
  if (netLines == null) return 'net lines not reported'
  const sign = netLines >= 0 ? '+' : ''
  return `net ${sign}${netLines.toLocaleString()} lines`
}

// No calls means no denominator; a real 0% still shows as a percentage.
function describeToolCallSuccess(totalCalls: number, successRate: number): string {
  if (totalCalls > 0) return `${formatMetricValue(successRate, MetricFormat.PERCENTAGE)} success`
  return '—'
}

// Row 1: sessions and spend.
function buildActivityMetrics(kpis: OverviewKPIs): Metric[] {
  return [
    {
      id: 'total_sessions',
      label: 'Total Sessions',
      type: ColumnType.INTEGER,
      value: kpis.total_sessions,
    },
    {
      id: 'total_cost_usd',
      label: 'Est. Cost',
      type: ColumnType.NUMBER,
      format: MetricFormat.CURRENCY,
      value: kpis.total_cost_usd,
      description: 'estimated from session tokens',
    },
    {
      id: 'cache_read_cost_usd',
      label: 'Cache Read Cost',
      type: ColumnType.NUMBER,
      format: MetricFormat.CURRENCY,
      value: kpis.cache_read_cost_usd,
      description: 'spend on context re-reads',
    },
    {
      id: 'total_turns',
      label: 'Turns',
      type: ColumnType.INTEGER,
      value: kpis.total_turns,
      description: `${(kpis.total_turns / Math.max(1, kpis.total_sessions)).toFixed(
        1
      )} per session`,
    },
    {
      id: 'duration_ms',
      label: 'Duration',
      type: ColumnType.STRING,
      value: formatDuration(kpis.duration_ms),
      description: 'wall-clock span',
    },
  ]
}

// Row 2: tokens only. Every card is a sum, so every title says Total; titles and captions follow
// the Insights summary.
// Full figures: a compact "2.9B" reads as "2.98" in the mono font.
function buildTokenMetrics(kpis: OverviewKPIs): Metric[] {
  return [
    {
      id: 'total_tokens',
      label: 'Total Tokens',
      type: ColumnType.INTEGER,
      value: kpis.total_tokens,
      description: 'Total LLM tokens',
    },
    {
      id: 'total_input_tokens',
      label: 'Total Input Tokens',
      type: ColumnType.INTEGER,
      value: kpis.total_input_tokens,
      description: 'LLM input tokens',
    },
    {
      id: 'total_output_tokens',
      label: 'Total Output Tokens',
      type: ColumnType.INTEGER,
      value: kpis.total_output_tokens,
      description: 'LLM output tokens',
    },
    {
      id: 'total_cache_read_tokens',
      label: 'Total Cache Read Tokens',
      type: ColumnType.INTEGER,
      value: kpis.total_cache_read_tokens,
      description: 'Cached input tokens',
    },
    {
      id: 'total_cache_creation_tokens',
      label: 'Total Cache Creation Tokens',
      type: ColumnType.INTEGER,
      value: kpis.total_cache_creation_tokens,
      description: 'Cache creation tokens',
    },
  ]
}

// Row 3: output and efficiency.
function buildEfficiencyMetrics(kpis: OverviewKPIs): Metric[] {
  const deadPct = (kpis.dead_sessions / Math.max(1, kpis.total_sessions)) * 100
  return [
    {
      id: 'total_tool_calls',
      label: 'Tool Calls',
      type: ColumnType.INTEGER,
      value: kpis.total_tool_calls,
      description: describeToolCallSuccess(kpis.total_tool_calls, kpis.tool_call_success_rate),
    },
    {
      id: 'total_files_changed',
      label: 'Files Changed',
      type: ColumnType.INTEGER,
      value: kpis.total_files_changed,
      description: describeNetLines(kpis.net_lines),
    },
    {
      id: 'dead_sessions',
      label: 'Dead Sessions',
      type: ColumnType.INTEGER,
      value: kpis.dead_sessions,
      description: `${formatMetricValue(deadPct, MetricFormat.PERCENTAGE)} of sessions`,
    },
    {
      id: 'avg_context_per_call',
      label: 'Avg Cache Read / Call',
      type: ColumnType.INTEGER,
      value: Math.round(kpis.avg_context_per_call),
      description: 'cache read tokens per call',
    },
    {
      id: 'bloat_pct',
      label: 'Bloat %',
      type: ColumnType.NUMBER,
      format: MetricFormat.PERCENTAGE,
      value: kpis.bloat_pct,
      description: 'cache read cost / est. cost',
    },
  ]
}

const OverviewView: FC<OverviewViewProps> = ({ filters, repositories }) => {
  const [modelsTopN, setModelsTopN] = useState<TopN>(TopNFilter.TEN)
  const [selectedTarget, setSelectedTarget] = useState<ExtendedSessionsTarget | null>(null)
  const clearSelectionRef = useRef<(() => void) | null>(null)

  const handleRepoClick = useCallback(
    (row: RepositoryRow) => {
      setSelectedTarget({
        title: row.repository ?? UNATTRIBUTED_LABEL,
        metrics: buildRepoMetrics(row),
        sessionFilters: {
          ...filters,
          ...(row.repository != null ? { repository: row.repository } : {}),
        },
        repositories: row.repository != null ? [row.repository] : undefined,
        isUnattributed: row.repository === null,
      })
    },
    [filters]
  )

  const closeRepoModal = useCallback(() => {
    setSelectedTarget(null)
    clearSelectionRef.current?.()
  }, [])

  const { kpis, dailyBuckets, modelBreakdown, loading, error } = useCliAnalyticsOverview(
    filters,
    repositories
  )

  const {
    rows: repoRows,
    loading: repoLoading,
    error: repoError,
    search: repoSearch,
    setSearch: setRepoSearch,
  } = useCliAnalyticsRepositories(filters, repositories, false, 10)

  // One flat grid, like the Insights summary: 15 cards fill three rows of five on a wide screen.
  const summaryMetrics: Metric[] = useMemo(
    () =>
      kpis
        ? [
            ...buildActivityMetrics(kpis),
            ...buildTokenMetrics(kpis),
            ...buildEfficiencyMetrics(kpis),
          ]
        : [],
    [kpis]
  )

  const activityTimelineData: TabularResponse = useMemo(
    () => ({
      data: {
        columns: [
          { id: 'day', label: 'Day', type: ColumnType.STRING },
          { id: 'net_lines', label: 'Net lines', type: ColumnType.INTEGER },
        ],
        rows: dailyBuckets.map(({ day, net_lines }) => ({ day, net_lines })),
      },
      metadata: { timestamp: '', data_as_of: '' },
      pagination: {
        page: 0,
        per_page: dailyBuckets.length,
        total_count: dailyBuckets.length,
        has_more: false,
      },
    }),
    [dailyBuckets]
  )

  const modelBreakdownData: TabularResponse = useMemo(() => {
    const rows =
      modelsTopN === TopNFilter.ALL ? modelBreakdown : modelBreakdown.slice(0, modelsTopN as number)

    return {
      data: {
        columns: [
          { id: 'model_name', label: 'Model', type: ColumnType.STRING },
          { id: 'session_count', label: 'Sessions', type: ColumnType.INTEGER },
        ],
        rows: rows.map(({ model_name, session_count }) => ({
          model_name,
          session_count,
        })),
      },
      metadata: { timestamp: '', data_as_of: '' },
      pagination: {
        page: 0,
        per_page: rows.length,
        total_count: rows.length,
        has_more: false,
      },
    }
  }, [modelBreakdown, modelsTopN])

  const errorDetails = error ? { message: error } : null

  return (
    <>
      <div className="flex flex-col gap-6">
        <AnalyticsWidget title="Summary" expandable={false} loading={loading} error={errorDetails}>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 max-sm:gap-2">
            {summaryMetrics.map((metric) => (
              <MetricCard key={metric.id} metric={metric} />
            ))}
          </div>
        </AnalyticsWidget>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BarChartWidget
            title="Net Lines Over Time"
            description="Lines added minus removed, per day."
            labelField="day"
            valueField="net_lines"
            yAxisLabel="net_lines"
            yAxisInteger
            dataOverride={activityTimelineData}
          />
          <DonutChartWidget
            metricType={TabularMetricType.CLI_LLMS}
            title="Sessions by Model"
            description="CLI sessions per model."
            valueField="session_count"
            labelField="model_name"
            dataOverride={modelBreakdownData}
            emptyStateLabel="No session data available"
            actions={
              <Select
                value={String(modelsTopN)}
                onChange={(e) => setModelsTopN(toTopN(e.value))}
                options={TOP_N_OPTIONS}
                className="!h-8"
              />
            }
          />
        </div>

        <RepositoriesTable
          rows={repoRows}
          loading={repoLoading}
          error={repoError}
          onRowClick={handleRepoClick}
          clearSelectionRef={clearSelectionRef}
          search={repoSearch}
          onSearchChange={setRepoSearch}
        />
      </div>
      {selectedTarget && (
        <ExtendedSessionsModal target={selectedTarget} isVisible onHide={closeRepoModal} />
      )}
    </>
  )
}

export default OverviewView
