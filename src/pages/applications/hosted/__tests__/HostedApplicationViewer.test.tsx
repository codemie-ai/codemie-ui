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
  search: '',
  navigate: vi.fn(),
  createHostedFrame: vi.fn(),
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
  useLocation: () => ({ key: 'k', search: boundary.search }),
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
  createHostedFrame: boundary.createHostedFrame,
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
  boundary.search = ''
  boundary.store.getApplication.mockResolvedValue(app())
  boundary.store.issueLaunch.mockResolvedValue({ ticket: 't', action: 'https://c.test/x' })
  boundary.store.deleteApplication.mockResolvedValue(undefined)
  boundary.createHostedFrame.mockReturnValue({
    target: 'codemie-hosted-x',
    document: '<iframe></iframe>',
  })
})

describe('viewer launch', () => {
  it('launches the active version with no version id for a manager', async () => {
    render(<HostedApplicationViewer />)
    await waitFor(() => expect(boundary.store.issueLaunch).toHaveBeenCalled())
    expect(boundary.store.issueLaunch.mock.calls[0][1]).toBeUndefined()
  })

  it('lets the frame delegate full screen to its content and nothing else', async () => {
    const { container } = render(<HostedApplicationViewer />)
    await waitFor(() => expect(container.querySelector('iframe')).toBeInTheDocument())
    const outer = container.querySelector('iframe')!
    expect(outer).toHaveAttribute('allow', 'fullscreen')
    expect(outer).not.toHaveAttribute('allowfullscreen')
    expect(outer).toHaveAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups')
    expect(outer.getAttribute('sandbox')).not.toContain('escape-sandbox')
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

describe('viewer launch at a path', () => {
  const VERSION = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
  const at = (call = 0) => boundary.store.issueLaunch.mock.calls[call][3]
  const refused = () =>
    Object.assign(new Error('Invalid application launch'), {
      status: 422,
      parsedError: { details: { code: 'INVALID_LAUNCH' } },
    })

  it('launches at no path when the address has none', async () => {
    render(<HostedApplicationViewer />)
    await waitFor(() => expect(boundary.store.issueLaunch).toHaveBeenCalled())
    expect(at().path).toBeNull()
  })

  it.each([
    ['/apps/:id/view', undefined],
    ['/apps/:id/preview/:versionId', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'],
  ])('passes ?path= on %s to the launch and leaves the address as it is', async (_r, versionId) => {
    boundary.route.versionId = versionId
    boundary.search = '?path=' + encodeURIComponent('/deck.html?presenter=1#s2')
    render(<HostedApplicationViewer />)
    await waitFor(() => expect(boundary.store.issueLaunch).toHaveBeenCalled())
    expect(boundary.store.issueLaunch.mock.calls[0][1]).toBe(versionId)
    expect(at().path).toBe('/deck.html?presenter=1#s2')
    expect(boundary.navigate).not.toHaveBeenCalled()
  })

  it.each(['/_platform/view', '/a/../b', '/a%2Fb'])(
    'leaves it to the backend whether %s can be served',
    async (path) => {
      boundary.search = '?path=' + encodeURIComponent(path)
      render(<HostedApplicationViewer />)
      await waitFor(() => expect(boundary.store.issueLaunch).toHaveBeenCalled())
      expect(at().path).toBe(path)
    }
  )

  it.each([
    ['a protocol-relative host', '//evil.com'],
    ['a javascript: URL', ['javascript', 'alert(1)'].join(':')],
    ['an over-long path', '/' + 'a'.repeat(4096)],
    ['a control character', '/deck\n.html'],
    ['a space', '/a b'],
    ['a non-ASCII character', '/caf\u00e9'],
  ])('launches at the root instead of %s', async (_label, path) => {
    boundary.search = '?path=' + encodeURIComponent(path)
    render(<HostedApplicationViewer />)
    await waitFor(() => expect(boundary.store.issueLaunch).toHaveBeenCalled())
    expect(at().path).toBeNull()
  })

  it('launches once more at the root when the backend refuses the path', async () => {
    boundary.search = '?path=%2Fmissing'
    boundary.store.issueLaunch
      .mockRejectedValueOnce(refused())
      .mockResolvedValue({ ticket: 't', action: 'https://c.test/x' })
    const { container } = render(<HostedApplicationViewer />)
    await waitFor(() => expect(container.querySelector('iframe')).toBeInTheDocument())
    expect(boundary.store.issueLaunch).toHaveBeenCalledTimes(2)
    expect(at(0).path).toBe('/missing')
    expect(at(1).path).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Unable to open application' })).toBeNull()
  })

  it('never retries a refused path', async () => {
    boundary.search = '?path=%2Fmissing'
    boundary.store.issueLaunch.mockRejectedValue(refused())
    render(<HostedApplicationViewer />)
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(boundary.store.issueLaunch).toHaveBeenCalledTimes(3))
    expect(at(0).path).toBe('/missing')
    expect(at(1).path).toBeNull()
    expect(at(2).path).toBeNull()
  })

  it('does not relaunch at the root for a refusal that is not about the path', async () => {
    boundary.store.issueLaunch.mockRejectedValue(refused())
    render(<HostedApplicationViewer />)
    expect(await screen.findByRole('button', { name: 'Retry' })).toBeVisible()
    expect(boundary.store.issueLaunch).toHaveBeenCalledTimes(1)
  })

  it('reads ?path= once, so a later address change does not relaunch the application', async () => {
    boundary.search = '?path=%2Fone'
    const { rerender } = render(<HostedApplicationViewer />)
    await waitFor(() => expect(boundary.store.issueLaunch).toHaveBeenCalled())
    boundary.search = '?path=%2Ftwo'
    rerender(<HostedApplicationViewer />)
    await new Promise((resolve) => {
      setTimeout(resolve, 20)
    })
    expect(boundary.store.issueLaunch).toHaveBeenCalledTimes(1)
  })

  const CHANNEL = '0f8fad5b-d9cb-469f-a165-70867728950e'

  const frameOpener = () => boundary.createHostedFrame.mock.calls[0][2]

  it.each([
    ['/apps/:id/view', undefined],
    ['/apps/:id/preview/:versionId', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'],
  ])('passes ?opener= on %s to the frame, not the launch, read once', async (_r, versionId) => {
    boundary.route.versionId = versionId
    boundary.search = '?path=%2Fdeck&opener=' + CHANNEL
    const { rerender } = render(<HostedApplicationViewer />)
    await waitFor(() => expect(boundary.createHostedFrame).toHaveBeenCalled())
    expect(frameOpener()).toBe(CHANNEL)
    expect(at()).not.toHaveProperty('opener')
    boundary.search = '?path=%2Fdeck&opener=1f8fad5b-d9cb-469f-a165-70867728950e'
    rerender(<HostedApplicationViewer />)
    await new Promise((resolve) => {
      setTimeout(resolve, 20)
    })
    expect(boundary.store.issueLaunch).toHaveBeenCalledTimes(1)
    expect(boundary.createHostedFrame).toHaveBeenCalledTimes(1)
  })

  it.each(['short', 'a'.repeat(65), 'abcd_efgh', '../../x/y', 'abcdefgh"><script>'])(
    'gives the frame no opener for ?opener=%s',
    async (opener) => {
      boundary.search = '?opener=' + encodeURIComponent(opener)
      render(<HostedApplicationViewer />)
      await waitFor(() => expect(boundary.createHostedFrame).toHaveBeenCalled())
      expect(frameOpener()).toBeNull()
    }
  )

  it('keeps the opener for the frame when the backend refuses the path', async () => {
    boundary.search = '?path=%2Fmissing&opener=' + CHANNEL
    boundary.store.issueLaunch
      .mockRejectedValueOnce(refused())
      .mockResolvedValue({ ticket: 't', action: 'https://c.test/x' })
    render(<HostedApplicationViewer />)
    await waitFor(() => expect(boundary.createHostedFrame).toHaveBeenCalled())
    expect(at(1).path).toBeNull()
    expect(frameOpener()).toBe(CHANNEL)
  })

  it('pins the published view to the version in the address', async () => {
    boundary.search = '?version=' + VERSION + '&path=%2Fdeck'
    render(<HostedApplicationViewer />)
    await waitFor(() => expect(boundary.store.issueLaunch).toHaveBeenCalled())
    expect(at()).toEqual({ path: '/deck', publishedVersion: VERSION })
  })

  it.each([
    [
      'a preview, which names its version in the route',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      VERSION,
    ],
    ['a version that is not an id', undefined, 'latest'],
  ])('pins no published version for %s', async (_label, versionId, version) => {
    boundary.route.versionId = versionId
    boundary.search = '?version=' + version
    render(<HostedApplicationViewer />)
    await waitFor(() => expect(boundary.store.issueLaunch).toHaveBeenCalled())
    expect(at().publishedVersion).toBeNull()
  })

  const expectReplaced = async () => {
    expect(
      await screen.findByRole('heading', { name: 'This version is no longer available' })
    ).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Open the current version' }))
    expect(boundary.navigate).toHaveBeenCalledExactlyOnceWith(
      hostedRoutes.view(boundary.route.id) + '?path=%2Fdeck',
      { replace: true }
    )
  }

  it('does not launch a pinned version that a manager can see is no longer active', async () => {
    boundary.search = '?version=' + VERSION + '&path=%2Fdeck'
    boundary.store.getApplication.mockResolvedValue(
      app({ active_version_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' })
    )
    render(<HostedApplicationViewer />)
    await expectReplaced()
    expect(boundary.store.issueLaunch).not.toHaveBeenCalled()
  })

  it('offers the current version when a pinned launch is no longer found', async () => {
    boundary.search = '?version=' + VERSION + '&path=%2Fdeck'
    boundary.store.issueLaunch.mockRejectedValue({ status: 404 })
    render(<HostedApplicationViewer />)
    await expectReplaced()
  })

  it('launches a pinned version that is still the active one', async () => {
    boundary.search = '?version=' + VERSION
    boundary.store.getApplication.mockResolvedValue(app({ active_version_id: VERSION }))
    render(<HostedApplicationViewer />)
    await waitFor(() => expect(boundary.store.issueLaunch).toHaveBeenCalled())
    expect(at().publishedVersion).toBe(VERSION)
  })

  it('keeps the normal not-available page for a launch that is not found without a pin', async () => {
    boundary.store.issueLaunch.mockRejectedValue({ status: 404 })
    render(<HostedApplicationViewer />)
    expect(
      await screen.findByRole('heading', { name: 'This application is not available' })
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Open the current version' })).toBeNull()
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
