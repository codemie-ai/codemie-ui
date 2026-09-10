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

import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from 'chart.js'
import { type FC, useEffect, useMemo, useRef, useState } from 'react'

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
import type { ExtendedSessionsTarget, UserRow } from '@/types/cliAnalytics'
import { DefinitionTypes } from '@/types/table'
import { formatMetricValue, formatTokens } from '@/utils/analyticsFormatters'
import { formatCliAnalyticsCost } from '@/utils/currency'
import { formatDate } from '@/utils/helpers'

import ExtendedSessionsModal from './ExtendedSessionsModal'
import AnalyticsWidget from '../../AnalyticsWidget'
import { TopNFilter, TOP_N_OPTIONS, toTopN, type TopN } from '../../utils/topNFilter'
import DonutChartWidget from '../../widgets/DonutChartWidget'
import { formatDuration } from '../format'
import { useCliAnalyticsUsers } from '../hooks/useCliAnalyticsUsers'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend)

interface UserViewProps {
  filters: AnalyticsQueryParams
  repositories?: string[]
}

function buildUserMetrics(row: UserRow): Metric[] {
  return [
    { id: 'session_count', label: 'Sessions', type: ColumnType.INTEGER, value: row.session_count },
    {
      id: 'cost_usd',
      label: 'Est. Cost',
      type: ColumnType.NUMBER,
      format: MetricFormat.CURRENCY,
      value: row.cost_usd ?? 0,
    },
    { id: 'turns', label: 'Turns', type: ColumnType.INTEGER, value: row.turns ?? 0 },
    { id: 'net_lines', label: 'Net Lines', type: ColumnType.INTEGER, value: row.net_lines ?? 0 },
    {
      id: 'tool_success_rate',
      label: 'Tool Success',
      type: ColumnType.NUMBER,
      format: MetricFormat.PERCENTAGE,
      value: row.tool_success_rate ?? 0,
    },
  ]
}

function tokensOf(r: UserRow): number {
  return (
    (r.input_tokens ?? 0) +
    (r.output_tokens ?? 0) +
    (r.cache_read_tokens ?? 0) +
    (r.cache_creation_tokens ?? 0)
  )
}

const DeveloperNameCell: FC<{ row: UserRow }> = ({ row }) => (
  <div className="truncate max-w-[220px]" title={row.developer_name ?? undefined}>
    {row.developer_name || '—'}
  </div>
)

const SessionCountCell: FC<{ row: UserRow }> = ({ row }) => (
  <div className="text-right">{(row.session_count ?? 0).toLocaleString()}</div>
)

const TurnsCell: FC<{ row: UserRow }> = ({ row }) => (
  <div className="text-right">{(row.turns ?? 0).toLocaleString()}</div>
)

const ToolCallsCell: FC<{ row: UserRow }> = ({ row }) => (
  <div className="text-right">{(row.tool_calls ?? 0).toLocaleString()}</div>
)

const ToolSuccessRateCell: FC<{ row: UserRow }> = ({ row }) => (
  <div className="text-right">
    {formatMetricValue(row.tool_success_rate ?? 0, MetricFormat.PERCENTAGE)}
  </div>
)

const NetLinesCell: FC<{ row: UserRow }> = ({ row }) => (
  <div className="text-right">{(row.net_lines ?? 0).toLocaleString()}</div>
)

const TopModelCell: FC<{ row: UserRow }> = ({ row }) => <div>{row.top_model || '—'}</div>

const TokensCell: FC<{ row: UserRow }> = ({ row }) => (
  <div className="text-right">{formatTokens(tokensOf(row))}</div>
)

const CostCell: FC<{ row: UserRow }> = ({ row }) => (
  <div className="text-right">{formatCliAnalyticsCost(row.cost_usd ?? 0)}</div>
)

const LastActiveCell: FC<{ row: UserRow }> = ({ row }) => (
  <div>{row.last_active ? formatDate(row.last_active, 'MMM dd, yyyy, HH:mm') : '—'}</div>
)

const USER_CELL_RENDERERS = {
  developer_name: (r: UserRow) => <DeveloperNameCell row={r} />,
  session_count: (r: UserRow) => <SessionCountCell row={r} />,
  turns: (r: UserRow) => <TurnsCell row={r} />,
  tool_calls: (r: UserRow) => <ToolCallsCell row={r} />,
  tool_success_rate: (r: UserRow) => <ToolSuccessRateCell row={r} />,
  net_lines: (r: UserRow) => <NetLinesCell row={r} />,
  top_model: (r: UserRow) => <TopModelCell row={r} />,
  tokens: (r: UserRow) => <TokensCell row={r} />,
  cost_usd: (r: UserRow) => <CostCell row={r} />,
  last_active: (r: UserRow) => <LastActiveCell row={r} />,
}

