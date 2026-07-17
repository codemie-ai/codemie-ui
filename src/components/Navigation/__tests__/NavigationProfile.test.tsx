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

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import NavigationProfile from '../NavigationProfile'

vi.hoisted(() => vi.resetModules())

const {
  mockAuthStore,
  mockUserStore,
  mockAppInfoStore,
  mockRouter,
  mockCopyToClipboard,
  mockUser,
} = vi.hoisted(() => {
  const mockUser = {
    userId: 'user-123',
    name: 'John Doe',
    picture: 'https://example.com/avatar.jpg',
  } as any

  return {
    mockUser,
    mockAuthStore: {
      logout: vi.fn(),
    },
    mockUserStore: {
      user: mockUser,
    },
    mockAppInfoStore: {
      apiVersion: '1.2.3',
    },
    mockRouter: {
      push: vi.fn(),
    },
    mockCopyToClipboard: vi.fn(),
  }
})

vi.mock('valtio', () => ({
  proxy: (obj: any) => obj,
  useSnapshot: vi.fn((store) => {
    if (store === mockUserStore) return mockUserStore
    if (store === mockAppInfoStore) return mockAppInfoStore
    return store
  }),
  subscribe: vi.fn(),
}))

vi.mock('@/store/user', () => ({
  userStore: mockUserStore,
}))

vi.mock('@/store/auth', () => ({
  authStore: mockAuthStore,
}))

vi.mock('@/store/appInfo', () => ({
  appInfoStore: mockAppInfoStore,
}))

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: vi.fn(() => mockRouter),
}))

vi.mock('@/utils/utils', async () => {
  const actual = await vi.importActual('@/utils/utils')
  return {
    ...actual,
    copyToClipboard: mockCopyToClipboard,
  }
})

vi.mock('@/constants', () => ({
  APP_VERSION: '0.4.6',
}))

// Mirrors PrimeReact's real ~100ms CSS exit-transition gap between
// transitionOptions.onExit (animation start) and onHide (animation end).
// vi.hoisted so the vi.mock factory below (itself hoisted above this file's
// imports) can reference it without a temporal-dead-zone error.
const { MOCK_EXIT_TO_HIDE_DELAY_MS } = vi.hoisted(() => ({ MOCK_EXIT_TO_HIDE_DELAY_MS: 50 }))

// OverlayPanel mock with open/close support and imperative handle.
// Starts closed (visible=false). Calls onShow/onHide when visibility changes.
vi.mock('primereact/overlaypanel', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  const { forwardRef, useState, useImperativeHandle, useRef, useEffect } = require('react')

  const OverlayPanel = forwardRef(
    (
      {
        children,
        onShow,
        onHide,
        transitionOptions,
      }: {
        children: React.ReactNode
        onShow?: () => void
        onHide?: () => void
        transitionOptions?: { onExit?: () => void }
      },
      ref: React.ForwardedRef<any>
    ) => {
      const [visible, setVisible] = useState(false)
      const toggleVisible = () => setVisible((v: boolean) => !v)
      const callbacksRef = useRef({ onShow, onHide, transitionOptions })
      callbacksRef.current = { onShow, onHide, transitionOptions }
      const prevVisibleRef = useRef(false)

      useImperativeHandle(ref, () => ({
        toggle: toggleVisible,
        hide: () => setVisible(false),
        show: () => setVisible(true),
      }))

      // Call onShow/onHide when visibility transitions, skipping initial mount.
      // On hide, call transitionOptions.onExit first (mirrors PrimeReact animation-start),
      // then onHide after MOCK_EXIT_TO_HIDE_DELAY_MS (mirrors the real ~100ms CSS exit
      // animation gap between onExit/animation-start and onExited/onHide).
      useEffect(() => {
        if (visible && !prevVisibleRef.current) {
          callbacksRef.current.onShow?.()
        } else if (!visible && prevVisibleRef.current) {
          callbacksRef.current.transitionOptions?.onExit?.()
          setTimeout(() => callbacksRef.current.onHide?.(), MOCK_EXIT_TO_HIDE_DELAY_MS)
        }
        prevVisibleRef.current = visible
      })

      if (!visible) return null
      return <div data-testid="overlay-panel">{children}</div>
    }
  )
  OverlayPanel.displayName = 'OverlayPanel'
  return { OverlayPanel }
})

vi.mock('@/assets/icons/logout.svg?react', () => ({
  default: () => <svg data-testid="logout-icon" />,
}))

vi.mock('@/assets/icons/configuration.svg?react', () => ({
  default: () => <svg data-testid="settings-icon" />,
}))

