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
//
import './reviewRegressionSetup'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'

import { useHostedCardActions } from '../useHostedCardActions'

const boundary = vi.hoisted(() => ({
  onChanged: vi.fn(),
  onError: vi.fn(),
  toast: vi.fn(),
  store: {
    getApplication: vi.fn(),
    getShareLink: vi.fn(),
    revokeShareLink: vi.fn(),
  },
}))
vi.mock('@/store/hostedApplications', () => ({
  hostedApplicationsStore: boundary.store,
  hostedErrorMessage: (cause: Error) => cause.message,
}))
vi.mock('@/utils/toaster', () => ({ default: { success: boundary.toast, error: vi.fn() } }))
vi.mock('react-router', () => ({ useNavigate: () => vi.fn(), useHref: (to: string) => to }))
vi.mock('@/components/ConfirmationModal', () => ({
  default: ({ header, message, confirmText, onConfirm, onCancel, confirmDisabled }: any) => (
    <dialog open aria-label={header}>
      <p>{message}</p>
      <button disabled={confirmDisabled} onClick={onConfirm}>
        {confirmText}
      </button>
      <button onClick={onCancel}>Cancel</button>
    </dialog>
  ),
}))

// A platform admin who is not the owner: can moderate, cannot share or read the link.
const app = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name: 'Visual',
  user_abilities: ['read'],
  can_moderate: true,
  can_share: false,
}

const Harness = () => {
  const actions = useHostedCardActions({
    isCurrent: () => true,
    onChanged: boundary.onChanged,
    onError: boundary.onError,
  })
  const item = actions
    .menuItems(app as never)
    .find((entry: any) => entry.title === 'Revoke share link')
  return (
    <>
      <button onClick={() => (item as any).onClick()}>Pick revoke</button>
      {actions.dialogs}
    </>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  boundary.store.getApplication.mockResolvedValue(app)
  boundary.store.revokeShareLink.mockResolvedValue(null)
})

it('revokes the link after confirmation without reading it, then refreshes', async () => {
  render(<Harness />)
  fireEvent.click(screen.getByRole('button', { name: 'Pick revoke' }))
  const dialog = await screen.findByRole('dialog', { name: 'Revoke the share link?' })
  expect(boundary.store.revokeShareLink).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Revoke link' }))
  await waitFor(() => expect(boundary.store.revokeShareLink).toHaveBeenCalledWith(app.id))
  await waitFor(() => expect(dialog).not.toBeInTheDocument())
  // The server answers the same whether a link was live or not, so the toast says only what is true.
  expect(boundary.toast).toHaveBeenCalledWith('No live share link remains')
  expect(boundary.onChanged).toHaveBeenCalled()
  expect(boundary.store.getShareLink).not.toHaveBeenCalled()
})

it('does nothing when cancelled', async () => {
  render(<Harness />)
  fireEvent.click(screen.getByRole('button', { name: 'Pick revoke' }))
  await screen.findByRole('dialog', { name: 'Revoke the share link?' })
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(boundary.store.revokeShareLink).not.toHaveBeenCalled()
})

it('reports a failed revoke and shows no success toast', async () => {
  boundary.store.revokeShareLink.mockRejectedValue(new Error('Only the owner can revoke'))
  render(<Harness />)
  fireEvent.click(screen.getByRole('button', { name: 'Pick revoke' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Revoke link' }))
  await waitFor(() => expect(boundary.onError).toHaveBeenCalledWith('Only the owner can revoke'))
  expect(boundary.toast).not.toHaveBeenCalled()
})
