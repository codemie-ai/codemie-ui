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

import AwsAgentCoreRuntimeDetailPage from '../AwsAgentCoreRuntimeDetailPage'

const mockNavigate = vi.fn()

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ settingId: 'setting-123', runtimeId: 'runtime-abc' }),
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

vi.mock('../components/AwsAgentCoreRuntimeDetails', () => ({
  default: ({ settingId, entityId }: { settingId: string; entityId: string }) => (
    <div data-testid="runtime-details" data-setting-id={settingId} data-entity-id={entityId} />
  ),
}))

describe('AwsAgentCoreRuntimeDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders correct title', () => {
    render(<AwsAgentCoreRuntimeDetailPage />)
    expect(screen.getByRole('heading')).toHaveTextContent('Runtime Details')
  })

  it('passes settingId from route params to AwsAgentCoreRuntimeDetails', () => {
    render(<AwsAgentCoreRuntimeDetailPage />)
    expect(screen.getByTestId('runtime-details')).toHaveAttribute('data-setting-id', 'setting-123')
  })

  it('passes runtimeId from route params to AwsAgentCoreRuntimeDetails', () => {
    render(<AwsAgentCoreRuntimeDetailPage />)
    expect(screen.getByTestId('runtime-details')).toHaveAttribute('data-entity-id', 'runtime-abc')
  })

  it('navigates back to list on back', () => {
    render(<AwsAgentCoreRuntimeDetailPage />)
    fireEvent.click(screen.getByTestId('back-button'))
    expect(mockNavigate).toHaveBeenCalledWith('/settings/aws/agentcore-runtimes/setting-123', {
      replace: true,
    })
  })
})
