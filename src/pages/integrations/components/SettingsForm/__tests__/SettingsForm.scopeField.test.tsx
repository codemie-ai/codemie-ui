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

import { render, screen, act, fireEvent } from '@testing-library/react'
import { createRef } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import SettingsForm, { SettingsFormRef } from '../SettingsForm'

const MEMBER = { id: '1', isAdmin: false, applicationsAdmin: [] as string[], projects: [] }
const PROJECT_ADMIN = { id: '2', isAdmin: false, applicationsAdmin: ['p1'], projects: ['p1', 'p2'] }
const PLATFORM_ADMIN = { id: '3', isAdmin: true, applicationsAdmin: [] as string[], projects: [] }

const mockStore = vi.hoisted(() => ({ user: null as any }))
const selectorProps = vi.hoisted(() => ({ current: {} as any }))

vi.mock('@/components/ProjectSelector', () => ({
  default: (props: any) => {
    selectorProps.current = props
    return <div data-testid="project-selector" />
  },
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

vi.mock('@/utils/settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/settings')>()
  const { CREDENTIAL_UI_MAPPING } = await import('@/utils/settingsUIConfig')
  return {
    ...actual,
    getAvailableCredentialsTypes: vi.fn().mockReturnValue(['plugin']),
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
vi.mock('@/store/user', () => ({ userStore: mockStore }))
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
vi.mock('@/pages/integrations/components/SettingsForm/hooks/useResourceOptions', () => ({
  useResourceOptions: vi.fn().mockReturnValue({ options: [], loading: false }),
}))

const PROJECT_TOOLTIP = 'Project integrations can be created by project admins only.'
const MEMBER_INFO =
  'Only you can use it. Project integrations can be created by project admins only.'
const USER_INFO =
  'Only you can use it. Turn on Global Integration to use it in every project you work in.'

const setup = (user: any, props: Record<string, unknown> = {}) => {
  mockStore.user = user
  const ref = createRef<SettingsFormRef>()
  const onSubmit = vi.fn()
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
  return { ref, onSubmit }
}

const clickScope = async (label: string) => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: label }))
  })
}

