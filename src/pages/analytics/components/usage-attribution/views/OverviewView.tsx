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

import { FC, ReactNode, useMemo, useState } from 'react'
import { useSnapshot } from 'valtio'

import { usageAttributionStore } from '@/store/usageAttribution'
import type { UaCliSummary, UaResponse, UaTotals } from '@/types/usageAttribution'

import AnalyticsWidget from '../../AnalyticsWidget'
import { useUaQuery } from '../hooks/useUaQuery'
import RepositoryGroupModal from '../modals/RepositoryGroupModal'
import SharedProjectModal from '../modals/SharedProjectModal'
import CliCategoriesTable from '../tables/CliCategoriesTable'
import RepositoryGroupsTable from '../tables/RepositoryGroupsTable'
import SharedProjectsTable from '../tables/SharedProjectsTable'
import { errorText, useUaColors } from '../utils'
import BreakdownWidget from '../widgets/BreakdownWidget'
import { MoneyPie, PieSlice, WhoPaysBars } from '../widgets/Charts'
import SummaryTiles from '../widgets/SummaryTiles'
import Tile, { AnalysingText } from '../widgets/Tile'

export const SectionHeading: FC<{ title: string; description: ReactNode }> = ({
  title,
  description,
}) => (
  <div>
    <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
    <p className="mt-1 text-sm text-text-quaternary">{description}</p>
  </div>
)

interface Props {
  params: Record<string, string | number>
  periodQuery: Record<string, string>
}

const OverviewView: FC<Props> = ({ params, periodQuery }) => {
  const colors = useUaColors()
  const totals = useUaQuery<UaResponse<UaTotals>>('totals', 'totals', params)
  const summary = useUaQuery<UaResponse<UaCliSummary>>('cli-summary', 'cli-summary', params)
  const [project, setProject] = useState<string | null>(null)
  const [groupId, setGroupId] = useState<string | null>(null)

  const s = summary.data?.data ?? null
  // Spend by country and job title group needs user enrichment.
  const { settingsSchema } = useSnapshot(usageAttributionStore)
  const enrichment = settingsSchema?.enrichment !== false
  const slices: PieSlice[] = useMemo(() => {
    if (!s) return []
    const colorOf: Record<string, string> = {
      platform: colors.category('platform'),
      production: colors.category('production'),
      likely_production: colors.likely(),
      experiments: colors.category('experiments'),
      unclassified: colors.category('unclassified'),
    }
    return s.pie.map((p) => ({
      id: p.id,
      label: p.id === 'platform' ? p.label : p.label.replace('CLI ', ''),
      value: p.value,
      color: colorOf[p.id] ?? colors.category('unclassified'),
      group: p.id === 'platform' ? undefined : 'CLI',
    }))
  }, [s, colors])
  const t = totals.data?.data ?? null

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        title="Spending"
        description="How much was spent, on what, and who paid for it"
      />
      <AnalyticsWidget
        title="Summary"
        description="Web Platform (assistants, workflows, datasources) and CLI spend in the selected period"
        expandable={false}
        error={
          totals.error && !t && summary.error && !s ? { message: errorText(totals.error) } : null
        }
      >
        <SummaryTiles
          totals={t}
          totalsError={totals.error}
          summary={s}
          summaryError={summary.error}
        />
      </AnalyticsWidget>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <AnalyticsWidget
          title="Where the Money Goes"
          description="Web Platform and CLI by category group, share of total spend. Experiments = learning, testing, pet projects and experimental."
          error={summary.error && !s ? { message: errorText(summary.error) } : null}
          expandable={false}
        >
          {s ? (
            <MoneyPie slices={slices} ariaLabel="Pie of spend by Web Platform and CLI category" />
          ) : (
            <Tile label="CLI categories" pending pendingText={<AnalysingText />} />
          )}
        </AnalyticsWidget>
        <AnalyticsWidget
          title="Who Pays"
          description="Charged back = a shared project with a budget. Otherwise the usage is paid from personal budgets, inside a shared project without a budget or in a personal project."
          loading={totals.loading && !t}
          error={totals.error && !t ? { message: errorText(totals.error) } : null}
          expandable={false}
        >
          {t && <WhoPaysBars web={t.who_pays.web} cli={t.who_pays.cli} />}
        </AnalyticsWidget>
      </div>

      <SectionHeading
        title="Chargeback Candidates"
        description="Where to agree a project budget with the account. Click a row for details."
      />
      <SharedProjectsTable params={params} onOpen={setProject} />
      <RepositoryGroupsTable params={params} onOpen={setGroupId} />

      <SectionHeading title="CLI Usage" description="CLI categories and who pays for each" />
      <AnalyticsWidget
        title="CLI Spend by Category"
        description="Click a column to sort. Each category includes the unclassified spend allocated to it by people's classified work."
        loading={summary.loading && !s}
        error={summary.error && !s ? { message: errorText(summary.error) } : null}
        expandable={false}
      >
        {s && <CliCategoriesTable rows={s.categories} cli={s.tiles.cli} total={s.tiles.total} />}
      </AnalyticsWidget>
      {enrichment && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <BreakdownWidget dimension="country" params={params} />
          <BreakdownWidget dimension="job" params={params} />
        </div>
      )}

      {project && (
        <SharedProjectModal
          project={project}
          params={params}
          periodQuery={periodQuery}
          onHide={() => setProject(null)}
        />
      )}
      {groupId && (
        <RepositoryGroupModal groupId={groupId} params={params} onHide={() => setGroupId(null)} />
      )}
    </div>
  )
}

export default OverviewView
