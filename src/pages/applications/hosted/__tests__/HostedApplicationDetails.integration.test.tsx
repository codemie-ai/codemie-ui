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
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { hostedApplicationsStore as store } from '@/store/hostedApplications'
import type {
  HostedApplication,
  HostedVersion,
  SuspensionRefused,
} from '@/types/entity/hostedApplication'

import HostedApplicationDetails from '../HostedApplicationDetails'
import { hostedRoutes } from '../hostedRoutes'
import { useHostedApplicationDetails } from '../useHostedApplicationDetails'

// What the server reports for a suspended application.
const SUSPENDED_REFUSES: SuspensionRefused[] = ['activate', 'move', 'publish', 'share_on']

const route = vi.hoisted(() => ({
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  navigate: vi.fn(),
  load: vi.fn(),
  userId: 'u-1' as string | undefined,
}))
vi.mock('react-router', () => ({
  useParams: () => route,
  useNavigate: () => route.navigate,
  useHref: (to: string) => to,
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}))
vi.mock('@/store/user', () => ({
  userStore: {
    get user() {
      return route.userId ? { userId: route.userId } : undefined
    },
  },
}))
vi.mock('@/components/Layouts/Layout', () => ({
  default: ({ title, children }: any) => (
    <main>
      <h1>{title}</h1>
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
  default: ({ onConfirm, onCancel }: any) => (
    <dialog open>
      <button onClick={onConfirm}>Confirm</button>
      <button onClick={onCancel}>Cancel</button>
    </dialog>
  ),
}))
vi.mock('../../ApplicationsSidebar', () => ({ default: () => null }))
vi.mock('../HostedApplicationCover', () => ({ default: () => null }))
vi.mock('../HostedSharePopup', () => ({
  default: ({ app, visible, onChanged }: any) =>
    visible ? (
      <dialog open>
        share {app.id}
        <button onClick={onChanged}>Report sharing change</button>
      </dialog>
    ) : null,
}))
vi.mock('../HostedUploadDialog', () => ({ default: () => null }))
vi.mock('../HostedValidationDialog', () => ({ default: () => null }))
vi.mock('../hostedDetailsLoading', () => ({
  loadHostedDetails: (id: string) => route.load(id),
}))

const stub = (id: string) => ({
  app: { id, name: id, revision: 1, user_abilities: ['write'] },
  page: { next_cursor: null },
  versions: [],
})

beforeEach(() => {
  vi.restoreAllMocks()
  route.navigate = vi.fn()
  route.userId = 'u-1'
  route.load.mockImplementation(async (id: string) => stub(id))
  store.reset()
  route.id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  vi.spyOn(store, 'ensureCapabilities').mockResolvedValue()
})

describe('detail mutation response lifetime', () => {
  it('does not replace the new page with an old version action result', async () => {
    let finish: (value: never) => void = () => undefined
    vi.spyOn(store, 'versionAction').mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }) as never
    )
    const version = { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' } as never
    const { result, rerender } = renderHook(useHostedApplicationDetails)
    await waitFor(() => expect(result.current.application?.id).toBe(route.id))
    act(() => {
      result.current.act(version, 'activate')
    })
    let pending: Promise<void> = Promise.resolve()
    act(() => {
      pending = result.current.act(version, 'activate')
    })
    route.id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    rerender()
    await waitFor(() => expect(result.current.application?.id).toBe(route.id))
    await act(async () => {
      finish({} as never)
      await pending
    })
    expect(result.current.application?.id).toBe(route.id)
    expect(result.current.error).toBeNull()
    expect(result.current.busy).toBe(false)
  })
})

