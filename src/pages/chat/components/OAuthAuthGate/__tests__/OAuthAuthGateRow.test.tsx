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

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { oauthConnectNotifiedStore } from '@/store/oauthConnectNotified'
import { OAuthProvider, OAuthStatus } from '@/types/entity/dataSource'

import OAuthAuthGateRow from '../OAuthAuthGateRow'

const hookState = {
  status: OAuthStatus.IDLE,
  username: '',
  error: '',
  handleConnect: vi.fn(),
  refreshStatus: vi.fn().mockResolvedValue(undefined),
}
// A hook-shaped stand-in for use*Connect, injected via the useConnect prop.
const useFakeConnect = () => hookState

afterEach(() => {
  hookState.status = OAuthStatus.IDLE
  hookState.username = ''
  oauthConnectNotifiedStore.reset()
  vi.clearAllMocks()
})

describe.each([
  [OAuthProvider.GITLAB, 'gitlab-auth-gate-row', /sign in with gitlab/i],
  [OAuthProvider.JIRA, 'jira-auth-gate-row', /sign in with jira/i],
  [OAuthProvider.CONFLUENCE, 'confluence-auth-gate-row', /sign in with confluence/i],
])('OAuthAuthGateRow (%s)', (provider, rowTestId, signInLabel) => {
  it('renders the integration name and a provider sign-in button', () => {
    render(
      <OAuthAuthGateRow
        provider={provider}
        settingId="s1"
        integrationName="Team Integration"
        useConnect={useFakeConnect}
        onConnected={vi.fn()}
      />
    )
    expect(screen.getByTestId(rowTestId)).toBeInTheDocument()
    expect(screen.getByText('Team Integration')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: signInLabel }))
    expect(hookState.handleConnect).toHaveBeenCalled()
  })

  it('seeds the current connection state on mount', () => {
    render(
      <OAuthAuthGateRow
        provider={provider}
        settingId="s1"
        integrationName="Team Integration"
        useConnect={useFakeConnect}
        onConnected={vi.fn()}
      />
    )
    expect(hookState.refreshStatus).toHaveBeenCalled()
  })

  it('calls onConnected once when status becomes SUCCESS', async () => {
    hookState.status = OAuthStatus.SUCCESS
    hookState.username = 'groot'
    const onConnected = vi.fn()
    render(
      <OAuthAuthGateRow
        provider={provider}
        settingId="s1"
        integrationName="Team Integration"
        useConnect={useFakeConnect}
        onConnected={onConnected}
      />
    )
    await waitFor(() => expect(onConnected).toHaveBeenCalledTimes(1))
  })
})
