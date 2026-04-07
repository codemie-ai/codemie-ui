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

import { FC, useCallback, useMemo, useState } from 'react'

import type {
  AnalyticsPaginatedRequestParams,
  LeaderboardEntriesParams,
  LeaderboardView,
} from '@/types/analytics'
import { OverviewMetricType, TabularMetricType } from '@/types/analytics'
import type { SortState } from '@/types/table'

import { DIMENSION_CONFIG, DIMENSION_TOOLTIPS, TIER_CONFIG, TierName } from './constants'
import { renderIntentBadgeCell, renderScoreCell, renderTierBadgeCell } from './helpers'
import LeaderboardControls from './LeaderboardControls'
import LeaderboardFilters from './LeaderboardFilters'
import LeaderboardFrameworkDimensions from './LeaderboardFrameworkDimensions'
import LeaderboardTopPerformers from './LeaderboardTopPerformers'
import LeaderboardUserDetailModal from './LeaderboardUserDetailModal'
import {
  COLUMN_LABELS,
  LEADERBOARD_COLUMN_ORDER,
  LEADERBOARD_TABLE_STYLES,
  SORTABLE_COLUMNS,
  SORT_API_TO_KEY,
  SORT_KEY_TO_API,
} from './tableConfig'
import { useLeaderboardSeasons } from './useLeaderboardSeasons'
import BarChartWidget from '../widgets/BarChartWidget'
import DonutChartWidget from '../widgets/DonutChartWidget'
import MetricsWidget from '../widgets/MetricsWidget'
import TableWidget from '../widgets/TableWidget'

const DEFAULT_FILTERS: LeaderboardEntriesParams = {
  sort_by: 'total_score',
  sort_order: 'desc',
}

const tierColorByLabel = (label: string): string => {
  const key = label.toLowerCase() as TierName
  return TIER_CONFIG[key]?.color ?? '#6b7280'
}

const dimensionColorByLabel = (label: string): string => {
  const entry = Object.values(DIMENSION_CONFIG).find(
    (dimension) => dimension.label === label || dimension.name === label
  )

  return entry?.color ?? '#6b7280'
}

