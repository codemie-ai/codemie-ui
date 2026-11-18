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

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { FEATURE_FLAGS } from '@/constants/featureFlags'
import { mockRouterState } from '@/hooks/__mocks__/useVueRouter'
import { integrationsStore } from '@/store/integrations'
import { userStore } from '@/store/user'
import { mockAPI, renderPage } from '@/test-utils/integration'

const mockToaster = vi.hoisted(() => ({ error: vi.fn(), info: vi.fn(), success: vi.fn() }))
vi.mock('@/utils/toaster', () => ({ default: mockToaster }))
// The first-visit "Guided Tour Available" popup opens mid-test as a modal and takes focus.
vi.mock('@/components/appLevel/AutoPopupManager', () => ({ default: () => null }))

const baseUser = {
  user_id: 'u1',
  email: 'test@example.com',
  name: 'Test User',
  username: 'testuser',
  is_admin: false,
  is_maintainer: false,
  user_type: 'INTERNAL',
  applications: ['p1'],
}

const mockMember = () =>
  mockAPI('GET', 'v1/user', { ...baseUser, applications_admin: [], projects: [] })

const mockProjectAdmin = () =>
  mockAPI('GET', 'v1/user', {
    ...baseUser,
    applications_admin: ['p1'],
    projects: [{ name: 'p1', display_name: 'P One', is_project_admin: true }],
  })

// Administers p1 and is only a member of p2: p2 is offered at User scope, never at Project scope.
const mockAdminOfP1MemberOfP2 = () =>
  mockAPI('GET', 'v1/user', {
    ...baseUser,
    applications: ['p1', 'p2'],
    applications_admin: ['p1'],
    projects: [
      { name: 'p1', display_name: 'P One', is_project_admin: true },
      { name: 'p2', display_name: 'P Two', is_project_admin: false },
    ],
  })

const PROJECT_CLEARED_NOTE =
  'Project was cleared: at Project scope you can pick only projects you administer.'

