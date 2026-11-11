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

import { beforeEach, describe, it, expect, vi } from 'vitest'

const flags = vi.hoisted(() => ({ budget: true, enterprise: false }))

vi.mock('@/utils/featureFlags', () => ({
  isBudgetManagementEnabled: () => flags.budget,
  isUserManagementEnabled: () => true,
  isMcpEnabled: () => false,
  isCostCentersEnabled: () => false,
  isTeamsEnabled: () => false,
  isMarketplaceManagementEnabled: () => false,
}))

vi.mock('@/utils/enterpriseEdition', () => ({
  isEnterpriseEdition: () => flags.enterprise,
}))

vi.mock('@/assets/icons/lightning.svg?react', () => ({ default: () => null }))
vi.mock('@/assets/icons/profile-tab.svg?react', () => ({ default: () => null }))
vi.mock('@/assets/icons/aws.svg?react', () => ({ default: () => null }))

const adminChildIds = async (): Promise<string[]> => {
  const { getNavigationTabs } = await import('@/pages/settings/tabs')
  const tabs = getNavigationTabs(true, false, false, false, false)
  return tabs.find((t) => t.id === 'administration')?.children?.map((c) => c.id) ?? []
}

describe('getNavigationTabs — admin role Budget Management visibility', () => {
  beforeEach(() => {
    flags.budget = true
    flags.enterprise = false
  })

  it('admin sees Budgets management without Enterprise Edition', async () => {
    expect(await adminChildIds()).toContain('budgets_management')
  })

  it('admin does not see Categories or Providers management without Enterprise Edition', async () => {
    const childIds = await adminChildIds()
    expect(childIds).not.toContain('categories_management')
    expect(childIds).not.toContain('providers_management')
  })

  it('admin sees Categories and Providers management with Enterprise Edition', async () => {
    flags.enterprise = true
    const childIds = await adminChildIds()
    expect(childIds).toContain('categories_management')
    expect(childIds).toContain('providers_management')
  })

  it('admin does not see Budgets management when the feature flag is off', async () => {
    flags.budget = false
    expect(await adminChildIds()).not.toContain('budgets_management')
  })
})
