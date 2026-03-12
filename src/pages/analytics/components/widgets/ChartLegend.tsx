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

export interface ChartLegendItem {
  label: string
  value: number
  formattedValue: string
  color: string
}

interface ChartLegendProps {
  items: ChartLegendItem[]
}

/**
 * Reusable chart legend component
 * Displays legend items as a table with color indicators, labels, and values
 */
const ChartLegend: FC<ChartLegendProps> = ({ items }) => {
  return (
    <div className="flex-1 flex flex-col min-w-0 max-w-md overflow-hidden">
      <div className="overflow-y-auto max-h-[360px]">
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-2 text-xs overflow-hidden"
              title={`${item.label}: ${item.formattedValue}`}
            >
              {/* Color box */}
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              {/* Label - truncated */}
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="truncate text-text-primary">{item.label}</div>
              </div>
              {/* Value - always visible */}
              <div className="flex-shrink-0 font-medium text-text-primary whitespace-nowrap">
                {item.formattedValue}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ChartLegend
