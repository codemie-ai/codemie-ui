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
import { act, renderHook, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

import { useHostedApplicationDetails } from '../useHostedApplicationDetails'

const boundary = vi.hoisted(() => ({
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  navigate: vi.fn(),
  store: { ensureCapabilities: vi.fn(), listVersionPage: vi.fn() },
}))
vi.mock('react-router', () => ({
  useParams: () => ({ id: boundary.id }),
  useNavigate: () => boundary.navigate,
}))
vi.mock('@/store/hostedApplications', () => ({
  hostedApplicationsStore: boundary.store,
  hostedAuthenticationGeneration: () => 1,
  hostedErrorMessage: (cause: Error) => cause.message,
}))
vi.mock('../hostedDetailsLoading', () => ({
  loadHostedDetails: async (id: string) => ({
    app: { id, user_abilities: ['write'] },
    page: { items: [], next_cursor: 'page2' },
    versions: [{ id: 'new', validation_state: 'accepted' }],
  }),
}))

it('keeps already loaded older versions when the normal validation refresh runs', async () => {
  boundary.store.listVersionPage.mockResolvedValue({
    items: [{ id: 'old', validation_state: 'accepted' }],
    next_cursor: null,
  })
  const { result } = renderHook(useHostedApplicationDetails)
  await waitFor(() => expect(result.current.versions).toHaveLength(1))
  await act(async () => {
    await result.current.loadMore()
  })
  expect(result.current.versions.map((version) => version.id)).toEqual(['new', 'old'])
  // The timer uses preservePages=true; an explicit user reload may reset page depth.
  await act(async () => {
    await result.current.load(true)
  })
  expect(result.current.versions.map((version) => version.id)).toContain('old')
})
