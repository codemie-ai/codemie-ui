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

import { OverviewMetricType, TabularMetricType, WidgetType } from '@/types/analytics'
import { SelectOption } from '@/types/filters'

export const TABULAR_WIDGET_OPTIONS: SelectOption<WidgetType>[] = [
  { label: 'Table', value: WidgetType.TABLE },
  { label: 'Donut Chart', value: WidgetType.DONUT },
  { label: 'Pie Chart', value: WidgetType.PIE },
  { label: 'Bar Chart', value: WidgetType.BAR },
]

export const OVERVIEW_WIDGET_OPTIONS: SelectOption<WidgetType>[] = [
  { label: 'Overview', value: WidgetType.OVERVIEW },
  { label: 'Ratio', value: WidgetType.RATIO },
]

export const TABULAR_METRIC_OPTIONS: SelectOption<TabularMetricType>[] = [
  { label: 'Assistants Chats', value: TabularMetricType.ASSISTANTS_CHATS },
  { label: 'Workflows', value: TabularMetricType.WORKFLOWS },
  { label: 'Tools Usage', value: TabularMetricType.TOOLS_USAGE },
  { label: 'Agents Usage', value: TabularMetricType.AGENTS_USAGE },
  { label: 'Webhooks Invocation', value: TabularMetricType.WEBHOOKS_INVOCATION },
  { label: 'MCP Servers', value: TabularMetricType.MCP_SERVERS },
  { label: 'MCP Servers by Users', value: TabularMetricType.MCP_SERVERS_BY_USERS },
  { label: 'Projects Spending', value: TabularMetricType.PROJECTS_SPENDING },
  { label: 'LLMs Usage', value: TabularMetricType.LLMS_USAGE },
  { label: 'Users Spending', value: TabularMetricType.USERS_SPENDING },
  { label: 'Budget Soft Limit', value: TabularMetricType.BUDGET_SOFT_LIMIT },
  { label: 'Budget Hard Limit', value: TabularMetricType.BUDGET_HARD_LIMIT },
  { label: 'Users Activity', value: TabularMetricType.USERS_ACTIVITY },
  { label: 'Projects Activity', value: TabularMetricType.PROJECTS_ACTIVITY },
  { label: 'CLI Agents', value: TabularMetricType.CLI_AGENTS },
  { label: 'CLI LLMs', value: TabularMetricType.CLI_LLMS },
  { label: 'CLI Users', value: TabularMetricType.CLI_USERS },
  { label: 'CLI Errors', value: TabularMetricType.CLI_ERRORS },
  { label: 'CLI Repositories', value: TabularMetricType.CLI_REPOSITORIES },
  { label: 'Power Users', value: TabularMetricType.POWER_USERS },
  { label: 'Top Agents Usage', value: TabularMetricType.TOP_AGENTS_USAGE },
  { label: 'Top Workflow Usage', value: TabularMetricType.TOP_WORKFLOW_USAGE },
  { label: 'Published to Marketplace', value: TabularMetricType.PUBLISHED_TO_MARKETPLACE },
]

export const OVERVIEW_METRIC_OPTIONS: SelectOption<OverviewMetricType>[] = [
  { label: 'General Overview', value: OverviewMetricType.SUMMARIES },
  { label: 'CLI Overview', value: OverviewMetricType.CLI_SUMMARY },
  { label: 'Spending Overview', value: OverviewMetricType.SPENDING },
]

export const METRIC_TYPE_OPTIONS: SelectOption<TabularMetricType | OverviewMetricType>[] = [
  ...OVERVIEW_METRIC_OPTIONS,
  ...TABULAR_METRIC_OPTIONS,
]
