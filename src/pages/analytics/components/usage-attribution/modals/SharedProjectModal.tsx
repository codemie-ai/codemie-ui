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

import { FC, useMemo } from 'react'

import Button from '@/components/Button'
import Popup from '@/components/Popup'
import { ANALYTICS, PROJECTS_MANAGEMENT_DETAIL } from '@/constants/routes'
import { useVueRouter } from '@/hooks/useVueRouter'
import type { UaResponse, UaSharedProjectDetail } from '@/types/usageAttribution'

import { UA_BUDGET_LABELS, UA_CATEGORY_LABELS } from '../constants'
import { useUaQuery } from '../hooks/useUaQuery'
import { projectFacts } from '../tables/SharedProjectsTable'
import { LocalTable, UaColumn } from '../tables/UaTable'
import { formatMoney, formatNumber } from '../utils'
import { AgentsTable, AssetsTable, ModalBody, Section, ShowingNote } from './ModalParts'
import { CategoryBadge, Pill } from '../widgets/Badges'
import { ModelsDonut } from '../widgets/Charts'
import Tile from '../widgets/Tile'

interface Props {
  project: string
  params: Record<string, string | number>
  periodQuery: Record<string, string>
  onHide: () => void
}

interface PersonRow {
  uid: string
  name: string
  location: string
  web: number
  cli: number
}

const budgetLabel = (budgets: string[]): string =>
  budgets.length
    ? `${budgets.map((b) => UA_BUDGET_LABELS[b] ?? b).join(', ')} budget for some members`
    : 'No project budget'

