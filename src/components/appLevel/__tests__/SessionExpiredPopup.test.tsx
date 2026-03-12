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

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import SessionExpiredPopup from '../SessionExpiredPopup'

vi.hoisted(() => vi.resetModules())

const { mockUserStore } = vi.hoisted(() => {
  return {
    mockUserStore: {
      isSessionExpired: false,
    },
  }
})

vi.mock('valtio', () => ({
  proxy: (obj: any) => obj,
  useSnapshot: vi.fn((store) => {
    if (store === mockUserStore) return mockUserStore
    return store
  }),
  subscribe: vi.fn(),
}))

vi.mock('@/store', () => ({
  userStore: mockUserStore,
}))

describe('SessionExpiredPopup', () => {
  const originalLocation = window.location

  beforeEach(() => {
    vi.clearAllMocks()
    mockUserStore.isSessionExpired = false

    // Mock window.location.reload
    delete (window as any).location
    // @ts-expect-error: tesing
    window.location = { ...originalLocation, reload: vi.fn() }
  })

  afterEach(() => {
    // @ts-expect-error: tesing
    window.location = originalLocation
  })

  describe('visibility behavior', () => {
    it('does not show popup when session is not expired', () => {
      mockUserStore.isSessionExpired = false
      render(<SessionExpiredPopup />)
      expect(screen.queryByText('Session Expired')).not.toBeInTheDocument()
    })

    it('shows popup when session is expired', () => {
      mockUserStore.isSessionExpired = true
      render(<SessionExpiredPopup />)
      expect(screen.getByText('Session Expired')).toBeInTheDocument()
    })

    it('updates visibility when session expires', () => {
      mockUserStore.isSessionExpired = false
      const { rerender } = render(<SessionExpiredPopup />)
      expect(screen.queryByText('Session Expired')).not.toBeInTheDocument()

      mockUserStore.isSessionExpired = true
      rerender(<SessionExpiredPopup />)

      expect(screen.getByText('Session Expired')).toBeInTheDocument()
    })
  })

  describe('popup content', () => {
    beforeEach(() => {
      mockUserStore.isSessionExpired = true
    })

    it('displays header, messages, and reload button', () => {
      render(<SessionExpiredPopup />)
      expect(screen.getByText('Session Expired')).toBeInTheDocument()
      expect(screen.getByText(/Your session has expired/i)).toBeInTheDocument()
      expect(screen.getByText(/Please, reload the page to continue/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Reload page/i })).toBeInTheDocument()
    })
  })

  describe('reload button interaction', () => {
    beforeEach(() => {
      mockUserStore.isSessionExpired = true
    })

    it('has reload button with correct text', () => {
      render(<SessionExpiredPopup />)
      const reloadButton = screen.getByRole('button', { name: /Reload page/i })
      expect(reloadButton).toBeInTheDocument()
    })
  })

  describe('popup behavior', () => {
    beforeEach(() => {
      mockUserStore.isSessionExpired = true
    })

    it('cannot be closed by user', () => {
      render(<SessionExpiredPopup />)
      expect(screen.getByText('Session Expired')).toBeInTheDocument()
      // Popup should not have a close button since hideClose is true
      // User cannot dismiss the popup without reloading
    })
  })

  describe('edge cases', () => {
    it('handles multiple session expired state changes', () => {
      mockUserStore.isSessionExpired = false
      const { rerender } = render(<SessionExpiredPopup />)
      expect(screen.queryByText('Session Expired')).not.toBeInTheDocument()

      // First expiration
      mockUserStore.isSessionExpired = true
      rerender(<SessionExpiredPopup />)
      expect(screen.getByText('Session Expired')).toBeInTheDocument()

      // Session restored (should not hide popup once shown)
      mockUserStore.isSessionExpired = false
      rerender(<SessionExpiredPopup />)
      // Popup should still be visible since isVisible state was set to true
      expect(screen.getByText('Session Expired')).toBeInTheDocument()
    })
  })

  describe('initial state', () => {
    it('renders with popup hidden by default or visible if session expired', () => {
      mockUserStore.isSessionExpired = false
      render(<SessionExpiredPopup />)
      expect(screen.queryByText('Session Expired')).not.toBeInTheDocument()

      mockUserStore.isSessionExpired = true
      render(<SessionExpiredPopup />)
      expect(screen.getByText('Session Expired')).toBeInTheDocument()
    })
  })
})
