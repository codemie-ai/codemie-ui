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
import { beforeEach, describe, expect, it, vi } from 'vitest'

import HostedApplicationViewer from '../HostedApplicationViewer'
import { hostedRoutes } from '../hostedRoutes'

const boundary = vi.hoisted(() => ({
  route: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', versionId: undefined as string | undefined },
  navigate: vi.fn(),
  store: {
    capabilities: { view: true },
    ensureCapabilities: vi.fn(),
    getApplication: vi.fn(),
    issueLaunch: vi.fn(),
    deleteApplication: vi.fn(),
    publish: vi.fn(),
    unpublish: vi.fn(),
  },
}))
vi.mock('react-router', () => ({
  useParams: () => boundary.route,
  useLocation: () => ({ key: 'k' }),
  useNavigate: () => boundary.navigate,
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}))
vi.mock('@/hooks/useIsMobileLayout', () => ({ useIsMobileLayout: () => false }))
vi.mock('@/components/Layouts/Layout', () => ({
  default: ({ title, subtitle, children, rightContent }: any) => (
    <main>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {rightContent}
      {children}
    </main>
  ),
}))
vi.mock('@/components/NavigationMore/NavigationMore', () => ({
  default: ({ items }: any) => (
    <div>
      {items
        .filter((item: any) => !item.hidden)
        .map((item: any) => (
          <button key={item.title} disabled={item.disabled} onClick={item.onClick}>
            {item.title}
          </button>
        ))}
    </div>
  ),
}))
vi.mock('@/components/ConfirmationModal', () => ({
  default: ({ onConfirm }: any) => (
    <dialog open>
      <button onClick={onConfirm}>Confirm</button>
    </dialog>
  ),
}))
vi.mock('@/store/hostedApplications', () => ({
  hostedApplicationsStore: boundary.store,
  hostedAuthenticationGeneration: () => 1,
  hostedErrorMessage: (cause: Error) => cause.message,
}))
vi.mock('@/utils/hostedApplicationLaunch', () => ({
  HOSTED_UUID: /^[a-f0-9-]{36}$/,
  submitHostedLaunch: vi.fn(),
}))
vi.mock('@/utils/hostedApplicationFrame', () => ({
  createHostedFrame: () => ({ target: 'codemie-hosted-x', document: '<iframe></iframe>' }),
}))
vi.mock('../HostedSharePopup', () => ({
  default: ({ app, visible }: any) => (visible ? <dialog open>share {app.id}</dialog> : null),
}))
vi.mock('../HostedUploadDialog', () => ({ default: () => null }))

const app = (over: Record<string, unknown> = {}) => ({
  id: boundary.route.id,
  name: 'Visual',
  publisher: { display_name: 'Creator' },
  user_abilities: ['read', 'write', 'delete'],
  can_share: true,
  has_active_version: true,
  etag: 'e',
  ...over,
})

beforeEach(() => {
  vi.clearAllMocks()
  boundary.route.versionId = undefined
  boundary.store.getApplication.mockResolvedValue(app())
  boundary.store.issueLaunch.mockResolvedValue({ ticket: 't', action: 'https://c.test/x' })
  boundary.store.deleteApplication.mockResolvedValue(undefined)
})

