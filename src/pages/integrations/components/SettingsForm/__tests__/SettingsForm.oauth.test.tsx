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

// Mutable base credential types the picker offers. EPMCDME-14587: credentialType stays the base type
// ('git'/'jira'/'confluence'); OAuth is chosen via the in-form toggle (isOAuth), not by selecting a type.
const typesState = vi.hoisted(() => ({ available: [] as string[] }))
vi.mock('@/utils/settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/settings')>()
  const { CREDENTIAL_UI_MAPPING } = await import('@/utils/settingsUIConfig')
  return {
    ...actual,
    generateDefaultAlias: vi.fn().mockImplementation((input: string) => `gen-${input}`),
    getAvailableCredentialsTypes: vi.fn(() => typesState.available),
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

// Mutable OAuth feature-flag config the SettingsForm reads through useFeatureFlag (via appInfoStore).
// Defaults to all three providers enabled; individual tests narrow it to exercise gating.
const allOAuthEnabled = () => [
  { id: 'features:gitlabOauth', settings: { enabled: true } },
  { id: 'features:jiraOauth', settings: { enabled: true } },
  { id: 'features:confluenceOauth', settings: { enabled: true } },
]
const oauthFlagState = vi.hoisted(() => ({
  configs: [] as Array<{ id: string; settings: { enabled: boolean } }>,
}))
vi.mock('@/store/appInfo', () => ({
  appInfoStore: {
    api: { BASE_URL: 'https://test' },
    fetchCustomerConfig: vi.fn().mockResolvedValue(null),
    toolFieldDefaults: {},
    toolFieldPlaceholders: {},
    isConfigFetched: true,
    get configs() {
      return oauthFlagState.configs
    },
  },
}))
vi.mock('@/utils/onboarding', () => ({ registerCredentialTypeCallback: vi.fn(() => () => {}) }))
vi.mock('@/hooks/useActiveHelpSegment', () => ({ useActiveHelpSegment: vi.fn() }))
vi.mock('@/components/ProjectSelector', () => ({ default: () => null }))
// Render the footer test actions as markers exposing the credentialType they receive, so the
// create+toggle-on routing (OAuth action vs PAT action) is assertable.
vi.mock('../../TestIntegration', () => ({
  default: ({ credentialType }: { credentialType: string }) => (
    <div data-testid="pat-test" data-credential-type={credentialType} />
  ),
}))
vi.mock('../../OAuthTestAction', () => ({
  default: ({ credentialType }: { credentialType: string }) => (
    <div data-testid="oauth-test" data-credential-type={credentialType} />
  ),
}))
vi.mock('../../SettingFormMessage/SettingFormMessage', () => ({ default: () => null }))

describe('SettingsForm — OAuth is an auth method (isOAuth), not a credential type', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    oauthFlagState.configs = allOAuthEnabled()
    typesState.available = ['git']
  })

  it('submits under the base Git type + auth_type=oauth after toggling OAuth on (no oauth_state gate)', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(
      <SettingsForm
        credentialType="git"
        settingType="user"
        onSubmit={onSubmit}
        onClose={vi.fn()}
        submitText="Save"
        editing={false}
      />
    )

    await act(async () => {
      // credentialType stays 'git'; toggling flips isOAuth and swaps in the GitLab OAuth fields.
      await user.click(screen.getByRole('switch', { name: /Use GitLab OAuth 2\.0 sign-in/i }))
    })
    await act(async () => {
      await user.type(screen.getByLabelText('Alias'), 'my-gitlab')
      await user.type(screen.getByPlaceholderText('GitLab OAuth Application ID'), 'cid')
      await user.type(screen.getByPlaceholderText('GitLab OAuth Application Secret'), 'sec')
      await user.type(screen.getByPlaceholderText('https://your-codemie-host'), 'https://cm')
      await user.click(screen.getByRole('button', { name: 'Save' }))
    })

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const payload = onSubmit.mock.calls[0][0]
    expect(payload.credential_type).toBe('Git')
    expect(payload.oauth_state).toBeUndefined()
    expect(payload.credential_values).toEqual(
      expect.arrayContaining([
        { key: 'client_id', value: 'cid' },
        { key: 'auth_type', value: 'oauth' },
      ])
    )
  })

  // Regression for the reverted refactor: onCredentialValuesChange must carry auth_type=oauth so the
  // integration edit page (EditIntegrationActions reads credentialValues.auth_type) keeps routing to
  // the OAuth test action rather than the PAT one. This is what broke "Test" for saved OAuth integrations.
  it('propagates auth_type=oauth in credentialValues when editing a saved OAuth integration', () => {
    const onCredentialValuesChange = vi.fn()
    render(
      <SettingsForm
        credentialType="git"
        credentialValues={{ auth_type: 'oauth', client_id: 'cid' }}
        settingType="user"
        editing
        onSubmit={vi.fn()}
        onClose={vi.fn()}
        onCredentialValuesChange={onCredentialValuesChange}
        submitText="Save"
      />
    )

    const lastEmitted = onCredentialValuesChange.mock.calls.at(-1)?.[0]
    expect(lastEmitted).toMatchObject({ auth_type: 'oauth' })
  })

  // The footer test action must route to the OAuth provider on create + toggle-on (effectiveCredentialType
  // = the variant), and the PAT test button must hide — even though getValues() has no marker yet.
  it('routes the footer test action to the OAuth provider on create + toggle-on', async () => {
    const user = userEvent.setup()
    render(
      <SettingsForm
        credentialType="git"
        settingType="user"
        onSubmit={vi.fn()}
        onClose={vi.fn()}
        submitText="Save"
        editing={false}
      />
    )

    await act(async () => {
      await user.click(screen.getByRole('switch', { name: /Use GitLab OAuth 2\.0 sign-in/i }))
    })

    expect(screen.getByTestId('oauth-test')).toHaveAttribute('data-credential-type', 'gitlaboauth')
    expect(screen.queryByTestId('pat-test')).toBeNull()
  })

  // EPMCDME-14582: the assistant-tools popup locks the base type but the OAuth toggle must stay usable.
  it.each(['git', 'jira', 'confluence'])(
    'keeps the OAuth toggle enabled for %s when the credential type is locked on create',
    (credentialType) => {
      typesState.available = [credentialType]
      render(
        <SettingsForm
          credentialType={credentialType}
          settingType="user"
          disableType
          editing={false}
          onSubmit={vi.fn()}
          onClose={vi.fn()}
          submitText="Save"
        />
      )

      expect(
        screen.getByRole('switch', { name: /Use (GitLab|Jira|Confluence) OAuth 2\.0 sign-in/i })
      ).toBeEnabled()
    }
  )

  // EPMCDME-14587: the toggle label names the provider.
  it('labels the OAuth toggle with the provider name (GitLab under the Git type)', () => {
    render(
      <SettingsForm
        credentialType="git"
        settingType="user"
        disableType
        editing={false}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
        submitText="Save"
      />
    )

    expect(
      screen.getByRole('switch', { name: /Use GitLab OAuth 2\.0 sign-in/ })
    ).toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: /^Use OAuth 2\.0 sign-in/ })).toBeNull()
  })

  it('hides the OAuth toggle when the provider feature flag is disabled', () => {
    oauthFlagState.configs = []

    render(
      <SettingsForm
        credentialType="git"
        settingType="user"
        disableType
        editing={false}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
        submitText="Save"
      />
    )

    expect(
      screen.queryByRole('switch', { name: /Use (GitLab|Jira|Confluence) OAuth 2\.0 sign-in/i })
    ).toBeNull()
  })

  it('disables the OAuth toggle when editing a saved integration', () => {
    render(
      <SettingsForm
        credentialType="git"
        settingType="user"
        editing
        onSubmit={vi.fn()}
        onClose={vi.fn()}
        submitText="Save"
      />
    )

    expect(
      screen.getByRole('switch', { name: /Use (GitLab|Jira|Confluence) OAuth 2\.0 sign-in/i })
    ).toBeDisabled()
  })

  it('re-opens on the OAuth form when editing a Git integration carrying auth_type=oauth', () => {
    render(
      <SettingsForm
        credentialType="git"
        credentialValues={{ auth_type: 'oauth', client_id: 'cid' }}
        settingType="user"
        editing
        onSubmit={vi.fn()}
        onClose={vi.fn()}
        submitText="Save"
      />
    )

    // The OAuth-only fields prove isOAuth re-derived from the marker and effectiveCredentialType resolved.
    expect(screen.getByPlaceholderText('GitLab OAuth Application ID')).toBeInTheDocument()
  })
})
