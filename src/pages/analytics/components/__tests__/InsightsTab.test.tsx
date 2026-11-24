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

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { FEATURE_FLAGS } from '@/constants/featureFlags'
import { useFeatureFlag } from '@/hooks/useFeatureFlags'

import InsightsTab from '../InsightsTab'

vi.mock('@/hooks/useFeatureFlags', () => ({
  useFeatureFlag: vi.fn(),
}))

vi.mock('@/components/form/Select', () => ({
  default: () => <div />,
}))

vi.mock('../widgets/DonutChartWidget', () => ({
  default: () => <div />,
}))

vi.mock('../widgets/MetricsWidget', () => ({
  default: () => <div />,
}))

vi.mock('../widgets/StackedBarChartWidget', () => ({
  default: () => <div />,
}))

vi.mock('../widgets/TableWidget', () => ({
  default: () => <div />,
}))

vi.mock('../RoutingAnalyticsSection', () => ({
  default: () => <div data-testid="routing-analytics-section" />,
}))

vi.mock('../HeadroomAnalyticsSection', () => ({
  default: () => <div data-testid="headroom-analytics-section" />,
}))

afterEach(cleanup)

const enableOnly = (enabledFlag: string) =>
  vi.mocked(useFeatureFlag).mockImplementation((name: string) => [name === enabledFlag, true])

describe('InsightsTab', () => {
  it('hides routing analytics when its feature flag is disabled', () => {
    vi.mocked(useFeatureFlag).mockReturnValue([false, true])

    render(<InsightsTab filters={{}} />)

    expect(screen.queryByTestId('routing-analytics-section')).not.toBeInTheDocument()
  })

  it('shows routing analytics when its feature flag is enabled', () => {
    vi.mocked(useFeatureFlag).mockReturnValue([true, true])

    render(<InsightsTab filters={{}} />)

    expect(screen.getByTestId('routing-analytics-section')).toBeInTheDocument()
  })

  it('shows Context Compression only when the Headroom flag is on', () => {
    enableOnly(FEATURE_FLAGS.HEADROOM)

    render(<InsightsTab filters={{}} />)

    expect(screen.getByText('Context Compression')).toBeInTheDocument()
    expect(screen.getByTestId('headroom-analytics-section')).toBeInTheDocument()
    expect(screen.queryByTestId('routing-analytics-section')).not.toBeInTheDocument()
  })

  it('hides Context Compression when only the routing flag is on', () => {
    enableOnly(FEATURE_FLAGS.ROUTING_ANALYTICS)

    render(<InsightsTab filters={{}} />)

    expect(screen.getByTestId('routing-analytics-section')).toBeInTheDocument()
    expect(screen.queryByText('Context Compression')).not.toBeInTheDocument()
    expect(screen.queryByTestId('headroom-analytics-section')).not.toBeInTheDocument()
  })
})