describe('SettingsForm Scope field', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectorProps.current = {}
  })

  it('renders no Scope field and keeps settingType behavior without showScope (AC-20)', () => {
    mockStore.user = PROJECT_ADMIN
    render(<SettingsForm onSubmit={vi.fn()} settingType="project" settingAlias="a" />)
    expect(screen.queryByText('Scope')).toBeNull()
    expect(screen.queryByTestId('scope-select')).toBeNull()
    expect(selectorProps.current.adminOnly).toBe(true)
    expect(selectorProps.current.selectDefault).not.toBe(false)
    expect(screen.queryByText('Global Integration')).toBeNull()
  })

  it('shows a labelled Scope field with User and Project (AC-11)', () => {
    setup(PROJECT_ADMIN)
    expect(screen.getByText('Scope')).toBeTruthy()
    expect(screen.getByTestId('scope-select').getAttribute('data-value')).toBe('user')
    expect(screen.getByText('Global Integration')).toBeTruthy()
    expect(screen.getByText(USER_INFO)).toBeTruthy()
  })

  it('disables Project for a member and shows the member info (AC-12)', () => {
    setup(MEMBER)
    const project = screen.getByRole<HTMLButtonElement>('button', { name: 'Project' })
    expect(project.disabled).toBe(true)
    expect(project.getAttribute('data-tooltip-content')).toBe(PROJECT_TOOLTIP)
    expect(screen.getByText(MEMBER_INFO)).toBeTruthy()
  })

  it('switching to Project turns Global off, hides it, and restricts projects (AC-11, AC-15)', async () => {
    setup(PROJECT_ADMIN, { isGlobal: true })
    expect(selectorProps.current.disabled).toBe(true)
    await clickScope('Project')
    expect(screen.queryByText('Global Integration')).toBeNull()
    expect(selectorProps.current.disabled).toBe(false)
    expect(selectorProps.current.adminOnly).toBe(true)
    expect(
      screen.getByText('Every member of the selected project can use it.', { exact: false })
    ).toBeTruthy()
    expect(screen.getByText(/Only projects you administer are listed\./)).toBeTruthy()
  })

  it('omits the administer suffix for a platform admin', async () => {
    setup(PLATFORM_ADMIN)
    await clickScope('Project')
    expect(screen.queryByText(/Only projects you administer are listed\./)).toBeNull()
  })

  it('clears a project the person does not administer and says so (AC-15)', async () => {
    setup(PROJECT_ADMIN, { projectName: 'p2' })
    await clickScope('Project')
    expect(selectorProps.current.value).toBe('')
    expect(
      screen.getByText(
        'Project was cleared: at Project scope you can pick only projects you administer.'
      )
    ).toBeTruthy()
  })

  it('keeps an administered project when switching to Project', async () => {
    setup(PROJECT_ADMIN, { projectName: 'p1' })
    await clickScope('Project')
    expect(selectorProps.current.value).toBe('p1')
    expect(screen.queryByText(/Project was cleared/)).toBeNull()
  })

  it('does not apply a handed-in project the person cannot use at Project scope (AC-11, AC-15)', async () => {
    const { ref, onSubmit } = setup(PROJECT_ADMIN, { scope: 'project', projectName: 'p2' })
    expect(selectorProps.current.value).toBe('')
    // The list must not fill the emptied field with another project either.
    expect(selectorProps.current.selectDefault).toBe(false)
    expect(
      screen.getByText(
        'Project was cleared: at Project scope you can pick only projects you administer.'
      )
    ).toBeTruthy()
    await act(async () => {
      await ref.current!.submit()
    })
    expect(onSubmit).not.toHaveBeenCalled()
    expect(selectorProps.current.error).toBe('Project is required')
  })

  it('prefills a handed-in project the person administers at Project scope (AC-11)', () => {
    setup(PROJECT_ADMIN, { scope: 'project', projectName: 'p1' })
    expect(selectorProps.current.value).toBe('p1')
    expect(screen.queryByText(/Project was cleared/)).toBeNull()
  })

  it('keeps a locked project as handed in, as the admin project page sets it (AC-19)', () => {
    setup(PROJECT_ADMIN, {
      scope: 'project',
      scopeLocked: true,
      disableProject: true,
      projectName: 'p2',
    })
    expect(selectorProps.current.value).toBe('p2')
    expect(screen.queryByText(/Project was cleared/)).toBeNull()
  })

  it('stops auto-picking a project from the first scope change on (AC-15)', async () => {
    setup(PROJECT_ADMIN)
    expect(selectorProps.current.selectDefault).not.toBe(false)
    await clickScope('Project')
    expect(selectorProps.current.selectDefault).toBe(false)
    // a late project list cannot fill the field: nothing selected on our side
    expect(selectorProps.current.value).toBe('')
  })

  it('blocks submit at Project scope while no project is chosen', async () => {
    const { ref, onSubmit } = setup(PROJECT_ADMIN)
    await clickScope('Project')
    await act(async () => {
      await ref.current!.submit()
    })
    expect(onSubmit).not.toHaveBeenCalled()
    expect(selectorProps.current.error).toBeTruthy()
  })

  it('blocks a non-Global submit at User scope after a round trip cleared the project', async () => {
    const { ref, onSubmit } = setup(PROJECT_ADMIN, { projectName: 'p2' })
    await clickScope('Project')
    await clickScope('User')
    expect(selectorProps.current.value).toBe('')
    await act(async () => {
      await ref.current!.submit()
    })
    expect(onSubmit).not.toHaveBeenCalled()
    expect(selectorProps.current.error).toBe('Project is required')
  })

  it('submits at Project scope with the chosen project and the scope as 2nd argument', async () => {
    const { ref, onSubmit } = setup(PROJECT_ADMIN)
    await clickScope('Project')
    await act(async () => {
      selectorProps.current.onChange('p1')
    })
    await act(async () => {
      await ref.current!.submit()
    })
    expect(onSubmit).toHaveBeenCalledTimes(1)
    const [values, scope] = onSubmit.mock.calls[0]
    expect(values.project_name).toBe('p1')
    expect(values.is_global).toBe(false)
    expect(scope).toBe('project')
  })

  it('scopeLocked disables both options and submits the locked scope', async () => {
    const { ref, onSubmit } = setup(PROJECT_ADMIN, {
      scope: 'project',
      scopeLocked: true,
      projectName: 'p1',
    })
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'User' }).disabled).toBe(true)
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Project' }).disabled).toBe(true)
    await act(async () => {
      await ref.current!.submit()
    })
    expect(onSubmit.mock.calls[0][1]).toBe('project')
  })

  it('editing shows Scope read-only (AC-21)', () => {
    setup(PROJECT_ADMIN, { editing: true })
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'User' }).disabled).toBe(true)
  })
})
