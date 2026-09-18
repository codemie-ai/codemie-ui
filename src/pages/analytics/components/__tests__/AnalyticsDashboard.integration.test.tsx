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

import { render, screen, fireEvent } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, it, expect, vi } from 'vitest'

import AnalyticsDashboardComponent from '../AnalyticsDashboard'

// No vi.mock('react-router') — real useSearchParams is required

vi.mock('valtio', () => ({
  useSnapshot: vi.fn((s: unknown) => s),
  proxy: (o: unknown) => o,
  subscribe: vi.fn(),
}))

vi.mock('@/store/analytics', () => ({
  analyticsStore: {
    dashboards: [],
    aiAdoptionConfig: null,
    loading: {},
    error: {},
    fetchAiAdoptionConfig: vi.fn().mockResolvedValue(null),
    fetchAiAdoptionOverview: vi.fn().mockResolvedValue(null),
  },
}))

vi.mock('@/hooks/useAiAdoptionConfig', () => ({
  useAiAdoptionConfig: () => ({
    aiAdoptionConfig: null,
    loading: {},
    error: {},
    editingConfig: false,
    validationErrors: {},
    showResetConfirmation: false,
    handleCancel: vi.fn(),
    handleSaveMaturity: vi.fn(),
    handleSaveUserEngagement: vi.fn(),
    handleSaveAssetReusability: vi.fn(),
    handleSaveExpertiseDistribution: vi.fn(),
    handleSaveFeatureAdoption: vi.fn(),
    handleReset: vi.fn(),
    handleResetConfirm: vi.fn(),
    handleResetCancel: vi.fn(),
    updateNestedValue: vi.fn(),
  }),
}))

vi.mock('@/components/Tabs/Tabs', () => ({
  default: ({ tabs, onChange }: any) => (
    <div>
      {tabs.map((t: any) => (
        <button key={t.id} onClick={() => onChange(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  ),
}))

vi.mock('../InsightsTab', () => ({ default: () => null }))
vi.mock('../CLIInsightsTab', () => ({ default: () => null }))
vi.mock('../AIAdoptionTab', () => ({ default: () => null }))
vi.mock('../leaderboard/LeaderboardTab', () => ({ default: () => null }))
vi.mock('../CustomDashboard', () => ({ default: () => null }))
vi.mock('../cli-analytics/CliAnalyticsTab', () => ({ default: () => null }))
vi.mock('../InfoNotice', () => ({ default: () => null }))
vi.mock('@/components/ConfirmationModal/ConfirmationModal', () => ({ default: () => null }))
vi.mock('@/components/Popup', () => ({ default: () => null }))
vi.mock('@/pages/settings/administration/components/AiAdoptionConfigView', () => ({
  default: () => null,
}))

const minimalProps = {
  activeTab: 'insights',
  isConfigVisible: false,
  onHideConfig: vi.fn(),
  filters: { time_period: 'last_hour' } as any,
  isAdoptionEnabled: false,
  isLeaderboardEnabled: false,
  isCustomizationEnabled: false,
  isCliAnalyticsEnabled: false,
}

describe('AnalyticsDashboardComponent integration', () => {
  it('tab change preserves existing filter params in the real router URL', () => {
    const router = createMemoryRouter(
      [{ path: '/analytics', element: <AnalyticsDashboardComponent {...minimalProps} /> }],
      { initialEntries: ['/analytics?time_period=last_hour&tab=insights'] }
    )
    render(<RouterProvider router={router} />)
    fireEvent.click(screen.getByText('CLI Insights'))
    const params = new URLSearchParams(router.state.location.search)
    expect(params.get('time_period')).toBe('last_hour')
    expect(params.get('tab')).toBe('cliInsights')
  })
})
