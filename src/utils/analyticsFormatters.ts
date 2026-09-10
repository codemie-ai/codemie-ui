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

import { MetricFormat } from '@/types/analytics'
import { formatDateTime } from '@/utils/helpers'

// Compact token counts (K/M/B). Mirrors the analytics reference app's `fmtTokens`.
export const formatTokens = (n: number): string => {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return String(n || 0)
}

export const formatMetricValue = (
  value: string | number | boolean,
  format?: MetricFormat
): string => {
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  if (format === MetricFormat.CURRENCY) {
    return `$${Number(value).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  if (format === MetricFormat.PERCENTAGE) {
    return `${Number(value).toFixed(2)}%`
  }

  if (format === MetricFormat.DURATION) {
    return `${value}m`
  }

  if (format === MetricFormat.TOKENS) {
    return formatTokens(Number(value))
  }

  if (format === MetricFormat.TIMESTAMP) {
    return formatDateTime(String(value))
  }

  if (typeof value === 'number') {
    return value.toLocaleString()
  }

  return String(value)
}

export const humanizeAnalyticsLabel = (value: string): string =>
  value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
