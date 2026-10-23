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

import type { UaResponse, UaSettingsSchema, UaStatus } from '@/types/usageAttribution'

import AnalyticsWidget from '../../AnalyticsWidget'
import { UA_CATEGORY_LABELS, UA_FAMILY_LABELS, UA_REASON_LABELS } from '../constants'
import { Card, GROUP_SIGNALS, IDENTIFIED, RECORDED, STEPS, SettingsCard } from './HowItWorksParts'
import { useUaQuery } from '../hooks/useUaQuery'
import { LocalTable, UaColumn } from '../tables/UaTable'
import {
  errorText,
  formatMoney,
  formatMoneyShort,
  formatNumber,
  formatSeconds,
  formatUtcTime,
} from '../utils'
import { CategoryBadge, Pill } from '../widgets/Badges'
import Tile from '../widgets/Tile'

interface Props {
  params: Record<string, string | number>
  schema: UaSettingsSchema | null
}

/** Text for a field of the opaque `run` diagnostics record, which may be absent or non-primitive. */
const runText = (value: unknown): string => {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

const HowItWorksView: FC<Props> = ({ params, schema }) => {
  const query = useUaQuery<UaResponse<UaStatus>>('status', 'status', params)
  const status = query.data?.data ?? null
  const analysis = query.data?.analysis ?? null

  type SignalRow = UaStatus['signals'][number]
  const signalColumns: UaColumn<SignalRow>[] = [
    { key: 'family', label: 'Family', render: (r) => UA_FAMILY_LABELS[r.family] ?? r.family },
    {
      key: 'label',
      label: 'Signal',
      render: (r) => <span className="text-text-primary">{r.label}</span>,
    },
    {
      key: 'category',
      label: 'Points Toward',
      sortValue: (r) => UA_CATEGORY_LABELS[r.category],
      render: (r) => <CategoryBadge category={r.category} />,
    },
    { key: 'points', label: 'Points', numeric: true },
    {
      key: 'repositories',
      label: 'Repositories',
      numeric: true,
      render: (r) => formatNumber(r.repositories),
    },
    {
      key: 'spend_share',
      label: 'Share of Spend',
      numeric: true,
      render: (r) => `${r.spend_share}%`,
    },
  ]
  type IdentityRow = UaStatus['identity'][number]
  const identityColumns: UaColumn<IdentityRow>[] = [
    { key: 'number', label: 'Rule', numeric: true },
    { key: 'label', label: 'Case', render: (r) => r.label },
    { key: 'values', label: 'Values', numeric: true, render: (r) => formatNumber(r.values) },
    {
      key: 'repositories',
      label: 'Repositories',
      numeric: true,
      render: (r) => formatNumber(r.repositories),
    },
    { key: 'spend', label: 'Spend', numeric: true, render: (r) => formatMoney(r.spend) },
  ]

  const run = status?.run ?? {}
  // The evidence is read once an hour and reused by the later computations.
  let readNote = ''
  if (run.inputs_cached) readNote = ', the read of an earlier analysis, reused'
  else if (run.evidence_reused) readNote = ', evidence reused from earlier this hour'
  // Who paid for Web Platform usage: members funded by a project budget for the whole range or part of it.
  const webFunding = run.web_funding as
    | { projects: number; members_whole_range: number; members_part_of_range: number }
    | null
    | undefined
  return (
    <div className="flex flex-col gap-6">
      <Card
        title="How It Works"
        description="Everything runs on the backend from usage records and CLI session metadata. Prompt content is never read."
      >
        <ol className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          {STEPS.map(([title, text], i) => (
            <li
              key={title}
              className="rounded-md border border-border-specific-panel-outline bg-surface-elevated p-3 text-sm"
            >
              <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-in-progress-tertiary text-xs font-semibold text-in-progress-primary">
                {i + 1}
              </span>
              <b className="text-text-primary">{title}</b>
              <p className="mt-2 text-xs leading-5 text-text-secondary">{text}</p>
            </li>
          ))}
        </ol>
      </Card>

      <AnalyticsWidget
        title="This Analysis"
        description="Data quality of the analysis behind the numbers on this tab"
        loading={query.loading && !status}
        error={query.error && !status ? { message: errorText(query.error) } : null}
        expandable={false}
        actions={
          analysis?.computed_at ? (
            <Pill tone={analysis.stale ? 'warning' : 'success'}>
              Computed {formatUtcTime(analysis.computed_at)} in{' '}
              {formatSeconds(analysis.duration_ms)}
              {analysis.stale ? ' · stale' : ''}
            </Pill>
          ) : null
        }
      >
        {status && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Tile
                label="Coverage"
                value={`${status.coverage.share}%`}
                description={`of CLI spend analysed: every person, each person's top ${status.coverage.repositories_per_person} repositories`}
              />
              <Tile
                label="CLI Unclassified"
                value={formatMoney(status.tiles.uncl)}
                description={Object.entries(status.tiles.uncl_parts)
                  .map(([k, v]) => `${UA_REASON_LABELS[k] ?? k} ${formatMoneyShort(v)}`)
                  .join(' · ')}
              />
              <Tile
                label="Allocated by Person"
                value={formatMoney(status.tiles.allocated)}
                description="Unclassified spend split by each person's classified work, shown apart"
              />
              <Tile
                label="Not in Total"
                value={formatMoney(
                  status.tiles.excluded.no_customer + status.tiles.excluded.other_proxy
                )}
                description={`Without a LiteLLM customer ${formatMoneyShort(
                  status.tiles.excluded.no_customer
                )} · other proxied spend (Chrome extension, SDK) ${formatMoneyShort(
                  status.tiles.excluded.other_proxy
                )}`}
              />
            </div>
            <p className="text-xs leading-6 text-text-quaternary" data-testid="ua-run-details">
              Run details: Elasticsearch {formatSeconds(run.es_ms as number)} (
              {runText(run.requests)} requests
              {readNote}) · app DB {formatSeconds(run.db_ms as number)} · analysis{' '}
              {formatSeconds(run.analysis_ms as number)} · cache {analysis?.cache ?? '—'} (
              {runText(run.cache_backend)}) · peak memory {runText(run.peak_rss_mb)} MB
              {webFunding &&
                ` · Web Platform funding: ${formatNumber(
                  webFunding.projects
                )} projects, ${formatNumber(
                  webFunding.members_whole_range
                )} members for the whole period, ${formatNumber(
                  webFunding.members_part_of_range
                )} for part of it`}
              · settings {analysis?.settings.hash ?? '—'}
              {analysis?.settings.overridden.length
                ? ` with yours: ${analysis.settings.overridden.join(', ')}`
                : ' (defaults)'}
            </p>
            {!!status.reasons.length && (
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-text-secondary">
                {status.reasons.map((r) => (
                  <span key={r.reason}>
                    {UA_REASON_LABELS[r.reason] ?? r.label}: {formatMoneyShort(r.remaining)}{' '}
                    remaining ({formatNumber(r.repositories)} repositories,{' '}
                    {formatMoneyShort(r.allocated)} allocated)
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </AnalyticsWidget>

      <Card
        title="What CodeMie Records"
        description="Available today; nothing new is collected for this view"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-text-quaternary">
                <th className="py-2 pr-4 font-semibold">Data</th>
                <th className="py-2 pr-4 font-semibold">Example</th>
                <th className="py-2 font-semibold">Used for</th>
              </tr>
            </thead>
            <tbody>
              {RECORDED.map(([data, example, use]) => (
                <tr key={data} className="border-t border-border-structural">
                  <td className="py-2 pr-4 font-semibold text-text-primary">{data}</td>
                  <td className="py-2 pr-4 text-text-secondary">{example}</td>
                  <td className="py-2 text-text-secondary">{use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card
          title="How Repositories Are Identified"
          description="One repository = one row in Repository Groups"
        >
          <ul className="flex flex-col gap-2 text-sm">
            {IDENTIFIED.map(([c, r]) => (
              <li
                key={c}
                className="flex flex-col gap-0.5 border-b border-border-structural pb-2 last:border-b-0"
              >
                <span className="text-text-primary">{c}</span>
                <span className="text-xs text-text-quaternary">{r}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-text-quaternary">
            The CLI sends owner/repo without the Git host, and nothing about forks: the same
            owner/repo on two hosts counts as one repository; a fork under another owner is a
            separate repository that can still join the same group.
          </p>
          {!!status?.identity.length && (
            <div className="mt-4">
              <LocalTable
                ariaLabel="Identity rules"
                columns={identityColumns}
                rows={status.identity}
                idKey="rule"
                defaultSort={{ sortKey: 'number', sortOrder: 'asc' }}
              />
            </div>
          )}
        </Card>
        <Card
          title="How Repositories Are Grouped"
          description="Two or more of these make a repository group"
        >
          <ul className="flex flex-col gap-2 text-sm">
            {GROUP_SIGNALS.map(([signal, example]) => (
              <li
                key={signal}
                className="flex justify-between gap-4 border-b border-border-structural pb-2 last:border-b-0"
              >
                <span className="text-text-primary">{signal}</span>
                <span className="text-xs text-text-quaternary text-right">{example}</span>
              </li>
            ))}
          </ul>
          {status && (
            <p className="mt-3 text-xs text-text-quaternary">
              This analysis: {formatNumber(status.counts.repositories)} repositories,{' '}
              {formatNumber(status.counts.groups)} groups of two or more,{' '}
              {formatNumber(status.counts.folder_like_owners)} folder-like owners detected.
            </p>
          )}
        </Card>
      </div>

      <Card
        title="Evidence Used for CLI Categories"
        description="Each signal adds points to a category; the strongest category wins when its confidence reaches the minimum. Names alone never make Production; membership, working hours and prompts are not evidence."
      >
        {status ? (
          <LocalTable
            ariaLabel="Evidence signals"
            columns={signalColumns}
            rows={status.signals}
            idKey="id"
            defaultSort={{ sortKey: 'points', sortOrder: 'desc' }}
          />
        ) : (
          <p className="text-sm text-text-quaternary">Loading…</p>
        )}
      </Card>

      <SettingsCard status={status} schema={schema} />
    </div>
  )
}

export default HowItWorksView
