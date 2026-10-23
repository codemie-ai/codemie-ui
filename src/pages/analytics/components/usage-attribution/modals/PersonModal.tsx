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

import { FC } from 'react'

import Button from '@/components/Button'
import Popup from '@/components/Popup'
import { ANALYTICS } from '@/constants/routes'
import { useVueRouter } from '@/hooks/useVueRouter'
import type { UaPersonChargeback, UaPersonDetail, UaResponse } from '@/types/usageAttribution'

import { UA_CATEGORY_LABELS } from '../constants'
import { useUaQuery } from '../hooks/useUaQuery'
import { UA_CONDITION_LABELS } from '../tables/PeopleGroupsTable'
import { personLocation } from '../tables/PeopleTable'
import { LocalTable, UaColumn } from '../tables/UaTable'
import { formatMoney, formatNumber, formatPct, productionDaysWhen } from '../utils'
import { AgentsTable, AssetsTable, EvidenceList, ModalBody, Section } from './ModalParts'
import { CategoryBadge, PayPill, Pill } from '../widgets/Badges'
import { ModelsDonut } from '../widgets/Charts'
import Tile from '../widgets/Tile'

interface Props {
  uid: string
  params: Record<string, string | number>
  periodQuery: Record<string, string>
  onHide: () => void
  /** Opens a group of chargeback candidates (grouped by common condition). */
  onOpenGroup?: (id: string) => void
}

type Detail = UaPersonDetail['detail']
type ProjectRow = Detail['projects'][number] & { total: number; sessions: number | null }
type RepoRow = Detail['repos'][number] & { id: string }
type CategoryRow = Detail['by_category'][number]
type SessionRow = NonNullable<Detail['recent']>[number] & { id: string }

const projectNote = (r: ProjectRow): string => {
  if (r.sessions) return `${r.sessions} sessions`
  return r.cli ? 'CLI' : 'Web Platform only'
}

const days = (n: number) => `${formatNumber(n)} ${n === 1 ? 'day' : 'days'}`

/** Whether the person is a chargeback candidate, and with whom they share their production work. */
const ChargebackSection: FC<{
  chargeback: UaPersonChargeback
  /** "in this period", or since when on a period shorter than the evidence window. */
  when: string
  onOpenGroup?: (id: string) => void
}> = ({ chargeback: cb, when, onOpenGroup }) => (
  <Section title="Chargeback candidate">
    {cb.candidate ? (
      <>
        <p className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
          <Pill tone="warning">Chargeback candidate</Pill>
          Production work from a personal budget on {days(cb.production_days)} {when}.
        </p>
        <ul className="flex flex-col gap-1.5 text-sm">
          {cb.groups.map((g) => (
            <li key={g.id}>
              <b>{formatMoney(g.amount)}</b> ·{' '}
              <button
                type="button"
                className="font-semibold text-text-accent hover:underline"
                onClick={() => onOpenGroup?.(g.id)}
              >
                {UA_CONDITION_LABELS[g.condition]} {g.label}
              </button>
              , shared with {formatNumber(g.others)} other{' '}
              {g.others === 1 ? 'candidate' : 'candidates'}
            </li>
          ))}
          {cb.alone > 0.5 && (
            <li>
              <b>{formatMoney(cb.alone)}</b> · no other candidate shares this work
            </li>
          )}
        </ul>
      </>
    ) : (
      <p className="text-sm text-text-secondary">
        Not a candidate: production work from a personal budget on {days(cb.production_days)} {when}{' '}
        only ({cb.threshold_days} or more needed).
      </p>
    )}
  </Section>
)

