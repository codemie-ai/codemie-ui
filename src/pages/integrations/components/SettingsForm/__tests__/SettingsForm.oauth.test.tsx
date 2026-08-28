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

import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import SettingsForm from '../SettingsForm'

vi.mock('@/utils/settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/settings')>()
  const { CREDENTIAL_UI_MAPPING } = await import('@/utils/settingsUIConfig')
  return {
    ...actual,
    generateDefaultAlias: vi.fn().mockImplementation((input: string) => `gen-${input}`),
    getAvailableCredentialsTypes: vi.fn().mockReturnValue(['gitlaboauth']),
    getCredentialUIMapping: vi.fn().mockReturnValue(CREDENTIAL_UI_MAPPING),
  }
})
vi.mock('valtio', () => ({
  proxy: (v: unknown) => v,
  snapshot: (v: unknown) => v,
  subscribe: vi.fn(),
  useSnapshot: (store: unknown) => store,
}))
vi.mock('valtio/react', () => ({ useSnapshot: (store: unknown) => store }))
vi.mock('@/store/user', () => ({
  userStore: { user: { id: '1', role: 'admin', projects: [], username: 'test' } },
}))
vi.mock('@/store/appInfo', () => ({
  appInfoStore: {
    api: { BASE_URL: 'https://test' },
    fetchCustomerConfig: vi.fn().mockResolvedValue(null),
    toolFieldDefaults: {},
  },
}))
vi.mock('@/utils/onboarding', () => ({ registerCredentialTypeCallback: vi.fn(() => () => {}) }))
vi.mock('@/hooks/useActiveHelpSegment', () => ({ useActiveHelpSegment: vi.fn() }))
vi.mock('@/components/ProjectSelector', () => ({ default: () => null }))
vi.mock('../../TestIntegration', () => ({ default: () => null }))
// Neutralize the OAuth test action so the test targets SettingsForm's validation/submit only.
vi.mock('../../OAuthTestAction', () => ({ default: () => null }))
vi.mock('../../SettingFormMessage/SettingFormMessage', () => ({ default: () => null }))

describe('SettingsForm — tool OAuth save no longer requires oauth_state', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('submits a gitlaboauth integration with app creds only (no oauth_state gate)', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(
      <SettingsForm
        credentialType="gitlaboauth"
        settingType="user"
        onSubmit={onSubmit}
        onClose={vi.fn()}
        submitText="Save"
        editing={false}
      />
    )

    await act(async () => {
      await user.type(screen.getByLabelText('Alias'), 'my-gitlab')
      await user.type(screen.getByPlaceholderText('GitLab OAuth Application ID'), 'cid')
      await user.type(screen.getByPlaceholderText('GitLab OAuth Application Secret'), 'sec')
      await user.type(screen.getByPlaceholderText('https://your-codemie-host'), 'https://cm')
      await user.click(screen.getByRole('button', { name: 'Save' }))
    })

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const payload = onSubmit.mock.calls[0][0]
    // SettingsForm maps the UI type to its server enum on submit.
    expect(payload.credential_type).toBe('GitLabOAuth')
    expect(payload.oauth_state).toBeUndefined()
    expect(payload.credential_values).toEqual(
      expect.arrayContaining([{ key: 'client_id', value: 'cid' }])
    )
  })
})
