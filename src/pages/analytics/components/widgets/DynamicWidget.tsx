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

import type { AnalyticsQueryParams, AnalyticsWidgetItem } from '@/types/analytics'
import { WidgetType } from '@/types/analytics'

import BarChartWidget from './BarChartWidget'
import DonutChartWidget from './DonutChartWidget'
import DynamicOverviewWidget from './DynamicOverviewWidget'
import PieChartWidget from './PieChartWidget'
import RatioWidget from './RatioWidget'
import TableWidget from './TableWidget'

type DynamicWidgetProps = {
  expandable?: boolean
  filters: AnalyticsQueryParams
  widget: AnalyticsWidgetItem
}

const DynamicWidget: FC<DynamicWidgetProps> = ({ expandable, filters, widget }) => {
  const { widgetType, metricType, title, description, size } = widget
  const sharedProps = { metricType, title, description, size, filters, expandable }

  if (widgetType === WidgetType.OVERVIEW) {
    const { selectedMetrics } = widget
    return (
      <DynamicOverviewWidget
        {...sharedProps}
        metricType={metricType}
        size={size}
        selectedMetrics={selectedMetrics}
      />
    )
  }

  if (widgetType === WidgetType.RATIO) {
    const { currentValueField, limitValueField, dangerThreshold, warningThreshold } = widget

    return (
      <RatioWidget
        {...sharedProps}
        metricType={metricType}
        currentValueField={currentValueField}
        limitValueField={limitValueField}
        dangerThreshold={dangerThreshold}
        warningThreshold={warningThreshold}
      />
    )
  }

  switch (widgetType) {
    case WidgetType.TABLE:
      return <TableWidget {...sharedProps} metricType={metricType} waitForAdoptionConfig={false} />

    case WidgetType.DONUT: {
      const { labelField, valueField } = widget
      return (
        <DonutChartWidget
          {...sharedProps}
          metricType={metricType}
          valueField={valueField ?? 'total_requests'}
          labelField={labelField ?? 'name'}
        />
      )
    }

    case WidgetType.PIE: {
      const { labelField, valueField } = widget
      return (
        <PieChartWidget
          {...sharedProps}
          metricType={metricType}
          valueField={valueField ?? 'total_requests'}
          labelField={labelField ?? 'name'}
        />
      )
    }

    case WidgetType.BAR: {
      const { labelField, valueField, yAxisInteger } = widget

      return (
        <BarChartWidget
          {...sharedProps}
          metricType={metricType}
          valueField={valueField ?? 'value'}
          labelField={labelField ?? 'date'}
          yAxisLabel={valueField ?? 'Value'}
          yAxisInteger={yAxisInteger}
        />
      )
    }

    default:
      return (
        <div className="bg-surface-elevated rounded-lg p-4 border border-border-specific-panel-outline">
          <p className="text-text-quaternary">Unknown widget type: {widgetType}</p>
        </div>
      )
  }
}

export default DynamicWidget
