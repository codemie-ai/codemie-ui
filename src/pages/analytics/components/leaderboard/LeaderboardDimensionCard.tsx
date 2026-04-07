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

import { FC, useState } from 'react'

import type { LeaderboardDimension } from '@/types/analytics'

import { DIMENSION_CONFIG, ICON_MAP } from './constants'

interface LeaderboardDimensionCardProps {
  dim: LeaderboardDimension
}

const LeaderboardDimensionCard: FC<LeaderboardDimensionCardProps> = ({ dim }) => {
  const [open, setOpen] = useState(false)
  const [showCalc, setShowCalc] = useState(false)
  const config = DIMENSION_CONFIG[dim.id]
  const color = dim.color ?? config?.color ?? '#6b7280'
  const rawIcon = dim.icon ?? config?.icon ?? ''
  const icon = ICON_MAP[rawIcon] ?? rawIcon
  const scorePercent = (dim.score ?? 0) * 100

  return (
    <div className="overflow-hidden rounded-lg border border-border-specific-panel-outline">
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-base-tertiary/50"
        style={{ borderLeft: `4px solid ${color}` }}
        onClick={() => setOpen(!open)}
      >
        <span className="text-base">{icon}</span>
        <span className="flex-1 text-sm font-semibold text-text-primary">
          {dim.label ?? dim.name ?? config?.name}
        </span>
        <div className="h-2 w-32 overflow-hidden rounded-full bg-surface-base-tertiary">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(scorePercent, 100)}%`, backgroundColor: color }}
          />
        </div>
        <span className="w-12 text-right text-sm font-bold tabular-nums" style={{ color }}>
          {scorePercent.toFixed(1)}
        </span>
        <span
          className="text-xs text-text-quaternary transition-transform"
          style={{ transform: open ? 'rotate(90deg)' : undefined }}
        >
          {'\u25B6'}
        </span>
      </button>

      {open && (
        <div className="border-t border-border-specific-panel-outline bg-surface-elevated px-4 py-3">
          {dim.rationale && (
            <p className="mb-3 text-xs italic leading-relaxed text-text-quaternary">
              {dim.rationale}
            </p>
          )}

          {(dim.description ?? config?.description) && (
            <p className="mb-3 text-xs leading-relaxed text-text-quaternary">
              {dim.description ?? config?.description}
            </p>
          )}

          {Array.isArray(dim.components) && dim.components.length > 0 && (
            <div className="flex flex-col gap-3">
              {dim.components.map((component) => (
                <div
                  key={component.key}
                  className="border-t border-border-structural/30 pt-3 first:border-t-0 first:pt-0"
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-text-primary">
                      {component.label}
                    </span>
                    <span className="text-[11px] text-text-quaternary">
                      {Math.round((component.weight ?? 0) * 100)}%
                      {component.display_value ? ` \u00B7 ${component.display_value}` : ''}
                    </span>
                  </div>
                  <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-surface-base-tertiary">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min((component.normalized ?? 0) * 100, 100)}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                  {component.what && (
                    <p className="mt-1 text-[11px] leading-relaxed text-text-quaternary">
                      {component.what}
                    </p>
                  )}
                  {component.calc && showCalc && (
                    <p className="mt-0.5 text-[11px] leading-relaxed text-text-quaternary/70">
                      <span className="font-semibold text-text-quaternary">
                        How it is calculated:{' '}
                      </span>
                      {component.calc}
                    </p>
                  )}
                  {component.evidence && showCalc && (
                    <p className="mt-0.5 text-[11px] leading-relaxed text-text-quaternary/70">
                      <span className="font-semibold text-text-quaternary">
                        Metric evidence used:{' '}
                      </span>
                      {component.evidence}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {dim.components?.some((component) => component.calc || component.evidence) && (
            <button
              type="button"
              className="mt-3 text-[11px] font-semibold text-border-interactive hover:underline"
              onClick={() => setShowCalc(!showCalc)}
            >
              {showCalc ? 'Hide calculation details' : 'How is this calculated?'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default LeaderboardDimensionCard