const projectSettingPosts = () =>
  vi
    .mocked(fetch)
    .mock.calls.filter(
      ([input, init]) =>
        String(input instanceof Request ? input.url : input).includes('v1/settings/project') &&
        (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase() === 'POST'
    )

const setRoute = (name: string, path: string, query: Record<string, string> = {}) => {
  mockRouterState.currentRoute.value = { path, name, params: {}, query, hash: '' }
  mockRouterState.push.mockClear()
}

const scopeButton = (name: 'User' | 'Project') => screen.findByRole('button', { name })

const expectScope = async (name: 'User' | 'Project') => {
  const button = await scopeButton(name)
  await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'))
}

describe('NewIntegrationPage', () => {
  beforeEach(() => {
    mockToaster.error.mockClear()
    mockToaster.info.mockClear()
    integrationsStore.savedRow = null
    userStore.user = null
  })

  const fillAndSave = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.type(await screen.findByPlaceholderText('Plugin Key'), 'secret')
    await user.click(screen.getByRole('button', { name: 'Save' }))
  }

  it('renders the tour anchors and the New Integration title', async () => {
    mockProjectAdmin()
    setRoute('new-integration', '/integrations/new')
    const { container } = renderPage('/integrations/new')

    await expectScope('User')
    expect(screen.getAllByText('New Integration').length).toBeGreaterThan(0)
    ;[
      'integration-scope-field',
      'integration-project-scope-fields',
      'integration-credential-type-field',
      'integration-save-actions',
    ].forEach((anchor) =>
      expect(container.querySelector(`[data-onboarding="${anchor}"]`)).toBeInTheDocument()
    )
  })

  it('opens at User for a member even with ?scope=project', async () => {
    mockMember()
    setRoute('new-integration', '/integrations/new', { scope: 'project' })
    renderPage('/integrations/new')

    await expectScope('User')
  })

  it('opens at Project for a project admin with ?scope=project', async () => {
    mockProjectAdmin()
    setRoute('new-integration', '/integrations/new', { scope: 'project' })
    renderPage('/integrations/new')

    await expectScope('Project')
  })

  it('opens at User on the legacy /integrations/user/new link', async () => {
    mockProjectAdmin()
    setRoute('new-user-integration', '/integrations/user/new')
    renderPage('/integrations/user/new')

    await expectScope('User')
  })

  it('opens at Project with project and scope locked on the admin project page link', async () => {
    mockProjectAdmin()
    setRoute('new-project-integration', '/integrations/project/new', { project_name: 'p1' })
    renderPage('/integrations/project/new')

    await expectScope('Project')
    expect(await scopeButton('User')).toHaveAttribute('aria-disabled', 'true')
    expect(await scopeButton('Project')).toHaveAttribute('aria-disabled', 'true')
  })

  it('Cancel returns to the admin project page for p1', async () => {
    mockProjectAdmin()
    setRoute('new-project-integration', '/integrations/project/new', { project_name: 'p1' })
    renderPage('/integrations/project/new')
    await expectScope('Project')

    await userEvent.setup().click(screen.getByRole('button', { name: 'Cancel' }))

    expect(mockRouterState.push).toHaveBeenCalledWith({
      name: 'projects-management-integrations',
      params: { projectName: 'p1' },
    })
  })

  it('Save from the admin project page saves for p1 and returns there', async () => {
    mockProjectAdmin()
    mockAPI('POST', 'v1/settings/project', {})
    setRoute('new-project-integration', '/integrations/project/new', {
      project_name: 'p1',
      credentialType: 'plugin',
    })
    renderPage('/integrations/project/new')
    await expectScope('Project')

    await fillAndSave(userEvent.setup())

    await waitFor(() =>
      expect(mockRouterState.push).toHaveBeenCalledWith({
        name: 'projects-management-integrations',
        params: { projectName: 'p1' },
      })
    )
    // No Integrations list follows, so nothing is left for it and the page confirms the save.
    expect(integrationsStore.savedRow).toBeNull()
    expect(mockToaster.info).toHaveBeenCalledWith('Integration created successfully')
  })

  it('shows the error toast and stays on the form when a Project save is rejected with 403', async () => {
    mockProjectAdmin()
    mockAPI('POST', 'v1/settings/project', { error: { message: 'Forbidden' } }, 403)
    setRoute('new-integration', '/integrations/new', {
      scope: 'project',
      credentialType: 'plugin',
      project: 'p1',
    })
    renderPage('/integrations/new')
    await expectScope('Project')

    await fillAndSave(userEvent.setup())

    await waitFor(() => expect(mockToaster.error).toHaveBeenCalled())
    expect(mockToaster.info).not.toHaveBeenCalled()
    expect(mockRouterState.push).not.toHaveBeenCalled()
    expect(integrationsStore.savedRow).toBeNull()
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('does not apply ?project= the person cannot use at Project scope: empty, required, noted (AC-11)', async () => {
    mockAdminOfP1MemberOfP2()
    mockAPI('POST', 'v1/settings/project', {})
    setRoute('new-integration', '/integrations/new', {
      scope: 'project',
      credentialType: 'plugin',
      project: 'p2',
    })
    renderPage('/integrations/new')
    await expectScope('Project')

    expect(await screen.findByText(PROJECT_CLEARED_NOTE)).toBeInTheDocument()
    expect(screen.queryByText('p2 (P Two)')).not.toBeInTheDocument()

    await fillAndSave(userEvent.setup())

    expect(await screen.findByText('Project is required')).toBeInTheDocument()
    expect(projectSettingPosts()).toHaveLength(0)
    expect(integrationsStore.savedRow).toBeNull()
  })

  it('still prefills ?project= the person administers at Project scope (AC-11)', async () => {
    mockAdminOfP1MemberOfP2()
    setRoute('new-integration', '/integrations/new', { scope: 'project', project: 'p1' })
    renderPage('/integrations/new')
    await expectScope('Project')

    expect(await screen.findByText('p1 (P One)')).toBeInTheDocument()
    expect(screen.queryByText(PROJECT_CLEARED_NOTE)).not.toBeInTheDocument()
  })

  it('keeps project_name from the admin project page locked as given, unlike ?project= (AC-19)', async () => {
    mockAdminOfP1MemberOfP2()
    setRoute('new-project-integration', '/integrations/project/new', { project_name: 'p2' })
    renderPage('/integrations/project/new')
    await expectScope('Project')

    expect(await screen.findByText('p2 (P Two)')).toBeInTheDocument()
    expect(screen.queryByText(PROJECT_CLEARED_NOTE)).not.toBeInTheDocument()
    expect(await scopeButton('User')).toHaveAttribute('aria-disabled', 'true')
  })

  // On mousedown the Credential Type field loses focus and re-selects its option. If that re-pick
  // drops the scope-switch note, the field moves up under the pointer and the click never lands.
  it.each([
    { from: 'user', to: 'Project', type: 'DIAL' },
    { from: 'project', to: 'User', type: 'Google OAuth' },
  ] as const)(
    'opens Credential Type on the first click after $type switched Scope to $to (AC-13)',
    async ({ from, to, type }) => {
      mockProjectAdmin()
      // Google OAuth is offered only while its feature flag is on.
      mockAPI('GET', 'v1/config', [{ id: FEATURE_FLAGS.GOOGLE_OAUTH, settings: { enabled: true } }])
      setRoute('new-integration', '/integrations/new', { scope: from })
      renderPage('/integrations/new')
      await expectScope(from === 'user' ? 'User' : 'Project')
      const user = userEvent.setup()

      await user.click(await screen.findByRole('button', { name: 'Credential Type' }))
      await user.click(await screen.findByText(type, { selector: 'span' }))
      await expectScope(to)
      const note = `${type} is available only at ${to} scope, so Scope switched to ${to}.`
      expect(screen.getByText(note)).toBeInTheDocument()
      // The list has finished closing: its exit transition unmounts the panel. jsdom cannot lay the
      // panel out, so PrimeReact leaves it visibility:hidden and the role queries need `hidden`.
      await waitFor(() =>
        expect(screen.queryByRole('listbox', { hidden: true })).not.toBeInTheDocument()
      )

      await user.click(screen.getByRole('button', { name: 'Credential Type' }))

      expect(screen.getByText(note)).toBeInTheDocument()
      expect(await screen.findByRole('listbox', { hidden: true })).toBeInTheDocument()
    }
  )

  it('sets the saved row to the tuple after a Project save', async () => {
    mockProjectAdmin()
    mockAPI('POST', 'v1/settings/project', {})
    setRoute('new-integration', '/integrations/new', {
      scope: 'project',
      credentialType: 'plugin',
      project: 'p1',
    })
    renderPage('/integrations/new')
    await expectScope('Project')

    await fillAndSave(userEvent.setup())

    await waitFor(() =>
      expect(integrationsStore.savedRow).toEqual({
        scope: 'project',
        project_name: 'p1',
        credential_type: 'Plugin',
        alias: expect.any(String),
      })
    )
    expect(integrationsStore.savedRow?.alias).not.toBe('')
    // The list's own 'Integration saved' toast is the only confirmation (AC-16).
    expect(mockToaster.info).not.toHaveBeenCalled()
  })
})

describe('Edit Project integration — Scope', () => {
  beforeEach(() => {
    userStore.user = null
  })

  it('shows Scope read-only and saves through PUT v1/settings/project/{id} (AC-21)', async () => {
    mockProjectAdmin()
    mockAPI('GET', 'v1/settings/project', {
      data: [
        {
          id: 'set-1',
          user_id: 'u1',
          alias: 'my-plugin',
          credential_type: 'plugin',
          project_name: 'p1',
          credential_values: [{ key: 'plugin_key', value: 'secret' }],
          is_global: false,
          setting_type: 'project',
        },
      ],
      pagination: { page: 0, per_page: 100, pages: 1, total: 1 },
    })
    mockAPI('PUT', 'v1/settings/project/set-1', {})
    setRoute('edit-project-integration', '/integrations/project/edit', {
      project_name: 'p1',
      credential_type: 'plugin',
      alias: 'my-plugin',
    })
    renderPage('/integrations/project/edit')

    await expectScope('Project')
    expect(await scopeButton('User')).toHaveAttribute('aria-disabled', 'true')
    expect(await scopeButton('Project')).toHaveAttribute('aria-disabled', 'true')

    await userEvent.setup().click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(mockToaster.info).toHaveBeenCalledWith('Integration updated successfully')
    )
  })
})
