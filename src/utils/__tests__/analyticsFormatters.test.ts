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

import { ColumnType, Metric, MetricFormat } from '@/types/analytics'
import {
  ABSENT_VALUE_MARKER,
  SPEND_QUALIFICATION_FIELDS,
  formatMetricValue,
  formatQualifiedMetricValue,
  formatSpendQualificationSuffix,
  humanizeAnalyticsLabel,
  readSpendQualification,
} from '@/utils/analyticsFormatters'
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

    it('renders sub-cent spend with significant digits, never as $0.00', () => {
      expect(formatMetricValue(0.0042, MetricFormat.CURRENCY)).toBe('$0.0042')
    })

    it('formats percentage values with two decimal places', () => {
      expect(formatMetricValue(12.3456, MetricFormat.PERCENTAGE)).toBe('12.35%')
    })

    it('formats duration values in minutes', () => {
      expect(formatMetricValue(14, MetricFormat.DURATION)).toBe('14m')
    })

    it('formats token counts into compact K/M/B units', () => {
      expect(formatMetricValue(950, MetricFormat.TOKENS)).toBe('950')
      expect(formatMetricValue(2000, MetricFormat.TOKENS)).toBe('2.0K')
      expect(formatMetricValue(1234567, MetricFormat.TOKENS)).toBe('1.2M')
      expect(formatMetricValue(3200000000, MetricFormat.TOKENS)).toBe('3.2B')
      expect(formatMetricValue(0, MetricFormat.TOKENS)).toBe('0')
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

    it('renders an absent currency figure as the absent marker, never as $0.00', () => {
      expect(formatMetricValue(null, MetricFormat.CURRENCY)).toBe(ABSENT_VALUE_MARKER)
      expect(formatMetricValue(undefined, MetricFormat.CURRENCY)).toBe(ABSENT_VALUE_MARKER)
      expect(formatMetricValue(null, MetricFormat.CURRENCY)).not.toContain('0')
    })

    it('renders a measured zero as $0.00, because an absent figure and a zero are not the same', () => {
      expect(formatMetricValue(0, MetricFormat.CURRENCY)).toBe('$0.00')
    })

    it('renders an absent percentage as the absent marker, never as 0.00%', () => {
      expect(formatMetricValue(null, MetricFormat.PERCENTAGE)).toBe(ABSENT_VALUE_MARKER)
      expect(formatMetricValue(undefined, MetricFormat.PERCENTAGE)).toBe(ABSENT_VALUE_MARKER)
    })

    it('renders a measured zero percentage as 0.00%', () => {
      expect(formatMetricValue(0, MetricFormat.PERCENTAGE)).toBe('0.00%')
    })

    it('renders an absent unformatted value as the absent marker', () => {
      expect(formatMetricValue(null)).toBe(ABSENT_VALUE_MARKER)
    })
  })

  describe('readSpendQualification', () => {
    it('reads the unprefixed, row-level annotation form', () => {
      expect(
        readSpendQualification({ spend_partial: true, spend_missing_amount: 3.25 })
      ).toStrictEqual({
        spend_unavailable: false,
        spend_partial: true,
        spend_missing_amount: 3.25,
      })
    })

    it('reads the column-prefixed annotation form', () => {
      expect(readSpendQualification({ cost_spend_unavailable: true }, 'cost_')).toStrictEqual({
        spend_unavailable: true,
        spend_partial: false,
        spend_missing_amount: null,
      })
    })

    it('ignores a prefixed annotation when reading the unprefixed form', () => {
      expect(readSpendQualification({ cost_spend_partial: true })).toStrictEqual({
        spend_unavailable: false,
        spend_partial: false,
        spend_missing_amount: null,
      })
    })

    it('treats a non-numeric missing amount as unknown', () => {
      expect(readSpendQualification({ spend_missing_amount: null }).spend_missing_amount).toBeNull()
    })

    it('returns no annotations for an absent source', () => {
      expect(readSpendQualification(null)).toStrictEqual({})
      expect(readSpendQualification(undefined)).toStrictEqual({})
    })
  })

  describe('formatSpendQualificationSuffix', () => {
    it('adds no suffix to a fully resolved figure', () => {
      expect(formatSpendQualificationSuffix({})).toBe('')
      expect(
        formatSpendQualificationSuffix({ spend_partial: false, spend_unavailable: false })
      ).toBe('')
    })

    it('names the unattributed amount for a partial figure when it is known', () => {
      expect(
        formatSpendQualificationSuffix({ spend_partial: true, spend_missing_amount: 3.25 })
      ).toBe('')
    })

    it('names a sub-cent unattributed amount rather than rounding it to $0.00', () => {
      expect(
        formatSpendQualificationSuffix({ spend_partial: true, spend_missing_amount: 0.003 })
      ).toBe('')
    })

    it('omits the amount for a partial figure when nobody knows the size of the hole', () => {
      expect(
        formatSpendQualificationSuffix({ spend_partial: true, spend_missing_amount: null })
      ).toBe('')
    })

    it('marks an uncovered window as incomplete data', () => {
      expect(formatSpendQualificationSuffix({ spend_unavailable: true })).toBe('')
    })

    it('prefers the partial suffix over the unavailable one, as the more specific statement', () => {
      expect(formatSpendQualificationSuffix({ spend_partial: true, spend_unavailable: true })).toBe(
        ''
      )
    })
  })

  describe('SPEND_QUALIFICATION_FIELDS', () => {
    it('names exactly the keys readSpendQualification reads, so a screen can filter them out', () => {
      const source = Object.fromEntries(
        SPEND_QUALIFICATION_FIELDS.map((field) => [`cost_${field}`, true])
      )

      expect(readSpendQualification(source, 'cost_')).toStrictEqual({
        spend_unavailable: true,
        spend_partial: true,
        spend_missing_amount: null,
      })
    })
  })

  describe('formatQualifiedMetricValue', () => {
    const buildMetric = (overrides: Partial<Metric> = {}): Metric =>
      ({
        id: 'total_money_spent',
        label: 'Total Money Spent',
        type: ColumnType.NUMBER,
        format: MetricFormat.CURRENCY,
        value: 1234.56,
        ...overrides,
      } as Metric)

    it('appends the qualification to a currency metric', () => {
      expect(
        formatQualifiedMetricValue(buildMetric({ spend_partial: true, spend_missing_amount: 40 }))
      ).toBe('$1,234.56')
    })

    it('leaves a fully resolved currency metric unannotated', () => {
      expect(formatQualifiedMetricValue(buildMetric())).toBe('$1,234.56')
    })

    it('renders an absent currency figure as the marker rather than a zero', () => {
      expect(formatQualifiedMetricValue(buildMetric({ value: null as unknown as number }))).toBe(
        ABSENT_VALUE_MARKER
      )
    })

    it('keeps a measured zero as a zero', () => {
      expect(formatQualifiedMetricValue(buildMetric({ value: 0 }))).toBe('$0.00')
    })

    it('does not annotate a non-currency metric, which the qualification does not describe', () => {
      expect(
        formatQualifiedMetricValue(
          buildMetric({ format: undefined, value: 12, spend_unavailable: true })
        )
      ).toBe('12')
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
