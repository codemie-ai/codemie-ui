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
import './reviewRegressionSetup'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { HOSTED_MESSAGE } from '@/utils/hostedApplicationMessages'

import HostedApplicationViewer from '../HostedApplicationViewer'

const boundary = vi.hoisted(() => ({
  epoch: 1,
  route: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', versionId: undefined as string | undefined },
  key: 'A1',
  navigate: vi.fn(),
  submit: vi.fn(),
  store: {
    capabilities: { view: true },
    ensureCapabilities: vi.fn(),
    getApplication: vi.fn(),
    issueLaunch: vi.fn(),
  },
}))
vi.mock('react-router', () => ({
  useParams: () => boundary.route,
  useLocation: () => ({ key: boundary.key }),
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
vi.mock('@/store/hostedApplications', () => ({
  hostedApplicationsStore: boundary.store,
  hostedAuthenticationGeneration: () => boundary.epoch,
  hostedErrorMessage: (cause: Error) => cause.message,
}))
vi.mock('../HostedSharePopup', () => ({ default: () => null }))
vi.mock('../HostedUploadDialog', () => ({ default: () => null }))
vi.mock('@/utils/hostedApplicationLaunch', () => ({
  HOSTED_UUID: /^[a-f0-9-]{36}$/,
  submitHostedLaunch: boundary.submit,
}))
vi.mock('@/utils/hostedApplicationFrame', () => ({
  createHostedFrame: () => ({
    target: 'codemie-hosted-' + 'a'.repeat(32),
    document: '<iframe name="codemie-hosted-' + 'a'.repeat(32) + '"></iframe>',
  }),
}))
beforeEach(() => {
  vi.clearAllMocks()
  boundary.store.capabilities = { view: true }
  boundary.epoch = 1
  boundary.route.versionId = undefined
  boundary.key = 'A1'
  boundary.store.getApplication.mockResolvedValue({
    id: boundary.route.id,
    name: 'Visual',
    user_abilities: ['read', 'write'],
    has_active_version: true,
    publisher: { display_name: 'Creator' },
  })
  boundary.store.issueLaunch.mockResolvedValue({
    ticket: 'test-only',
    action: 'https://content.test/_platform/launch',
  })
})
async function frame() {
  const result = render(<HostedApplicationViewer />)
  await waitFor(() => expect(result.container.querySelector('iframe')).toBeInTheDocument())
  const outer = result.container.querySelector('iframe')!
  const inner = outer.contentDocument!.createElement('iframe')
  inner.name = 'codemie-hosted-' + 'a'.repeat(32)
  outer.contentDocument!.body.append(inner)
  return { ...result, outer }
}
it('submits one ticket only to the generated inner frame, never on unrelated messages', async () => {
  const { outer } = await frame()
  expect(outer).toHaveAttribute('allow', 'fullscreen')
  expect(outer).not.toHaveAttribute('allowfullscreen')
  expect(outer).toHaveAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups')
  expect(outer.getAttribute('sandbox')).not.toContain('escape-sandbox')
  fireEvent(
    window,
    new MessageEvent('message', {
      data: { type: 'codemie-hosted-ready' },
      origin: window.location.origin,
      source: window,
    })
  )
  expect(screen.getByText('Opening application…')).toBeInTheDocument()
  fireEvent.load(outer)
  fireEvent.load(outer)
  expect(boundary.submit).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ ticket: 'test-only' }),
    'codemie-hosted-' + 'a'.repeat(32)
  )
})
it('does not submit a pending ticket after authentication changes before React rerenders', async () => {
  const { outer } = await frame()
  boundary.epoch += 1
  fireEvent.load(outer)
  expect(boundary.submit).not.toHaveBeenCalled()
})
it.each([
  ['/apps/:id/view', undefined],
  ['/apps/:id/preview/:versionId', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'],
])('offers no way to open the app outside CodeMie on %s', async (_route, versionId) => {
  const opened = vi.spyOn(window, 'open').mockReturnValue(null)
  boundary.route.versionId = versionId
  const { outer } = await frame()
  expect(outer).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /new tab/i })).not.toBeInTheDocument()
  expect(opened).not.toHaveBeenCalled()
  opened.mockRestore()
})

