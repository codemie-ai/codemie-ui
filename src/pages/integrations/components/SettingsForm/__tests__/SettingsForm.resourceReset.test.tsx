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
vi.mock('../../TestIntegration', () => ({ default: () => null }))
vi.mock('../GoogleOAuthField', () => ({ default: () => null }))
vi.mock('../../SettingFormMessage/SettingFormMessage', () => ({ default: () => null }))

// Suppress PrimeReact's missing-DOM warnings in jsdom
vi.mock('@/pages/integrations/components/SettingsForm/hooks/useResourceOptions', () => ({
  useResourceOptions: vi.fn().mockReturnValue({ options: [], loading: false }),
}))

describe('SettingsForm — resource_id reset on project change', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('clears resource_id when the project changes', async () => {
    const capturedValues: Record<string, string>[] = []

    render(
      <SettingsForm
        credentialType="webhook"
        settingType="project"
        projectName="proj-a"
        credentialValues={{ resource_type: 'workflow', resource_id: 'wf-123' }}
        onSubmit={vi.fn()}
        onCredentialValuesChange={(v) => capturedValues.push(v)}
      />
    )

    // Initial render captures the starting values (resource_id = 'wf-123')
    const initialLast = capturedValues.at(-1)
    expect(initialLast?.resource_id).toBe('wf-123')

    // Simulate the user picking a different project via ProjectSelector
    await act(async () => {
      triggerProjectChange('proj-b')
    })

    const afterChange = capturedValues.at(-1)
    expect(afterChange?.resource_id).toBeFalsy()
  })

  it('does not clear resource_id on initial mount even when project is set', async () => {
    const capturedValues: Record<string, string>[] = []

    render(
      <SettingsForm
        credentialType="webhook"
        settingType="project"
        projectName="proj-a"
        credentialValues={{ resource_type: 'workflow', resource_id: 'wf-123' }}
        onSubmit={vi.fn()}
        onCredentialValuesChange={(v) => capturedValues.push(v)}
      />
    )

    await act(async () => {})

    // resource_id must survive the initial mount
    const last = capturedValues.at(-1)
    expect(last?.resource_id).toBe('wf-123')
  })
})
