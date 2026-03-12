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

import CliMetricsWidget from '@/pages/analytics/components/widgets/CliMetricsWidget'
import DonutChartWidget from '@/pages/analytics/components/widgets/DonutChartWidget'
import MetricsWidget from '@/pages/analytics/components/widgets/MetricsWidget'
import PieChartWidget from '@/pages/analytics/components/widgets/PieChartWidget'
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

      {/* ===== ASSISTANTS & WORKFLOWS SECTION ===== */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-text-primary">Assistants & Workflows</h2>
        <div className="grid grid-cols-1 gap-6">
          <TableWidget
            metricType={TabularMetricType.ASSISTANTS_CHATS}
            title="Top Assistants"
            description="Most used assistants by total messages"
            filters={filters}
          />
        </div>
        <div className="grid grid-cols-1 gap-6 mt-6">
          <TableWidget
            metricType={TabularMetricType.WORKFLOWS}
            title="Workflows Performance"
            description="Workflow execution metrics and success rates"
            filters={filters}
          />
        </div>
      </section>

      {/* ===== LLMS & MODELS SECTION ===== */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-text-primary">LLM Usage</h2>
        <DonutChartWidget
          metricType={TabularMetricType.LLMS_USAGE}
          title="LLM Model Distribution"
          description="Distribution of LLM model usage by total requests"
          valueField="total_requests"
          labelField="model_name"
          filters={filters}
        />
      </section>

      {/* ===== TOOLS & AGENTS SECTION ===== */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-text-primary">Tools & Agents</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TableWidget
            metricType={TabularMetricType.TOOLS_USAGE}
            title="Tool Usage"
            description="Most invoked tools and their error rates"
            filters={filters}
          />

          <TableWidget
            metricType={TabularMetricType.AGENTS_USAGE}
            title="Agent Usage"
            description="Agent invocations and performance"
            filters={filters}
          />
        </div>

        <div className="grid grid-cols-1 mt-6">
          <TableWidget
            metricType={TabularMetricType.WEBHOOKS_INVOCATION}
            title="Webhook Invocations"
            description="Webhook usage by user and alias"
            filters={filters}
          />
        </div>
      </section>

      {/* ===== PROJECTS & USERS SECTION ===== */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-text-primary">Projects & Users</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DonutChartWidget
            metricType={TabularMetricType.USERS_SPENDING}
            title="User Spending Distribution"
            description="Spending distribution across users"
            valueField="total_cost_usd"
            labelField="user_email"
            filters={filters}
          />

          <PieChartWidget
            metricType={TabularMetricType.PROJECTS_SPENDING}
            title="Project Spending Distribution"
            description="Money spent per project"
            valueField="total_cost_usd"
            labelField="project_name"
            filters={filters}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <TableWidget
            metricType={TabularMetricType.USERS_ACTIVITY}
            title="User Activity"
            description="Most active users and their metrics"
            filters={filters}
          />

          <TableWidget
            metricType={TabularMetricType.PROJECTS_ACTIVITY}
            title="Project Activity"
            description="Project usage and activity metrics"
            filters={filters}
          />
        </div>
      </section>

      {/* ===== BUDGET MONITORING SECTION ===== */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-text-primary">Budget Monitoring</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TableWidget
            metricType={TabularMetricType.BUDGET_SOFT_LIMIT}
            title="Budget Soft Limit Alerts"
            description="Users approaching soft budget limits"
            filters={filters}
          />

          <TableWidget
            metricType={TabularMetricType.BUDGET_HARD_LIMIT}
            title="Budget Hard Limit Alerts"
            description="Users at or exceeding hard budget limits"
            filters={filters}
          />
        </div>
      </section>

      {/* ===== MCP SERVERS SECTION ===== */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-text-primary">MCP Servers</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PieChartWidget
            metricType={TabularMetricType.MCP_SERVERS}
            title="MCP Server Usage"
            description="Distribution of MCP server usage"
            valueField="total_requests"
            labelField="mcp_name"
            filters={filters}
          />

          <TableWidget
            metricType={TabularMetricType.MCP_SERVERS_BY_USERS}
            title="MCP Servers by Users"
            description="MCP server usage broken down by user"
            filters={filters}
          />
        </div>
      </section>

      {/* ===== CLI ANALYTICS SECTION ===== */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-text-primary">CLI Analytics</h2>
        <CliMetricsWidget />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <TableWidget
            metricType={TabularMetricType.CLI_AGENTS}
            title="CLI Agents"
            description="CLI agent usage and performance"
            filters={filters}
          />

          <TableWidget
            metricType={TabularMetricType.CLI_LLMS}
            title="CLI LLM Usage"
            description="LLM usage in CLI"
            filters={filters}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <TableWidget
            metricType={TabularMetricType.CLI_USERS}
            title="CLI Users"
            description="CLI user activity"
            filters={filters}
          />

          <TableWidget
            metricType={TabularMetricType.CLI_ERRORS}
            title="CLI Errors"
            description="CLI error tracking"
            filters={filters}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mt-6">
          <TableWidget
            metricType={TabularMetricType.CLI_REPOSITORIES}
            title="CLI Repositories"
            description="Repository usage in CLI"
            filters={filters}
          />
        </div>
      </section>
    </div>
  )
}

export default InsightsTab
