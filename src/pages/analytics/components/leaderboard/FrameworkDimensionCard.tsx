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

import type { LeaderboardFrameworkDimension } from '@/types/analytics'

import { resolveFrameworkDimensionIcon } from './helpers'

interface FrameworkDimensionCardProps {
  dimension: LeaderboardFrameworkDimension
  onClick: () => void
}

const FrameworkDimensionCard: FC<FrameworkDimensionCardProps> = ({ dimension, onClick }) => {
  const componentEntries = Object.entries(dimension.components)

  return (
    <button
      type="button"
      className="flex flex-col rounded-xl border border-border-specific-panel-outline bg-surface-elevated p-5 text-left transition-all hover:border-border-interactive hover:-translate-y-0.5 hover:shadow-lg cursor-pointer"
      onClick={onClick}
    >
      <div
        className="mb-3 rounded-full px-2.5 py-0.5 text-xs font-semibold w-fit"
        style={{ backgroundColor: `${dimension.color}30`, color: dimension.color }}
      >
        {dimension.label} &middot; {Math.round(dimension.weight * 100)}%
      </div>

      <h3 className="text-sm font-bold text-text-primary mb-1.5">
        {resolveFrameworkDimensionIcon(dimension)} {dimension.name}
      </h3>

      <p className="text-xs text-text-quaternary leading-relaxed mb-3 flex-1">
        {dimension.description}
      </p>

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

export default FrameworkDimensionCard
