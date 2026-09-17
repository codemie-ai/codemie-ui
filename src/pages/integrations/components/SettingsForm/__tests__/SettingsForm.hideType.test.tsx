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

import SettingsForm from '../SettingsForm'

vi.mock('@/utils/settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/settings')>()
  const { CREDENTIAL_UI_MAPPING } = await import('@/utils/settingsUIConfig')
  return {
    ...actual,
    generateDefaultAlias: vi.fn().mockImplementation((input: string) => `gen-${input}`),
    getAvailableCredentialsTypes: vi.fn().mockReturnValue(['scheduler']),
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
    configs: [],
    isConfigFetched: true,
  },
}))
vi.mock('@/utils/onboarding', () => ({ registerCredentialTypeCallback: vi.fn(() => () => {}) }))
vi.mock('@/hooks/useActiveHelpSegment', () => ({ useActiveHelpSegment: vi.fn() }))
vi.mock('@/components/ProjectSelector', () => ({ default: () => null }))
vi.mock('../../TestIntegration', () => ({ default: () => null }))
vi.mock('../GoogleOAuthField', () => ({ default: () => null }))
vi.mock('../../SettingFormMessage/SettingFormMessage', () => ({ default: () => null }))
vi.mock('../CredentialFields', () => ({ default: () => null }))

describe('SettingsForm — hideType prop', () => {
  it('renders Credential Type field when hideType is not set', () => {
    render(<SettingsForm credentialType="scheduler" settingType="user" onSubmit={vi.fn()} />)

    expect(screen.getByLabelText('Credential Type')).toBeInTheDocument()
  })

  it('hides Credential Type field when hideType is true', () => {
    render(
      <SettingsForm
        credentialType="scheduler"
        settingType="user"
        onSubmit={vi.fn()}
        hideType={true}
      />
    )

    expect(screen.queryByLabelText('Credential Type')).not.toBeInTheDocument()
  })
})
