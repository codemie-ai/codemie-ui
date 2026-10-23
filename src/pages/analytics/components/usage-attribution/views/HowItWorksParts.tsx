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

import type { UaSettingsSchema, UaStatus } from '@/types/usageAttribution'

import AnalyticsWidget from '../../AnalyticsWidget'
import { displayValue, specsByKey } from '../settings/settingsModel'
import { formatUtcTime } from '../utils'
import { Pill } from '../widgets/Badges'

export const STEPS: Array<[string, string]> = [
  [
    'Who pays',
    'CLI usage is charged back when the LiteLLM customer it was billed to is a project budget. Web Platform records carry no customer: their usage in a shared project is charged back while the member had an allocation of the project\u2019s platform budget and the budget was active, by the dates in the app DB. The rest, in a shared project that had no budget for the member or in a personal project, is paid from personal budgets.',
  ],
  [
    'Classify CLI work',
    'Each repository, or a person\u2019s local folder, gets Production, Learning, Testing, Experimental or Pet Project from the evidence in the selected period (at least the last 30 days). Too little evidence leaves it Unclassified, which is then allocated by the person\u2019s own classified work when there is enough of it, and shown as allocated. Web Platform usage is not classified.',
  ],
  [
    'Identify repositories',
    'From the owner/repo the CLI reads from the git remote, or from the local folder when there is no remote. Desktop and IDE clients send no repository.',
  ],
  [
    'Group repositories',
    'Repositories that share an owner, ticket keys, a CodeMie project, people or Git datasources become one repository group.',
  ],
  [
    'Flag candidates',
    'Shared projects without a budget, and repository groups with production work in personal projects, above the thresholds.',
  ],
]

export const RECORDED: Array<[string, string, string]> = [
  [
    'Repository',
    'payments/project-one · _git/web-storefront · work/project-one',
    'owner/repo from the git remote; without a remote, the last two folder names in the same form',
  ],
  [
    'Branch and story',
    'feature/PAY-431-refund-flow → PAY-431',
    'Ticket keys for grouping; a weak naming signal',
  ],
  [
    'Code changes',
    'Edit, Write · +120 / −34 lines',
    'Production evidence; read-only sessions point to Learning',
  ],
  ['CodeMie project', 'a shared project or a personal one', 'Who pays; grouping'],
  [
    'CLI spend per request',
    'model · cost · project · LiteLLM customer · budget fallback',
    'Amounts and who pays',
  ],
  [
    'Git datasources and membership',
    'a shared project\u2019s Git datasource and members',
    'Which shared project a repository belongs to',
  ],
  [
    'Tools, MCP servers, extensions',
    'Edit, Bash · Jira and GitLab MCP · delivery-framework skills',
    'How the work was done',
  ],
  [
    'Web Platform usage',
    'project · user · assistant / workflow / datasource · cost',
    'Shared projects without a budget',
  ],
]

export const IDENTIFIED: Array<[string, string]> = [
  ['Same owner/repo from the git remote, any letter case', 'Same repository'],
  [
    'Azure DevOps remote reported as _git/repo',
    'Same repository; generic names such as api stay per person',
  ],
  [
    'No remote: the same person\u2019s folder, a subfolder of it, or a folder named like a remote repository the person uses',
    'Same repository',
  ],
  ['No remote: different people, same folder name', 'Not merged; can still join a group'],
  ['A Windows path such as C:/project', 'Local folder, per person'],
  [
    'Looks like owner/repo but is a common folder name, the person\u2019s own name, or a folder name many people use',
    'Local folder or own repository, per person',
  ],
  [
    'No repository: Claude Desktop, codemie-daemon and IDE clients; temporary, scratch and Cowork folders',
    'No repository: allocated by the person\u2019s work, or Unclassified',
  ],
]

export const GROUP_SIGNALS: Array<[string, string]> = [
  ['Same owner', 'payments/*'],
  ['Same ticket key in branch names', 'PAY- in several repositories'],
  ['People in common', 'two or more people on both repositories'],
  ['Same shared CodeMie project', 'at least 10% of each repository\u2019s spend'],
  ['Git datasources of the same shared project, or an owner rule', 'northwind-payments'],
]

