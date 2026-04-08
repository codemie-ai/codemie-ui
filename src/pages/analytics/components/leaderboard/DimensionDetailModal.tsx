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

import Popup from '@/components/Popup'
import type {
  LeaderboardFrameworkDimension,
  LeaderboardFrameworkComponent,
} from '@/types/analytics'

import { resolveFrameworkDimensionIcon } from './helpers'

interface DimensionDetailModalProps {
  dimension: LeaderboardFrameworkDimension | null
  onHide: () => void
}

const DimensionDetailModal: FC<DimensionDetailModalProps> = ({ dimension, onHide }) => {
  const components = dimension ? Object.entries(dimension.components) : []
  const totalWeight = components.reduce((sum, [, c]) => sum + c.weight, 0)

  return (
    <Popup
      visible={!!dimension}
      onHide={onHide}
      header={dimension ? `${dimension.label} \u00B7 ${dimension.name}` : ''}
      hideFooter
      isFullWidth
      bodyClassName="max-h-[80vh] pb-6"
    >
      {dimension && (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-text-secondary leading-relaxed">{dimension.description}</p>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-base-tertiary px-3 py-1 text-xs font-medium text-text-secondary">
              {resolveFrameworkDimensionIcon(dimension)} Dimension weight:{' '}
              {Math.round(dimension.weight * 100)}%
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-base-tertiary px-3 py-1 text-xs font-medium text-text-secondary">
              {components.length} scored subdimension{components.length !== 1 ? 's' : ''}
            </span>
          </div>

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
      )}
    </Popup>
  )
}

export default DimensionDetailModal
