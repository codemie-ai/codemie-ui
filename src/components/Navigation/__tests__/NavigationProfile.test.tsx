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

import { render, screen, fireEvent } from '@testing-library/react'
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

vi.mock('primereact/overlaypanel', () => ({
  OverlayPanel: ({ children }: any) => <div data-testid="overlay-panel">{children}</div>,
}))

vi.mock('@/assets/icons/logout.svg?react', () => ({
  default: () => <svg data-testid="logout-icon" />,
}))

vi.mock('@/assets/icons/configuration.svg?react', () => ({
  default: () => <svg data-testid="settings-icon" />,
}))

vi.mock('@/assets/icons/copy.svg?react', () => ({
  default: () => <svg data-testid="copy-icon" />,
}))

describe('NavigationProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUserStore.user = mockUser
    mockAppInfoStore.apiVersion = '1.2.3'
    ;(window as any)._env_ = { VITE_APP_VERSION: '1.0.0' }
  })

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

  it('renders overlay panel', () => {
    render(<NavigationProfile isExpanded={false} />)
    expect(screen.getByTestId('overlay-panel')).toBeInTheDocument()
  })

  it('displays user information in panel', () => {
    render(<NavigationProfile isExpanded={false} />)
    expect(screen.getByText(mockUser.name)).toBeInTheDocument()
    expect(screen.getByText(`ID: ${mockUser.userId}`)).toBeInTheDocument()
  })

  it('displays version information', () => {
    render(<NavigationProfile isExpanded={false} />)
    expect(screen.getByText('UI Version: 1.0.0')).toBeInTheDocument()
    expect(screen.getByText('API Version: 1.2.3')).toBeInTheDocument()
  })

  it('falls back to APP_VERSION when window._env_ is not available', () => {
    delete (window as any)._env_
    render(<NavigationProfile isExpanded={false} />)
    expect(screen.getByText('UI Version: 0.4.6')).toBeInTheDocument()
  })

  it('renders action buttons with icons', () => {
    render(<NavigationProfile isExpanded={false} />)
    expect(screen.getByRole('button', { name: /Settings/i })).toBeInTheDocument()
    expect(screen.getByTestId('settings-icon')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Log out/i })).toBeInTheDocument()
    expect(screen.getByTestId('logout-icon')).toBeInTheDocument()
  })

  it('renders copy buttons for username and user ID', () => {
    render(<NavigationProfile isExpanded={false} />)
    const copyButtons = screen.getAllByTitle(/Copy/i)
    expect(copyButtons).toHaveLength(2)
    expect(screen.getByTitle('Copy username')).toBeInTheDocument()
    expect(screen.getByTitle('Copy user ID')).toBeInTheDocument()
  })

  it('calls copyToClipboard with username when copy username button is clicked', () => {
    render(<NavigationProfile isExpanded={false} />)
    const copyButton = screen.getByTitle('Copy username')
    fireEvent.click(copyButton)
    expect(mockCopyToClipboard).toHaveBeenCalledWith(mockUser.name, 'Username copied to clipboard')
  })

  it('calls copyToClipboard with user ID when copy user ID button is clicked', () => {
    render(<NavigationProfile isExpanded={false} />)
    const copyButton = screen.getByTitle('Copy user ID')
    fireEvent.click(copyButton)
    expect(mockCopyToClipboard).toHaveBeenCalledWith(mockUser.userId, 'User ID copied to clipboard')
  })

  it('navigates to settings when Settings button is clicked', () => {
    render(<NavigationProfile isExpanded={false} />)
    const settingsButton = screen.getByRole('button', { name: /Settings/i })
    fireEvent.click(settingsButton)
    expect(mockRouter.push).toHaveBeenCalledWith({ name: 'settings' })
  })

  it('calls logout when Log out button is clicked', () => {
    render(<NavigationProfile isExpanded={false} />)
    const logoutButton = screen.getByRole('button', { name: /Log out/i })
    fireEvent.click(logoutButton)
    expect(mockAuthStore.logout).toHaveBeenCalledTimes(1)
  })
})
