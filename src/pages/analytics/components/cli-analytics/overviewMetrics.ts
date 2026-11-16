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

import { ColumnType, MetricFormat, type Metric } from '@/types/analytics'
import type { OverviewKPIs } from '@/types/cliAnalytics'
import { formatMetricValue } from '@/utils/analyticsFormatters'

const percentOf = (part: number, whole: number): string =>
  formatMetricValue((part / Math.max(1, whole)) * 100, MetricFormat.PERCENTAGE)

// No calls means no denominator; a real 0% still shows as a percentage.
function describeToolCalls(totalCalls: number, successRate: number): string {
  if (totalCalls > 0) return `${formatMetricValue(successRate, MetricFormat.PERCENTAGE)} succeeded`
  return '—'
}

const currency = (id: string, label: string, value: number, description: string): Metric => ({
  id,
  label,
  type: ColumnType.NUMBER,
  format: MetricFormat.CURRENCY,
  value,
  description,
})

export interface OverviewMetricGroup {
  id: string
  metrics: Metric[]
}

const integer = (
  id: string,
  label: string,
  value: number | null,
  description?: string
): Metric => ({
  id,
  label,
  type: ColumnType.INTEGER,
  value,
  description,
})

// Three rows of five (cost, tokens, sessions). API Spend / Subscription Usage are left out while their source is missing.
export function buildOverviewSummaryGroups(
  kpis: OverviewKPIs,
  userCount: number | null,
  apiSpend: number | null = null,
  personalBilledCost: number | null = null
): OverviewMetricGroup[] {
  const users = kpis.total_users ?? userCount
  // Backend split when it ships (Ticket B). Until then API Spend is the CodeMie-proxy sessions, and
  // Subscription Usage is corporate + unknown (the rest of Est. Cost) plus personal, which the backend
  // keeps out of Est. Cost and reports apart.
  const apiCost = kpis.api_cost_usd ?? apiSpend
  const subscriptionCost =
    kpis.subscription_cost_usd ??
    (apiCost != null
      ? Math.max(0, kpis.total_cost_usd - apiCost) + (personalBilledCost ?? 0)
      : null)

  const cost: Array<Metric | null> = [
    currency('total_cost_usd', 'Est. Cost', kpis.total_cost_usd, 'All usage at API rates'),
    apiCost != null ? currency('api_cost_usd', 'API Spend', apiCost, 'Billed per token') : null,
    subscriptionCost != null
      ? currency(
          'subscription_cost_usd',
          'Subscription Usage',
          subscriptionCost,
          'At API rates, not billed'
        )
      : null,
    currency(
      'cache_read_cost_usd',
      'Cache Re-Read Cost',
      kpis.cache_read_cost_usd,
      'Spend on context re-reads'
    ),
    {
      id: 'bloat_pct',
      label: 'Bloat %',
      type: ColumnType.NUMBER,
      format: MetricFormat.PERCENTAGE,
      value: kpis.bloat_pct,
      description: 'Cache re-read cost / est. cost',
    },
  ]

  // Full figures: a compact "2.9B" reads as "2.98" in the mono font.
  const tokens: Metric[] = [
    integer('total_tokens', 'Total Tokens', kpis.total_tokens, 'Input, output and cache'),
    integer('total_input_tokens', 'Input Tokens', kpis.total_input_tokens, 'LLM input tokens'),
    integer('total_output_tokens', 'Output Tokens', kpis.total_output_tokens, 'LLM output tokens'),
    integer(
      'total_cache_read_tokens',
      'Cache Read Tokens',
      kpis.total_cache_read_tokens,
      'Cached input tokens'
    ),
    integer(
      'total_cache_creation_tokens',
      'Cache Creation Tokens',
      kpis.total_cache_creation_tokens,
      'Tokens written to cache'
    ),
  ]

  const sessions: Metric[] = [
    integer('total_users', 'Total Users', users, 'Distinct users'),
    integer(
      'total_sessions',
      'Sessions',
      kpis.total_sessions,
      users ? `${(kpis.total_sessions / users).toFixed(1)} per user` : undefined
    ),
    integer(
      'total_turns',
      'Turns',
      kpis.total_turns,
      `${(kpis.total_turns / Math.max(1, kpis.total_sessions)).toFixed(1)} per session`
    ),
    integer(
      'total_tool_calls',
      'Tool Calls',
      kpis.total_tool_calls,
      describeToolCalls(kpis.total_tool_calls, kpis.tool_call_success_rate)
    ),
    integer(
      'dead_sessions',
      'Sessions Without Changes',
      kpis.dead_sessions,
      `${percentOf(kpis.dead_sessions, kpis.total_sessions)} of all sessions`
    ),
  ]

  return [
    {
      id: 'cost',
      metrics: cost.filter((card): card is Metric => card !== null),
    },
    { id: 'tokens', metrics: tokens },
    { id: 'sessions', metrics: sessions },
  ]
}
