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

import { useEffect, useState } from 'react'

import {
  UserDetailMetaResponse,
  UserDetailQueryParams,
  buildUserDetailParams,
} from '@/pages/analytics/components/cliInsights/helpers'
import { AnalyticsQueryParams, SummariesResponse, TabularResponse } from '@/types/analytics'
import api from '@/utils/api'


interface CliUserDetailState {
  meta: UserDetailMetaResponse | null
  keyMetrics: SummariesResponse | null
  toolsChart: TabularResponse | null
  modelsChart: TabularResponse | null
  workflowIntentMetrics: SummariesResponse | null
  classificationMetrics: SummariesResponse | null
  categoryBreakdownChart: TabularResponse | null
  repositoriesTable: TabularResponse | null
  loading: boolean
  error: string | null
}

const fetchWidget = <T>(endpoint: string, params: UserDetailQueryParams) =>
  api
    .get(endpoint, {
      params,
      queryParamArrayHandling: 'compact',
      skipErrorHandling: true,
    })
    .then((response) => response.json() as Promise<T>)

export const useCliUserDetail = (
  userName: string | null,
  userId: string | null | undefined,
  filters: AnalyticsQueryParams
): CliUserDetailState => {
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
      fetchWidget<UserDetailMetaResponse>('v1/analytics/cli-insights-user-detail', params),
      fetchWidget<SummariesResponse>('v1/analytics/cli-insights-user-key-metrics', params),
      fetchWidget<TabularResponse>('v1/analytics/cli-insights-user-tools', params),
      fetchWidget<TabularResponse>('v1/analytics/cli-insights-user-models', params),
      fetchWidget<SummariesResponse>('v1/analytics/cli-insights-user-workflow-intent', params),
      fetchWidget<SummariesResponse>(
        'v1/analytics/cli-insights-user-classification-detail',
        params
      ),
      fetchWidget<TabularResponse>('v1/analytics/cli-insights-user-category-breakdown', params),
      fetchWidget<TabularResponse>('v1/analytics/cli-insights-user-repositories', params),
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

  return {
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
  }
}