describe('failed version actions', () => {
  it('reloads the application after a failed version action so the next one uses its new etag', async () => {
    vi.spyOn(store, 'versionAction').mockRejectedValue(new Error('Precondition failed'))
    const version = { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' } as never
    const { result } = renderHook(useHostedApplicationDetails)
    await waitFor(() => expect(result.current.application?.id).toBe(route.id))
    expect(route.load).toHaveBeenCalledTimes(1)
    await act(async () => {
      await result.current.act(version, 'select')
    })
    expect(route.load).toHaveBeenCalledTimes(2)
    expect(result.current.error).toBeTruthy()
    expect(result.current.busy).toBe(false)
  })
})

describe('custom applications turned off', () => {
  it('sends the details page to Platform apps without loading the application', async () => {
    store.capabilities = { view: false } as never
    render(<HostedApplicationDetails />)
    await waitFor(() =>
      expect(route.navigate).toHaveBeenCalledWith('/apps/platform', { replace: true })
    )
    await act(async () => {
      await Promise.resolve()
    })
    expect(route.load).not.toHaveBeenCalled()
  })
})

describe('application revisions', () => {
  it('keeps a newer revision when a slower reload answers with an older one', async () => {
    const { result } = renderHook(useHostedApplicationDetails)
    await waitFor(() => expect(result.current.application?.id).toBe(route.id))
    act(() =>
      result.current.setApplication({
        ...result.current.application!,
        name: 'Renamed',
        revision: 2,
      })
    )
    await act(async () => {
      await result.current.load(true)
    })
    expect(result.current.application).toMatchObject({ name: 'Renamed', revision: 2 })
  })
})

const make = (over: Partial<HostedApplication> = {}): HostedApplication =>
  ({
    id: route.id,
    name: 'Visual',
    description: 'About text',
    artifact_kind: 'html',
    publisher: { display_name: 'Pat' },
    updated_at: '2026-10-05T12:00:00Z',
    revision: 1,
    etag: 'e1',
    user_abilities: ['read', 'write', 'delete'],
    created_by: { id: 'u-1' },
    has_active_version: true,
    can_share: true,
    ...over,
  } as HostedApplication)
const version = (over: Partial<HostedVersion> = {}): HostedVersion =>
  ({
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    sequence: 1,
    filename: 'index.html',
    artifact_kind: 'html',
    expected_bytes: 10,
    can_preview: true,
    can_activate: true,
    validation_state: 'accepted',
    upload: { state: 'completed' },
    created_at: '2026-10-05T12:00:00Z',
    ...over,
  } as HostedVersion)
const show = (app: HostedApplication, versions: HostedVersion[] = []) => {
  route.load.mockResolvedValue({ app, page: { next_cursor: null }, versions })
  return render(<HostedApplicationDetails />)
}

describe('details access model', () => {
  beforeEach(() => {
    vi.spyOn(store.sharing, 'loadSharedWith').mockResolvedValue([])
  })

  it('shows the management panels only with isManager', async () => {
    const { unmount } = show(make())
    expect(await screen.findByRole('heading', { name: 'Versions' })).toBeInTheDocument()
    unmount()
    show(make({ user_abilities: ['read'] }))
    expect(await screen.findByText('About text')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Versions' })).not.toBeInTheDocument()
  })

  it('marks a suspended application from suspended', async () => {
    show(make({ suspended: true, suspension_refuses: SUSPENDED_REFUSES }))
    expect(await screen.findByText('Suspended')).toBeInTheDocument()
  })

  it('lists Shared with in the sidebar for the creator', async () => {
    vi.spyOn(store.sharing, 'loadSharedWith').mockResolvedValue([
      { id: 'x', name: 'Sam Doe', email: 'sam@example.com' } as never,
    ])
    show(make())
    expect(await screen.findByText('Sam Doe')).toBeInTheDocument()
    expect(screen.getByText('Shared with')).toBeInTheDocument()
  })

  it('leaves the current user out of Shared with, as the share popup does', async () => {
    vi.spyOn(store.sharing, 'loadSharedWith').mockResolvedValue([
      { id: 'u-1', name: 'Myself Me', email: 'me@example.com' } as never,
      { id: 'x', name: 'Sam Doe', email: 'sam@example.com' } as never,
    ])
    show(make())
    expect(await screen.findByText('Sam Doe')).toBeInTheDocument()
    expect(screen.queryByText('Myself Me')).not.toBeInTheDocument()
  })

  it('hides Shared with from a manager who is not the creator', async () => {
    show(make({ created_by: { id: 'u-2' } }))
    await screen.findByRole('heading', { name: 'Versions' })
    expect(screen.queryByText('Shared with')).not.toBeInTheDocument()
    expect(store.sharing.loadSharedWith).not.toHaveBeenCalled()
  })

  it('offers Activate version only for a version with can_activate', async () => {
    show(make(), [
      version(),
      version({ id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', sequence: 2, can_activate: false }),
    ])
    await screen.findByRole('heading', { name: 'Versions' })
    expect(screen.getAllByRole('button', { name: 'Activate version' })).toHaveLength(1)
    expect(screen.queryByRole('button', { name: /make live/i })).not.toBeInTheDocument()
  })

  it('previews a version on its preview route', async () => {
    show(make(), [version()])
    fireEvent.click(await screen.findByRole('button', { name: /Preview/ }))
    expect(route.navigate).toHaveBeenCalledWith(hostedRoutes.preview(route.id, version().id))
  })

  it('opens the standalone app in a new tab from the header', async () => {
    const opened = vi.spyOn(window, 'open').mockReturnValue(null)
    show(make({ has_active_version: true }))
    fireEvent.click(await screen.findByRole('button', { name: 'Open in new tab' }))
    expect(opened).toHaveBeenCalledWith(
      expect.stringMatching(/\/apps\/[^/]+\/standalone$/),
      '_blank',
      'noopener'
    )
    opened.mockRestore()
  })

  it('opens the application in its viewer from the header View', async () => {
    show(make({ has_active_version: true }))
    fireEvent.click(await screen.findByRole('button', { name: 'View' }))
    expect(route.navigate).toHaveBeenCalledWith(hostedRoutes.view(route.id))
    expect(hostedRoutes.view(route.id)).toBe('/apps/' + route.id + '/view')
  })

  it('publishes and removes from the marketplace after a confirmation, with no category dialog', async () => {
    const app = make()
    vi.spyOn(store, 'getApplication').mockResolvedValue(app)
    const publish = vi.spyOn(store, 'publish').mockResolvedValue(app)
    const unpublish = vi.spyOn(store, 'unpublish').mockResolvedValue(app)
    const { unmount } = show(app)
    fireEvent.click(await screen.findByRole('button', { name: 'Publish to Marketplace' }))
    expect(publish).not.toHaveBeenCalled()
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(publish).toHaveBeenCalledWith(app))
    unmount()
    show(make({ is_global: true }))
    fireEvent.click(await screen.findByRole('button', { name: 'Remove from Marketplace' }))
    expect(unpublish).not.toHaveBeenCalled()
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(unpublish).toHaveBeenCalled())
  })

  it('deletes after a confirmation and returns to the applications root', async () => {
    const app = make()
    vi.spyOn(store, 'getApplication').mockResolvedValue(app)
    const remove = vi.spyOn(store, 'deleteApplication').mockResolvedValue()
    show(app)
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    expect(remove).not.toHaveBeenCalled()
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(remove).toHaveBeenCalledWith(app))
    await waitFor(() => expect(route.navigate).toHaveBeenCalledWith(hostedRoutes.root))
  })

  it('opens the edit page from an Edit header button, not from the menu', async () => {
    show(make())
    const edit = await screen.findAllByRole('button', { name: 'Edit' })
    // One Edit only: the header button; the overflow menu leaves it out.
    expect(edit).toHaveLength(1)
    fireEvent.click(edit[0])
    expect(route.navigate).toHaveBeenCalledWith(hostedRoutes.edit(route.id), {
      state: { from: 'details' },
    })
  })

  it('offers no Edit without write access', async () => {
    show(make({ user_abilities: ['read'] }))
    expect(await screen.findByText('About text')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  })

  it('opens the share popup from the header', async () => {
    vi.spyOn(store, 'getApplication').mockResolvedValue(make())
    show(make())
    fireEvent.click(await screen.findByRole('button', { name: 'Share' }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('share ' + route.id)
  })

  it.each([403, 404])('renders the not-available state on a %s', async (status) => {
    route.load.mockRejectedValue({ status, parsedError: { message: 'server detail' } })
    render(<HostedApplicationDetails />)
    expect(
      await screen.findByRole('heading', { name: 'This application is not available' })
    ).toBeInTheDocument()
    expect(screen.queryByText('server detail')).not.toBeInTheDocument()
  })

  it('reports a failed Shared with load instead of calling the app unshared', async () => {
    const load = vi
      .spyOn(store.sharing, 'loadSharedWith')
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValueOnce([{ id: 'x', name: 'Sam Doe', email: 'sam@example.com' } as never])
    show(make())
    const retry = await screen.findByRole('button', { name: 'Retry loading people' })
    expect(screen.queryByText('Not shared with anyone yet.')).not.toBeInTheDocument()
    expect(screen.getByText('Could not load the people with access.')).toBeInTheDocument()
    fireEvent.click(retry)
    expect(await screen.findByText('Sam Doe')).toBeInTheDocument()
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('shows the cover read-only: changing it belongs to the edit form', async () => {
    show(make({ has_cover: true }))
    await screen.findByRole('heading', { name: 'Versions' })
    expect(screen.queryByRole('button', { name: /cover/i })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Cover image')).not.toBeInTheDocument()
    expect(screen.queryByText(/PNG, JPEG, or WebP up to 1 MiB/)).not.toBeInTheDocument()
  })

  it('does not offer a plain Copy link in the header menu', async () => {
    show(make())
    await screen.findByRole('heading', { name: 'Versions' })
    expect(screen.queryByRole('button', { name: 'Copy link' })).not.toBeInTheDocument()
  })

  it('does not offer Activate on a suspended application', async () => {
    show(make({ suspended: true, suspension_refuses: SUSPENDED_REFUSES }), [version()])
    await screen.findByRole('heading', { name: 'Versions' })
    expect(screen.queryByRole('button', { name: 'Activate version' })).not.toBeInTheDocument()
  })

  it('shows No active version yet in the details when nothing is active', async () => {
    show(make({ has_active_version: false }))
    expect(await screen.findByText('No active version yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'View' })).toBeDisabled()
  })

  it('shows the active version of a project-shared app, not "Not on the Marketplace"', async () => {
    show(make({ shared: true, active_version_id: version().id }), [version()])
    await screen.findByRole('heading', { name: 'Versions' })
    expect(screen.queryByText('Not on the Marketplace')).not.toBeInTheDocument()
    // The version tile and the Active version property.
    expect(screen.getAllByText('v1')).toHaveLength(2)
  })

  it.each([
    [
      { suspended: true, suspension_refuses: SUSPENDED_REFUSES },
      'Access is suspended by a moderator.',
    ],
    [{ is_global: true }, 'Anyone in your organization can open it from the Marketplace.'],
    [{ created_by: { id: 'u-2' } }, 'People it is shared with can open this link.'],
    [
      { shared: true, project: 'demo', created_by: { id: 'u-2' } },
      'Members of the demo project and people it is shared with can open this link.',
    ],
    [{}, 'Only you can open this link until you share it.'],
    [{ user_abilities: ['read'] }, 'Only signed-in members of your organization can open it.'],
  ] as [Partial<HostedApplication>, string][])(
    'shows the access hint for %o',
    async (over, hint) => {
      show(make(over))
      expect(await screen.findByText(hint)).toBeInTheDocument()
    }
  )
  it('labels the active version "Active version"', async () => {
    show(make({ active_version_id: version().id }), [version()])
    expect(await screen.findByText('Active version:')).toBeInTheDocument()
    expect(screen.queryByText(/live version/i)).not.toBeInTheDocument()
  })

  it('derives the creator access hint from the people with access', async () => {
    vi.spyOn(store.sharing, 'loadSharedWith').mockResolvedValue([
      { id: 'x', name: 'Sam Doe', email: 'sam@example.com' } as never,
    ])
    const { unmount } = show(make({ shared: false }))
    expect(
      await screen.findByText('People it is shared with can open this link.')
    ).toBeInTheDocument()
    unmount()
    vi.spyOn(store.sharing, 'loadSharedWith').mockResolvedValue([])
    show(make({ shared: false }))
    expect(await screen.findByText('Not shared with anyone yet.')).toBeInTheDocument()
    expect(
      await screen.findByText('Only you can open this link until you share it.')
    ).toBeInTheDocument()
  })

  it('tells the creator that project members can open a project-shared app with no named grants', async () => {
    vi.spyOn(store.sharing, 'loadSharedWith').mockResolvedValue([])
    show(make({ shared: true, project: 'demo' }))
    expect(await screen.findByText('Not shared with anyone yet.')).toBeInTheDocument()
    expect(
      await screen.findByText('Members of the demo project can open this link.')
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Only you can open this link until you share it.')
    ).not.toBeInTheDocument()
  })

  it('shows the project and a Shared status like the assistant details, to the creator only', async () => {
    const { unmount } = show(make({ shared: true, project: 'demo' }))
    expect(await screen.findByText('Project:')).toBeInTheDocument()
    expect(screen.getByText('demo')).toBeInTheDocument()
    expect(screen.getByText('Shared status:')).toBeInTheDocument()
    expect(screen.getByText('Shared with project')).toBeInTheDocument()
    unmount()
    const global = show(
      make({ is_global: true, created_by: { id: 'u-2' }, user_abilities: ['read'] })
    )
    expect(await screen.findByText('Marketplace')).toBeInTheDocument()
    global.unmount()
    // Outside the project and not the creator: no project status, as for assistants.
    show(
      make({ shared: false, project: 'demo', created_by: { id: 'u-2' }, user_abilities: ['read'] })
    )
    expect(await screen.findByText('Project:')).toBeInTheDocument()
    expect(screen.queryByText('Shared status:')).not.toBeInTheDocument()
  })

  it('refreshes Shared with and the access hint after a sharing change in the popup', async () => {
    const app = make({ shared: false })
    vi.spyOn(store, 'getApplication').mockResolvedValue(app)
    const load = vi
      .spyOn(store.sharing, 'loadSharedWith')
      .mockResolvedValueOnce([])
      .mockResolvedValue([{ id: 'x', name: 'Sam Doe', email: 'sam@example.com' } as never])
    show(app)
    expect(
      await screen.findByText('Only you can open this link until you share it.')
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Share/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Report sharing change' }))
    expect(await screen.findByText('Sam Doe')).toBeInTheDocument()
    expect(screen.getByText('People it is shared with can open this link.')).toBeInTheDocument()
    expect(load).toHaveBeenCalledTimes(2)
  })
})
