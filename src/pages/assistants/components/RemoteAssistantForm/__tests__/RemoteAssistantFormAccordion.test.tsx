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

import RemoteAssistantFormAccordion from '../RemoteAssistantFormAccordion'

vi.hoisted(() => vi.resetModules())

vi.mock('primereact/accordion', () => ({
  Accordion: ({ children, onTabChange }: any) => (
    <button type="button" data-testid="accordion" onClick={() => onTabChange?.({ index: [0] })}>
      {children}
    </button>
  ),
  AccordionTab: ({ header, children }: any) => (
    <div data-testid="accordion-tab">
      <div data-testid="accordion-header">{header}</div>
      <div data-testid="accordion-content">{children}</div>
    </div>
  ),
}))

const mockAssistantWithSkills: AgentCard = {
  name: 'Test Assistant',
  description: 'Test description',
  skills: [
    {
      id: 'skill-1',
      name: 'Test Skill 1',
      description: 'First test skill',
      examples: ['Example 1', 'Example 2', 'Example 3'],
      tags: ['tag1', 'tag2', 'tag3'],
      inputModes: ['text', 'voice'],
      outputModes: ['text', 'json'],
    },
    {
      id: 'skill-2',
      name: 'Test Skill 2',
      description: 'Second test skill',
      examples: ['Example A'],
      tags: ['tagA', 'tagB'],
      inputModes: ['text'],
      outputModes: ['xml'],
    },
  ],
}

const mockAssistantMinimalSkill: AgentCard = {
  name: 'Minimal Assistant',
  description: 'Minimal description',
  skills: [
    {
      id: 'minimal-skill',
      name: 'Minimal Skill',
      description: 'A minimal skill with no optional fields',
    },
  ],
}

const mockAssistantNoSkills: AgentCard = {
  name: 'No Skills Assistant',
  description: 'Assistant without skills',
}

const mockAssistantEmptySkills: AgentCard = {
  name: 'Empty Skills Assistant',
  description: 'Assistant with empty skills array',
  skills: [],
}

