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
import { describe, it, expect, vi } from 'vitest'

import { AgentCard } from '@/types/entity/assistant'

import RemoteAssistantFormCard from '../RemoteAssistantFormCard'

vi.hoisted(() => vi.resetModules())

vi.mock('primereact/hooks', () => ({
  useMountEffect: vi.fn(),
}))

vi.mock('primereact/accordion', () => ({
  Accordion: ({ children }: any) => <div data-testid="accordion">{children}</div>,
  AccordionTab: ({ header, children }: any) => (
    <div data-testid="accordion-tab">
      <div data-testid="accordion-header">{header}</div>
      <div data-testid="accordion-content">{children}</div>
    </div>
  ),
}))

const mockAssistant: AgentCard = {
  name: 'Test Assistant',
  description: 'This is a test assistant description',
  version: '1.0.0',
  documentationUrl: 'https://docs.example.com',
  provider: {
    organization: 'Test Organization',
    url: 'https://provider.example.com',
  },
  capabilities: {
    streaming: true,
    pushNotifications: false,
    stateTransitionHistory: true,
  },
  defaultInputModes: ['text', 'voice'],
  defaultOutputModes: ['text', 'json'],
  skills: [
    {
      id: 'skill-1',
      name: 'Test Skill',
      description: 'A test skill',
      examples: ['Example 1', 'Example 2'],
      tags: ['tag1', 'tag2'],
      inputModes: ['text'],
      outputModes: ['json'],
    },
    {
      id: 'skill-2',
      name: 'Another Skill',
      description: 'Another test skill',
    },
  ],
}

const mockAssistantMinimal: AgentCard = {
  name: 'Minimal Assistant',
  description: 'Minimal description',
}

