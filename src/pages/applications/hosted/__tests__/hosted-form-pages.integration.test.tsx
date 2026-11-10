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

import './reviewRegressionSetup'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, type InitialEntry } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { userStore } from '@/store/user'
import { navigate } from '@/test-utils/_mock-state'

import EditHostedApplicationPage from '../EditHostedApplicationPage'
import { hostedRoutes } from '../hostedRoutes'
import NewHostedApplicationPage from '../NewHostedApplicationPage'

const boundary = vi.hoisted(() => ({
  store: {
    capabilities: { view: true, create: true } as { view: boolean; create: boolean } | null,
    capabilitiesStatus: 'loaded',
    ensureCapabilities: vi.fn(async () => undefined),
    getApplication: vi.fn(),
    createApplication: vi.fn(),
    updateApplication: vi.fn(),
    uploadArtifact: vi.fn(),
    loadUsage: vi.fn(async () => undefined),
  },
}))
vi.mock('@/store/hostedApplications', () => ({
  hostedApplicationsStore: boundary.store,
  hostedAuthenticationGeneration: () => 0,
  hostedErrorMessage: (cause: Error) => cause.message,
  HOSTED_COVER_TYPES: ['image/png', 'image/jpeg', 'image/webp'],
  HOSTED_COVER_MAX_BYTES: 1024 * 1024,
}))
vi.mock('@/components/Layouts/Layout', () => ({
  default: ({ title, rightContent, onBack, children }: any) => (
    <main>
      <h1>{title}</h1>
      <button onClick={onBack}>Back</button>
      {rightContent}
      {children}
    </main>
  ),
}))
vi.mock('../../ApplicationsSidebar', () => ({ default: () => <nav>Applications</nav> }))

const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const app = {
  id,
  name: 'Visual',
  description: 'A diagram',
  project: 'alpha',
  shared: false,
  user_abilities: ['read', 'write'],
}
// useNavigate is the shared `navigate` spy (setupTests); the pages never leave the rendered route.

const renderNew = (entry: InitialEntry = '/apps/new') =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/apps/new" element={<NewHostedApplicationPage />} />
      </Routes>
    </MemoryRouter>
  )
const renderEdit = (entry: InitialEntry = `/apps/${id}/edit`) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/apps/:id/edit" element={<EditHostedApplicationPage />} />
      </Routes>
    </MemoryRouter>
  )

const fillCreate = async () => {
  fireEvent.change(screen.getByLabelText(/Application name/), { target: { value: 'Visual' } })
  fireEvent.change(screen.getByLabelText(/^Description/), { target: { value: 'A diagram' } })
  await screen.findByText('alpha')
}

beforeEach(() => {
  vi.clearAllMocks()
  boundary.store.capabilities = { view: true, create: true }
  boundary.store.capabilitiesStatus = 'loaded'
  vi.spyOn(userStore, 'getProjects').mockResolvedValue([{ name: 'alpha' }] as never)
})

describe('create application page', () => {
  it('creates the application and replaces the page with its details page', async () => {
    boundary.store.createApplication.mockResolvedValue(app)
    renderNew()
    expect(screen.getByRole('heading', { name: 'Create application' })).toBeInTheDocument()
    expect(screen.getByRole('navigation')).toHaveTextContent('Applications')
    await fillCreate()
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(hostedRoutes.details(id), { replace: true })
    )
    expect(boundary.store.createApplication).toHaveBeenCalledWith(
      { name: 'Visual', description: 'A diagram', project: 'alpha' },
      expect.any(String)
    )
  })

  it('returns to the collection it was opened from on Cancel', () => {
    renderNew({ pathname: '/apps/new', state: { from: 'project' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(navigate).toHaveBeenCalledWith(-1)
  })

  it('goes to My apps on Cancel when opened from a link', () => {
    renderNew()
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(navigate).toHaveBeenCalledWith('/apps', { replace: true })
  })

  it('sends someone who cannot create back to the catalog', () => {
    boundary.store.capabilities = { view: true, create: false }
    renderNew({ pathname: '/apps/new', state: { from: 'shared' } })
    expect(navigate).toHaveBeenCalledWith('/apps/shared', { replace: true })
    expect(screen.queryByLabelText(/Application name/)).not.toBeInTheDocument()
  })

  it('sends the page to Platform apps when custom applications are off', () => {
    boundary.store.capabilities = { view: false, create: false }
    renderNew()
    expect(navigate).toHaveBeenCalledWith('/apps/platform', { replace: true })
  })

  it('waits for the capabilities, and offers a retry when they fail', () => {
    boundary.store.capabilities = null
    boundary.store.capabilitiesStatus = 'failed'
    renderNew()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(boundary.store.ensureCapabilities).toHaveBeenLastCalledWith(true)
  })
})

describe('edit application page', () => {
  it('loads the application and saves only what changed, then returns to its details', async () => {
    boundary.store.getApplication.mockResolvedValue(app)
    boundary.store.updateApplication.mockResolvedValue({ ...app, name: 'Renamed' })
    renderEdit()
    const name = await screen.findByLabelText(/Application name/)
    expect(name).toHaveValue('Visual')
    expect(screen.getByRole('heading', { name: 'Edit application' })).toBeInTheDocument()
    fireEvent.change(name, { target: { value: 'Renamed' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(boundary.store.updateApplication).toHaveBeenCalledWith(app, { name: 'Renamed' })
    )
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(hostedRoutes.details(id), { replace: true })
    )
  })

  it('goes back through history when opened from the details page', async () => {
    boundary.store.getApplication.mockResolvedValue(app)
    renderEdit({ pathname: `/apps/${id}/edit`, state: { from: 'details' } })
    await screen.findByLabelText(/Application name/)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(navigate).toHaveBeenCalledWith(-1)
    expect(boundary.store.updateApplication).not.toHaveBeenCalled()
  })

  it('sends someone who cannot manage the application to its details page', async () => {
    boundary.store.getApplication.mockResolvedValue({ ...app, user_abilities: ['read'] })
    renderEdit()
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(hostedRoutes.details(id), { replace: true })
    )
    expect(screen.queryByLabelText(/Application name/)).not.toBeInTheDocument()
  })

  it.each([403, 404])('shows the not-available state on a %s', async (status) => {
    boundary.store.getApplication.mockRejectedValue({ status, message: 'server detail' })
    renderEdit()
    expect(
      await screen.findByRole('heading', { name: 'This application is not available' })
    ).toBeInTheDocument()
    expect(screen.queryByText('server detail')).not.toBeInTheDocument()
  })

  it('shows a malformed id as not available without asking the server', async () => {
    renderEdit('/apps/not-an-id/edit')
    expect(
      await screen.findByRole('heading', { name: 'This application is not available' })
    ).toBeInTheDocument()
    expect(boundary.store.getApplication).not.toHaveBeenCalled()
  })

  it('offers a retry after a failed load', async () => {
    boundary.store.getApplication.mockRejectedValueOnce(new Error('Network error'))
    boundary.store.getApplication.mockResolvedValueOnce(app)
    renderEdit()
    expect(await screen.findByRole('alert')).toHaveTextContent('Network error')
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByLabelText(/Application name/)).toHaveValue('Visual')
  })

  it('does not load the application when custom applications are off', async () => {
    boundary.store.capabilities = { view: false, create: false }
    renderEdit()
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/apps/platform', { replace: true }))
    expect(boundary.store.getApplication).not.toHaveBeenCalled()
  })
})
