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

import EditIntegrationActions from '../EditIntegrationActions'

const isDeprecatedMock = vi.fn()
const getTestableMock = vi.fn()
vi.mock('@/utils/settings', () => ({
  isDeprecatedCredentialType: (t: unknown) => isDeprecatedMock(t),
  getTestableCredentialTypes: () => getTestableMock(),
}))

vi.mock('../TestIntegration', () => ({
  default: (props: { credentialType: string }) => (
    <div data-testid="test-integration">TEST:{props.credentialType}</div>
  ),
}))

const baseProps = {
  credentialType: 'Jira',
  credentialValues: { url: 'https://example.com' },
  settingId: 'setting-1',
  onSave: vi.fn(),
}

describe('EditIntegrationActions', () => {
  beforeEach(() => {
    isDeprecatedMock.mockReset()
    getTestableMock.mockReset()
    baseProps.onSave = vi.fn()
  })

  it('renders nothing when the credential type is deprecated', () => {
    isDeprecatedMock.mockReturnValue(true)
    getTestableMock.mockReturnValue(['jira'])
    const { container } = render(<EditIntegrationActions {...baseProps} />)
    expect(container.firstChild).toBeNull()
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument()
    expect(screen.queryByTestId('test-integration')).not.toBeInTheDocument()
  })

  it('renders Test + Save when the credential type is testable', () => {
    isDeprecatedMock.mockReturnValue(false)
    getTestableMock.mockReturnValue(['jira'])
    render(<EditIntegrationActions {...baseProps} />)
    expect(screen.getByTestId('test-integration')).toHaveTextContent('TEST:jira')
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })

  it('renders Save only when the credential type is not testable', () => {
    isDeprecatedMock.mockReturnValue(false)
    getTestableMock.mockReturnValue(['confluence'])
    render(<EditIntegrationActions {...baseProps} />)
    expect(screen.queryByTestId('test-integration')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })

  it('invokes onSave when the Save button is clicked', () => {
    isDeprecatedMock.mockReturnValue(false)
    getTestableMock.mockReturnValue([])
    render(<EditIntegrationActions {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(baseProps.onSave).toHaveBeenCalledTimes(1)
  })

  it('lowercases the credential type before checking testability', () => {
    isDeprecatedMock.mockReturnValue(false)
    getTestableMock.mockReturnValue(['jira'])
    render(<EditIntegrationActions {...baseProps} credentialType="JIRA" />)
    expect(screen.getByTestId('test-integration')).toHaveTextContent('TEST:jira')
  })
})
