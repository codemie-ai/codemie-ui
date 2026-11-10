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
import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'

import { useHostedCardActions } from '../useHostedCardActions'

const boundary = vi.hoisted(() => ({
  current: true,
  onChanged: vi.fn(),
  onError: vi.fn(),
  store: { getApplication: vi.fn(), deleteApplication: vi.fn() },
}))
vi.mock('@/store/hostedApplications', () => ({
  hostedApplicationsStore: boundary.store,
  hostedErrorMessage: (cause: Error) => cause.message,
}))
vi.mock('../HostedSecurityDialog', () => ({
  default: ({ action, app }: any) => (
    <dialog open aria-label={'security-' + action}>
      etag {app.etag}
    </dialog>
  ),
}))
vi.mock('react-router', () => ({ useNavigate: () => vi.fn(), useHref: (to: string) => to }))
vi.mock('@/components/ConfirmationModal', () => ({
  default: ({ onConfirm, onCancel, confirmDisabled }: any) => (
    <dialog open>
      <button disabled={confirmDisabled} onClick={onConfirm}>
        Confirm
      </button>
      <button onClick={onCancel}>Cancel</button>
    </dialog>
  ),
}))

const app = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name: 'Visual',
  user_abilities: ['read', 'write', 'delete'],
  capabilities: { can_manage: true, can_launch: true },
}

const Harness = () => {
  const actions = useHostedCardActions({
    isCurrent: () => boundary.current,
    onChanged: boundary.onChanged,
    onError: boundary.onError,
  })
  const trash = actions.menuItems(app as never).find((item: any) => item.title === 'Delete')
  return (
    <>
      <button onClick={() => (trash as any).onClick()}>Move to trash</button>
      {actions.dialogs}
    </>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  boundary.current = true
  boundary.store.getApplication.mockResolvedValue(app)
})

it('closes the confirmation when the request settles after the visit changed', async () => {
  let finish: (value: unknown) => void = () => undefined
  boundary.store.deleteApplication.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve
    })
  )
  render(<Harness />)
  fireEvent.click(screen.getByRole('button', { name: 'Move to trash' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }))
  // Browser Back moved to another collection while the request was in flight.
  boundary.current = false
  await act(async () => {
    finish(app)
    await Promise.resolve()
  })
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(boundary.onChanged).not.toHaveBeenCalled()
})

it('closes the confirmation and keeps the error for the visit that is still current', async () => {
  boundary.store.deleteApplication.mockRejectedValue(new Error('This item changed in another tab'))
  render(<Harness />)
  fireEvent.click(screen.getByRole('button', { name: 'Move to trash' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }))
  await act(async () => {
    await Promise.resolve()
  })
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(boundary.onError).toHaveBeenCalledWith('This item changed in another tab')
})

it('opens the security dialog on a fresh revision when Suspend is selected', async () => {
  const moderator = { ...app, can_moderate: true, suspended: false, etag: 'stale' }
  boundary.store.getApplication.mockResolvedValue({ ...moderator, etag: 'fresh' })
  const Moderation = () => {
    const actions = useHostedCardActions({
      isCurrent: () => true,
      onChanged: boundary.onChanged,
      onError: boundary.onError,
    })
    const item = actions.menuItems(moderator as never).find((i: any) => i.title === 'Suspend')
    return (
      <>
        <button onClick={() => (item as any).onClick()}>Suspend it</button>
        {actions.dialogs}
      </>
    )
  }
  render(<Moderation />)
  fireEvent.click(screen.getByRole('button', { name: 'Suspend it' }))
  expect(await screen.findByRole('dialog', { name: 'security-suspend' })).toHaveTextContent(
    'etag fresh'
  )
  expect(boundary.store.getApplication).toHaveBeenCalledWith(moderator.id)
})
