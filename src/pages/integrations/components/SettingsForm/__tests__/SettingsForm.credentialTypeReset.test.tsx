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

import { render, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import SettingsForm from '../SettingsForm'

// Captures the onChange so tests can imperatively change the project value
let triggerProjectChange: (project: string) => void = () => {}

vi.mock('@/components/ProjectSelector', () => ({
  default: ({ onChange }: any) => {
    triggerProjectChange = onChange
    return null
  },
}))

vi.mock('@/utils/settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/settings')>()
  const { CREDENTIAL_UI_MAPPING } = await import('@/utils/settingsUIConfig')
  return {
    ...actual,
    generateDefaultAlias: vi.fn().mockImplementation((input: string) => `gen-${input}`),
    // Simulates admin-only credential-type filtering by project: 'webhook' is only
    // available for 'proj-admin', mirroring getAvailableCredentialsTypes filtering
    // ADMIN_ONLY types out for projects the user doesn't administer.
    getAvailableCredentialsTypes: vi
      .fn()
      .mockImplementation(({ project }: { project: string }) =>
        project === 'proj-admin' ? ['webhook'] : ['plugin']
      ),
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
    fetchCustomerConfig: vi.fn().mockResolvedValue({}),
    toolFieldDefaults: {},
  },
}))
vi.mock('@/utils/onboarding', () => ({ registerCredentialTypeCallback: vi.fn(() => () => {}) }))
vi.mock('@/hooks/useActiveHelpSegment', () => ({ useActiveHelpSegment: vi.fn() }))
vi.mock('../../TestIntegration', () => ({ default: () => null }))
vi.mock('../GoogleOAuthField', () => ({ default: () => null }))
vi.mock('../../SettingFormMessage/SettingFormMessage', () => ({ default: () => null }))

// Suppress PrimeReact's missing-DOM warnings in jsdom
vi.mock('@/pages/integrations/components/SettingsForm/hooks/useResourceOptions', () => ({
  useResourceOptions: vi.fn().mockReturnValue({ options: [], loading: false }),
}))

describe('SettingsForm — credentialType auto-switch on project change (EPMCDME-12586)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not reset credentialType or discard loaded values when a project change drops it from CREDENTIAL_TYPES while editing', async () => {
    const capturedValues: Record<string, unknown>[] = []

    render(
      <SettingsForm
        editing={true}
        credentialType="webhook"
        settingType="project"
        projectName="proj-admin"
        credentialValues={{ github_webhook_secret: 'wh-secret-123' }}
        onSubmit={vi.fn()}
        onCredentialValuesChange={(v) => capturedValues.push(v)}
      />
    )

    await act(async () => {})
    expect(capturedValues.at(-1)?.github_webhook_secret).toBe('wh-secret-123')

    // Switch to a project where 'webhook' is not an admin-available credential type
    await act(async () => {
      triggerProjectChange('proj-b')
    })

    // The type-switch/reset effect must be skipped while editing, so the loaded
    // credential values must survive the project change.
    expect(capturedValues.at(-1)?.github_webhook_secret).toBe('wh-secret-123')
  })

  it('resets credentialType and discards values when a project change drops it from CREDENTIAL_TYPES while creating', async () => {
    const capturedValues: Record<string, unknown>[] = []

    render(
      <SettingsForm
        editing={false}
        credentialType="webhook"
        settingType="project"
        projectName="proj-admin"
        credentialValues={{ github_webhook_secret: 'wh-secret-123' }}
        onSubmit={vi.fn()}
        onCredentialValuesChange={(v) => capturedValues.push(v)}
      />
    )

    await act(async () => {})
    expect(capturedValues.at(-1)?.github_webhook_secret).toBe('wh-secret-123')

    await act(async () => {
      triggerProjectChange('proj-b')
    })

    // Outside edit mode, the auto-switch is expected: credentialType moves to the
    // new project's only available type, discarding the stale github_webhook_secret value.
    expect(capturedValues.at(-1)?.github_webhook_secret).toBeFalsy()
  })
})
