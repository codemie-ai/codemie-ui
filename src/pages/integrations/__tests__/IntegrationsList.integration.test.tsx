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

import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { mockRouterState, replace } from '@/hooks/__mocks__/useVueRouter'
import { integrationsStore } from '@/store/integrations'
import { userStore } from '@/store/user'
import { requestRegistry } from '@/test-utils/_mock-state'
import { mockAPI, renderPage } from '@/test-utils/integration'

const mockToaster = vi.hoisted(() => ({
  error: vi.fn(),
  info: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
}))
vi.mock('@/utils/toaster', () => ({ default: mockToaster, setToasterAnnouncer: vi.fn() }))

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

const profiles = {
  member: () => mockAPI('GET', 'v1/user', { ...baseUser, applications_admin: [], projects: [] }),
  projectAdmin: () =>
    mockAPI('GET', 'v1/user', {
      ...baseUser,
      applications_admin: ['p1'],
      projects: [{ name: 'p1', display_name: 'P One', is_project_admin: true }],
    }),
  platformAdmin: () =>
    mockAPI('GET', 'v1/user', {
      ...baseUser,
      is_admin: true,
      applications_admin: [],
      projects: [],
    }),
}

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'r1',
  user_id: 'u1',
  date: '2026-01-01T00:00:00Z',
  update_date: '2026-01-01T00:00:00Z',
  alias: 'row-one',
  credential_type: 'Jira',
  project_name: 'p1',
  display_name: null,
  default: false,
  setting_hash: null,
  is_global: false,
  credential_values: [{ key: 'url', value: 'https://jira.example.com' }],
  setting_type: 'user',
  ...overrides,
})

const page = (data: unknown[], over: Record<string, number> = {}) => ({
  data,
  pagination: { page: 0, per_page: 10, pages: 1, total: data.length, ...over },
})

const mockSettings = (data: unknown[], over: Record<string, number> = {}) =>
  mockAPI('GET', 'v1/settings', page(data, over))

// A network failure: fetch itself rejects, so no HTTP response reaches the API layer.
const failSettingsList = () =>
  requestRegistry.set('GET:v1/settings', {
    factory: () => {
      throw new TypeError('Failed to fetch')
    },
  })

