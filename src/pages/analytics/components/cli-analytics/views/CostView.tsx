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

import { type FC, useMemo, useState } from 'react'

import Select from '@/components/form/Select'
import Table from '@/components/Table'
import {
  ColumnType,
  MetricFormat,
  TabularMetricType,
  type AnalyticsQueryParams,
  type Metric,
  type TabularResponse,
} from '@/types/analytics'
import type { SessionRow } from '@/types/cliAnalytics'
import { DefinitionTypes } from '@/types/table'
import { formatCliAnalyticsCost } from '@/utils/currency'

import SessionModal from './SessionModal'
import AnalyticsWidget from '../../AnalyticsWidget'
import { TopNFilter, TOP_N_OPTIONS, toTopN, type TopN } from '../../utils/topNFilter'
import BarChartWidget from '../../widgets/BarChartWidget'
import DonutChartWidget from '../../widgets/DonutChartWidget'
import MetricCard from '../../widgets/MetricCard'
import { useCliAnalyticsCost } from '../hooks/useCliAnalyticsCost'
import { useCliAnalyticsSessions } from '../hooks/useCliAnalyticsSessions'
import { useSessionModal } from '../hooks/useSessionModal'

interface CostViewProps {
  filters: AnalyticsQueryParams
  repositories?: string[]
}

function truncatePrompt(s: string, max = 36): string {
  if (!s) return '—'
  return s.length > max ? `${s.slice(0, max)}…` : s
}

const PromptCell: FC<{ row: SessionRow }> = ({ row }) => (
  <div className="truncate max-w-[280px]" title={row.prompt ?? undefined}>
    {truncatePrompt(row.prompt ?? '')}
  </div>
)

const DeveloperCell: FC<{ row: SessionRow }> = ({ row }) => (
  <div className="truncate max-w-[180px]" title={row.developer_name ?? undefined}>
    {row.developer_name || '—'}
  </div>
)

const RepositoryCell: FC<{ row: SessionRow }> = ({ row }) => (
  <div className="truncate max-w-[200px]" title={row.repository ?? undefined}>
    {row.repository || '—'}
  </div>
)

const DeliveryFrameworkCell: FC<{ row: SessionRow }> = ({ row }) => (
  <div className="truncate max-w-[200px]" title={row.delivery_framework ?? ''}>
    {row.delivery_framework || '—'}
  </div>
)

const InputTokensCell: FC<{ row: SessionRow }> = ({ row }) => (
  <div className="text-right">{(row.input_tokens ?? 0).toLocaleString()}</div>
)

const OutputTokensCell: FC<{ row: SessionRow }> = ({ row }) => (
  <div className="text-right">{(row.output_tokens ?? 0).toLocaleString()}</div>
)

const CachedTokensCell: FC<{ row: SessionRow }> = ({ row }) => (
  <div className="text-right">
    {((row.cache_read_tokens ?? 0) + (row.cache_creation_tokens ?? 0)).toLocaleString()}
  </div>
)

const TotalTokensCell: FC<{ row: SessionRow }> = ({ row }) => (
  <div className="text-right">
    {(
      (row.input_tokens ?? 0) +
      (row.output_tokens ?? 0) +
      (row.cache_read_tokens ?? 0) +
      (row.cache_creation_tokens ?? 0)
    ).toLocaleString()}
  </div>
)

const CostCell: FC<{ row: SessionRow }> = ({ row }) => (
  <div className="text-right">{formatCliAnalyticsCost(row.cost_usd ?? 0)}</div>
)

const SESSION_CELL_RENDERERS = {
  prompt: (r: SessionRow) => <PromptCell row={r} />,
  developer_name: (r: SessionRow) => <DeveloperCell row={r} />,
  repository: (r: SessionRow) => <RepositoryCell row={r} />,
  delivery_framework: (r: SessionRow) => <DeliveryFrameworkCell row={r} />,
  input_tokens: (r: SessionRow) => <InputTokensCell row={r} />,
  output_tokens: (r: SessionRow) => <OutputTokensCell row={r} />,
  cache_read_tokens: (r: SessionRow) => <CachedTokensCell row={r} />,
  cost_usd: (r: SessionRow) => <TotalTokensCell row={r} />,
  cost_usd_display: (r: SessionRow) => <CostCell row={r} />,
}

function buildKpiMetrics(kpis: {
  total_cost_usd: number
  total_tokens: number
  avg_cost_per_session: number
}): Metric[] {
  return [
    {
      id: 'total_cost_usd',
      label: 'Total Est. Cost',
      type: ColumnType.NUMBER,
      format: MetricFormat.CURRENCY,
      value: kpis.total_cost_usd,
      description: 'API-equivalent',
    },
    {
      id: 'total_tokens',
      label: 'Total Tokens',
      type: ColumnType.INTEGER,
      format: MetricFormat.TOKENS,
      value: kpis.total_tokens,
      description: 'across sessions',
    },
    {
      id: 'avg_cost_per_session',
      label: 'Avg Cost / Session',
      type: ColumnType.NUMBER,
      format: MetricFormat.CURRENCY,
      value: kpis.avg_cost_per_session,
    },
  ]
}

