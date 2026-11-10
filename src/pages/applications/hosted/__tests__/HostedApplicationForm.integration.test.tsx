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

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { UnsavedChangesProvider } from '@/hooks/useUnsavedChangesWarning'
import { hostedApplicationsStore } from '@/store/hostedApplications'
import { userStore } from '@/store/user'
import type { HostedApplication, SuspensionRefused } from '@/types/entity/hostedApplication'
import api from '@/utils/api'

import HostedApplicationForm from '../HostedApplicationForm'

// The page frame: its header holds the Cancel and Save actions.
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

// What the server reports for a suspended application.
const SUSPENDED_REFUSES: SuspensionRefused[] = ['activate', 'move', 'publish', 'share_on']

beforeEach(() => {
  vi.restoreAllMocks()
  hostedApplicationsStore.reset()
  vi.spyOn(userStore, 'getProjects').mockResolvedValue([
    { name: 'alpha', display_name: null },
    { name: 'beta', display_name: null },
  ] as never)
})

const baseApp = (over: Partial<HostedApplication> = {}): HostedApplication =>
  ({
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    name: 'Visual',
    description: 'A diagram',
    project: 'alpha',
    shared: false,
    is_global: false,
    suspended: false,
    etag: 'W/"1"',
    user_abilities: ['read', 'write', 'delete'],
    ...over,
  } as HostedApplication)

const mockPatch = (app: HostedApplication) =>
  vi.spyOn(api, 'patch').mockResolvedValue({ json: async () => app } as Response)

const renderEdit = (app: HostedApplication) =>
  render(
    <UnsavedChangesProvider>
      <HostedApplicationForm
        application={app}
        onCancel={() => undefined}
        onSaved={() => undefined}
      />
    </UnsavedChangesProvider>
  )

// The selector greys out and ignores pointer events while disabled.
const projectSelectorLocked = async () =>
  !!(await screen.findByText('alpha')).closest('.pointer-events-none')

const sharedSwitch = () => screen.getByRole('switch', { name: /Shared with project/ })

describe('Application creation form at the store API boundary', () => {
  it('requires name and description before creating a private draft', async () => {
    const post = vi.spyOn(api, 'post')
    render(
      <UnsavedChangesProvider>
        <HostedApplicationForm onCancel={() => undefined} onSaved={() => undefined} />
      </UnsavedChangesProvider>
    )
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    expect(await screen.findByText('Name is required')).toBeInTheDocument()
    expect(screen.getByText('Description is required')).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
  })

  it('keeps entered text and the same request key after a transport failure', async () => {
    // fetch() rejects with a TypeError when the connection drops.
    const post = vi.spyOn(api, 'post').mockRejectedValue(new TypeError('Failed to fetch'))
    render(
      <UnsavedChangesProvider>
        <HostedApplicationForm onCancel={() => undefined} onSaved={() => undefined} />
      </UnsavedChangesProvider>
    )
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/Application name/), 'Delivery map')
    await user.type(screen.getByRole('textbox', { name: /^Description/ }), 'A static visual')
    await screen.findByText('alpha')
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    expect(
      await screen.findByText('Network error. Check your connection and try again.')
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    await waitFor(() => expect(post).toHaveBeenCalledTimes(2))
    expect(screen.getByLabelText(/Application name/)).toHaveValue('Delivery map')
    expect(new Headers(post.mock.calls[0][2]?.headers).get('Idempotency-Key')).toBe(
      new Headers(post.mock.calls[1][2]?.headers).get('Idempotency-Key')
    )
  })
})

describe('create retry after an edit', () => {
  it('sends an edited retry as a new create request with a new request key', async () => {
    const post = vi.spyOn(api, 'post').mockRejectedValue(new TypeError('Failed to fetch'))
    render(
      <UnsavedChangesProvider>
        <HostedApplicationForm onCancel={() => undefined} onSaved={() => undefined} />
      </UnsavedChangesProvider>
    )
    const user = userEvent.setup()
    const name = screen.getByLabelText(/Application name/)
    await user.type(name, 'Delivery map')
    await user.type(screen.getByRole('textbox', { name: /^Description/ }), 'A static visual')
    await screen.findByText('alpha')
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    await screen.findByText('Network error. Check your connection and try again.')
    await user.type(name, ' v2')
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    await waitFor(() => expect(post).toHaveBeenCalledTimes(2))
    expect(post.mock.calls[1][1]).toMatchObject({ name: 'Delivery map v2' })
    expect(new Headers(post.mock.calls[0][2]?.headers).get('Idempotency-Key')).not.toBe(
      new Headers(post.mock.calls[1][2]?.headers).get('Idempotency-Key')
    )
  })
})

