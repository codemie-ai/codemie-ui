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

import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { hostedApplicationsStore } from '@/store/hostedApplications'
import type { HostedApplication, SuspensionRefused } from '@/types/entity/hostedApplication'

import { hostedRoutes } from '../hostedRoutes'
import HostedSharePopup from '../HostedSharePopup'

// What the server reports for a suspended application.
const SUSPENDED_REFUSES: SuspensionRefused[] = ['activate', 'move', 'publish', 'share_on']

vi.mock('@/utils/toaster', () => ({
  default: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))
vi.mock('@/utils/helpers', async (importActual) => ({
  ...(await importActual<typeof import('@/utils/helpers')>()),
  getRootPath: () => 'https://host.test/codemie',
}))

const alice = { id: 'u-2', name: 'Alice', email: 'alice@test.com' }
const carol = { id: 'u-4', name: 'Carol', email: 'carol@test.com' }

const makeApp = (over: Partial<HostedApplication> = {}): HostedApplication =>
  ({
    id: 'app-1',
    name: 'Demo App',
    description: '',
    artifact_kind: 'html',
    publisher: { display_name: 'P' },
    updated_at: '',
    capabilities: { can_launch: true, can_manage: true },
    user_abilities: [],
    can_share: true,
    suspended: false,
    ...over,
  } as unknown as HostedApplication)

describe('HostedSharePopup', () => {
  const onHide = vi.fn()
  const writeText = vi.fn()

  const type = async (value: string) => {
    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.change(await screen.findByPlaceholderText('Search'), { target: { value } })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    writeText.mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    vi.spyOn(hostedApplicationsStore.sharing, 'loadSharedWith').mockResolvedValue([alice])
    vi.spyOn(hostedApplicationsStore.sharing, 'searchUsers').mockResolvedValue([carol])
    vi.spyOn(hostedApplicationsStore.sharing, 'share').mockResolvedValue(undefined)
    vi.spyOn(hostedApplicationsStore.sharing, 'unshare').mockResolvedValue(undefined)
    vi.spyOn(hostedApplicationsStore, 'getShareLink').mockResolvedValue({
      id: 'l1',
      token: 'tok 1',
      created_at: '',
    })
    vi.spyOn(hostedApplicationsStore, 'createShareLink').mockResolvedValue({
      id: 'l1',
      token: 'tok 1',
      created_at: '',
    })
    vi.spyOn(hostedApplicationsStore, 'revokeShareLink').mockResolvedValue(null)
  })

  it('renders nothing when the user cannot share', () => {
    const { container } = render(
      <HostedSharePopup app={makeApp({ can_share: false })} visible onHide={onHide} />
    )
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByText(/Share "/)).not.toBeInTheDocument()
    expect(hostedApplicationsStore.sharing.loadSharedWith).not.toHaveBeenCalled()
  })

  it('searches through the store sharing client and offers no access-level control', async () => {
    render(<HostedSharePopup app={makeApp()} visible onHide={onHide} />)
    expect(await screen.findByText('Share "Demo App"')).toBeInTheDocument()
    await type('carol')
    await waitFor(() =>
      expect(hostedApplicationsStore.sharing.searchUsers).toHaveBeenCalledWith('app-1', 'carol')
    )
    expect(await screen.findByText(carol.name)).toBeInTheDocument()
    expect(screen.queryByText(/read|write|permission|access level/i)).not.toBeInTheDocument()
    // the only combobox is the user picker
    expect(screen.getAllByRole('combobox')).toHaveLength(1)
  })

  it('states what the people added can do', async () => {
    render(<HostedSharePopup app={makeApp()} visible onHide={onHide} />)
    expect(
      await screen.findByText("People you add can open the active version. They can't edit it.")
    ).toBeInTheDocument()
  })

  it('leaves the current user out of the people with access and the search results', async () => {
    const { userStore } = await import('@/store/user')
    const previous = userStore.user
    userStore.user = { ...(previous ?? {}), userId: 'u-me' } as never
    const me = { id: 'u-me', name: 'Myself', email: 'me@test.com' }
    vi.spyOn(hostedApplicationsStore.sharing, 'loadSharedWith').mockResolvedValue([me, alice])
    vi.spyOn(hostedApplicationsStore.sharing, 'searchUsers').mockResolvedValue([me, carol])
    try {
      render(<HostedSharePopup app={makeApp()} visible onHide={onHide} />)
      expect(await screen.findByText(alice.name)).toBeInTheDocument()
      await type('my')
      expect(await screen.findByText(carol.name)).toBeInTheDocument()
      expect(screen.queryByText(me.name)).not.toBeInTheDocument()
    } finally {
      userStore.user = previous
    }
  })

  it('copies getRootPath() + the share route for the token', async () => {
    render(<HostedSharePopup app={makeApp()} visible onHide={onHide} />)
    await screen.findByText('Revoke link')
    fireEvent.click(screen.getByText('Copy share link'))
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        'https://host.test/codemie' + hostedRoutes.share.url('tok 1')
      )
    )
  })

  it('while suspended disables search/grant and copy, keeps remove and revoke', async () => {
    render(
      <HostedSharePopup
        app={makeApp({ suspended: true, suspension_refuses: SUSPENDED_REFUSES })}
        visible
        onHide={onHide}
      />
    )
    await screen.findByText(alice.name)
    await screen.findByText('Revoke link')
    expect(screen.getByRole('combobox').closest('.pointer-events-none')).not.toBeNull()
    expect(screen.getByText('Copy share link').closest('button')).toBeDisabled()
    expect(screen.getByText('Revoke link').closest('button')).toBeEnabled()
    const remove = screen.getByRole('button', { name: 'Remove Alice' })
    expect(remove).toBeEnabled()
    fireEvent.click(remove)
    await waitFor(() =>
      expect(hostedApplicationsStore.sharing.unshare).toHaveBeenCalledWith('app-1', ['u-2'])
    )
  })

  it('shows the via-link note text for link grants', async () => {
    vi.spyOn(hostedApplicationsStore.sharing, 'loadSharedWith').mockResolvedValue([
      { ...alice, grant_source: 'link' } as never,
    ])
    render(<HostedSharePopup app={makeApp()} visible onHide={onHide} />)
    expect(
      await screen.findByText('They can come back through the link until you revoke it.')
    ).toBeInTheDocument()
  })
  it('after revoking the link reloads the people with access and reports the change', async () => {
    const onChanged = vi.fn()
    vi.spyOn(hostedApplicationsStore.sharing, 'loadSharedWith')
      .mockResolvedValueOnce([{ ...alice, grant_source: 'link' } as never])
      .mockResolvedValue([])
    render(<HostedSharePopup app={makeApp()} visible onHide={onHide} onChanged={onChanged} />)
    expect(await screen.findByText(alice.name)).toBeInTheDocument()
    fireEvent.click(await screen.findByText('Revoke link'))
    const confirm = await screen.findByRole('dialog', { name: 'Revoke the share link?' })
    fireEvent.click(within(confirm).getByRole('button', { name: 'Revoke link' }))
    await waitFor(() =>
      expect(hostedApplicationsStore.revokeShareLink).toHaveBeenCalledWith('app-1')
    )
    await waitFor(() => expect(screen.queryByText(alice.name)).toBeNull())
    expect(hostedApplicationsStore.sharing.loadSharedWith).toHaveBeenCalledTimes(2)
    expect(onChanged).toHaveBeenCalledTimes(1)
  })

  it('explains why sharing is unavailable while suspended', async () => {
    render(
      <HostedSharePopup
        app={makeApp({ suspended: true, suspension_refuses: SUSPENDED_REFUSES })}
        visible
        onHide={onHide}
      />
    )
    expect(
      await screen.findByText(
        'This application is suspended. You can remove access, but not share it until a moderator reinstates it.'
      )
    ).toBeInTheDocument()
  })

  it('shows no suspension notice for an active application', async () => {
    render(<HostedSharePopup app={makeApp()} visible onHide={onHide} />)
    await screen.findByText(alice.name)
    expect(screen.queryByText(/This application is suspended/)).toBeNull()
  })
})