it('sends the viewer to Platform apps without calling the hosted API while custom apps are off', async () => {
  boundary.store.capabilities = { view: false }
  render(<HostedApplicationViewer />)
  await waitFor(() =>
    expect(boundary.navigate).toHaveBeenCalledWith('/apps/platform', { replace: true })
  )
  expect(boundary.store.getApplication).not.toHaveBeenCalled()
  expect(boundary.store.issueLaunch).not.toHaveBeenCalled()
})

it('reports a busy or unavailable content host neutrally, as soon as the frame says so', async () => {
  const { outer } = await frame()
  fireEvent(
    window,
    new MessageEvent('message', {
      data: { type: 'codemie-hosted-unavailable' },
      origin: window.location.origin,
      source: outer.contentWindow,
    })
  )
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'The application is busy or unavailable right now. Retry in a few seconds.'
  )
})

it('tells a viewer that a shared application is unavailable without owner instructions', async () => {
  boundary.store.getApplication.mockResolvedValue({
    id: boundary.route.id,
    name: 'Shared visual',
    user_abilities: ['read'],
    has_active_version: false,
    publisher: { display_name: 'Creator' },
  })
  render(<HostedApplicationViewer />)
  expect(await screen.findByRole('heading', { name: 'No active version yet' })).toBeInTheDocument()
  expect(screen.queryByText(/Upload a version/)).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Return to Applications' })).toHaveAttribute(
    'href',
    '/apps'
  )
  expect(boundary.store.issueLaunch).not.toHaveBeenCalled()
})

