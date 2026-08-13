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

import React, { ReactNode } from 'react'

import ClaudeDesktopSvg from '@/assets/icons/claude-desktop.svg?react'
import TerminalSvg from '@/assets/icons/terminal.svg?react'
import { AnalyticsQueryParams, Metric } from '@/types/analytics'
import { humanizeAnalyticsLabel } from '@/utils/analyticsFormatters'
import { getDeterministicChartColor } from '@/utils/chartColors'

export interface UserDetailMetaResponse {
  data: {
    user_name: string
    user_email: string
    unique_projects: string[]
    branches_used: string[]
    rule_reasons: string[]
    tool_profile: {
      rationale: string
    }
  }
}

export type UserDetailQueryParams = AnalyticsQueryParams & {
  user_name: string
  user_id?: string | null
}

export type MetricCardDescriptor = {
  metric: Metric
  valueOverride?: ReactNode
  valueClassName?: string
}

export const sectionTitleClassName =
  'text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary'

export const getPrimitiveString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? String(value)
    : fallback

export const buildUserDetailParams = (
  userName: string,
  userId: string | null | undefined,
  filters: AnalyticsQueryParams
): UserDetailQueryParams => ({
  user_name: userName,
  user_id: userId,
  ...filters,
})

export const renderMetricPill = (label: string, color: string) => (
  <div
    className="inline-flex rounded-full px-3 py-1 text-sm font-semibold"
    style={{ backgroundColor: `${color}20`, color }}
  >
    {label}
  </div>
)

const findMetric = (metrics: Metric[] | undefined, id: string) =>
  metrics?.find((metric) => metric.id === id)

const compactMetricCards = (
  cards: Array<MetricCardDescriptor | null | undefined>
): MetricCardDescriptor[] => cards.filter((card): card is MetricCardDescriptor => Boolean(card))

export const getWorkflowIntentCards = (
  metrics: Metric[] | undefined
): { cards: MetricCardDescriptor[] } => {
  const primaryIntent = findMetric(metrics, 'primary_intent')
  const signalStrength = findMetric(metrics, 'signal_strength')

  return {
    cards: compactMetricCards([
      primaryIntent
        ? {
            metric: primaryIntent,
            valueOverride: renderMetricPill(
              String(primaryIntent.value ?? 'Unknown'),
              getDeterministicChartColor(
                String(primaryIntent.value ?? 'Unknown')
                  .trim()
                  .toLowerCase() || 'unknown',
                0
              )
            ),
          }
        : null,
      signalStrength
        ? {
            metric: signalStrength,
            valueClassName: 'text-2xl font-semibold text-info-base',
          }
        : null,
    ]),
  }
}

export const getClassificationCards = (metrics: Metric[] | undefined): MetricCardDescriptor[] => {
  const primaryCategory = findMetric(metrics, 'primary_category')
  const multiCategory = findMetric(metrics, 'is_multi_category')
  const diversityScore = findMetric(metrics, 'category_diversity_score')
  const repositories = findMetric(metrics, 'unique_repositories')
  const categoryKey = String(primaryCategory?.value ?? '').toLowerCase()
  const categoryLabel = humanizeAnalyticsLabel(String(primaryCategory?.value ?? 'Unknown'))
  const categoryColor = getDeterministicChartColor(categoryKey || 'all', 0)

  return compactMetricCards([
    primaryCategory
      ? {
          metric: primaryCategory,
          valueOverride: renderMetricPill(categoryLabel, categoryColor),
        }
      : null,
    multiCategory ? { metric: multiCategory } : null,
    diversityScore ? { metric: diversityScore } : null,
    repositories ? { metric: repositories } : null,
  ])
}

export const renderRepositoryCell = (item: Record<string, unknown>) => {
  const repo = getPrimitiveString(item.repository, '-')
  return (
    <div className="repo-cell-tooltip truncate" data-pr-tooltip={repo}>
      {repo}
    </div>
  )
}

export const renderBranchCell = (item: Record<string, unknown>) => {
  const branch = getPrimitiveString(item.branch)
  if (!branch) return <span className="text-text-secondary">-</span>
  return (
    <span
      className="branch-cell-tooltip inline-block max-w-full truncate rounded-full bg-surface-elevated px-3 py-1 text-sm text-text-secondary"
      data-pr-tooltip={branch}
    >
      {branch}
    </span>
  )
}

const CLIENT_CONFIG: Record<
  string,
  { label: string; Icon: React.FC<React.SVGProps<SVGSVGElement>> }
> = {
  CLI: { label: 'CLI', Icon: TerminalSvg },
  'codemie-daemon': { label: 'CLI', Icon: TerminalSvg },
  'codemie-claude': { label: 'CLI', Icon: TerminalSvg },
  'codemie-claude-acp': { label: 'CLI', Icon: TerminalSvg },
  'codemie-code': { label: 'CLI', Icon: TerminalSvg },
  'claude-desktop': { label: 'Claude Desktop', Icon: ClaudeDesktopSvg },
}

export const renderClientCell = (item: Record<string, unknown>) => {
  const client = getPrimitiveString(item.client)
  if (!client) return <span className="text-text-secondary">-</span>
  const config = CLIENT_CONFIG[client]
  if (!config) return <span>{client}</span>
  const { label, Icon } = config
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </span>
  )
}

export const renderClassificationCell = (item: Record<string, unknown>) => {
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
