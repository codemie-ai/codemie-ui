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
import { describe, it, expect, vi, beforeEach } from 'vitest'

import AnalyticsDashboardComponent from '../AnalyticsDashboard'

const mockSetSearchParams = vi.hoisted(() => vi.fn())

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useSearchParams: vi.fn(() => [
      new URLSearchParams('time_period=last_hour&tab=insights'),
      mockSetSearchParams,
    ]),
  }
})

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

describe('AnalyticsDashboardComponent', () => {
  beforeEach(() => {
    mockSetSearchParams.mockClear()
  })

  it('tab change calls setSearchParams with a function updater, not an object', () => {
    render(<AnalyticsDashboardComponent {...minimalProps} />)
    fireEvent.click(screen.getByText('CLI Insights'))
    expect(mockSetSearchParams).toHaveBeenCalledWith(expect.any(Function))
  })

  it('the updater preserves filter params and updates only tab', () => {
    render(<AnalyticsDashboardComponent {...minimalProps} />)
    fireEvent.click(screen.getByText('CLI Insights'))
    const updater = mockSetSearchParams.mock.calls[0][0] as (p: URLSearchParams) => URLSearchParams
    const result = updater(new URLSearchParams('time_period=last_hour&tab=insights'))
    expect(result.get('time_period')).toBe('last_hour')
    expect(result.get('tab')).toBe('cliInsights')
  })
})
