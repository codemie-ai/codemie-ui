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

import { VendorEntityType, VendorOriginType } from '@/types/entity/vendor'

import AwsAgentCoreRuntimesListPage from '../AwsAgentCoreRuntimesListPage'

const mockNavigate = vi.fn()

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ settingId: 'setting-123' }),
  }
})

vi.mock('@/pages/settings/components/SettingsLayout', () => ({
  default: ({ contentTitle, content, onBack }: any) => (
    <div>
      <h1>{contentTitle}</h1>
      {onBack && (
        <button onClick={onBack} data-testid="back-button">
          Back
        </button>
      )}
      <div>{content}</div>
    </div>
  ),
}))

vi.mock('@/pages/settings/components/vendor/AwsEntityList', () => ({
  default: ({ settingId, entityType, originType, renderEntityMeta }: any) => (
    <div
      data-testid="entity-list"
      data-setting-id={settingId}
      data-entity-type={entityType}
      data-origin-type={originType}
    >
      {renderEntityMeta?.({ status: 'PREPARED', version: '1.0' })}
      {renderEntityMeta?.({ status: 'CREATING' })}
    </div>
  ),
}))

describe('AwsAgentCoreRuntimesListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders correct title', () => {
    render(<AwsAgentCoreRuntimesListPage />)
    expect(screen.getByRole('heading')).toHaveTextContent('AgentCore Runtimes')
  })

  it('passes settingId from route params to AwsEntityList', () => {
    render(<AwsAgentCoreRuntimesListPage />)
    expect(screen.getByTestId('entity-list')).toHaveAttribute('data-setting-id', 'setting-123')
  })

  it('passes agentcoreRuntimes entity type to AwsEntityList', () => {
    render(<AwsAgentCoreRuntimesListPage />)
    expect(screen.getByTestId('entity-list')).toHaveAttribute(
      'data-entity-type',
      VendorEntityType.agentcoreRuntimes
    )
  })

  it('passes AWS origin type to AwsEntityList', () => {
    render(<AwsAgentCoreRuntimesListPage />)
    expect(screen.getByTestId('entity-list')).toHaveAttribute(
      'data-origin-type',
      VendorOriginType.AWS
    )
  })

  it('navigates to settings list on back', () => {
    render(<AwsAgentCoreRuntimesListPage />)
    fireEvent.click(screen.getByTestId('back-button'))
    expect(mockNavigate).toHaveBeenCalledWith('/settings/aws/agentcore-runtimes', { replace: true })
  })

  it('renders Ready badge for PREPARED runtime status', () => {
    render(<AwsAgentCoreRuntimesListPage />)
    expect(screen.getByText('Ready')).toBeInTheDocument()
  })

  it('renders Not Ready badge for non-PREPARED runtime status', () => {
    render(<AwsAgentCoreRuntimesListPage />)
    expect(screen.getByText('Not Ready')).toBeInTheDocument()
  })

  it('renders version badge when version is present', () => {
    render(<AwsAgentCoreRuntimesListPage />)
    expect(screen.getByText('v1.0')).toBeInTheDocument()
  })
})
