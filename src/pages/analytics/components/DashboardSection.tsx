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

import { FC, useMemo } from 'react'

import {
  AnalyticsQueryParams,
  AnalyticsSectionItem,
  AnalyticsWidgetItem,
  WidgetSize,
} from '@/types/analytics'

import DynamicWidget from './widgets/DynamicWidget'

interface DashboardSectionProps {
  filters: AnalyticsQueryParams
  section: AnalyticsSectionItem
}

const DashboardSection: FC<DashboardSectionProps> = ({ filters, section }) => {
  const widgetGroups = useMemo(() => {
    const groups: AnalyticsWidgetItem[][] = []
    let currentGroup: AnalyticsWidgetItem[] = []

    section.widgets.forEach((widget) => {
      const { size } = widget

      if (size === WidgetSize.FULL) {
        if (currentGroup.length > 0) {
          groups.push([...currentGroup])
          currentGroup = []
        }

        groups.push([widget])
      } else {
        currentGroup.push(widget)

        if (currentGroup.length === 2) {
          groups.push([...currentGroup])
          currentGroup = []
        }
      }
    })

    if (currentGroup.length > 0) {
      groups.push(currentGroup)
    }

    return groups
  }, [section])

  if (!widgetGroups.length) return null

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4 text-text-primary">{section.name}</h2>
      <div className="flex flex-col gap-6">
        {widgetGroups.map((group, groupIndex) => {
          const isFullWidth = group.length === 1 && group[0].size === WidgetSize.FULL
          const gridClasses = isFullWidth
            ? 'grid grid-cols-1 gap-6'
            : 'grid grid-cols-1 lg:grid-cols-2 gap-6'

          return (
            <div key={`group-${groupIndex}`} className={gridClasses}>
              {group.map((widget) => (
                <DynamicWidget key={widget.id} widget={widget} filters={filters} />
              ))}
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default DashboardSection
