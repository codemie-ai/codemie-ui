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
import { describe, expect, it } from 'vitest'

import { Skill, SkillVisibility } from '@/types/entity/skill'

import SkillStatusLabel from '../SkillStatusLabel'

describe('SkillStatusLabel', () => {
  const createMockSkill = (visibility: SkillVisibility, assistantsCount = 0): Skill =>
    ({
      id: 'test-id',
      name: 'Test Skill',
      description: 'Test Description',
      content: 'Test Content',
      project: 'test-project',
      visibility,
      categories: [],
      version: '1.0.0',
      assistants_count: assistantsCount,
    } as Skill)

  describe('Regular mode (non-marketplace)', () => {
    it('renders Shared with Project without assistants count when visibility is PROJECT', () => {
      const mockSkill = createMockSkill(SkillVisibility.PROJECT, 5)

      render(<SkillStatusLabel skill={mockSkill} />)

      const statusElement = screen.getByRole('status')
      expect(statusElement).toHaveTextContent('Shared with Project')
      expect(statusElement).not.toHaveTextContent('assistants')
      expect(statusElement).toHaveAttribute('aria-label', 'Shared with Project')
      // Check for SVG icon
      const svgElement = statusElement.querySelector('svg')
      expect(svgElement).toBeInTheDocument()
    })

    it('renders Shared with Project when visibility is PUBLIC', () => {
      const mockSkill = createMockSkill(SkillVisibility.PUBLIC, 3)

      render(<SkillStatusLabel skill={mockSkill} />)

      const statusElement = screen.getByRole('status')
      expect(statusElement).toHaveTextContent('Shared with Project')
      expect(statusElement).not.toHaveTextContent('assistants')
    })

    it('renders Not shared without assistants count when visibility is PRIVATE', () => {
      const mockSkill = createMockSkill(SkillVisibility.PRIVATE, 2)

      render(<SkillStatusLabel skill={mockSkill} />)

      const statusElement = screen.getByRole('status')
      expect(statusElement).toHaveTextContent('Not shared')
      expect(statusElement).not.toHaveTextContent('assistants')
      expect(statusElement).toHaveAttribute('aria-label', 'Not shared')
      // Check for SVG icon
      const svgElement = statusElement.querySelector('svg')
      expect(svgElement).toBeInTheDocument()
    })

    it('does not display bullet separator in regular mode', () => {
      const mockSkill = createMockSkill(SkillVisibility.PROJECT, 5)

      render(<SkillStatusLabel skill={mockSkill} />)

      expect(screen.queryByText('•')).not.toBeInTheDocument()
    })

    it('uses shared icon for project visibility', () => {
      const mockSkill = createMockSkill(SkillVisibility.PROJECT, 5)

      const { container } = render(<SkillStatusLabel skill={mockSkill} />)

      const svgElement = container.querySelector('svg')
      expect(svgElement).toBeInTheDocument()
    })

    it('uses shared icon for public visibility', () => {
      const mockSkill = createMockSkill(SkillVisibility.PUBLIC, 5)

      const { container } = render(<SkillStatusLabel skill={mockSkill} />)

      const svgElement = container.querySelector('svg')
      expect(svgElement).toBeInTheDocument()
    })

    it('uses not-shared icon for private visibility', () => {
      const mockSkill = createMockSkill(SkillVisibility.PRIVATE, 5)

      const { container } = render(<SkillStatusLabel skill={mockSkill} />)

      const svgElement = container.querySelector('svg')
      expect(svgElement).toBeInTheDocument()
    })
  })

  describe('Marketplace mode', () => {
    it('renders only assistants count without visibility status', () => {
      const mockSkill = createMockSkill(SkillVisibility.PROJECT, 5)

      render(<SkillStatusLabel skill={mockSkill} isMarketplace={true} />)

      const statusElement = screen.getByRole('status')
      expect(statusElement).toHaveTextContent('5 assistants')
      expect(statusElement).not.toHaveTextContent('Shared with Project')
      expect(statusElement).toHaveAttribute('aria-label', '5 assistants')
      // Check that NO SVG icon is present
      const svgElement = statusElement.querySelector('svg')
      expect(svgElement).not.toBeInTheDocument()
    })

    it('renders singular assistant when count is 1', () => {
      const mockSkill = createMockSkill(SkillVisibility.PROJECT, 1)

      render(<SkillStatusLabel skill={mockSkill} isMarketplace={true} />)

      const statusElement = screen.getByRole('status')
      expect(statusElement).toHaveTextContent('1 assistant')
      expect(statusElement).not.toHaveTextContent('assistants')
    })

    it('handles missing assistants_count', () => {
      const mockSkill = createMockSkill(SkillVisibility.PROJECT)
      mockSkill.assistants_count = undefined

      render(<SkillStatusLabel skill={mockSkill} isMarketplace={true} />)

      const statusElement = screen.getByRole('status')
      expect(statusElement).toHaveTextContent('0 assistants')
    })

    it('does not show visibility status for PRIVATE skills', () => {
      const mockSkill = createMockSkill(SkillVisibility.PRIVATE, 3)

      render(<SkillStatusLabel skill={mockSkill} isMarketplace={true} />)

      const statusElement = screen.getByRole('status')
      expect(statusElement).toHaveTextContent('3 assistants')
      expect(statusElement).not.toHaveTextContent('Not shared')
    })

    it('does not display bullet separator in marketplace mode', () => {
      const mockSkill = createMockSkill(SkillVisibility.PROJECT, 5)

      render(<SkillStatusLabel skill={mockSkill} isMarketplace={true} />)

      expect(screen.queryByText('•')).not.toBeInTheDocument()
    })
  })

  it('has the correct gap spacing', () => {
    const mockSkill = createMockSkill(SkillVisibility.PRIVATE, 5)

    render(<SkillStatusLabel skill={mockSkill} />)

    const statusElement = screen.getByRole('status')
    expect(statusElement).toHaveClass('gap-3')
  })

  it('prevents text wrapping with whitespace-nowrap', () => {
    const mockSkill = createMockSkill(SkillVisibility.PRIVATE, 5)

    render(<SkillStatusLabel skill={mockSkill} />)

    const statusElement = screen.getByRole('status')
    expect(statusElement).toHaveClass('whitespace-nowrap')
  })
})
