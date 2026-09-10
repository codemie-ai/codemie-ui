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

import { type FC, useMemo } from 'react'

import Table from '@/components/Table'
import {
  ColumnType,
  MetricFormat,
  type AnalyticsQueryParams,
  type Metric,
  type TabularResponse,
} from '@/types/analytics'
import type {
  CliAnalyticsCodeChangesKPIs,
  CliAnalyticsDeadSessionsKPIs,
  CliAnalyticsEfficiencyKPIs,
  SessionRow,
} from '@/types/cliAnalytics'
import { DefinitionTypes } from '@/types/table'
import { formatMetricValue, formatTokens } from '@/utils/analyticsFormatters'
import { formatCliAnalyticsCost } from '@/utils/currency'

import SessionModal from './SessionModal'
import AnalyticsWidget from '../../AnalyticsWidget'
import BarChartWidget from '../../widgets/BarChartWidget'
import MetricCard from '../../widgets/MetricCard'
import { useCliAnalyticsEfficiency } from '../hooks/useCliAnalyticsEfficiency'
import { useCliAnalyticsSessions } from '../hooks/useCliAnalyticsSessions'
import { useSessionModal } from '../hooks/useSessionModal'

function buildContextBloatMetrics(kpis: CliAnalyticsEfficiencyKPIs | null): Metric[] {
  const prompt = kpis?.worst_session_prompt ?? null

  let promptPreview = '—'

  if (prompt) {
    promptPreview = prompt.length > 40 ? `${prompt.slice(0, 40)}…` : prompt
  }

  return [
    {
      id: 'avg_context_per_call',
      label: 'Avg Context / Call',
      type: ColumnType.INTEGER,
      format: MetricFormat.TOKENS,
      value: kpis?.avg_context_per_call ?? 0,
      description: 'cache re-read each call',
    },
    {
      id: 'worst_session_ctx_per_call',
      label: 'Worst Session Ctx / Call',
      type: ColumnType.INTEGER,
      format: MetricFormat.TOKENS,
      value: kpis?.worst_session_ctx_per_call ?? 0,
      description: promptPreview,
    },
    {
      id: 'cache_read_cost_usd',
      label: 'Cache-Read Cost',
      type: ColumnType.NUMBER,
      format: MetricFormat.CURRENCY,
      value: kpis?.cache_read_cost_usd ?? 0,
      description: kpis
        ? `${formatMetricValue(kpis.bloat_pct, MetricFormat.PERCENTAGE)} of spend`
        : '—',
    },
    {
      id: 'bloat_pct',
      label: 'Bloat %',
      type: ColumnType.NUMBER,
      format: MetricFormat.PERCENTAGE,
      value: kpis?.bloat_pct ?? 0,
      description: 'spend on context re-reads',
    },
  ]
}

function buildDeadSessionsMetrics(
  kpis: CliAnalyticsEfficiencyKPIs | null,
  deadSessions: CliAnalyticsDeadSessionsKPIs | null
): Metric[] {
  return [
    {
      id: 'dead_sessions_count',
      label: 'Dead Sessions',
      type: ColumnType.INTEGER,
      value: deadSessions?.count ?? 0,
      description: deadSessions
        ? `${formatMetricValue(deadSessions.pct_of_sessions, MetricFormat.PERCENTAGE)} of sessions`
        : '0% of sessions',
    },
    {
      id: 'wasted_cost_usd',
      label: 'Wasted Cost',
      type: ColumnType.NUMBER,
      format: MetricFormat.CURRENCY,
      value: deadSessions?.wasted_cost_usd ?? 0,
      description: wastedCostSubtitle(kpis, deadSessions),
    },
    {
      id: 'avg_cost_per_dead',
      label: 'Avg Cost / Dead',
      type: ColumnType.NUMBER,
      format: MetricFormat.CURRENCY,
      value: deadSessions?.avg_cost_per_dead ?? 0,
      description: 'per unproductive session',
    },
  ]
}

function buildCodeChangesMetrics(codeChanges: CliAnalyticsCodeChangesKPIs | null): Metric[] {
  return [
    {
      id: 'files_changed',
      label: 'Files Changed',
      type: ColumnType.INTEGER,
      value: codeChanges?.files_changed ?? 0,
      description: 'written or edited',
    },
    {
      id: 'files_written',
      label: 'Files Written',
      type: ColumnType.INTEGER,
      value: codeChanges?.files_written ?? 0,
      description: 'Write tool',
    },
    {
      id: 'files_edited',
      label: 'Files Edited',
      type: ColumnType.INTEGER,
      value: codeChanges?.files_edited ?? 0,
      description: 'Edit tool',
    },
    {
      id: 'net_lines',
      label: 'Net Lines',
      type: ColumnType.INTEGER,
      value: codeChanges?.net_lines ?? 0,
      description: 'added − removed',
    },
  ]
}

function wastedCostSubtitle(
  kpis: CliAnalyticsEfficiencyKPIs | null,
  deadSessions: CliAnalyticsDeadSessionsKPIs | null
): string {
  if (!kpis || kpis.cache_read_cost_usd <= 0 || !deadSessions) return '0% of spend'
  return `${formatMetricValue(
    (deadSessions.wasted_cost_usd / kpis.cache_read_cost_usd) * 100,
    MetricFormat.PERCENTAGE
  )} of spend`
}

