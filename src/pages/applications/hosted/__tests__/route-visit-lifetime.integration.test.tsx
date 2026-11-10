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
  route: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
  navigate: vi.fn(),
  store: { ensureCapabilities: vi.fn(), versionAction: vi.fn() },
}))
vi.mock('react-router', () => ({
  useParams: () => boundary.route,
  useNavigate: () => boundary.navigate,
}))
vi.mock('@/store/hostedApplications', () => ({
  hostedApplicationsStore: boundary.store,
  hostedAuthenticationGeneration: () => 1,
  hostedErrorMessage: (cause: Error) => cause.message,
}))
vi.mock('../hostedDetailsLoading', () => ({
  loadHostedDetails: async (id: string) => ({
    app: { id, name: id, user_abilities: ['write'] },
    page: { items: [], next_cursor: null },
    versions: [],
  }),
}))

it('rejects a callback captured on the first A visit after navigating A to B to A', async () => {
  const a = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  const b = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  boundary.route.id = a
  const { result, rerender } = renderHook(useHostedApplicationDetails)
  await waitFor(() => expect(result.current.application?.id).toBe(a))
  const firstVisitIsCurrent = result.current.isCurrent
  boundary.route.id = b
  rerender()
  await waitFor(() => expect(result.current.application?.id).toBe(b))
  expect(firstVisitIsCurrent()).toBe(false)
  boundary.route.id = a
  rerender()
  await waitFor(() => expect(result.current.application?.id).toBe(a))
  expect(firstVisitIsCurrent()).toBe(false)
  expect(result.current.isCurrent()).toBe(true)
})

it('does not let an old version action close a confirmation opened on a new A visit', async () => {
  const a = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  const b = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  const version = { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' } as never
  let finish: (value: unknown) => void = () => undefined
  boundary.store.versionAction.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve
    })
  )
  boundary.route.id = a
  const { result, rerender } = renderHook(useHostedApplicationDetails)
  await waitFor(() => expect(result.current.application?.id).toBe(a))
  act(() => {
    result.current.act(version, 'activate')
  })
  let pending: Promise<void> = Promise.resolve()
  act(() => {
    pending = result.current.act(version, 'activate')
  })
  boundary.route.id = b
  rerender()
  await waitFor(() => expect(result.current.application?.id).toBe(b))
  boundary.route.id = a
  rerender()
  await waitFor(() => expect(result.current.application?.id).toBe(a))
  act(() => {
    result.current.act(version, 'cancel')
  })
  await act(async () => {
    finish({})
    await pending
  })
  expect(result.current.confirmVersion?.action).toBe('cancel')
})
