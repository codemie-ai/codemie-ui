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

import { render, screen, act, fireEvent, within, cleanup } from '@testing-library/react'
import { createRef } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { FEATURE_FLAGS } from '@/constants/featureFlags'
import { registerCredentialTypeCallback } from '@/utils/onboarding'
import * as settingsUtils from '@/utils/settings'
import { getTypeScopeBinding } from '@/utils/settings'

import SettingsForm, { SettingsFormRef } from '../SettingsForm'

const MEMBER = { id: '1', isAdmin: false, applicationsAdmin: [] as string[], projects: [] }
const PROJECT_ADMIN = { id: '2', isAdmin: false, applicationsAdmin: ['p1'], projects: ['p1', 'p2'] }

const mockStore = vi.hoisted(() => ({ user: null as any }))
// The customer config the form fetches; each test starts with the Google OAuth flag on.
const mockCustomerConfig = vi.hoisted(() => ({ items: [] as unknown[] }))

// Two real config keys: one bound to Project, one to User, found from the config, not named here.
const BOUND = vi.hoisted(() => ({ project: '', user: '' }))

vi.mock('@/components/ProjectSelector', () => ({
  default: () => <div data-testid="project-selector" />,
}))

vi.mock('@/components/SelectButton/SelectButton', () => ({
  default: ({ options, value, disabled, onChange }: any) => (
    <div data-testid="scope-select" data-value={value}>
      {options.map((o: any) => (
        <button
          key={o.value}
          type="button"
          data-tooltip-content={o.tooltip}
          disabled={disabled || o.disabled}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  ),
}))

vi.mock('@/components/form/Autocomplete', () => ({
  default: ({ id, options, value, onChange, error }: any) =>
    id !== 'credentialType' ? null : (
      <div data-testid="type-field" data-value={value ?? ''}>
        {options.map((o: any) => (
          <button
            key={o.value}
            type="button"
            data-testid={`type-${o.value}`}
            aria-disabled={o.disabled ? 'true' : undefined}
            onClick={() => !o.disabled && onChange(o.value)}
          >
            <span>{o.label}</span>
            {o.badge && <span data-testid="badge">{o.badge}</span>}
            {o.hint && <span data-testid="hint">{o.hint}</span>}
          </button>
        ))}
        {error && <span role="alert">{error}</span>}
      </div>
    ),
}))

vi.mock('@/utils/settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/settings')>()
  return { ...actual, getAvailableCredentialsTypes: vi.fn(actual.getAvailableCredentialsTypes) }
})
vi.mock('valtio', () => ({
  proxy: (v: unknown) => v,
  snapshot: (v: unknown) => v,
  subscribe: vi.fn(),
  useSnapshot: (store: unknown) => store,
}))
vi.mock('valtio/react', () => ({ useSnapshot: (store: unknown) => store }))
vi.mock('@/store/user', () => ({ userStore: mockStore }))
vi.mock('@/store/appInfo', () => ({
  appInfoStore: {
    api: { BASE_URL: 'https://test' },
    fetchCustomerConfig: vi.fn(() => Promise.resolve(mockCustomerConfig.items)),
    toolFieldDefaults: {},
    toolFieldPlaceholders: {},
    toolFieldDefaultValues: {},
  },
}))
vi.mock('@/hooks/useFeatureFlags', () => ({ useFeatureFlag: vi.fn(() => [false, true]) }))
vi.mock('@/utils/onboarding', () => ({ registerCredentialTypeCallback: vi.fn(() => () => {}) }))
vi.mock('@/hooks/useActiveHelpSegment', () => ({ useActiveHelpSegment: vi.fn() }))
vi.mock('../../TestIntegration', () => ({ default: () => null }))
vi.mock('../GoogleOAuthField', () => ({ default: () => null }))
vi.mock('../../SettingFormMessage/SettingFormMessage', () => ({ default: () => null }))
vi.mock('@/pages/integrations/components/SettingsForm/hooks/useResourceOptions', () => ({
  useResourceOptions: vi.fn().mockReturnValue({ options: [], loading: false }),
}))

const setup = async (user: any, props: Record<string, unknown> = {}) => {
  mockStore.user = user
  const ref = createRef<SettingsFormRef>()
  const onSubmit = vi.fn()
  await act(async () => {
    render(
      <SettingsForm
        ref={ref}
        onSubmit={onSubmit}
        settingAlias="my-alias"
        showScope
        scope="user"
        {...props}
      />
    )
  })
  return { ref, onSubmit }
}

const pickType = async (key: string) => {
  await act(async () => {
    fireEvent.click(screen.getByTestId(`type-${key}`))
  })
}
const scopeBtn = (label: string) => screen.getByRole<HTMLButtonElement>('button', { name: label })
const typeValue = () => screen.getByTestId('type-field').getAttribute('data-value')
const scopeValue = () => screen.getByTestId('scope-select').getAttribute('data-value')
const labelOf = (key: string) => within(screen.getByTestId(`type-${key}`)).getAllByText(/.+/)[0]

describe('SettingsForm type options across scopes', () => {
  beforeEach(async () => {
    cleanup()
    vi.clearAllMocks()
    // Google OAuth, the User-bound type used here, is offered only while its feature flag is on.
    mockCustomerConfig.items = [{ id: FEATURE_FLAGS.GOOGLE_OAUTH, settings: { enabled: true } }]
    const real = await vi.importActual<typeof import('@/utils/settings')>('@/utils/settings')
    vi.mocked(settingsUtils.getAvailableCredentialsTypes).mockImplementation(
      real.getAvailableCredentialsTypes
    )
    const { CREDENTIAL_UI_MAPPING } = await import('@/utils/settingsUIConfig')
    const keys = Object.keys(CREDENTIAL_UI_MAPPING)
    BOUND.project = keys.find((k) => getTypeScopeBinding(k) === 'project' && k === 'dial') ?? ''
    BOUND.user = keys.find((k) => getTypeScopeBinding(k) === 'user' && k === 'googleoauth') ?? ''
  })

  it('picking a Project-bound type at User switches Scope, shows the note and disables User (AC-13)', async () => {
    await setup(PROJECT_ADMIN)
    const label = labelOf(BOUND.project).textContent
    expect(
      within(screen.getByTestId(`type-${BOUND.project}`)).getByTestId('hint').textContent
    ).toBe('Switches Scope to Project')
    expect(
      within(screen.getByTestId(`type-${BOUND.project}`)).getByTestId('badge').textContent
    ).toBe('Project only')
    await pickType(BOUND.project)
    expect(scopeValue()).toBe('project')
    expect(typeValue()).toBe(BOUND.project)
    expect(
      screen.getByText(`${label} is available only at Project scope, so Scope switched to Project.`)
    ).toBeTruthy()
    expect(scopeBtn('User').disabled).toBe(true)
    expect(scopeBtn('User').getAttribute('data-tooltip-content')).toBe(
      `${label} is available only at Project scope, so User is unavailable. Pick another type to change it.`
    )
  })

  // The Credential Type field re-selects its current option when it loses focus, e.g. on the
  // mousedown that opens it. That re-pick must change nothing: dropping the note moves the field
  // under the pointer, so the click that should open the list never lands (AC-13).
  it('re-picking the type that switched Scope keeps the note and the scope (AC-13)', async () => {
    await setup(PROJECT_ADMIN)
    const label = labelOf(BOUND.project).textContent
    const note = `${label} is available only at Project scope, so Scope switched to Project.`
    await pickType(BOUND.project)
    expect(screen.getByText(note)).toBeTruthy()
    await pickType(BOUND.project)
    expect(screen.getByText(note)).toBeTruthy()
    expect(scopeValue()).toBe('project')
    expect(typeValue()).toBe(BOUND.project)
  })

  it('re-picking the type that switched Scope back to User keeps the note (AC-13)', async () => {
    await setup(PROJECT_ADMIN, { scope: 'project' })
    const label = labelOf(BOUND.user).textContent
    const note = `${label} is available only at User scope, so Scope switched to User.`
    await pickType(BOUND.user)
    expect(screen.getByText(note)).toBeTruthy()
    await pickType(BOUND.user)
    expect(screen.getByText(note)).toBeTruthy()
    expect(scopeValue()).toBe('user')
  })

  it('re-picking the current type keeps the values typed into its fields', async () => {
    await setup(PROJECT_ADMIN)
    await pickType('jira')
    const url = screen.getByRole<HTMLInputElement>('textbox', { name: /url/i })
    await act(async () => {
      fireEvent.change(url, { target: { value: 'https://jira.example.invalid' } })
    })
    await pickType('jira')
    expect(screen.getByRole<HTMLInputElement>('textbox', { name: /url/i }).value).toBe(
      'https://jira.example.invalid'
    )
  })

  it('picking a User-bound type at Project switches Scope to User and disables Project (AC-13)', async () => {
    await setup(PROJECT_ADMIN, { scope: 'project' })
    await pickType(BOUND.user)
    expect(scopeValue()).toBe('user')
    expect(scopeBtn('Project').disabled).toBe(true)
    expect(scopeBtn('Project').getAttribute('data-tooltip-content')).toContain(
      'so Project is unavailable. Pick another type to change it.'
    )
  })

  it('picking a type available at User enables User again (AC-13)', async () => {
    await setup(PROJECT_ADMIN)
    await pickType(BOUND.project)
    expect(scopeBtn('User').disabled).toBe(true)
    const shared = screen
      .getAllByTestId(/^type-(?!field)/)
      .map((b) => b.getAttribute('data-testid')!.slice(5))
      .find((k) => getTypeScopeBinding(k) === null)!
    await pickType(shared)
    expect(scopeBtn('User').disabled).toBe(false)
    expect(scopeValue()).toBe('project')
  })

  it('lists project-bound types disabled with the admin hint for a member and blocks them (AC-14)', async () => {
    await setup(MEMBER)
    const option = screen.getByTestId(`type-${BOUND.project}`)
    expect(option.getAttribute('aria-disabled')).toBe('true')
    expect(within(option).getByTestId('hint').textContent).toBe(
      'Project only · needs project admin rights'
    )
    const before = typeValue()
    await pickType(BOUND.project)
    expect(typeValue()).toBe(before)
    expect(scopeValue()).toBe('user')
  })

  it('clears a type the new scope does not offer and keeps the alias (AC-15)', async () => {
    const actual = await vi.importActual<typeof import('@/utils/settings')>('@/utils/settings')
    // Make the scope-specific availability observable: Jira is offered at User only.
    vi.mocked(settingsUtils.getAvailableCredentialsTypes).mockImplementation((params) =>
      actual
        .getAvailableCredentialsTypes(params)
        .filter((k) => !(params.settingType === 'project' && k === 'jira'))
    )
    await setup(PROJECT_ADMIN)
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText('Alias*'), { target: { value: 'my-alias' } })
    })
    await pickType('jira')
    expect(typeValue()).toBe('jira')
    await act(async () => {
      fireEvent.click(scopeBtn('Project'))
    })
    expect(scopeValue()).toBe('project')
    expect(typeValue()).toBe('')
    expect(screen.getByDisplayValue('my-alias')).toBeTruthy()
  })

  it('keeps Credential Type empty and required after the clear, never auto-picking (AC-15)', async () => {
    const actual = await vi.importActual<typeof import('@/utils/settings')>('@/utils/settings')
    vi.mocked(settingsUtils.getAvailableCredentialsTypes).mockImplementation((params) =>
      actual
        .getAvailableCredentialsTypes(params)
        .filter((k) => !(params.settingType === 'project' && k === 'jira'))
    )
    const { ref, onSubmit } = await setup(PROJECT_ADMIN, { projectName: 'p1' })
    await pickType('jira')
    await act(async () => {
      fireEvent.click(scopeBtn('Project'))
    })
    await act(async () => {
      await ref.current!.submit()
    })
    expect(typeValue()).toBe('')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toBe('Credential Type is required')
  })

  it('a Project-bound type handed in at User (?scope=user&credentialType=dial) switches Scope', async () => {
    await setup(PROJECT_ADMIN, { credentialType: BOUND.project })
    expect(scopeValue()).toBe('project')
    expect(typeValue()).toBe(BOUND.project)
    expect(screen.getByText(/so Scope switched to Project\.$/)).toBeTruthy()
  })

  it('a member handed a Project-bound type stays at User with Credential Type empty', async () => {
    await setup(MEMBER, { credentialType: BOUND.project })
    expect(scopeValue()).toBe('user')
    expect(typeValue()).toBe('')
  })

  it('a locked scope drops a handed-in type bound to the other scope', async () => {
    await setup(PROJECT_ADMIN, {
      scope: 'project',
      scopeLocked: true,
      projectName: 'p1',
      credentialType: BOUND.user,
    })
    expect(scopeValue()).toBe('project')
    expect(typeValue()).toBe('')
  })

  it('a type picked by the tour switches Scope like a pick does', async () => {
    await setup(PROJECT_ADMIN)
    const tourPick = vi.mocked(registerCredentialTypeCallback).mock.calls.at(-1)![0]
    await act(async () => {
      tourPick(BOUND.project)
    })
    expect(scopeValue()).toBe('project')
    expect(typeValue()).toBe(BOUND.project)
  })

  it('locked at Project: User-only types are listed disabled and tagged (AC-19)', async () => {
    await setup(PROJECT_ADMIN, { scope: 'project', scopeLocked: true, projectName: 'p1' })
    const option = screen.getByTestId(`type-${BOUND.user}`)
    expect(option.getAttribute('aria-disabled')).toBe('true')
    expect(within(option).getByTestId('badge').textContent).toBe('User only')
    await pickType(BOUND.user)
    expect(scopeValue()).toBe('project')
    expect(typeValue()).not.toBe(BOUND.user)
  })

  it('does not offer Google OAuth at Project while its feature flag is off', async () => {
    mockCustomerConfig.items = []
    await setup(PROJECT_ADMIN, { scope: 'project' })
    expect(screen.getByTestId(`type-${BOUND.project}`)).toBeTruthy()
    expect(screen.queryByTestId(`type-${BOUND.user}`)).toBeNull()
  })
})
