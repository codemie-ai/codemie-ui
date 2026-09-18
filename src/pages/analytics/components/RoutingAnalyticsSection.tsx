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

import { FC } from 'react'

import DonutChartWidget from '@/pages/analytics/components/widgets/DonutChartWidget'
import MetricsWidget from '@/pages/analytics/components/widgets/MetricsWidget'
import StackedBarChartWidget from '@/pages/analytics/components/widgets/StackedBarChartWidget'
import TableWidget from '@/pages/analytics/components/widgets/TableWidget'
import type { AnalyticsQueryParams } from '@/types/analytics'
import { OverviewMetricType, TabularMetricType } from '@/types/analytics'

interface RoutingAnalyticsSectionProps {
  filters: AnalyticsQueryParams
}

const ROUTING_SERIES = [
  { field: 'simple_requests', label: 'Simple' },
  { field: 'medium_requests', label: 'Medium' },
  { field: 'reasoning_requests', label: 'Reasoning' },
  { field: 'complex_requests', label: 'Complex' },
]

const RoutingAnalyticsSection: FC<RoutingAnalyticsSectionProps> = ({ filters }) => {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MetricsWidget
          type={OverviewMetricType.ROUTING_SUMMARY}
          title="Routing Summary"
          description="Routing requests, classifier overhead, and counterfactual cost savings"
          filters={filters}
          expandable={false}
        />
        <DonutChartWidget
          metricType={TabularMetricType.ROUTING_REQUESTED_MODELS}
          title="Routers"
          description="Request distribution by router alias"
          labelField="requested_model"
          valueField="request_count"
          filters={filters}
        />
      </div>

      <StackedBarChartWidget
        metricType={TabularMetricType.ROUTING_ACTIVITY}
        title="Routing Activity"
        description="Routing request volume over time, stacked by routing tier"
        labelField="time"
        series={ROUTING_SERIES}
        filters={filters}
        valueFormat="number"
      />

      <TableWidget
        metricType={TabularMetricType.ROUTING_PATHS}
        title="Routing Paths"
        description="Router alias to routed model and tier, with request volume, actual cost, estimated max cost, and savings"
        filters={filters}
        columnOrder={[
          'router',
          'routed_model',
          'tier',
          'request_count',
          'actual_cost_usd',
          'estimated_max_cost_usd',
          'potential_savings_usd',
        ]}
      />
    </div>
  )
}

export default RoutingAnalyticsSection
