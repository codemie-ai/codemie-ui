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
    getAvailableCredentialsTypes: vi.fn().mockReturnValue(['webhook']),
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
vi.mock('../GoogleOAuthField', () => ({ default: () => null }))
vi.mock('../../SettingFormMessage/SettingFormMessage', () => ({ default: () => null }))

function renderWebhookForm(editing = false) {
  return render(
    <SettingsForm
      credentialType="webhook"
      settingType="user"
      onSubmit={vi.fn()}
      onClose={vi.fn()}
      submitText="Save"
      editing={editing}
    />
  )
}

describe('SettingsForm — alias → webhook_id auto-fill', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('auto-fills webhook_id from alias as a slug when alias changes', async () => {
    const user = userEvent.setup()
    renderWebhookForm()

    const aliasInput = screen.getByLabelText('Alias')
    const webhookIdInput = screen.getByLabelText('Webhook ID')

    await act(async () => {
      await user.clear(aliasInput)
      await user.type(aliasInput, 'my-webhook')
    })

    expect(webhookIdInput).toHaveValue('my-webhook')
  })

  it('stops auto-filling webhook_id after the user manually edits it', async () => {
    const user = userEvent.setup()
    renderWebhookForm()

    const aliasInput = screen.getByLabelText('Alias')
    const webhookIdInput = screen.getByLabelText('Webhook ID')

    await act(async () => {
      await user.clear(aliasInput)
      await user.type(aliasInput, 'initial-alias')
    })
    expect(webhookIdInput).toHaveValue('initial-alias')

    await act(async () => {
      await user.clear(webhookIdInput)
      await user.type(webhookIdInput, 'manual-id')
    })

    await act(async () => {
      await user.clear(aliasInput)
      await user.type(aliasInput, 'new-alias')
    })

    expect(webhookIdInput).toHaveValue('manual-id')
  })

  it('does not overwrite a pre-populated webhook_id in edit mode', async () => {
    const user = userEvent.setup()
    render(
      <SettingsForm
        credentialType="webhook"
        settingType="user"
        onSubmit={vi.fn()}
        onClose={vi.fn()}
        submitText="Save"
        editing={true}
        credentialValues={{ webhook_id: 'pre-existing-id' }}
        settingAlias="existing-alias"
      />
    )

    const webhookIdInput = screen.getByLabelText('Webhook ID')
    expect(webhookIdInput).toHaveValue('pre-existing-id')

    const aliasInput = screen.getByLabelText('Alias')
    await act(async () => {
      await user.clear(aliasInput)
      await user.type(aliasInput, 'changed-alias')
    })

    expect(webhookIdInput).toHaveValue('pre-existing-id')
  })
})
