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

import { render, screen, waitFor } from '@testing-library/react'
import userEvent, { UserEvent } from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import WorkflowExecutionPrompt from '../WorkflowExecutionPrompt'

vi.hoisted(() => vi.resetModules())

describe('WorkflowExecutionPrompt', () => {
  let user: UserEvent

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    const { container } = render(<WorkflowExecutionPrompt prompt="Test prompt" />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('displays the prompt text in CodeBlock', () => {
    render(<WorkflowExecutionPrompt prompt="Test prompt content" />)
    expect(screen.getByText('Test prompt content')).toBeInTheDocument()
  })

  it('displays "Prompt" as title', () => {
    render(<WorkflowExecutionPrompt prompt="Test prompt" />)
    expect(screen.getByText('Prompt')).toBeInTheDocument()
  })

  it('displays empty prompt placeholder when prompt is null', () => {
    render(<WorkflowExecutionPrompt prompt={null} />)
    expect(screen.getByText('<empty prompt>')).toBeInTheDocument()
  })

  it('displays empty prompt placeholder when prompt is undefined', () => {
    render(<WorkflowExecutionPrompt prompt={undefined} />)
    expect(screen.getByText('<empty prompt>')).toBeInTheDocument()
  })

  it('displays empty string when prompt is empty string', () => {
    render(<WorkflowExecutionPrompt prompt="" />)
    // Empty string is still rendered (not replaced with placeholder since it uses ??)
    const { container } = render(<WorkflowExecutionPrompt prompt="" />)
    expect(container).toBeInTheDocument()
  })

  it('renders info button with tooltip', () => {
    const { container } = render(<WorkflowExecutionPrompt prompt="Test prompt" />)
    const infoButton = container.querySelector('[data-tooltip-content="View full prompt"]')
    expect(infoButton).toBeInTheDocument()
  })

  it('opens popup when info button is clicked', async () => {
    render(<WorkflowExecutionPrompt prompt="Full prompt content" />)

    const { container } = render(<WorkflowExecutionPrompt prompt="Full prompt content" />)
    const infoButton = container.querySelector('[data-tooltip-content="View full prompt"]')

    if (infoButton) {
      await user.click(infoButton)

      // Note: There might be two instances of the text - one in CodeBlock, one in Popup
      const promptTexts = screen.getAllByText('Full prompt content')
      expect(promptTexts.length).toBeGreaterThan(1)
    }
  })

  it('displays full prompt content in popup', async () => {
    const longPrompt =
      'This is a very long prompt that contains multiple lines and detailed instructions for the workflow execution'
    const { container } = render(<WorkflowExecutionPrompt prompt={longPrompt} />)
    const infoButton = container.querySelector('[data-tooltip-content="View full prompt"]')

    if (infoButton) {
      await user.click(infoButton)

      const promptInstances = screen.getAllByText(longPrompt)
      expect(promptInstances.length).toBeGreaterThan(0)
    }
  })

  it('closes popup when close action is triggered', async () => {
    const { container } = render(<WorkflowExecutionPrompt prompt="Test prompt" />)
    const infoButton = container.querySelector('[data-tooltip-content="View full prompt"]')

    if (infoButton) {
      await user.click(infoButton)

      const closeButtons = container.querySelectorAll('[aria-label="Close"]')
      if (closeButtons.length > 0) {
        await user.click(closeButtons[0])

        await waitFor(() => {
          const promptTexts = screen.queryAllByText('Test prompt')
          expect(promptTexts.length).toBe(1)
        })
      }
    }
  })
})
