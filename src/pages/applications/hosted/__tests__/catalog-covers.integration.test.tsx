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

import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { hostedApplicationsStore as store } from '@/store/hostedApplications'
import type { HostedApplication } from '@/types/entity/hostedApplication'
import api from '@/utils/api'

import HostedCatalogResults from '../HostedCatalogResults'

const make = (id: string, name: string, over: Partial<HostedApplication> = {}) =>
  ({
    id,
    name,
    description: 'desc',
    artifact_kind: 'html',
    publisher: { display_name: 'Pat' },
    updated_at: '2026-10-05T12:00:00Z',
    active_version_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    capabilities: { can_launch: true, can_manage: false },
    user_abilities: ['read'],
    has_active_version: true,
    created_by: { id: 'u-2' },
    ...over,
  } as HostedApplication)

const withCover = make('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Delivery map', { has_cover: true })
const withoutCover = make('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Sales board', {
  artifact_kind: 'zip',
})
const withoutVersion = make('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'Draft idea', {
  has_active_version: false,
  active_version_id: null,
})

beforeEach(() => {
  vi.restoreAllMocks()
  store.reset()
  vi.stubGlobal('IntersectionObserver', function (callback: IntersectionObserverCallback) {
    return {
      observe: () =>
        callback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          {} as IntersectionObserver
        ),
      disconnect: vi.fn(),
    }
  })
  vi.mocked(URL.createObjectURL).mockReturnValue('blob:uploaded-cover')
})
afterEach(() => {
  vi.unstubAllGlobals()
})

it('renders covers on every card without issuing a single launch request', async () => {
  const get = vi.spyOn(api, 'get').mockImplementation(async (url: string) =>
    url.includes(withCover.id)
      ? new Response(new Blob(['png'], { type: 'image/png' }), {
          status: 200,
          headers: { 'content-type': 'image/png' },
        })
      : new Response(null, { status: 204 })
  )
  const post = vi.spyOn(api, 'post')
  const { container } = render(
    <MemoryRouter>
      <HostedCatalogResults
        items={[withCover, withoutCover, withoutVersion]}
        loading={false}
        hasMore={false}
        query=""
        collection="marketplace"
        canCreate={false}
        onCreate={vi.fn()}
        onOpen={vi.fn()}
        onLoadMore={vi.fn()}
      />
    </MemoryRouter>
  )

  await waitFor(() =>
    expect(container.querySelector('img[src="blob:uploaded-cover"]')).toBeInTheDocument()
  )
  await waitFor(() => expect(get).toHaveBeenCalledTimes(2))
  expect(screen.getAllByTestId('hosted-cover-initials')).toHaveLength(3)
  expect(get.mock.calls.every(([url]) => String(url).endsWith('/thumbnail'))).toBe(true)
  expect(post).not.toHaveBeenCalled()
  expect(container.querySelector('iframe')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /preview/i })).not.toBeInTheDocument()
})
