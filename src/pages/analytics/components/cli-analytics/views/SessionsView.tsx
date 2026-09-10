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

import { type FC, useEffect, useMemo, useState } from 'react'

import Select from '@/components/form/Select'
import InfoWarning from '@/components/InfoWarning/InfoWarning'
import Pagination from '@/components/Pagination'
import Table from '@/components/Table'
import { DECIMAL_PAGINATION_OPTIONS, InfoWarningType } from '@/constants'
import { NOT_REPORTED_LABEL } from '@/constants/cliAnalytics'
import type { AnalyticsQueryParams } from '@/types/analytics'
import type { SessionRow } from '@/types/cliAnalytics'
import { DefinitionTypes } from '@/types/table'
import { formatCliAnalyticsCost } from '@/utils/currency'
import { formatDateTime } from '@/utils/helpers'

import SessionModal from './SessionModal'
import AnalyticsWidget from '../../AnalyticsWidget'
import { useCliAnalyticsFrameworks } from '../hooks/useCliAnalyticsFrameworks'
import { useCliAnalyticsSessions } from '../hooks/useCliAnalyticsSessions'
import { useSessionModal } from '../hooks/useSessionModal'

const StartTimeCell: FC<{ row: SessionRow }> = ({ row }) => (
  <div className="whitespace-nowrap">{formatDateTime(row.start_time, 'short')}</div>
)

const PromptCell: FC<{ row: SessionRow }> = ({ row }) => (
  <div className="truncate max-w-[280px]" title={row.prompt}>
    {row.prompt || '—'}
  </div>
)

const RepositoryCell: FC<{ row: SessionRow }> = ({ row }) => (
  <div className="truncate max-w-[200px]" title={row.repository ?? NOT_REPORTED_LABEL}>
    {row.repository === null ? (
      <span className="text-gray-400 italic">{NOT_REPORTED_LABEL}</span>
    ) : (
      row.repository
    )}
  </div>
)

const BranchCell: FC<{ row: SessionRow }> = ({ row }) => (
  <div className="truncate max-w-[160px]" title={row.branch ?? NOT_REPORTED_LABEL}>
    {row.branch === null ? (
      <span className="text-gray-400 italic">{NOT_REPORTED_LABEL}</span>
    ) : (
      row.branch
    )}
  </div>
)

const DeliveryFrameworkCell: FC<{ row: SessionRow }> = ({ row }) => (
  <div className="truncate max-w-[200px]" title={row.delivery_framework ?? ''}>
    {row.delivery_framework || '—'}
  </div>
)

const TurnsCell: FC<{ row: SessionRow }> = ({ row }) => (
  <div className="text-right">{(row.turns ?? 0).toLocaleString()}</div>
)

