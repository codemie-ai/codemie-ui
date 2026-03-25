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

import { FC, ReactNode, useEffect, useState } from 'react'

import Popup from '@/components/Popup'
import Spinner from '@/components/Spinner'
import {
  AnalyticsQueryParams,
  Metric,
  SummariesResponse,
  TabularMetricType,
  TabularResponse,
} from '@/types/analytics'
import { humanizeAnalyticsLabel } from '@/utils/analyticsFormatters'
import api from '@/utils/api'
import { getDeterministicChartColor } from '@/utils/chartColors'

import AnalyticsWidget from '../AnalyticsWidget'
import DistributionBarWidget from '../widgets/DistributionBarWidget'
import DonutChartWidget from '../widgets/DonutChartWidget'
import MetricCard from '../widgets/MetricCard'
import MetricsGrid from '../widgets/MetricsGrid'
import TableWidget from '../widgets/TableWidget'

interface UserDetailMetaResponse {
  data: {
    user_name: string
    user_email: string
    unique_projects: string[]
    branches_used: string[]
    rule_reasons: string[]
    tool_profile: {
      rationale: string
    }
  }
}

interface Props {
  userName: string | null
  userId?: string | null
  filters: AnalyticsQueryParams
  onHide: () => void
  onProjectClick?: (projectName: string) => void
}

type UserDetailQueryParams = AnalyticsQueryParams & {
  user_name: string
  user_id?: string | null
}

type MetricCardDescriptor = {
  metric: Metric
  valueOverride?: ReactNode
  valueClassName?: string
}

const getPrimitiveString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? String(value)
    : fallback

const sectionTitleClassName =
  'text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary'

const renderMetricPill = (label: string, color: string) => (
  <div
    className="inline-flex rounded-full px-3 py-1 text-sm font-semibold"
    style={{ backgroundColor: `${color}20`, color }}
  >
    {label}
  </div>
)

const findMetric = (metrics: Metric[] | undefined, id: string) =>
  metrics?.find((metric) => metric.id === id)

const compactMetricCards = (
  cards: Array<MetricCardDescriptor | null | undefined>
): MetricCardDescriptor[] => cards.filter((card): card is MetricCardDescriptor => Boolean(card))

const buildUserDetailParams = (
  userName: string,
  userId: string | null | undefined,
  filters: AnalyticsQueryParams
): UserDetailQueryParams => ({
  user_name: userName,
  user_id: userId,
  ...filters,
})

const fetchUserDetailWidget = <T,>(endpoint: string, params: UserDetailQueryParams) =>
  api
    .get(endpoint, {
      params,
      queryParamArrayHandling: 'compact',
      skipErrorHandling: true,
    })
    .then((response) => response.json() as Promise<T>)

const getWorkflowIntentCards = (
  metrics: Metric[] | undefined
): { cards: MetricCardDescriptor[] } => {
  const primaryIntent = findMetric(metrics, 'primary_intent')
  const signalStrength = findMetric(metrics, 'signal_strength')

  return {
    cards: compactMetricCards([
      primaryIntent
        ? {
            metric: primaryIntent,
            valueOverride: renderMetricPill(
              String(primaryIntent.value ?? 'Unknown'),
              getDeterministicChartColor(
                String(primaryIntent.value ?? 'Unknown')
                  .trim()
                  .toLowerCase() || 'unknown',
                0
              )
            ),
          }
        : null,
      signalStrength
        ? {
            metric: signalStrength,
            valueClassName: 'text-2xl font-semibold text-info-base',
          }
        : null,
    ]),
  }
}

const getClassificationCards = (metrics: Metric[] | undefined): MetricCardDescriptor[] => {
  const primaryCategory = findMetric(metrics, 'primary_category')
  const multiCategory = findMetric(metrics, 'is_multi_category')
  const diversityScore = findMetric(metrics, 'category_diversity_score')
  const repositories = findMetric(metrics, 'unique_repositories')
  const categoryKey = String(primaryCategory?.value ?? '').toLowerCase()
  const categoryLabel = humanizeAnalyticsLabel(String(primaryCategory?.value ?? 'Unknown'))
  const categoryColor = getDeterministicChartColor(categoryKey || 'all', 0)

  return compactMetricCards([
    primaryCategory
      ? {
          metric: primaryCategory,
          valueOverride: renderMetricPill(categoryLabel, categoryColor),
        }
      : null,
    multiCategory ? { metric: multiCategory } : null,
    diversityScore ? { metric: diversityScore } : null,
    repositories ? { metric: repositories } : null,
  ])
}