const SESSION_COLUMN_DEFS = [
  { key: 'session', label: 'SESSION', type: DefinitionTypes.Custom },
  { key: 'delivery_framework', label: 'FRAMEWORK', type: DefinitionTypes.Custom },
  { key: 'ctx_per_call', label: 'CTX/CALL', type: DefinitionTypes.Custom },
  { key: 'cache_read', label: 'CACHE READ', type: DefinitionTypes.Custom },
  { key: 'cost', label: 'COST', type: DefinitionTypes.Custom },
  { key: 'bloat', label: 'BLOAT%', type: DefinitionTypes.Custom },
]

const SESSION_CUSTOM_COLS = {
  session: (row: SessionRow) => (
    <div className="truncate max-w-xs text-sm text-text-primary" title={row.prompt ?? row.trace_id}>
      {(row.prompt ?? row.trace_id).slice(0, 40)}
      {(row.prompt ?? row.trace_id).length > 40 ? '…' : ''}
    </div>
  ),
  delivery_framework: (row: SessionRow) => (
    <div
      className="truncate max-w-[200px] text-sm text-text-primary"
      title={row.delivery_framework ?? ''}
    >
      {row.delivery_framework || '—'}
    </div>
  ),
  ctx_per_call: (row: SessionRow) => (
    <div className="text-sm text-text-primary tabular-nums">
      {row.turns ? formatTokens((row.cache_read_tokens ?? 0) / row.turns) : '—'}
    </div>
  ),
  cache_read: (row: SessionRow) => (
    <div className="text-sm text-text-primary tabular-nums">
      {formatTokens(row.cache_read_tokens ?? 0)}
    </div>
  ),
  cost: (row: SessionRow) => (
    <div className="text-sm text-text-primary tabular-nums">
      {formatCliAnalyticsCost(row.cost_usd)}
    </div>
  ),
  bloat: (row: SessionRow) => (
    <div className="text-sm text-text-primary tabular-nums">
      {row.bloat_pct != null ? formatMetricValue(row.bloat_pct, MetricFormat.PERCENTAGE) : '—'}
    </div>
  ),
}

interface EfficiencyViewProps {
  filters: AnalyticsQueryParams
  repositories?: string[]
}

const EfficiencyView: FC<EfficiencyViewProps> = ({ filters, repositories }) => {
  const { kpis, deadSessions, sessionDepth, codeChanges, loading, error } =
    useCliAnalyticsEfficiency(filters, repositories)

  const { displayRows, loading: sessionsLoading } = useCliAnalyticsSessions(filters, repositories, {
    sort_by: 'ctx_per_call',
    per_page: 10,
  })

  const { selectedTraceId, selectSession, closeSession } = useSessionModal()

  const errorDetails = error ? { message: error } : null

  const contextBloatMetrics = useMemo(() => buildContextBloatMetrics(kpis), [kpis])
  const deadSessionsMetrics = useMemo(
    () => buildDeadSessionsMetrics(kpis, deadSessions),
    [kpis, deadSessions]
  )
  const codeChangesMetrics = useMemo(() => buildCodeChangesMetrics(codeChanges), [codeChanges])

  const depthTabularData: TabularResponse = useMemo(
    () => ({
      data: {
        columns: [
          { id: 'bucket', label: 'Turns', type: ColumnType.STRING },
          { id: 'count', label: 'Sessions', type: ColumnType.INTEGER },
        ],
        rows: sessionDepth.map(({ bucket, count }) => ({ bucket, count })),
      },
      metadata: { timestamp: '', data_as_of: '' },
      pagination: {
        page: 0,
        per_page: sessionDepth.length,
        total_count: sessionDepth.length,
        has_more: false,
      },
    }),
    [sessionDepth]
  )

  return (
    <div className="flex flex-col gap-6">
      <AnalyticsWidget
        title="Context Bloat"
        expandable={false}
        loading={loading}
        error={errorDetails}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {contextBloatMetrics.map((metric) => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </div>
      </AnalyticsWidget>

      <AnalyticsWidget
        title="Most bloated sessions"
        loading={sessionsLoading}
        error={null}
        actions={<span className="text-xs text-text-quaternary">by context re-read per call</span>}
      >
        <Table<SessionRow>
          items={displayRows}
          columnDefinitions={SESSION_COLUMN_DEFS}
          customRenderColumns={SESSION_CUSTOM_COLS}
          idPath="trace_id"
          loading={false}
          embedded
          selected={
            selectedTraceId ? displayRows.filter((r) => r.trace_id === selectedTraceId) : null
          }
          onSelectRow={(rows) => {
            const clicked = rows.find((r) => !selectedTraceId || r.trace_id !== selectedTraceId)
            if (clicked?.trace_id != null) selectSession(clicked.trace_id)
            else closeSession()
          }}
        />
      </AnalyticsWidget>

      <AnalyticsWidget
        title="Dead Sessions"
        expandable={false}
        loading={loading}
        error={errorDetails}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {deadSessionsMetrics.map((metric) => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </div>
      </AnalyticsWidget>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <BarChartWidget
            title="Session depth"
            labelField="bucket"
            valueField="count"
            yAxisLabel="count"
            yAxisInteger
            dataOverride={depthTabularData}
            actions={<span className="text-xs text-text-quaternary">turns per session</span>}
          />
        </div>

        <div className="lg:col-span-2">
          <AnalyticsWidget
            title="Code changes"
            loading={loading}
            error={errorDetails}
            expandable={false}
          >
            <div className="grid grid-cols-2 gap-3">
              {codeChangesMetrics.map((metric) => (
                <MetricCard key={metric.id} metric={metric} />
              ))}
            </div>
          </AnalyticsWidget>
        </div>
      </div>

      {selectedTraceId && <SessionModal traceId={selectedTraceId} onHide={closeSession} />}
    </div>
  )
}

export default EfficiencyView
