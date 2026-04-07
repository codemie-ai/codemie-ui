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

import { TIER_CONFIG, TierName, DIMENSION_CONFIG, INTENT_CONFIG, IntentId } from './constants'

export const getTierConfig = (tierName?: string | null) => {
  if (!tierName) return TIER_CONFIG.newcomer
  const key = tierName.toLowerCase() as TierName
  return TIER_CONFIG[key] ?? TIER_CONFIG.newcomer
}

export const getDimensionConfig = (dimId: string) => {
  return (
    DIMENSION_CONFIG[dimId] ?? { label: dimId, name: dimId, color: '#6b7280', weight: 0, icon: '' }
  )
}

export const getIntentConfig = (intentId: string) => {
  const key = intentId as IntentId
  return INTENT_CONFIG[key] ?? INTENT_CONFIG.explorer
}

interface TierBadgeProps {
  tierName: string
}

export const TierBadge: FC<TierBadgeProps> = ({ tierName }) => {
  const tier = getTierConfig(tierName)
  return (
    <span
      className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ backgroundColor: `${tier.color}20`, color: tier.color }}
    >
      {tier.label}
    </span>
  )
}

interface IntentBadgeProps {
  intentId: string
}

export const IntentBadge: FC<IntentBadgeProps> = ({ intentId }) => {
  const intent = getIntentConfig(intentId)
  return (
    <span
      className="inline-flex rounded-[10px] px-2.5 py-1 text-[0.71rem] font-semibold tracking-wide"
      style={{ backgroundColor: `${intent.color}22`, color: intent.color }}
    >
      {intent.emoji} {intent.label}
    </span>
  )
}

interface ScorePillProps {
  score: number
  tierName: string
}

export const ScorePill: FC<ScorePillProps> = ({ score, tierName }) => {
  const tier = getTierConfig(tierName)
  return (
    <span
      className="inline-flex rounded-md px-2.5 py-1 text-sm font-bold tabular-nums"
      style={{ backgroundColor: `${tier.color}20`, color: tier.color }}
    >
      {score.toFixed(1)}
    </span>
  )
}

interface DimensionBarProps {
  label: string
  score: number
  color: string
}

export const DimensionBar: FC<DimensionBarProps> = ({ label, score, color }) => (
  <div className="flex items-center gap-2 text-xs">
    <span className="w-28 shrink-0 truncate text-text-quaternary">{label}</span>
    <div className="flex-1 h-1.5 rounded-full bg-surface-base-tertiary overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.min(score, 100)}%`, backgroundColor: color }}
      />
    </div>
    <span className="w-8 text-right font-semibold tabular-nums">{score.toFixed(0)}</span>
  </div>
)

export const renderTierBadgeCell = (item: Record<string, unknown>) => {
  const tierName = typeof item.tier_name === 'string' ? item.tier_name : 'newcomer'
  return <TierBadge tierName={tierName} />
}

export const renderScoreCell = (item: Record<string, unknown>) => {
  const score = typeof item.total_score === 'number' ? item.total_score : 0
  const tierName = typeof item.tier_name === 'string' ? item.tier_name : 'newcomer'
  return <ScorePill score={score} tierName={tierName} />
}

export const renderIntentBadgeCell = (item: Record<string, unknown>) => {
  const intentId = typeof item.usage_intent === 'string' ? item.usage_intent : 'explorer'
  return <IntentBadge intentId={intentId} />
}
