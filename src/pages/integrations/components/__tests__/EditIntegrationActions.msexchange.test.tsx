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
import { describe, it, expect, vi, beforeEach } from 'vitest'

import EditIntegrationActions from '../EditIntegrationActions'

const { testSettingMock, toasterMock } = vi.hoisted(() => ({
  testSettingMock: vi.fn(),
  toasterMock: { info: vi.fn(), error: vi.fn() },
}))

vi.mock('@/store/userSettings', () => ({
  userSettingsStore: {
    get testSetting() {
      return testSettingMock
    },
  },
}))
vi.mock('../OAuthTestAction', () => ({ default: () => null }))
vi.mock('@/utils/toaster', () => ({ default: toasterMock }))

const VALUES = {
  oauth_azure: { auth_type: 'oauth_azure', mailbox: 'a@b.com', oauth_tenant_id: 't' },
  ntlm: { auth_type: 'ntlm', mailbox: 'a@b.com', ews_url: 'https://ews' },
}

describe('EditIntegrationActions with Microsoft Exchange', () => {
  beforeEach(() => {
    testSettingMock.mockReset()
    toasterMock.info.mockReset()
    toasterMock.error.mockReset()
  })

  const renderFor = (authType: keyof typeof VALUES) =>
    render(
      <EditIntegrationActions
        credentialType="MSExchange"
        credentialValues={VALUES[authType]}
        settingId="s1"
        onSave={vi.fn()}
      />
    )

  it.each(['oauth_azure', 'ntlm'] as const)('runs the test and toasts for %s', async (authType) => {
    testSettingMock.mockResolvedValue({
      success: true,
      message: 'Connection and Inbox access verified.',
    })
    renderFor(authType)

    fireEvent.click(screen.getByRole('button', { name: /^test$/i }))

    await waitFor(() =>
      expect(toasterMock.info).toHaveBeenCalledWith('Connection and Inbox access verified.')
    )
    expect(testSettingMock).toHaveBeenCalledWith(
      'MSExchange',
      's1',
      Object.entries(VALUES[authType]).map(([key, value]) => ({ key, value }))
    )
  })

  it.each(['oauth_azure', 'ntlm'] as const)(
    'falls back to the default toast when no message (%s)',
    async (authType) => {
      testSettingMock.mockResolvedValue({ success: true })
      renderFor(authType)

      fireEvent.click(screen.getByRole('button', { name: /^test$/i }))

      await waitFor(() =>
        expect(toasterMock.info).toHaveBeenCalledWith('Integration test successful')
      )
    }
  )

  it('falls back to the default toast when message is not a string', async () => {
    testSettingMock.mockResolvedValue({ success: true, message: { foo: 'bar' } })
    renderFor('ntlm')

    fireEvent.click(screen.getByRole('button', { name: /^test$/i }))

    await waitFor(() =>
      expect(toasterMock.info).toHaveBeenCalledWith('Integration test successful')
    )
    expect(toasterMock.info).toHaveBeenCalledTimes(1)
    expect(toasterMock.error).not.toHaveBeenCalled()
  })
})