const LeaderboardTab: FC = () => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [filters, setFilters] = useState<LeaderboardEntriesParams>(DEFAULT_FILTERS)
  const [view, setView] = useState<LeaderboardView>('current')

  const { seasonKey, seasons, seasonsLoading, setSeasonKey } = useLeaderboardSeasons(view)
  const isSeasonal = view !== 'current'

  const extraParams = useMemo<AnalyticsPaginatedRequestParams>(() => {
    const params: AnalyticsPaginatedRequestParams = { view }

    if (isSeasonal && seasonKey) {
      params.season_key = seasonKey
    }

    return params
  }, [isSeasonal, seasonKey, view])

  const tableFilters = useMemo<AnalyticsPaginatedRequestParams>(() => {
    const params: AnalyticsPaginatedRequestParams = { ...extraParams }

    if (filters.tier) params.tier = filters.tier
    if (filters.project) params.project = filters.project
    if (filters.search) params.search = filters.search
    if (filters.intent) params.intent = filters.intent
    if (filters.cli_only) params.cli_only = filters.cli_only
    if (filters.sort_by) params.sort_by = filters.sort_by
    if (filters.sort_order) params.sort_order = filters.sort_order

    return params
  }, [extraParams, filters])

  const tableKey = useMemo(
    () => JSON.stringify({ view, seasonKey, tableFilters }),
    [view, seasonKey, tableFilters]
  )

  const sortState: SortState = useMemo(
    () => ({
      sortKey: (filters.sort_by && SORT_API_TO_KEY[filters.sort_by]) ?? filters.sort_by,
      sortOrder: filters.sort_order,
    }),
    [filters.sort_by, filters.sort_order]
  )

  const handleViewChange = (nextView: LeaderboardView) => {
    if (nextView === view) {
      return
    }

    setView(nextView)
    setFilters((prev) => ({ ...prev, page: 0 }))
  }

  const handleSeasonChange = (nextSeasonKey: string) => {
    setSeasonKey(nextSeasonKey)
    setFilters((prev) => ({ ...prev, page: 0 }))
  }

  const handleFiltersChange = useCallback((patch: Partial<LeaderboardEntriesParams>) => {
    setFilters((prev) => ({ ...prev, ...patch, page: 0 }))
  }, [])

  const handleSort = useCallback((key: string) => {
    const apiKey = SORT_KEY_TO_API[key] ?? key

    setFilters((prev) => {
      const isSameKey = prev.sort_by === apiKey
      const nextSortOrder = isSameKey && prev.sort_order === 'desc' ? 'asc' : 'desc'

      return { ...prev, sort_by: apiKey, sort_order: nextSortOrder, page: 0 }
    })
  }, [])

  const handleRowClick = (row: Record<string, unknown>) => {
    if (typeof row.user_id === 'string') {
      setSelectedUserId(row.user_id)
      return
    }

    if (typeof row.user_email === 'string') {
      setSelectedUserId(row.user_email)
    }
  }

  const customRenderColumns = {
    user_name: (item: Record<string, unknown>) => (
      <button
        type="button"
        className="cursor-pointer font-bold hover:underline"
        onClick={() => handleRowClick(item)}
      >
        {typeof item.user_name === 'string' ? item.user_name : '-'}
      </button>
    ),
    tier_name: renderTierBadgeCell,
    total_score: renderScoreCell,
    usage_intent: renderIntentBadgeCell,
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <LeaderboardControls
        view={view}
        seasonKey={seasonKey}
        seasons={seasons}
        seasonsLoading={seasonsLoading}
        onViewChange={handleViewChange}
        onSeasonChange={handleSeasonChange}
      />

      <MetricsWidget
        type={OverviewMetricType.LEADERBOARD_SUMMARY}
        title="Leaderboard Overview"
        description="High-level summary of user scores and tier distribution."
        expandable={false}
        extraParams={extraParams}
        selectedMetrics={[
          'total_users',
          'avg_score',
          'top_score',
          'pioneer_count',
          'expert_count',
          'advanced_count',
          'practitioner_count',
          'newcomer_count',
        ]}
      />

      <section>
        <h2 className="mb-4 text-xl font-semibold text-text-primary">Distribution</h2>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <BarChartWidget
            title="Score Distribution"
            description="Number of users in each score range."
            metricType={TabularMetricType.LEADERBOARD_SCORES}
            labelField="range"
            valueField="count"
            yAxisLabel="count"
            yAxisInteger
            extraParams={extraParams}
          />
          <DonutChartWidget
            title="Tier Distribution"
            description="Users grouped by tier."
            metricType={TabularMetricType.LEADERBOARD_TIERS}
            labelField="tier_name"
            valueField="user_count"
            colorByLabel={tierColorByLabel}
            extraParams={extraParams}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-text-primary">Top Performers</h2>
        <LeaderboardTopPerformers extraParams={extraParams} />
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-text-primary">Dimension Averages</h2>
        <BarChartWidget
          title="Average Scores by Dimension"
          description="Average dimension scores across all users (0-100 scale)."
          metricType={TabularMetricType.LEADERBOARD_DIMENSIONS}
          labelField="dimension_label"
          valueField="avg_score"
          yAxisLabel="avg_score"
          colorByLabel={dimensionColorByLabel}
          extraParams={extraParams}
        />
      </section>

      <section>
        <TableWidget
          key={tableKey}
          metricType={TabularMetricType.LEADERBOARD_ENTRIES}
          title="Leaderboard"
          description="All ranked users with dimension scores."
          customRenderColumns={customRenderColumns}
          hiddenColumns={[
            'user_id',
            'user_email',
            'previous_rank',
            'rank_delta',
            'previous_score',
            'score_delta',
          ]}
          columnOrder={LEADERBOARD_COLUMN_ORDER}
          waitForAdoptionConfig={false}
          filters={tableFilters}
          actions={<LeaderboardFilters filters={filters} onChange={handleFiltersChange} />}
          sort={sortState}
          onSort={handleSort}
          sortableColumns={SORTABLE_COLUMNS}
          columnLabels={COLUMN_LABELS}
          columnTooltips={DIMENSION_TOOLTIPS}
          tableStyles={LEADERBOARD_TABLE_STYLES}
        />
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-text-primary">Leaderboard Dimensions</h2>
        <LeaderboardFrameworkDimensions />
      </section>

      <LeaderboardUserDetailModal
        userId={selectedUserId}
        extraParams={extraParams}
        onHide={() => setSelectedUserId(null)}
      />
    </div>
  )
}

export default LeaderboardTab