const CostView: FC<CostViewProps> = ({ filters, repositories }) => {
  const { kpis, costByUser, costByModel, loading, error } = useCliAnalyticsCost(
    filters,
    repositories
  )
  const {
    displayRows,
    loading: sessLoading,
    error: sessError,
  } = useCliAnalyticsSessions(filters, repositories, { sort_by: 'cost_usd', per_page: 10 })

  const { selectedTraceId, selectSession, closeSession } = useSessionModal()

  const kpiMetrics = useMemo((): Metric[] => {
    if (!kpis) return []
    return buildKpiMetrics(kpis)
  }, [kpis])

  const selectedRows = useMemo(
    () => displayRows.filter((r) => r.trace_id === selectedTraceId),
    [displayRows, selectedTraceId]
  )

  const [costUsersTopN, setCostUsersTopN] = useState<TopN>(TopNFilter.TEN)

  const costByUserOverride = useMemo((): TabularResponse => {
    const rows =
      costUsersTopN === TopNFilter.ALL ? costByUser : costByUser.slice(0, costUsersTopN as number)

    return {
      data: {
        columns: [
          { id: 'developer_name', label: 'User', type: ColumnType.STRING },
          {
            id: 'cost_usd',
            label: 'Cost',
            type: ColumnType.NUMBER,
            format: MetricFormat.CURRENCY,
          },
        ],
        rows: rows.map(({ developer_name, cost_usd }) => ({
          developer_name,
          cost_usd,
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
  }, [costByUser, costUsersTopN])

  const costByModelTabularData: TabularResponse = useMemo(
    () => ({
      data: {
        columns: [
          { id: 'model_name', label: 'Model', type: ColumnType.STRING },
          {
            id: 'cost_usd',
            label: 'Cost',
            type: ColumnType.NUMBER,
            format: MetricFormat.CURRENCY,
          },
        ],
        rows: costByModel as unknown as Record<string, unknown>[],
      },
      metadata: { timestamp: '', data_as_of: '' },
      pagination: {
        page: 0,
        per_page: costByModel.length,
        total_count: costByModel.length,
        has_more: false,
      },
    }),
    [costByModel]
  )

  const errorDetails = error ? { message: error } : null
  const sessErrorDetails = sessError ? { message: sessError } : null

  const columnDefinitions = useMemo(
    () => [
      {
        key: 'prompt',
        label: 'SESSION',
        type: DefinitionTypes.Custom,
        sortable: false,
        headClassNames: '',
      },
      {
        key: 'developer_name',
        label: 'USER',
        type: DefinitionTypes.Custom,
        sortable: false,
        headClassNames: '',
      },
      {
        key: 'repository',
        label: 'REPOSITORY',
        type: DefinitionTypes.Custom,
        sortable: false,
        headClassNames: '',
      },
      {
        key: 'delivery_framework',
        label: 'FRAMEWORK',
        type: DefinitionTypes.Custom,
        sortable: false,
        headClassNames: '',
      },
      {
        key: 'input_tokens',
        label: 'INPUT',
        type: DefinitionTypes.Custom,
        sortable: false,
        headClassNames: 'text-right',
      },
      {
        key: 'output_tokens',
        label: 'OUTPUT',
        type: DefinitionTypes.Custom,
        sortable: false,
        headClassNames: 'text-right',
      },
      {
        key: 'cache_read_tokens',
        label: 'CACHED',
        type: DefinitionTypes.Custom,
        sortable: false,
        headClassNames: 'text-right',
      },
      {
        key: 'cost_usd',
        label: 'TOTAL',
        type: DefinitionTypes.Custom,
        sortable: false,
        headClassNames: 'text-right',
      },
      {
        key: 'cost_usd_display',
        label: 'COST',
        type: DefinitionTypes.Custom,
        sortable: false,
        headClassNames: 'text-right',
      },
    ],
    []
  )

  const customRenderColumns = SESSION_CELL_RENDERERS

  return (
    <div className="flex flex-col gap-6">
      {kpiMetrics.length > 0 && (
        <AnalyticsWidget title="Summary" expandable={false} loading={loading} error={errorDetails}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {kpiMetrics.map((metric) => (
              <MetricCard key={metric.id} metric={metric} />
            ))}
          </div>
        </AnalyticsWidget>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DonutChartWidget
          metricType={TabularMetricType.CLI_LLMS}
          title="Cost by user"
          labelField="developer_name"
          valueField="cost_usd"
          dataOverride={costByUserOverride}
          emptyStateLabel="No cost data available"
          actions={
            <Select
              value={String(costUsersTopN)}
              onChange={(e) => setCostUsersTopN(toTopN(e.value))}
              options={TOP_N_OPTIONS}
              className="!h-8"
            />
          }
        />

        <BarChartWidget
          title="Cost by model"
          labelField="model_name"
          valueField="cost_usd"
          yAxisLabel="cost_usd"
          horizontal
          dataOverride={costByModelTabularData}
        />
      </div>

      <AnalyticsWidget
        title="Most expensive sessions"
        loading={sessLoading}
        error={sessErrorDetails}
      >
        <div className="overflow-x-auto">
          <Table<SessionRow>
            items={displayRows}
            columnDefinitions={columnDefinitions}
            customRenderColumns={customRenderColumns}
            idPath="trace_id"
            loading={sessLoading}
            embedded={true}
            selected={selectedRows}
            onSelectRow={(rows) => {
              const clicked = rows.find((r) => !selectedRows.some((s) => s.trace_id === r.trace_id))
              if (clicked?.trace_id != null) selectSession(clicked.trace_id)
              else closeSession()
            }}
          />
        </div>
      </AnalyticsWidget>
      {selectedTraceId && <SessionModal traceId={selectedTraceId} onHide={closeSession} />}
    </div>
  )
}

export default CostView