const UserView: FC<UserViewProps> = ({ filters, repositories }) => {
  const {
    chartRows,
    tableRows,
    totalCount,
    currentPage,
    pageSize,
    avgSessionDurationMs,
    loading,
    error,
    setPage,
  } = useCliAnalyticsUsers(filters, repositories)

  const [usersTopN, setUsersTopN] = useState<TopN>(TopNFilter.TEN)
  const [selectedTarget, setSelectedTarget] = useState<ExtendedSessionsTarget | null>(null)
  const [selected, setSelected] = useState<UserRow[]>([])
  const clearSelectionRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    setSelected([])
  }, [tableRows])

  useEffect(() => {
    clearSelectionRef.current = () => setSelected([])
  }, [])

  const costShareOverride = useMemo((): TabularResponse => {
    const rows = usersTopN === TopNFilter.ALL ? chartRows : chartRows.slice(0, usersTopN as number)

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
          cost_usd: cost_usd ?? 0,
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
  }, [chartRows, usersTopN])

  const errorDetails = error ? { message: error } : null

  const handleDrill = (row: UserRow) => {
    if (!row.user_id) return
    setSelectedTarget({
      title: row.developer_name,
      metrics: buildUserMetrics(row),
      sessionFilters: { ...filters, users: [row.user_id] },
      repositories,
    })
  }

  const columnDefinitions = useMemo(
    () => [
      { key: 'developer_name', label: 'USER', type: DefinitionTypes.Custom, sortable: false },
      {
        key: 'session_count',
        label: 'SESSIONS',
        type: DefinitionTypes.Custom,
        sortable: false,
        headClassNames: 'text-right',
      },
      {
        key: 'turns',
        label: 'TURNS',
        type: DefinitionTypes.Custom,
        sortable: false,
        headClassNames: 'text-right',
      },
      {
        key: 'tool_calls',
        label: 'TOOL CALLS',
        type: DefinitionTypes.Custom,
        sortable: false,
        headClassNames: 'text-right',
      },
      {
        key: 'tool_success_rate',
        label: 'TOOL SUCCESS',
        type: DefinitionTypes.Custom,
        sortable: false,
        headClassNames: 'text-right',
      },
      {
        key: 'net_lines',
        label: 'NET LINES',
        type: DefinitionTypes.Custom,
        sortable: false,
        headClassNames: 'text-right',
      },
      {
        key: 'top_model',
        label: 'TOP MODEL',
        type: DefinitionTypes.Custom,
        sortable: false,
      },
      {
        key: 'tokens',
        label: 'TOKENS',
        type: DefinitionTypes.Custom,
        sortable: false,
        headClassNames: 'text-right',
      },
      {
        key: 'cost_usd',
        label: 'COST',
        type: DefinitionTypes.Custom,
        sortable: false,
        headClassNames: 'text-right',
      },
      {
        key: 'last_active',
        label: 'LAST ACTIVE',
        type: DefinitionTypes.Custom,
        sortable: false,
      },
    ],
    []
  )

  const customRenderColumns = USER_CELL_RENDERERS

  const totalPages = Math.ceil(totalCount / pageSize)
  const canPrevious = currentPage > 0
  const canNext = currentPage < totalPages - 1

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-1">
        <DonutChartWidget
          metricType={TabularMetricType.CLI_LLMS}
          title="Share of cost"
          labelField="developer_name"
          valueField="cost_usd"
          dataOverride={costShareOverride}
          emptyStateLabel="No cost data available"
          actions={
            <Select
              value={String(usersTopN)}
              onChange={(e) => setUsersTopN(toTopN(e.value))}
              options={TOP_N_OPTIONS}
              className="!h-8"
            />
          }
        />
      </div>

      <AnalyticsWidget title="Per-user detail" loading={loading} error={errorDetails}>
        {tableRows.length === 0 && !loading && !error ? (
          <p className="text-text-quaternary text-sm">No user data for the selected filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table<UserRow>
              items={tableRows}
              columnDefinitions={columnDefinitions}
              customRenderColumns={customRenderColumns}
              idPath="developer_name"
              loading={false}
              embedded={true}
              selected={selected}
              onSelectRow={(newRows) => {
                const clicked = newRows.find(
                  (r) => !selected.some((s) => s.developer_name === r.developer_name)
                )
                // A row without a resolvable user_id cannot be drilled into, so leave it
                // unselected rather than highlighting a row that opens nothing.
                if (clicked && !clicked.user_id) return
                if (clicked) handleDrill(clicked)
                setSelected(newRows)
              }}
            />
          </div>
        )}
      </AnalyticsWidget>

      {totalCount > pageSize && (
        <div className="flex items-center justify-between">
          <div className="text-text-quaternary text-xs">
            Showing {currentPage * pageSize + 1} to{' '}
            {Math.min((currentPage + 1) * pageSize, totalCount)} of {totalCount}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage(currentPage - 1)}
              disabled={!canPrevious}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm">
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage(currentPage + 1)}
              disabled={!canNext}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {chartRows.length > 0 && (
        <p className="text-text-quaternary text-xs">
          Avg session {formatDuration(avgSessionDurationMs)} across all users.
        </p>
      )}

      {selectedTarget && (
        <ExtendedSessionsModal
          target={selectedTarget}
          isVisible
          onHide={() => {
            setSelectedTarget(null)
            clearSelectionRef.current?.()
          }}
        />
      )}
    </div>
  )
}

export default UserView
