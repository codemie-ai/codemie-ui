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

function buildHeadlineMetrics(kpis: OverviewKPIs): Metric[] {
  return [
    {
      id: 'total_sessions',
      label: 'Sessions',
      type: ColumnType.INTEGER,
      value: kpis.total_sessions,
    },
    {
      id: 'duration_ms',
      label: 'Duration',
      type: ColumnType.NUMBER,
      value: formatDuration(kpis.duration_ms),
      description: 'wall-clock span',
    },
    {
      id: 'total_turns',
      label: 'Turns',
      type: ColumnType.INTEGER,
      value: kpis.total_turns,
      description: `${(kpis.total_turns / Math.max(1, kpis.total_sessions)).toFixed(1)}/session`,
    },
    {
      id: 'total_files_changed',
      label: 'Files Touched',
      type: ColumnType.INTEGER,
      value: kpis.total_files_changed,
      description: `net ${kpis.net_lines >= 0 ? '+' : ''}${kpis.net_lines} lines`,
    },
    {
      id: 'total_tool_calls',
      label: 'Tool Calls',
      type: ColumnType.INTEGER,
      value: kpis.total_tool_calls,
      description: `${kpis.tool_call_success_rate.toFixed(1)}% success`,
    },
    {
      id: 'total_cost_usd',
      label: 'Est. Cost',
      type: ColumnType.NUMBER,
      format: MetricFormat.CURRENCY,
      value: kpis.total_cost_usd,
      description: 'tokens × pricing',
    },
  ]
}

function buildTokenMetrics(kpis: OverviewKPIs): Metric[] {
  return [
    {
      id: 'total_input_tokens',
      label: 'Input Tokens',
      type: ColumnType.INTEGER,
      format: MetricFormat.TOKENS,
      value: kpis.total_input_tokens,
      description: 'prompts sent',
    },
    {
      id: 'total_output_tokens',
      label: 'Output Tokens',
      type: ColumnType.INTEGER,
      format: MetricFormat.TOKENS,
      value: kpis.total_output_tokens,
      description: 'completions',
    },
    {
      id: 'total_cache_creation_tokens',
      label: 'Cache Write',
      type: ColumnType.INTEGER,
      format: MetricFormat.TOKENS,
      value: kpis.total_cache_creation_tokens,
      description: 'written to cache',
    },
    {
      id: 'total_cache_read_tokens',
      label: 'Cache Read',
      type: ColumnType.INTEGER,
      format: MetricFormat.TOKENS,
      value: kpis.total_cache_read_tokens,
      description: 'served from cache',
    },
    {
      id: 'total_tokens',
      label: 'Total Tokens',
      type: ColumnType.INTEGER,
      format: MetricFormat.TOKENS,
      value: kpis.total_tokens,
      description: 'across sessions',
    },
  ]
}

function buildEfficiencyMetrics(kpis: OverviewKPIs): Metric[] {
  return [
    {
      id: 'cache_read_cost_usd',
      label: 'Cache-Read Cost',
      type: ColumnType.NUMBER,
      format: MetricFormat.CURRENCY,
      value: kpis.cache_read_cost_usd,
      description: 'spend on context re-reads',
    },
    {
      id: 'bloat_pct',
      label: 'Bloat %',
      type: ColumnType.NUMBER,
      format: MetricFormat.PERCENTAGE,
      value: kpis.bloat_pct,
      description: 'cache reads / total cost',
    },
    {
      id: 'dead_sessions',
      label: 'Dead Sessions',
      type: ColumnType.INTEGER,
      value: kpis.dead_sessions,
      description: `${((kpis.dead_sessions / Math.max(1, kpis.total_sessions)) * 100).toFixed(
        1
      )}% no file output`,
    },
    {
      id: 'avg_context_per_call',
      label: 'Avg Context / Call',
      type: ColumnType.INTEGER,
      format: MetricFormat.TOKENS,
      value: Math.round(kpis.avg_context_per_call),
      description: 'cache re-read per call',
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

  const headlineMetrics = useMemo(() => (kpis ? buildHeadlineMetrics(kpis) : []), [kpis])
  const tokenMetrics = useMemo(() => (kpis ? buildTokenMetrics(kpis) : []), [kpis])
  const efficiencyMetrics = useMemo(() => (kpis ? buildEfficiencyMetrics(kpis) : []), [kpis])

  const summaryMetrics = useMemo(
    () => [...headlineMetrics, ...tokenMetrics, ...efficiencyMetrics],
    [headlineMetrics, tokenMetrics, efficiencyMetrics]
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {summaryMetrics.map((metric) => (
              <MetricCard key={metric.id} metric={metric} />
            ))}
          </div>
        </AnalyticsWidget>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BarChartWidget
            title="Net lines over time"
            labelField="day"
            valueField="net_lines"
            yAxisLabel="net_lines"
            yAxisInteger
            dataOverride={activityTimelineData}
          />
          <DonutChartWidget
            metricType={TabularMetricType.CLI_LLMS}
            title="Sessions by Model"
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
