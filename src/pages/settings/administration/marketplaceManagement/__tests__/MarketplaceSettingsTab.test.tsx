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

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import MarketplaceSettingsTab from '../MarketplaceSettingsTab'

const ALL_SETTINGS = [
  {
    component_id: 'marketplaceThresholds',
    label: 'Marketplace Thresholds',
    fields: [],
    overridden: false,
    value: {},
  },
  {
    component_id: 'marketplaceCoreGates',
    label: 'Core Gates',
    fields: [],
    overridden: false,
    value: {},
  },
  {
    component_id: 'marketplacePolishGates',
    label: 'Polish Gates',
    fields: [],
    overridden: false,
    value: {},
  },
  {
    component_id: 'marketplaceConsolidation',
    label: 'Consolidation',
    fields: [],
    overridden: false,
    value: {},
  },
  {
    component_id: 'marketplaceSimilarity',
    label: 'Similarity',
    fields: [],
    overridden: false,
    value: {},
  },
]

const { mockIndexSettings, mockToasterError } = vi.hoisted(() => ({
  mockIndexSettings: vi.fn(),
  mockToasterError: vi.fn(),
}))

vi.mock('@/store/customerConfiguration', () => ({
  customerConfigurationStore: {
    indexSettings: mockIndexSettings,
    saveSetting: vi.fn(),
    resetSetting: vi.fn(),
  },
}))

vi.mock('@/utils/toaster', () => ({ default: { error: mockToasterError } }))

vi.mock('../../components/SettingCard', () => ({
  default: ({ setting }: { setting: { label: string; component_id: string } }) => (
    <div data-testid={`setting-card-${setting.component_id}`}>{setting.label}</div>
  ),
}))

describe('MarketplaceSettingsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIndexSettings.mockResolvedValue(ALL_SETTINGS)
  })

  it('renders a SettingCard for all four marketplace settings', async () => {
    render(<MarketplaceSettingsTab />)

    expect(await screen.findByTestId('setting-card-marketplaceThresholds')).toBeInTheDocument()
    expect(screen.getByTestId('setting-card-marketplaceCoreGates')).toBeInTheDocument()
    expect(screen.getByTestId('setting-card-marketplacePolishGates')).toBeInTheDocument()
    expect(screen.getByTestId('setting-card-marketplaceSimilarity')).toBeInTheDocument()
    expect(screen.queryByTestId('setting-card-marketplaceConsolidation')).not.toBeInTheDocument()
  })

  it('calls indexSettings on mount', async () => {
    render(<MarketplaceSettingsTab />)

    await screen.findByTestId('setting-card-marketplaceThresholds')
    expect(mockIndexSettings).toHaveBeenCalledTimes(1)
  })

  it('filters out non-marketplace settings from indexSettings results', async () => {
    mockIndexSettings.mockResolvedValue([
      ...ALL_SETTINGS,
      {
        component_id: 'someOtherSetting',
        label: 'Other',
        fields: [],
        overridden: false,
        value: {},
      },
    ])

    render(<MarketplaceSettingsTab />)

    await screen.findByTestId('setting-card-marketplaceThresholds')
    expect(screen.queryByTestId('setting-card-someOtherSetting')).not.toBeInTheDocument()
  })

  it('shows an error toast when indexSettings rejects', async () => {
    mockIndexSettings.mockRejectedValue(new Error('network failure'))

    render(<MarketplaceSettingsTab />)

    await vi.waitFor(() => {
      expect(mockToasterError).toHaveBeenCalledWith(
        'Failed to load audit settings: network failure'
      )
    })
  })
})