/** The settings shown first; every other setting you changed is listed after them. */
const SETTINGS_SHOWN = [
  'sharedProjectThresholdPer30Days',
  'repositoryGroupThresholdPer30Days',
  'experimentsHighlightPer30Days',
  'platformPeopleFilterPer30Days',
  'candidateProductionDaysPer30Days',
  'minimumConfidence',
  'contradictedProductionMinConfidence',
  'likelyProductionMinConfidence',
  'personHistory.enabled',
  'confidenceConstant',
  'productionMinFamilies',
  'sustainedWork.enabled',
  'thresholds.activeDaysProduction',
  'teamSignalPeople',
  'allocateByPerson.enabled',
  'allocateByPerson.minClassifiedShare',
  'allocateByProject.enabled',
  'notChargedBack.excludeSharedExperiments',
  'groupMinSignals',
  'maxGroupSize',
  'learningSources',
  'excludedRepositories',
  'ownerProjectRules',
  'localFolderOwners',
  'ignoredSegments',
  'sessionlessClients',
  'repositoriesPerPerson',
  'minimumEvidenceDays',
]

export const Card: FC<{
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}> = ({ title, description, actions, children }) => (
  <AnalyticsWidget title={title} description={description} actions={actions} expandable={false}>
    {children}
  </AnalyticsWidget>
)

const SettingTerm: FC<{ label: string; children: ReactNode; note: ReactNode; testId?: string }> = ({
  label,
  children,
  note,
  testId,
}) => (
  <div
    className="flex flex-col gap-0.5 border-b border-border-structural pb-2"
    data-setting={testId}
  >
    <dt className="text-xs font-semibold uppercase tracking-[0.03em] text-text-quaternary">
      {label}
    </dt>
    <dd className="flex flex-col gap-0.5">
      <span className="flex flex-wrap items-center gap-2 text-text-primary">{children}</span>
      <span className="text-xs text-text-quaternary">{note}</span>
    </dd>
  </div>
)

/** The settings in effect, the ones you changed marked "Yours", and how the data is refreshed. */
export const SettingsCard: FC<{ status: UaStatus | null; schema: UaSettingsSchema | null }> = ({
  status,
  schema,
}) => {
  const specs = specsByKey(schema ?? ({ settings: [] } as unknown as UaSettingsSchema))
  const overridden = new Set(status?.settings.overridden ?? [])
  const keys = [
    ...SETTINGS_SHOWN,
    ...[...overridden]
      .filter((k) => !SETTINGS_SHOWN.includes(k))
      .sort((a, b) => a.localeCompare(b)),
  ].filter((k) => specs.has(k))
  const fallbackSince = schema?.fixed.fallback_field_since
  return (
    <Card
      title="Settings"
      description='Defaults come from the customer configuration. Values you changed in this browser are marked "Yours". Every tunable setting, with its default and allowed range, is in Analysis Settings at the top of the tab.'
      actions={
        <Pill tone={overridden.size ? 'warning' : 'neutral'}>
          {overridden.size ? `${overridden.size} yours` : 'Defaults'}
        </Pill>
      }
    >
      {status && (
        <dl className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          {keys.map((key) => {
            const spec = specs.get(key)
            if (!spec) return null
            return (
              <SettingTerm key={key} label={spec.label} note={spec.description} testId={key}>
                <span>{displayValue(spec, status.settings.values[key])}</span>
                {overridden.has(key) && (
                  <Pill tone="warning">
                    Yours (default {displayValue(spec, status.settings.defaults[key])})
                  </Pill>
                )}
              </SettingTerm>
            )
          })}
          {fallbackSince && (
            <SettingTerm
              label="Budget fallback field"
              note="Earlier CLI records have no fallback field: who paid for them comes from the LiteLLM customer."
            >
              Recorded since {formatUtcTime(fallbackSince)}
            </SettingTerm>
          )}
          <SettingTerm
            label="Data refresh"
            note={`Spend is read live; the analysis takes about 10 s on first load and is cached for ${status.settings.fixed.analysisCacheMinutes} minutes. The evidence is read once an hour and reused, so the other computations of the hour read only the spend. While a newer analysis is computed, the last finished one is shown; it is kept for a day. Custom settings get their own cache entry, so the default analysis others see is unaffected. Ranges are clamped to ${status.settings.fixed.maxRangeDays} days.`}
          >
            On request
          </SettingTerm>
        </dl>
      )}
    </Card>
  )
}
