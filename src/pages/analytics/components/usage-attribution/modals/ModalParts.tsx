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

import { FC, ReactNode } from 'react'

import Spinner from '@/components/Spinner'
import type { UaAgentRow, UaAsset, UaCategory, UaError } from '@/types/usageAttribution'
import { cn } from '@/utils/utils'

import { UA_CATEGORIES, UA_CATEGORY_LABELS } from '../constants'
import { LocalTable, UaColumn } from '../tables/UaTable'
import { errorText, formatMoney, formatNumber, formatPct, useUaColors } from '../utils'
import { Pill, Swatch } from '../widgets/Badges'

export const sectionTitleClassName =
  'text-sm font-semibold uppercase tracking-[0.03em] text-text-quaternary'

export const Section: FC<{
  title: string
  children: ReactNode
  full?: boolean
  className?: string
}> = ({ title, children, full, className }) => (
  <section
    className={cn(
      'flex flex-col gap-3 rounded-lg border border-border-specific-panel-outline bg-surface-base-secondary p-4 min-w-0',
      full && 'xl:col-span-2',
      className
    )}
  >
    <h5 className={sectionTitleClassName}>{title}</h5>
    {children}
  </section>
)

export const ModalBody: FC<{ loading: boolean; error: UaError | null; children: ReactNode }> = ({
  loading,
  error,
  children,
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner />
      </div>
    )
  }
  if (error)
    return <div className="py-10 text-center text-sm text-failed-secondary">{errorText(error)}</div>
  return <div className="flex flex-col gap-4 pb-6">{children}</div>
}

const KIND_SYMBOL: Record<'positive' | 'negative' | 'neutral', string> = {
  positive: '+',
  negative: '−',
  neutral: '·',
}

/** Why: positive, negative and neutral reasons. */
export const EvidenceList: FC<{
  items: Array<{ kind: 'positive' | 'negative' | 'neutral'; text: string }>
}> = ({ items }) => (
  <ul className="flex flex-col gap-1.5 text-sm">
    {items.map((item, i) => (
      <li key={`${i}-${item.text}`} className="flex gap-2">
        <span
          aria-hidden
          className={cn('w-4 shrink-0 text-center font-semibold', {
            'text-success-primary': item.kind === 'positive',
            'text-failed-secondary': item.kind === 'negative',
            'text-text-quaternary': item.kind === 'neutral',
          })}
        >
          {KIND_SYMBOL[item.kind]}
        </span>
        <span className="text-text-secondary">{item.text}</span>
      </li>
    ))}
  </ul>
)

/** The CLI spend of an entity split by category: one bar and a legend. */
export const CategoryDistribution: FC<{ amounts: Partial<Record<UaCategory, number>> }> = ({
  amounts,
}) => {
  const colors = useUaColors()
  const total = Object.values(amounts).reduce((s, v) => s + (v ?? 0), 0)
  if (!total) return <p className="text-sm text-text-quaternary">No CLI spend.</p>
  const parts = UA_CATEGORIES.filter((c) => (amounts[c] ?? 0) > 0).map((c) => ({
    c,
    v: amounts[c] ?? 0,
  }))
  return (
    <div className="flex flex-col gap-2">
      <fieldset
        className="flex h-6 w-full overflow-hidden rounded border-0 p-0 m-0"
        aria-label="CLI spend by category"
      >
        {parts.map(({ c, v }) => (
          <div
            key={c}
            className="flex items-center justify-center text-[10px] font-semibold text-white"
            style={{ width: `${(v / total) * 100}%`, backgroundColor: colors.category(c) }}
            title={`${UA_CATEGORY_LABELS[c]}: ${formatMoney(v)}`}
          >
            {v / total >= 0.09 ? formatPct(v, total) : ''}
          </div>
        ))}
      </fieldset>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
        {parts.map(({ c, v }) => (
          <span key={c} className="flex items-center gap-1.5">
            <Swatch color={colors.category(c)} />
            {UA_CATEGORY_LABELS[c]} {formatPct(v, total)}
          </span>
        ))}
      </div>
    </div>
  )
}

export const AgentsTable: FC<{ agents: UaAgentRow[] }> = ({ agents }) => {
  const total = agents.reduce((s, a) => s + a.spend, 0)
  const columns: UaColumn<UaAgentRow>[] = [
    { key: 'client', label: 'Coding Agent', render: (r) => <b>{r.client}</b> },
    {
      key: 'sessions',
      label: 'Sessions',
      numeric: true,
      render: (r) =>
        r.sessions === null || r.sessions === undefined ? (
          <span
            className="text-text-quaternary"
            title="This client gets a new session id for every request"
          >
            —
          </span>
        ) : (
          formatNumber(r.sessions)
        ),
    },
    { key: 'spend', label: 'CLI Spend', numeric: true, render: (r) => formatMoney(r.spend) },
    {
      key: 'share',
      label: 'Share',
      numeric: true,
      sortValue: (r) => r.spend,
      render: (r) => formatPct(r.spend, total),
    },
  ]
  if (!agents.length) return <p className="text-sm text-text-quaternary">No CLI usage.</p>
  return (
    <LocalTable
      ariaLabel="Coding agents"
      columns={columns}
      rows={agents}
      idKey="client"
      defaultSort={{ sortKey: 'spend', sortOrder: 'desc' }}
    />
  )
}

export const AssetsTable: FC<{ assets: UaAsset[]; withProject?: boolean }> = ({
  assets,
  withProject,
}) => {
  const columns: UaColumn<UaAsset & { id: string }>[] = [
    {
      key: 'name',
      label: withProject ? 'Assistant / Workflow' : 'Asset',
      render: (r) => <b>{r.name}</b>,
    },
    { key: 'kind', label: 'Type', render: (r) => <Pill>{r.kind}</Pill> },
    ...(withProject
      ? [{ key: 'project', label: 'Project', render: (r: UaAsset) => r.project ?? '—' }]
      : []),
    {
      key: 'invocations',
      label: 'Invocations',
      numeric: true,
      render: (r) => formatNumber(r.invocations),
    },
    { key: 'spend', label: 'Money Spent', numeric: true, render: (r) => formatMoney(r.spend) },
    ...(withProject
      ? []
      : [
          {
            key: 'users',
            label: 'Unique Users',
            numeric: true,
            render: (r: UaAsset) =>
              r.users === null || r.users === undefined ? '—' : formatNumber(r.users),
          },
        ]),
    { key: 'last', label: 'Last Used', render: (r) => r.last ?? '—' },
  ]
  return (
    <LocalTable
      ariaLabel="Web Platform assets"
      columns={columns}
      rows={assets.map((a) => ({ ...a, id: `${a.kind}:${a.name}:${a.project ?? ''}` }))}
      idKey="id"
      defaultSort={{ sortKey: 'spend', sortOrder: 'desc' }}
    />
  )
}

export const ShowingNote: FC<{ shown: number; total: number; what: string }> = ({
  shown,
  total,
  what,
}) =>
  total > shown ? (
    <p className="text-xs text-text-quaternary">
      Showing {shown} of {formatNumber(total)} {what}
    </p>
  ) : null
