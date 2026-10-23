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

import { FC, useState } from 'react'

import Select from '@/components/form/Select'
import type { SortState } from '@/types/table'
import type { UaGroupRow, UaTableResponse } from '@/types/usageAttribution'

import { UaColumn, UaTable, nextSort } from './UaTable'
import AnalyticsWidget from '../../AnalyticsWidget'
import { useUaPage, useUaQuery } from '../hooks/useUaQuery'
import { errorText, formatMoney, formatNumber, formatShare } from '../utils'
import SearchBox from '../widgets/SearchBox'

interface Props {
  params: Record<string, string | number>
  onOpen: (groupId: string) => void
}

const RepositoryGroupsTable: FC<Props> = ({ params, onOpen }) => {
  const [scope, setScope] = useState<'threshold' | 'all'>('threshold')
  const [search, setSearch] = useState('')
  const [page, setPage] = useUaPage(params)
  const [perPage, setPerPage] = useState(10)
  const [sort, setSort] = useState<SortState>({ sortKey: 'ncb', sortOrder: 'desc' })
  const query = useUaQuery<UaTableResponse<UaGroupRow>>('repository-groups', 'repository-groups', {
    ...params,
    scope,
    search: search || undefined,
    page,
    per_page: perPage,
    sort_by: sort.sortKey,
    sort_order: sort.sortOrder,
  })
  const { data } = query
  const threshold = data?.threshold ?? 0
  const per30 = data?.display?.scale ? threshold / data.display.scale : threshold

  const columns: UaColumn<UaGroupRow>[] = [
    {
      key: 'name',
      label: 'Repository Group',
      render: (r) => (
        <div className="flex flex-col gap-0.5 min-w-[220px] max-w-[360px]">
          <button
            type="button"
            className="text-left font-semibold text-text-primary hover:underline"
            onClick={() => onOpen(r.id)}
          >
            {r.name}
          </button>
          <span className="text-[11px] text-text-quaternary break-words">
            {r.repos_preview.join(', ')}
            {r.repositories > r.repos_preview.length
              ? ` and ${r.repositories - r.repos_preview.length} more`
              : ''}
          </span>
        </div>
      ),
    },
    {
      key: 'grouped',
      label: 'Grouped By',
      render: (r) => <span className="text-text-secondary">{r.grouped}</span>,
    },
    {
      key: 'repositories',
      label: 'Repositories',
      numeric: true,
      render: (r) => formatNumber(r.repositories),
    },
    { key: 'people', label: 'People', numeric: true, render: (r) => formatNumber(r.people) },
    {
      key: 'ncb',
      label: 'Chargeback Potential',
      numeric: true,
      render: (r) => <b>{formatMoney(r.ncb)}</b>,
      total: formatMoney(data?.data.totals?.ncb),
    },
    {
      key: 'spend',
      label: 'CLI Spend',
      numeric: true,
      render: (r) => formatMoney(r.spend),
      total: formatMoney(data?.data.totals?.spend),
    },
    {
      key: 'share',
      label: '% of Total Spend',
      numeric: true,
      tooltip:
        "The group's CLI spend as a share of Total Spend, all spend in the period. The total row adds up the groups listed.",
      render: (r) => formatShare(r.share),
      total: formatShare(data?.data.totals?.share),
    },
    { key: 'prod_pct', label: 'CLI Production', numeric: true, render: (r) => `${r.prod_pct}%` },
  ]

  return (
    <AnalyticsWidget
      title="Repository Groups in Personal Projects"
      description="Repositories that several people work on from their personal projects. Repositories are grouped when they share an owner, ticket keys, a CodeMie project or people. Only production CLI work counts toward Chargeback Potential."
      loading={query.loading && !data}
      error={query.error && !data ? { message: errorText(query.error) } : null}
      expandable={false}
      actions={
        <Select
          value={scope}
          onChangeValue={(v) => {
            setScope((v as 'threshold' | 'all') ?? 'threshold')
            setPage(0)
          }}
          options={[
            {
              value: 'threshold',
              label: `Over ${formatMoney(per30)} per 30 days (${data?.counts.threshold ?? '…'})`,
            },
            { value: 'all', label: `All groups (${data?.counts.all ?? '…'})` },
          ]}
          className="min-w-[230px]"
          ariaLabel="Repository groups to show"
        />
      }
    >
      <div className="flex flex-col gap-3">
        <SearchBox
          placeholder="Search repositories…"
          onSearch={(v) => {
            setSearch(v)
            setPage(0)
          }}
        />
        {query.error && data && (
          <p className="text-xs text-failed-secondary">{errorText(query.error)}</p>
        )}
        <UaTable
          ariaLabel="Repository groups in personal projects"
          columns={columns}
          rows={data?.data.rows ?? []}
          idKey="id"
          onRowClick={(r) => onOpen(r.id)}
          sort={sort}
          onSort={(key) => {
            setSort((s) => nextSort(s, key))
            setPage(0)
          }}
          showTotals={!!data?.data.rows.length}
          pagination={
            data
              ? {
                  page,
                  perPage,
                  totalCount: data.pagination.total_count,
                  onChange: (p, pp) => {
                    setPage(p)
                    if (pp) setPerPage(pp)
                  },
                }
              : undefined
          }
        />
      </div>
    </AnalyticsWidget>
  )
}

export default RepositoryGroupsTable
