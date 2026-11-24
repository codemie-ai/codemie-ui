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

import MetricsWidget from '@/pages/analytics/components/widgets/MetricsWidget'
import StackedBarChartWidget from '@/pages/analytics/components/widgets/StackedBarChartWidget'
import TableWidget from '@/pages/analytics/components/widgets/TableWidget'
import type { AnalyticsQueryParams } from '@/types/analytics'
import { OverviewMetricType, TabularMetricType } from '@/types/analytics'

interface HeadroomAnalyticsSectionProps {
  filters: AnalyticsQueryParams
}

// The summary also returns the active `mode`; it is intentionally not shown.
const HEADROOM_SUMMARY_METRICS = [
  'tokens_original',
  'tokens_compacted',
  'tokens_saved',
  'saved_percent',
  'request_count',
  'session_count',
]

const HEADROOM_SERIES = [
  { field: 'tokens_compacted', label: 'Compacted' },
  { field: 'tokens_saved', label: 'Saved' },
]

const HeadroomAnalyticsSection: FC<HeadroomAnalyticsSectionProps> = ({ filters }) => {
  return (
    <div className="flex flex-col gap-6">
      <MetricsWidget
        type={OverviewMetricType.HEADROOM_SUMMARY}
        title="Headroom Summary"
        description="Original, compacted and saved tokens across requests where Headroom reduced the context"
        filters={filters}
        selectedMetrics={HEADROOM_SUMMARY_METRICS}
        expandable={false}
      />

      <StackedBarChartWidget
        metricType={TabularMetricType.HEADROOM_TIMESERIES}
        title="Savings Over Time"
        description="Tokens sent after compaction and tokens saved per 3h window; the full bar is the original size"
        labelField="time"
        series={HEADROOM_SERIES}
        filters={filters}
        valueFormat="number"
      />

      <TableWidget
        metricType={TabularMetricType.HEADROOM_BY_STRATEGY}
        title="Savings by Strategy"
        description="Requests and tokens per compression strategy, with the share of original tokens saved"
        filters={filters}
        columnOrder={[
          'strategy',
          'request_count',
          'tokens_original',
          'tokens_compacted',
          'tokens_saved',
          'saved_percent',
        ]}
      />
    </div>
  )
}

export default HeadroomAnalyticsSection