describe('RemoteAssistantFormAccordion', () => {
  describe('Rendering', () => {
    it('renders nothing when assistant has no skills property', () => {
      const { container } = render(
        <RemoteAssistantFormAccordion assistant={mockAssistantNoSkills} />
      )
      expect(container.firstChild).toBeNull()
    })

    it('renders nothing when assistant has empty skills array', () => {
      const { container } = render(
        <RemoteAssistantFormAccordion assistant={mockAssistantEmptySkills} />
      )
      expect(container.firstChild).toBeNull()
    })

    it('renders skills section when assistant has skills', () => {
      render(<RemoteAssistantFormAccordion assistant={mockAssistantWithSkills} />)
      expect(screen.getByText('Skills:')).toBeInTheDocument()
    })

    it('renders accordion component', () => {
      render(<RemoteAssistantFormAccordion assistant={mockAssistantWithSkills} />)
      expect(screen.getByTestId('accordion')).toBeInTheDocument()
    })

    it('renders all skills as accordion tabs', () => {
      render(<RemoteAssistantFormAccordion assistant={mockAssistantWithSkills} />)
      const accordionTabs = screen.getAllByTestId('accordion-tab')
      expect(accordionTabs).toHaveLength(2)
    })
  })

  describe('Skill Headers', () => {
    it('displays skill names in headers', () => {
      render(<RemoteAssistantFormAccordion assistant={mockAssistantWithSkills} />)
      expect(screen.getByText('Test Skill 1')).toBeInTheDocument()
      expect(screen.getByText('Test Skill 2')).toBeInTheDocument()
    })

    it('displays skill descriptions in headers', () => {
      render(<RemoteAssistantFormAccordion assistant={mockAssistantWithSkills} />)
      // Descriptions appear in both header and content, so use getAllByText
      const firstSkillDesc = screen.getAllByText('First test skill')
      expect(firstSkillDesc.length).toBeGreaterThanOrEqual(1)
      const secondSkillDesc = screen.getAllByText('Second test skill')
      expect(secondSkillDesc.length).toBeGreaterThanOrEqual(1)
    })

    it('renders chevron icon for each skill', () => {
      const { container } = render(
        <RemoteAssistantFormAccordion assistant={mockAssistantWithSkills} />
      )
      const chevrons = container.querySelectorAll('svg')
      expect(chevrons.length).toBeGreaterThan(0)
    })
  })

  describe('Skill Content - Basic Fields', () => {
    it('displays skill ID', () => {
      render(<RemoteAssistantFormAccordion assistant={mockAssistantWithSkills} />)
      expect(screen.getAllByText(/ID/).length).toBeGreaterThan(0)
      expect(screen.getByText('skill-1')).toBeInTheDocument()
      expect(screen.getByText('skill-2')).toBeInTheDocument()
    })

    it('displays skill description with label', () => {
      render(<RemoteAssistantFormAccordion assistant={mockAssistantWithSkills} />)
      const descriptionLabels = screen.getAllByText(/Description/)
      expect(descriptionLabels.length).toBeGreaterThan(0)
      const firstSkillDesc = screen.getAllByText('First test skill')
      expect(firstSkillDesc.length).toBeGreaterThan(0)
      const secondSkillDesc = screen.getAllByText('Second test skill')
      expect(secondSkillDesc.length).toBeGreaterThan(0)
    })

    it('displays minimal skill with only required fields', () => {
      render(<RemoteAssistantFormAccordion assistant={mockAssistantMinimalSkill} />)
      expect(screen.getByText('Minimal Skill')).toBeInTheDocument()
      expect(screen.getByText('minimal-skill')).toBeInTheDocument()
      const descElements = screen.getAllByText('A minimal skill with no optional fields')
      expect(descElements.length).toBeGreaterThan(0)
    })
  })

  describe('Skill Content - Examples', () => {
    it('displays examples section when examples exist', () => {
      render(<RemoteAssistantFormAccordion assistant={mockAssistantWithSkills} />)
      expect(screen.getAllByText(/Examples/).length).toBeGreaterThan(0)
    })

    it('displays all examples as list items', () => {
      render(<RemoteAssistantFormAccordion assistant={mockAssistantWithSkills} />)
      expect(screen.getByText('Example 1')).toBeInTheDocument()
      expect(screen.getByText('Example 2')).toBeInTheDocument()
      expect(screen.getByText('Example 3')).toBeInTheDocument()
      expect(screen.getByText('Example A')).toBeInTheDocument()
    })

    it('renders examples in ordered list', () => {
      const { container } = render(
        <RemoteAssistantFormAccordion assistant={mockAssistantWithSkills} />
      )
      const orderedLists = container.querySelectorAll('ol.list-disc')
      expect(orderedLists.length).toBeGreaterThan(0)
    })

    it('does not display examples section when no examples', () => {
      render(<RemoteAssistantFormAccordion assistant={mockAssistantMinimalSkill} />)
      const examplesLabels = screen.queryAllByText(/Examples/)
      expect(examplesLabels.length).toBe(0)
    })
  })

  describe('Skill Content - Tags', () => {
    it('displays tags section with headline', () => {
      render(<RemoteAssistantFormAccordion assistant={mockAssistantWithSkills} />)
      expect(screen.getAllByText('Tags:').length).toBeGreaterThan(0)
    })

    it('displays all tags for first skill', () => {
      render(<RemoteAssistantFormAccordion assistant={mockAssistantWithSkills} />)
      expect(screen.getByText('tag1')).toBeInTheDocument()
      expect(screen.getByText('tag2')).toBeInTheDocument()
      expect(screen.getByText('tag3')).toBeInTheDocument()
    })

    it('displays all tags for second skill', () => {
      render(<RemoteAssistantFormAccordion assistant={mockAssistantWithSkills} />)
      expect(screen.getByText('tagA')).toBeInTheDocument()
      expect(screen.getByText('tagB')).toBeInTheDocument()
    })

    it('does not render Tags section when tags is undefined', () => {
      render(<RemoteAssistantFormAccordion assistant={mockAssistantMinimalSkill} />)
      expect(screen.queryByText('Tags:')).not.toBeInTheDocument()
    })
  })

  describe('Skill Content - Input/Output Modes', () => {
    it('displays input modes section when present', () => {
      render(<RemoteAssistantFormAccordion assistant={mockAssistantWithSkills} />)
      expect(screen.getAllByText('Input Modes:').length).toBeGreaterThan(0)
    })

    it('displays output modes section when present', () => {
      render(<RemoteAssistantFormAccordion assistant={mockAssistantWithSkills} />)
      expect(screen.getAllByText('Output Modes:').length).toBeGreaterThan(0)
    })

    it('displays all input modes for first skill', () => {
      render(<RemoteAssistantFormAccordion assistant={mockAssistantWithSkills} />)
      // 'text' appears multiple times (in both skills)
      expect(screen.getAllByText('text').length).toBeGreaterThan(0)
      expect(screen.getByText('voice')).toBeInTheDocument()
    })

    it('displays all output modes for first skill', () => {
      render(<RemoteAssistantFormAccordion assistant={mockAssistantWithSkills} />)
      expect(screen.getAllByText('json').length).toBeGreaterThan(0)
    })

    it('displays input and output modes for second skill', () => {
      render(<RemoteAssistantFormAccordion assistant={mockAssistantWithSkills} />)
      expect(screen.getByText('xml')).toBeInTheDocument()
    })

    it('does not display modes section when inputModes is missing', () => {
      const assistantNoModes: AgentCard = {
        name: 'Test',
        description: 'Test',
        skills: [
          {
            id: 'skill-1',
            name: 'Skill',
            description: 'Desc',
            outputModes: ['text'],
          },
        ],
      }
      render(<RemoteAssistantFormAccordion assistant={assistantNoModes} />)
      expect(screen.queryByText('Input Modes:')).not.toBeInTheDocument()
      expect(screen.queryByText('Output Modes:')).not.toBeInTheDocument()
    })

    it('does not display modes section when outputModes is missing', () => {
      const assistantNoModes: AgentCard = {
        name: 'Test',
        description: 'Test',
        skills: [
          {
            id: 'skill-1',
            name: 'Skill',
            description: 'Desc',
            inputModes: ['text'],
          },
        ],
      }
      render(<RemoteAssistantFormAccordion assistant={assistantNoModes} />)
      expect(screen.queryByText('Input Modes:')).not.toBeInTheDocument()
      expect(screen.queryByText('Output Modes:')).not.toBeInTheDocument()
    })

    it('does not display modes section when both modes arrays are empty', () => {
      const assistantEmptyModes: AgentCard = {
        name: 'Test',
        description: 'Test',
        skills: [
          {
            id: 'skill-1',
            name: 'Skill',
            description: 'Desc',
            inputModes: [],
            outputModes: [],
          },
        ],
      }
      render(<RemoteAssistantFormAccordion assistant={assistantEmptyModes} />)
      expect(screen.queryByText('Input Modes:')).not.toBeInTheDocument()
      expect(screen.queryByText('Output Modes:')).not.toBeInTheDocument()
    })
  })

  describe('Layout - isChatConfig', () => {
    it('uses 2-column grid for modes when isChatConfig is false', () => {
      const { container } = render(
        <RemoteAssistantFormAccordion assistant={mockAssistantWithSkills} isChatConfig={false} />
      )
      const grids = container.querySelectorAll('.grid.grid-cols-2')
      expect(grids.length).toBeGreaterThan(0)
    })

    it('applies flex-col class when isChatConfig is true', () => {
      const { container } = render(
        <RemoteAssistantFormAccordion assistant={mockAssistantWithSkills} isChatConfig={true} />
      )
      const flexCols = container.querySelectorAll('.flex-col')
      expect(flexCols.length).toBeGreaterThan(0)
    })

    it('uses 2-column grid by default (isChatConfig undefined)', () => {
      const { container } = render(
        <RemoteAssistantFormAccordion assistant={mockAssistantWithSkills} />
      )
      const grids = container.querySelectorAll('.grid.grid-cols-2')
      expect(grids.length).toBeGreaterThan(0)
    })
  })

  describe('Multiple Skills', () => {
    it('renders multiple skills correctly', () => {
      render(<RemoteAssistantFormAccordion assistant={mockAssistantWithSkills} />)
      expect(screen.getByText('Test Skill 1')).toBeInTheDocument()
      expect(screen.getByText('Test Skill 2')).toBeInTheDocument()
    })

    it('displays unique content for each skill', () => {
      render(<RemoteAssistantFormAccordion assistant={mockAssistantWithSkills} />)

      // Check unique IDs
      expect(screen.getByText('skill-1')).toBeInTheDocument()
      expect(screen.getByText('skill-2')).toBeInTheDocument()

      // Check unique examples
      expect(screen.getByText('Example 1')).toBeInTheDocument()
      expect(screen.getByText('Example A')).toBeInTheDocument()

      // Check unique tags
      expect(screen.getByText('tag1')).toBeInTheDocument()
      expect(screen.getByText('tagA')).toBeInTheDocument()

      // Check unique output modes
      expect(screen.getAllByText('json').length).toBeGreaterThan(0)
      expect(screen.getAllByText('xml').length).toBeGreaterThan(0)
    })

    it('renders correct number of accordion tabs', () => {
      render(<RemoteAssistantFormAccordion assistant={mockAssistantWithSkills} />)
      const tabs = screen.getAllByTestId('accordion-tab')
      expect(tabs).toHaveLength(2)
    })
  })
})
