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

import Spinner from '@/components/Spinner'
import type { SortState } from '@/types/table'
import type {
  UaCondition,
  UaPeopleGroupBy,
  UaPeopleGroupDetail,
  UaPeopleGroupMember,
  UaPeopleGroupRow,
  UaPeopleNoneRow,
  UaResponse,
  UaTableResponse,
} from '@/types/usageAttribution'

import { UaColumn, UaTable, nextSort } from './UaTable'
import { useUaPage, useUaQuery } from '../hooks/useUaQuery'
import { errorText, formatMoney, formatNumber } from '../utils'
import { Pill } from '../widgets/Badges'

export const UA_CONDITION_LABELS: Record<UaCondition, string> = {
  project: 'CodeMie project',
  repositories: 'Repositories',
  organization: 'Git organization',
}

export const NO_COMMON_CONDITION = 'No common condition'
export const NO_COMMON_CONDITION_TEXT =
  'Candidates whose work no other candidate shares: own repositories, local folders, desktop clients.'

type GroupsResponse = UaTableResponse<UaPeopleGroupRow> & {
  data: { none?: UaPeopleNoneRow | null }
}
type Row = UaPeopleGroupRow | UaPeopleNoneRow

const isNone = (r: Row): r is UaPeopleNoneRow => r.id === 'none'

const toggled = (ids: string[], id: string) =>
  ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]

/** Candidates listed in an expanded group; the popup lists them all. */
const MEMBERS_SHOWN = 50

const plural = (n: number, one: string, many = `${one}s`) =>
  `${formatNumber(n)} ${n === 1 ? one : many}`

/** The sub-line of a group: how its candidates are together. */
const howText = (r: UaPeopleGroupRow): string => {
  if (r.condition === 'project' && r.how === 'inside') return 'work inside it, no budget for them'
  if (r.condition === 'project' && r.how === 'linked') return 'repositories linked to it'
  return plural(r.repositories, 'repository', 'repositories')
}

/** The candidates of an expanded group, with what each puts into it. */
const GroupMembers: FC<{
  groupBy: Exclude<UaPeopleGroupBy, 'none'>
  id: string
  params: Record<string, string | number>
  search: string
  onOpenPerson: (uid: string) => void
}> = ({ groupBy, id, params, search, onOpenPerson }) => {
  const { data, error, loading } = useUaQuery<UaResponse<UaPeopleGroupDetail>>(
    `people-group-${groupBy}-${id}`,
    `people-groups/${groupBy}/${encodeURIComponent(id)}`,
    params
  )
  if (loading && !data) {
    return (
      <div className="flex justify-center py-4">
        <Spinner inline className="w-4 h-4" />
      </div>
    )
  }
  if (error && !data) return <p className="p-4 text-xs text-failed-secondary">{errorText(error)}</p>
  const columns: UaColumn<UaPeopleGroupMember>[] = [
    {
      key: 'name',
      label: 'Candidate',
      render: (m) => (
        <button
          type="button"
          className="text-left font-semibold text-text-primary hover:underline"
          onClick={() => onOpenPerson(m.uid)}
        >
          {m.name}
        </button>
      ),
    },
    {
      key: 'in_group',
      label: 'In Group',
      numeric: true,
      render: (m) => (
        <>
          <b>{formatMoney(m.in_group)}</b>
          {m.in_group < m.prod_ncb - 0.5 && (
            <span className="text-text-quaternary"> of {formatMoney(m.prod_ncb)}</span>
          )}
        </>
      ),
    },
    {
      key: 'production_days',
      label: 'Production Days',
      numeric: true,
      render: (m) => formatNumber(m.production_days),
    },
    {
      key: 'projects',
      label: 'Works In',
      render: (m) => (
        <span className="text-[11px] text-text-quaternary break-words">
          {m.projects} · {m.main_repo ?? '—'}
        </span>
      ),
    },
  ]
  const members = data?.data.members ?? []
  // Searching a person lists only them; a group found by its own name lists everyone.
  const term = search.trim().toLowerCase()
  const found = term
    ? members.filter((m) => `${m.name} ${m.email}`.toLowerCase().includes(term))
    : []
  const rows = found.length ? found : members.slice(0, MEMBERS_SHOWN)
  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <UaTable
        ariaLabel="Candidates in the group"
        columns={columns}
        rows={rows}
        idKey="uid"
        onRowClick={(m) => onOpenPerson(m.uid)}
      />
      {found.length ? (
        <p className="text-xs text-text-quaternary">
          {formatNumber(found.length)} of {plural(members.length, 'candidate')} match “
          {search.trim()}”
        </p>
      ) : (
        members.length > rows.length && (
          <p className="text-xs text-text-quaternary">
            Showing {rows.length} of {plural(members.length, 'candidate')}. Open Details for all.
          </p>
        )
      )}
    </div>
  )
}

