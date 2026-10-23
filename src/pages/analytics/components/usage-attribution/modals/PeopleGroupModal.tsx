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
import type {
  UaPeopleGroupBy,
  UaPeopleGroupDetail,
  UaPeopleGroupMember,
  UaResponse,
} from '@/types/usageAttribution'
import { copyToClipboard } from '@/utils/helpers'

import { ModalBody, Section } from './ModalParts'
import { useUaQuery } from '../hooks/useUaQuery'
import {
  NO_COMMON_CONDITION,
  NO_COMMON_CONDITION_TEXT,
  UA_CONDITION_LABELS,
} from '../tables/PeopleGroupsTable'
import { LocalTable, UaColumn } from '../tables/UaTable'
import { formatMoney, formatNumber } from '../utils'
import Tile from '../widgets/Tile'

interface Props {
  groupBy: Exclude<UaPeopleGroupBy, 'none'>
  groupId: string
  params: Record<string, string | number>
  onHide: () => void
  onOpenPerson: (uid: string) => void
}

type Repo = UaPeopleGroupDetail['repositories'][number]

/** Why the candidates of a group are together, from the facts the API gives. */
export const groupFacts = (detail: UaPeopleGroupDetail, label: string): string[] => {
  const { condition, how, repositories } = detail.facts
  if (condition === 'project' && how === 'inside')
    return [
      `Their production work runs inside the shared CodeMie project ${label}, which has no budget for them.`,
    ]
  if (condition === 'project')
    return [
      `They work from personal projects on repositories linked to the shared CodeMie project ${label}.`,
    ]
  if (condition === 'repositories')
    return [`They work on the same repositories: ${repositories.join(', ')}.`]
  if (condition === 'organization')
    return [`Their repositories belong to the same Git organization: ${label}.`]
  return [NO_COMMON_CONDITION_TEXT]
}

const NEXT_STEP =
  'Map this group to the project or account it works for, then ask it to fund a CodeMie project budget for these people. Until then, their production work stays on personal budgets.'

const NEXT_STEP_NONE =
  'These candidates share no CodeMie project, repositories or Git organization with another candidate. Map them one by one, starting with the largest amounts; small amounts can stay on personal budgets.'

/** A line of the copied people list: "Name <email>", or the name alone without an email of its own. */
const personLine = (m: UaPeopleGroupMember): string =>
  m.email && m.email !== m.name ? `${m.name} <${m.email}>` : m.name

const PeopleGroupModal: FC<Props> = ({ groupBy, groupId, params, onHide, onOpenPerson }) => {
  const query = useUaQuery<UaResponse<UaPeopleGroupDetail>>(
    'popup-people-group',
    `people-groups/${groupBy}/${encodeURIComponent(groupId)}`,
    params
  )
  const detail = query.data?.data
  const row = detail?.row
  const group = row && row.id !== 'none' && 'condition' in row ? row : null
  const title = group
    ? `${UA_CONDITION_LABELS[group.condition]}: ${group.label}`
    : NO_COMMON_CONDITION
  const error =
    query.error?.status === 404
      ? {
          message:
            'This group is not in the analysis any more: the period or the settings changed. Close the popup and pick it again.',
        }
      : query.error

  const memberColumns: UaColumn<UaPeopleGroupMember>[] = [
    {
      key: 'name',
      label: 'Candidate',
      render: (m) => (
        <div className="flex flex-col gap-0.5 min-w-[180px]">
          <button
            type="button"
            className="text-left font-semibold text-text-primary hover:underline"
            onClick={() => onOpenPerson(m.uid)}
          >
            {m.name}
          </button>
          <span className="text-[11px] text-text-quaternary">{m.email}</span>
        </div>
      ),
    },
    {
      key: 'in_group',
      label: 'In Group',
      numeric: true,
      render: (m) => <b>{formatMoney(m.in_group)}</b>,
    },
    {
      key: 'prod_ncb',
      label: 'Production on Personal Budget',
      numeric: true,
      render: (m) => formatMoney(m.prod_ncb),
    },
    {
      key: 'production_days',
      label: 'Production Days',
      numeric: true,
      render: (m) => formatNumber(m.production_days),
    },
    {
      key: 'charged_back',
      label: 'Charged Back',
      numeric: true,
      render: (m) => formatMoney(m.charged_back),
    },
    { key: 'main_repo', label: 'Main Repository', render: (m) => m.main_repo ?? '—' },
  ]
  const repoColumns: UaColumn<Repo>[] = [
    {
      key: 'repository',
      label: 'Repository',
      render: (r) => <b className="break-all">{r.repository}</b>,
    },
    {
      key: 'candidates',
      label: 'Candidates',
      numeric: true,
      render: (r) => formatNumber(r.candidates),
    },
    { key: 'amount', label: 'Production', numeric: true, render: (r) => formatMoney(r.amount) },
  ]

  return (
    <Popup
      visible
      onHide={onHide}
      header={detail ? title : 'Group of chargeback candidates'}
      headerDescription={row ? `${formatNumber(row.candidates)} chargeback candidates` : undefined}
      className="w-[96vw] max-w-[1280px]"
      hideFooter
    >
      <ModalBody loading={query.loading && !detail} error={!detail ? error : null}>
        {detail && row && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              <Tile
                label="Production on personal budgets"
                value={formatMoney(row.amount)}
                description={
                  row.estimated > 0.5 ? `${formatMoney(row.estimated)} estimated` : undefined
                }
                highlight
              />
              <Tile label="Candidates" value={formatNumber(row.candidates)} />
              <Tile label="Median production days" value={formatNumber(row.median_days)} />
              <Tile
                label="Charged back for the same people"
                value={formatMoney(detail.charged_back_same_people)}
                description="Already paid by project budgets"
              />
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <Section title="Why they are together">
                <ul className="flex flex-col gap-1.5 text-sm text-text-secondary">
                  {groupFacts(detail, group?.label ?? '').map((text) => (
                    <li key={text}>{text}</li>
                  ))}
                </ul>
              </Section>
              <Section title="Next step">
                <p className="text-sm text-text-secondary">{group ? NEXT_STEP : NEXT_STEP_NONE}</p>
                <div>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      copyToClipboard(
                        detail.members.map(personLine).join('\n'),
                        'People list copied to clipboard'
                      )
                    }
                  >
                    Copy people list
                  </Button>
                </div>
              </Section>
              <Section title="Candidates" full>
                <LocalTable
                  ariaLabel="Candidates of the group"
                  columns={memberColumns}
                  rows={detail.members}
                  idKey="uid"
                  onRowClick={(m) => onOpenPerson(m.uid)}
                  defaultSort={{ sortKey: 'in_group', sortOrder: 'desc' }}
                />
              </Section>
              <Section title="Repositories" full>
                <LocalTable
                  ariaLabel="Repositories of the group"
                  columns={repoColumns}
                  rows={detail.repositories}
                  idKey="repository"
                  defaultSort={{ sortKey: 'amount', sortOrder: 'desc' }}
                />
              </Section>
            </div>
          </>
        )}
      </ModalBody>
    </Popup>
  )
}

export default PeopleGroupModal
