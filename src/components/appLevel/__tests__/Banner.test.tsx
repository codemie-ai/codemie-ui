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

import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { appInfoStore, hash } from '@/store/appInfo'

import Banner from '../Banner'

vi.mock('@/store/appInfo', () => {
  const hash = (str: string): string => {
    let h = 0
    for (let i = 0; i < str.length; i += 1) {
      h = h * 32 - h + str.charCodeAt(i)
      h = Math.trunc(h)
    }
    return Math.abs(h).toString(36)
  }
  return {
    appInfoStore: {
      configs: [],
      dismissAdminBanner: vi.fn(),
    },
    BANNER_SHOWN_STORAGE_KEY_PREFIX: 'bannerShown-',
    hash,
  }
})

const setBanner = (config: { message?: string; linkLabel?: string; linkRoute?: string }) => {
  appInfoStore.configs = [
    {
      id: 'banner',
      settings: {
        enabled: true,
        message: config.message ?? '',
        linkLabel: config.linkLabel ?? '',
        linkRoute: config.linkRoute ?? '',
      },
    },
  ]
}

const renderWithRouter = () =>
  render(
    <MemoryRouter>
      <Banner />
    </MemoryRouter>
  )

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

    setBanner({})
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('basic rendering', () => {
    it('renders without crashing', () => {
      const { container } = renderWithRouter()
      expect(container.firstChild).toBeInTheDocument()
    })

    it('does not display banner when no message is set', () => {
      setBanner({ message: '' })
      renderWithRouter()
      expect(screen.queryByText(/./)).not.toBeInTheDocument()
    })

    it('displays banner message when set', () => {
      setBanner({ message: 'Important announcement' })
      renderWithRouter()
      expect(screen.getByText('Important announcement')).toBeInTheDocument()
    })
  })

  describe('banner message display', () => {
    it('shows banner for first time visitors', () => {
      setBanner({ message: 'Welcome message' })
      renderWithRouter()
      expect(screen.getByText('Welcome message')).toBeInTheDocument()
      expect(localStorage.getItem).toHaveBeenCalled()
    })

    it('does not show banner if already closed', () => {
      const message = 'Already closed message'
      setBanner({ message })

      // Simulate banner was already closed
      const storageKey = 'bannerShown-' + hash(message)
      localStorageMock[storageKey] = 'true'

      renderWithRouter()
      expect(screen.queryByText(message)).not.toBeInTheDocument()
    })

    it('displays multiline messages with whitespace preserved', () => {
      const multilineMessage = 'Line 1\nLine 2\nLine 3'
      setBanner({ message: multilineMessage })
      const { container } = renderWithRouter()
      // Find the message detail span which contains the multiline text
      const messageDetail = container.querySelector('.p-message-detail')
      expect(messageDetail).toBeInTheDocument()
      expect(messageDetail?.textContent).toBe(multilineMessage)
    })
  })

  describe('close functionality', () => {
    it('has close button', () => {
      setBanner({ message: 'Closable message' })
      const { container } = renderWithRouter()

      const closeButton = container.querySelector('button[aria-label="Close"]')
      expect(closeButton).toBeInTheDocument()
    })
  })

  describe('banner properties', () => {
    it('displays info severity banner and is sticky', async () => {
      setBanner({ message: 'Sticky message' })
      const { container } = renderWithRouter()
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
      setBanner({ message: '' })
      let { container } = renderWithRouter()
      expect(container.querySelector('[role="alert"]')).not.toBeInTheDocument()
      setBanner({})
      container = renderWithRouter().container
      expect(container.querySelector('[role="alert"]')).not.toBeInTheDocument()
    })

    it('handles very long and special character messages', () => {
      const longMessage = 'A'.repeat(1000)
      setBanner({ message: longMessage })
      renderWithRouter()
      expect(screen.getByText(longMessage)).toBeInTheDocument()

      const specialMessage = '<script>alert("xss")</script> & special chars: é, ñ, 中文'
      setBanner({ message: specialMessage })
      renderWithRouter()
      expect(screen.getByText(specialMessage)).toBeInTheDocument()
    })
  })

  describe('re-rendering behavior', () => {
    it('shows banner again if message changes', () => {
      const message1 = 'First message'
      setBanner({ message: message1 })
      const { rerender } = renderWithRouter()

      expect(screen.getByText(message1)).toBeInTheDocument()

      // Change message
      const message2 = 'Second message'
      setBanner({ message: message2 })
      rerender(
        <MemoryRouter>
          <Banner />
        </MemoryRouter>
      )

      expect(screen.getByText(message2)).toBeInTheDocument()
    })
  })

  describe('optional internal link', () => {
    it('renders an internal link when label and route are configured', () => {
      setBanner({
        message: 'Terms have been updated.',
        linkLabel: 'Review Terms and Conditions',
        linkRoute: '/terms-and-conditions',
      })

      renderWithRouter()

      expect(screen.getByRole('link', { name: 'Review Terms and Conditions' })).toHaveAttribute(
        'href',
        '/terms-and-conditions'
      )
    })

    it.each([
      { linkLabel: 'Review Terms and Conditions', linkRoute: '' },
      { linkLabel: '', linkRoute: '/terms-and-conditions' },
    ])('omits the link when optional configuration is incomplete', ({ linkLabel, linkRoute }) => {
      setBanner({ message: 'Terms have been updated.', linkLabel, linkRoute })

      renderWithRouter()

      expect(screen.queryByRole('link')).not.toBeInTheDocument()
      expect(screen.getByText('Terms have been updated.')).toBeInTheDocument()
    })

    it('preserves multiline message text when a link is configured', () => {
      const message = 'Terms have been updated.\nPlease review the changes.'
      setBanner({
        message,
        linkLabel: 'Review Terms and Conditions',
        linkRoute: '/terms-and-conditions',
      })

      const { container } = renderWithRouter()

      expect(container.querySelector('.p-message-detail')?.textContent).toContain(message)
      expect(screen.getByRole('link', { name: 'Review Terms and Conditions' })).toBeInTheDocument()
    })

    it('calls dismissAdminBanner when the close button is clicked', () => {
      const message = 'Terms have been updated.'
      setBanner({
        message,
        linkLabel: 'Review Terms and Conditions',
        linkRoute: '/terms-and-conditions',
      })

      const { container } = renderWithRouter()
      const closeButton = container.querySelector('button[aria-label="Close"]')
      fireEvent.click(closeButton!)

      expect(appInfoStore.dismissAdminBanner).toHaveBeenCalled()
    })
  })

  describe('link target safety', () => {
    const scriptUrl = ['java', 'script:alert(1)'].join('')

    it.each([scriptUrl, 'data:text/html;base64,PHN2Zz4=', 'vbscript:msgbox(1)'])(
      'renders the message without a link when the target carries a scripting scheme (%s)',
      (linkRoute) => {
        setBanner({ message: 'Terms updated.', linkLabel: 'Details', linkRoute })
        renderWithRouter()

        expect(screen.queryByRole('link')).not.toBeInTheDocument()
        expect(screen.getByText('Terms updated.')).toBeInTheDocument()
      }
    )

    it.each(['/settings/profile', 'https://docs.example.com/policy'])(
      'renders the link for an ordinary target (%s)',
      (linkRoute) => {
        setBanner({ message: 'Terms updated.', linkLabel: 'Details', linkRoute })
        renderWithRouter()

        expect(screen.getByRole('link', { name: 'Details' })).toHaveAttribute('href', linkRoute)
      }
    )
  })

  describe('disabled banner', () => {
    it('shows nothing when the component is disabled', () => {
      appInfoStore.configs = [
        {
          id: 'banner',
          settings: { enabled: false, message: 'Hidden', linkLabel: '', linkRoute: '' },
        },
      ]
      const { container } = renderWithRouter()

      expect(container.querySelector('[role="alert"]')).not.toBeInTheDocument()
    })

    it('shows the same message when the component is enabled', () => {
      setBanner({ message: 'Hidden' })
      renderWithRouter()

      expect(screen.getByText('Hidden')).toBeInTheDocument()
    })
  })
})