describe('viewer launch', () => {
  it('launches the active version with no version id for a manager', async () => {
    render(<HostedApplicationViewer />)
    await waitFor(() => expect(boundary.store.issueLaunch).toHaveBeenCalled())
    expect(boundary.store.issueLaunch.mock.calls[0][1]).toBeUndefined()
  })

  it('launches nothing and says there is no active version yet', async () => {
    boundary.store.getApplication.mockResolvedValue(app({ has_active_version: false }))
    render(<HostedApplicationViewer />)
    expect(await screen.findByRole('heading', { name: 'No active version yet' })).toBeVisible()
    expect(boundary.store.issueLaunch).not.toHaveBeenCalled()
  })

  it('says a refused version is no longer available, without Retry, and points a manager to upload', async () => {
    boundary.store.issueLaunch.mockRejectedValue(
      Object.assign(new Error('This version is no longer available'), {
        status: 422,
        parsedError: { details: { code: 'VERSION_NOT_ACCEPTED' } },
      })
    )
    render(<HostedApplicationViewer />)
    expect(
      await screen.findByRole('heading', { name: 'This version is no longer available' })
    ).toBeVisible()
    expect(screen.getByText(/Upload a new version or activate another one/)).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()
  })

  it('tells a reader the publisher has to activate another version', async () => {
    boundary.store.getApplication.mockResolvedValue(app({ user_abilities: ['read'] }))
    boundary.store.issueLaunch.mockRejectedValue(
      Object.assign(new Error('x'), {
        status: 422,
        parsedError: { details: { code: 'VERSION_NOT_ACCEPTED' } },
      })
    )
    render(<HostedApplicationViewer />)
    expect(
      await screen.findByText('Its publisher needs to activate another version.')
    ).toBeVisible()
  })

  it('keeps Retry for other launch failures', async () => {
    boundary.store.issueLaunch.mockRejectedValue(
      Object.assign(new Error('Server error'), { status: 500 })
    )
    render(<HostedApplicationViewer />)
    expect(await screen.findByRole('button', { name: 'Retry' })).toBeVisible()
  })

  it('still previews a chosen version without an active one', async () => {
    boundary.route.versionId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    boundary.store.getApplication.mockResolvedValue(app({ has_active_version: false }))
    render(<HostedApplicationViewer />)
    await waitFor(() => expect(boundary.store.issueLaunch).toHaveBeenCalled())
    expect(boundary.store.issueLaunch.mock.calls[0][1]).toBe(boundary.route.versionId)
  })
})

describe('viewer unavailable', () => {
  it.each([403, 404])('shows the generic not-available copy on a %s', async (status) => {
    boundary.store.getApplication.mockRejectedValue({
      status,
      parsedError: { message: 'server detail' },
    })
    render(<HostedApplicationViewer />)
    expect(
      await screen.findByRole('heading', { name: 'This application is not available' })
    ).toBeVisible()
    expect(screen.queryByText('server detail')).not.toBeInTheDocument()
    expect(boundary.store.issueLaunch).not.toHaveBeenCalled()
  })
})

describe('old application addresses', () => {
  it.each(['explore', 'trash', 'folders'])(
    'shows the standard not-available page for /apps/%s without calling the API',
    async (segment) => {
      const original = boundary.route.id
      boundary.route.id = segment
      try {
        render(<HostedApplicationViewer />)
        expect(
          await screen.findByRole('heading', { name: 'This application is not available' })
        ).toBeVisible()
        expect(screen.queryByText('Unable to open application')).not.toBeInTheDocument()
        expect(screen.queryByText('Invalid application link.')).not.toBeInTheDocument()
        expect(boundary.store.getApplication).not.toHaveBeenCalled()
        expect(boundary.store.issueLaunch).not.toHaveBeenCalled()
      } finally {
        boundary.route.id = original
      }
    }
  )

  it('treats a malformed preview version id as not available too', async () => {
    boundary.route.versionId = 'not-a-version'
    render(<HostedApplicationViewer />)
    expect(
      await screen.findByRole('heading', { name: 'This application is not available' })
    ).toBeVisible()
    expect(boundary.store.getApplication).not.toHaveBeenCalled()
  })
})

describe('viewer actions', () => {
  it('opens the share popup from the actions', async () => {
    render(<HostedApplicationViewer />)
    fireEvent.click(await screen.findByRole('button', { name: 'Share' }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('share ' + boundary.route.id)
  })

  it('deletes after a confirmation and leaves for the applications root', async () => {
    render(<HostedApplicationViewer />)
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(boundary.store.deleteApplication).toHaveBeenCalled())
    await waitFor(() => expect(boundary.navigate).toHaveBeenCalledWith(hostedRoutes.root))
  })

  it('offers no management actions to a reader', async () => {
    boundary.store.getApplication.mockResolvedValue(
      app({ user_abilities: ['read'], can_share: false })
    )
    render(<HostedApplicationViewer />)
    await screen.findByRole('button', { name: 'Reload' })
    expect(screen.queryByRole('button', { name: 'Share' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull()
  })
})
