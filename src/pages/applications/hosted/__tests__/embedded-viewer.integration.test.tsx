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
import { beforeEach, expect, it, vi } from 'vitest'

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
