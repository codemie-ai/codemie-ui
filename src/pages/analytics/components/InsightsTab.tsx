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

import DonutChartWidget from '@/pages/analytics/components/widgets/DonutChartWidget'
import MetricsWidget from '@/pages/analytics/components/widgets/MetricsWidget'
import StackedBarChartWidget from '@/pages/analytics/components/widgets/StackedBarChartWidget'
import TableWidget from '@/pages/analytics/components/widgets/TableWidget'
import { OverviewMetricType, TabularMetricType } from '@/types/analytics'
import type { AnalyticsQueryParams } from '@/types/analytics'

interface InsightsTabProps {
  filters: AnalyticsQueryParams
}

const InsightsTab: FC<InsightsTabProps> = ({ filters }) => {
  return (
    <div className="flex flex-col gap-6">
      {/* ===== SUMMARY METRICS SECTION ===== */}
      <section>
        <MetricsWidget filters={filters} type={OverviewMetricType.SUMMARIES} />
      </section>

      {/* ===== SPENDING OVER TIME SECTION ===== */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-text-primary">Spending Over Time</h2>
        <StackedBarChartWidget
          metricType={TabularMetricType.ENGAGEMENT_WEEKLY_HISTOGRAM}
          title="Weekly Money Spent"
          description="Money spent per 3h window broken down by source"
          labelField="time"
          series={[
            { field: 'assistants_spent', label: 'Assistants' },
            { field: 'workflows_spent', label: 'Workflows' },
            { field: 'datasources_spent', label: 'Datasources' },
            { field: 'cli_spent', label: 'CLI' },
          ]}
          filters={filters}
        />
      </section>

      {/* ===== MONEY SPENT BREAKDOWN SECTION ===== */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-text-primary">Money Spent Breakdown</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TableWidget
            metricType={TabularMetricType.PROJECTS_SPENDING}
            title="Total Spent by Project"
            description="Spending ranked by project"
            filters={filters}
          />
          <TableWidget
            metricType={TabularMetricType.USERS_SPENDING}
            title="Total Spent by User"
            description="Total spending ranked by user (all sources)"
            filters={filters}
          />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <TableWidget
            metricType={TabularMetricType.PLATFORM_SPENDING_BY_USERS}
            title="Platform Spent by User"
            description="Assistants, Workflows, Datasources spending per user"
            filters={filters}
          />
          <TableWidget
            metricType={TabularMetricType.CLI_SPENDING_BY_USERS}
            title="CLI Spent by User"
            description="CLI proxy usage spending per user"
            filters={filters}
          />
        </div>
      </section>

      {/* ===== LLM & CLI USAGE SECTION ===== */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-text-primary">LLM Usage</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DonutChartWidget
            metricType={TabularMetricType.LLMS_USAGE}
            title="Top LLMs"
            labelField="model_name"
            valueField="total_requests"
            filters={filters}
          />
          <DonutChartWidget
            metricType={TabularMetricType.CLI_LLMS}
            title="Top CLI LLMs"
            labelField="model_name"
            valueField="total_requests"
            filters={filters}
          />
        </div>
      </section>
    </div>
  )
}

export default InsightsTab
