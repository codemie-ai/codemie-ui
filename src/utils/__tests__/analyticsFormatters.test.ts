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

import { describe, expect, it } from 'vitest'

import { MetricFormat } from '@/types/analytics'
import { formatMetricValue, humanizeAnalyticsLabel } from '@/utils/analyticsFormatters'
import { formatDateTime } from '@/utils/helpers'

describe('analyticsFormatters', () => {
  describe('formatMetricValue', () => {
    it('formats booleans as yes and no', () => {
      expect(formatMetricValue(true)).toBe('Yes')
      expect(formatMetricValue(false)).toBe('No')
    })

    it('formats currency values with two decimal places', () => {
      expect(formatMetricValue(1234.5, MetricFormat.CURRENCY)).toBe('$1,234.50')
    })

    it('formats percentage values with two decimal places', () => {
      expect(formatMetricValue(12.3456, MetricFormat.PERCENTAGE)).toBe('12.35%')
    })

    it('formats duration values in minutes', () => {
      expect(formatMetricValue(14, MetricFormat.DURATION)).toBe('14m')
    })

    it('formats timestamps with the browser locale', () => {
      expect(formatMetricValue('2026-03-24T10:20:30Z', MetricFormat.TIMESTAMP)).toBe(
        formatDateTime('2026-03-24T10:20:30Z')
      )
    })

    it('formats numbers with locale separators when no explicit format is provided', () => {
      expect(formatMetricValue(12500)).toBe('12,500')
    })

    it('returns strings unchanged when no explicit format is provided', () => {
      expect(formatMetricValue('production')).toBe('production')
    })
  })

  describe('humanizeAnalyticsLabel', () => {
    it('humanizes snake case labels', () => {
      expect(humanizeAnalyticsLabel('pet_project')).toBe('Pet Project')
    })

    it('ignores empty snake case segments', () => {
      expect(humanizeAnalyticsLabel('active__development')).toBe('Active Development')
    })

    it('returns an empty string for an empty label', () => {
      expect(humanizeAnalyticsLabel('')).toBe('')
    })
  })
})
