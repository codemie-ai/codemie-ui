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
import { describe, it, expect, vi } from 'vitest'

import { VendorEntityType, VendorOriginType } from '@/types/entity/vendor'

import AwsAgentCoreRuntimesSettingsPage from '../AwsAgentCoreRuntimesSettingsPage'

vi.mock('@/pages/settings/components/vendor/AwsEntitySettingsTable', () => ({
  default: ({ entityType, originType }: { entityType: string; originType: string }) => (
    <div
      data-testid="entity-settings-table"
      data-entity-type={entityType}
      data-origin-type={originType}
    />
  ),
}))

describe('AwsAgentCoreRuntimesSettingsPage', () => {
  it('renders correct title', () => {
    render(<AwsAgentCoreRuntimesSettingsPage />)
    expect(screen.getByRole('heading')).toHaveTextContent('Manage AgentCore Runtimes')
  })

  it('renders AwsEntitySettingsTable with agentcoreRuntimes entity type', () => {
    render(<AwsAgentCoreRuntimesSettingsPage />)
    const table = screen.getByTestId('entity-settings-table')
    expect(table).toHaveAttribute('data-entity-type', VendorEntityType.agentcoreRuntimes)
  })

  it('renders AwsEntitySettingsTable with AWS origin type', () => {
    render(<AwsAgentCoreRuntimesSettingsPage />)
    const table = screen.getByTestId('entity-settings-table')
    expect(table).toHaveAttribute('data-origin-type', VendorOriginType.AWS)
  })
})
