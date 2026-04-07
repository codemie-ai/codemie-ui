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

import { FC, useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'

import { analyticsStore } from '@/store/analytics'
import type { AnalyticsPaginatedRequestParams } from '@/types/analytics'
import { TabularMetricType, TabularResponse } from '@/types/analytics'

import AnalyticsWidget from '../AnalyticsWidget'
import { MEDAL_ICONS, DIMENSION_CONFIG } from './constants'
import { getTierConfig, DimensionBar } from './helpers'

interface LeaderboardTopPerformersProps {
  snapshotId?: string
  extraParams?: AnalyticsPaginatedRequestParams
}

interface PerformerDimension {
  id?: string
  dimension_id?: string
  score?: number
}

const parseDimensions = (rawDimensions: unknown): PerformerDimension[] => {
  if (typeof rawDimensions === 'string') {
    try {
      const parsed = JSON.parse(rawDimensions) as unknown
      return Array.isArray(parsed) ? (parsed as PerformerDimension[]) : []
    } catch {
      return []
    }
  }

  return Array.isArray(rawDimensions) ? (rawDimensions as PerformerDimension[]) : []
}

const LeaderboardTopPerformers: FC<LeaderboardTopPerformersProps> = ({
  snapshotId,
  extraParams,
}) => {
  const { loading, error } = useSnapshot(analyticsStore)
  const [data, setData] = useState<TabularResponse | null>(null)
  const metricKey = TabularMetricType.LEADERBOARD_TOP_PERFORMERS

  useEffect(() => {
    const fetchData = async () => {
      const params: AnalyticsPaginatedRequestParams = { per_page: 3, ...extraParams }
      if (snapshotId) params.snapshot_id = snapshotId
      const result = await analyticsStore.fetchTabularData(metricKey, params)
      if (result) setData(result)
    }
    fetchData().catch(console.error)
  }, [snapshotId, extraParams])

  const performers = data?.data.rows ?? []

  return (
    <AnalyticsWidget
      title="Top Performers"
      description="Highest-scoring users across all dimensions."
      loading={loading[metricKey]}
      error={error[metricKey]}
      expandable={false}
    >
      {performers.length === 0 ? (
        <div className="flex justify-center items-center py-12 text-text-quaternary">
          No performers data available
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {performers.map((performer, index) => {
            const tierName =
              typeof performer.tier_name === 'string' ? performer.tier_name : 'newcomer'
            const tier = getTierConfig(tierName)
            const score = typeof performer.total_score === 'number' ? performer.total_score : 0
            const userName =
              typeof performer.user_name === 'string' ? performer.user_name : 'Unknown'
            const dimensions = parseDimensions(performer.dimensions)

            return (
              <div
                key={String(performer.user_id ?? index)}
                className="rounded-lg border border-border-specific-panel-outline bg-surface-elevated p-4"
                style={{ borderTopColor: tier.color, borderTopWidth: 3 }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{MEDAL_ICONS[index] ?? `#${index + 1}`}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text-primary truncate">{userName}</p>
                  </div>
                  <span
                    className="text-xl font-extrabold tabular-nums rounded-lg px-3 py-1"
                    style={{ backgroundColor: `${tier.color}20`, color: tier.color }}
                  >
                    {score.toFixed(1)}
                  </span>
                </div>

                <span
                  className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold mb-3"
                  style={{ backgroundColor: `${tier.color}20`, color: tier.color }}
                >
                  {tier.label}
                </span>

                <div className="flex flex-col gap-1.5">
                  {dimensions.map((dim) => {
                    const dimId = dim.id ?? dim.dimension_id
                    if (!dimId) return null
                    const config = DIMENSION_CONFIG[dimId]
                    if (!config) return null
                    const dimScore = typeof dim.score === 'number' ? dim.score : 0
                    return (
                      <DimensionBar
                        key={dimId}
                        label={`${config.label} · ${config.name}`}
                        score={dimScore * 100}
                        color={config.color}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </AnalyticsWidget>
  )
}

export default LeaderboardTopPerformers
