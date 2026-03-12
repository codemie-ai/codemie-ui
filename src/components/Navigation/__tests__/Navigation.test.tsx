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

import { render } from '@testing-library/react'
import { BrowserRouter } from 'react-router'
import { describe, it, expect, vi, beforeEach } from 'vitest'

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
      configs: [],
      isConfigFetched: true,
    },
    mockApplicationsStore: {
      applications: [],
    },
    mockAssistantsStore: {
      helpAssistants: [],
    },
    mockChatsStore: {
      createChat: vi.fn(),
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
        katas: '/katas',
        analytics: '/analytics',
        help: '/help',
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
})
