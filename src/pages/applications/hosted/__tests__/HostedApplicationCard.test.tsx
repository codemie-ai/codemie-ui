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
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { navigate } from '@/test-utils/_mock-state'
import type { HostedApplication } from '@/types/entity/hostedApplication'

import { hostedActions } from '../hostedAccess'
import HostedApplicationCard from '../HostedApplicationCard'
import { useHostedCardActions } from '../useHostedCardActions'

import type { ReactNode } from 'react'

const boundary = vi.hoisted(() => ({
  userId: 'u-1' as string | undefined,
  store: {
    issueLaunch: vi.fn(),
    getThumbnail: vi.fn(),
    getApplication: vi.fn(),
    deleteApplication: vi.fn(),
    publish: vi.fn(),
    unpublish: vi.fn(),
  },
}))
vi.mock('@/store/hostedApplications', () => ({
  hostedApplicationsStore: boundary.store,
  hostedAuthenticationGeneration: () => 1,
  hostedErrorMessage: (cause: Error) => cause.message,
}))
vi.mock('@/store/user', () => ({
  userStore: {
    get user() {
      return boundary.userId ? { userId: boundary.userId } : undefined
    },
  },
}))
vi.mock('@/components/ConfirmationModal', () => ({
  default: ({ onConfirm, onCancel }: any) => (
    <dialog open>
      <button onClick={onConfirm}>Confirm</button>
      <button onClick={onCancel}>Cancel</button>
    </dialog>
  ),
}))
vi.mock('../HostedSharePopup', () => ({
  default: ({ app, visible }: any) => (visible ? <dialog open>share {app.id}</dialog> : null),
}))
vi.mock('../HostedUploadDialog', () => ({
  default: ({ application }: any) => <dialog open>upload {application.id}</dialog>,
}))

const make = (over: Partial<HostedApplication> = {}): HostedApplication =>
  ({
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    name: 'Visual',
    description: 'desc',
    artifact_kind: 'html',
    publisher: { display_name: 'Pat' },
    updated_at: '2026-10-05T12:00:00Z',
    capabilities: { can_launch: true, can_manage: false },
    user_abilities: ['read'],
    has_active_version: true,
    created_by: { id: 'u-2' },
    ...over,
  } as HostedApplication)

const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>
const renderCard = (app: HostedApplication) =>
  render(<HostedApplicationCard application={app} onOpen={vi.fn()} />, { wrapper })

beforeEach(() => {
  vi.clearAllMocks()
  boundary.userId = 'u-1'
  boundary.store.getThumbnail.mockResolvedValue(null)
  boundary.store.issueLaunch.mockResolvedValue({})
})

describe('card labels', () => {
  it('shows the sharing status like assistant cards: Marketplace first, project sharing to the creator', () => {
    const { unmount } = renderCard(make({ shared: true, is_global: true }))
    expect(screen.getByText('Marketplace')).toBeInTheDocument()
    expect(screen.queryByText('Shared with project')).not.toBeInTheDocument()
    unmount()
    const mine = renderCard(make({ shared: true, created_by: { id: 'u-1' } }))
    expect(screen.getByText('Shared with project')).toBeInTheDocument()
    mine.unmount()
    const own = renderCard(make({ created_by: { id: 'u-1' } }))
    expect(screen.getByText('Not shared with project')).toBeInTheDocument()
    own.unmount()
    // Someone outside the project, who got the app by name or link, sees no project status.
    renderCard(make({ shared: true }))
    expect(screen.queryByText('Shared with project')).not.toBeInTheDocument()
    expect(screen.queryByText('Not shared with project')).not.toBeInTheDocument()
  })

  it('marks a suspended application on the card', () => {
    const { unmount } = renderCard(make({ suspended: true }))
    expect(screen.getByText('Suspended')).toBeInTheDocument()
    unmount()
    renderCard(make())
    expect(screen.queryByText('Suspended')).not.toBeInTheDocument()
  })

  it('has no named-sharing marker', () => {
    renderCard(make({ shared: true }))
    expect(screen.queryByText(/Shared with you|Shared with \d|Shared with people/i)).toBeNull()
  })

  it('says Created by you only for the creator, not for an admin with write', () => {
    const { unmount } = renderCard(make({ created_by: { id: 'u-1' } }))
    expect(screen.getByText('Created by you')).toBeInTheDocument()
    unmount()
    renderCard(make({ created_by: { id: 'u-2' }, user_abilities: ['read', 'write', 'delete'] }))
    expect(screen.queryByText('Created by you')).not.toBeInTheDocument()
    expect(screen.getByText('by Pat')).toBeInTheDocument()
  })
})

