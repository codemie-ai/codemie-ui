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
import { BrowserRouter } from 'react-router'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import AutoPopupManager from '../AutoPopupManager'

vi.hoisted(() => vi.resetModules())

const { mockUserStore, mockAppInfoStore, mockOnboardingStore, mockProfileSettingsStore, mockUser } =
  vi.hoisted(() => {
    const mockUser = { userId: 'user-123', name: 'Jane Doe' } as any

    return {
      mockUser,
      mockUserStore: {
        user: mockUser,
        isSSOUser: vi.fn(() => false),
      },
      mockAppInfoStore: {
        appReleases: [{ version: '2.41.0' }],
        isOnboardingCompleted: vi.fn(() => true),
        loadReleaseNotes: vi.fn(),
        isAppReleaseNew: vi.fn(() => true),
        setViewedAppVersion: vi.fn(),
      },
      mockOnboardingStore: {
        isActive: false,
        startFlow: vi.fn(),
        getFlowsForRelease: vi.fn(() => []),
        getFlowsForFirstTimePageVisit: vi.fn(() => []),
        isFirstPageVisit: vi.fn(() => false),
        markPageVisited: vi.fn(),
      },
      mockProfileSettingsStore: {
        profileSettings: null as any,
        error: null as string | null,
      },
    }
  })

vi.mock('valtio', () => ({
  proxy: (obj: any) => obj,
  useSnapshot: vi.fn((store) => {
    if (store === mockUserStore) return mockUserStore
    if (store === mockAppInfoStore) return mockAppInfoStore
    if (store === mockOnboardingStore) return mockOnboardingStore
    if (store === mockProfileSettingsStore) return mockProfileSettingsStore
    return store
  }),
  subscribe: vi.fn(),
}))

vi.mock('@/store/user', () => ({
  userStore: mockUserStore,
}))

vi.mock('@/store/appInfo', () => ({
  appInfoStore: mockAppInfoStore,
}))

vi.mock('@/store/onboarding', () => ({
  onboardingStore: mockOnboardingStore,
}))

vi.mock('@/store/userProfileSettings', () => ({
  profileSettingsStore: mockProfileSettingsStore,
}))

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: vi.fn(() => ({
    push: vi.fn(),
    resolve: vi.fn(() => ({ href: '#' })),
  })),
}))

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useMatches: vi.fn(() => []),
  }
})

// Isolates the test from PrimeReact Dialog/portal internals — mirrors how
// NavigationProfile.test.tsx mocks OverlayPanel. Renders a real dialog role
// with an accessible name so assertions match what Playwright queries in the
// real app (get_by_role("dialog", name="New CodeMie Release")).
vi.mock('@/components/Popup', () => ({
  default: ({ visible, header, children }: any) =>
    visible ? (
      <div // NOSONAR: mocks PrimeReact's real Dialog output (div role, not native <dialog>) to match Playwright's real-app query
        role="dialog"
        aria-label={header}
      >
        {children}
      </div>
    ) : null,
}))

const renderWithRouter = () =>
  render(
    <BrowserRouter>
      <AutoPopupManager />
    </BrowserRouter>
  )

describe('AutoPopupManager — release popup vs. profile-settings fetch race', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUserStore.user = mockUser
    mockUserStore.isSSOUser = vi.fn(() => false)
    mockAppInfoStore.isOnboardingCompleted = vi.fn(() => true)
    mockAppInfoStore.isAppReleaseNew = vi.fn(() => true)
    mockOnboardingStore.isActive = false
    mockOnboardingStore.getFlowsForRelease = vi.fn(() => [])
    mockProfileSettingsStore.profileSettings = null
    mockProfileSettingsStore.error = null
  })

  it('does not show the release popup while the profile-settings fetch is still pending', () => {
    mockProfileSettingsStore.profileSettings = null
    mockProfileSettingsStore.error = null

    renderWithRouter()

    expect(screen.queryByRole('dialog', { name: 'New CodeMie Release' })).not.toBeInTheDocument()
  })

  it('shows the release popup once the profile-settings fetch resolves successfully', () => {
    mockProfileSettingsStore.profileSettings = {
      user_id: 'user-123',
      theme: 'system',
      onboarding: { completed: true, completed_flows: [], visited_pages: [] },
      recent_assistant_ids: [],
      last_viewed_release_version: '2.40.0',
    }
    mockProfileSettingsStore.error = null

    renderWithRouter()

    expect(screen.getByRole('dialog', { name: 'New CodeMie Release' })).toBeInTheDocument()
  })

  it('shows the release popup once the profile-settings fetch fails, instead of hanging forever', () => {
    mockProfileSettingsStore.profileSettings = null
    mockProfileSettingsStore.error = 'Failed to load profile settings'

    renderWithRouter()

    expect(screen.getByRole('dialog', { name: 'New CodeMie Release' })).toBeInTheDocument()
  })
})
