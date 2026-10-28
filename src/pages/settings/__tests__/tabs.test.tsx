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
import { MemoryRouter } from 'react-router'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const flags = vi.hoisted(() => ({ marketplaceManagement: false }))

vi.mock('@/utils/featureFlags', () => ({
  isBudgetManagementEnabled: () => false,
  isUserManagementEnabled: () => false,
  isMcpEnabled: () => false,
  isCostCentersEnabled: () => false,
  isTeamsEnabled: () => false,
  isMarketplaceManagementEnabled: () => flags.marketplaceManagement,
}))

vi.mock('@/utils/enterpriseEdition', () => ({
  isEnterpriseEdition: () => false,
}))

vi.mock('@/assets/icons/lightning.svg?react', () => ({ default: () => null }))
vi.mock('@/assets/icons/profile-tab.svg?react', () => ({ default: () => null }))
vi.mock('@/assets/icons/aws.svg?react', () => ({ default: () => null }))

// Mocks required for rendering MarketplaceManagementLayout
vi.mock('valtio', () => ({
  useSnapshot: (store: unknown) => store,
  proxy: (obj: unknown) => obj,
  snapshot: (obj: unknown) => obj,
  subscribe: vi.fn(),
}))

vi.mock('@/store/marketplaceManagement', () => ({
  marketplaceManagementStore: {
    pending: { hasLoaded: false, total: 0 },
    overview: null,
    loadOverview: vi.fn(),
    refreshAuditStatus: vi.fn(),
  },
}))

vi.mock('@/pages/settings/components/SettingsLayout', () => ({
  default: ({ content }: { content: React.ReactNode }) => <>{content}</>,
}))

const getAdminChildIds = async (): Promise<string[]> => {
  const { getNavigationTabs } = await import('@/pages/settings/tabs')
  const tabs = getNavigationTabs(true, false, false, false, false)
  const adminTab = tabs.find((t) => t.id === 'administration')
  return adminTab?.children?.map((c) => c.id) ?? []
}

describe('getNavigationTabs — marketplace management feature flag', () => {
  beforeEach(() => {
    flags.marketplaceManagement = false
  })

  it('hides marketplace management when the flag is off', async () => {
    flags.marketplaceManagement = false
    const childIds = await getAdminChildIds()
    expect(childIds).not.toContain('marketplace-management-overview')
  })

  it('shows marketplace management when the flag is on', async () => {
    flags.marketplaceManagement = true
    const childIds = await getAdminChildIds()
    expect(childIds).toContain('marketplace-management-overview')
  })

  it('keeps the rest of the admin tabs when the flag is off', async () => {
    flags.marketplaceManagement = false
    const childIds = await getAdminChildIds()
    expect(childIds).toContain('projects_management')
  })
})

describe('MarketplaceManagementLayout — Settings tab', () => {
  it('renders a Settings tab in the tab strip', async () => {
    const { userStore } = await import('@/store/user')
    userStore.user = { isAdmin: true } as typeof userStore.user
    const { default: MarketplaceManagementLayout } = await import(
      '@/pages/settings/administration/marketplaceManagement/MarketplaceManagementLayout'
    )
    render(
      <MemoryRouter initialEntries={['/settings/administration/marketplace-management']}>
        <MarketplaceManagementLayout />
      </MemoryRouter>
    )
    expect(screen.getByTestId('mm-tab-settings')).toBeInTheDocument()
  })
})