interface Props {
  params: Record<string, string | number>
  groupBy: Exclude<UaPeopleGroupBy, 'none'>
  /** Groups over this amount per 30 days; 0 lists every group and the work no other candidate shares. */
  minAmount: number
  search: string
  onOpenPerson: (uid: string) => void
  onOpenGroup: (id: string) => void
}

/** Chargeback candidates grouped by a common condition: what a project or account could take over together. */
const PeopleGroupsTable: FC<Props> = ({
  params,
  groupBy,
  minAmount,
  search,
  onOpenPerson,
  onOpenGroup,
}) => {
  const [page, setPage] = useUaPage({ ...params, groupBy, minAmount, search })
  const [perPage, setPerPage] = useState(25)
  const [sort, setSort] = useState<SortState>({ sortKey: 'amount', sortOrder: 'desc' })
  const [opened, setOpened] = useState<string[]>([])
  // While searching every group opens; the ones collapsed during this search stay closed.
  const [collapsed, setCollapsed] = useState<{ search: string; ids: string[] }>({
    search: '',
    ids: [],
  })
  const query = useUaQuery<GroupsResponse>('people-groups', 'people-groups', {
    ...params,
    group_by: groupBy,
    min_amount: minAmount,
    search: search || undefined,
    page,
    per_page: perPage,
    sort_by: sort.sortKey,
    sort_order: sort.sortOrder,
  })
  const { data } = query
  const none = data?.data.none ?? null
  const rows: Row[] = [...(data?.data.rows ?? []), ...(none ? [none] : [])]
  // Searching a person opens every group that holds them.
  const collapsedNow = collapsed.search === search ? collapsed.ids : []
  const expanded = search
    ? rows.map((r) => r.id).filter((id) => !collapsedNow.includes(id))
    : opened

  const columns: UaColumn<Row>[] = [
    {
      key: 'label',
      label: 'Group',
      render: (r) =>
        isNone(r) ? (
          <div className="flex flex-col gap-0.5 min-w-[240px]">
            <button
              type="button"
              className="text-left font-semibold text-text-primary hover:underline"
              onClick={() => onOpenGroup(r.id)}
            >
              {NO_COMMON_CONDITION}
            </button>
            <span className="text-[11px] text-text-quaternary">
              {plural(r.candidates, 'candidate')} · {NO_COMMON_CONDITION_TEXT}
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 min-w-[240px]">
            <span className="text-[11px] uppercase tracking-[0.03em] text-text-quaternary">
              {UA_CONDITION_LABELS[r.condition]}
            </span>
            <span className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="text-left font-semibold text-text-primary hover:underline break-all"
                onClick={() => onOpenGroup(r.id)}
              >
                {r.label}
              </button>
              {r.over_threshold && (
                <Pill tone="success">
                  Over {formatMoney((data?.threshold ?? 0) / (data?.display?.scale || 1))}
                </Pill>
              )}
            </span>
            <span className="text-[11px] text-text-quaternary">
              {plural(r.candidates, 'candidate')} · {howText(r)}
            </span>
          </div>
        ),
    },
    {
      key: 'candidates',
      label: 'Candidates',
      numeric: true,
      render: (r) => formatNumber(r.candidates),
    },
    {
      key: 'amount',
      label: 'Production on Personal Budgets',
      numeric: true,
      tooltip:
        "The candidates' production work paid from personal budgets that shares this condition.",
      render: (r) => (
        <div className="flex flex-col items-end gap-0.5">
          <b>{formatMoney(r.amount)}</b>
          {r.estimated > 0.5 && (
            <span className="text-[11px] text-text-quaternary">
              {formatMoney(r.estimated)} estimated
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'median_days',
      label: 'Production Days',
      numeric: true,
      render: (r) => `median ${formatNumber(r.median_days)}`,
    },
    {
      key: 'details',
      label: '',
      sortable: false,
      render: (r) => (
        <button
          type="button"
          className="font-semibold text-text-accent hover:underline"
          onClick={() => onOpenGroup(r.id)}
        >
          Details
        </button>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-2">
      {query.error && <p className="text-xs text-failed-secondary">{errorText(query.error)}</p>}
      {query.loading && !data ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <UaTable
          ariaLabel="Groups of chargeback candidates"
          columns={columns}
          rows={rows}
          idKey="id"
          onRowClick={(r) => onOpenGroup(r.id)}
          sort={sort}
          onSort={(key) => {
            setSort((s) => nextSort(s, key))
            setPage(0)
          }}
          expand={{
            ids: expanded,
            onToggle: (id) =>
              search
                ? setCollapsed({ search, ids: toggled(collapsedNow, id) })
                : setOpened((ids) => toggled(ids, id)),
            render: (r) => (
              <GroupMembers
                groupBy={groupBy}
                id={r.id}
                params={params}
                search={search}
                onOpenPerson={onOpenPerson}
              />
            ),
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
      )}
      <p className="text-xs text-text-quaternary">
        A person can be in several groups: add up group amounts, never person totals.
      </p>
    </div>
  )
}

export default PeopleGroupsTable