const requestedUrls = () =>
  (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map(([input]) => String(input))

const hasType = (type: string) =>
  settingsRequests().some((r) => (r.filters.type as string[] | undefined)?.includes(type))

const settingsRequests = () =>
  requestedUrls()
    .filter((url) => /v1\/settings\?/.test(url))
    .map((url) => {
      const params = new URL(url, 'http://localhost/').searchParams
      return {
        scope: params.get('scope'),
        page: params.get('page'),
        perPage: params.get('per_page'),
        filters: JSON.parse(params.get('filters') || '{}') as Record<string, unknown>,
      }
    })

const lastRequest = () => settingsRequests().at(-1)

const open = (search = '') => {
  window.history.replaceState({}, '', `/integrations${search}`)
  mockRouterState.currentRoute.value = {
    path: '/integrations',
    name: 'integrations',
    params: {},
    query: {},
    hash: '',
  }
  return renderPage('/integrations')
}

const scopeRadio = (name: 'User' | 'Project') => screen.findByRole('radio', { name })

describe('IntegrationsList', () => {
  beforeEach(() => {
    mockToaster.error.mockClear()
    mockToaster.info.mockClear()
    mockToaster.success.mockClear()
    integrationsStore.savedRow = null
    mockRouterState.push.mockClear()
    replace.mockClear()
    window.localStorage.clear()
    userStore.user = null
    mockAPI('GET', 'v1/settings/project/users', [])
  })

  describe('member', () => {
    it('requests scope=user, shows Global, and has no Scope filter or switch', async () => {
      profiles.member()
      mockSettings([row()])
      open()

      expect(await screen.findByText('row-one')).toBeInTheDocument()
      expect(lastRequest()?.scope).toBe('user')
      expect(screen.getByText('GLOBAL')).toBeInTheDocument()
      expect(screen.queryByText('SCOPE')).not.toBeInTheDocument()
      expect(screen.queryByRole('radio', { name: 'Project' })).not.toBeInTheDocument()
      expect(screen.queryByText('Integration Type:')).not.toBeInTheDocument()
      expect(screen.queryByText('CREATED BY')).not.toBeInTheDocument()
    })

    it('requests scope=user even with ?scope=project in the address', async () => {
      profiles.member()
      mockSettings([row()])
      open('?scope=project')

      await screen.findByText('row-one')
      expect(lastRequest()?.scope).toBe('user')
    })
  })

  describe.each([
    ['project admin', profiles.projectAdmin],
    ['platform admin', profiles.platformAdmin],
  ])('%s', (_name, signIn) => {
    it('requests scope=all and lists both scopes in response order with the exact headers', async () => {
      signIn()
      mockSettings([
        row({ id: 'a', alias: 'first-project', setting_type: 'project' }),
        row({ id: 'b', alias: 'second-user', is_global: true }),
        row({ id: 'c', alias: 'third-user' }),
      ])
      open()

      await screen.findByText('first-project')
      expect(lastRequest()?.scope).toBe('all')

      const headers = screen
        .getAllByRole('columnheader')
        .map((h) => h.textContent?.trim())
        .filter(Boolean)
      expect(headers).toEqual(['Project', 'Alias', 'Scope', 'Type', 'URL', 'State'])

      const aliases = screen
        .getAllByRole('row')
        .map((r) => r.textContent ?? '')
        .filter((t) => /(first|second|third)-/.test(t))
      expect(aliases.map((t) => /(first-project|second-user|third-user)/.exec(t)?.[0])).toEqual([
        'first-project',
        'second-user',
        'third-user',
      ])

      const rowOf = (alias: string) => screen.getByText(alias).closest('tr') as HTMLElement
      expect(within(rowOf('first-project')).getByText('Project')).toBeInTheDocument()
      expect(within(rowOf('first-project')).queryByText('Global')).not.toBeInTheDocument()
      expect(within(rowOf('second-user')).getByText('User')).toBeInTheDocument()
      expect(within(rowOf('second-user')).getByText('Global')).toBeInTheDocument()
      expect(within(rowOf('third-user')).queryByText('Global')).not.toBeInTheDocument()
    })

    it('offers the Scope filter', async () => {
      signIn()
      mockSettings([row()])
      open()

      expect(await scopeRadio('User')).toBeInTheDocument()
      expect(await scopeRadio('Project')).toBeInTheDocument()
    })
  })

  describe('scope filter', () => {
    it('Scope Project requests scope=project, keeps scope in the URL, shows Created by and hides Global', async () => {
      profiles.projectAdmin()
      mockSettings([row({ setting_type: 'project' })])
      open()
      await screen.findByText('row-one')

      await userEvent.setup().click(await scopeRadio('Project'))

      await waitFor(() => expect(lastRequest()?.scope).toBe('project'))
      expect(replace).toHaveBeenLastCalledWith({ query: { scope: 'project' } })
      expect(await screen.findByText('CREATED BY')).toBeInTheDocument()
      expect(screen.queryByText('GLOBAL')).not.toBeInTheDocument()
    })

    it('Scope User shows Global and requests scope=user', async () => {
      profiles.projectAdmin()
      mockSettings([row()])
      open()
      await screen.findByText('row-one')

      await userEvent.setup().click(await scopeRadio('User'))

      await waitFor(() => expect(lastRequest()?.scope).toBe('user'))
      expect(await screen.findByText('GLOBAL')).toBeInTheDocument()
      expect(screen.queryByText('CREATED BY')).not.toBeInTheDocument()
    })

    it('Scope All leaves scope out of the URL and shows the hint', async () => {
      profiles.projectAdmin()
      mockSettings([row()])
      open('?scope=project')
      await screen.findByText('row-one')
      expect(lastRequest()?.scope).toBe('project')

      await userEvent.setup().click(screen.getByRole('radio', { name: 'All' }))

      await waitFor(() => expect(lastRequest()?.scope).toBe('all'))
      const lastReplace = replace.mock.calls.at(-1)?.[0] as { query: Record<string, unknown> }
      expect(lastReplace.query).not.toHaveProperty('scope')
      expect(
        screen.getByText('Pick a scope to filter by Global or Created by.')
      ).toBeInTheDocument()
      expect(screen.queryByText('GLOBAL')).not.toBeInTheDocument()
      expect(screen.queryByText('CREATED BY')).not.toBeInTheDocument()
    })

    it('treats ?scope=bogus as All', async () => {
      profiles.projectAdmin()
      mockSettings([row()])
      open('?scope=bogus')

      await screen.findByText('row-one')
      expect(lastRequest()?.scope).toBe('all')
    })

    it('Type DIAL then Scope User shows the notice and drops DIAL from the request', async () => {
      profiles.projectAdmin()
      mockSettings([row({ credential_type: 'DIAL', setting_type: 'project' })])
      open('?type=DIAL')
      await screen.findByText('row-one')
      expect(lastRequest()?.filters.type).toEqual(['DIAL'])

      await userEvent.setup().click(await scopeRadio('User'))

      expect(
        await screen.findByText('DIAL was removed from Type: it exists only at Project scope.')
      ).toBeInTheDocument()
      await waitFor(() => expect(lastRequest()?.scope).toBe('user'))
      expect(lastRequest()?.filters).not.toHaveProperty('type')
    })

    it('drops a restored type bound to the other scope before the first request', async () => {
      profiles.projectAdmin()
      mockSettings([row()])
      open('?scope=user&type=DIAL')
      await screen.findByText('row-one')

      expect(lastRequest()?.scope).toBe('user')
      expect(hasType('DIAL')).toBe(false)
      const lastReplace = replace.mock.calls.at(-1)?.[0] as { query: Record<string, unknown> }
      expect(lastReplace.query).not.toHaveProperty('type')
    })

    it('drops a restored Project-only type for a member, who sees only User', async () => {
      profiles.member()
      mockSettings([row()])
      open('?type=DIAL')
      await screen.findByText('row-one')

      expect(lastRequest()?.scope).toBe('user')
      expect(hasType('DIAL')).toBe(false)
    })

    it('applies a Scope change as a single request', async () => {
      profiles.projectAdmin()
      mockSettings([row()])
      open('?type=DIAL')
      await screen.findByText('row-one')
      await waitFor(() => expect(settingsRequests().length).toBeGreaterThan(0))
      const before = settingsRequests().length

      await userEvent.setup().click(await scopeRadio('User'))

      await waitFor(() => expect(lastRequest()?.scope).toBe('user'))
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 50)
      })
      expect(settingsRequests().length).toBe(before + 1)
    })

    it('tags bound types and disables the other scope in the Type filter', async () => {
      profiles.projectAdmin()
      mockSettings([row()])
      open('?scope=user')
      await screen.findByText('row-one')

      fireEvent.click(
        await screen.findByText('Type', { selector: '[class*="p-multiselect-label"]' })
      )

      expect(await screen.findByText('Project only')).toBeInTheDocument()
      expect(screen.getAllByText('Not available at User scope').length).toBeGreaterThan(0)
    })
  })

  describe('pagination', () => {
    it('takes page totals from the response', async () => {
      profiles.projectAdmin()
      mockSettings([row()], { pages: 3, total: 25 })
      open()

      expect(await screen.findByRole('button', { name: 'Page 3' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Page 4' })).not.toBeInTheDocument()
    })

    it('requests the next page', async () => {
      profiles.projectAdmin()
      mockSettings([row()], { pages: 3, total: 25 })
      open()

      await userEvent.setup().click(await screen.findByRole('button', { name: 'Page 2' }))

      await waitFor(() => expect(lastRequest()?.page).toBe('1'))
    })

    it('requests the chosen page size', async () => {
      profiles.projectAdmin()
      mockSettings([row()], { pages: 3, total: 25 })
      open()
      await screen.findByText('row-one')

      fireEvent.click(document.getElementById('per-page') as HTMLElement)
      fireEvent.click(screen.getByLabelText('20 items'))

      await waitFor(() => expect(lastRequest()?.perPage).toBe('20'))
    })
  })

  describe('row actions', () => {
    const openMenu = async (alias: string, action: 'Edit' | 'Delete') => {
      const user = userEvent.setup()
      await user.click(await screen.findByRole('button', { name: `More options ${alias}` }))
      await user.click(await screen.findByText(action))
      return user
    }

    it('Edit on a Project row goes to the project edit route', async () => {
      profiles.projectAdmin()
      mockSettings([row({ setting_type: 'project', alias: 'shared', project_name: 'p1' })])
      open()

      await openMenu('shared', 'Edit')

      expect(mockRouterState.push).toHaveBeenCalledWith({
        name: 'edit-project-integration',
        query: { project_name: 'p1', credential_type: 'Jira', alias: 'shared' },
      })
    })

    it('Edit on a User row goes to the user edit route', async () => {
      profiles.projectAdmin()
      mockSettings([row({ alias: 'mine' })])
      open()

      await openMenu('mine', 'Edit')

      expect(mockRouterState.push).toHaveBeenCalledWith({
        name: 'edit-user-integration',
        query: { project_name: 'p1', credential_type: 'Jira', alias: 'mine' },
      })
    })

    it('Delete calls DELETE for the row scope, then re-fetches at once with the current filters', async () => {
      profiles.projectAdmin()
      mockSettings([row({ id: 'sp1', setting_type: 'project', alias: 'shared' })])
      mockAPI('DELETE', 'v1/settings/project/sp1', {})
      open('?scope=project')
      await screen.findByText('shared')
      const before = settingsRequests().length

      const user = await openMenu('shared', 'Delete')
      await user.click(await screen.findByRole('button', { name: /^Delete$/ }))

      await waitFor(() => expect(settingsRequests().length).toBe(before + 1))
      const { calls } = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock
      const deleteIdx = calls.findIndex(
        ([url, init]) =>
          String(url).includes('v1/settings/project/sp1') && init?.method === 'DELETE'
      )
      expect(deleteIdx).toBeGreaterThan(-1)
      expect(lastRequest()).toMatchObject({ scope: 'project', page: '0' })
      expect(mockToaster.info).toHaveBeenCalledWith('Integration deleted successfully')
    })

    it('Delete of the only row on a later page shows the page before it', async () => {
      profiles.projectAdmin()
      mockSettings([row({ id: 'sp1', setting_type: 'project', alias: 'shared' })], {
        pages: 2,
        total: 11,
      })
      mockAPI('DELETE', 'v1/settings/project/sp1', {})
      open('?scope=project')
      await userEvent.setup().click(await screen.findByRole('button', { name: 'Page 2' }))
      await waitFor(() => expect(lastRequest()?.page).toBe('1'))

      const user = await openMenu('shared', 'Delete')
      await user.click(await screen.findByRole('button', { name: /^Delete$/ }))

      await waitFor(() =>
        expect(mockToaster.info).toHaveBeenCalledWith('Integration deleted successfully')
      )
      await waitFor(() => expect(lastRequest()?.page).toBe('0'))
    })

    it('a network failure of the reload after a Delete shows an error toast', async () => {
      profiles.projectAdmin()
      mockSettings([row({ id: 'sp1', setting_type: 'project', alias: 'shared' })])
      mockAPI('DELETE', 'v1/settings/project/sp1', {})
      open('?scope=project')
      await screen.findByText('shared')
      failSettingsList()

      const user = await openMenu('shared', 'Delete')
      await user.click(await screen.findByRole('button', { name: /^Delete$/ }))

      await waitFor(() =>
        expect(mockToaster.error).toHaveBeenCalledWith('Failed to load integrations')
      )
    })

    it('a failed Delete shows the error toast only', async () => {
      profiles.projectAdmin()
      mockSettings([row({ id: 'sp1', setting_type: 'project', alias: 'shared' })])
      mockAPI('DELETE', 'v1/settings/project/sp1', { error: { message: 'Nope' } }, 500)
      open('?scope=project')
      await screen.findByText('shared')
      const before = settingsRequests().length

      const user = await openMenu('shared', 'Delete')
      await user.click(await screen.findByRole('button', { name: /^Delete$/ }))

      await waitFor(() => expect(mockToaster.error).toHaveBeenCalled())
      expect(mockToaster.info).not.toHaveBeenCalled()
      expect(settingsRequests().length).toBe(before)
    })
  })

  describe('Create', () => {
    it('opens New Integration at user scope by default', async () => {
      profiles.projectAdmin()
      mockSettings([row()])
      open()
      await screen.findByText('row-one')

      await userEvent.setup().click(screen.getByRole('button', { name: 'New Integration' }))

      expect(mockRouterState.push).toHaveBeenCalledWith({
        name: 'new-integration',
        query: { scope: 'user' },
      })
    })

    it('opens New Integration at project scope when the list is at Scope Project', async () => {
      profiles.projectAdmin()
      mockSettings([row({ setting_type: 'project' })])
      open('?scope=project')
      await screen.findByText('row-one')

      await userEvent.setup().click(screen.getByRole('button', { name: 'New Integration' }))

      expect(mockRouterState.push).toHaveBeenCalledWith({
        name: 'new-integration',
        query: { scope: 'project' },
      })
    })

    it('has a single Create button and no dropdown', async () => {
      profiles.member()
      mockSettings([row()])
      open()
      await screen.findByText('row-one')

      expect(screen.getAllByRole('button', { name: 'New Integration' })).toHaveLength(1)
      expect(screen.queryByText('Create User Integration')).not.toBeInTheDocument()
    })
  })

  describe('Created by', () => {
    it('loads the creators and offers Me at Scope Project', async () => {
      profiles.projectAdmin()
      // The creator's name differs from the profile name, so Me resolves only through the list.
      mockAPI('GET', 'v1/settings/project/users', [{ name: 'Creator Name', username: 'testuser' }])
      mockSettings([row({ setting_type: 'project' })])
      open('?scope=project')
      await screen.findByText('row-one')

      expect(await screen.findByText('CREATED BY')).toBeInTheDocument()
      await waitFor(() =>
        expect(requestedUrls().some((url) => url.includes('v1/settings/project/users'))).toBe(true)
      )

      await userEvent.setup().click(await screen.findByRole('checkbox', { name: 'Me' }))

      await waitFor(() => expect(lastRequest()?.filters.created_by).toBe('Creator Name'))
    })
  })

  describe('load failures', () => {
    it('a network failure of the list shows an error toast', async () => {
      profiles.projectAdmin()
      failSettingsList()
      open()

      await waitFor(() =>
        expect(mockToaster.error).toHaveBeenCalledWith('Failed to load integrations')
      )
    })
  })

  describe('saved row', () => {
    const saved = {
      scope: 'project' as const,
      project_name: 'p1',
      credential_type: 'Jira',
      alias: 'new-one',
    }
    const savedRow = () => row({ id: undefined, setting_type: 'project', alias: 'new-one' })

    it('highlights the saved Project row that has no id and toasts the return', async () => {
      profiles.projectAdmin()
      integrationsStore.setSavedRow(saved)
      mockSettings([row(), savedRow()])
      open()

      const cell = await screen.findByText('new-one')
      await waitFor(() => expect(cell.closest('tr')).toHaveAttribute('data-highlighted', 'true'))
      expect(screen.getByText('row-one').closest('tr')).not.toHaveAttribute('data-highlighted')
      expect(mockToaster.success).toHaveBeenCalledTimes(1)
      expect(mockToaster.success).toHaveBeenCalledWith(
        'Integration saved<br>You are back on the same view.'
      )
    })

    it('shows no toast on a second mount', async () => {
      profiles.projectAdmin()
      integrationsStore.setSavedRow(saved)
      mockSettings([savedRow()])
      const first = open()
      await screen.findByText('new-one')
      await waitFor(() => expect(mockToaster.success).toHaveBeenCalledTimes(1))
      first.unmount()

      open()
      await screen.findByText('new-one')
      expect(mockToaster.success).toHaveBeenCalledTimes(1)
    })

    it('says the filters hide it and offers to reset Scope and Type', async () => {
      profiles.projectAdmin()
      integrationsStore.setSavedRow(saved)
      mockSettings([row()])
      open('?scope=user')

      await screen.findByText('row-one')
      await waitFor(() => expect(mockToaster.success).toHaveBeenCalledTimes(1))
      const [text, options] = mockToaster.success.mock.calls[0]
      expect(text).toMatch(
        /^Integration saved<br>Your filters hide it: it is a Project .*Jira.* integration\.$/
      )
      expect(options.action.label).toBe('Show all scopes and types')

      mockSettings([row(), savedRow()])
      options.action.onClick()

      await waitFor(() => expect(lastRequest()?.scope).toBe('all'))
      expect(lastRequest()?.filters).not.toHaveProperty('type')
    })

    it('highlights the saved row the response spells differently (null project, type case)', async () => {
      profiles.projectAdmin()
      integrationsStore.setSavedRow({
        scope: 'user',
        project_name: '',
        credential_type: 'Jira',
        alias: 'mine',
      })
      mockSettings([
        row(),
        row({
          id: 'g1',
          alias: 'mine',
          project_name: null,
          credential_type: 'jira',
          is_global: true,
        }),
      ])
      open()

      const cell = await screen.findByText('mine')
      await waitFor(() => expect(cell.closest('tr')).toHaveAttribute('data-highlighted', 'true'))
      expect(mockToaster.success).toHaveBeenCalledWith(
        'Integration saved<br>You are back on the same view.'
      )
    })

    it('shows the plain toast when no filter can hide the row', async () => {
      profiles.projectAdmin()
      integrationsStore.setSavedRow(saved)
      mockSettings([row()])
      open()

      await screen.findByText('row-one')
      await waitFor(() => expect(mockToaster.success).toHaveBeenCalledTimes(1))
      expect(mockToaster.success).toHaveBeenCalledWith('Integration saved')
    })

    it('the reset action keeps a filter changed after the toast appeared', async () => {
      profiles.projectAdmin()
      integrationsStore.setSavedRow(saved)
      mockSettings([row()])
      open('?scope=user')
      await screen.findByText('row-one')
      await waitFor(() => expect(mockToaster.success).toHaveBeenCalledTimes(1))
      const [, options] = mockToaster.success.mock.calls[0]

      await userEvent.setup().type(screen.getByPlaceholderText('Search'), 'abc')
      await waitFor(() => expect(lastRequest()?.filters.search).toBe('abc'), { timeout: 3000 })

      options.action.onClick()

      await waitFor(() => expect(lastRequest()?.scope).toBe('all'))
      expect(lastRequest()?.filters.search).toBe('abc')
    })

    it('the reset action does nothing once the list is gone', async () => {
      profiles.projectAdmin()
      integrationsStore.setSavedRow(saved)
      mockSettings([row()])
      const view = open('?scope=user')
      await screen.findByText('row-one')
      await waitFor(() => expect(mockToaster.success).toHaveBeenCalledTimes(1))
      const [, options] = mockToaster.success.mock.calls[0]
      view.unmount()
      replace.mockClear()

      options.action.onClick()

      expect(replace).not.toHaveBeenCalled()
    })

    it('offers no action when only the Project filter hides the row', async () => {
      profiles.projectAdmin()
      integrationsStore.setSavedRow(saved)
      mockSettings([row({ project_name: 'p2' })])
      open('?project=p2')

      await screen.findByText('row-one')
      await waitFor(() => expect(mockToaster.success).toHaveBeenCalledTimes(1))
      const [text, options] = mockToaster.success.mock.calls[0]
      expect(text).toMatch(/^Integration saved<br>Your filters hide it: it is a Project /)
      expect(options?.action).toBeUndefined()
    })
  })
})