describe('project and sharing fields', () => {
  it('shows a project selector and a Shared with project switch, and no folder field', async () => {
    render(
      <UnsavedChangesProvider>
        <HostedApplicationForm onCancel={() => undefined} onSaved={() => undefined} />
      </UnsavedChangesProvider>
    )
    expect(await screen.findByText('alpha')).toBeInTheDocument()
    expect(screen.getByText('Project')).toBeInTheDocument()
    expect(await projectSelectorLocked()).toBe(false)
    expect(sharedSwitch()).not.toBeChecked()
    // Named on the control itself, not only through the wrapping label (some tools read "on").
    expect(sharedSwitch()).toHaveAttribute('aria-label', 'Shared with project')
    expect(screen.queryByLabelText(/folder/i)).not.toBeInTheDocument()
  })

  it('creates with the project and shared when switched on', async () => {
    const post = vi
      .spyOn(api, 'post')
      .mockResolvedValue({ json: async () => baseApp() } as Response)
    render(
      <UnsavedChangesProvider>
        <HostedApplicationForm onCancel={() => undefined} onSaved={() => undefined} />
      </UnsavedChangesProvider>
    )
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/Application name/), 'Delivery map')
    await user.type(screen.getByRole('textbox', { name: /^Description/ }), 'A static visual')
    await screen.findByText('alpha')
    await user.click(sharedSwitch())
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    expect(post.mock.calls[0][1]).toEqual({
      name: 'Delivery map',
      description: 'A static visual',
      project: 'alpha',
      shared: true,
    })
  })

  it('sends only the changed description for a suspended, shared application', async () => {
    const app = baseApp({ suspended: true, suspension_refuses: SUSPENDED_REFUSES, shared: true })
    const patch = mockPatch(app)
    renderEdit(app)
    const user = userEvent.setup()
    const description = screen.getByRole('textbox', { name: /^Description/ })
    await user.clear(description)
    await user.type(description, 'New words')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1))
    expect(patch.mock.calls[0][1]).toEqual({ description: 'New words' })
  })

  it('sends only shared when toggling it on a published application', async () => {
    const app = baseApp({ is_global: true })
    const patch = mockPatch(app)
    renderEdit(app)
    await userEvent.setup().click(sharedSwitch())
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1))
    expect(patch.mock.calls[0][1]).toEqual({ shared: true })
  })

  it('does not PATCH when nothing changed', async () => {
    const app = baseApp()
    const patch = mockPatch(app)
    const onSaved = vi.fn()
    render(
      <UnsavedChangesProvider>
        <HostedApplicationForm application={app} onCancel={() => undefined} onSaved={onSaved} />
      </UnsavedChangesProvider>
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(patch).not.toHaveBeenCalled()
  })

  it('cannot turn sharing on while suspended, but can turn it off', () => {
    const { unmount } = renderEdit(
      baseApp({ suspended: true, suspension_refuses: SUSPENDED_REFUSES, shared: false })
    )
    expect(sharedSwitch()).toBeDisabled()
    unmount()
    renderEdit(baseApp({ suspended: true, suspension_refuses: SUSPENDED_REFUSES, shared: true }))
    expect(sharedSwitch()).toBeEnabled()
  })

  it('saves a name change for an application with no project, even while suspended', async () => {
    const app = baseApp({ project: null, suspended: true, suspension_refuses: SUSPENDED_REFUSES })
    const patch = mockPatch(app)
    renderEdit(app)
    const user = userEvent.setup()
    const name = screen.getByLabelText(/Application name/)
    await user.clear(name)
    await user.type(name, 'Renamed')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1))
    expect(patch.mock.calls[0][1]).toEqual({ name: 'Renamed' })
  })

  it('locks the project while suspended', async () => {
    renderEdit(baseApp({ suspended: true, suspension_refuses: SUSPENDED_REFUSES }))
    expect(await projectSelectorLocked()).toBe(true)
  })

  it('is read-only without write access', async () => {
    renderEdit(baseApp({ user_abilities: ['read'] }))
    expect(sharedSwitch()).toBeDisabled()
    expect(await projectSelectorLocked()).toBe(true)
    expect(screen.getByLabelText(/Application name/)).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })
})

describe('leaving the page', () => {
  it('cancels without saving when nothing changed', async () => {
    const onCancel = vi.fn()
    const onSaved = vi.fn()
    render(
      <UnsavedChangesProvider>
        <HostedApplicationForm application={baseApp()} onCancel={onCancel} onSaved={onSaved} />
      </UnsavedChangesProvider>
    )
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledOnce()
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('hands the saved application over after an edit', async () => {
    const app = baseApp()
    const saved = { ...app, name: 'Renamed' }
    mockPatch(saved)
    const onSaved = vi.fn()
    render(
      <UnsavedChangesProvider>
        <HostedApplicationForm application={app} onCancel={() => undefined} onSaved={onSaved} />
      </UnsavedChangesProvider>
    )
    const name = screen.getByLabelText(/Application name/)
    await userEvent.setup().clear(name)
    await userEvent.setup().type(name, 'Renamed')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved))
  })

  it('shows the create and edit titles', () => {
    const { unmount } = render(
      <UnsavedChangesProvider>
        <HostedApplicationForm onCancel={() => undefined} onSaved={() => undefined} />
      </UnsavedChangesProvider>
    )
    expect(screen.getByRole('heading', { name: 'Create application' })).toBeInTheDocument()
    unmount()
    renderEdit(baseApp())
    expect(screen.getByRole('heading', { name: 'Edit application' })).toBeInTheDocument()
    // Edit changes the details only; versions are uploaded from the details page.
    expect(screen.queryByText(/Upload the build output/)).not.toBeInTheDocument()
  })
})
