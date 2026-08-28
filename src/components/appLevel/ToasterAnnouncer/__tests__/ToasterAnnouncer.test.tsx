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

import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import ToasterAnnouncer from '../ToasterAnnouncer'

// The global setupTests mock stubs @/utils/toaster; we need the real one for this suite so the
// component's registration actually plugs into the module's announcer slot.
vi.unmock('@/utils/toaster')

vi.mock('toastify-js', () => ({
  default: vi.fn(() => ({ showToast: vi.fn() })),
}))

const { default: toaster } = await vi.importActual<typeof import('@/utils/toaster')>(
  '@/utils/toaster'
)

describe('<ToasterAnnouncer />', () => {
  it('renders a polite live region', () => {
    render(<ToasterAnnouncer />)
    const live = screen.getByRole('status')
    expect(live).toHaveAttribute('aria-live', 'polite')
    expect(live).toHaveAttribute('aria-atomic', 'true')
  })

  it('mirrors a success toast into the live region', async () => {
    render(<ToasterAnnouncer />)
    toaster.success('User name copied to clipboard')
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('User name copied to clipboard')
    })
  })

  it('mirrors error toasts as status announcements', async () => {
    render(<ToasterAnnouncer />)
    toaster.error('Failed to save')
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Failed to save')
    })
  })

  it('deregisters the announcer on unmount', () => {
    const { unmount } = render(<ToasterAnnouncer />)
    unmount()
    // After unmount there is no live region left in the DOM.
    expect(screen.queryByRole('status')).toBeNull()
    // And a subsequent toast call must not throw (announcer slot cleared).
    expect(() => toaster.success('after unmount')).not.toThrow()
  })
})
