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

import { type FC, useMemo, useState } from 'react'

import Select from '@/components/form/Select'
import type { AnalyticsQueryParams, TabularResponse } from '@/types/analytics'
import { ColumnType, MetricFormat, TabularMetricType } from '@/types/analytics'

import { TopNFilter, TOP_N_OPTIONS, toTopN, type TopN } from '../../utils/topNFilter'
import BarChartWidget from '../../widgets/BarChartWidget'
import DonutChartWidget from '../../widgets/DonutChartWidget'
import { useCliAnalyticsTools } from '../hooks/useCliAnalyticsTools'

interface ToolsViewProps {
  filters: AnalyticsQueryParams
  repositories?: string[]
}

const ToolsView: FC<ToolsViewProps> = ({ filters, repositories }) => {
  const [modelsTopN, setModelsTopN] = useState<TopN>(TopNFilter.TEN)

  const { toolUsage, tokensByModel, skillsInvoked, agentSubtypes, slashCommands } =
    useCliAnalyticsTools(filters, repositories)

  const toolUsageTabular = useMemo(
    (): TabularResponse => ({
      data: {
        columns: [
          { id: 'tool_name', label: 'Tool', type: ColumnType.STRING },
          { id: 'call_count', label: 'Calls', type: ColumnType.INTEGER },
        ],
        rows: toolUsage as unknown as Record<string, unknown>[],
      },
      metadata: { timestamp: '', data_as_of: '' },
      pagination: {
        page: 0,
        per_page: toolUsage.length,
        total_count: toolUsage.length,
        has_more: false,
      },
    }),
    [toolUsage]
  )

  // Always return a TabularResponse (never null) so DonutChartWidget does not fall back to
  // fetching global analyticsStore data. Empty rows render the emptyStateLabel instead.
  const tokensByModelOverride = useMemo((): TabularResponse => {
    const rows =
      modelsTopN === TopNFilter.ALL ? tokensByModel : tokensByModel.slice(0, modelsTopN as number)
    return {
      data: {
        columns: [
          { id: 'model_name', label: 'Model', type: ColumnType.STRING },
          {
            id: 'total_tokens',
            label: 'Total Tokens',
            type: ColumnType.INTEGER,
            format: MetricFormat.TOKENS,
          },
        ],
        rows: rows as unknown as Record<string, unknown>[],
      },
      metadata: { timestamp: '', data_as_of: '' },
      pagination: {
        page: 0,
        per_page: rows.length,
        total_count: rows.length,
        has_more: false,
      },
    }
  }, [tokensByModel, modelsTopN])

  const toInvocationTabular = (rows: { name: string; count: number }[]): TabularResponse => ({
    data: {
      columns: [
        { id: 'name', label: 'Name', type: ColumnType.STRING },
        { id: 'count', label: 'Count', type: ColumnType.INTEGER },
      ],
      rows: rows as unknown as Record<string, unknown>[],
    },
    metadata: { timestamp: '', data_as_of: '' },
    pagination: { page: 0, per_page: rows.length, total_count: rows.length, has_more: false },
  })

  const skillsTabularData = useMemo(() => toInvocationTabular(skillsInvoked), [skillsInvoked])
  const agentsTabularData = useMemo(() => toInvocationTabular(agentSubtypes), [agentSubtypes])
  const commandsTabularData = useMemo(() => toInvocationTabular(slashCommands), [slashCommands])

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BarChartWidget
          title="Most Used Tools"
          labelField="tool_name"
          valueField="call_count"
          yAxisLabel="call_count"
          yAxisInteger
          horizontal
          dataOverride={toolUsageTabular}
        />

        <DonutChartWidget
          metricType={TabularMetricType.CLI_LLMS}
          title="Tokens by model"
          labelField="model_name"
          valueField="total_tokens"
          dataOverride={tokensByModelOverride}
          emptyStateLabel="No token data available"
          actions={
            <Select
              value={String(modelsTopN)}
              onChange={(e) => setModelsTopN(toTopN(e.value))}
              options={TOP_N_OPTIONS}
              className="!h-8"
            />
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <BarChartWidget
          title="Skills invoked"
          labelField="name"
          valueField="count"
          yAxisLabel="count"
          yAxisInteger
          horizontal
          dataOverride={skillsTabularData}
        />
        <BarChartWidget
          title="Agent subtypes"
          labelField="name"
          valueField="count"
          yAxisLabel="count"
          yAxisInteger
          horizontal
          dataOverride={agentsTabularData}
        />
        <BarChartWidget
          title="Slash commands"
          labelField="name"
          valueField="count"
          yAxisLabel="count"
          yAxisInteger
          horizontal
          dataOverride={commandsTabularData}
        />
      </div>
    </div>
  )
}

export default ToolsView
