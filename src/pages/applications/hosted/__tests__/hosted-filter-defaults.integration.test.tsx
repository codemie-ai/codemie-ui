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

import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { PrimeReactProvider } from 'primereact/api'
import { MemoryRouter, useLocation } from 'react-router'
import { beforeEach, expect, it, vi } from 'vitest'

import HostedCatalogFilters from '@/pages/applications/hosted/HostedCatalogFilters'
import {
  HOSTED_COLLECTIONS,
  type HostedCollectionId,
} from '@/pages/applications/hosted/hostedCollections'
import { useHostedApplicationCatalog } from '@/pages/applications/hosted/useHostedApplicationCatalog'
import { userStore } from '@/store/user'
import type { HostedApplication } from '@/types/entity/hostedApplication'

vi.mock('valtio', async (importOriginal) => ({
  ...(await importOriginal<typeof import('valtio')>()),
  useSnapshot: (value: unknown) => value,
}))
const boundary = vi.hoisted(() => ({
  store: {
    capabilities: { view: true, create: true } as unknown,
    ensureCapabilities: vi.fn(),
    setFilters: vi.fn(),
    loadApplications: vi.fn(),
  },
}))
vi.mock('@/store/hostedApplications', () => ({
  hostedApplicationsStore: boundary.store,
  hostedErrorMessage: () => 'error',
  hostedAuthenticationGeneration: () => 1,
}))
vi.mock('@/store/applications', () => ({
  applicationsStore: { applications: [], fetchApplications: vi.fn().mockResolvedValue(undefined) },
}))
vi.mock('@/hooks/useVueRouter', () => ({ useVueRouter: () => ({ push: vi.fn() }) }))

const CREATORS = [
  { id: 'u1', username: 'jane', name: 'Jane Doe' },
  { id: 'u2', username: 'max', name: 'Max Payne' },
]

const SearchProbe = () => <output aria-label="url">{useLocation().search}</output>
const currentSearch = () => new URLSearchParams(screen.getByLabelText('url').textContent ?? '')

const renderFilters = (scope: HostedCollectionId, url = '/apps') => {
  const view = render(
    <MemoryRouter initialEntries={[url]}>
      <PrimeReactProvider value={{ unstyled: true, cssTransition: false }}>
        <HostedCatalogFilters query="" scope={scope} />
        <SearchProbe />
      </PrimeReactProvider>
    </MemoryRouter>
  )
  return view
}

/** Lets the project and creator options arrive before the user picks anything. */
const optionsLoaded = () => act(async () => {})

const renderCatalog = (url: string) =>
  renderHook(() => useHostedApplicationCatalog(), {
    wrapper: ({ children }) => <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>,
  })

const lastSentFilters = () => boundary.store.setFilters.mock.calls.at(-1)![0]

beforeEach(() => {
  boundary.store.setFilters.mockReset()
  boundary.store.loadApplications.mockReset()
  vi.spyOn(userStore, 'getProjects').mockResolvedValue([
    { name: 'alpha', display_name: 'Alpha' },
    { name: 'beta', display_name: 'Beta' },
  ] as never)
  vi.spyOn(userStore, 'loadHostedApplicationsUsers').mockResolvedValue(CREATORS as never)
})

it('offers Project, Created by, Shared and Status on My apps', async () => {
  renderFilters('mine')
  expect(screen.getByRole('textbox', { name: 'Search' })).toBeVisible()
  expect(screen.getByText('PROJECT')).toBeVisible()
  expect(screen.getByText('Created by')).toBeVisible()
  expect(screen.getByText('SHARED')).toBeVisible()
  expect(screen.getByText('STATUS')).toBeVisible()
  expect(screen.getByRole('radio', { name: 'Not shared' })).toBeInTheDocument()
  expect(screen.getByRole('radio', { name: 'With people' })).toBeInTheDocument()
  expect(screen.getByRole('radio', { name: 'With project' })).toBeInTheDocument()
  expect(screen.getByRole('radio', { name: 'Draft' })).toBeInTheDocument()
  expect(screen.getByRole('radio', { name: 'Published' })).toBeInTheDocument()
  expect(screen.getByRole('radio', { name: 'Unpublished' })).toBeInTheDocument()
  expect(screen.queryByText('ARTIFACT TYPE')).not.toBeInTheDocument()
  expect(screen.queryByText('VERSION STATE')).not.toBeInTheDocument()
  await waitFor(() => expect(userStore.loadHostedApplicationsUsers).toHaveBeenCalledWith('mine'))
})

it.each(['project', 'marketplace', 'shared'] as const)(
  "offers only Project and Created by on %s, with that tab's creators",
  async (scope) => {
    renderFilters(scope, '/apps/' + scope)
    expect(screen.getByText('PROJECT')).toBeVisible()
    expect(screen.getByText('Created by')).toBeVisible()
    expect(screen.queryByText('SHARED')).not.toBeInTheDocument()
    expect(screen.queryByText('STATUS')).not.toBeInTheDocument()
    expect(screen.queryByText('ARTIFACT TYPE')).not.toBeInTheDocument()
    expect(screen.queryByText('VERSION STATE')).not.toBeInTheDocument()
    await waitFor(() => expect(userStore.loadHostedApplicationsUsers).toHaveBeenCalledWith(scope))
  }
)

