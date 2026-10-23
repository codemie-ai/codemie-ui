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

import Popup from '@/components/Popup'
import type { UaGroupDetail, UaResponse } from '@/types/usageAttribution'

import { UA_CATEGORY_LABELS, UA_REASON_LABELS } from '../constants'
import { useUaQuery } from '../hooks/useUaQuery'
import { LocalTable, UaColumn } from '../tables/UaTable'
import { formatMoney, formatNumber } from '../utils'
import {
  AgentsTable,
  CategoryDistribution,
  EvidenceList,
  ModalBody,
  Section,
  ShowingNote,
} from './ModalParts'
import { CategoryBadge, PayPill } from '../widgets/Badges'
import { ModelsDonut } from '../widgets/Charts'
import Tile from '../widgets/Tile'

interface Props {
  groupId: string
  params: Record<string, string | number>
  onHide: () => void
}

type Repo = UaGroupDetail['detail']['repos'][number]
type Project = UaGroupDetail['detail']['projects'][number] & { id: string }
type Person = UaGroupDetail['detail']['people'][number]

const RepositoryGroupModal: FC<Props> = ({ groupId, params, onHide }) => {
  const query = useUaQuery<UaResponse<UaGroupDetail>>(
    'popup-group',
    `repository-groups/${encodeURIComponent(groupId)}`,
    params
  )
  const item = query.data?.data
  const row = item?.row
  const detail = item?.detail
  const repositoriesLabel = row?.repositories === 1 ? 'repository' : 'repositories'

  const repoColumns: UaColumn<Repo>[] = [
    {
      key: 'repository',
      label: 'Repository',
      render: (r) => (
        <div className="flex flex-col gap-1 min-w-[260px] max-w-[460px]">
          <b className="break-all">
            {r.repository}
            {r.owner_person ? (
              <span className="font-normal text-text-quaternary"> · {r.owner_person}</span>
            ) : null}
          </b>
          <span className="text-[11px] text-text-quaternary break-words">
            {r.variants.map((v) => `${v.value} (rule ${v.number}: ${v.text})`).join(' · ')}
          </span>
          {!!r.signals.length && (
            <span className="text-[11px] text-text-secondary break-words">
              {r.signals.map((s) => `${s.text} +${s.points}`).join(' · ')}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      sortValue: (r) => UA_CATEGORY_LABELS[r.category],
      render: (r) => (
        <div className="flex flex-col gap-1 items-start">
          <CategoryBadge category={r.category} />
          <span className="text-[11px] text-text-quaternary">
            {r.reason ? UA_REASON_LABELS[r.reason] ?? r.reason : `confidence ${r.confidence}`}
          </span>
        </div>
      ),
    },
    { key: 'people', label: 'People', numeric: true, render: (r) => formatNumber(r.people) },
    { key: 'sessions', label: 'Sessions', numeric: true, render: (r) => formatNumber(r.sessions) },
    { key: 'spend', label: 'CLI Spend', numeric: true, render: (r) => formatMoney(r.spend) },
    { key: 'ncb', label: 'Chargeback Potential', numeric: true, render: (r) => formatMoney(r.ncb) },
    { key: 'projects', label: 'CodeMie Projects', render: (r) => r.projects || '—' },
  ]
  const projectColumns: UaColumn<Project>[] = [
    { key: 'project', label: 'Project', render: (r) => <b>{r.project ?? 'Personal projects'}</b> },
    { key: 'pay', label: 'Who Pays', render: (r) => <PayPill payer={r.pay} /> },
    { key: 'spend', label: 'CLI Spend', numeric: true, render: (r) => formatMoney(r.spend) },
  ]
  const peopleColumns: UaColumn<Person>[] = [
    { key: 'name', label: 'User', render: (r) => <b className="whitespace-nowrap">{r.name}</b> },
    { key: 'location', label: 'Location', render: (r) => r.location || '—' },
    { key: 'repositories', label: 'Repositories', numeric: true },
    { key: 'spend', label: 'CLI Spend', numeric: true, render: (r) => formatMoney(r.spend) },
  ]

  return (
    <Popup
      visible
      onHide={onHide}
      header={row ? `Repository group: ${row.name}` : 'Repository group'}
      headerDescription={
        row
          ? `${row.repositories} ${repositoriesLabel} · ${row.people} people · grouped by ${row.grouped}`
          : undefined
      }
      className="w-[96vw] max-w-[1280px]"
      hideFooter
    >
      <ModalBody loading={query.loading && !item} error={!item ? query.error : null}>
        {row && detail && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              <Tile
                label="Chargeback Potential"
                value={formatMoney(row.ncb)}
                description="Production CLI work in personal projects"
                highlight
              />
              <Tile
                label="CLI Spend"
                value={formatMoney(row.spend)}
                description={`${formatNumber(detail.sessions)} sessions`}
              />
              <Tile
                label="CLI Production"
                value={`${row.prod_pct}%`}
                description={formatMoney(row.prod)}
              />
              <Tile
                label="People"
                value={formatNumber(row.people)}
                description={`${row.repositories} ${
                  row.repositories === 1 ? 'repository' : 'repositories'
                }`}
              />
            </div>
            <div className="rounded-lg border border-border-specific-panel-outline bg-surface-elevated px-4 py-3 text-sm">
              {detail.related.project ? (
                <>
                  <b>Related shared project: {detail.related.project}.</b>{' '}
                  <span className="text-text-secondary">{detail.related.text}.</span>
                </>
              ) : (
                <>
                  <b>No related shared project.</b>{' '}
                  <span className="text-text-secondary">
                    {detail.related.text}. An owner rule in Analysis Settings can add one.
                  </span>
                </>
              )}
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <Section title="Why these repositories are one group">
                <EvidenceList
                  items={detail.why.map((text) => ({ kind: 'positive' as const, text }))}
                />
              </Section>
              <Section title="CLI spend by category">
                <CategoryDistribution amounts={detail.categories} />
              </Section>
              <Section title="Repositories and how they were identified" full>
                <LocalTable
                  ariaLabel="Repositories of the group"
                  columns={repoColumns}
                  rows={detail.repos}
                  idKey="repository"
                  defaultSort={{ sortKey: 'spend', sortOrder: 'desc' }}
                />
                <ShowingNote
                  shown={detail.repos.length}
                  total={row.repositories}
                  what="repositories"
                />
              </Section>
              <Section title="Models">
                <ModelsDonut models={detail.models} />
              </Section>
              <Section title="Coding agents">
                <AgentsTable agents={detail.agents.map((a) => ({ ...a, sessions: null }))} />
              </Section>
              <Section title="CodeMie projects used">
                <LocalTable
                  ariaLabel="CodeMie projects of the group"
                  columns={projectColumns}
                  rows={detail.projects.map((p, i) => ({
                    ...p,
                    id: `${p.project ?? 'personal'}-${i}`,
                  }))}
                  idKey="id"
                  defaultSort={{ sortKey: 'spend', sortOrder: 'desc' }}
                />
              </Section>
              <Section title="People">
                <LocalTable
                  ariaLabel="People of the group"
                  columns={peopleColumns}
                  rows={detail.people}
                  idKey="uid"
                  defaultSort={{ sortKey: 'spend', sortOrder: 'desc' }}
                />
                <ShowingNote shown={detail.people.length} total={row.people} what="people" />
              </Section>
            </div>
          </>
        )}
      </ModalBody>
    </Popup>
  )
}

export default RepositoryGroupModal
