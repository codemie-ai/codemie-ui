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

import Banner from '../Banner'

describe('Banner', () => {
  let localStorageMock: { [key: string]: string }

  beforeEach(() => {
    localStorageMock = {}

    global.localStorage = {
      getItem: vi.fn((key: string) => localStorageMock[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key]
      }),
      clear: vi.fn(() => {
        localStorageMock = {}
      }),
      key: vi.fn(),
      length: 0,
    } as Storage
    ;(window as any)._env_ = {}
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('basic rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(<Banner />)
      expect(container.firstChild).toBeInTheDocument()
    })

    it('does not display banner when no message is set', () => {
      ;(window as any)._env_ = { VITE_BANNER_MESSAGE: '' }
      render(<Banner />)
      expect(screen.queryByText(/./)).not.toBeInTheDocument()
    })

    it('displays banner message when set', () => {
      ;(window as any)._env_ = { VITE_BANNER_MESSAGE: 'Important announcement' }
      render(<Banner />)
      expect(screen.getByText('Important announcement')).toBeInTheDocument()
    })
  })

  describe('banner message display', () => {
    it('shows banner for first time visitors', () => {
      ;(window as any)._env_ = { VITE_BANNER_MESSAGE: 'Welcome message' }
      render(<Banner />)
      expect(screen.getByText('Welcome message')).toBeInTheDocument()
      expect(localStorage.getItem).toHaveBeenCalled()
    })

    it('does not show banner if already closed', () => {
      const message = 'Already closed message'
      ;(window as any)._env_ = { VITE_BANNER_MESSAGE: message }

      // Calculate the correct hash for the message
      const hash = (str: string): string => {
        let hash = 0
        for (let i = 0; i < str.length; i += 1) {
          const char = str.charCodeAt(i)
          hash = hash * 32 - hash + char
          hash = Math.trunc(hash)
        }
        return Math.abs(hash).toString(36)
      }

      // Simulate banner was already closed
      const storageKey = 'bannerShown-' + hash(message)
      localStorageMock[storageKey] = 'true'

      render(<Banner />)
      expect(screen.queryByText(message)).not.toBeInTheDocument()
    })

    it('displays multiline messages with whitespace preserved', () => {
      const multilineMessage = 'Line 1\nLine 2\nLine 3'
      ;(window as any)._env_ = { VITE_BANNER_MESSAGE: multilineMessage }
      const { container } = render(<Banner />)
      // Find the message detail span which contains the multiline text
      const messageDetail = container.querySelector('.p-message-detail')
      expect(messageDetail).toBeInTheDocument()
      expect(messageDetail?.textContent).toBe(multilineMessage)
    })
  })

  describe('close functionality', () => {
    it('has close button', () => {
      const message = 'Closable message'
      ;(window as any)._env_ = { VITE_BANNER_MESSAGE: message }
      const { container } = render(<Banner />)

      const closeButton = container.querySelector('button[aria-label="Close"]')
      expect(closeButton).toBeInTheDocument()
    })
  })

  describe('banner properties', () => {
    it('displays info severity banner and is sticky', async () => {
      ;(window as any)._env_ = { VITE_BANNER_MESSAGE: 'Sticky message' }
      const { container } = render(<Banner />)
      const message = container.querySelector('[role="alert"]')
      expect(message).toBeInTheDocument()
      expect(screen.getByText('Sticky message')).toBeInTheDocument()

      // Wait a bit to ensure it doesn't auto-hide
      await new Promise((resolve) => {
        setTimeout(resolve, 100)
      })
      expect(screen.getByText('Sticky message')).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('handles empty, undefined, and missing banner message', () => {
      ;(window as any)._env_ = { VITE_BANNER_MESSAGE: '' }
      let { container } = render(<Banner />)
      expect(container.querySelector('[role="alert"]')).not.toBeInTheDocument()
      ;(window as any)._env_ = undefined
      container = render(<Banner />).container
      expect(container.querySelector('[role="alert"]')).not.toBeInTheDocument()
      ;(window as any)._env_ = {}
      container = render(<Banner />).container
      expect(container.querySelector('[role="alert"]')).not.toBeInTheDocument()
    })

    it('handles very long and special character messages', () => {
      const longMessage = 'A'.repeat(1000)
      ;(window as any)._env_ = { VITE_BANNER_MESSAGE: longMessage }
      render(<Banner />)
      expect(screen.getByText(longMessage)).toBeInTheDocument()

      const specialMessage = '<script>alert("xss")</script> & special chars: é, ñ, 中文'
      ;(window as any)._env_ = { VITE_BANNER_MESSAGE: specialMessage }
      render(<Banner />)
      expect(screen.getByText(specialMessage)).toBeInTheDocument()
    })
  })

  describe('re-rendering behavior', () => {
    it('shows banner again if message changes', () => {
      const message1 = 'First message'
      ;(window as any)._env_ = { VITE_BANNER_MESSAGE: message1 }
      const { rerender } = render(<Banner />)

      expect(screen.getByText(message1)).toBeInTheDocument()

      // Change message
      const message2 = 'Second message'
      ;(window as any)._env_ = { VITE_BANNER_MESSAGE: message2 }
      rerender(<Banner />)

      expect(screen.getByText(message2)).toBeInTheDocument()
    })
  })
})
