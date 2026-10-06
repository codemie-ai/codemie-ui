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
import { BrowserRouter } from 'react-router'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { mockMobileLayout } from '@/test-utils/mobileLayout'

import Navigation from '../Navigation'

vi.hoisted(() => vi.resetModules())

const {
  mockAppInfoStore,
  mockApplicationsStore,
  mockAssistantsStore,
  mockChatsStore,
  mockRouter,
  mockUseTheme,
} = vi.hoisted(() => {
  return {
    mockAppInfoStore: {
      navigationExpanded: false,
      toggleNavigationExpanded: vi.fn(),
      configs: [] as any[],
      isConfigFetched: true,
      mobileNavigationOpen: false,
      setMobileNavigationOpen: vi.fn(),
    },
    mockApplicationsStore: {
      applications: [],
    },
    mockAssistantsStore: {
      helpAssistants: [],
      helpAssistantsFetched: true,
      pinnedAssistants: [],
      fetchPinnedAssistants: vi.fn().mockResolvedValue(undefined),
    },
    mockChatsStore: {
      startNewChat: vi.fn().mockResolvedValue(undefined),
    },
    mockRouter: {
      push: vi.fn(),
      resolve: vi.fn(),
    },
    mockUseTheme: {
      isDark: true,
      theme: 'codemieDark',
      setTheme: vi.fn(),
    },
  }
})

vi.mock('valtio', () => ({
  proxy: (obj: any) => obj,
  useSnapshot: vi.fn((store) => {
    if (store === mockAppInfoStore) return mockAppInfoStore
    if (store === mockApplicationsStore) return mockApplicationsStore
    if (store === mockAssistantsStore) return mockAssistantsStore
    return store
  }),
  subscribe: vi.fn(),
}))

vi.mock('@/store/appInfo', () => ({
  appInfoStore: mockAppInfoStore,
}))

vi.mock('@/store/applications', () => ({
  applicationsStore: mockApplicationsStore,
}))

vi.mock('@/store/assistants', () => ({
  assistantsStore: mockAssistantsStore,
}))

vi.mock('@/store/chats', () => ({
  chatsStore: mockChatsStore,
}))

vi.mock('@/hooks/useTheme', () => ({
  useTheme: vi.fn(() => mockUseTheme),
}))

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: vi.fn(() => mockRouter),
}))

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useMatch: vi.fn(() => null),
    useMatches: vi.fn(() => []),
  }
})

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

