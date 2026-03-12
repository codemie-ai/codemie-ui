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

import InfoSvg from '@/assets/icons/info.svg?react'
import Tooltip from '@/components/Tooltip/Tooltip'
import type { SummariesResponse } from '@/types/analytics'
import { formatMetricValue } from '@/utils/analyticsFormatters'
import { cn } from '@/utils/utils'

type ScoreVariant = 'success' | 'warning' | 'critical' | 'neutral'

interface ScoreCardProps {
  title: string
  data: SummariesResponse | null
  mainScoreField: string
  loading?: boolean
  icon?: ReactNode
  variant?: ScoreVariant
}

/**
 * Determines the variant (color) based on score thresholds
 * - Success (Green): Score >= 67 - Great performance
 * - Warning (Amber): Score 34-66 - Needs attention
 * - Critical (Red): Score < 34 - Poor performance
 */
const getVariantFromScore = (score: number): ScoreVariant => {
  if (score >= 67) return 'success'
  if (score >= 34) return 'warning'
  return 'critical'
}

/**
 * Returns Tailwind classes for icon colors based on variant
 */
const getVariantStyles = (variant: ScoreVariant) => {
  switch (variant) {
    case 'success':
      return {
        icon: 'text-success-primary',
      }
    case 'warning':
      return {
        icon: 'text-aborted-primary',
      }
    case 'critical':
      return {
        icon: 'text-text-error',
      }
    case 'neutral':
    default:
      return {
        icon: 'text-text-tertiary',
      }
  }
}

const ScoreCard: FC<ScoreCardProps> = ({
  title,
  data,
  mainScoreField,
  loading,
  icon,
  variant: explicitVariant,
}) => {
  if (loading) {
    return (
      <div className="bg-surface-elevated rounded-lg p-4 border border-border-specific-panel-outline animate-pulse">
        <div className="h-4 bg-border-specific-panel-outline rounded w-1/2 mb-4"></div>
        <div className="h-10 bg-border-specific-panel-outline rounded w-1/3 mb-4"></div>
        <div className="space-y-2">
          <div className="h-3 bg-border-specific-panel-outline rounded w-full"></div>
          <div className="h-3 bg-border-specific-panel-outline rounded w-full"></div>
          <div className="h-3 bg-border-specific-panel-outline rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-surface-elevated rounded-lg p-4 border border-border-specific-panel-outline">
        <p className="text-text-quaternary text-sm">No data available</p>
      </div>
    )
  }

  const { metrics } = data.data
  const mainMetric = metrics.find((m) => m.id === mainScoreField)

  // Filter secondary metrics: exclude dimension scores and high-level system metrics
  const secondaryMetrics = metrics.filter((m) => {
    // Exclude the main score itself
    if (m.id === mainScoreField) return false

    // Exclude other dimension scores
    const dimensionScores = [
      'user_engagement_score',
      'asset_reusability_score',
      'expertise_distribution_score',
      'feature_adoption_score',
    ]
    if (dimensionScores.includes(m.id)) return false

    // Exclude high-level aggregated metrics (adoption index and maturity level)
    if (m.id === 'adoption_index' || m.id === 'maturity_level') return false

    return true
  })

  const tooltipClass = `score-card-${mainScoreField}-tooltip`

  // Determine variant: use explicit prop or calculate from score
  let variant: ScoreVariant = explicitVariant || 'neutral'
  if (!explicitVariant && mainMetric) {
    // Try to parse score for auto-calculation
    if (typeof mainMetric.value === 'number') {
      variant = getVariantFromScore(mainMetric.value)
    } else {
      const parsed = parseFloat(String(mainMetric.value))
      if (!Number.isNaN(parsed)) {
        variant = getVariantFromScore(parsed)
      }
    }
  }

  const variantStyles = getVariantStyles(variant)

  return (
    <>
      <Tooltip target={`.${tooltipClass}`} />
      <div className="bg-surface-elevated rounded-lg p-4 border border-border-specific-panel-outline">
        {/* Header */}
        <div className="mb-4 flex items-center gap-2">
          {icon && <span className={cn('flex-shrink-0', variantStyles.icon)}>{icon}</span>}
          <p className="text-sm font-bold text-text-primary">{title}</p>
        </div>

        {/* Main Score */}
        {mainMetric && (
          <div
            className={cn(
              secondaryMetrics.length > 0
                ? 'mb-4 pb-4 border-b border-border-specific-panel-outline'
                : ''
            )}
          >
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold text-text-primary">
                {formatMetricValue(mainMetric.value, mainMetric.format)}
              </p>
              {mainMetric.description && (
                <span
                  className={cn('cursor-pointer ml-1', tooltipClass)}
                  data-pr-tooltip={mainMetric.description}
                  data-pr-position="right"
                >
                  <InfoSvg className="w-4 h-4 text-text-tertiary" />
                </span>
              )}
            </div>
          </div>
        )}

        {/* Secondary Metrics */}
        {secondaryMetrics.length > 0 && (
          <div className="space-y-2">
            {secondaryMetrics.map((metric) => (
              <div key={metric.id} className="flex justify-between items-baseline">
                <div className="flex items-center gap-1 pr-2">
                  <p className="text-xs text-text-primary truncate">{metric.label}</p>
                  {metric.description && (
                    <span
                      className={cn('cursor-pointer', tooltipClass)}
                      data-pr-tooltip={metric.description}
                      data-pr-position="top"
                    >
                      <InfoSvg className="w-3.5 h-3.5 text-text-tertiary" />
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-text-primary whitespace-nowrap">
                  {formatMetricValue(metric.value, metric.format)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export default ScoreCard
