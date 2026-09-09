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

import NewIntegrationPopup from '../NewIntegrationPopup'

// Render the popup shell as a passthrough so the test targets the SettingsForm wiring inside it.
vi.mock('@/components/Popup', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
vi.mock('@/store/userSettings', () => ({ userSettingsStore: { createUserSetting: vi.fn() } }))

// SettingsForm dependency mocks (mirrors SettingsForm.oauth.test.tsx).
vi.mock('@/utils/settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/settings')>()
  const { CREDENTIAL_UI_MAPPING } = await import('@/utils/settingsUIConfig')
  return {
    ...actual,
    generateDefaultAlias: vi.fn().mockImplementation((input: string) => `gen-${input}`),
    getAvailableCredentialsTypes: vi.fn().mockReturnValue(['jira']),
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
    toolFieldPlaceholders: {},
    // EPMCDME-14587: the OAuth toggle is gated on the provider's runtime feature flag; enable all
    // three so the popup renders the toggle (the flag gate is unit-tested in SettingsForm.oauth).
    isConfigFetched: true,
    configs: [
      { id: 'features:gitlabOauth', settings: { enabled: true } },
      { id: 'features:jiraOauth', settings: { enabled: true } },
      { id: 'features:confluenceOauth', settings: { enabled: true } },
    ],
  },
}))
vi.mock('@/utils/onboarding', () => ({ registerCredentialTypeCallback: vi.fn(() => () => {}) }))
vi.mock('@/hooks/useActiveHelpSegment', () => ({ useActiveHelpSegment: vi.fn() }))
vi.mock('@/components/ProjectSelector', () => ({ default: () => null }))
vi.mock('../../TestIntegration', () => ({ default: () => null }))
vi.mock('../../OAuthTestAction', () => ({ default: () => null }))
vi.mock('../../SettingFormMessage/SettingFormMessage', () => ({ default: () => null }))

describe('NewIntegrationPopup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the OAuth toggle enabled even though the popup locks the credential type (EPMCDME-14582)', () => {
    render(
      <NewIntegrationPopup visible onHide={vi.fn()} onSuccess={vi.fn()} credentialType="jira" />
    )

    // The popup passes disableType={true} (type locked) but editing is false (create), so the user
    // must still be able to turn on OAuth sign-in.
    expect(screen.getByRole('switch', { name: /Use Jira OAuth 2.0 sign-in/i })).toBeEnabled()
  })
})
