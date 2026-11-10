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
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

import { userStore } from '@/store/user'

import HostedApplicationForm from '../HostedApplicationForm'

vi.mock('@/components/Layouts/Layout', () => ({
  default: ({ rightContent, children }: any) => (
    <main>
      {rightContent}
      {children}
    </main>
  ),
}))
vi.mock('../HostedArtifactUpload', () => ({
  default: ({ onChange }: any) => (
    <button type="button" onClick={() => onChange(new File(['<p>hi</p>'], 'index.html'))}>
      Choose file
    </button>
  ),
}))

const boundary = vi.hoisted(() => ({
  store: {
    createApplication: vi.fn(),
    updateApplication: vi.fn(),
    uploadArtifact: vi.fn(),
    loadUsage: vi.fn(async () => undefined),
  },
}))
vi.mock('@/store/hostedApplications', () => ({
  hostedApplicationsStore: boundary.store,
  hostedAuthenticationGeneration: () => 0,
  hostedErrorMessage: (cause: Error) => cause.message,
  HOSTED_COVER_TYPES: ['image/png', 'image/jpeg', 'image/webp'],
  HOSTED_COVER_MAX_BYTES: 1024 * 1024,
}))

it('does not navigate through onSaved after the user has left the create page during its pending response', async () => {
  vi.spyOn(userStore, 'getProjects').mockResolvedValue([{ name: 'alpha' }] as never)
  let finish: (value: unknown) => void = () => undefined
  const app = {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    name: 'Visual',
    description: 'A diagram',
  }
  boundary.store.createApplication.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve
    })
  )
  const onSaved = vi.fn()
  const onCancel = vi.fn()
  const { unmount } = render(<HostedApplicationForm onSaved={onSaved} onCancel={onCancel} />)
  fireEvent.change(screen.getByLabelText(/Application name/), { target: { value: app.name } })
  fireEvent.change(screen.getByLabelText(/^Description/), { target: { value: app.description } })
  await screen.findByText('alpha')
  fireEvent.click(screen.getByRole('button', { name: 'Create' }))
  await waitFor(() => expect(boundary.store.createApplication).toHaveBeenCalledOnce())
  // Leaving the page unmounts the form; accepted server work can remain a draft.
  unmount()
  await act(async () => {
    finish(app)
    await Promise.resolve()
    await Promise.resolve()
  })
  expect(onSaved).not.toHaveBeenCalled()
})

it('opens the private draft when the user stops its upload', async () => {
  vi.spyOn(userStore, 'getProjects').mockResolvedValue([{ name: 'alpha' }] as never)
  const draft = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Visual', description: 'A' }
  boundary.store.createApplication.mockResolvedValue(draft)
  let signal: AbortSignal | undefined
  boundary.store.uploadArtifact.mockImplementation(
    (_app: unknown, _file: unknown, _routing: unknown, abort: AbortSignal) => {
      signal = abort
      return new Promise(() => {})
    }
  )
  const onSaved = vi.fn()
  const onCancel = vi.fn()
  render(<HostedApplicationForm onSaved={onSaved} onCancel={onCancel} />)
  fireEvent.change(screen.getByLabelText(/Application name/), { target: { value: 'Visual' } })
  fireEvent.change(screen.getByLabelText(/^Description/), { target: { value: 'A' } })
  fireEvent.click(screen.getByRole('button', { name: 'Choose file' }))
  await screen.findByText('alpha')
  fireEvent.click(screen.getByRole('button', { name: 'Create' }))
  await waitFor(() => expect(boundary.store.uploadArtifact).toHaveBeenCalledOnce())
  fireEvent.click(await screen.findByRole('button', { name: 'Stop and close' }))
  expect(signal?.aborted).toBe(true)
  expect(onSaved).toHaveBeenCalledWith(draft)
  expect(onCancel).not.toHaveBeenCalled()
})