vi.mock('@/assets/icons/copy.svg?react', () => ({
  default: () => <svg data-testid="copy-icon" />,
}))

// Helper: opens the profile popup by clicking the trigger button.
const openPanel = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /User profile/i }))
}

describe('NavigationProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUserStore.user = mockUser
    mockAppInfoStore.apiVersion = '1.2.3'
    ;(window as any)._env_ = { VITE_APP_VERSION: '1.0.0' }
  })

  // --- Rendering ---

  it('renders without crashing', () => {
    const { container } = render(<NavigationProfile isExpanded={false} />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders profile button', () => {
    render(<NavigationProfile isExpanded={false} />)
    expect(screen.getByRole('button', { name: /User profile/i })).toBeInTheDocument()
  })

  it('renders user avatar', () => {
    render(<NavigationProfile isExpanded={false} />)
    const avatars = screen.getAllByAltText('User profile')
    expect(avatars[0]).toBeInTheDocument()
    expect(avatars[0]).toHaveAttribute('src', mockUser.picture)
  })

  it('uses default avatar when user has no picture', () => {
    mockUserStore.user = { ...mockUser, picture: null }
    render(<NavigationProfile isExpanded={false} />)
    const avatars = screen.getAllByAltText('User profile')
    expect(avatars[0]).toHaveAttribute('src', expect.stringContaining('avatar.jpg'))
  })

  it('displays "Profile" text when expanded', () => {
    render(<NavigationProfile isExpanded={true} />)
    expect(screen.getByText('Profile')).toBeInTheDocument()
  })

  it('shows tooltip when collapsed', () => {
    render(<NavigationProfile isExpanded={false} />)
    const button = screen.getByRole('button', { name: /User profile/i })
    expect(button).toHaveAttribute('data-tooltip-content', 'Profile')
  })

  it('does not show tooltip when expanded', () => {
    render(<NavigationProfile isExpanded={true} />)
    const button = screen.getByRole('button', { name: /User profile/i })
    expect(button).not.toHaveAttribute('data-tooltip-content')
  })

  // --- Panel content (requires opening) ---

  it('renders overlay panel when profile button is clicked', async () => {
    const user = userEvent.setup()
    render(<NavigationProfile isExpanded={false} />)
    await openPanel(user)
    expect(screen.getByTestId('overlay-panel')).toBeInTheDocument()
  })

  it('displays user information in panel', async () => {
    const user = userEvent.setup()
    render(<NavigationProfile isExpanded={false} />)
    await openPanel(user)
    expect(screen.getByText(mockUser.name)).toBeInTheDocument()
    expect(screen.getByText(`ID: ${mockUser.userId}`)).toBeInTheDocument()
  })

  it('displays version information', async () => {
    const user = userEvent.setup()
    render(<NavigationProfile isExpanded={false} />)
    await openPanel(user)
    expect(screen.getByText('UI Version: 1.0.0')).toBeInTheDocument()
    expect(screen.getByText('API Version: 1.2.3')).toBeInTheDocument()
  })

  it('falls back to APP_VERSION when window._env_ is not available', async () => {
    delete (window as any)._env_
    const user = userEvent.setup()
    render(<NavigationProfile isExpanded={false} />)
    await openPanel(user)
    expect(screen.getByText('UI Version: 0.4.6')).toBeInTheDocument()
  })

  it('renders action buttons with icons', async () => {
    const user = userEvent.setup()
    render(<NavigationProfile isExpanded={false} />)
    await openPanel(user)
    expect(screen.getByRole('button', { name: /Settings/i })).toBeInTheDocument()
    expect(screen.getByTestId('settings-icon')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Log out/i })).toBeInTheDocument()
    expect(screen.getByTestId('logout-icon')).toBeInTheDocument()
  })

  it('renders copy buttons for username and user ID', async () => {
    const user = userEvent.setup()
    render(<NavigationProfile isExpanded={false} />)
    await openPanel(user)
    expect(screen.getByRole('button', { name: /Copy username/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Copy user ID/i })).toBeInTheDocument()
  })

  it('calls copyToClipboard with username when copy username button is clicked', async () => {
    const user = userEvent.setup()
    render(<NavigationProfile isExpanded={false} />)
    await openPanel(user)
    await user.click(screen.getByRole('button', { name: /Copy username/i }))
    expect(mockCopyToClipboard).toHaveBeenCalledWith(mockUser.name, 'Username copied to clipboard')
  })

  it('calls copyToClipboard with user ID when copy user ID button is clicked', async () => {
    const user = userEvent.setup()
    render(<NavigationProfile isExpanded={false} />)
    await openPanel(user)
    await user.click(screen.getByRole('button', { name: /Copy user ID/i }))
    expect(mockCopyToClipboard).toHaveBeenCalledWith(mockUser.userId, 'User ID copied to clipboard')
  })

  it('navigates to settings when Settings button is clicked', async () => {
    const user = userEvent.setup()
    render(<NavigationProfile isExpanded={false} />)
    await openPanel(user)
    await user.click(screen.getByRole('button', { name: /Settings/i }))
    expect(mockRouter.push).toHaveBeenCalledWith({ name: 'settings' })
  })

  it('calls logout when Log out button is clicked', async () => {
    const user = userEvent.setup()
    render(<NavigationProfile isExpanded={false} />)
    await openPanel(user)
    await user.click(screen.getByRole('button', { name: /Log out/i }))
    expect(mockAuthStore.logout).toHaveBeenCalledTimes(1)
  })

  it('copy buttons have aria-label accessible names', async () => {
    const user = userEvent.setup()
    render(<NavigationProfile isExpanded={false} />)
    await openPanel(user)
    expect(screen.getByLabelText('Copy username')).toBeInTheDocument()
    expect(screen.getByLabelText('Copy user ID')).toBeInTheDocument()
  })

  it('copy buttons meet 24px minimum target size via Tailwind classes', async () => {
    const user = userEvent.setup()
    render(<NavigationProfile isExpanded={false} />)
    await openPanel(user)
    const copyUsernameBtn = screen.getByLabelText('Copy username')
    const copyUserIdBtn = screen.getByLabelText('Copy user ID')
    expect(copyUsernameBtn.className).toContain('min-w-[24px]')
    expect(copyUsernameBtn.className).toContain('min-h-[24px]')
    expect(copyUserIdBtn.className).toContain('min-w-[24px]')
    expect(copyUserIdBtn.className).toContain('min-h-[24px]')
  })

  // --- ARIA ---

  it('trigger button has aria-expanded=false when panel is closed', () => {
    render(<NavigationProfile isExpanded={false} />)
    const button = screen.getByRole('button', { name: /User profile/i })
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('trigger button has aria-expanded=true when panel is open', async () => {
    const user = userEvent.setup()
    render(<NavigationProfile isExpanded={false} />)
    await openPanel(user)
    const button = screen.getByRole('button', { name: /User profile/i })
    expect(button).toHaveAttribute('aria-expanded', 'true')
  })

  it('trigger button has aria-haspopup="dialog"', () => {
    render(<NavigationProfile isExpanded={false} />)
    const button = screen.getByRole('button', { name: /User profile/i })
    expect(button).toHaveAttribute('aria-haspopup', 'dialog')
  })

  it('panel has role="dialog" when open', async () => {
    const user = userEvent.setup()
    render(<NavigationProfile isExpanded={false} />)
    await openPanel(user)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('panel has aria-modal="true" when open', async () => {
    const user = userEvent.setup()
    render(<NavigationProfile isExpanded={false} />)
    await openPanel(user)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('panel has aria-label="User profile" when open', async () => {
    const user = userEvent.setup()
    render(<NavigationProfile isExpanded={false} />)
    await openPanel(user)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-label', 'User profile')
  })

  it('panel element is a plain div, not a native <dialog>', async () => {
    const user = userEvent.setup()
    render(<NavigationProfile isExpanded={false} />)
    await openPanel(user)
    const dialog = screen.getByRole('dialog')
    expect(dialog.tagName).toBe('DIV')
  })

  // --- Focus trap (WCAG 2.4.3) ---

  it('wraps Tab from last to first button when panel is open', async () => {
    const user = userEvent.setup()
    render(<NavigationProfile isExpanded={false} />)
    await openPanel(user)

    const dialog = screen.getByRole('dialog')
    const panelButtons = Array.from(dialog.querySelectorAll<HTMLElement>('button'))
    // order: Copy username, Copy user ID, Settings, Log out
    expect(panelButtons).toHaveLength(4)

    panelButtons[panelButtons.length - 1].focus()
    fireEvent.keyDown(document, { key: 'Tab', bubbles: true })

    expect(panelButtons[0]).toHaveFocus()
  })

  it('wraps Shift+Tab from first to last button when panel is open', async () => {
    const user = userEvent.setup()
    render(<NavigationProfile isExpanded={false} />)
    await openPanel(user)

    const dialog = screen.getByRole('dialog')
    const panelButtons = Array.from(dialog.querySelectorAll<HTMLElement>('button'))

    panelButtons[0].focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true, bubbles: true })

    expect(panelButtons[panelButtons.length - 1]).toHaveFocus()
  })

  it('restores focus to the profile trigger button when panel closes', async () => {
    const user = userEvent.setup()
    render(<NavigationProfile isExpanded={false} />)

    const profileButton = screen.getByRole('button', { name: /User profile/i })
    await openPanel(user)
    await user.click(screen.getByRole('button', { name: /Settings/i }))

    await waitFor(() => expect(profileButton).toHaveFocus())
  })

  it('closes the panel and restores focus to trigger button when Escape is pressed', async () => {
    const user = userEvent.setup()
    render(<NavigationProfile isExpanded={false} />)

    const profileButton = screen.getByRole('button', { name: /User profile/i })
    await openPanel(user)
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(profileButton).toHaveFocus())
  })

  it('deactivates focus trap at animation start (transitionOptions.onExit) so Tab is not intercepted during close', async () => {
    const user = userEvent.setup()
    render(<NavigationProfile isExpanded={false} />)
    await openPanel(user)

    // Trap active: Tab at last button wraps to first
    const dialog = screen.getByRole('dialog')
    const panelButtons = Array.from(dialog.querySelectorAll<HTMLElement>('button'))
    panelButtons[panelButtons.length - 1].focus()
    fireEvent.keyDown(document, { key: 'Tab', bubbles: true })
    expect(panelButtons[0]).toHaveFocus()

    // Close — mock calls transitionOptions.onExit (deactivates trap) then onHide (restores focus)
    // jsdom doesn't implement native Tab focus movement, so asserting focus stays put after
    // firing Tab can't distinguish a detached listener from a still-attached one — spy on the
    // detach call instead (CR-004).
    const removeSpy = vi.spyOn(document, 'removeEventListener')
    await user.click(screen.getByRole('button', { name: /Settings/i }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
  })

  it('applies aria-hidden to #app while the panel is open, and removes it on close', async () => {
    const appRoot = document.createElement('div')
    appRoot.id = 'app'
    document.body.appendChild(appRoot)

    const user = userEvent.setup()
    render(<NavigationProfile isExpanded={false} />)
    expect(appRoot).not.toHaveAttribute('aria-hidden')

    await openPanel(user)
    await waitFor(() => expect(appRoot).toHaveAttribute('aria-hidden', 'true'))

    await user.click(screen.getByRole('button', { name: /Settings/i }))
    await waitFor(() => expect(appRoot).not.toHaveAttribute('aria-hidden'))

    document.body.removeChild(appRoot)
  })

  it('removes aria-hidden from #app during the exit transition, before the deferred onHide runs (CR-001)', async () => {
    const appRoot = document.createElement('div')
    appRoot.id = 'app'
    document.body.appendChild(appRoot)

    try {
      const user = userEvent.setup()
      render(<NavigationProfile isExpanded={false} />)
      await openPanel(user)
      await waitFor(() => expect(appRoot).toHaveAttribute('aria-hidden', 'true'))

      await user.click(screen.getByRole('button', { name: /Settings/i }))
      // transitionOptions.onExit fires synchronously as part of this click;
      // the mock defers onHide by MOCK_EXIT_TO_HIDE_DELAY_MS (real timer) to
      // mirror PrimeReact's real exit-transition gap. Checking immediately,
      // well before that delay elapses, proves aria-hidden was removed by
      // onExit itself, not merely by the later onHide.
      expect(appRoot).not.toHaveAttribute('aria-hidden')
    } finally {
      document.body.removeChild(appRoot)
    }
  })

  it('cancels the pending onShow timer on close, so it cannot re-apply aria-hidden after the panel is closed (CR-002)', async () => {
    const appRoot = document.createElement('div')
    appRoot.id = 'app'
    document.body.appendChild(appRoot)

    try {
      const user = userEvent.setup()
      render(<NavigationProfile isExpanded={false} />)

      // Open, then close again immediately -- before onShow's setTimeout(0)
      // (which sets aria-hidden) has fired.
      await user.click(screen.getByRole('button', { name: /User profile/i }))
      await user.click(screen.getByRole('button', { name: /Settings/i }))

      // Wait long enough for the stale onShow timer (0ms delay) to fire, but
      // well short of the mock's onHide delay -- isolates the moment an
      // uncancelled timer would (in the unfixed code) have re-applied
      // aria-hidden between onExit and onHide.
      await new Promise((resolve) => {
        setTimeout(resolve, 5)
      })
      expect(appRoot).not.toHaveAttribute('aria-hidden')
    } finally {
      document.body.removeChild(appRoot)
    }
  })
})
