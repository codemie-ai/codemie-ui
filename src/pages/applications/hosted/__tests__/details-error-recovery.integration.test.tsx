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
  load: vi.fn(),
  store: { ensureCapabilities: vi.fn() },
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
  loadHostedDetails: boundary.load,
}))

it('clears a failed metadata-read alert after the explicit Retry recovers the application', async () => {
  boundary.load.mockRejectedValueOnce(new Error('Application connection lost')).mockResolvedValue({
    app: { id: boundary.id, user_abilities: ['write'] },
    page: { items: [], next_cursor: null },
    versions: [],
  })
  const { result } = renderHook(useHostedApplicationDetails)
  await waitFor(() => expect(result.current.error).toBe('Application connection lost'))
  await act(async () => {
    await result.current.load()
  })
  expect(result.current.application?.id).toBe(boundary.id)
  expect(result.current.error).toBeNull()
})
