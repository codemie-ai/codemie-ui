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
import Spinner from '@/components/Spinner'
import { useCliUserDetail } from '@/hooks/useCliUserDetail'
import { AnalyticsQueryParams, TabularMetricType } from '@/types/analytics'
import { getDeterministicChartColor } from '@/utils/chartColors'

import AnalyticsWidget from '../AnalyticsWidget'
import {
  sectionTitleClassName,
  getWorkflowIntentCards,
  getClassificationCards,
  renderRepositoryCell,
  renderClassificationCell,
} from './helpers'
import DistributionBarWidget from '../widgets/DistributionBarWidget'
import DonutChartWidget from '../widgets/DonutChartWidget'
import MetricCard from '../widgets/MetricCard'
import MetricsGrid from '../widgets/MetricsGrid'
import TableWidget from '../widgets/TableWidget'

interface Props {
  userName: string | null
  userId?: string | null
  filters: AnalyticsQueryParams
  onHide: () => void
  onProjectClick?: (projectName: string) => void
}

const CLIInsightsUserDetailsModal: FC<Props> = ({
  userName,
  userId,
  filters,
  onHide,
  onProjectClick,
}) => {
  const {
    meta,
    keyMetrics,
    toolsChart,
    modelsChart,
    workflowIntentMetrics,
    classificationMetrics,
    categoryBreakdownChart,
    repositoriesTable,
    loading,
    error,
  } = useCliUserDetail(userName, userId, filters)

  if (!userName) return null

  const workflowIntentCards = getWorkflowIntentCards(workflowIntentMetrics?.data.metrics).cards
  const classificationCards = getClassificationCards(classificationMetrics?.data.metrics)

  return (
    <Popup
      visible={true}
      onHide={onHide}
      header={`CLI User: ${meta?.data.user_name || userName}`}
      className="w-[96vw] max-w-[1720px]"
      hideFooter
    >
      {loading && (
        <div className="flex items-center justify-center py-10">
          <Spinner />
        </div>
      )}
      {!loading && error && <div className="text-sm text-text-error">{error}</div>}
      {!loading && !error && meta && (
        <div className="flex flex-col gap-6 pb-6">
          <div className="text-sm text-text-secondary">{meta.data.user_email}</div>

          <section className="flex flex-col gap-4">
            <h4 className={sectionTitleClassName}>Key Metrics</h4>
            <MetricsGrid data={keyMetrics} className="xl:grid-cols-8" />
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <DonutChartWidget
              metricType={TabularMetricType.CLI_TOOLS}
              title="Most Used Tools"
              description="Actual usage for this entity"
              labelField="tool_name"
              valueField="usage_count"
              expandable={false}
              dataOverride={toolsChart}
              emptyStateLabel="No scoped tool data was found for this entity."
            />
            <DonutChartWidget
              metricType={TabularMetricType.CLI_LLMS}
              title="Models"
              description="Model distribution for this entity"
              labelField="model_name"
              valueField="count"
              expandable={false}
              dataOverride={modelsChart}
              emptyStateLabel="No scoped model data was found for this entity."
            />
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <AnalyticsWidget title="Workflow Intent" expandable={false}>
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                  {workflowIntentCards.map((card) => (
                    <MetricCard
                      key={card.metric.id}
                      metric={card.metric}
                      valueOverride={card.valueOverride}
                      valueClassName={card.valueClassName}
                    />
                  ))}
                </div>
                {meta.data.tool_profile.rationale && (
                  <div className="text-sm text-text-secondary">
                    {meta.data.tool_profile.rationale}
                  </div>
                )}
              </div>
            </AnalyticsWidget>

            <AnalyticsWidget title="Classification" expandable={false}>
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                  {classificationCards.map((card) => (
                    <MetricCard
                      key={card.metric.id}
                      metric={card.metric}
                      valueOverride={card.valueOverride}
                      valueClassName={card.valueClassName}
                    />
                  ))}
                </div>
                {!!meta.data.rule_reasons.length && (
                  <div className="text-sm text-text-secondary">
                    {meta.data.rule_reasons.join(' · ')}
                  </div>
                )}
              </div>
            </AnalyticsWidget>
          </section>

          <DistributionBarWidget
            data={categoryBreakdownChart}
            title="Category Breakdown"
            description="Repository distribution across deterministic CLI categories."
            labelField="category"
            valueField="percentage"
            secondaryValueField="cost"
            colorByLabel={getDeterministicChartColor}
            emptyStateLabel="No category breakdown available for this entity."
          />

          {!!meta.data.unique_projects.length && (
            <section className="flex flex-col gap-3">
              <h4 className={sectionTitleClassName}>
                Projects ({meta.data.unique_projects.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {meta.data.unique_projects.map((project) => (
                  <button
                    key={project}
                    type="button"
                    onClick={() => onProjectClick?.(project)}
                    className="rounded-full bg-surface-elevated px-3 py-1 text-sm hover:opacity-80"
                  >
                    {project}
                  </button>
                ))}
              </div>
            </section>
          )}

          {repositoriesTable && (
            <TableWidget
              metricType={TabularMetricType.CLI_INSIGHTS_USER_REPOSITORIES}
              title={`Repositories (${repositoriesTable.data.rows.length})`}
              initialData={repositoriesTable}
              hidePagination
              customRenderColumns={{
                repository: renderRepositoryCell,
                classification: renderClassificationCell,
              }}
            />
          )}

          {!!meta.data.branches_used.length && (
            <section className="flex flex-col gap-3">
              <h4 className={sectionTitleClassName}>Branches ({meta.data.branches_used.length})</h4>
              <div className="flex flex-wrap gap-2">
                {meta.data.branches_used.map((branch) => (
                  <span key={branch} className="rounded-full bg-surface-elevated px-3 py-1 text-sm">
                    {branch}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </Popup>
  )
}

export default CLIInsightsUserDetailsModal
