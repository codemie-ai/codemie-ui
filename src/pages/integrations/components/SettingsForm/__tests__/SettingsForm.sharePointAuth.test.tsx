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
    getAvailableCredentialsTypes: vi.fn().mockReturnValue(['sharepoint', 'mcp']),
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
    // The app-auth branch renders CredentialFields, which resolves placeholders here.
    toolFieldPlaceholders: {},
  },
}))
vi.mock('@/utils/onboarding', () => ({ registerCredentialTypeCallback: vi.fn(() => () => {}) }))
vi.mock('@/hooks/useActiveHelpSegment', () => ({ useActiveHelpSegment: vi.fn() }))
vi.mock('@/components/ProjectSelector', () => ({ default: () => null }))
vi.mock('../../TestIntegration', () => ({ default: () => null }))
vi.mock('../GoogleOAuthField', () => ({ default: () => null }))
vi.mock('../../SettingFormMessage/SettingFormMessage', () => ({ default: () => null }))

// The real field opens a Microsoft popup; the test only cares about the form
// contract - whether a completed sign-in was captured, and the error shown when not.
vi.mock('../SharePointOAuthField', () => ({
  default: ({ formError }: { formError?: string }) => (
    <div>{formError ? <span data-testid="oauth-error">{formError}</span> : null}</div>
  ),
}))

function renderSharePointForm(props: Partial<React.ComponentProps<typeof SettingsForm>> = {}) {
  const onSubmit = vi.fn()
  render(
    <SettingsForm
      credentialType="sharepoint"
      settingType="user"
      onSubmit={onSubmit}
      onClose={vi.fn()}
      submitText="Save"
      editing={false}
      {...props}
    />
  )
  return { onSubmit }
}

async function fillAliasAndSave(user: ReturnType<typeof userEvent.setup>) {
  await act(async () => {
    await user.type(screen.getByLabelText('Alias'), 'my-sharepoint')
  })
  await act(async () => {
    await user.click(screen.getByRole('button', { name: 'Save' }))
  })
}

describe('SettingsForm — SharePoint authentication method', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('blocks saving a new integration when Sign in with Microsoft was never completed', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderSharePointForm()

    await fillAliasAndSave(user)

    expect(onSubmit).not.toHaveBeenCalled()
    expect(await screen.findByTestId('oauth-error')).toHaveTextContent(
      'Please sign in with Microsoft before saving'
    )
  })

  it('allows saving an existing integration that is already signed in', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderSharePointForm({
      editing: true,
      settingAlias: 'existing',
      credentialValues: { auth_type: 'oauth', username: 'someone@contoso.com' },
    })

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Save' }))
    })

    expect(onSubmit).toHaveBeenCalled()
    expect(screen.queryByTestId('oauth-error')).not.toBeInTheDocument()
  })

  it('does not require a sign-in once the user switches to Azure app registration', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderSharePointForm()

    await act(async () => {
      await user.click(screen.getByLabelText('Azure app registration'))
    })
    await fillAliasAndSave(user)

    expect(onSubmit).toHaveBeenCalled()
    expect(screen.queryByTestId('oauth-error')).not.toBeInTheDocument()
  })

  it('still renders the manual-fields editor for a credential type that uses one', async () => {
    // The SharePoint branch guards the shared credential-fields block, so a type
    // configured with manual fields (MCP) must keep rendering its own editor.
    renderSharePointForm({ credentialType: 'mcp' })

    expect(screen.getByText('Environment Variables')).toBeInTheDocument()
    expect(screen.queryByLabelText('Sign in with Microsoft')).not.toBeInTheDocument()
  })
})
