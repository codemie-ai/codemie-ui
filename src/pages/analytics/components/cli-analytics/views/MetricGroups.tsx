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

import type { Metric } from '@/types/analytics'
import { cn } from '@/utils/utils'

import MetricCard from '../../widgets/MetricCard'

import type { FC, ReactNode } from 'react'

export interface MetricGroup {
  id: string
  title: string
  metrics: Metric[]
  /** Overrides the card's muted text style, e.g. to give long qualifiers more lines. */
  mutedTextClassName?: string
}

// Literal class names, so Tailwind keeps them: on a wide screen a group fills exactly one row.
const XL_COLUMNS: Record<number, string> = {
  1: 'xl:grid-cols-1',
  2: 'xl:grid-cols-2',
  3: 'xl:grid-cols-3',
  4: 'xl:grid-cols-4',
  5: 'xl:grid-cols-5',
  6: 'xl:grid-cols-6',
}

interface MetricGroupsProps {
  groups: MetricGroup[]
  /** Replaces a card's plain value, e.g. a cost marked as unknown or understated. */
  valueOverride?: (metric: Metric) => ReactNode
}

/** Labelled rows of metric cards: one row per group on a wide screen, wrapping on narrow ones. */
const MetricGroups: FC<MetricGroupsProps> = ({ groups, valueOverride }) => (
  <div className="flex flex-col gap-4">
    {groups.map((group) => (
      <section key={group.id} aria-label={group.title}>
        <h4 className="mb-2 text-sm font-semibold text-text-secondary">{group.title}</h4>
        <div
          className={cn(
            'grid grid-cols-2 md:grid-cols-3 gap-3 max-sm:gap-2',
            XL_COLUMNS[group.metrics.length] ?? 'xl:grid-cols-6'
          )}
        >
          {group.metrics.map((metric) => (
            <MetricCard
              key={metric.id}
              metric={metric}
              mutedTextClassName={group.mutedTextClassName}
              valueOverride={valueOverride?.(metric)}
            />
          ))}
        </div>
      </section>
    ))}
  </div>
)

export default MetricGroups
