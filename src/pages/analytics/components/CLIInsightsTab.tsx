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

import { useFeatureFlag } from '@/hooks/useFeatureFlags'
import { OverviewMetricType, TabularMetricType } from '@/types/analytics'
import type { AnalyticsQueryParams } from '@/types/analytics'
import { humanizeAnalyticsLabel } from '@/utils/analyticsFormatters'
import { getDeterministicChartColor } from '@/utils/chartColors'

import CLIInsightsUserDetailsModal from './cliInsights/CLIInsightsUserDetailsModal'
import EnrichedUserSection from './cliInsights/EnrichedUserSection'
import { getPrimitiveString } from './cliInsights/helpers'
import BarChartWidget from './widgets/BarChartWidget'
import DonutChartWidget from './widgets/DonutChartWidget'
import MetricsWidget from './widgets/MetricsWidget'
import TableWidget from './widgets/TableWidget'

interface CLIInsightsTabProps {
  filters: AnalyticsQueryParams
}

interface SelectedCliUser {
  name: string
  id: string | null
}

const renderCliClassificationBadge = (item: Record<string, unknown>) => {
  const key = getPrimitiveString(item.classification).toLowerCase()
  const color = getDeterministicChartColor(key, 0)
  const label = humanizeAnalyticsLabel(getPrimitiveString(item.classification, '-'))
  return (
    <span
      className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ backgroundColor: `${color}20`, color }}
    >
      {label}
    </span>
  )
}

interface TopSpenderUserButtonProps {
  item: Record<string, unknown>
  onClick: (item: Record<string, unknown>) => void
}

const TopSpenderUserButton: FC<TopSpenderUserButtonProps> = ({ item, onClick }) => (
  <button
    type="button"
    className="font-bold hover:underline cursor-pointer"
    onClick={() => onClick(item)}
  >
    {getPrimitiveString(item.user_name ?? item.user)}
  </button>
)

const renderTopSpenderUserCell =
  (onClick: (item: Record<string, unknown>) => void) => (item: Record<string, unknown>) =>
    <TopSpenderUserButton item={item} onClick={onClick} />

