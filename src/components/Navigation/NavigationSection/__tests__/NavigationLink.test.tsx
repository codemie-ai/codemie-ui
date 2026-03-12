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

import { IconType } from '../../constants'
import NavigationLink from '../NavigationLink'

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

vi.hoisted(() => vi.resetModules())

const { mockAppInfoStore, mockUseMatch, mockUseMatches } = vi.hoisted(() => {
  return {
    mockAppInfoStore: {
      navigationExpanded: false,
    },
    mockUseMatch: vi.fn(() => null),
    mockUseMatches: vi.fn(() => []),
  }
})

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useMatch: mockUseMatch,
    useMatches: mockUseMatches,
  }
})

vi.mock('valtio', () => ({
  proxy: (obj: any) => obj,
  useSnapshot: vi.fn((store) => {
    if (store === mockAppInfoStore) return mockAppInfoStore
    return store
  }),
  subscribe: vi.fn(),
}))

vi.mock('@/store/appInfo', () => ({
  appInfoStore: mockAppInfoStore,
}))

vi.mock('@/assets/icons/chat-new.svg?react', () => ({
  default: () => <svg data-testid="chat-icon" />,
}))

vi.mock('@/assets/icons/assistant.svg?react', () => ({
  default: () => <svg data-testid="assistant-icon" />,
}))

vi.mock('@/assets/icons/workflow.svg?react', () => ({
  default: () => <svg data-testid="workflow-icon" />,
}))

vi.mock('@/assets/icons/datasource.svg?react', () => ({
  default: () => <svg data-testid="datasource-icon" />,
}))

vi.mock('@/assets/icons/applications.svg?react', () => ({
  default: () => <svg data-testid="application-icon" />,
}))

vi.mock('@/assets/icons/info-menu.svg?react', () => ({
  default: () => <svg data-testid="info-icon" />,
}))

vi.mock('@/assets/icons/integration.svg?react', () => ({
  default: () => <svg data-testid="integration-icon" />,
}))