const NetLinesCell: FC<{ row: SessionRow }> = ({ row }) => (
  <div className="text-right">{(row.net_lines ?? 0).toLocaleString()}</div>
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

const CostCell: FC<{ row: SessionRow }> = ({ row }) => (
  <div className="text-right">{formatCliAnalyticsCost(row.cost_usd)}</div>
)

const SESSION_CELL_RENDERERS = {
  start_time: (r: SessionRow) => <StartTimeCell row={r} />,
  prompt: (r: SessionRow) => <PromptCell row={r} />,
  repository: (r: SessionRow) => <RepositoryCell row={r} />,
  branch: (r: SessionRow) => <BranchCell row={r} />,
  delivery_framework: (r: SessionRow) => <DeliveryFrameworkCell row={r} />,
  turns: (r: SessionRow) => <TurnsCell row={r} />,
  net_lines: (r: SessionRow) => <NetLinesCell row={r} />,
  input_tokens: (r: SessionRow) => <InputTokensCell row={r} />,
  output_tokens: (r: SessionRow) => <OutputTokensCell row={r} />,
  cache_read_tokens: (r: SessionRow) => <CachedTokensCell row={r} />,
  cost_usd: (r: SessionRow) => <CostCell row={r} />,
}

interface SessionsViewProps {
  filters: AnalyticsQueryParams
  repositories?: string[]
  isUnattributed?: boolean
  branch?: string
}

const SessionsView: FC<SessionsViewProps> = ({ filters, repositories, isUnattributed, branch }) => {
  const [deliveryFramework, setDeliveryFramework] = useState<string | null>(null)

  const frameworks = useCliAnalyticsFrameworks()
  const frameworkOptions = useMemo(
    () => frameworks.map((f) => ({ label: f, value: f })),
    [frameworks]
  )

  const { displayRows, loading, error, page, totalPages, perPage, setPage, search, setSearch } =
    useCliAnalyticsSessions(filters, repositories, {
      sort_by: 'start_time',
      framework: deliveryFramework ?? undefined,
      isUnattributed,
      branch,
    })

  const { selectedTraceId, selectSession, closeSession } = useSessionModal()

  useEffect(() => {
    closeSession()
  }, [page, search, closeSession])

  const selectedRows = useMemo(
    () => displayRows.filter((r) => r.trace_id === selectedTraceId),
    [displayRows, selectedTraceId]
  )

  const gapCount = useMemo(
    () => displayRows.filter((r) => r.repository === null).length,
    [displayRows]
  )

  const customRenderColumns = SESSION_CELL_RENDERERS

  const columnDefinitions = useMemo(
    () => [
      {
        key: 'start_time',
        label: 'DATE',
        type: DefinitionTypes.Custom,
        sortable: false,
        headClassNames: 'min-w-[110px]',
      },
      {
        key: 'prompt',
        label: 'PROMPT',
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
        key: 'branch',
        label: 'BRANCH',
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
        key: 'turns',
        label: 'TURNS',
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
        label: 'COST',
        type: DefinitionTypes.Custom,
        sortable: false,
        headClassNames: 'text-right',
      },
    ],
    []
  )

  return (
    <AnalyticsWidget title="Sessions" loading={false} error={error ? { message: error } : null}>
      <div className="flex flex-col gap-3">
        {gapCount > 0 && (
          <InfoWarning
            type={InfoWarningType.WARNING}
            message={`${gapCount} session${gapCount === 1 ? '' : 's'} in this view ${
              gapCount === 1 ? 'has' : 'have'
            } no repository or branch data because the analytics plugin was not active.`}
          />
        )}
        <div className="flex flex-row gap-2 items-center">
          <input
            type="text"
            placeholder="Search sessions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm px-3 py-1.5 text-sm rounded-lg border border-border-structural bg-surface-base-secondary text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-border-accent"
          />
          <Select
            value={deliveryFramework}
            options={frameworkOptions}
            onChangeValue={setDeliveryFramework}
            placeholder="All frameworks"
            showClear
            className="w-48"
          />
        </div>
        <div className="overflow-x-auto show-scroll">
          <Table<SessionRow>
            items={displayRows}
            columnDefinitions={columnDefinitions}
            customRenderColumns={customRenderColumns}
            idPath="trace_id"
            loading={loading}
            embedded={true}
            tableClassName="min-w-[900px]"
            selected={selectedRows}
            onSelectRow={(rows) => {
              const clicked = rows.find((r) => !selectedRows.some((s) => s.trace_id === r.trace_id))
              if (clicked?.trace_id != null) selectSession(clicked.trace_id)
              else closeSession()
            }}
          />
        </div>
        <Pagination
          currentPage={page - 1}
          totalPages={totalPages}
          setPage={(p, pp) => setPage(p + 1, pp)}
          perPage={perPage}
          perPageOptions={DECIMAL_PAGINATION_OPTIONS}
        />
      </div>
      {selectedTraceId && <SessionModal traceId={selectedTraceId} onHide={closeSession} />}
    </AnalyticsWidget>
  )
}

export default SessionsView
