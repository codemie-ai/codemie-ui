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

const adminChildIds = async (isAdmin: boolean, isMaintainer: boolean, isProjectAdmin = false) => {
  const { getNavigationTabs } = await import('@/pages/settings/tabs')
  const tabs = getNavigationTabs(isAdmin, false, isMaintainer, isProjectAdmin, false)
  const adminTab = tabs.find((t) => t.id === 'administration')
  return adminTab?.children?.map((c) => c.id) ?? []
}

describe('Customer Configuration tab visibility', () => {
  it('an admin sees the tab', async () => {
    expect(await adminChildIds(true, false)).toContain('customer_configuration')
  })

  // the write guard admits maintainers, so navigation must too
  it('a maintainer who is not an admin sees the tab', async () => {
    expect(await adminChildIds(false, true)).toContain('customer_configuration')
  })

  it('a project admin does not see the tab', async () => {
    expect(await adminChildIds(false, false, true)).not.toContain('customer_configuration')
  })

  it('a regular user does not see the tab', async () => {
    expect(await adminChildIds(false, false)).not.toContain('customer_configuration')
  })
})