describe('NavigationLink', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAppInfoStore.navigationExpanded = false
    mockUseMatch.mockReturnValue(null)
    mockUseMatches.mockReturnValue([])
  })

  describe('basic rendering', () => {
    it('renders without crashing', () => {
      const item = { label: 'Chat', icon: IconType.CHAT, route: '/chat' }
      const { container } = renderWithRouter(<NavigationLink item={item} />)
      expect(container.firstChild).toBeInTheDocument()
    })

    it('renders as a link element', () => {
      const item = { label: 'Chat', icon: IconType.CHAT, route: '/chat' }
      renderWithRouter(<NavigationLink item={item} />)
      expect(screen.getByRole('link')).toBeInTheDocument()
    })

    it('renders icon when provided', () => {
      const item = { label: 'Chat', icon: IconType.CHAT, route: '/chat' }
      renderWithRouter(<NavigationLink item={item} />)
      expect(screen.getByTestId('chat-icon')).toBeInTheDocument()
    })
  })

  describe('icon rendering', () => {
    it('renders chat icon', () => {
      const item = { label: 'Chat', icon: IconType.CHAT, route: '/chat' }
      renderWithRouter(<NavigationLink item={item} />)
      expect(screen.getByTestId('chat-icon')).toBeInTheDocument()
    })

    it('renders assistant icon', () => {
      const item = { label: 'Assistants', icon: IconType.ASSISTANT, route: '/assistants' }
      renderWithRouter(<NavigationLink item={item} />)
      expect(screen.getByTestId('assistant-icon')).toBeInTheDocument()
    })

    it('renders workflow icon', () => {
      const item = { label: 'Workflows', icon: IconType.WORKFLOW, route: '/workflows' }
      renderWithRouter(<NavigationLink item={item} />)
      expect(screen.getByTestId('workflow-icon')).toBeInTheDocument()
    })

    it('renders datasource icon', () => {
      const item = { label: 'Datasources', icon: IconType.DATASOURCE, route: '/datasources' }
      renderWithRouter(<NavigationLink item={item} />)
      expect(screen.getByTestId('datasource-icon')).toBeInTheDocument()
    })

    it('renders application icon', () => {
      const item = { label: 'Applications', icon: IconType.APPLICATION, route: '/applications' }
      renderWithRouter(<NavigationLink item={item} />)
      expect(screen.getByTestId('application-icon')).toBeInTheDocument()
    })

    it('renders info icon', () => {
      const item = { label: 'Info', icon: IconType.INFO, route: '/info' }
      renderWithRouter(<NavigationLink item={item} />)
      expect(screen.getByTestId('info-icon')).toBeInTheDocument()
    })

    it('renders integration icon', () => {
      const item = { label: 'Integrations', icon: IconType.INTEGRATION, route: '/integrations' }
      renderWithRouter(<NavigationLink item={item} />)
      expect(screen.getByTestId('integration-icon')).toBeInTheDocument()
    })
  })

  describe('label display', () => {
    it('renders label when navigation is expanded', () => {
      mockAppInfoStore.navigationExpanded = true
      const item = { label: 'Chat', icon: IconType.CHAT, route: '/chat' }
      renderWithRouter(<NavigationLink item={item} />)
      expect(screen.getByText('Chat')).toBeInTheDocument()
    })
  })

  describe('link href', () => {
    it('uses route prop for href', () => {
      const item = { label: 'Chat', icon: IconType.CHAT, route: '/chat' }
      renderWithRouter(<NavigationLink item={item} />)
      expect(screen.getByRole('link')).toHaveAttribute('href', '/chat')
    })

    it('uses url prop for href when route is not provided', () => {
      const item = { label: 'External', icon: IconType.INFO, url: 'https://example.com' }
      renderWithRouter(<NavigationLink item={item} />)
      expect(screen.getByRole('link')).toHaveAttribute('href', 'https://example.com')
    })

    it('prefers route over url when both are provided', () => {
      const item = {
        label: 'Mixed',
        icon: IconType.CHAT,
        route: '/chat',
        url: 'https://example.com',
      }
      renderWithRouter(<NavigationLink item={item} />)
      expect(screen.getByRole('link')).toHaveAttribute('href', '/chat')
    })

    it('uses root path when neither route nor url is provided', () => {
      const item = { label: 'No Route', icon: IconType.INFO }
      renderWithRouter(<NavigationLink item={item} />)
      expect(screen.getByRole('link')).toHaveAttribute('href', '/')
    })
  })

  describe('tooltip attributes', () => {
    it('adds tooltip attributes when navigation is collapsed', () => {
      mockAppInfoStore.navigationExpanded = false
      const item = { label: 'Chat', icon: IconType.CHAT, route: '/chat' }
      renderWithRouter(<NavigationLink item={item} />)
      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('data-tooltip-id', 'react-tooltip')
      expect(link).toHaveAttribute('data-tooltip-content', 'Chat')
      expect(link).toHaveAttribute('data-tooltip-place', 'right')
    })

    it('does not add tooltip attributes when navigation is expanded', () => {
      mockAppInfoStore.navigationExpanded = true
      const item = { label: 'Chat', icon: IconType.CHAT, route: '/chat' }
      renderWithRouter(<NavigationLink item={item} />)
      const link = screen.getByRole('link')
      expect(link).not.toHaveAttribute('data-tooltip-id')
      expect(link).not.toHaveAttribute('data-tooltip-content')
    })

    it('updates tooltip attributes when navigation collapses', () => {
      mockAppInfoStore.navigationExpanded = true
      const item = { label: 'Chat', icon: IconType.CHAT, route: '/chat' }
      const { rerender } = renderWithRouter(<NavigationLink item={item} />)
      let link = screen.getByRole('link')
      expect(link).not.toHaveAttribute('data-tooltip-id')

      mockAppInfoStore.navigationExpanded = false
      rerender(
        <BrowserRouter>
          <NavigationLink item={item} />
        </BrowserRouter>
      )
      link = screen.getByRole('link')
      expect(link).toHaveAttribute('data-tooltip-id', 'react-tooltip')
      expect(link).toHaveAttribute('data-tooltip-content', 'Chat')
    })
  })

  describe('active route styling', () => {
    it('does not apply active styles when route does not match', () => {
      mockUseMatch.mockReturnValue(null)
      mockUseMatches.mockReturnValue([])
      const item = { label: 'Chat', icon: IconType.CHAT, route: '/chat' }
      renderWithRouter(<NavigationLink item={item} />)
      const link = screen.getByRole('link')
      expect(link).not.toHaveClass('bg-surface-interactive-hover')
      expect(link).not.toHaveClass('text-text-accent')
    })

    it('applies active styles when route matches', () => {
      mockUseMatch.mockReturnValue({
        params: {},
        pathname: '/chat',
        pathnameBase: '/chat',
        pattern: { path: '/chat/*' },
      } as any)
      mockUseMatches.mockReturnValue([
        { id: 'chat', pathname: '/chat', params: {}, data: null, handle: null },
      ] as any)
      const item = { label: 'Chat', icon: IconType.CHAT, route: '/chat' }
      renderWithRouter(<NavigationLink item={item} />)
      const link = screen.getByRole('link')
      expect(link).toHaveClass('bg-surface-interactive-hover')
      expect(link).toHaveClass('text-text-accent')
    })

    it('does not apply active styles when on start-assistant-chat route', () => {
      mockUseMatch.mockReturnValue({
        params: {},
        pathname: '/assistants/start',
        pathnameBase: '/assistants',
        pattern: { path: '/assistants/*' },
      } as any)
      mockUseMatches.mockReturnValue([
        { id: 'assistants', pathname: '/assistants', params: {}, data: null, handle: null },
        {
          id: 'start-assistant-chat',
          pathname: '/assistants/start',
          params: {},
          data: null,
          handle: null,
        },
      ] as any)
      const item = { label: 'Assistants', icon: IconType.ASSISTANT, route: '/assistants' }
      renderWithRouter(<NavigationLink item={item} />)
      const link = screen.getByRole('link')
      expect(link).not.toHaveClass('bg-surface-interactive-hover')
      expect(link).not.toHaveClass('text-text-accent')
    })
  })

  describe('bottom section styling', () => {
    it('renders without isBottomSection prop', () => {
      const item = { label: 'Chat', icon: IconType.CHAT, route: '/chat' }
      renderWithRouter(<NavigationLink item={item} />)
      expect(screen.getByRole('link')).toBeInTheDocument()
    })

    it('renders with isBottomSection prop', () => {
      const item = { label: 'Info', icon: IconType.INFO, route: '/info' }
      renderWithRouter(<NavigationLink item={item} isBottomSection />)
      expect(screen.getByRole('link')).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('handles item without icon', () => {
      const item = { label: 'No Icon', route: '/no-icon' } as any
      renderWithRouter(<NavigationLink item={item} />)
      expect(screen.getByRole('link')).toBeInTheDocument()
      expect(screen.queryByRole('img')).not.toBeInTheDocument()
    })

    it('handles long labels when navigation is expanded', () => {
      mockAppInfoStore.navigationExpanded = true
      const item = {
        label: 'Very Long Navigation Item Label That Might Overflow',
        icon: IconType.CHAT,
        route: '/long',
      }
      renderWithRouter(<NavigationLink item={item} />)
      expect(
        screen.getByText('Very Long Navigation Item Label That Might Overflow')
      ).toBeInTheDocument()
    })

    it('handles special characters in labels', () => {
      mockAppInfoStore.navigationExpanded = true
      const item = {
        label: 'Special & Characters <> "Quotes"',
        icon: IconType.CHAT,
        route: '/special',
      }
      renderWithRouter(<NavigationLink item={item} />)
      expect(screen.getByText('Special & Characters <> "Quotes"')).toBeInTheDocument()
    })
  })

  describe('interaction', () => {
    it('renders clickable link', () => {
      const item = { label: 'Chat', icon: IconType.CHAT, route: '/chat' }
      renderWithRouter(<NavigationLink item={item} />)
      const link = screen.getByRole('link')
      expect(link).toBeInTheDocument()
      expect(link.tagName).toBe('A')
    })
  })
})