it('tells a manager there is no active version yet and links to managing it', async () => {
  boundary.store.getApplication.mockResolvedValue({
    id: boundary.route.id,
    name: 'Old visual',
    user_abilities: ['read', 'write'],
    has_active_version: false,
    publisher: { display_name: 'Creator' },
  })
  render(<HostedApplicationViewer />)
  expect(await screen.findByRole('heading', { name: 'No active version yet' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Manage application' })).toHaveAttribute(
    'href',
    '/apps/' + boundary.route.id
  )
})

it('tells a manager previewing a version that people with access see the active one', async () => {
  boundary.route.versionId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  boundary.store.getApplication.mockResolvedValue({
    id: boundary.route.id,
    name: 'Visual',
    user_abilities: ['read', 'write'],
    has_active_version: true,
    publisher: { display_name: 'Creator' },
  })
  render(<HostedApplicationViewer />)
  expect(
    await screen.findByText('Previewing a version · people with access see the active version')
  ).toBeInTheDocument()
})

describe('opening a window for the application', () => {
  const APP = boundary.route.id
  const LAUNCHED = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
  const VIEW = window.location.origin + '/apps/' + APP + '/view?version=' + LAUNCHED + '&path='
  let now = 0
  const later = () => {
    now += 60 * 1000
  }
  beforeEach(() => {
    now += 10 * 60 * 1000
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    boundary.store.issueLaunch.mockResolvedValue({
      ticket: 'test-only',
      action: 'https://content.test/_platform/launch',
      versionId: LAUNCHED,
    })
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })
  const send = (
    source: MessageEventSource | null,
    data: unknown,
    origin = window.location.origin
  ) => fireEvent(window, new MessageEvent('message', { data, origin, source }))
  const CHANNEL = '0f8fad5b-d9cb-469f-a165-70867728950e'
  const OPENER = '&opener=' + CHANNEL
  const open = (target: unknown, name: unknown = '', features: unknown = null) => ({
    type: HOSTED_MESSAGE.open,
    target,
    name,
    channel: CHANNEL,
    features,
  })
  const popup = () => ({
    closed: false,
    focus: vi.fn(),
    close: vi.fn(),
    location: { href: 'about:blank' },
  })

  it('opens the version this viewer launched in a CodeMie window at the requested path', async () => {
    const opened = vi.spyOn(window, 'open').mockReturnValue(popup() as never)
    const { outer } = await frame()
    send(outer.contentWindow, open('/deck.html?presenter=1', 'presenter-view'))
    expect(opened).toHaveBeenCalledExactlyOnceWith(
      VIEW + '%2Fdeck.html%3Fpresenter%3D1' + OPENER,
      'codemie-app-' + APP + '-presenter-view'
    )
  })

  it('opens a preview on the same version, so both windows show one version', async () => {
    const opened = vi.spyOn(window, 'open').mockReturnValue(popup() as never)
    boundary.route.versionId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    const { outer } = await frame()
    send(outer.contentWindow, open('/print', ''))
    expect(opened).toHaveBeenCalledExactlyOnceWith(
      window.location.origin +
        '/apps/' +
        APP +
        '/preview/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb?path=%2Fprint' +
        OPENER,
      '_blank'
    )
  })

  it('reuses the window behind a repeated name instead of opening another', async () => {
    const window1 = popup()
    const opened = vi.spyOn(window, 'open').mockReturnValue(window1 as never)
    const { outer } = await frame()
    send(outer.contentWindow, open('/deck?presenter=1', 'presenter-reuse'))
    window1.location.href = opened.mock.calls[0][0] as string
    send(outer.contentWindow, open('/deck?presenter=1', 'presenter-reuse'))
    expect(opened).toHaveBeenCalledTimes(1)
    expect(window1.focus).toHaveBeenCalledTimes(1)
  })

  it('opens a new window for each _blank request instead of reusing one', async () => {
    const window1 = popup()
    const opened = vi.spyOn(window, 'open').mockReturnValue(window1 as never)
    const { outer } = await frame()
    send(outer.contentWindow, open('/detail/1', '_blank'))
    later()
    send(outer.contentWindow, open('/detail/2', '_blank'))
    expect(opened).toHaveBeenCalledTimes(2)
    expect(opened).toHaveBeenNthCalledWith(2, VIEW + '%2Fdetail%2F2' + OPENER, '_blank')
    expect(window1.focus).not.toHaveBeenCalled()
  })

  it('opens one window for a burst of requests from one click', async () => {
    const activation = { isActive: true }
    vi.stubGlobal('navigator', { ...navigator, userActivation: activation })
    const opened = vi.spyOn(window, 'open').mockImplementation(() => {
      activation.isActive = false
      return popup() as never
    })
    const { outer } = await frame()
    for (let i = 0; i < 5; i += 1) send(outer.contentWindow, open('/detail/' + i, '_blank'))
    expect(opened).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['a protocol-relative host', open('//evil.com')],
    ['a javascript: URL', open(['javascript', 'alert(1)'].join(':'))],
    ['an over-long path', open('/' + 'a'.repeat(4096))],
    ['a control character', open('/deck\u0000')],
    ['a space', open('/a b')],
    ['a target that is not a string', open(42)],
    ['a missing name', { type: HOSTED_MESSAGE.open, target: '/deck', channel: CHANNEL }],
    ['a bad channel', { ...open('/deck', 'x'), channel: 'short' }],
    ['an over-long name', open('/deck', 'n'.repeat(201))],
  ])('ignores a request with %s', async (_label, data) => {
    const opened = vi.spyOn(window, 'open').mockReturnValue(popup() as never)
    const { outer } = await frame()
    send(outer.contentWindow, data)
    send(outer.contentWindow, open('/valid', ''))
    expect(opened).toHaveBeenCalledExactlyOnceWith(VIEW + '%2Fvalid' + OPENER, '_blank')
  })

  it('ignores a request from another window or another origin', async () => {
    const opened = vi.spyOn(window, 'open').mockReturnValue(popup() as never)
    const { outer } = await frame()
    send(window, open('/deck', ''))
    send(outer.contentWindow, open('/deck', ''), 'https://content.test')
    send(outer.contentWindow, open('/valid', ''))
    expect(opened).toHaveBeenCalledExactlyOnceWith(VIEW + '%2Fvalid' + OPENER, '_blank')
  })

  it('opens the window the deck asks for as a pop-up of that size', async () => {
    const opened = vi.spyOn(window, 'open').mockReturnValue(popup() as never)
    const { outer } = await frame()
    send(
      outer.contentWindow,
      open('/?presenter=1', 'codemie-presenter', { width: 1180, height: 720 })
    )
    expect(opened).toHaveBeenCalledExactlyOnceWith(
      VIEW + '%2F%3Fpresenter%3D1' + OPENER,
      'codemie-app-' + APP + '-codemie-presenter',
      'popup,width=1180,height=720'
    )
  })

  it('closes the window it opened for a channel when its own content asks', async () => {
    const window1 = popup()
    vi.spyOn(window, 'open').mockReturnValue(window1 as never)
    const { outer } = await frame()
    send(outer.contentWindow, open('/deck', ''))
    send(window, { type: HOSTED_MESSAGE.close, channel: CHANNEL })
    send(
      outer.contentWindow,
      { type: HOSTED_MESSAGE.close, channel: CHANNEL },
      'https://content.test'
    )
    expect(window1.close).not.toHaveBeenCalled()
    send(outer.contentWindow, { type: HOSTED_MESSAGE.close, channel: CHANNEL })
    expect(window1.close).toHaveBeenCalledTimes(1)
  })

  it('opens a link the content brokered with no channel, with no opener in the address', async () => {
    const opened = vi.spyOn(window, 'open').mockReturnValue(popup() as never)
    const { outer } = await frame()
    send(outer.contentWindow, { ...open('/detail/1', '_blank'), channel: null })
    expect(opened).toHaveBeenCalledExactlyOnceWith(VIEW + '%2Fdetail%2F1', '_blank')
  })

  describe('a window that closes itself', () => {
    const withOpener = (opener: unknown) =>
      Object.defineProperty(window, 'opener', { configurable: true, get: () => opener })
    afterEach(() => {
      Reflect.deleteProperty(window, 'opener')
    })

    it('closes this window when CodeMie opened it and its own content asks', async () => {
      withOpener({ location: { origin: window.location.origin } })
      const closed = vi.spyOn(window, 'close').mockImplementation(() => undefined)
      const { outer } = await frame()
      send(window, { type: HOSTED_MESSAGE.closeSelf })
      send(outer.contentWindow, { type: HOSTED_MESSAGE.closeSelf }, 'https://content.test')
      expect(closed).not.toHaveBeenCalled()
      send(outer.contentWindow, { type: HOSTED_MESSAGE.closeSelf })
      expect(closed).toHaveBeenCalledTimes(1)
    })

    it('never closes a tab the person opened', async () => {
      withOpener(null)
      const closed = vi.spyOn(window, 'close').mockImplementation(() => undefined)
      const { outer } = await frame()
      send(outer.contentWindow, { type: HOSTED_MESSAGE.closeSelf })
      expect(closed).not.toHaveBeenCalled()
    })

    it('never closes a window another site opened', async () => {
      withOpener({
        get location(): { origin: string } {
          throw new DOMException('Blocked a frame with origin', 'SecurityError')
        },
      })
      const closed = vi.spyOn(window, 'close').mockImplementation(() => undefined)
      const { outer } = await frame()
      send(outer.contentWindow, { type: HOSTED_MESSAGE.closeSelf })
      expect(closed).not.toHaveBeenCalled()
    })
  })
})
