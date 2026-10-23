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
import type {
  UaPeopleFilter,
  UaPeopleGroupBy,
  UaPersonRow,
  UaTableResponse,
} from '@/types/usageAttribution'
import { cn } from '@/utils/utils'

import PeopleGroupsTable from './PeopleGroupsTable'
import { UaColumn, UaTable, nextSort } from './UaTable'
import AnalyticsWidget from '../../AnalyticsWidget'
import { useUaPage, useUaQuery } from '../hooks/useUaQuery'
import { errorText, formatMoney, formatNumber } from '../utils'
import { Pill } from '../widgets/Badges'
import PeopleSummaryTiles from '../widgets/PeopleSummaryTiles'
import SearchBox from '../widgets/SearchBox'

type GroupBy = Exclude<UaPeopleGroupBy, 'none'>

interface Props {
  params: Record<string, string | number>
  onOpen: (uid: string) => void
  onOpenGroup?: (groupBy: GroupBy, id: string) => void
  initialFilter?: UaPeopleFilter
  initialGroupBy?: UaPeopleGroupBy
}

const GROUP_BY_OPTIONS: Array<{ value: UaPeopleGroupBy; label: string }> = [
  { value: 'none', label: 'No grouping' },
  { value: 'common', label: 'Group by common condition' },
  { value: 'project', label: 'Group by CodeMie project' },
  { value: 'repositories', label: 'Group by repositories' },
  { value: 'organization', label: 'Group by Git organization' },
]

const GROUP_FILTER_AMOUNTS = [500, 1000]

/** All groups, over $500 and over $1,000 per 30 days, and the amount "show them" chose when it is another one. String
 * values: the select greys out a falsy value. */
const groupFilterOptions = (current: number): Array<{ value: string; label: string }> => [
  { value: '0', label: 'All groups' },
  ...[...new Set([...GROUP_FILTER_AMOUNTS, current])]
    .filter((v) => v > 0)
    .sort((a, b) => a - b)
    .map((v) => ({ value: String(v), label: `Groups over ${formatMoney(v)} per 30 days` })),
]

/** The production days bar: full at 30 days. */
const DAYS_BAR_FULL = 30

export const personLocation = (r: Pick<UaPersonRow, 'city' | 'country' | 'job'>): string => {
  const place = [r.city, r.country].filter(Boolean).join(', ')
  return [place, r.job].filter(Boolean).join(' · ')
}

const defaultSort = (filter: UaPeopleFilter): SortState => ({
  sortKey: filter === 'cand' ? 'prod_ncb' : 'total',
  sortOrder: 'desc',
})

const ProductionDays: FC<{ days: number; candidate?: boolean }> = ({ days, candidate }) => (
  <div
    className="flex items-center justify-end gap-2"
    aria-label={`${formatNumber(days)} production days`}
  >
    <span>{formatNumber(days)}</span>
    <span className="w-[60px] h-1.5 rounded-full bg-surface-base-tertiary overflow-hidden">
      <span
        className={cn(
          'block h-full rounded-full',
          candidate ? 'bg-aborted-primary' : 'bg-text-quaternary'
        )}
        style={{ width: `${Math.min(100, (days / DAYS_BAR_FULL) * 100)}%` }}
      />
    </span>
  </div>
)

