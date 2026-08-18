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

  it('auditor does not see Activity Events or Cost Centers', async () => {
    const { getNavigationTabs } = await import('@/pages/settings/tabs')
    const tabs = getNavigationTabs(false, false, false, false, true)
    const adminTab = tabs.find((t) => t.id === 'administration')
    const childIds = adminTab?.children?.map((c) => c.id) ?? []
    expect(childIds).not.toContain('activity_events')
    expect(childIds).not.toContain('cost_centers_management')
  })

  it('regular user without any role does not see Users or Budgets tabs', async () => {
    const { getNavigationTabs } = await import('@/pages/settings/tabs')
    const tabs = getNavigationTabs(false, false, false, false, false)
    const adminTab = tabs.find((t) => t.id === 'administration')
    const childIds = adminTab?.children?.map((c) => c.id) ?? []
    expect(childIds).not.toContain('users_management')
    expect(childIds).not.toContain('budgets_management')
  })

  it('admin branch is unchanged — admin still sees all enterprise tabs (non-regression)', async () => {
    const { getNavigationTabs } = await import('@/pages/settings/tabs')
    const tabs = getNavigationTabs(true, false, false, false, false)
    const adminTab = tabs.find((t) => t.id === 'administration')
    const childIds = adminTab?.children?.map((c) => c.id) ?? []
    expect(childIds).toContain('projects_management')
    expect(childIds).not.toContain('users_management')
  })
})