describe('Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAppInfoStore.navigationExpanded = false
    mockAppInfoStore.configs = []
    mockApplicationsStore.applications = []
    mockRouter.resolve.mockImplementation(({ path, name }: any) => {
      const routes: Record<string, string> = {
        '/chats': '/chats',
        assistants: '/assistants',
        skills: '/skills',
        workflows: '/workflows',
        applications: '/applications',
        integrations: '/integrations',
        'data-sources': '/data-sources',
        schedulers: '/schedulers',
        katas: '/katas',
        analytics: '/analytics',
        help: '/help',
        'terms-and-conditions': '/terms-and-conditions',
      }
      return { fullPath: routes[path ?? name] ?? '/' }
    })
  })

  it('renders without crashing', () => {
    const { container } = renderWithRouter(<Navigation />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders as header element', () => {
    const { container } = renderWithRouter(<Navigation />)
    expect(container.firstChild?.nodeName).toBe('HEADER')
  })

  it('applies correct width based on expansion state', () => {
    mockAppInfoStore.navigationExpanded = false
    const { container, rerender } = renderWithRouter(<Navigation />)

    expect(container.firstChild).toHaveClass('w-navbar')

    mockAppInfoStore.navigationExpanded = true
    rerender(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    )
    expect(container.firstChild).toHaveClass('w-navbar-expanded')
  })

  it('applies theme-based styles', () => {
    mockUseTheme.isDark = true
    const { container, rerender } = renderWithRouter(<Navigation />)

    expect(container.firstChild).toHaveClass('bg-gradient-to-b')

    mockUseTheme.isDark = false
    rerender(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    )
    expect(container.firstChild).toHaveClass('border-r')
  })

  it('renders navigation sections', () => {
    const { container } = renderWithRouter(<Navigation />)
    const sections = container.querySelectorAll('.flex.flex-col')

    expect(sections.length).toBeGreaterThan(0)
  })

  it('renders with applications when available', () => {
    mockApplicationsStore.applications = [{ id: '1', name: 'Test App' }] as any
    const { container } = renderWithRouter(<Navigation />)

    expect(container.firstChild).toBeInTheDocument()
  })

  it('has proper structure with header and sections', () => {
    const { container } = renderWithRouter(<Navigation />)
    const header = container.querySelector('header')

    expect(header).toBeInTheDocument()
    expect(header?.classList.contains('w-navbar')).toBe(true)
  })

  it('does not render Terms and Conditions in the sidebar', () => {
    renderWithRouter(<Navigation />)

    expect(screen.queryByRole('link', { name: 'Terms and Conditions' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Help' })).toBeInTheDocument()
  })

  it('hides Schedulers nav when feature flag is absent', () => {
    mockAppInfoStore.configs = []
    renderWithRouter(<Navigation />)

    expect(screen.queryByRole('link', { name: 'Schedulers' })).not.toBeInTheDocument()
  })

  it('hides Schedulers nav when feature flag settings.enabled is false', () => {
    mockAppInfoStore.configs = [
      { id: 'features:schedulersView', settings: { enabled: false } },
    ] as any
    renderWithRouter(<Navigation />)

    expect(screen.queryByRole('link', { name: 'Schedulers' })).not.toBeInTheDocument()
  })

  it('shows Schedulers nav when feature flag settings.enabled is true', () => {
    mockAppInfoStore.configs = [
      { id: 'features:schedulersView', settings: { enabled: true } },
    ] as any
    renderWithRouter(<Navigation />)

    expect(screen.getByRole('link', { name: /Schedulers/ })).toBeInTheDocument()
  })

  it('shows a NEW badge on Schedulers when the flag is on', () => {
    mockAppInfoStore.configs = [
      { id: 'features:schedulersView', settings: { enabled: true } },
    ] as any
    renderWithRouter(<Navigation />)

    expect(screen.getByText('Schedulers').closest('a')).toHaveTextContent('NEW')
  })

  it('does not show a NEW badge on Skills when the flag is on', () => {
    mockAppInfoStore.configs = [{ id: 'skills', settings: { enabled: true } }] as any
    renderWithRouter(<Navigation />)
    expect(screen.getByText('Skills').closest('a')).not.toHaveTextContent('NEW')
  })

  it('does not show a NEW badge on Analytics when enterprise edition is on', () => {
    mockAppInfoStore.configs = [
      { id: 'features:enterpriseEdition', settings: { enabled: true } },
    ] as any
    renderWithRouter(<Navigation />)
    expect(screen.getByText('Analytics').closest('a')).not.toHaveTextContent('NEW')
  })

  it('does not show a NEW badge on AI Katas', () => {
    renderWithRouter(<Navigation />)
    expect(screen.getByText('AI Katas').closest('a')).not.toHaveTextContent('NEW')
  })
})

describe('Navigation on mobile', () => {
  let restoreLayout = () => {}

  beforeEach(() => {
    vi.clearAllMocks()
    restoreLayout = mockMobileLayout().restore
    mockAppInfoStore.mobileNavigationOpen = false
    mockRouter.resolve.mockImplementation(({ path, name }: any) => ({
      fullPath: `/${(path ?? name ?? '').replace(/^\//, '')}`,
    }))
  })

  afterEach(() => {
    restoreLayout()
  })

  it('renders nothing while the menu is closed (the top bar opens it)', () => {
    const { container } = renderWithRouter(<Navigation />)

    expect(container.firstChild).toBeNull()
  })

  it('renders the full-screen, expanded menu while open', () => {
    mockAppInfoStore.mobileNavigationOpen = true
    const { container } = renderWithRouter(<Navigation />)

    const menu = container.querySelector('header#navigation-menu')
    expect(menu).toHaveClass('fixed')
    expect(menu).not.toHaveClass('w-navbar')
    expect(screen.getByRole('link', { name: 'Help' })).toBeInTheDocument()
  })

  it('closes the menu on Escape', () => {
    mockAppInfoStore.mobileNavigationOpen = true
    renderWithRouter(<Navigation />)

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(mockAppInfoStore.setMobileNavigationOpen).toHaveBeenCalledWith(false)
  })
  it('leaves Escape to a dialog opened from the menu', () => {
    mockAppInfoStore.mobileNavigationOpen = true
    render(
      <BrowserRouter>
        <Navigation />
        <dialog open>
          <button type="button">Profile action</button>
        </dialog>
      </BrowserRouter>
    )
    screen.getByRole('button', { name: 'Profile action' }).focus()

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(mockAppInfoStore.setMobileNavigationOpen).not.toHaveBeenCalled()
  })

  it('hides Data Sources nav link when no retrieval flag is enabled', () => {
    mockAppInfoStore.mobileNavigationOpen = true
    mockAppInfoStore.configs = []
    renderWithRouter(<Navigation />)
    expect(screen.queryByRole('link', { name: 'Data Sources' })).not.toBeInTheDocument()
  })

  it('shows Data Sources nav link when one retrieval flag is enabled', () => {
    mockAppInfoStore.mobileNavigationOpen = true
    mockAppInfoStore.configs = [{ id: 'features:codeIndexing', settings: { enabled: true } }]
    renderWithRouter(<Navigation />)
    expect(screen.getByRole('link', { name: 'Data Sources' })).toBeInTheDocument()
  })
})