const PersonModal: FC<Props> = ({ uid, params, periodQuery, onHide, onOpenGroup }) => {
  const router = useVueRouter()
  const query = useUaQuery<UaResponse<UaPersonDetail>>(
    'popup-person',
    `people/${encodeURIComponent(uid)}`,
    params
  )
  const item = query.data?.data
  const row = item?.row
  const detail = item?.detail

  const projects: ProjectRow[] = (detail?.projects ?? []).map((p) => ({
    ...p,
    total: p.web + p.cli,
    sessions: detail?.project_sessions?.[p.project] ?? null,
  }))
  const projectColumns: UaColumn<ProjectRow>[] = [
    {
      key: 'project',
      label: 'Project',
      render: (r) => (
        <div className="flex flex-col">
          <b className="break-all">{r.project}</b>
          <span className="text-[11px] text-text-quaternary">{projectNote(r)}</span>
        </div>
      ),
    },
    { key: 'pay', label: 'Who Pays', render: (r) => <PayPill payer={r.pay} /> },
    {
      key: 'web',
      label: 'Web Platform',
      numeric: true,
      render: (r) => formatMoney(r.web),
      total: formatMoney(projects.reduce((s, p) => s + p.web, 0)),
    },
    {
      key: 'cli',
      label: 'CLI',
      numeric: true,
      render: (r) => formatMoney(r.cli),
      total: formatMoney(projects.reduce((s, p) => s + p.cli, 0)),
    },
    {
      key: 'total',
      label: 'Total',
      numeric: true,
      render: (r) => formatMoney(r.total),
      total: formatMoney(projects.reduce((s, p) => s + p.total, 0)),
    },
  ]
  const repoColumns: UaColumn<RepoRow>[] = [
    {
      key: 'value',
      label: 'Repository',
      render: (r) => (
        <div className="flex flex-col min-w-[200px] max-w-[360px]">
          <b className="break-all">{r.value || '(no repository)'}</b>
          {r.repository && r.repository !== r.value && (
            <span className="text-[11px] text-text-quaternary break-all">→ {r.repository}</span>
          )}
        </div>
      ),
    },
    { key: 'group', label: 'Repository Group', render: (r) => (r.group_id ? r.group ?? '—' : '—') },
    {
      key: 'category',
      label: 'Category',
      sortValue: (r) => UA_CATEGORY_LABELS[r.category],
      render: (r) => <CategoryBadge category={r.category} />,
    },
    { key: 'sessions', label: 'Sessions', numeric: true, render: (r) => formatNumber(r.sessions) },
    { key: 'spend', label: 'CLI Cost', numeric: true, render: (r) => formatMoney(r.spend) },
    {
      key: 'net_lines',
      label: 'Net Lines',
      numeric: true,
      render: (r) => formatNumber(r.net_lines),
    },
    { key: 'pay', label: 'Who Pays', render: (r) => <PayPill payer={r.pay} /> },
    {
      key: 'rule_text',
      label: 'Identified As',
      render: (r) => <span className="text-[11px] text-text-secondary">{r.rule_text}</span>,
    },
  ]
  const categoryColumns: UaColumn<CategoryRow>[] = [
    {
      key: 'category',
      label: 'Category',
      sortValue: (r) => UA_CATEGORY_LABELS[r.category],
      render: (r) => <CategoryBadge category={r.category} />,
    },
    { key: 'sessions', label: 'Sessions', numeric: true, render: (r) => formatNumber(r.sessions) },
    { key: 'spend', label: 'CLI Cost', numeric: true, render: (r) => formatMoney(r.spend) },
    { key: 'avg_prompts', label: 'Avg Turns', numeric: true },
    {
      key: 'net_lines',
      label: 'Net Lines',
      numeric: true,
      render: (r) => formatNumber(r.net_lines),
    },
  ]
  const sessionColumns: UaColumn<SessionRow>[] = [
    {
      key: 'date',
      label: 'Date (UTC)',
      render: (r) => <span className="whitespace-nowrap">{r.date}</span>,
    },
    {
      key: 'repository',
      label: 'Repository',
      render: (r) => <span className="break-all">{r.repository ?? '—'}</span>,
    },
    {
      key: 'branch',
      label: 'Branch',
      render: (r) => <span className="break-all">{r.branch ?? '—'}</span>,
    },
    {
      key: 'category',
      label: 'Category',
      sortValue: (r) => UA_CATEGORY_LABELS[r.category],
      render: (r) => <CategoryBadge category={r.category} />,
    },
    { key: 'client', label: 'Coding Agent', render: (r) => r.client ?? '—' },
    { key: 'framework', label: 'Framework' },
    {
      key: 'turns',
      label: 'Turns',
      numeric: true,
      render: (r) => (r.turns === null ? formatNumber(r.requests) : formatNumber(r.turns)),
    },
    { key: 'spend', label: 'Cost', numeric: true, render: (r) => `$${r.spend.toFixed(2)}` },
  ]

  const reasons = detail?.reasons ?? []
  const assets = detail?.assets ?? []
  const assetsNoun = assets.length > 1 ? 'assistants and workflows' : 'assistant or workflow'
  return (
    <Popup
      visible
      onHide={onHide}
      header={row ? `User: ${row.name}` : 'User'}
      headerDescription={
        row ? [row.email, personLocation(row)].filter(Boolean).join(' · ') : undefined
      }
      className="w-[96vw] max-w-[1400px]"
      hideFooter
    >
      <ModalBody loading={query.loading && !item} error={!item ? query.error : null}>
        {row && detail && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              <Tile label="Total Spend" value={formatMoney(row.total)} />
              <Tile
                label="Web Platform"
                value={formatMoney(row.platform)}
                description={
                  assets.length ? `${assets.length} ${assetsNoun}` : 'No Web Platform usage'
                }
              />
              <Tile
                label="CLI"
                value={formatMoney(row.cli)}
                description={`${formatNumber(detail.sessions)} sessions${
                  detail.active_days ? ` · ${detail.active_days} active days` : ''
                }`}
              />
              <Tile
                label="Charged Back"
                value={formatMoney(row.charged_back)}
                description="Paid by project budgets"
              />
              <Tile
                label="Personal Budget: Production"
                value={formatMoney(row.prod_ncb)}
                description={`${days(row.production_days)} with production · ${formatPct(
                  row.prod_ncb,
                  row.total
                )} of their spend`}
                highlight
              />
              <Tile
                label="Personal Budget: Learning & Experiments"
                value={formatMoney(row.personal_learning)}
              />
              <Tile label="Net Lines Added" value={formatNumber(detail.net_lines)} />
              <Tile
                label="Main Repository"
                value={<span className="text-sm break-all">{row.main_repo ?? '—'}</span>}
              />
            </div>
            {row.prod_ncb > 0.5 && detail.chargeback && (
              <ChargebackSection
                chargeback={detail.chargeback}
                when={productionDaysWhen(query.data?.range)}
                onOpenGroup={onOpenGroup}
              />
            )}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <Section title="CodeMie projects" full>
                <LocalTable
                  ariaLabel="CodeMie projects of the person"
                  columns={projectColumns}
                  rows={projects}
                  idKey="project"
                  defaultSort={{ sortKey: 'total', sortOrder: 'desc' }}
                  showTotals={projects.length > 1}
                />
              </Section>
              {row.platform > 0 && assets.length > 0 && (
                <Section title="Web Platform: assistants and workflows" full>
                  <AssetsTable assets={assets} withProject />
                </Section>
              )}
              <Section title="Models">
                <ModelsDonut models={detail.models ?? []} />
              </Section>
              <Section title="Coding agents">
                <AgentsTable agents={detail.agents ?? []} />
              </Section>
              <Section title="Repositories" full>
                <LocalTable
                  ariaLabel="Repositories of the person"
                  columns={repoColumns}
                  rows={detail.repos.map((r, i) => ({ ...r, id: `${r.value}-${i}` }))}
                  idKey="id"
                  defaultSort={{ sortKey: 'spend', sortOrder: 'desc' }}
                />
              </Section>
              <Section title="Sessions by category">
                <LocalTable
                  ariaLabel="Sessions by category"
                  columns={categoryColumns}
                  rows={detail.by_category}
                  idKey="category"
                  defaultSort={{ sortKey: 'spend', sortOrder: 'desc' }}
                />
              </Section>
              <Section title="Why these categories">
                {reasons.length ? (
                  <EvidenceList items={reasons} />
                ) : (
                  <p className="text-sm text-text-quaternary">No CLI usage.</p>
                )}
              </Section>
              <Section title="Recent sessions" full>
                {detail.recent?.length ? (
                  <LocalTable
                    ariaLabel="Recent sessions"
                    columns={sessionColumns}
                    rows={detail.recent.map((s, i) => ({ ...s, id: `${s.date}-${i}` }))}
                    idKey="id"
                    defaultSort={{ sortKey: 'date', sortOrder: 'desc' }}
                  />
                ) : (
                  <p className="text-sm text-text-quaternary">
                    No sessions with a session id in the period.
                  </p>
                )}
                <div>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      router.push({
                        name: ANALYTICS,
                        query: { ...periodQuery, tab: 'cliInsights', users: row.uid },
                      })
                    }
                  >
                    Open in CLI Insights
                  </Button>
                </div>
              </Section>
            </div>
          </>
        )}
      </ModalBody>
    </Popup>
  )
}

export default PersonModal
