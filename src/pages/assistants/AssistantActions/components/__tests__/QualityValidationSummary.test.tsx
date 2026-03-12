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
import { describe, it, expect } from 'vitest'

import { RecommendationAction, RecommendationSeverity } from '@/types/entity/assistant'
import type { QualityValidationRecommendations } from '@/types/entity/assistant'

import QualityValidationSummary from '../QualityValidationSummary'

const FALLBACK_MESSAGE =
  'The assistant configuration needs improvement to meet marketplace quality standards. Please update the assistant settings manually.'

const renderComponent = (recommendations: QualityValidationRecommendations) => {
  return render(<QualityValidationSummary recommendations={recommendations} />)
}

const expectFallbackMessage = () => {
  expect(screen.getByText(/assistant configuration needs improvement/i)).toBeInTheDocument()
}

describe('QualityValidationSummary', () => {
  describe('Header rendering', () => {
    it('should always render "Analysis Summary" header', () => {
      renderComponent({})
      expect(screen.getByText('Analysis Summary')).toBeInTheDocument()
    })
  })

  describe('Empty state', () => {
    it('should render fallback message when no recommendations are provided', () => {
      renderComponent({})
      expect(screen.getByText(FALLBACK_MESSAGE)).toBeInTheDocument()
    })

    it('should render fallback message when all recommendations have KEEP action', () => {
      renderComponent({
        fields: [
          {
            name: 'name',
            action: RecommendationAction.KEEP,
            reason: 'Keep this field',
            severity: RecommendationSeverity.CRITICAL,
          },
        ],
        toolkits: [
          {
            toolkit: 'test-toolkit',
            tools: [
              {
                name: 'tool1',
                action: RecommendationAction.KEEP,
                reason: 'Keep this tool',
                severity: RecommendationSeverity.CRITICAL,
              },
            ],
          },
        ],
        context: [
          {
            name: 'context1',
            action: RecommendationAction.KEEP,
            reason: 'Keep this context',
            severity: RecommendationSeverity.CRITICAL,
          },
        ],
      })
      expectFallbackMessage()
    })

    it('should render fallback message when all recommendations have no reason', () => {
      renderComponent({
        fields: [
          {
            name: 'name',
            action: RecommendationAction.CHANGE,
            severity: RecommendationSeverity.CRITICAL,
          },
        ],
        toolkits: [
          {
            toolkit: 'test-toolkit',
            tools: [
              {
                name: 'tool1',
                action: RecommendationAction.DELETE,
                severity: RecommendationSeverity.CRITICAL,
              },
            ],
          },
        ],
        context: [
          {
            name: 'context1',
            action: RecommendationAction.ADD,
            severity: RecommendationSeverity.CRITICAL,
          },
        ],
      })
      expectFallbackMessage()
    })
  })

  describe('Field recommendations', () => {
    it('should render field recommendations with reasons', () => {
      renderComponent({
        fields: [
          {
            name: 'system_prompt',
            action: RecommendationAction.CHANGE,
            reason: 'System prompt needs to be more specific',
            severity: RecommendationSeverity.CRITICAL,
          },
        ],
      })

      expect(screen.getByText('System Prompt')).toBeInTheDocument()
      expect(screen.getByText('System prompt needs to be more specific')).toBeInTheDocument()
    })

    it('should render multiple field recommendations', () => {
      renderComponent({
        fields: [
          {
            name: 'name',
            action: RecommendationAction.CHANGE,
            reason: 'Name should be more descriptive',
            severity: RecommendationSeverity.CRITICAL,
          },
          {
            name: 'description',
            action: RecommendationAction.ADD,
            reason: 'Add a detailed description',
            severity: RecommendationSeverity.OPTIONAL,
          },
        ],
      })

      expect(screen.getByText('Name')).toBeInTheDocument()
      expect(screen.getByText('Name should be more descriptive')).toBeInTheDocument()
      expect(screen.getByText('Description')).toBeInTheDocument()
      expect(screen.getByText('Add a detailed description')).toBeInTheDocument()
    })

    it('should not render field recommendations with KEEP action', () => {
      renderComponent({
        fields: [
          {
            name: 'name',
            action: RecommendationAction.KEEP,
            reason: 'Name is good',
            severity: RecommendationSeverity.CRITICAL,
          },
          {
            name: 'description',
            action: RecommendationAction.CHANGE,
            reason: 'Description needs improvement',
            severity: RecommendationSeverity.CRITICAL,
          },
        ],
      })

      expect(screen.queryByText('Name is good')).not.toBeInTheDocument()
      expect(screen.getByText('Description')).toBeInTheDocument()
      expect(screen.getByText('Description needs improvement')).toBeInTheDocument()
    })

    it('should humanize field names', () => {
      renderComponent({
        fields: [
          {
            name: 'system_prompt',
            action: RecommendationAction.CHANGE,
            reason: 'Improve prompt',
            severity: RecommendationSeverity.CRITICAL,
          },
          {
            name: 'conversation_starters',
            action: RecommendationAction.ADD,
            reason: 'Add starters',
            severity: RecommendationSeverity.OPTIONAL,
          },
        ],
      })

      expect(screen.getByText('System Prompt')).toBeInTheDocument()
      expect(screen.getByText('Conversation Starters')).toBeInTheDocument()
    })
  })

  describe('Toolkit recommendations', () => {
    it('should render toolkit recommendations with tools', () => {
      renderComponent({
        toolkits: [
          {
            toolkit: 'web_search',
            tools: [
              {
                name: 'search_google',
                action: RecommendationAction.ADD,
                reason: 'Add Google search capability',
                severity: RecommendationSeverity.CRITICAL,
              },
            ],
          },
        ],
      })

      expect(screen.getByText('web_search Toolkit')).toBeInTheDocument()
      expect(screen.getByText('Search Google')).toBeInTheDocument()
      expect(screen.getByText('Add Google search capability')).toBeInTheDocument()
    })

    it('should render multiple tools within a toolkit', () => {
      renderComponent({
        toolkits: [
          {
            toolkit: 'database',
            tools: [
              {
                name: 'query_db',
                action: RecommendationAction.CHANGE,
                reason: 'Improve query efficiency',
                severity: RecommendationSeverity.CRITICAL,
              },
              {
                name: 'update_db',
                action: RecommendationAction.DELETE,
                reason: 'Remove unused tool',
                severity: RecommendationSeverity.OPTIONAL,
              },
            ],
          },
        ],
      })

      expect(screen.getByText('database Toolkit')).toBeInTheDocument()
      expect(screen.getByText('Query Db')).toBeInTheDocument()
      expect(screen.getByText('Improve query efficiency')).toBeInTheDocument()
      expect(screen.getByText('Update Db')).toBeInTheDocument()
      expect(screen.getByText('Remove unused tool')).toBeInTheDocument()
    })

    it('should not render toolkit if all tools have KEEP action', () => {
      renderComponent({
        toolkits: [
          {
            toolkit: 'file_system',
            tools: [
              {
                name: 'read_file',
                action: RecommendationAction.KEEP,
                reason: 'Tool is fine',
                severity: RecommendationSeverity.CRITICAL,
              },
            ],
          },
        ],
      })

      expect(screen.queryByText('file_system Toolkit')).not.toBeInTheDocument()
      expect(screen.queryByText('Read File')).not.toBeInTheDocument()
    })

    it('should not render toolkit if all tools have no reason', () => {
      renderComponent({
        toolkits: [
          {
            toolkit: 'api',
            tools: [
              {
                name: 'call_api',
                action: RecommendationAction.CHANGE,
                severity: RecommendationSeverity.CRITICAL,
              },
            ],
          },
        ],
      })

      expect(screen.queryByText('api Toolkit')).not.toBeInTheDocument()
    })

    it('should flatten duplicate toolkits', () => {
      renderComponent({
        toolkits: [
          {
            toolkit: 'web',
            tools: [
              {
                name: 'fetch',
                action: RecommendationAction.ADD,
                reason: 'Add fetch',
                severity: RecommendationSeverity.CRITICAL,
              },
            ],
          },
          {
            toolkit: 'web',
            tools: [
              {
                name: 'post',
                action: RecommendationAction.ADD,
                reason: 'Add post',
                severity: RecommendationSeverity.OPTIONAL,
              },
            ],
          },
        ],
      })

      const toolkitHeaders = screen.getAllByText(/web Toolkit/i)
      expect(toolkitHeaders).toHaveLength(1)
      expect(screen.getByText('Fetch')).toBeInTheDocument()
      expect(screen.getByText('Post')).toBeInTheDocument()
    })
  })

  describe('Context recommendations', () => {
    it('should render context recommendations', () => {
      renderComponent({
        context: [
          {
            name: 'knowledge_base_1',
            action: RecommendationAction.ADD,
            reason: 'Add knowledge base for better context',
            severity: RecommendationSeverity.CRITICAL,
          },
        ],
      })

      expect(screen.getByText('Datasource Knowledge Base 1')).toBeInTheDocument()
      expect(screen.getByText('Add knowledge base for better context')).toBeInTheDocument()
    })

    it('should render multiple context recommendations', () => {
      renderComponent({
        context: [
          {
            name: 'kb_docs',
            action: RecommendationAction.ADD,
            reason: 'Add documentation',
            severity: RecommendationSeverity.CRITICAL,
          },
          {
            name: 'kb_faq',
            action: RecommendationAction.CHANGE,
            reason: 'Update FAQ data',
            severity: RecommendationSeverity.OPTIONAL,
          },
        ],
      })

      expect(screen.getByText('Datasource Kb Docs')).toBeInTheDocument()
      expect(screen.getByText('Add documentation')).toBeInTheDocument()
      expect(screen.getByText('Datasource Kb Faq')).toBeInTheDocument()
      expect(screen.getByText('Update FAQ data')).toBeInTheDocument()
    })

    it('should not render context with KEEP action', () => {
      renderComponent({
        context: [
          {
            name: 'kb_1',
            action: RecommendationAction.KEEP,
            reason: 'Context is good',
            severity: RecommendationSeverity.CRITICAL,
          },
        ],
      })

      expect(screen.queryByText('Datasource Kb 1')).not.toBeInTheDocument()
      expect(screen.queryByText('Context is good')).not.toBeInTheDocument()
    })
  })

  describe('Mixed recommendations', () => {
    it('should render all types of recommendations together', () => {
      renderComponent({
        fields: [
          {
            name: 'name',
            action: RecommendationAction.CHANGE,
            reason: 'Improve name',
            severity: RecommendationSeverity.CRITICAL,
          },
        ],
        toolkits: [
          {
            toolkit: 'web',
            tools: [
              {
                name: 'fetch',
                action: RecommendationAction.ADD,
                reason: 'Add fetch tool',
                severity: RecommendationSeverity.CRITICAL,
              },
            ],
          },
        ],
        context: [
          {
            name: 'kb_docs',
            action: RecommendationAction.ADD,
            reason: 'Add documentation',
            severity: RecommendationSeverity.OPTIONAL,
          },
        ],
      })

      expect(screen.getByText('Name')).toBeInTheDocument()
      expect(screen.getByText('Improve name')).toBeInTheDocument()
      expect(screen.getByText('web Toolkit')).toBeInTheDocument()
      expect(screen.getByText('Fetch')).toBeInTheDocument()
      expect(screen.getByText('Add fetch tool')).toBeInTheDocument()
      expect(screen.getByText('Datasource Kb Docs')).toBeInTheDocument()
      expect(screen.getByText('Add documentation')).toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    it('should apply bg-gradient1 class to field recommendations', () => {
      const { container } = renderComponent({
        fields: [
          {
            name: 'name',
            action: RecommendationAction.CHANGE,
            reason: 'Change name',
            severity: RecommendationSeverity.CRITICAL,
          },
        ],
      })

      const listItem = container.querySelector('.bg-gradient1')
      expect(listItem).toBeInTheDocument()
      expect(listItem).toHaveClass('rounded-lg', 'py-3', 'px-4')
    })

    it('should apply bg-gradient1 to fallback message', () => {
      const { container } = renderComponent({})

      const fallbackDiv = container.querySelector('.bg-gradient1')
      expect(fallbackDiv).toBeInTheDocument()
      expect(fallbackDiv).toHaveClass('rounded-lg', 'py-3', 'px-4')
    })

    it('should have scrollable container with show-scroll class', () => {
      const { container } = renderComponent({})

      const scrollContainer = container.querySelector('.show-scroll')
      expect(scrollContainer).toBeInTheDocument()
      expect(scrollContainer).toHaveClass('max-h-96', 'overflow-y-auto')
    })

    it('should render AI icon in recommendations', () => {
      const { container } = renderComponent({
        fields: [
          {
            name: 'name',
            action: RecommendationAction.CHANGE,
            reason: 'Change name',
            severity: RecommendationSeverity.CRITICAL,
          },
        ],
      })

      const icon = container.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })
  })

  describe('Edge cases', () => {
    it('should handle undefined fields array', () => {
      renderComponent({
        fields: undefined,
        toolkits: [
          {
            toolkit: 'web',
            tools: [
              {
                name: 'fetch',
                action: RecommendationAction.ADD,
                reason: 'Add fetch',
                severity: RecommendationSeverity.CRITICAL,
              },
            ],
          },
        ],
      })

      expect(screen.getByText('web Toolkit')).toBeInTheDocument()
    })

    it('should handle undefined toolkits array', () => {
      renderComponent({
        fields: [
          {
            name: 'name',
            action: RecommendationAction.CHANGE,
            reason: 'Change name',
            severity: RecommendationSeverity.CRITICAL,
          },
        ],
        toolkits: undefined,
      })

      expect(screen.getByText('Name')).toBeInTheDocument()
    })

    it('should handle undefined context array', () => {
      renderComponent({
        context: undefined,
        fields: [
          {
            name: 'name',
            action: RecommendationAction.CHANGE,
            reason: 'Change name',
            severity: RecommendationSeverity.CRITICAL,
          },
        ],
      })

      expect(screen.getByText('Name')).toBeInTheDocument()
    })

    it('should handle empty arrays', () => {
      renderComponent({ fields: [], toolkits: [], context: [] })
      expectFallbackMessage()
    })

    it('should handle null reasons gracefully', () => {
      renderComponent({
        fields: [
          {
            name: 'name',
            action: RecommendationAction.CHANGE,
            reason: null,
            severity: RecommendationSeverity.CRITICAL,
          },
        ],
      })

      expect(screen.queryByText('Name')).not.toBeInTheDocument()
    })
  })
})