const SharedProjectModal: FC<Props> = ({ project, params, periodQuery, onHide }) => {
  const router = useVueRouter()
  const query = useUaQuery<UaResponse<UaSharedProjectDetail>>(
    'popup-shared-project',
    `shared-projects/${encodeURIComponent(project)}`,
    params
  )
  const item = query.data?.data
  const row = item?.row
  const detail = item?.detail

  const people = useMemo(() => {
    const byUid = new Map<string, PersonRow>()
    for (const p of detail?.web_people ?? [])
      byUid.set(p.uid, { uid: p.uid, name: p.name, location: p.location, web: p.web, cli: 0 })
    for (const p of detail?.cli_people ?? []) {
      const existing = byUid.get(p.uid) ?? {
        uid: p.uid,
        name: p.name,
        location: p.location,
        web: 0,
        cli: 0,
      }
      existing.cli += p.cli
      byUid.set(p.uid, existing)
    }
    return [...byUid.values()]
  }, [detail])

  const types = detail?.web_types
  const budgetText = row ? budgetLabel(row.budgets) : ''
  const prodPctSuffix =
    row?.prod_pct !== null && row?.prod_pct !== undefined ? ` · ${row.prod_pct}% production` : ''

  const peopleColumns: UaColumn<PersonRow>[] = [
    { key: 'name', label: 'User', render: (r) => <b className="whitespace-nowrap">{r.name}</b> },
    { key: 'location', label: 'Location', render: (r) => r.location || '—' },
    { key: 'web', label: 'Web Platform', numeric: true, render: (r) => formatMoney(r.web) },
    { key: 'cli', label: 'CLI', numeric: true, render: (r) => formatMoney(r.cli) },
  ]
  type RepoRow = UaSharedProjectDetail['detail']['repos'][number]
  const repoColumns: UaColumn<RepoRow>[] = [
    {
      key: 'repository',
      label: 'Repository',
      render: (r) =>
        r.no_repository ? (
          <span className="text-text-quaternary">
            {r.repository
              ? `${r.repository} · not a repository`
              : 'No repository (desktop and IDE clients)'}
          </span>
        ) : (
          <b className="break-all">{r.repository}</b>
        ),
    },
    {
      key: 'category',
      label: 'Category',
      render: (r) => <CategoryBadge category={r.category} />,
      sortValue: (r) => UA_CATEGORY_LABELS[r.category],
    },
    { key: 'spend', label: 'CLI Spend', numeric: true, render: (r) => formatMoney(r.spend) },
    {
      key: 'paid_personally',
      label: 'Paid Personally',
      numeric: true,
      render: (r) => formatMoney(r.paid_personally),
    },
  ]

  return (
    <Popup
      visible
      onHide={onHide}
      header={project}
      headerDescription={
        row
          ? `Shared project · ${row.people} people in the period · ${projectFacts(row)}`
          : 'Shared project'
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
                description="Web Platform and CLI paid from personal budgets, except experiments"
                highlight
              />
              <Tile
                label="Web Platform"
                value={formatMoney(row.platform)}
                description={
                  row.platform
                    ? `Assistants ${formatMoney(types?.assistant)} · Workflows ${formatMoney(
                        types?.workflow
                      )} · Datasources ${formatMoney(types?.datasource)}`
                    : 'No Web Platform usage'
                }
              />
              <Tile
                label="CLI"
                value={formatMoney(row.cli)}
                description={
                  row.cli
                    ? `${formatMoney(row.cli_sh)} paid personally · ${formatMoney(
                        row.cli_exp
                      )} experiments${prodPctSuffix}`
                    : 'No CLI usage'
                }
              />
              <Tile
                label="People"
                value={formatNumber(row.people)}
                description={`${people.length} shown below`}
              />
            </div>
            <div className="flex flex-col gap-2 rounded-lg border border-border-specific-panel-outline px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <b>Budget</b>
                <Pill tone="warning">{budgetText}</Pill>
                <span className="text-text-secondary">
                  {row.budgets.length
                    ? `Members without a budget allocation pay personally: ${formatMoney(
                        row.web_sh
                      )} on the Web Platform and ${formatMoney(row.cli_sh)} on CLI.`
                    : `Usage in ${project} is paid from the members' personal budgets.`}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <b>Cost center</b>
                <span className="text-text-secondary">{row.cost_center ?? 'None'}</span>
                <Pill tone={row.chargeback ? 'success' : 'neutral'}>
                  {row.chargeback ? 'Chargeback on' : 'Chargeback off'}
                </Pill>
              </div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {!!detail.assets?.length && (
                <Section title="Web Platform: assistants, workflows and datasources" full>
                  <AssetsTable assets={detail.assets} />
                </Section>
              )}
              <Section title="Models">
                <ModelsDonut models={detail.models_all ?? detail.models} />
              </Section>
              <Section title="Coding agents">
                <AgentsTable agents={detail.agents} />
              </Section>
              <Section title="People">
                <LocalTable
                  ariaLabel="People of the project"
                  columns={peopleColumns}
                  rows={people}
                  idKey="uid"
                  defaultSort={{ sortKey: 'web', sortOrder: 'desc' }}
                />
                <ShowingNote shown={people.length} total={row.people} what="people" />
              </Section>
              <Section title="CLI repositories in this project">
                {detail.repos.length ? (
                  <LocalTable
                    ariaLabel="CLI repositories of the project"
                    columns={repoColumns}
                    rows={detail.repos}
                    idKey="repository"
                    defaultSort={{ sortKey: 'spend', sortOrder: 'desc' }}
                  />
                ) : (
                  <p className="text-sm text-text-quaternary">No CLI usage in this project.</p>
                )}
              </Section>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() =>
                  router.push({
                    name: PROJECTS_MANAGEMENT_DETAIL,
                    params: { projectName: project },
                  })
                }
              >
                Open project in Projects management
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  router.push({
                    name: ANALYTICS,
                    query: { ...periodQuery, tab: 'insights', projects: project },
                  })
                }
              >
                View {project} in Insights
              </Button>
            </div>
          </>
        )}
      </ModalBody>
    </Popup>
  )
}

export default SharedProjectModal
