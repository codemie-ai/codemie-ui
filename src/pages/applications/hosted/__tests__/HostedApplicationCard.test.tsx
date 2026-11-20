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

import { assistantsStore } from '@/store/assistants'
import { navigate } from '@/test-utils/_mock-state'
import type { HostedApplication } from '@/types/entity/hostedApplication'

import { hostedActions } from '../hostedAccess'
import HostedApplicationCard from '../HostedApplicationCard'
import { useHostedCardActions } from '../useHostedCardActions'
import { resetHostedCategoriesRequest } from '../useHostedCategories'

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
  render(<HostedApplicationCard application={app} />, { wrapper })

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

  it('does not show category names on the card', () => {
    renderCard(
      make({
        categories: [
          { id: 'a', name: 'Analytics' },
          { id: 'b', name: 'Productivity' },
        ],
      })
    )
    // The card still renders the app's other text, so the absence is not a rendering failure.
    expect(screen.getByText('Visual')).toBeInTheDocument()
    expect(screen.queryByText(/Analytics/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Productivity/)).not.toBeInTheDocument()
    expect(screen.queryByTestId('hosted-card-categories')).not.toBeInTheDocument()
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

  it('opens the viewer on a card click when the app is openable', () => {
    const app = make()
    renderCard(app)
    fireEvent.click(screen.getByText(app.name))
    expect(navigate).toHaveBeenCalledWith('/apps/' + app.id + '/view')
  })

  it.each<[string, Partial<HostedApplication>]>([
    ['reader', { user_abilities: ['read'] }],
    ['manager', { user_abilities: ['read', 'write'] }],
  ])('opens the details page on a card click without an active version, as a %s', (_role, over) => {
    const app = make({ has_active_version: false, ...over })
    renderCard(app)
    fireEvent.click(screen.getByText(app.name))
    expect(navigate).toHaveBeenCalledWith('/apps/' + app.id)
  })

  it.each([['Enter'], [' ']])('treats %j on the focused card like a click', (key) => {
    const openable = make()
    const { unmount } = renderCard(openable)
    fireEvent.keyDown(screen.getByRole('button', { name: 'Open ' + openable.name }), { key })
    expect(navigate).toHaveBeenCalledWith('/apps/' + openable.id + '/view')
    unmount()
    navigate.mockClear()
    const closed = make({ has_active_version: false })
    renderCard(closed)
    fireEvent.keyDown(screen.getByRole('button', { name: closed.name }), { key })
    expect(navigate).toHaveBeenCalledWith('/apps/' + closed.id)
  })

  it('names the card button after the app, and says Open only when it opens it', () => {
    const { unmount } = renderCard(make())
    expect(screen.getByRole('button', { name: 'Open Visual' })).toBeInTheDocument()
    unmount()
    renderCard(make({ has_active_version: false }))
    expect(screen.getByRole('button', { name: 'Visual' })).toBeInTheDocument()
  })

  it('renders no Open or View button on the card body', () => {
    renderCard(make())
    expect(screen.queryByRole('button', { name: /^View/ })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })

  it('offers no way to open the app outside CodeMie from the card', () => {
    const opened = vi.spyOn(window, 'open').mockReturnValue(null)
    const app = make()
    renderCard(app)
    expect(screen.queryByRole('button', { name: /new tab/i })).not.toBeInTheDocument()
    fireEvent.click(screen.getByText(app.name))
    expect(opened).not.toHaveBeenCalled()
    opened.mockRestore()
  })

  it('describes the card button with the no-active-version notice', () => {
    const app = make({ has_active_version: false })
    renderCard(app)
    const button = screen.getByRole('button', { name: app.name })
    const describedBy = button.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(document.getElementById(describedBy!)).toHaveTextContent('No active version yet')
  })

  it('shows the notice and never launches a preview', async () => {
    const app = make({ has_active_version: false, artifact_kind: 'html' })
    renderCard(app)
    expect(screen.getByText('No active version yet')).toBeInTheDocument()
    await act(async () => {
      await Promise.resolve()
    })
    expect(screen.queryByTitle(/preview of/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /preview/i })).not.toBeInTheDocument()
    expect(boundary.store.issueLaunch).not.toHaveBeenCalled()
  })

  // Open's disabled-state coverage moved to the card menu's Open item - see Task 5/EPMCDME-17247.
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

  it.each(Object.keys(cases))('puts Open then Details first for %s', (name) => {
    const actions = hostedActions(make(cases[name]))
    expect(actions[0]).toMatchObject({ key: 'open', label: 'Open' })
    expect(actions[1]).toMatchObject({ key: 'details', label: 'Details' })
    expect(actions[1].disabled).toBeFalsy()
  })

  it('explains a disabled Open with a tooltip', () => {
    const [open] = hostedActions(make({ has_active_version: false }))
    expect(open).toMatchObject({ key: 'open', disabled: true, tooltip: 'No active version yet' })
  })

  it('leaves an openable Open without a tooltip', () => {
    const [open] = hostedActions(make())
    expect(open).not.toHaveProperty('tooltip')
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

  it('publishes a fresh revision with its categories from the publish dialog', async () => {
    resetHostedCategoriesRequest()
    assistantsStore.assistantCategories = []
    vi.spyOn(assistantsStore, 'getAssistantCategories').mockImplementation(async () => {
      assistantsStore.assistantCategories = [
        { id: 'a', name: 'Analytics', description: '' },
      ] as never
    })
    const categorized = { ...fresh, categories: [{ id: 'a', name: 'Analytics' }] }
    boundary.store.getApplication.mockResolvedValue(categorized)
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Publish to Marketplace' }))
    expect(await screen.findByText('Publish to Marketplace?')).toBeInTheDocument()
    expect(boundary.store.publish).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }))
    await waitFor(() =>
      expect(boundary.store.publish).toHaveBeenCalledWith(categorized, ['a'], expect.any(String))
    )
    await waitFor(() => expect(options.onChanged).toHaveBeenCalled())
    expect(screen.queryByText('Publish to Marketplace?')).not.toBeInTheDocument()
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

  it('opens the viewer from Open', () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    expect(navigate).toHaveBeenCalledWith('/apps/' + app.id + '/view')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens the details page from Details', () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Details' }))
    expect(navigate).toHaveBeenCalledWith('/apps/' + app.id)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(boundary.store.getApplication).not.toHaveBeenCalled()
  })

  it('passes the disabled Open tooltip through to the menu item', () => {
    const { result } = renderHook(() => useHostedCardActions(options), { wrapper })
    const [closed] = result.current.menuItems(make({ has_active_version: false })) as any[]
    expect(closed).toMatchObject({
      title: 'Open',
      disabled: true,
      tooltip: 'No active version yet',
    })
    const [open] = result.current.menuItems(app) as any[]
    expect(open.tooltip).toBeUndefined()
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
