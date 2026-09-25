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

import PremiumModelBadge from '@/components/PremiumModelBadge'
import { appInfoStore } from '@/store/appInfo'
import type { LLMRouterOption, RouterTiers } from '@/types/entity/configuration'

import { CHIP_CLASS, PROVIDER_LABELS } from '../constants'

const ROUTER_TYPE_LABELS: Record<string, string> = {
  switchyard: 'Switchyard',
  litellm_auto: 'LiteLLM',
}

const STRATEGY_LABELS: Record<string, string> = {
  signal: 'Signal routing',
  classifier: 'Classifier routing',
}

const TIER_ORDER: (keyof RouterTiers)[] = ['simple', 'medium', 'complex', 'reasoning']

const TIER_LABELS: Record<keyof RouterTiers, string> = {
  simple: 'Simple',
  medium: 'Medium',
  complex: 'Complex',
  reasoning: 'Reasoning',
}

interface RoutersSectionProps {
  routers: LLMRouterOption[]
}

const RoutersSection: FC<RoutersSectionProps> = ({ routers }) => {
  if (routers.length === 0) {
    return null
  }

  return (
    <div className="mb-8">
      <h2 className="text-h3 text-text-primary mb-1">Routers</h2>
      <p className="text-sm text-text-tertiary mb-4">
        Routers select between models automatically based on request complexity.
      </p>
      <div className="grid grid-cols-1 gap-4">
        {routers.map((router) => {
          const strategyLabel = router.strategy
            ? STRATEGY_LABELS[router.strategy] ?? router.strategy
            : null
          const classifierLabel = router.classifierModel
            ? appInfoStore.findLLMLabel(router.classifierModel)
            : null

          return (
            <div
              key={router.value}
              className="border border-border-structural rounded-lg p-4 bg-surface-base-secondary"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-text-primary font-medium">{router.label}</span>
                {router.isPremium && <PremiumModelBadge />}
                <span className="ml-auto text-xs text-text-tertiary">
                  {(router.provider && (PROVIDER_LABELS[router.provider] ?? router.provider)) ||
                    '—'}
                </span>
              </div>

              <div className="flex gap-1 flex-wrap mb-3">
                {router.routerType && (
                  <span className={CHIP_CLASS}>
                    {ROUTER_TYPE_LABELS[router.routerType] ?? router.routerType}
                  </span>
                )}
                {strategyLabel && (
                  <span className={CHIP_CLASS}>
                    {strategyLabel}
                    {classifierLabel ? ` → ${classifierLabel}` : ''}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {TIER_ORDER.map((tier) => {
                  const tierModel = router.tiers?.[tier]
                  if (!tierModel) return null
                  const tierLabel = tierModel.label || appInfoStore.findLLMLabel(tierModel.model)

                  return (
                    <div key={tier}>
                      <div className="text-xs text-text-quaternary uppercase mb-1">
                        {TIER_LABELS[tier]}
                      </div>
                      <div className="text-sm text-text-primary">{tierLabel}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default RoutersSection
