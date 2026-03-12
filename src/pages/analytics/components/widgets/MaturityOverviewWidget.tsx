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

import React, { FC, useEffect, useCallback, useState } from 'react'
import { useSnapshot } from 'valtio'

import StatusFailedIcon from '@/assets/icons/status-failed.svg?react'
import StatusSuccessIcon from '@/assets/icons/status-success.svg?react'
import StatusWarningIcon from '@/assets/icons/status-warning.svg?react'
import { analyticsStore } from '@/store/analytics'
import type { AnalyticsQueryParams, SummariesResponse } from '@/types/analytics'

import AnalyticsWidget from '../AnalyticsWidget'
import ScoreCard from './ScoreCard'

interface MaturityOverviewWidgetProps {
  filters?: AnalyticsQueryParams
  refreshTrigger?: number
}

type ScoreVariant = 'success' | 'warning' | 'critical' | 'neutral'

const getVariantForValue = (value: string | number | boolean): ScoreVariant => {
  // Check if it's a maturity level string
  const strValue = String(value).toUpperCase()
  if (strValue.includes('L3') || strValue.includes('AGENTIC')) {
    return 'success'
  }
  if (strValue.includes('L2') || strValue.includes('AUGMENTED')) {
    return 'warning'
  }
  if (strValue.includes('L1') || strValue.includes('ASSISTED')) {
    return 'critical'
  }

  // Try to parse as number
  let score: number | null = null
  if (typeof value === 'number') {
    score = value
  } else {
    const parsed = parseFloat(String(value))
    if (!Number.isNaN(parsed)) {
      score = parsed
    }
  }

  if (score === null) {
    return 'neutral'
  }

  // Apply thresholds: >= 67 success, >= 34 warning, < 34 critical
  if (score >= 67) return 'success'
  if (score >= 34) return 'warning'
  return 'critical'
}

const getIconForVariant = (variant: ScoreVariant): React.ReactElement => {
  switch (variant) {
    case 'success':
      return <StatusSuccessIcon className="w-5 h-5" />
    case 'warning':
      return <StatusWarningIcon className="w-5 h-5" />
    case 'critical':
      return <StatusFailedIcon className="w-5 h-5" />
    default:
      return <StatusWarningIcon className="w-5 h-5" />
  }
}

const MaturityOverviewWidget: FC<MaturityOverviewWidgetProps> = ({
  filters,
  refreshTrigger = 0,
}) => {
  const { loading, error, aiAdoptionConfig, loaded } = useSnapshot(analyticsStore)
  const [maturityData, setMaturityData] = useState<SummariesResponse | null>(null)

  const fetchData = useCallback(async () => {
    // Wait for config to load before making request (prevents duplicate calls)
    if (!loaded['ai-adoption-config']) return

    const result = await analyticsStore.fetchAiAdoptionMaturity({
      ...(filters?.projects && filters.projects.length > 0 && { projects: filters.projects }),
      config: aiAdoptionConfig?.data as any,
    })
    if (result) {
      setMaturityData(result)
    }
  }, [filters?.projects, loaded['ai-adoption-config']])

  useEffect(() => {
    fetchData().catch(console.error)
  }, [fetchData, refreshTrigger])

  const renderScoreCards = () => {
    if (!maturityData) return null

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {maturityData.data.metrics.map((metric) => {
          // Combine main metric with secondary metrics for ScoreCard
          const cardMetrics = metric.secondary_metrics
            ? [metric, ...metric.secondary_metrics]
            : [metric]

          const variant = getVariantForValue(metric.value)

          return (
            <ScoreCard
              key={metric.id}
              title={metric.label}
              data={{
                data: { metrics: cardMetrics },
                metadata: maturityData.metadata,
              }}
              mainScoreField={metric.id}
              icon={getIconForVariant(variant)}
              variant={variant}
              loading={false}
            />
          )
        })}
      </div>
    )
  }

  const renderLoadingState = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <ScoreCard key={`loading-${i}`} title="" data={null} mainScoreField="" loading={true} />
      ))}
    </div>
  )

  return (
    <AnalyticsWidget
      title="AI Maturity Overview"
      description="Comprehensive AI adoption metrics across all dimensions"
      loading={loading['ai-adoption-maturity']}
      error={error['ai-adoption-maturity']}
      expandable={false}
    >
      {loading['ai-adoption-maturity'] ? renderLoadingState() : renderScoreCards()}
    </AnalyticsWidget>
  )
}

export default MaturityOverviewWidget