const CLIInsightsTab: FC<CLIInsightsTabProps> = ({ filters }) => {
  const [selectedUser, setSelectedUser] = useState<SelectedCliUser | null>(null)
  const [isUserEnrichmentEnabled] = useFeatureFlag('features:userEnrichmentEnabled')

  const handleTopSpenderRowClick = (item: Record<string, unknown>) => {
    setSelectedUser({
      name: getPrimitiveString(item.user_name ?? item.user),
      id: getPrimitiveString(item.userId) || null,
    })
  }

  const topSpenderRenderColumns = {
    user_name: renderTopSpenderUserCell(handleTopSpenderRowClick),
    classification: renderCliClassificationBadge,
  }

  return (
    <div className="flex flex-col gap-6">
      <MetricsWidget
        type={OverviewMetricType.CLI_SUMMARY}
        title="CLI Overview"
        description="High-level CLI activity across users, projects, sessions, cost, tokens, and repositories."
        filters={filters}
        expandable={false}
      />

      <section>
        <h2 className="mb-4 text-xl font-semibold text-text-primary">Usage Patterns</h2>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <BarChartWidget
            title="Weekday Pattern"
            description="CLI activity distribution by weekday."
            metricType={TabularMetricType.CLI_INSIGHTS_WEEKDAY_PATTERN}
            filters={filters}
            labelField="weekday"
            valueField="activity_count"
            yAxisLabel="activity_count"
            yAxisInteger
          />
          <BarChartWidget
            title="Usage by Hour of Day"
            description="CLI activity distribution by hour."
            metricType={TabularMetricType.CLI_INSIGHTS_HOURLY_USAGE}
            filters={filters}
            labelField="hour"
            valueField="activity_count"
            yAxisLabel="activity_count"
            yAxisInteger
          />
          <BarChartWidget
            title="Session Depth"
            description="Distribution of prompts per CLI session."
            metricType={TabularMetricType.CLI_INSIGHTS_SESSION_DEPTH}
            filters={filters}
            labelField="range"
            valueField="count"
            yAxisLabel="count"
            yAxisInteger
          />
          <DonutChartWidget
            title="Coding Agents"
            description="Distribution by coding agent."
            metricType={TabularMetricType.CLI_AGENTS}
            filters={filters}
            labelField="client_name"
            valueField="total_usage"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-text-primary">Tools and Models</h2>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <BarChartWidget
            title="Most Used Tools"
            description="Top tools used in CLI sessions."
            metricType={TabularMetricType.CLI_TOOLS}
            filters={filters}
            labelField="tool_name"
            valueField="session_count"
            yAxisLabel="session_count"
            yAxisInteger
            horizontal
          />
          <DonutChartWidget
            title="Models"
            description="CLI model distribution."
            metricType={TabularMetricType.CLI_LLMS}
            filters={filters}
            labelField="model_name"
            valueField="total_requests"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-text-primary">Classification</h2>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <DonutChartWidget
            title="User Classification Distribution"
            description="How CLI users split across deterministic CLI usage categories."
            metricType={TabularMetricType.CLI_INSIGHTS_USER_CLASSIFICATION}
            filters={filters}
            labelField="classification"
            valueField="user_count"
          />
          <BarChartWidget
            title="Cost by User Classification"
            description="CLI cost distribution by user classification."
            metricType={TabularMetricType.CLI_INSIGHTS_USER_CLASSIFICATION}
            filters={filters}
            labelField="classification"
            valueField="total_cost"
            yAxisLabel="total_cost"
          />
          <BarChartWidget
            title="Top Users by Cost"
            description="Highest-cost CLI users in the selected period."
            metricType={TabularMetricType.CLI_INSIGHTS_TOP_USERS_BY_COST}
            filters={filters}
            labelField="user_name"
            valueField="total_cost"
            yAxisLabel="total_cost"
            horizontal
          />
          <DonutChartWidget
            title="Project Classification Distribution"
            description="How CLI projects split across deterministic CLI usage categories."
            metricType={TabularMetricType.CLI_INSIGHTS_PROJECT_CLASSIFICATION}
            filters={filters}
            labelField="classification"
            valueField="project_count"
          />
          <BarChartWidget
            title="Cost by Project Classification"
            description="CLI cost distribution by project classification."
            metricType={TabularMetricType.CLI_INSIGHTS_PROJECT_CLASSIFICATION}
            filters={filters}
            labelField="classification"
            valueField="total_cost"
            yAxisLabel="total_cost"
          />
          <BarChartWidget
            title="Top Projects by Cost"
            description="Highest-cost CLI projects in the selected period."
            metricType={TabularMetricType.CLI_INSIGHTS_TOP_PROJECTS_BY_COST}
            filters={filters}
            labelField="project_name"
            valueField="total_cost"
            yAxisLabel="total_cost"
            horizontal
          />
        </div>
      </section>

      {isUserEnrichmentEnabled && <EnrichedUserSection filters={filters} />}

      <section>
        <TableWidget
          metricType={TabularMetricType.CLI_INSIGHTS_TOP_SPENDERS}
          title="Top Spenders"
          description="Users with the highest CLI spending in the selected period."
          filters={filters}
          customRenderColumns={topSpenderRenderColumns}
        />
      </section>

      <section>
        <TableWidget
          metricType={TabularMetricType.CLI_INSIGHTS_USERS}
          title="All Users"
          description="All CLI users with activity in the selected period, sorted alphabetically."
          filters={filters}
          customRenderColumns={topSpenderRenderColumns}
        />
      </section>

      <CLIInsightsUserDetailsModal
        userName={selectedUser?.name ?? null}
        userId={selectedUser?.id ?? null}
        filters={filters}
        onHide={() => setSelectedUser(null)}
      />
    </div>
  )
}

export default CLIInsightsTab