describe('card without an active version', () => {
  const manager = { user_abilities: ['read', 'write'], has_active_version: false }

  it.each([
    ['Upload version', { selected_version_id: null, artifact_kind: null }],
    ['Activate version', { selected_version_id: 'v-1', artifact_kind: 'html' }],
    // A selected version the security policy no longer allows has no kind to run.
    ['Manage', { selected_version_id: 'v-1', artifact_kind: null }],
    [
      'Manage',
      { selected_version_id: 'v-1', artifact_kind: 'zip', suspension_refuses: ['activate'] },
    ],
  ] as const)('offers a manager %s instead of Open', (label, over) => {
    renderCard(make({ ...manager, ...(over as Partial<HostedApplication>) }))
    expect(screen.queryByRole('button', { name: /^View/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: label }))
    expect(navigate).toHaveBeenCalledWith('/apps/' + make().id)
  })

  it('opens the details page on a card click and launches only from Open', () => {
    const onOpen = vi.fn()
    const app = make()
    render(<HostedApplicationCard application={app} onOpen={onOpen} />, { wrapper })
    fireEvent.click(screen.getByText(app.name))
    expect(navigate).toHaveBeenCalledWith('/apps/' + app.id)
    expect(onOpen).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /^View/ }))
    expect(onOpen).toHaveBeenCalledWith(app)
  })

  it('opens the standalone app in a new tab from the card', () => {
    const opened = vi.spyOn(window, 'open').mockReturnValue(null)
    const app = make()
    renderCard(app)
    const newTab = screen.getByRole('button', { name: 'Open ' + app.name + ' in a new tab' })
    expect(newTab).toHaveAttribute('data-tooltip-content', 'Open in new tab')
    fireEvent.click(newTab)
    expect(opened).toHaveBeenCalledWith('/apps/' + app.id + '/standalone', '_blank', 'noopener')
    opened.mockRestore()
  })

  it('explains the disabled Open to someone who cannot manage the app', () => {
    renderCard(make({ has_active_version: false }))
    const open = screen.getByRole('button', { name: /^View/ })
    expect(open).toBeDisabled()
    expect(open).toHaveAccessibleDescription('No active version yet')
    expect(open.parentElement).toHaveAttribute('data-tooltip-content', 'No active version yet')
  })

  it('shows the notice, disables Open and never launches a preview', async () => {
    const app = make({ has_active_version: false, artifact_kind: 'html' })
    renderCard(app)
    expect(screen.getByText('No active version yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^View/ })).toBeDisabled()
    await act(async () => {
      await Promise.resolve()
    })
    expect(screen.queryByTitle(/preview of/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /preview/i })).not.toBeInTheDocument()
    expect(boundary.store.issueLaunch).not.toHaveBeenCalled()
  })

  it('enables Open when a version is active, for managers too', () => {
    const { unmount } = renderCard(make({ user_abilities: ['read', 'write'] }))
    expect(screen.getByRole('button', { name: /^View/ })).toBeEnabled()
    unmount()
    renderCard(make())
    expect(screen.getByRole('button', { name: /^View/ })).toBeEnabled()
    expect(screen.getByRole('button', { name: /^View/ }).parentElement).not.toHaveAttribute(
      'data-tooltip-content'
    )
    expect(screen.queryByText('No active version yet')).not.toBeInTheDocument()
  })
})

describe('card menu', () => {
  const options = { isCurrent: () => true, onChanged: vi.fn(), onError: vi.fn() }
  const cases: Record<string, Partial<HostedApplication>> = {
    reader: {},
    manager: { user_abilities: ['read', 'write'], can_share: true },
    manager_published_no_version: {
      user_abilities: ['read', 'write', 'delete'],
      is_global: true,
      has_active_version: false,
      can_share: true,
    },
    moderator_suspended: { can_moderate: true, suspended: true },
    moderator: { can_moderate: true },
  }
  it.each(Object.keys(cases))('equals hostedActions for %s', (name) => {
    const app = make(cases[name])
    const { result } = renderHook(() => useHostedCardActions(options), { wrapper })
    const items = result.current.menuItems(app) as any[]
    expect(items.map((i) => i.title)).toEqual(hostedActions(app).map((a) => a.label))
    expect(items.map((i) => !!i.disabled)).toEqual(hostedActions(app).map((a) => !!a.disabled))
  })
})

describe('card menu actions', () => {
  const options = { isCurrent: () => true, onChanged: vi.fn(), onError: vi.fn() }
  const app = make({ user_abilities: ['read', 'write', 'delete'], can_share: true })
  const Harness = ({ target }: { target: HostedApplication }) => {
    const actions = useHostedCardActions(options)
    return (
      <>
        {(actions.menuItems(target) as any[]).map((item) => (
          <button key={item.title} onClick={item.onClick}>
            {item.title}
          </button>
        ))}
        {actions.dialogs}
      </>
    )
  }
  const mount = (target = app) => render(<Harness target={target} />, { wrapper })
  const fresh = { ...app, etag: 'fresh' }
  beforeEach(() => {
    boundary.store.getApplication.mockResolvedValue(fresh)
    boundary.store.publish.mockResolvedValue(fresh)
    boundary.store.unpublish.mockResolvedValue(fresh)
    boundary.store.deleteApplication.mockResolvedValue(undefined)
  })

  it('confirms before publishing a fresh revision to the marketplace', async () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Publish to Marketplace' }))
    expect(boundary.store.publish).not.toHaveBeenCalled()
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(boundary.store.publish).toHaveBeenCalledWith(fresh))
    expect(options.onChanged).toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('confirms before removing from the marketplace, and Cancel changes nothing', async () => {
    mount({ ...app, is_global: true })
    fireEvent.click(screen.getByRole('button', { name: 'Remove from Marketplace' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))
    expect(boundary.store.unpublish).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Remove from Marketplace' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(boundary.store.unpublish).toHaveBeenCalledWith(fresh))
  })

  it('opens the share popup', async () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Share' }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('share ' + app.id)
  })

  it('opens the edit page', async () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(navigate).toHaveBeenCalledWith('/apps/' + app.id + '/edit')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens the upload dialog', async () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Upload new version' }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('upload ' + app.id)
  })

  it('confirms before deleting and then calls deleteApplication', async () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(boundary.store.deleteApplication).not.toHaveBeenCalled()
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(boundary.store.deleteApplication).toHaveBeenCalledWith(fresh))
    expect(options.onChanged).toHaveBeenCalled()
    expect(screen.queryByText('Confirm')).not.toBeInTheDocument()
  })
})
