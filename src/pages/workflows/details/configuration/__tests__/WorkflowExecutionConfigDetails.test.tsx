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
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Workflow } from '@/types/entity/workflow'

import WorkflowExecutionConfigDetails from '../WorkflowExecutionConfigDetails'

vi.mock('@/utils/utils', async (importActual) => {
  const actual = await importActual<typeof import('@/utils/utils')>()
  return {
    ...actual,
    copyToClipboard: vi.fn(),
  }
})

vi.mock('@/utils/entity', () => ({
  canEdit: vi.fn(() => true),
}))

vi.mock('@/components/Avatar/Avatar', () => ({
  default: () => <div data-testid="avatar" />,
}))

const baseWorkflow: Workflow = {
  id: 'wf-1',
  name: 'My Workflow',
  slug: 'my-workflow',
  yaml_config: '',
  yaml_config_history: [],
  update_date: '2026-01-01T00:00:00Z',
  user_abilities: ['read', 'write', 'delete'],
}

describe('WorkflowExecutionConfigDetails', () => {
  it('renders workflow name, ID, and Configure button', () => {
    render(<WorkflowExecutionConfigDetails workflow={baseWorkflow} onConfigureClick={vi.fn()} />)

    expect(screen.getByText('My Workflow')).toBeInTheDocument()
    expect(screen.getByText(/ID: wf-1/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /configure/i })).toBeInTheDocument()
  })

  it('renders description when workflow has a description', () => {
    render(
      <WorkflowExecutionConfigDetails
        workflow={{ ...baseWorkflow, description: 'Automates the nightly report pipeline' }}
        onConfigureClick={vi.fn()}
      />
    )

    expect(screen.getByTestId('workflow-description')).toHaveTextContent(
      'Automates the nightly report pipeline'
    )
  })

  it('does not render description element when workflow has no description', () => {
    render(
      <WorkflowExecutionConfigDetails
        workflow={{ ...baseWorkflow, description: undefined }}
        onConfigureClick={vi.fn()}
      />
    )

    expect(screen.queryByTestId('workflow-description')).not.toBeInTheDocument()
  })

  describe('description overflow', () => {
    it('shows Show more toggle when description overflows 4 lines', () => {
      const scrollHeightSpy = vi
        .spyOn(HTMLElement.prototype, 'scrollHeight', 'get')
        .mockReturnValue(300)
      const clientHeightSpy = vi
        .spyOn(HTMLElement.prototype, 'clientHeight', 'get')
        .mockReturnValue(80)

      try {
        render(
          <WorkflowExecutionConfigDetails
            workflow={{ ...baseWorkflow, description: 'Long description text' }}
            onConfigureClick={vi.fn()}
          />
        )
        expect(screen.getByTestId('description-toggle')).toHaveTextContent('Show more')
      } finally {
        scrollHeightSpy.mockRestore()
        clientHeightSpy.mockRestore()
      }
    })

    it('does not show toggle when description fits within 4 lines', () => {
      const scrollHeightSpy = vi
        .spyOn(HTMLElement.prototype, 'scrollHeight', 'get')
        .mockReturnValue(60)
      const clientHeightSpy = vi
        .spyOn(HTMLElement.prototype, 'clientHeight', 'get')
        .mockReturnValue(60)

      try {
        render(
          <WorkflowExecutionConfigDetails
            workflow={{ ...baseWorkflow, description: 'Short text' }}
            onConfigureClick={vi.fn()}
          />
        )
        expect(screen.queryByTestId('description-toggle')).not.toBeInTheDocument()
      } finally {
        scrollHeightSpy.mockRestore()
        clientHeightSpy.mockRestore()
      }
    })

    it('expands and collapses description on toggle click', async () => {
      const user = userEvent.setup()
      const scrollHeightSpy = vi
        .spyOn(HTMLElement.prototype, 'scrollHeight', 'get')
        .mockReturnValue(300)
      const clientHeightSpy = vi
        .spyOn(HTMLElement.prototype, 'clientHeight', 'get')
        .mockReturnValue(80)

      try {
        render(
          <WorkflowExecutionConfigDetails
            workflow={{ ...baseWorkflow, description: 'Long description text' }}
            onConfigureClick={vi.fn()}
          />
        )

        const toggle = screen.getByTestId('description-toggle')
        expect(toggle).toHaveTextContent('Show more')
        expect(screen.getByTestId('workflow-description')).toHaveClass('line-clamp-4')

        await user.click(toggle)
        expect(screen.getByTestId('description-toggle')).toHaveTextContent('Show less')
        expect(screen.getByTestId('workflow-description')).not.toHaveClass('line-clamp-4')

        await user.click(screen.getByTestId('description-toggle'))
        expect(screen.getByTestId('description-toggle')).toHaveTextContent('Show more')
        expect(screen.getByTestId('workflow-description')).toHaveClass('line-clamp-4')
      } finally {
        scrollHeightSpy.mockRestore()
        clientHeightSpy.mockRestore()
      }
    })
  })
})
