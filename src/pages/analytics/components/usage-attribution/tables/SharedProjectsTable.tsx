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
import type { UaSharedProjectRow, UaTableResponse } from '@/types/usageAttribution'

import AnalyticsWidget from '../../AnalyticsWidget'
import { UA_BUDGET_LABELS } from '../constants'
import { UaColumn, UaTable, nextSort } from './UaTable'
import { useUaPage, useUaQuery } from '../hooks/useUaQuery'
import { errorText, formatMoney, formatNumber, formatShare } from '../utils'
import { Pill } from '../widgets/Badges'
import SearchBox from '../widgets/SearchBox'

export const projectFacts = (r: UaSharedProjectRow): string =>
  [
    r.budgets.length
      ? `${r.budgets.map((b) => UA_BUDGET_LABELS[b] ?? b).join(', ')} budget for some members`
      : 'No project budget',
    r.cost_center ? `cost center ${r.cost_center}` : 'no cost center',
    `${r.members} members`,
    r.datasources ? `${r.datasources} Git datasources` : '',
    r.deleted ? 'deleted' : '',
  ]
    .filter(Boolean)
    .join(' · ')

interface Props {
  params: Record<string, string | number>
  onOpen: (project: string) => void
}

const SharedProjectsTable: FC<Props> = ({ params, onOpen }) => {
  const [scope, setScope] = useState<'threshold' | 'all'>('threshold')
  const [search, setSearch] = useState('')
  const [page, setPage] = useUaPage(params)
  const [perPage, setPerPage] = useState(10)
  const [sort, setSort] = useState<SortState>({ sortKey: 'ncb', sortOrder: 'desc' })
  const query = useUaQuery<UaTableResponse<UaSharedProjectRow>>(
    'shared-projects',
    'shared-projects',
    {
      ...params,
      scope,
      search: search || undefined,
      page,
      per_page: perPage,
      sort_by: sort.sortKey,
      sort_order: sort.sortOrder,
    }
  )
  const { data } = query
  const totals = data?.data.totals ?? {}
  const threshold = data?.threshold ?? 0
  const per30 = data?.display?.scale ? threshold / data.display.scale : threshold

  const columns: UaColumn<UaSharedProjectRow>[] = [
    {
      key: 'name',
      label: 'Project',
      render: (r) => (
        <div className="flex flex-col gap-0.5 min-w-[220px]">
          <button
            type="button"
            className="text-left font-semibold text-text-primary hover:underline"
            onClick={() => onOpen(r.name)}
          >
            {r.name}
          </button>
          <span className="text-[11px] text-text-quaternary">{projectFacts(r)}</span>
        </div>
      ),
    },
    {
      key: 'via',
      label: 'Used Via',
      render: (r) => (
        <div className="flex gap-1 flex-wrap">
          {r.via.includes('web') && <Pill tone="accent">Web Platform</Pill>}
          {r.via.includes('cli') && <Pill>CLI</Pill>}
        </div>
      ),
    },
    {
      key: 'ncb',
      label: 'Chargeback Potential',
      numeric: true,
      render: (r) => <b>{formatMoney(r.ncb)}</b>,
      total: formatMoney(totals.ncb),
    },
    {
      key: 'platform',
      label: 'Web Platform',
      numeric: true,
      render: (r) => formatMoney(r.platform),
      total: formatMoney(totals.platform),
    },
    {
      key: 'cli',
      label: 'CLI',
      numeric: true,
      render: (r) => formatMoney(r.cli),
      total: formatMoney(totals.cli),
    },
    {
      key: 'share',
      label: '% of Total Spend',
      numeric: true,
      tooltip:
        "The project's Web Platform and CLI spend as a share of Total Spend, all spend in the period. The total row adds up the projects listed.",
      render: (r) => formatShare(r.share),
      total: formatShare(totals.share),
    },
    { key: 'people', label: 'People', numeric: true, render: (r) => formatNumber(r.people) },
    {
      key: 'prod_pct',
      label: 'CLI Production',
      numeric: true,
      render: (r) =>
        r.prod_pct === null ? <span className="text-text-quaternary">—</span> : `${r.prod_pct}%`,
    },
  ]

  return (
    <AnalyticsWidget
      title="Shared Projects Without a Budget"
      description="People work inside a shared CodeMie project without a budget for them, so they pay from personal budgets and nothing is charged back. Chargeback Potential counts their Web Platform spend and all their CLI spend in the project, except work classified as an experiment."
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
            { value: 'all', label: `All (${data?.counts.all ?? '…'})` },
          ]}
          className="min-w-[230px]"
          ariaLabel="Projects to show"
        />
      }
    >
      <div className="flex flex-col gap-3">
        <SearchBox
          placeholder="Search projects…"
          onSearch={(v) => {
            setSearch(v)
            setPage(0)
          }}
        />
        {query.error && data && (
          <p className="text-xs text-failed-secondary">{errorText(query.error)}</p>
        )}
        <UaTable
          ariaLabel="Shared projects without a budget"
          columns={columns}
          rows={data?.data.rows ?? []}
          idKey="id"
          onRowClick={(r) => onOpen(r.name)}
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

export default SharedProjectsTable
