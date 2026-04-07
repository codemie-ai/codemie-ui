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

import { FC, useCallback, useEffect, useState } from 'react'

import Popup from '@/components/Popup'
import Spinner from '@/components/Spinner'
import { analyticsStore } from '@/store/analytics'
import type {
  LeaderboardFrameworkResponse,
  LeaderboardFrameworkDimension,
  LeaderboardFrameworkComponent,
} from '@/types/analytics'

import { DIMENSION_CONFIG, ICON_MAP } from './constants'

const resolveIcon = (dim: LeaderboardFrameworkDimension): string =>
  ICON_MAP[dim.icon] ?? DIMENSION_CONFIG[dim.id]?.icon ?? ''

// ---------------------------------------------------------------------------
// Dimension Detail Modal
// ---------------------------------------------------------------------------

interface DimensionDetailModalProps {
  dimension: LeaderboardFrameworkDimension | null
  onHide: () => void
}

const DimensionDetailModal: FC<DimensionDetailModalProps> = ({ dimension, onHide }) => {
  if (!dimension) return null

  const components = Object.entries(dimension.components)
  const totalWeight = components.reduce((sum, [, c]) => sum + c.weight, 0)

  return (
    <Popup
      visible={!!dimension}
      onHide={onHide}
      header={`${dimension.label} \u00B7 ${dimension.name}`}
      hideFooter
      isFullWidth
      bodyClassName="max-h-[80vh] pb-6"
    >
      <div className="flex flex-col gap-5">
        {/* Description */}
        <p className="text-sm text-text-secondary leading-relaxed">{dimension.description}</p>

        {/* Meta chips */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-base-tertiary px-3 py-1 text-xs font-medium text-text-secondary">
            {resolveIcon(dimension)} Dimension weight: {Math.round(dimension.weight * 100)}%
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-base-tertiary px-3 py-1 text-xs font-medium text-text-secondary">
            {components.length} scored subdimension{components.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Subdimensions */}
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-quaternary">
            Subdimensions And Calculation Logic
          </h4>
          <div className="flex flex-col gap-3">
            {components.map(([key, comp]: [string, LeaderboardFrameworkComponent]) => {
              const weightPercent =
                totalWeight > 0 ? Math.round((comp.weight / totalWeight) * 100) : 0

              return (
                <div
                  key={key}
                  className="rounded-lg border border-border-specific-panel-outline bg-surface-elevated p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-semibold text-text-primary">{comp.label}</h5>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                      style={{
                        backgroundColor: `${dimension.color}20`,
                        color: dimension.color,
                      }}
                    >
                      Weight inside {dimension.label}: {weightPercent}%
                    </span>
                  </div>

                  {comp.what && (
                    <p className="text-xs text-text-secondary leading-relaxed mb-1.5">
                      <span className="font-semibold text-text-primary">What it means: </span>
                      {comp.what}
                    </p>
                  )}

                  {comp.calc && (
                    <p className="text-xs text-text-secondary leading-relaxed">
                      <span className="font-semibold text-text-primary">
                        How it is calculated:{' '}
                      </span>
                      {comp.calc}
                    </p>
                  )}

                  {comp.evidence && (
                    <p className="text-xs text-text-secondary leading-relaxed">
                      <span className="font-semibold text-text-primary">
                        Metric evidence used:{' '}
                      </span>
                      {comp.evidence}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Popup>
  )
}

// ---------------------------------------------------------------------------
// Dimension Card
// ---------------------------------------------------------------------------

interface DimensionCardProps {
  dimension: LeaderboardFrameworkDimension
  onClick: () => void
}

const FrameworkDimensionCard: FC<DimensionCardProps> = ({ dimension, onClick }) => {
  const componentEntries = Object.entries(dimension.components)

  return (
    <button
      type="button"
      className="flex flex-col rounded-xl border border-border-specific-panel-outline bg-surface-elevated p-5 text-left transition-all hover:border-border-interactive hover:-translate-y-0.5 hover:shadow-lg cursor-pointer"
      onClick={onClick}
    >
      {/* Color badge */}
      <div
        className="mb-3 rounded-full px-2.5 py-0.5 text-xs font-semibold w-fit"
        style={{ backgroundColor: `${dimension.color}30`, color: dimension.color }}
      >
        {dimension.label} &middot; {Math.round(dimension.weight * 100)}%
      </div>

      {/* Title */}
      <h3 className="text-sm font-bold text-text-primary mb-1.5">
        {resolveIcon(dimension)} {dimension.name}
      </h3>

      {/* Description */}
      <p className="text-xs text-text-quaternary leading-relaxed mb-3 flex-1">
        {dimension.description}
      </p>

      {/* Component chips */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-text-quaternary mb-2">
          Scored Components
        </p>
        <div className="flex flex-wrap gap-1.5">
          {componentEntries.map(([key, comp]) => (
            <span
              key={key}
              className="rounded-full px-2.5 py-0.5 text-[11px] font-medium border"
              style={{
                borderColor: `${dimension.color}30`,
                backgroundColor: `${dimension.color}10`,
                color: dimension.color,
              }}
            >
              {comp.label}
            </span>
          ))}
        </div>
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const LeaderboardFrameworkDimensions: FC = () => {
  const [framework, setFramework] = useState<LeaderboardFrameworkResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDimension, setSelectedDimension] = useState<LeaderboardFrameworkDimension | null>(
    null
  )

  const fetchFramework = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await analyticsStore.fetchLeaderboardFramework()
      setFramework(result)
      if (!result) setError('Failed to load framework data.')
    } catch (err) {
      console.error('Failed to fetch leaderboard framework:', err)
      setError('Failed to load framework data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFramework().catch(console.error)
  }, [fetchFramework])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner inline className="h-6 w-6" />
      </div>
    )
  }

  if (error) {
    return <p className="text-xs text-text-quaternary italic py-4">{error}</p>
  }

  const dimensions = framework?.data?.dimensions
  if (!dimensions) return null

  const dimensionList = Object.values(dimensions).sort((a, b) => {
    const aNum = parseInt(a.id.replace('d', ''), 10)
    const bNum = parseInt(b.id.replace('d', ''), 10)
    return aNum - bNum
  })

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {dimensionList.map((dim) => (
          <FrameworkDimensionCard
            key={dim.id}
            dimension={dim}
            onClick={() => setSelectedDimension(dim)}
          />
        ))}
      </div>

      <DimensionDetailModal
        dimension={selectedDimension}
        onHide={() => setSelectedDimension(null)}
      />
    </>
  )
}

export default LeaderboardFrameworkDimensions
