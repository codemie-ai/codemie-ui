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

import { type FC, useCallback, useMemo, useRef, useState } from 'react'

import Select from '@/components/form/Select'
import { UNATTRIBUTED_LABEL } from '@/constants/cliAnalytics'
import {
  ColumnType,
  TabularMetricType,
  type AnalyticsQueryParams,
  type TabularResponse,
} from '@/types/analytics'
import type { ExtendedSessionsTarget, RepositoryRow } from '@/types/cliAnalytics'

import ExtendedSessionsModal from './ExtendedSessionsModal'
import RepositoriesTable from './RepositoriesTable'
import { aggregateCostOverride } from './SessionCostValue'
import AnalyticsWidget from '../../AnalyticsWidget'
import { TopNFilter, TOP_N_OPTIONS, toTopN, type TopN } from '../../utils/topNFilter'
import BarChartWidget from '../../widgets/BarChartWidget'
import DonutChartWidget from '../../widgets/DonutChartWidget'
import MetricCard from '../../widgets/MetricCard'
import { buildRepoMetrics } from '../format'
import { useCliAnalyticsApiSpend } from '../hooks/useCliAnalyticsApiSpend'
import { useCliAnalyticsOverview } from '../hooks/useCliAnalyticsOverview'
import { useCliAnalyticsRepositories } from '../hooks/useCliAnalyticsRepositories'
import { buildOverviewSummaryGroups, type OverviewMetricGroup } from '../overviewMetrics'

interface OverviewViewProps {
  filters: AnalyticsQueryParams
  repositories?: string[]
}

const OverviewView: FC<OverviewViewProps> = ({ filters, repositories }) => {
  const [modelsTopN, setModelsTopN] = useState<TopN>(TopNFilter.TEN)
  const [selectedTarget, setSelectedTarget] = useState<ExtendedSessionsTarget | null>(null)
  const clearSelectionRef = useRef<(() => void) | null>(null)

  const handleRepoClick = useCallback(
    (row: RepositoryRow) => {
      setSelectedTarget({
        title: row.repository ?? UNATTRIBUTED_LABEL,
        metrics: buildRepoMetrics(row),
        costPricing: row,
        sessionFilters: {
          ...filters,
          ...(row.repository != null ? { repository: row.repository } : {}),
        },
        repositories: row.repository != null ? [row.repository] : undefined,
        isUnattributed: row.repository === null,
      })
    },
    [filters]
  )

  const closeRepoModal = useCallback(() => {
    setSelectedTarget(null)
    clearSelectionRef.current?.()
  }, [])

  const { kpis, dailyBuckets, modelBreakdown, personalBilledCost, costState, loading, error } =
    useCliAnalyticsOverview(filters, repositories)

  const {
    rows: repoRows,
    loading: repoLoading,
    error: repoError,
    search: repoSearch,
    setSearch: setRepoSearch,
  } = useCliAnalyticsRepositories(filters, repositories, false, 10)

  const { apiSpend, loading: apiSpendLoading } = useCliAnalyticsApiSpend(filters, repositories)
  // The cards mix the two answers, so they wait for all of them rather than show figures of two periods.
  const summaryLoading = loading || apiSpendLoading

  const summaryGroups: OverviewMetricGroup[] = useMemo(
    () => (kpis ? buildOverviewSummaryGroups(kpis, apiSpend, personalBilledCost) : []),
    [kpis, apiSpend, personalBilledCost]
  )

  const activityTimelineData: TabularResponse = useMemo(
    () => ({
      data: {
        columns: [
          { id: 'day', label: 'Day', type: ColumnType.STRING },
          { id: 'net_lines', label: 'Net lines', type: ColumnType.INTEGER },
        ],
        rows: dailyBuckets.map(({ day, net_lines }) => ({ day, net_lines })),
      },
      metadata: { timestamp: '', data_as_of: '' },
      pagination: {
        page: 0,
        per_page: dailyBuckets.length,
        total_count: dailyBuckets.length,
        has_more: false,
      },
    }),
    [dailyBuckets]
  )

  const modelBreakdownData: TabularResponse = useMemo(() => {
    const rows =
      modelsTopN === TopNFilter.ALL ? modelBreakdown : modelBreakdown.slice(0, modelsTopN as number)

    return {
      data: {
        columns: [
          { id: 'model_name', label: 'Model', type: ColumnType.STRING },
          { id: 'session_count', label: 'Sessions', type: ColumnType.INTEGER },
        ],
        rows: rows.map(({ model_name, session_count }) => ({
          model_name,
          session_count,
        })),
      },
      metadata: { timestamp: '', data_as_of: '' },
      pagination: {
        page: 0,
        per_page: rows.length,
        total_count: rows.length,
        has_more: false,
      },
    }
  }, [modelBreakdown, modelsTopN])

  const errorDetails = error ? { message: error } : null

  return (
    <>
      <div className="flex flex-col gap-6">
        <AnalyticsWidget
          title="Summary"
          expandable={false}
          loading={summaryLoading}
          error={errorDetails}
        >
          <div className="flex flex-col gap-4">
            {summaryGroups.map((group) => (
              <div
                key={group.id}
                data-testid={`summary-group-${group.id}`}
                className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 max-sm:gap-2"
              >
                {group.metrics.map((metric) => (
                  <MetricCard
                    key={metric.id}
                    metric={metric}
                    valueOverride={
                      metric.id === 'total_cost_usd'
                        ? aggregateCostOverride(
                            kpis?.total_cost_usd,
                            costState,
                            'Missing prices can also affect Subscription Usage and Bloat %.'
                          )
                        : undefined
                    }
                  />
                ))}
              </div>
            ))}
          </div>
        </AnalyticsWidget>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BarChartWidget
            title="Net Lines Over Time"
            description="Lines added minus removed, per day."
            labelField="day"
            valueField="net_lines"
            yAxisLabel="net_lines"
            yAxisInteger
            dataOverride={activityTimelineData}
          />
          <DonutChartWidget
            metricType={TabularMetricType.CLI_LLMS}
            title="Sessions by Model"
            description="CLI sessions per model."
            valueField="session_count"
            labelField="model_name"
            dataOverride={modelBreakdownData}
            emptyStateLabel="No session data available"
            actions={
              <Select
                value={String(modelsTopN)}
                onChange={(e) => setModelsTopN(toTopN(e.value))}
                options={TOP_N_OPTIONS}
                className="!h-8"
              />
            }
          />
        </div>

        <RepositoriesTable
          rows={repoRows}
          loading={repoLoading}
          error={repoError}
          onRowClick={handleRepoClick}
          clearSelectionRef={clearSelectionRef}
          search={repoSearch}
          onSearchChange={setRepoSearch}
        />
      </div>
      {selectedTarget && (
        <ExtendedSessionsModal target={selectedTarget} isVisible onHide={closeRepoModal} />
      )}
    </>
  )
}

export default OverviewView