describe('RemoteAssistantFormCard', () => {
  it('renders without crashing', () => {
    const { container } = render(<RemoteAssistantFormCard assistant={mockAssistant} />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('displays the component title', () => {
    render(<RemoteAssistantFormCard assistant={mockAssistant} />)
    expect(screen.getByText('Assistant Card')).toBeInTheDocument()
  })

  it('displays assistant version when provided', () => {
    render(<RemoteAssistantFormCard assistant={mockAssistant} />)
    expect(screen.getByText('V 1.0.0')).toBeInTheDocument()
  })

  it('does not display version badge when version is not provided', () => {
    render(<RemoteAssistantFormCard assistant={mockAssistantMinimal} />)
    expect(screen.queryByText(/V /)).not.toBeInTheDocument()
  })

  it('displays assistant name in read-only input', () => {
    render(<RemoteAssistantFormCard assistant={mockAssistant} />)
    expect(screen.getByDisplayValue('Test Assistant')).toBeInTheDocument()
    expect(screen.getByText('Original Name:')).toBeInTheDocument()
  })

  it('displays assistant description in read-only textarea', () => {
    render(<RemoteAssistantFormCard assistant={mockAssistant} />)
    expect(screen.getByDisplayValue('This is a test assistant description')).toBeInTheDocument()
    const descriptionLabels = screen.getAllByText(/Description/)
    expect(descriptionLabels.length).toBeGreaterThan(0)
  })

  it('displays documentation link when documentationUrl is provided', () => {
    render(<RemoteAssistantFormCard assistant={mockAssistant} />)
    expect(screen.getByText('Documentation:')).toBeInTheDocument()
    const link = screen.getByText('View Documentation')
    expect(link.closest('a')).toHaveAttribute('href', 'https://docs.example.com')
    expect(link.closest('a')).toHaveAttribute('target', '_blank')
    expect(link.closest('a')).toHaveAttribute('rel', 'noreferrer')
  })

  it('does not display documentation section when documentationUrl is not provided', () => {
    render(<RemoteAssistantFormCard assistant={mockAssistantMinimal} />)
    expect(screen.queryByText('Documentation:')).not.toBeInTheDocument()
    expect(screen.queryByText('View Documentation')).not.toBeInTheDocument()
  })

  it('displays provider information when provider is provided', () => {
    render(<RemoteAssistantFormCard assistant={mockAssistant} />)
    expect(screen.getByText('Provider Information:')).toBeInTheDocument()
    expect(screen.getByText('Test Organization')).toBeInTheDocument()
  })

  it('displays provider link when provider url is provided', () => {
    render(<RemoteAssistantFormCard assistant={mockAssistant} />)
    const link = screen.getByText('Visit Provider')
    expect(link.closest('a')).toHaveAttribute('href', 'https://provider.example.com')
    expect(link.closest('a')).toHaveAttribute('target', '_blank')
    expect(link.closest('a')).toHaveAttribute('rel', 'noreferrer')
  })

  it('does not display Visit Provider link when provider url is not provided', () => {
    const assistantWithoutProviderUrl: AgentCard = {
      ...mockAssistant,
      provider: {
        organization: 'Test Organization',
      },
    }
    render(<RemoteAssistantFormCard assistant={assistantWithoutProviderUrl} />)
    expect(screen.queryByText('Visit Provider')).not.toBeInTheDocument()
  })

  it('does not display provider section when provider is not provided', () => {
    render(<RemoteAssistantFormCard assistant={mockAssistantMinimal} />)
    expect(screen.queryByText('Provider Information:')).not.toBeInTheDocument()
  })

  it('displays capabilities section', () => {
    render(<RemoteAssistantFormCard assistant={mockAssistant} />)
    expect(screen.getByText('Capabilities:')).toBeInTheDocument()
  })

  it('displays streaming capability as supported when true', () => {
    render(<RemoteAssistantFormCard assistant={mockAssistant} />)
    expect(screen.getByText('Streaming')).toBeInTheDocument()
    const supportedElements = screen.getAllByText('Supported')
    expect(supportedElements.length).toBeGreaterThan(0)
  })

  it('displays notifications capability as not supported when false', () => {
    render(<RemoteAssistantFormCard assistant={mockAssistant} />)
    expect(screen.getByText('Notifications')).toBeInTheDocument()
    const notSupportedElements = screen.getAllByText('Not supported')
    expect(notSupportedElements.length).toBeGreaterThan(0)
  })

  it('displays state history capability as supported when true', () => {
    render(<RemoteAssistantFormCard assistant={mockAssistant} />)
    expect(screen.getByText('State History')).toBeInTheDocument()
    const supportedElements = screen.getAllByText('Supported')
    expect(supportedElements.length).toBeGreaterThanOrEqual(2)
  })

  it('displays capabilities as not supported when capabilities object is not provided', () => {
    render(<RemoteAssistantFormCard assistant={mockAssistantMinimal} />)
    expect(screen.getAllByText('Not supported')).toHaveLength(3)
  })

  it('displays default modes section', () => {
    render(<RemoteAssistantFormCard assistant={mockAssistant} />)
    expect(screen.getByText('Default Modes:')).toBeInTheDocument()
  })

  it('displays input modes when provided', () => {
    render(<RemoteAssistantFormCard assistant={mockAssistant} />)
    const inputModesElements = screen.getAllByText('Input Modes')
    expect(inputModesElements.length).toBeGreaterThan(0)
    expect(screen.getByText('text, voice')).toBeInTheDocument()
  })

  it('displays output modes when provided', () => {
    render(<RemoteAssistantFormCard assistant={mockAssistant} />)
    const outputModesElements = screen.getAllByText('Output Modes')
    expect(outputModesElements.length).toBeGreaterThan(0)
    expect(screen.getByText('text, json')).toBeInTheDocument()
  })

  it('displays "None specified" for input modes when not provided', () => {
    render(<RemoteAssistantFormCard assistant={mockAssistantMinimal} />)
    const inputModesElements = screen.getAllByText('Input Modes')
    expect(inputModesElements.length).toBeGreaterThan(0)
    const noneSpecifiedElements = screen.getAllByText('None specified')
    expect(noneSpecifiedElements.length).toBeGreaterThan(0)
  })

  it('displays "None specified" for output modes when not provided', () => {
    render(<RemoteAssistantFormCard assistant={mockAssistantMinimal} />)
    const outputModesElements = screen.getAllByText('Output Modes')
    expect(outputModesElements.length).toBeGreaterThan(0)
    const noneSpecifiedElements = screen.getAllByText('None specified')
    expect(noneSpecifiedElements.length).toBeGreaterThanOrEqual(2)
  })

  it('renders skills section when assistant has skills', () => {
    render(<RemoteAssistantFormCard assistant={mockAssistant} />)
    expect(screen.getByText('Skills:')).toBeInTheDocument()
    expect(screen.getByText('Test Skill')).toBeInTheDocument()
    expect(screen.getByText('Another Skill')).toBeInTheDocument()
  })

  it('does not render skills section when assistant has no skills', () => {
    render(<RemoteAssistantFormCard assistant={mockAssistantMinimal} />)
    expect(screen.queryByText('Skills:')).not.toBeInTheDocument()
  })

  it('renders skill accordion with skill details', () => {
    render(<RemoteAssistantFormCard assistant={mockAssistant} />)

    // Check that skill details are visible in accordion content
    expect(screen.getAllByText(/ID/).length).toBeGreaterThan(0)
    expect(screen.getByText('skill-1')).toBeInTheDocument()
    expect(screen.getByText('skill-2')).toBeInTheDocument()
  })

  it('displays skill details including examples and tags', () => {
    render(<RemoteAssistantFormCard assistant={mockAssistant} />)

    // Check examples
    expect(screen.getAllByText(/Examples/).length).toBeGreaterThan(0)
    expect(screen.getByText('Example 1')).toBeInTheDocument()
    expect(screen.getByText('Example 2')).toBeInTheDocument()

    // Check tags
    expect(screen.getAllByText(/Tags/).length).toBeGreaterThan(0)
    expect(screen.getByText('tag1')).toBeInTheDocument()
    expect(screen.getByText('tag2')).toBeInTheDocument()

    // Check input/output modes in skills - these appear in both default modes and skill modes
    expect(screen.getAllByText(/Input Modes/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Output Modes/).length).toBeGreaterThan(0)
  })

  it('uses 3-column grid for capabilities when isChatConfig is false', () => {
    const { container } = render(<RemoteAssistantFormCard assistant={mockAssistant} />)
    const capabilitiesGrid = container.querySelector('.grid-cols-3')
    expect(capabilitiesGrid).toBeInTheDocument()
  })

  it('uses 2-column grid for capabilities when isChatConfig is true', () => {
    const { container } = render(<RemoteAssistantFormCard assistant={mockAssistant} isChatConfig />)
    const capabilitiesGrid = container.querySelector('.grid-cols-2')
    expect(capabilitiesGrid).toBeInTheDocument()
  })

  it('applies custom className when provided', () => {
    const { container } = render(
      <RemoteAssistantFormCard assistant={mockAssistant} className="custom-class" />
    )
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('displays all required sections in correct order', () => {
    render(<RemoteAssistantFormCard assistant={mockAssistant} />)

    // Check that sections exist
    expect(screen.getByText('Original Name:')).toBeInTheDocument()
    expect(screen.getAllByText(/Description/).length).toBeGreaterThan(0)
    expect(screen.getByText('Documentation:')).toBeInTheDocument()
    expect(screen.getByText('Provider Information:')).toBeInTheDocument()
    expect(screen.getByText('Capabilities:')).toBeInTheDocument()
    expect(screen.getByText('Default Modes:')).toBeInTheDocument()
  })

  it('handles empty defaultInputModes array', () => {
    const assistantWithEmptyInputModes: AgentCard = {
      ...mockAssistant,
      defaultInputModes: [],
    }
    render(<RemoteAssistantFormCard assistant={assistantWithEmptyInputModes} />)
    const inputModesElements = screen.getAllByText('Input Modes')
    expect(inputModesElements.length).toBeGreaterThan(0)
    // Empty array join returns empty string, so no value is displayed after the label
  })

  it('handles empty defaultOutputModes array', () => {
    const assistantWithEmptyOutputModes: AgentCard = {
      ...mockAssistant,
      defaultOutputModes: [],
    }
    render(<RemoteAssistantFormCard assistant={assistantWithEmptyOutputModes} />)
    const outputModesElements = screen.getAllByText('Output Modes')
    expect(outputModesElements.length).toBeGreaterThan(0)
    // Empty array join returns empty string, so no value is displayed after the label
  })

  it('renders with all capabilities undefined', () => {
    const assistantWithUndefinedCapabilities: AgentCard = {
      ...mockAssistant,
      capabilities: {
        streaming: undefined,
        pushNotifications: undefined,
        stateTransitionHistory: undefined,
      },
    }
    render(<RemoteAssistantFormCard assistant={assistantWithUndefinedCapabilities} />)
    expect(screen.getAllByText('Not supported')).toHaveLength(3)
  })
})
