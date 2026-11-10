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
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { hostedRoutes } from '../hostedRoutes'
import HostedSharePage from '../HostedSharePage'

const TOKEN = 'secret-token-value-123'
const APP_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

const boundary = vi.hoisted(() => ({
  navigate: vi.fn(),
  openShareLink: vi.fn(),
  localAuth: true,
  store: {
    capabilities: { view: true } as { view: boolean } | null,
    ensureCapabilities: vi.fn(async () => undefined),
    openShareLink: undefined as unknown,
  },
}))
boundary.store.openShareLink = boundary.openShareLink
vi.mock('valtio', async (importOriginal) => ({
  ...(await importOriginal<typeof import('valtio')>()),
  useSnapshot: (value: unknown) => value,
}))
vi.mock('@/utils/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/utils')>()),
  getIsLocalAuth: () => boundary.localAuth,
}))
vi.mock('react-router', () => ({
  useParams: () => ({ token: 'secret-token-value-123' }),
  useNavigate: () => boundary.navigate,
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}))
vi.mock('@/store/hostedApplications', () => ({
  hostedApplicationsStore: boundary.store,
  hostedErrorMessage: () => 'Something went wrong',
}))

const consoleSpies = () =>
  (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) =>
    vi.spyOn(console, m).mockImplementation(() => {})
  )

describe('HostedSharePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    boundary.localAuth = true
    boundary.store.capabilities = { view: true }
  })
  afterEach(() => vi.restoreAllMocks())

  it('opens the link and replaces history with the viewer of the returned app', async () => {
    boundary.openShareLink.mockResolvedValue(APP_ID)
    render(<HostedSharePage />)
    expect(screen.getByRole('status')).toBeTruthy()
    await waitFor(() =>
      expect(boundary.navigate).toHaveBeenCalledWith(hostedRoutes.view(APP_ID), {
        replace: true,
      })
    )
    expect(boundary.openShareLink).toHaveBeenCalledWith(TOKEN)
  })

  it('opens the link only once under StrictMode', async () => {
    boundary.openShareLink.mockResolvedValue(APP_ID)
    render(
      <StrictMode>
        <HostedSharePage />
      </StrictMode>
    )
    await waitFor(() => expect(boundary.navigate).toHaveBeenCalledTimes(1))
    expect(boundary.openShareLink).toHaveBeenCalledTimes(1)
  })

  it.each([403, 404])('shows not-available on %s without leaking the token', async (status) => {
    const spies = consoleSpies()
    boundary.openShareLink.mockRejectedValue({ status })
    const { container } = render(<HostedSharePage />)
    await screen.findByText('This application is not available')
    expect(boundary.navigate).not.toHaveBeenCalled()
    expect(container.innerHTML).not.toContain(TOKEN)
    spies.forEach((spy) => expect(JSON.stringify(spy.mock.calls)).not.toContain(TOKEN))
  })

  it.each([0, 401])(
    'leaves status %s to the global handler (neutral loading state)',
    async (status) => {
      boundary.openShareLink.mockRejectedValue({ status })
      render(<HostedSharePage />)
      await waitFor(() => expect(boundary.openShareLink).toHaveBeenCalled())
      await Promise.resolve()
      expect(screen.queryByText('This application is not available')).toBeNull()
      expect(screen.getByRole('status')).toBeTruthy()
      expect(boundary.navigate).not.toHaveBeenCalled()
    }
  )

  it.each([
    ['non-local auth', false, { status: 401 }],
    ['an Access denied body', true, { status: 401, parsedError: { message: 'Access denied' } }],
  ])('does not hang on a 401 the global handler ignores (%s)', async (_, localAuth, cause) => {
    boundary.localAuth = localAuth
    boundary.openShareLink.mockRejectedValue(cause)
    render(<HostedSharePage />)
    expect(await screen.findByText('This application is not available')).toBeInTheDocument()
    expect(screen.queryByText('Opening application...')).toBeNull()
  })

  it('offers a retry while the service is busy (503), and retries the same token', async () => {
    const spies = consoleSpies()
    boundary.openShareLink
      .mockRejectedValueOnce({ status: 503, parsedError: { code: 'SERVICE_BUSY' } })
      .mockResolvedValueOnce(APP_ID)
    const { container } = render(<HostedSharePage />)
    expect(await screen.findByText(/busy/i)).toBeInTheDocument()
    expect(screen.queryByText('This application is not available')).toBeNull()
    expect(container.innerHTML).not.toContain(TOKEN)
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() =>
      expect(boundary.navigate).toHaveBeenCalledWith(hostedRoutes.view(APP_ID), {
        replace: true,
      })
    )
    expect(boundary.openShareLink).toHaveBeenCalledTimes(2)
    expect(boundary.openShareLink).toHaveBeenLastCalledWith(TOKEN)
    spies.forEach((spy) => expect(JSON.stringify(spy.mock.calls)).not.toContain(TOKEN))
  })

  it('sends the share page to Platform apps without opening the link while custom apps are off', async () => {
    boundary.store.capabilities = { view: false }
    render(<HostedSharePage />)
    await waitFor(() =>
      expect(boundary.navigate).toHaveBeenCalledWith('/apps/platform', { replace: true })
    )
    await Promise.resolve()
    expect(boundary.store.ensureCapabilities).toHaveBeenCalled()
    expect(boundary.openShareLink).not.toHaveBeenCalled()
  })

  it('shows a generic error for other failures', async () => {
    boundary.openShareLink.mockRejectedValue(new Error('boom'))
    render(<HostedSharePage />)
    await screen.findByText('Something went wrong')
  })
})
