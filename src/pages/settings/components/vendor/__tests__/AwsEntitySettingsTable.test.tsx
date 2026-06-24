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

import { awsVendorStore } from '@/store/vendor'
import { VendorEntityType, VendorOriginType } from '@/types/entity/vendor'

import AwsEntitySettingsTable from '../AwsEntitySettingsTable'

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: () => ({
    push: vi.fn(),
    currentRoute: { value: { path: '/settings/aws/agentcore-runtimes' } },
  }),
}))

vi.mock('@/store/vendor', () => ({
  awsVendorStore: {
    vendorSettings: [],
    vendorSettingsPagination: { page: 0, perPage: 10, total: 0 },
    loading: { settings: false, entities: false },
    getVendorSettings: vi.fn(),
    getVendorEntities: vi.fn(),
  },
}))

vi.mock('valtio', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...(actual as object),
    useSnapshot: (store: unknown) => store,
  }
})

describe('AwsEntitySettingsTable — agentcoreRuntimes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders "Manage" button column for agentcoreRuntimes entity type', () => {
    Object.assign(awsVendorStore, {
      vendorSettings: [
        {
          setting_id: 'setting-1',
          setting_name: 'My AWS',
          project: 'Project A',
          entities: ['runtime-1'],
          invalid: false,
        },
      ],
      loading: { settings: false, entities: false },
    })

    render(
      <AwsEntitySettingsTable
        originType={VendorOriginType.AWS}
        entityType={VendorEntityType.agentcoreRuntimes}
      />
    )

    expect(screen.getByText('Manage')).toBeInTheDocument()
  })

  it('calls getVendorSettings with agentcoreRuntimes entity type on mount', () => {
    render(
      <AwsEntitySettingsTable
        originType={VendorOriginType.AWS}
        entityType={VendorEntityType.agentcoreRuntimes}
      />
    )

    expect(awsVendorStore.getVendorSettings).toHaveBeenCalledWith(
      VendorOriginType.AWS,
      VendorEntityType.agentcoreRuntimes,
      0,
      expect.any(Number)
    )
  })
})
