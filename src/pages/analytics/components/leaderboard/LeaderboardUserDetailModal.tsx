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

import {
  Chart as ChartJS,
  Filler,
  LineElement,
  PointElement,
  RadialLinearScale,
  Tooltip,
} from 'chart.js'
import { FC, useEffect, useMemo, useState } from 'react'
import { Radar } from 'react-chartjs-2'

import Popup from '@/components/Popup'
import Spinner from '@/components/Spinner'
import { analyticsStore } from '@/store/analytics'
import type {
  LeaderboardDimension,
  LeaderboardUserDetailQueryParams,
  LeaderboardUserDetailResponse,
} from '@/types/analytics'
import { getTailwindColor } from '@/utils/tailwindColors'

import { DIMENSION_CONFIG } from './constants'
import { getTierConfig, IntentBadge, TierBadge } from './helpers'
import LeaderboardDimensionCard from './LeaderboardDimensionCard'
import LeaderboardSummaryMetrics from './LeaderboardSummaryMetrics'

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip)

interface Props {
  userId: string | null
  snapshotId?: string
  extraParams?: LeaderboardUserDetailQueryParams
  onHide: () => void
}

const LeaderboardUserDetailModal: FC<Props> = ({ userId, snapshotId, extraParams, onHide }) => {
  const [data, setData] = useState<LeaderboardUserDetailResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isCurrentRequest = true

    if (!userId) {
      setData(null)
      setLoading(false)
      setError(null)
    } else {
      const params: LeaderboardUserDetailQueryParams = { ...extraParams }

      if (snapshotId) {
        params.snapshot_id = snapshotId
      }

      setLoading(true)
      setError(null)

      analyticsStore
        .fetchLeaderboardUserDetail(userId, params)
        .then((result) => {
          if (!isCurrentRequest) {
            return
          }

          if (!result) {
            setError('Failed to load user details.')
            setData(null)
            return
          }

          setData(result)
        })
        .catch(() => {
          if (isCurrentRequest) {
            setError('Failed to load user details.')
            setData(null)
          }
        })
        .finally(() => {
          if (isCurrentRequest) {
            setLoading(false)
          }
        })
    }

    return () => {
      isCurrentRequest = false
    }
  }, [extraParams, snapshotId, userId])

  const user = data?.data
  const tier = user?.tier ?? (user ? getTierConfig(user.tier_name) : null)
  const dimensions = user?.dimensions ?? []
  const projects = user?.projects ?? []

  const radarBorderColor = getTailwindColor(
    '--colors-surface-specific-charts-blue',
    DIMENSION_CONFIG.d1.color
  )
  const radarFillColor = getTailwindColor(
    '--colors-surface-specific-charts-blue',
    DIMENSION_CONFIG.d1.color,
    0.15
  )

  const radarData = useMemo(() => {
    if (!user || dimensions.length === 0) {
      return null
    }

    return {
      labels: dimensions.map(
        (dimension) =>
          `${DIMENSION_CONFIG[dimension.id]?.label ?? dimension.label} (${(
            (dimension.score ?? 0) * 100
          ).toFixed(0)})`
      ),
      datasets: [
        {
          data: dimensions.map((dimension) => (dimension.score ?? 0) * 100),
          borderColor: radarBorderColor,
          backgroundColor: radarFillColor,
          pointBackgroundColor: dimensions.map(
            (dimension) => dimension.color ?? DIMENSION_CONFIG[dimension.id]?.color ?? '#6b7280'
          ),
          pointBorderColor: 'transparent',
          pointRadius: 5,
          borderWidth: 2,
        },
      ],
    }
  }, [dimensions, radarBorderColor, radarFillColor, user])

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: true,
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        angleLines: { color: getTailwindColor('--colors-border-structural', '#2a2a4a') },
        grid: { color: getTailwindColor('--colors-border-structural', '#2a2a4a') },
        pointLabels: {
          color: getTailwindColor('--colors-text-primary', '#e2e8f0'),
          font: { size: 11 },
        },
        ticks: {
          color: getTailwindColor('--colors-text-quaternary', '#94a3b8'),
          backdropColor: 'transparent',
        },
      },
    },
    plugins: {
      legend: { display: false },
      datalabels: { display: false },
    },
  } as const

  return (
    <Popup
      visible={!!userId}
      onHide={onHide}
      header="User Detail"
      hideFooter
      isFullWidth
      bodyClassName="max-h-[80vh] pb-6"
    >
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Spinner inline className="h-8 w-8" />
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center justify-center py-12">
          <p className="font-semibold text-failed-secondary">{error}</p>
        </div>
      )}

      {user && !loading && (
        <div className="flex flex-col gap-6">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-3">
              {user.tier ? (
                <span
                  className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
                  style={{ backgroundColor: `${user.tier.color}20`, color: user.tier.color }}
                >
                  {user.tier.label}
                </span>
              ) : (
                <TierBadge tierName={user.tier_name} />
              )}
              <h3 className="text-xl font-bold text-text-primary">
                {user.user_name ?? user.user_email ?? '-'}
              </h3>
              <div className="ml-auto flex items-center gap-4">
                <span className="text-sm text-text-quaternary">Rank #{user.rank ?? '-'}</span>
                <span
                  className="rounded-lg px-3 py-1 text-2xl font-extrabold tabular-nums"
                  style={{ backgroundColor: `${tier?.color}20`, color: tier?.color }}
                >
                  {(user.total_score ?? 0).toFixed(1)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-text-quaternary">{user.user_email}</span>
              {user.intent ? (
                <span
                  className="inline-flex rounded-[10px] px-2.5 py-1 text-[0.71rem] font-semibold tracking-wide"
                  style={{ backgroundColor: `${user.intent.color}22`, color: user.intent.color }}
                >
                  {user.intent.emoji} {user.intent.label}
                </span>
              ) : (
                user.usage_intent && <IntentBadge intentId={user.usage_intent} />
              )}
            </div>

            {user.intent?.description && (
              <p className="mt-2 text-xs leading-relaxed text-text-quaternary">
                {user.intent.description}
              </p>
            )}
          </div>

          {projects.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {projects.map((project) => (
                <span
                  key={project}
                  className="rounded-md bg-surface-base-tertiary px-2.5 py-1 text-xs text-text-secondary"
                >
                  {project}
                </span>
              ))}
            </div>
          )}

          {radarData && (
            <div className="mx-auto w-full max-w-md">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-quaternary">
                Dimension Scores
              </h4>
              <Radar data={radarData} options={radarOptions} />
            </div>
          )}

          {dimensions.length > 0 && (
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-quaternary">
                Score Breakdown & Evidence
              </h4>
              <div className="flex flex-col gap-2.5">
                {dimensions.map((dimension: LeaderboardDimension) => (
                  <LeaderboardDimensionCard key={dimension.id} dim={dimension} />
                ))}
              </div>
            </div>
          )}

          <LeaderboardSummaryMetrics summaryMetrics={user.summary_metrics} />
        </div>
      )}
    </Popup>
  )
}

export default LeaderboardUserDetailModal
