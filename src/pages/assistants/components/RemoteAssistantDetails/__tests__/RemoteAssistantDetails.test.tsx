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
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'

import { Assistant } from '@/types/entity/assistant'

import RemoteAssistantDetails from '../RemoteAssistantDetails'

vi.hoisted(() => vi.resetModules())

beforeAll(() => {
  const originalError = console.error
  vi.spyOn(console, 'error').mockImplementation((...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Could not parse CSS stylesheet') ||
        args[0].includes('Error: Could not parse CSS'))
    ) {
      return
    }
    originalError.call(console, ...args)
  })
})

vi.mock('@/components/details/DetailsSidebar', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="details-sidebar">{children}</div>
  ),
}))

vi.mock('@/components/details/DetailsSidebar/components/DetailsSidebarSection', () => ({
  __esModule: true,
  default: ({ headline, children }: { headline: string; children: React.ReactNode }) => (
    <div data-testid="sidebar-section">
      <h3>{headline}</h3>
      {children}
    </div>
  ),
}))

vi.mock('@/components/details/DetailsProperty', () => ({
  __esModule: true,
  default: ({ label, value }: { label: string; value: string }) => (
    <div data-testid="details-property">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  ),
}))

vi.mock('@/components/details/DetailsCopyField', () => ({
  __esModule: true,
  default: ({ label, value }: { label: string; value?: string }) => (
    <div data-testid="details-copy-field">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  ),
}))

vi.mock('../../AssistantDetails/components/AssistantDetailsProfile', () => ({
  __esModule: true,
  default: ({ assistant }: { assistant: Assistant }) => (
    <div data-testid="assistant-details-profile">{assistant.name}</div>
  ),
}))

vi.mock('../../AssistantDetails/components/AssistantDetailsActions', () => ({
  __esModule: true,
  default: () => <div data-testid="assistant-details-actions">Actions</div>,
}))

vi.mock('../components/DetailsItem', () => ({
  __esModule: true,
  default: ({
    icon,
    title,
    description,
  }: {
    icon: React.ReactNode
    title: string
    description: string
  }) => (
    <div data-testid="details-item">
      <div data-testid="details-item-icon">{icon}</div>
      <span data-testid="details-item-title">{title}</span>
      <span data-testid="details-item-description">{description}</span>
    </div>
  ),
}))

vi.mock('../components/DetailsAccordion', () => ({
  __esModule: true,
  default: () => <div data-testid="details-accordion">Skills Accordion</div>,
}))

vi.mock('../components/DetailsTag', () => ({
  __esModule: true,
  default: ({ value }: { value: string }) => <span data-testid="details-tag">{value}</span>,
}))

vi.mock('../components/DetailsSection', () => ({
  __esModule: true,
  default: ({
    headline,
    children,
    className,
  }: {
    headline: string
    children: React.ReactNode
    className?: string
  }) => (
    <div data-testid="details-section" className={className}>
      <h4>{headline}</h4>
      {children}
    </div>
  ),
}))

vi.mock('@/utils/utils', () => ({
  getSharedValue: (isGlobal: boolean, shared: boolean) => {
    if (isGlobal) return 'Global'
    if (shared) return 'Shared'
    return 'Private'
  },
}))

