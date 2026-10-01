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
import { describe, it, expect, vi, beforeEach } from 'vitest'

import App from '../App'

vi.hoisted(() => vi.resetModules())

const { mockUserStore, mockAppInfoStore } = vi.hoisted(() => {
  return {
    mockUserStore: {
      user: null as { id: string } | null,
    },
    mockAppInfoStore: {
      isConfigFetched: false,
    },
  }
})

vi.mock('valtio', () => ({
  proxy: (obj: any) => obj,
  useSnapshot: vi.fn((store) => store),
  subscribe: vi.fn(),
}))

vi.mock('@/store/user', () => ({
  userStore: mockUserStore,
}))

vi.mock('@/store/appInfo', () => ({
  appInfoStore: mockAppInfoStore,
}))

vi.mock('@/store/floatingKata', () => ({
  floatingKataStore: { loadFromLocalStorage: vi.fn() },
}))

vi.mock('@/hooks/appLevel/useHistoryStack', () => ({
  useHistoryStack: vi.fn(),
}))

vi.mock('@/hooks/appLevel/usePrismThemeToggle', () => ({
  default: vi.fn(),
}))

vi.mock('@/hooks/appLevel/useInitialDataFetch', () => ({
  default: vi.fn(),
}))

vi.mock('@/hooks/appLevel/usePageTitle', () => ({
  usePageTitle: vi.fn(),
}))

vi.mock('@/hooks/useTheme', () => ({
  useTheme: vi.fn(() => ({ appearance: {}, isDark: false })),
}))

vi.mock('@/hooks/useUnsavedChangesWarning', () => ({
  UnsavedChangesProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@/components/Onboarding', () => ({
  OnboardingProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@/components/appLevel/AutoPopupManager', () => ({ default: () => null }))
vi.mock('@/components/appLevel/Banner', () => ({ default: () => null }))
vi.mock('@/components/appLevel/Gradient', () => ({ default: () => null }))
vi.mock('@/components/appLevel/SessionExpiredPopup', () => ({ default: () => null }))
vi.mock('@/components/appLevel/ToastContainer', () => ({ default: () => null }))
vi.mock('@/components/appLevel/UnsavedChangesPopup', () => ({ UnsavedChangesPopup: () => null }))
vi.mock('@/components/FloatingKataWindow', () => ({ default: () => null }))
vi.mock('@/components/HelpLauncher', () => ({ HelpPanel: () => null }))
vi.mock('@/components/Navigation/Navigation', () => ({ default: () => null }))
vi.mock('@/components/Spinner', () => ({ default: () => <div data-testid="spinner" /> }))

vi.mock('primereact/api', () => ({
  PrimeReactProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('react-router', () => ({
  Outlet: () => <div data-testid="outlet" />,
}))

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUserStore.user = null
    mockAppInfoStore.isConfigFetched = false
  })

  it('does not render the skip link while the app is loading (no user, config not fetched)', () => {
    render(<App />)

    expect(screen.queryByRole('link', { name: 'Skip to main content' })).not.toBeInTheDocument()
  })

  it('does not render the skip link when the user is authenticated but config is not fetched yet', () => {
    mockUserStore.user = { id: 'u1' }
    mockAppInfoStore.isConfigFetched = false

    render(<App />)

    expect(screen.queryByRole('link', { name: 'Skip to main content' })).not.toBeInTheDocument()
  })

  it('renders the skip link once the user is authenticated and config is fetched', () => {
    mockUserStore.user = { id: 'u1' }
    mockAppInfoStore.isConfigFetched = true

    render(<App />)

    expect(screen.getByRole('link', { name: 'Skip to main content' })).toBeInTheDocument()
  })
})
