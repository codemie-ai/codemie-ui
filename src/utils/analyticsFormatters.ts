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

/**
 * Format metric value based on its type and format
 */
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

  if (format === MetricFormat.TIMESTAMP) {
    return new Date(value).toLocaleString()
  }

  if (typeof value === 'number') {
    return value.toLocaleString()
  }

  return String(value)
}