describe('RemoteAssistantDetails', () => {
  const mockCreateChat = vi.fn()
  const mockLoadAssistant = vi.fn()

  const baseAssistant: Assistant = {
    id: 'test-assistant-1',
    name: 'Test Remote Assistant',
    slug: 'test-remote-assistant',
    description: 'This is a test remote assistant description',
    is_global: false,
    shared: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    system_prompt: 'Test system prompt',
    llm_model_type: 'gpt-4',
    project: 'Test Project',
    mcp_servers: [],
    system_prompt_history: [],
    guardrail_assignments: [],
  } as Assistant

  const mockAssistantWithAgentCard: Assistant = {
    ...baseAssistant,
    agent_card: {
      name: 'Test Agent Card',
      description: 'Agent card description',
      url: 'https://example.com/agent',
      version: '1.0.0',
      documentationUrl: 'https://example.com/docs',
      provider: {
        organization: 'Test Organization',
        url: 'https://example.com/provider',
      },
      capabilities: {
        streaming: true,
        pushNotifications: false,
        stateTransitionHistory: true,
      },
      defaultInputModes: ['text', 'json'],
      defaultOutputModes: ['text', 'html'],
      skills: [
        {
          id: 'skill-1',
          name: 'Test Skill',
          description: 'Test skill description',
          examples: ['Example 1'],
          tags: ['tag1'],
        },
      ],
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders the component with basic assistant data', () => {
      render(
        <RemoteAssistantDetails
          assistant={baseAssistant}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      expect(screen.getByTestId('assistant-details-profile')).toBeInTheDocument()
      expect(screen.getByTestId('assistant-details-actions')).toBeInTheDocument()
      expect(screen.getByText(baseAssistant.description)).toBeInTheDocument()
    })

    it('renders AssistantDetailsProfile with correct assistant prop', () => {
      render(
        <RemoteAssistantDetails
          assistant={baseAssistant}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      const profile = screen.getByTestId('assistant-details-profile')
      expect(profile).toHaveTextContent('Test Remote Assistant')
    })

    it('renders AssistantDetailsActions with all props', () => {
      render(
        <RemoteAssistantDetails
          assistant={baseAssistant}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      expect(screen.getByTestId('assistant-details-actions')).toBeInTheDocument()
    })

    it('renders without createAvatarChat prop', () => {
      render(
        <RemoteAssistantDetails
          assistant={baseAssistant}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      expect(screen.getByTestId('assistant-details-actions')).toBeInTheDocument()
    })
  })

  describe('About Section', () => {
    it('renders description in About Assistant section', () => {
      render(
        <RemoteAssistantDetails
          assistant={baseAssistant}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      expect(screen.getByText('About Assistant:')).toBeInTheDocument()
      expect(screen.getByText(baseAssistant.description)).toBeInTheDocument()
    })

    it('preserves whitespace in description with whitespace-pre-wrap', () => {
      const assistantWithMultilineDesc = {
        ...baseAssistant,
        description: 'Line 1\nLine 2\n\nLine 4',
      }

      const { container } = render(
        <RemoteAssistantDetails
          assistant={assistantWithMultilineDesc}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      const descriptionElement = container.querySelector('.whitespace-pre-wrap')
      expect(descriptionElement).toBeInTheDocument()
      expect(descriptionElement).toHaveClass('whitespace-pre-wrap')
      // Verify the description contains the text (jsdom doesn't preserve \n in textContent)
      expect(descriptionElement?.textContent).toContain('Line 1')
      expect(descriptionElement?.textContent).toContain('Line 2')
      expect(descriptionElement?.textContent).toContain('Line 4')
    })

    it('renders Assistant URL copy field when agent_card.url exists', () => {
      render(
        <RemoteAssistantDetails
          assistant={mockAssistantWithAgentCard}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      const copyField = screen.getByTestId('details-copy-field')
      expect(copyField).toHaveTextContent('Assistant URL')
      expect(copyField).toHaveTextContent('https://example.com/agent')
    })

    it('renders Assistant URL field even when url is undefined', () => {
      const assistantWithoutUrl = {
        ...baseAssistant,
        agent_card: {
          name: 'Test',
          description: 'Test',
        },
      }

      render(
        <RemoteAssistantDetails
          assistant={assistantWithoutUrl}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      expect(screen.getByTestId('details-copy-field')).toBeInTheDocument()
    })
  })

  describe('Version Section', () => {
    it('renders version section when version exists', () => {
      render(
        <RemoteAssistantDetails
          assistant={mockAssistantWithAgentCard}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      expect(screen.getByText('Version:')).toBeInTheDocument()
      expect(screen.getByText('V 1.0.0')).toBeInTheDocument()
    })

    it('does not render version section when version is undefined', () => {
      const assistantWithoutVersion = {
        ...baseAssistant,
        agent_card: {
          name: 'Test',
          description: 'Test',
        },
      }

      render(
        <RemoteAssistantDetails
          assistant={assistantWithoutVersion}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      expect(screen.queryByText('Version:')).not.toBeInTheDocument()
    })

    it('formats version with "V " prefix', () => {
      render(
        <RemoteAssistantDetails
          assistant={mockAssistantWithAgentCard}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      const versionTag = screen.getByTestId('details-tag')
      expect(versionTag).toHaveTextContent('V 1.0.0')
    })
  })

  describe('Documentation Section', () => {
    it('renders documentation link when documentationUrl exists', () => {
      render(
        <RemoteAssistantDetails
          assistant={mockAssistantWithAgentCard}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      expect(screen.getByText('Documentation:')).toBeInTheDocument()
      const docLink = screen.getByText('View Documentation')
      expect(docLink).toBeInTheDocument()
      expect(docLink.closest('a')).toHaveAttribute('href', 'https://example.com/docs')
      expect(docLink.closest('a')).toHaveAttribute('target', '_blank')
      expect(docLink.closest('a')).toHaveAttribute('rel', 'noreferrer')
    })

    it('does not render documentation section when documentationUrl is undefined', () => {
      const assistantWithoutDocs = {
        ...baseAssistant,
        agent_card: {
          name: 'Test',
          description: 'Test',
        },
      }

      render(
        <RemoteAssistantDetails
          assistant={assistantWithoutDocs}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      expect(screen.queryByText('Documentation:')).not.toBeInTheDocument()
    })
  })

  describe('Provider Section', () => {
    it('renders provider section with organization name', () => {
      render(
        <RemoteAssistantDetails
          assistant={mockAssistantWithAgentCard}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      expect(screen.getByText('Provider:')).toBeInTheDocument()
      expect(screen.getByText('Test Organization')).toBeInTheDocument()
    })

    it('renders provider URL link when available', () => {
      render(
        <RemoteAssistantDetails
          assistant={mockAssistantWithAgentCard}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      const providerLink = screen.getByText('Visit Provider')
      expect(providerLink).toBeInTheDocument()
      expect(providerLink.closest('a')).toHaveAttribute('href', 'https://example.com/provider')
      expect(providerLink.closest('a')).toHaveAttribute('target', '_blank')
      expect(providerLink.closest('a')).toHaveAttribute('rel', 'noreferrer')
    })

    it('renders provider without URL link when url is undefined', () => {
      const assistantWithProviderNoUrl = {
        ...mockAssistantWithAgentCard,
        agent_card: {
          ...mockAssistantWithAgentCard.agent_card!,
          provider: {
            organization: 'Test Organization',
          },
        },
      }

      render(
        <RemoteAssistantDetails
          assistant={assistantWithProviderNoUrl}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      expect(screen.getByText('Test Organization')).toBeInTheDocument()
      expect(screen.queryByText('Visit Provider')).not.toBeInTheDocument()
    })

    it('does not render provider section when provider is undefined', () => {
      const assistantWithoutProvider = {
        ...baseAssistant,
        agent_card: {
          name: 'Test',
          description: 'Test',
        },
      }

      render(
        <RemoteAssistantDetails
          assistant={assistantWithoutProvider}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      expect(screen.queryByText('Provider:')).not.toBeInTheDocument()
    })
  })

  describe('Skills Section', () => {
    it('renders DetailsAccordion component', () => {
      render(
        <RemoteAssistantDetails
          assistant={mockAssistantWithAgentCard}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      expect(screen.getByTestId('details-accordion')).toBeInTheDocument()
    })
  })

  describe('Sidebar - Overview Section', () => {
    it('renders overview section with project', () => {
      render(
        <RemoteAssistantDetails
          assistant={baseAssistant}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      expect(screen.getByText('OVERVIEW')).toBeInTheDocument()

      const properties = screen.getAllByTestId('details-property')
      const projectProperty = properties.find((prop) => prop.textContent?.includes('Project'))
      expect(projectProperty).toBeDefined()
      expect(projectProperty).toHaveTextContent('Test Project')
    })

    it('displays correct shared value for private assistant', () => {
      render(
        <RemoteAssistantDetails
          assistant={baseAssistant}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      const properties = screen.getAllByTestId('details-property')
      const sharedProperty = properties.find((prop) => prop.textContent?.includes('Shared'))
      expect(sharedProperty).toBeDefined()
      expect(sharedProperty).toHaveTextContent('Private')
    })

    it('displays correct shared value for global assistant', () => {
      const globalAssistant = {
        ...baseAssistant,
        is_global: true,
      }

      render(
        <RemoteAssistantDetails
          assistant={globalAssistant}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      const properties = screen.getAllByTestId('details-property')
      const sharedProperty = properties.find((prop) => prop.textContent?.includes('Shared'))
      expect(sharedProperty).toBeDefined()
      expect(sharedProperty).toHaveTextContent('Global')
    })

    it('displays correct shared value for shared assistant', () => {
      const sharedAssistant = {
        ...baseAssistant,
        shared: true,
      }

      render(
        <RemoteAssistantDetails
          assistant={sharedAssistant}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      const properties = screen.getAllByTestId('details-property')
      const sharedProperty = properties.find((prop) => prop.textContent?.includes('Shared'))
      expect(sharedProperty).toBeDefined()
      expect(sharedProperty).toHaveTextContent('Shared')
    })
  })

  describe('Sidebar - Capabilities Section', () => {
    it('renders capabilities section', () => {
      render(
        <RemoteAssistantDetails
          assistant={mockAssistantWithAgentCard}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      expect(screen.getByText('CAPABILITIES')).toBeInTheDocument()
    })

    it('displays streaming capability as "Supported" when true', () => {
      render(
        <RemoteAssistantDetails
          assistant={mockAssistantWithAgentCard}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      const items = screen.getAllByTestId('details-item')
      const streamingItem = items.find(
        (item) =>
          item.querySelector('[data-testid="details-item-title"]')?.textContent === 'Streaming'
      )
      expect(streamingItem).toBeDefined()
      expect(
        streamingItem?.querySelector('[data-testid="details-item-description"]')
      ).toHaveTextContent('Supported')
    })

    it('displays push notifications capability as "Not supported" when false', () => {
      render(
        <RemoteAssistantDetails
          assistant={mockAssistantWithAgentCard}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      const items = screen.getAllByTestId('details-item')
      const notificationsItem = items.find(
        (item) =>
          item.querySelector('[data-testid="details-item-title"]')?.textContent === 'Notifications'
      )
      expect(notificationsItem).toBeDefined()
      expect(
        notificationsItem?.querySelector('[data-testid="details-item-description"]')
      ).toHaveTextContent('Not supported')
    })

    it('displays state history capability as "Supported" when true', () => {
      render(
        <RemoteAssistantDetails
          assistant={mockAssistantWithAgentCard}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      const items = screen.getAllByTestId('details-item')
      const stateHistoryItem = items.find(
        (item) =>
          item.querySelector('[data-testid="details-item-title"]')?.textContent === 'State History'
      )
      expect(stateHistoryItem).toBeDefined()
      expect(
        stateHistoryItem?.querySelector('[data-testid="details-item-description"]')
      ).toHaveTextContent('Supported')
    })

    it('displays "Not supported" for undefined capabilities', () => {
      const assistantWithUndefinedCapabilities = {
        ...baseAssistant,
        agent_card: {
          name: 'Test',
          description: 'Test',
          capabilities: {},
        },
      }

      render(
        <RemoteAssistantDetails
          assistant={assistantWithUndefinedCapabilities}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      const items = screen.getAllByTestId('details-item')
      const descriptions = items
        .slice(0, 3)
        .map((item) => item.querySelector('[data-testid="details-item-description"]')?.textContent)

      descriptions.forEach((desc) => {
        expect(desc).toBe('Not supported')
      })
    })
  })

  describe('Sidebar - Default Modes Section', () => {
    it('renders default modes section', () => {
      render(
        <RemoteAssistantDetails
          assistant={mockAssistantWithAgentCard}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      expect(screen.getByText('DEFAULT MODES')).toBeInTheDocument()
    })

    it('displays input modes as comma-separated list', () => {
      render(
        <RemoteAssistantDetails
          assistant={mockAssistantWithAgentCard}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      const items = screen.getAllByTestId('details-item')
      const inputModesItem = items.find(
        (item) =>
          item.querySelector('[data-testid="details-item-title"]')?.textContent === 'Input Modes'
      )
      expect(inputModesItem).toBeDefined()
      expect(
        inputModesItem?.querySelector('[data-testid="details-item-description"]')
      ).toHaveTextContent('text, json')
    })

    it('displays output modes as comma-separated list', () => {
      render(
        <RemoteAssistantDetails
          assistant={mockAssistantWithAgentCard}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      const items = screen.getAllByTestId('details-item')
      const outputModesItem = items.find(
        (item) =>
          item.querySelector('[data-testid="details-item-title"]')?.textContent === 'Output Modes'
      )
      expect(outputModesItem).toBeDefined()
      expect(
        outputModesItem?.querySelector('[data-testid="details-item-description"]')
      ).toHaveTextContent('text, html')
    })

    it('displays "None specified" when input modes are undefined', () => {
      const assistantWithoutInputModes = {
        ...mockAssistantWithAgentCard,
        agent_card: {
          ...mockAssistantWithAgentCard.agent_card!,
          defaultInputModes: undefined,
        },
      }

      render(
        <RemoteAssistantDetails
          assistant={assistantWithoutInputModes}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      const items = screen.getAllByTestId('details-item')
      const inputModesItem = items.find(
        (item) =>
          item.querySelector('[data-testid="details-item-title"]')?.textContent === 'Input Modes'
      )
      expect(
        inputModesItem?.querySelector('[data-testid="details-item-description"]')
      ).toHaveTextContent('None specified')
    })

    it('displays "None specified" when output modes are undefined', () => {
      const assistantWithoutOutputModes = {
        ...mockAssistantWithAgentCard,
        agent_card: {
          ...mockAssistantWithAgentCard.agent_card!,
          defaultOutputModes: undefined,
        },
      }

      render(
        <RemoteAssistantDetails
          assistant={assistantWithoutOutputModes}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      const items = screen.getAllByTestId('details-item')
      const outputModesItem = items.find(
        (item) =>
          item.querySelector('[data-testid="details-item-title"]')?.textContent === 'Output Modes'
      )
      expect(
        outputModesItem?.querySelector('[data-testid="details-item-description"]')
      ).toHaveTextContent('None specified')
    })

    it('displays "None specified" for empty arrays', () => {
      const assistantWithEmptyModes = {
        ...mockAssistantWithAgentCard,
        agent_card: {
          ...mockAssistantWithAgentCard.agent_card!,
          defaultInputModes: [],
          defaultOutputModes: [],
        },
      }

      render(
        <RemoteAssistantDetails
          assistant={assistantWithEmptyModes}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      const items = screen.getAllByTestId('details-item')
      const inputModesItem = items.find(
        (item) =>
          item.querySelector('[data-testid="details-item-title"]')?.textContent === 'Input Modes'
      )
      const outputModesItem = items.find(
        (item) =>
          item.querySelector('[data-testid="details-item-title"]')?.textContent === 'Output Modes'
      )

      expect(
        inputModesItem?.querySelector('[data-testid="details-item-description"]')
      ).toHaveTextContent('None specified')
      expect(
        outputModesItem?.querySelector('[data-testid="details-item-description"]')
      ).toHaveTextContent('None specified')
    })
  })

  describe('Layout and Structure', () => {
    it('renders with correct container classes', () => {
      const { container } = render(
        <RemoteAssistantDetails
          assistant={baseAssistant}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      const mainContainer = container.querySelector('.max-w-5xl')
      expect(mainContainer).toBeInTheDocument()
      expect(mainContainer).toHaveClass('mx-auto', 'py-8')
    })

    it('renders profile and actions in flex layout', () => {
      const { container } = render(
        <RemoteAssistantDetails
          assistant={baseAssistant}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      const headerContainer = container.querySelector('.flex.justify-between')
      expect(headerContainer).toBeInTheDocument()
      expect(headerContainer).toHaveClass('flex-wrap', 'gap-4')
    })

    it('renders content in responsive grid layout', () => {
      const { container } = render(
        <RemoteAssistantDetails
          assistant={baseAssistant}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      const contentContainer = container.querySelector('.md\\:flex-row')
      expect(contentContainer).toBeInTheDocument()
      expect(contentContainer).toHaveClass('flex', 'flex-col', 'gap-9')
    })

    it('renders DetailsSidebar', () => {
      render(
        <RemoteAssistantDetails
          assistant={baseAssistant}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      expect(screen.getByTestId('details-sidebar')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles assistant without agent_card', () => {
      render(
        <RemoteAssistantDetails
          assistant={baseAssistant}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      // Should still render basic sections
      expect(screen.getByText('About Assistant:')).toBeInTheDocument()
      expect(screen.getByTestId('details-sidebar')).toBeInTheDocument()
    })

    it('handles assistant with minimal agent_card', () => {
      const assistantWithMinimalCard = {
        ...baseAssistant,
        agent_card: {
          name: 'Minimal Agent',
          description: 'Minimal description',
        },
      }

      render(
        <RemoteAssistantDetails
          assistant={assistantWithMinimalCard}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      expect(screen.getByText('About Assistant:')).toBeInTheDocument()
      expect(screen.queryByText('Version:')).not.toBeInTheDocument()
      expect(screen.queryByText('Documentation:')).not.toBeInTheDocument()
      expect(screen.queryByText('Provider:')).not.toBeInTheDocument()
    })

    it('handles empty description gracefully', () => {
      const assistantWithEmptyDesc = {
        ...baseAssistant,
        description: '',
      }

      render(
        <RemoteAssistantDetails
          assistant={assistantWithEmptyDesc}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      expect(screen.getByText('About Assistant:')).toBeInTheDocument()
    })

    it('handles undefined project', () => {
      const assistantWithoutProject = {
        ...baseAssistant,
        project: undefined,
      }

      render(
        <RemoteAssistantDetails
          assistant={assistantWithoutProject}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      expect(screen.getByTestId('details-sidebar')).toBeInTheDocument()
    })
  })

  describe('getStatus helper function', () => {
    it('returns "Supported" for true value', () => {
      render(
        <RemoteAssistantDetails
          assistant={mockAssistantWithAgentCard}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      const items = screen.getAllByTestId('details-item')
      const streamingItem = items.find(
        (item) =>
          item.querySelector('[data-testid="details-item-title"]')?.textContent === 'Streaming'
      )
      expect(
        streamingItem?.querySelector('[data-testid="details-item-description"]')
      ).toHaveTextContent('Supported')
    })

    it('returns "Not supported" for false value', () => {
      render(
        <RemoteAssistantDetails
          assistant={mockAssistantWithAgentCard}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      const items = screen.getAllByTestId('details-item')
      const notificationsItem = items.find(
        (item) =>
          item.querySelector('[data-testid="details-item-title"]')?.textContent === 'Notifications'
      )
      expect(
        notificationsItem?.querySelector('[data-testid="details-item-description"]')
      ).toHaveTextContent('Not supported')
    })

    it('returns "Not supported" for undefined value', () => {
      const assistantWithNoCapabilities = {
        ...baseAssistant,
        agent_card: {
          name: 'Test',
          description: 'Test',
        },
      }

      render(
        <RemoteAssistantDetails
          assistant={assistantWithNoCapabilities}
          createChat={mockCreateChat}
          loadAssistant={mockLoadAssistant}
        />
      )

      const items = screen.getAllByTestId('details-item')
      const capabilityItems = items.slice(0, 3)

      capabilityItems.forEach((item) => {
        expect(item.querySelector('[data-testid="details-item-description"]')).toHaveTextContent(
          'Not supported'
        )
      })
    })
  })
})
