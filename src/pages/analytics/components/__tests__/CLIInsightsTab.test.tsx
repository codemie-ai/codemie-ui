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

import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { FEATURE_FLAGS } from '@/constants/featureFlags'
import type { AnalyticsQueryParams } from '@/types/analytics'

import CLIInsightsTab from '../CLIInsightsTab'

const flags = vi.hoisted(() => ({ usageAttribution: [false, true] as [boolean, boolean] }))

vi.mock('@/hooks/useFeatureFlags', () => ({
  useFeatureFlag: vi.fn((name: string) =>
    name === 'features:usageAttribution' ? flags.usageAttribution : [false, true]
  ),
}))

vi.mock('../widgets/BarChartWidget', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}))

vi.mock('../widgets/DonutChartWidget', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}))

vi.mock('../widgets/MetricsWidget', () => ({ default: () => null }))

vi.mock('../widgets/TableWidget', () => ({
  default: ({ title, hiddenColumns }: { title: string; hiddenColumns?: string[] }) => (
    <div>{`${title} hidden:${(hiddenColumns ?? []).join(',')}`}</div>
  ),
}))

vi.mock('../cliInsights/EnrichedUserSection', () => ({ default: () => null }))

vi.mock('../cliInsights/CLIInsightsUserDetailsModal', () => ({
  default: ({ showClassification }: { showClassification?: boolean }) => (
    <div>{`popup classification:${String(showClassification)}`}</div>
  ),
}))

const filters = { time_period: 'last_30_days' } as AnalyticsQueryParams

const CLASSIFICATION_WIDGETS = [
  'User Classification Distribution',
  'Cost by User Classification',
  'Project Classification Distribution',
  'Cost by Project Classification',
]

describe('CLIInsightsTab classification', () => {
  beforeEach(() => {
    flags.usageAttribution = [false, true]
  })

  it('shows its classification where Usage Attribution is off', () => {
    render(<CLIInsightsTab filters={filters} />)

    expect(screen.getByText('Classification')).toBeInTheDocument()
    CLASSIFICATION_WIDGETS.forEach((title) => expect(screen.getByText(title)).toBeInTheDocument())
    expect(screen.getByText('Top Spenders hidden:')).toBeInTheDocument()
    expect(screen.getByText('popup classification:true')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open Usage Attribution' })).not.toBeInTheDocument()
  })

  it('leaves the classification to Usage Attribution where it is on', () => {
    flags.usageAttribution = [true, true]
    const onOpen = vi.fn()
    render(<CLIInsightsTab filters={filters} onOpenUsageAttribution={onOpen} />)

    expect(screen.getByText('Top Spend')).toBeInTheDocument()
    CLASSIFICATION_WIDGETS.forEach((title) =>
      expect(screen.queryByText(title)).not.toBeInTheDocument()
    )
    expect(screen.getByText('Top Users by Cost')).toBeInTheDocument()
    expect(screen.getByText('Top Projects by Cost')).toBeInTheDocument()
    expect(screen.getByText('Top Spenders hidden:classification')).toBeInTheDocument()
    expect(screen.getByText('All Users hidden:classification')).toBeInTheDocument()
    expect(screen.getByText('popup classification:false')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Open Usage Attribution' }))
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('offers no link to viewers who cannot open Usage Attribution', () => {
    flags.usageAttribution = [true, true]
    render(<CLIInsightsTab filters={filters} />)

    expect(screen.queryByText('Cost by Project Classification')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open Usage Attribution' })).not.toBeInTheDocument()
  })

  it('shows no classification before the flag is known, so nothing is fetched for nothing', () => {
    flags.usageAttribution = [false, false]
    render(<CLIInsightsTab filters={filters} />)

    CLASSIFICATION_WIDGETS.forEach((title) =>
      expect(screen.queryByText(title)).not.toBeInTheDocument()
    )
    expect(screen.getByText('Top Users by Cost')).toBeInTheDocument()
  })

  it('reads the Usage Attribution flag', () => {
    expect(FEATURE_FLAGS.USAGE_ATTRIBUTION).toBe('features:usageAttribution')
  })
})
