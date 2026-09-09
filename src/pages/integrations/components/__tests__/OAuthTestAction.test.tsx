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

import { userSettingsStore } from '@/store/userSettings'

import OAuthTestAction from '../OAuthTestAction'

// Capture the `initiate` callback handed to OAuthTestButton so tests can invoke it and assert which
// store method the action routes to, without driving the real OAuth popup/poll flow.
let capturedInitiate: (() => Promise<unknown>) | undefined
vi.mock('../SettingsForm/OAuthTestButton', () => ({
  default: ({ provider, initiate }: { provider: string; initiate: () => Promise<unknown> }) => {
    capturedInitiate = initiate
    return <div data-testid="oauth-test-button">{provider}</div>
  },
}))

vi.mock('@/store/userSettings', () => ({
  userSettingsStore: {
    initiateGitLabOAuth: vi.fn().mockResolvedValue({ auth_url: 'u', state: 's' }),
    initiateJiraOAuth: vi.fn().mockResolvedValue({ auth_url: 'u', state: 's' }),
    initiateConfluenceOAuth: vi.fn().mockResolvedValue({ auth_url: 'u', state: 's' }),
    connectGitLabOAuth: vi.fn().mockResolvedValue({ auth_url: 'u', state: 's', setting_id: 'x' }),
    connectJiraOAuth: vi.fn().mockResolvedValue({ auth_url: 'u', state: 's', setting_id: 'x' }),
    connectConfluenceOAuth: vi
      .fn()
      .mockResolvedValue({ auth_url: 'u', state: 's', setting_id: 'x' }),
  },
}))

const MASKED = '**********'

describe('OAuthTestAction', () => {
  beforeEach(() => {
    capturedInitiate = undefined
    vi.clearAllMocks()
  })

  it.each([
    ['gitlaboauth', 'GitLab'],
    ['jiraoauth', 'Jira'],
    ['confluenceoauth', 'Confluence'],
  ])('renders the test button for the variant credential type %s', (credentialType, provider) => {
    render(<OAuthTestAction credentialType={credentialType} credentialValues={{}} />)
    expect(screen.getByTestId('oauth-test-button')).toHaveTextContent(provider)
  })

  it.each([
    ['git', 'GitLab'],
    ['jira', 'Jira'],
    ['confluence', 'Confluence'],
  ])(
    'renders the test button for base type %s carrying the auth_type=oauth marker',
    (credentialType, provider) => {
      render(
        <OAuthTestAction
          credentialType={credentialType}
          credentialValues={{ auth_type: 'oauth' }}
        />
      )
      expect(screen.getByTestId('oauth-test-button')).toHaveTextContent(provider)
    }
  )

  it('renders nothing for a base type without the oauth marker (PAT)', () => {
    const { container } = render(
      <OAuthTestAction credentialType="jira" credentialValues={{ token: 'x' }} />
    )
    expect(screen.queryByTestId('oauth-test-button')).toBeNull()
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing for a non-OAuth credential type', () => {
    const { container } = render(<OAuthTestAction credentialType="webhook" credentialValues={{}} />)
    expect(screen.queryByTestId('oauth-test-button')).toBeNull()
    expect(container).toBeEmptyDOMElement()
  })

  it('routes saved masked-secret Jira OAuth (base type + marker) to connect-with-test', async () => {
    render(
      <OAuthTestAction
        credentialType="jira"
        settingId="setting-1"
        credentialValues={{
          auth_type: 'oauth',
          client_id: 'id',
          client_secret: MASKED,
          callback_base_url: 'https://h',
        }}
      />
    )
    await capturedInitiate!()
    expect(userSettingsStore.connectJiraOAuth).toHaveBeenCalledWith('setting-1', true)
    expect(userSettingsStore.initiateJiraOAuth).not.toHaveBeenCalled()
  })

  it('routes saved masked-secret GitLab OAuth (base type + marker) to connect-with-test', async () => {
    render(
      <OAuthTestAction
        credentialType="git"
        settingId="gl-1"
        credentialValues={{
          auth_type: 'oauth',
          client_id: 'id',
          client_secret: MASKED,
          instance_url: 'https://gl',
        }}
      />
    )
    await capturedInitiate!()
    expect(userSettingsStore.connectGitLabOAuth).toHaveBeenCalledWith('gl-1', true)
    expect(userSettingsStore.initiateGitLabOAuth).not.toHaveBeenCalled()
  })

  it('uses initiate with form values when the user typed a fresh client_secret', async () => {
    render(
      <OAuthTestAction
        credentialType="confluenceoauth"
        settingId="setting-1"
        credentialValues={{
          client_id: 'id',
          client_secret: 'real-secret',
          callback_base_url: 'https://h',
        }}
      />
    )
    await capturedInitiate!()
    expect(userSettingsStore.initiateConfluenceOAuth).toHaveBeenCalledWith({
      client_id: 'id',
      client_secret: 'real-secret',
      callback_base_url: 'https://h',
    })
    expect(userSettingsStore.connectConfluenceOAuth).not.toHaveBeenCalled()
  })

  it('uses initiate when there is no settingId (create flow), even if the secret looks masked', async () => {
    render(
      <OAuthTestAction
        credentialType="jiraoauth"
        credentialValues={{
          client_id: 'id',
          client_secret: MASKED,
          callback_base_url: 'https://h',
        }}
      />
    )
    await capturedInitiate!()
    expect(userSettingsStore.initiateJiraOAuth).toHaveBeenCalled()
    expect(userSettingsStore.connectJiraOAuth).not.toHaveBeenCalled()
  })
})