it('applies the search through the URL', async () => {
  renderFilters('mine')
  fireEvent.change(screen.getByRole('textbox', { name: 'Search' }), { target: { value: 'idea' } })
  await waitFor(() => expect(screen.getByRole('textbox', { name: 'Search' })).toHaveValue('idea'))
})

it('writes Shared and Status to the URL on My apps', async () => {
  renderFilters('mine', '/apps')
  await optionsLoaded()
  fireEvent.click(screen.getByRole('radio', { name: 'With people' }))
  await waitFor(() => expect(currentSearch().get('shared')).toBe('people'))
  fireEvent.click(screen.getByRole('radio', { name: 'Unpublished' }))
  await waitFor(() => expect(currentSearch().get('status')).toBe('unpublished'))
})

it('drops My apps-only filters from the URL on other tabs', async () => {
  renderFilters('project', '/apps/project?shared=people&status=draft&project=alpha')
  await optionsLoaded()
  fireEvent.change(screen.getByRole('textbox', { name: 'Search' }), { target: { value: 'map' } })
  // The search box applies after its own one-second debounce.
  await waitFor(() => expect(currentSearch().get('q')).toBe('map'), { timeout: 3000 })
  const search = currentSearch()
  expect(search.getAll('project')).toEqual(['alpha'])
  expect(search.has('shared')).toBe(false)
  expect(search.has('status')).toBe(false)
})

it('sends repeated projects, the creator and My apps-only filters on My apps', async () => {
  renderCatalog('/apps?project=alpha&project=beta&created_by=Jane%20Doe&shared=people&status=draft')
  await waitFor(() => expect(boundary.store.setFilters).toHaveBeenCalled())
  const sent = lastSentFilters()
  expect(sent).toEqual({
    scope: 'mine',
    q: '',
    sort: 'updated_desc',
    project: ['alpha', 'beta'],
    created_by: 'Jane Doe',
    shared: 'people',
    status: 'draft',
  })
})

it('ignores unknown Shared and Status values', async () => {
  renderCatalog('/apps?shared=everyone&status=archived')
  await waitFor(() => expect(boundary.store.setFilters).toHaveBeenCalled())
  const sent = lastSentFilters()
  expect(sent.shared).toBeUndefined()
  expect(sent.status).toBeUndefined()
})

it('drops Shared and Status when the tab leaves My apps', async () => {
  const query = '?project=alpha&created_by=Jane%20Doe&shared=people&status=draft'
  let url = '/apps' + query
  const { rerender } = renderHook(() => useHostedApplicationCatalog(), {
    wrapper: ({ children }) => (
      <MemoryRouter key={url} initialEntries={[url]}>
        {children}
      </MemoryRouter>
    ),
  })
  await waitFor(() => expect(lastSentFilters()).toMatchObject({ scope: 'mine', shared: 'people' }))

  url = '/apps/marketplace' + query
  rerender()
  await waitFor(() => expect(lastSentFilters().scope).toBe('marketplace'))
  const sent = lastSentFilters()
  expect(sent).toMatchObject({ project: ['alpha'], created_by: 'Jane Doe' })
  expect(sent).not.toHaveProperty('shared')
  expect(sent).not.toHaveProperty('status')
})

it.each(['project', 'marketplace', 'shared'] as const)(
  'opens the create page from the %s tab and tells it where to return',
  (scope) => {
    // useNavigate is a shared spy (setupTests).
    const opened = renderHook(() => useHostedApplicationCatalog(), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/apps/' + scope]}>{children}</MemoryRouter>
      ),
    })
    const { navigate } = opened.result.current
    act(() => opened.result.current.create())
    expect(navigate).toHaveBeenLastCalledWith('/apps/new', { state: { from: scope } })
  }
)

it('launches an application from the catalog in its viewer, not on its details page', () => {
  const opened = renderHook(() => useHostedApplicationCatalog(), {
    wrapper: ({ children }) => <MemoryRouter initialEntries={['/apps']}>{children}</MemoryRouter>,
  })
  const { navigate } = opened.result.current
  act(() => opened.result.current.open({ id: 'app-1' } as HostedApplication))
  expect(navigate).toHaveBeenLastCalledWith('/apps/app-1/view')
})

it('lets the collection registry decide which filters a tab offers, keeps and sends', async () => {
  const declared = HOSTED_COLLECTIONS.marketplace.filters
  HOSTED_COLLECTIONS.marketplace.filters = ['status']
  try {
    renderFilters('marketplace', '/apps/marketplace?status=draft&project=alpha')
    expect(screen.getByText('STATUS')).toBeVisible()
    expect(screen.queryByText('PROJECT')).not.toBeInTheDocument()
    expect(screen.queryByText('Created by')).not.toBeInTheDocument()
    expect(screen.queryByText('SHARED')).not.toBeInTheDocument()
    await optionsLoaded()
    fireEvent.click(screen.getByRole('radio', { name: 'Unpublished' }))
    await waitFor(() => expect(currentSearch().get('status')).toBe('unpublished'))
    expect(currentSearch().has('project')).toBe(false)

    renderCatalog('/apps/marketplace?status=draft&project=alpha&shared=people')
    await waitFor(() => expect(boundary.store.setFilters).toHaveBeenCalled())
    expect(lastSentFilters()).toEqual({
      scope: 'marketplace',
      q: '',
      sort: 'updated_desc',
      status: 'draft',
    })
  } finally {
    HOSTED_COLLECTIONS.marketplace.filters = declared
  }
})