const getRepositoryBranches = (item: Record<string, unknown>): string[] =>
  Array.isArray(item.branches)
    ? item.branches.filter((branch): branch is string => typeof branch === 'string' && !!branch)
    : []

const renderRepositoryCell = (item: Record<string, unknown>) => {
  const branches = getRepositoryBranches(item)

  return (
    <div className="flex flex-col gap-3">
      <div>{getPrimitiveString(item.repository, '-')}</div>
      {!!branches.length && (
        <div className="flex flex-wrap gap-2">
          {branches.map((branch) => (
            <span
              key={branch}
              className="rounded-full bg-surface-elevated px-3 py-1 text-sm text-text-secondary"
            >
              {branch}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

const renderClassificationCell = (item: Record<string, unknown>) => {
  const key = getPrimitiveString(item.classification).toLowerCase()
  const color = getDeterministicChartColor(key, 0)
  const label = humanizeAnalyticsLabel(getPrimitiveString(item.classification, '-'))
  return (
    <span
      className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ backgroundColor: `${color}20`, color }}
    >
      {label}
    </span>
  )
}

const CLIInsightsUserDetailsModal: FC<Props> = ({
  userName,
  userId,
  filters,
  onHide,
  onProjectClick,
}) => {
  const [meta, setMeta] = useState<UserDetailMetaResponse | null>(null)
  const [keyMetrics, setKeyMetrics] = useState<SummariesResponse | null>(null)
  const [toolsChart, setToolsChart] = useState<TabularResponse | null>(null)
  const [modelsChart, setModelsChart] = useState<TabularResponse | null>(null)
  const [workflowIntentMetrics, setWorkflowIntentMetrics] = useState<SummariesResponse | null>(null)
  const [classificationMetrics, setClassificationMetrics] = useState<SummariesResponse | null>(null)
  const [categoryBreakdownChart, setCategoryBreakdownChart] = useState<TabularResponse | null>(null)
  const [repositoriesTable, setRepositoriesTable] = useState<TabularResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userName) return

    const params = buildUserDetailParams(userName, userId, filters)

    setLoading(true)
    setError(null)

    Promise.all([
      fetchUserDetailWidget<UserDetailMetaResponse>(
        'v1/analytics/cli-insights-user-detail',
        params
      ),
      fetchUserDetailWidget<SummariesResponse>(
        'v1/analytics/cli-insights-user-key-metrics',
        params
      ),
      fetchUserDetailWidget<TabularResponse>('v1/analytics/cli-insights-user-tools', params),
      fetchUserDetailWidget<TabularResponse>('v1/analytics/cli-insights-user-models', params),
      fetchUserDetailWidget<SummariesResponse>(
        'v1/analytics/cli-insights-user-workflow-intent',
        params
      ),
      fetchUserDetailWidget<SummariesResponse>(
        'v1/analytics/cli-insights-user-classification-detail',
        params
      ),
      fetchUserDetailWidget<TabularResponse>(
        'v1/analytics/cli-insights-user-category-breakdown',
        params
      ),
      fetchUserDetailWidget<TabularResponse>('v1/analytics/cli-insights-user-repositories', params),
    ])
      .then(
        ([
          nextMeta,
          nextKeyMetrics,
          nextToolsChart,
          nextModelsChart,
          nextWorkflowIntentMetrics,
          nextClassificationMetrics,
          nextCategoryBreakdownChart,
          nextRepositoriesTable,
        ]) => {
          setMeta(nextMeta)
          setKeyMetrics(nextKeyMetrics)
          setToolsChart(nextToolsChart)
          setModelsChart(nextModelsChart)
          setWorkflowIntentMetrics(nextWorkflowIntentMetrics)
          setClassificationMetrics(nextClassificationMetrics)
          setCategoryBreakdownChart(nextCategoryBreakdownChart)
          setRepositoriesTable(nextRepositoriesTable)
        }
      )
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load user details'))
      .finally(() => setLoading(false))
  }, [filters, userId, userName])

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
              metricType={TabularMetricType.CLI_INSIGHTS_TOP_SPENDERS}
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
