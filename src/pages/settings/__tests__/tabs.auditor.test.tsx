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

import { describe, it, expect, vi } from 'vitest'

vi.mock('@/utils/featureFlags', () => ({
  isBudgetManagementEnabled: () => true,
  isUserManagementEnabled: () => true,
  isMcpEnabled: () => false,
  isCostCentersEnabled: () => false,
  isTeamsEnabled: () => false,
  isMarketplaceManagementEnabled: () => true,
}))

vi.mock('@/utils/enterpriseEdition', () => ({
  isEnterpriseEdition: () => false,
}))

vi.mock('@/assets/icons/lightning.svg?react', () => ({ default: () => null }))
vi.mock('@/assets/icons/profile-tab.svg?react', () => ({ default: () => null }))
vi.mock('@/assets/icons/aws.svg?react', () => ({ default: () => null }))

describe('getNavigationTabs — auditor role', () => {
  it('auditor sees Projects, Users, and Budgets under Administration', async () => {
    const { getNavigationTabs } = await import('@/pages/settings/tabs')
    const tabs = getNavigationTabs(false, false, false, false, true)
    const adminTab = tabs.find((t) => t.id === 'administration')
    expect(adminTab).toBeDefined()
    const childIds = adminTab!.children?.map((c) => c.id) ?? []
    expect(childIds).toContain('projects_management')
    expect(childIds).toContain('users_management')
    expect(childIds).toContain('budgets_management')
  })

  it('auditor does not see Activity Events', async () => {
    const { getNavigationTabs } = await import('@/pages/settings/tabs')
    const tabs = getNavigationTabs(false, false, false, false, true)
    const adminTab = tabs.find((t) => t.id === 'administration')
    const childIds = adminTab?.children?.map((c) => c.id) ?? []
    expect(childIds).not.toContain('activity_events')
  })

  it('regular user without any role does not see Users or Budgets tabs', async () => {
    const { getNavigationTabs } = await import('@/pages/settings/tabs')
    const tabs = getNavigationTabs(false, false, false, false, false)
    const adminTab = tabs.find((t) => t.id === 'administration')
    const childIds = adminTab?.children?.map((c) => c.id) ?? []
    expect(childIds).not.toContain('users_management')
    expect(childIds).not.toContain('budgets_management')
  })

  it('admin sees Users management even without Enterprise Edition', async () => {
    const { getNavigationTabs } = await import('@/pages/settings/tabs')
    const tabs = getNavigationTabs(true, false, false, false, false)
    const adminTab = tabs.find((t) => t.id === 'administration')
    const childIds = adminTab?.children?.map((c) => c.id) ?? []
    expect(childIds).toContain('projects_management')
    expect(childIds).toContain('users_management')
  })

  it('maintainer sees Users management even without Enterprise Edition', async () => {
    const { getNavigationTabs } = await import('@/pages/settings/tabs')
    // isMaintainer=true; SettingsLayout also ORs isMaintainer into the isAdmin param
    const tabs = getNavigationTabs(true, false, true, false, false)
    const adminTab = tabs.find((t) => t.id === 'administration')
    const childIds = adminTab?.children?.map((c) => c.id) ?? []
    expect(childIds).toContain('users_management')
  })

  it('Users management is hidden for all roles when the feature flag is off', async () => {
    vi.resetModules()
    vi.doMock('@/utils/featureFlags', () => ({
      isBudgetManagementEnabled: () => true,
      isUserManagementEnabled: () => false,
      isMcpEnabled: () => false,
      isCostCentersEnabled: () => false,
      isTeamsEnabled: () => false,
      // Added alongside isMarketplaceManagementEnabled's introduction to
      // getNavigationTabs (tabs.tsx) — this local mock predated that change
      // and was never updated, so every call here threw instead of testing
      // the Users-management-hidden behavior it's named for.
      isMarketplaceManagementEnabled: () => false,
    }))
    const { getNavigationTabs } = await import('@/pages/settings/tabs')
    const adminChildIds =
      getNavigationTabs(true, false, false, false, false)
        .find((t) => t.id === 'administration')
        ?.children?.map((c) => c.id) ?? []
    const auditorChildIds =
      getNavigationTabs(false, false, false, false, true)
        .find((t) => t.id === 'administration')
        ?.children?.map((c) => c.id) ?? []
    expect(adminChildIds).not.toContain('users_management')
    expect(auditorChildIds).not.toContain('users_management')
  })

  describe('Cost centers tab (EPMCDME-17380)', () => {
    const loadChildIds = async (flags: { costCenters: boolean }, args: boolean[]) => {
      vi.resetModules()
      vi.doMock('@/utils/featureFlags', () => ({
        isBudgetManagementEnabled: () => true,
        isUserManagementEnabled: () => true,
        isMcpEnabled: () => false,
        isCostCentersEnabled: () => flags.costCenters,
        isTeamsEnabled: () => false,
        isMarketplaceManagementEnabled: () => true,
      }))
      const { getNavigationTabs } = await import('@/pages/settings/tabs')
      const [isAdmin, isMaintainer, isAuditor] = args
      // SettingsLayout ORs isMaintainer into the isAdmin param
      const tabs = getNavigationTabs(isAdmin || isMaintainer, false, isMaintainer, false, isAuditor)
      return tabs.find((t) => t.id === 'administration')?.children?.map((c) => c.id) ?? []
    }

    it('auditor sees Cost centers management when the feature flag is on', async () => {
      const childIds = await loadChildIds({ costCenters: true }, [false, false, true])
      expect(childIds).toContain('cost_centers_management')
    })

    it('auditor sees Cost centers management in the same order as admin', async () => {
      const auditorIds = await loadChildIds({ costCenters: true }, [false, false, true])
      const adminIds = await loadChildIds({ costCenters: true }, [true, false, false])
      const auditorOrder = auditorIds.filter((id) =>
        ['cost_centers_management', 'projects_management', 'users_management'].includes(id)
      )
      const adminOrder = adminIds.filter((id) =>
        ['cost_centers_management', 'projects_management', 'users_management'].includes(id)
      )
      expect(auditorOrder).toEqual(adminOrder)
    })

    it('auditor does not see Cost centers management when the feature flag is off', async () => {
      const childIds = await loadChildIds({ costCenters: false }, [false, false, true])
      expect(childIds).not.toContain('cost_centers_management')
    })

    it('admin still sees Cost centers management', async () => {
      const childIds = await loadChildIds({ costCenters: true }, [true, false, false])
      expect(childIds).toContain('cost_centers_management')
    })

    it('user with no admin, maintainer or auditor role does not see Cost centers management', async () => {
      const childIds = await loadChildIds({ costCenters: true }, [false, false, false])
      expect(childIds).not.toContain('cost_centers_management')
    })
  })
})