const PeopleTable: FC<Props> = ({
  params,
  onOpen,
  onOpenGroup,
  initialFilter = 'cand',
  initialGroupBy = 'none',
}) => {
  const [filter, setFilter] = useState<UaPeopleFilter>(initialFilter)
  const [groupBy, setGroupBy] = useState<UaPeopleGroupBy>(initialGroupBy)
  const [minAmount, setMinAmount] = useState(0)
  const [search, setSearch] = useState('')
  const [page, setPage] = useUaPage(params)
  const [perPage, setPerPage] = useState(25)
  const [sort, setSort] = useState<SortState>(defaultSort(initialFilter))
  const grouped = groupBy !== 'none'
  // Groups hold chargeback candidates only.
  const peopleFilter: UaPeopleFilter = grouped ? 'cand' : filter
  const query = useUaQuery<UaTableResponse<UaPersonRow>>('people', grouped ? null : 'people', {
    ...params,
    filter: peopleFilter,
    search: search || undefined,
    page,
    per_page: perPage,
    sort_by: sort.sortKey,
    sort_order: sort.sortOrder,
  })
  const { data } = query
  const display = data?.display
  const scale = display?.scale || 1
  const counts = data?.counts ?? {}
  const count = (key: UaPeopleFilter) => counts[key] ?? '…'

  const options: Array<{ value: UaPeopleFilter; label: string }> = [
    // Grouped, the flat table is not asked, so there is no count to show.
    {
      value: 'cand',
      label: grouped ? 'Chargeback candidates' : `Chargeback candidates (${count('cand')})`,
    },
    { value: 'all', label: `All people (${count('all')})` },
    { value: 'prod', label: `Production on a personal budget (${count('prod')})` },
    {
      value: 'exp',
      label: `Learning & experiments over ${formatMoney(
        (display?.experiments_highlight ?? 0) / scale
      )} per 30 days (${count('exp')})`,
    },
    { value: 'shared', label: `In a shared project without a budget (${count('shared')})` },
    {
      value: 'platform',
      label: `Web Platform over ${formatMoney(
        (display?.platform_people_filter ?? 0) / scale
      )} per 30 days (${count('platform')})`,
    },
  ]

  const columns: UaColumn<UaPersonRow>[] = [
    {
      key: 'name',
      label: 'User',
      render: (r) => (
        <div className="flex flex-col gap-0.5 min-w-[180px]">
          <span className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="text-left font-semibold text-text-primary hover:underline"
              onClick={() => onOpen(r.uid)}
            >
              {r.name}
            </button>
            {r.candidate && <Pill tone="warning">Candidate</Pill>}
          </span>
          <span className="text-[11px] text-text-quaternary">{personLocation(r) || r.email}</span>
        </div>
      ),
    },
    {
      key: 'total',
      label: 'Total Spend',
      numeric: true,
      render: (r) => <b>{formatMoney(r.total)}</b>,
    },
    {
      key: 'charged_back',
      label: 'Charged Back',
      numeric: true,
      tooltip: 'Paid by project budgets: CLI and Web Platform.',
      render: (r) => formatMoney(r.charged_back),
    },
    {
      key: 'prod_ncb',
      label: 'Production',
      numeric: true,
      tooltip: 'Production work paid from a personal budget: what a chargeback would move.',
      render: (r) => <b>{formatMoney(r.prod_ncb)}</b>,
    },
    {
      key: 'personal_learning',
      label: 'Learning & Experiments',
      numeric: true,
      tooltip: 'Learning and experiments paid from a personal budget: the platform keeps paying.',
      render: (r) =>
        r.exp_highlight ? (
          <Pill tone="warning">{formatMoney(r.personal_learning)}</Pill>
        ) : (
          formatMoney(r.personal_learning)
        ),
    },
    {
      key: 'personal_other',
      label: 'Other',
      numeric: true,
      tooltip: 'Unclassified CLI work and Web Platform paid from a personal budget.',
      render: (r) => formatMoney(r.personal_other),
    },
    {
      key: 'production_days',
      label: 'Production Days',
      numeric: true,
      tooltip:
        'Days with production work from a personal budget, on the most active production repository. Counted over at least the last 30 days, also on a shorter period.',
      render: (r) => <ProductionDays days={r.production_days} candidate={r.candidate} />,
    },
    {
      key: 'projects',
      label: 'Works In',
      render: (r) => (
        <div className="flex flex-col gap-0.5 min-w-[200px] max-w-[320px]">
          <span className="font-medium text-text-primary break-words">{r.projects}</span>
          <span className="text-[11px] text-text-quaternary break-words">{r.main_repo ?? '—'}</span>
        </div>
      ),
    },
  ]

  return (
    <AnalyticsWidget
      title="People"
      description="Who uses CodeMie, who pays for it, and who does production work from a personal budget. Click a person or a group for details."
      loading={!grouped && query.loading && !data}
      error={!grouped && query.error && !data ? { message: errorText(query.error) } : null}
      expandable={false}
    >
      <div className="flex flex-col gap-3">
        {(peopleFilter === 'cand' || grouped) && (
          <PeopleSummaryTiles
            params={params}
            onShowBigGroups={(per30) => {
              setGroupBy('common')
              setMinAmount(per30)
            }}
          />
        )}
        <div className="flex flex-wrap items-center gap-3">
          <SearchBox
            placeholder="Search users…"
            onSearch={(v) => {
              setSearch(v)
              setPage(0)
            }}
          />
          <Select
            value={peopleFilter}
            onChangeValue={(v) => {
              const next = (v as UaPeopleFilter) ?? 'cand'
              setFilter(next)
              setSort(defaultSort(next))
              setPage(0)
            }}
            options={options}
            disabled={grouped}
            className="min-w-[260px]"
            ariaLabel="Filter people"
          />
          <Select
            value={groupBy}
            onChangeValue={(v) => {
              setGroupBy((v as UaPeopleGroupBy) ?? 'none')
              setPage(0)
            }}
            options={GROUP_BY_OPTIONS}
            className="min-w-[220px]"
            ariaLabel="Group people"
          />
          {grouped && (
            <Select
              value={String(minAmount)}
              onChangeValue={(v) => setMinAmount(Number(v) || 0)}
              options={groupFilterOptions(minAmount)}
              className="min-w-[220px]"
              ariaLabel="Filter groups"
            />
          )}
        </div>
        {grouped ? (
          <PeopleGroupsTable
            params={params}
            groupBy={groupBy}
            minAmount={minAmount}
            search={search}
            onOpenPerson={onOpen}
            onOpenGroup={(id) => onOpenGroup?.(groupBy, id)}
          />
        ) : (
          <>
            {query.error && data && (
              <p className="text-xs text-failed-secondary">{errorText(query.error)}</p>
            )}

            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mt-4 ml-2">
              Personal Budget
            </h4>

            <UaTable
              ariaLabel="People"
              columns={columns}
              rows={data?.data.rows ?? []}
              idKey="uid"
              onRowClick={(r) => onOpen(r.uid)}
              sort={sort}
              onSort={(key) => {
                setSort((s) => nextSort(s, key))
                setPage(0)
              }}
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
          </>
        )}
      </div>
    </AnalyticsWidget>
  )
}

export default PeopleTable
