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

import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import HostedApplicationCover from '../HostedApplicationCover'

vi.mock('@/utils/assistantAvatar', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/assistantAvatar')>()),
  getAssistantAvatarColor: () => '#123456',
}))

const boundary = vi.hoisted(() => ({
  epoch: 1,
  store: { issueLaunch: vi.fn(), getThumbnail: vi.fn() },
}))
vi.mock('@/store/hostedApplications', () => ({
  hostedApplicationsStore: boundary.store,
  hostedAuthenticationGeneration: () => boundary.epoch,
}))

const app = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name: 'Published visual',
  artifact_kind: 'html',
  updated_at: '2026-10-05T12:00:00Z',
  active_version_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  selected_version_id: null,
  has_active_version: true,
  has_cover: false,
  capabilities: { can_manage: false, can_launch: true },
}

let visibility: IntersectionObserverCallback
const setVisible = (value: boolean) =>
  act(() =>
    visibility([{ isIntersecting: value } as IntersectionObserverEntry], {} as IntersectionObserver)
  )
const initialsCover = () => screen.getByTestId('hosted-cover-initials')

beforeEach(() => {
  vi.clearAllMocks()
  boundary.epoch = 1
  boundary.store.getThumbnail.mockResolvedValue(null)
  vi.stubGlobal('IntersectionObserver', function (callback: IntersectionObserverCallback) {
    visibility = callback
    return { observe: vi.fn(), disconnect: vi.fn() }
  })
  vi.mocked(URL.createObjectURL).mockReturnValue('blob:test-cover')
})
afterEach(() => {
  vi.unstubAllGlobals()
})

it('washes the whole cover in the name colour and shows the initials when there is no uploaded cover', async () => {
  const { container } = render(<HostedApplicationCover application={app as never} />)
  setVisible(true)
  await waitFor(() => expect(boundary.store.getThumbnail).toHaveBeenCalledOnce())
  await act(async () => {
    await Promise.resolve()
  })
  expect(initialsCover()).toHaveTextContent('PV')
  expect(screen.getByTestId('hosted-cover').style.getPropertyValue('--cover-color')).toBe('#123456')
  expect(container.querySelector('img[src="blob:test-cover"]')).not.toBeInTheDocument()
})

it('shows the uploaded cover over the initials when one is present', async () => {
  boundary.store.getThumbnail.mockResolvedValue(new Blob(['png'], { type: 'image/png' }))
  const { container } = render(
    <HostedApplicationCover application={{ ...app, has_cover: true } as never} />
  )
  setVisible(true)
  await waitFor(() =>
    expect(container.querySelector('img[src="blob:test-cover"]')).toBeInTheDocument()
  )
})

it('never launches the application, embeds it or offers a preview control', async () => {
  const { container } = render(<HostedApplicationCover application={app as never} />)
  setVisible(true)
  await waitFor(() => expect(boundary.store.getThumbnail).toHaveBeenCalledOnce())
  await act(async () => {
    await Promise.resolve()
  })
  setVisible(false)
  setVisible(true)
  expect(boundary.store.issueLaunch).not.toHaveBeenCalled()
  expect(container.querySelector('iframe')).not.toBeInTheDocument()
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})

it('shows initials without fetching a cover for an app with no version and no uploaded cover', async () => {
  render(
    <HostedApplicationCover
      application={{ ...app, has_active_version: false, active_version_id: null } as never}
    />
  )
  setVisible(true)
  await act(async () => {
    await Promise.resolve()
  })
  expect(initialsCover()).toBeInTheDocument()
  expect(boundary.store.getThumbnail).not.toHaveBeenCalled()
})

it('fetches the selected version image for a manager before the first activation, not for a reader', async () => {
  const draft = {
    ...app,
    has_active_version: false,
    active_version_id: null,
    selected_version_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  }
  const { unmount } = render(
    <HostedApplicationCover application={{ ...draft, user_abilities: ['read'] } as never} />
  )
  setVisible(true)
  await act(async () => {
    await Promise.resolve()
  })
  expect(boundary.store.getThumbnail).not.toHaveBeenCalled()
  unmount()

  render(
    <HostedApplicationCover
      application={{ ...draft, user_abilities: ['read', 'write', 'delete'] } as never}
    />
  )
  setVisible(true)
  await waitFor(() => expect(boundary.store.getThumbnail).toHaveBeenCalledOnce())
})

it('keeps the initials cover when the cover request fails', async () => {
  boundary.store.getThumbnail.mockRejectedValue(new Error('unavailable'))
  render(<HostedApplicationCover application={app as never} />)
  setVisible(true)
  await waitFor(() => expect(boundary.store.getThumbnail).toHaveBeenCalledOnce())
  await act(async () => {
    await Promise.resolve()
  })
  expect(initialsCover()).toBeInTheDocument()
  expect(boundary.store.issueLaunch).not.toHaveBeenCalled()
})

it('names the artifact kind only when there is an active version to run', () => {
  const { unmount } = render(<HostedApplicationCover application={app as never} />)
  expect(screen.getByText('HTML')).toBeInTheDocument()
  unmount()
  render(
    <HostedApplicationCover
      application={{ ...app, has_active_version: false, active_version_id: null } as never}
    />
  )
  expect(screen.queryByText('HTML')).not.toBeInTheDocument()
})
