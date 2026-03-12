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
import NavigationSection from '../NavigationSection'

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

vi.hoisted(() => vi.resetModules())

const { mockAppInfoStore } = vi.hoisted(() => {
  return {
    mockAppInfoStore: {
      navigationExpanded: false,
    },
  }
})

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useMatch: vi.fn(() => null),
    useMatches: vi.fn(() => []),
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

describe('NavigationSection', () => {
  const mockItems = [
    { label: 'Chat', icon: IconType.CHAT, route: '/chat' },
    { label: 'Assistants', icon: IconType.ASSISTANT, route: '/assistants' },
    { label: 'Workflows', icon: IconType.WORKFLOW, route: '/workflows' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockAppInfoStore.navigationExpanded = false
  })

  describe('basic rendering', () => {
    it('renders without crashing', () => {
      const { container } = renderWithRouter(<NavigationSection items={mockItems} />)
      expect(container.firstChild).toBeInTheDocument()
    })

    it('renders as nav element', () => {
      const { container } = renderWithRouter(<NavigationSection items={mockItems} />)
      expect(container.firstChild?.nodeName).toBe('NAV')
    })

    it('renders all navigation items', () => {
      renderWithRouter(<NavigationSection items={mockItems} />)
      expect(screen.getByTestId('chat-icon')).toBeInTheDocument()
      expect(screen.getByTestId('assistant-icon')).toBeInTheDocument()
      expect(screen.getByTestId('workflow-icon')).toBeInTheDocument()
    })
  })

  describe('items rendering', () => {
    it('renders labels when navigation is expanded', () => {
      mockAppInfoStore.navigationExpanded = true
      renderWithRouter(<NavigationSection items={mockItems} />)
      expect(screen.getByText('Chat')).toBeInTheDocument()
      expect(screen.getByText('Assistants')).toBeInTheDocument()
      expect(screen.getByText('Workflows')).toBeInTheDocument()
    })

    it('renders all icon types correctly', () => {
      const allIconItems = [
        { label: 'Chat', icon: IconType.CHAT, route: '/chat' },
        { label: 'Assistants', icon: IconType.ASSISTANT, route: '/assistants' },
        { label: 'Workflows', icon: IconType.WORKFLOW, route: '/workflows' },
        { label: 'Datasources', icon: IconType.DATASOURCE, route: '/datasources' },
        { label: 'Applications', icon: IconType.APPLICATION, route: '/applications' },
        { label: 'Info', icon: IconType.INFO, route: '/info' },
        { label: 'Integrations', icon: IconType.INTEGRATION, route: '/integrations' },
      ]

      renderWithRouter(<NavigationSection items={allIconItems} />)
      expect(screen.getByTestId('chat-icon')).toBeInTheDocument()
      expect(screen.getByTestId('assistant-icon')).toBeInTheDocument()
      expect(screen.getByTestId('workflow-icon')).toBeInTheDocument()
      expect(screen.getByTestId('datasource-icon')).toBeInTheDocument()
      expect(screen.getByTestId('application-icon')).toBeInTheDocument()
      expect(screen.getByTestId('info-icon')).toBeInTheDocument()
      expect(screen.getByTestId('integration-icon')).toBeInTheDocument()
    })
  })

  describe('navigation links', () => {
    it('renders links with correct href from route prop', () => {
      renderWithRouter(<NavigationSection items={mockItems} />)
      const links = screen.getAllByRole('link')
      expect(links[0]).toHaveAttribute('href', '/chat')
      expect(links[1]).toHaveAttribute('href', '/assistants')
      expect(links[2]).toHaveAttribute('href', '/workflows')
    })

    it('renders links with correct href from url prop', () => {
      const urlItems = [{ label: 'External', icon: IconType.INFO, url: 'https://example.com' }]
      renderWithRouter(<NavigationSection items={urlItems} />)
      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', 'https://example.com')
    })

    it('prefers route over url when both are provided', () => {
      const mixedItems = [
        { label: 'Mixed', icon: IconType.CHAT, route: '/chat', url: 'https://example.com' },
      ]
      renderWithRouter(<NavigationSection items={mixedItems} />)
      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', '/chat')
    })

    it('uses root route when neither route nor url is provided', () => {
      const noRouteItems = [{ label: 'No Route', icon: IconType.INFO }]
      renderWithRouter(<NavigationSection items={noRouteItems} />)
      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', '/')
    })
  })

  describe('tooltip behavior', () => {
    it('adds tooltip attributes when navigation is collapsed', () => {
      mockAppInfoStore.navigationExpanded = false
      renderWithRouter(<NavigationSection items={mockItems} />)
      const links = screen.getAllByRole('link')
      expect(links[0]).toHaveAttribute('data-tooltip-id', 'react-tooltip')
      expect(links[0]).toHaveAttribute('data-tooltip-content', 'Chat')
      expect(links[0]).toHaveAttribute('data-tooltip-place', 'right')
    })

    it('does not add tooltip attributes when navigation is expanded', () => {
      mockAppInfoStore.navigationExpanded = true
      renderWithRouter(<NavigationSection items={mockItems} />)
      const links = screen.getAllByRole('link')
      expect(links[0]).not.toHaveAttribute('data-tooltip-id')
      expect(links[0]).not.toHaveAttribute('data-tooltip-content')
    })
  })

  describe('bottom section styling', () => {
    it('passes isBottomSection prop to navigation links', () => {
      renderWithRouter(<NavigationSection items={mockItems} isBottomSection />)
      const links = screen.getAllByRole('link')
      expect(links.length).toBe(3)
    })

    it('renders correctly without isBottomSection prop', () => {
      renderWithRouter(<NavigationSection items={mockItems} />)
      const links = screen.getAllByRole('link')
      expect(links.length).toBe(3)
    })
  })

  describe('edge cases', () => {
    it('handles empty items array', () => {
      const { container } = renderWithRouter(<NavigationSection items={[]} />)
      expect(container.firstChild).toBeInTheDocument()
      expect(screen.queryByRole('link')).not.toBeInTheDocument()
    })

    it('handles single item', () => {
      const singleItem = [{ label: 'Single', icon: IconType.CHAT, route: '/single' }]
      renderWithRouter(<NavigationSection items={singleItem} />)
      expect(screen.getAllByRole('link')).toHaveLength(1)
    })

    it('applies custom className', () => {
      const { container } = renderWithRouter(
        <NavigationSection items={mockItems} className="custom-class" />
      )
      expect(container.firstChild).toHaveClass('custom-class')
    })
  })
})
