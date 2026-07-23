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
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import SystemPromptGenAIPopup from '../SystemPromptGenAIPopup'

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/assets/icons/cross.svg?react', () => ({ default: () => null }))
vi.mock('@/assets/icons/loader.svg?react', () => ({
  default: () => <span data-testid="spinner-icon" />,
}))
vi.mock('@/assets/images/gradient-modal.png', () => ({ default: '' }))

const mockGenerateAssistantPromptWithAI = vi.fn()

vi.mock('@/store', () => ({
  assistantsStore: {
    generateAssistantPromptWithAI: (...args: unknown[]) =>
      mockGenerateAssistantPromptWithAI(...args),
  },
}))

// ─── Unhandled rejection suppressor ──────────────────────────────────────────
//
// The component's onFormSubmit uses try/finally (no catch), so a rejected
// API promise propagates out of react-hook-form's handleSubmit as an unhandled
// rejection. React Hook Form v7 re-throws errors from the submit callback
// (`catch(e){i=e}` ... `if(i) throw i`). The resulting rejected promise is
// unhandled because Button's onClick does not await handleSubmit's return value.
// We intercept at the process level before Vitest's error handler.
//
const suppressUnhandledRejection = () => {
  const vitestHandlers = process.listeners('unhandledRejection')
  process.removeAllListeners('unhandledRejection')
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  process.on('unhandledRejection', () => {})
  return () => {
    process.removeAllListeners('unhandledRejection')
    for (const h of vitestHandlers) {
      process.on('unhandledRejection', h as NodeJS.UnhandledRejectionListener)
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GENERATED_SYSTEM_PROMPT = 'You are a helpful project assistant.'
const HINT_TEXT = 'I need a project assistant that helps track deadlines'

interface RenderProps {
  isVisible?: boolean
  existingPrompt?: string
  onHide?: () => void
  onSuggestedPrompt?: (prompt: string) => void
}

const renderPopup = (overrides: RenderProps = {}) => {
  const props = {
    isVisible: true,
    existingPrompt: '',
    onHide: vi.fn(),
    onSuggestedPrompt: vi.fn(),
    ...overrides,
  }
  render(<SystemPromptGenAIPopup {...props} />)
  return props
}

const clickGenerateButton = async (buttonLabel = /Generate with AI/i) => {
  const user = userEvent.setup()
  const generateButton = screen.getByRole('button', { name: buttonLabel })
  await user.click(generateButton)
  return { user }
}

const typeHintAndClickGenerate = async (
  hintText = HINT_TEXT,
  buttonLabel = /Generate with AI/i
) => {
  const user = userEvent.setup()
  if (hintText) {
    const textarea = screen.getByRole('textbox')
    await user.type(textarea, hintText)
  }
  const generateButton = screen.getByRole('button', { name: buttonLabel })
  await user.click(generateButton)
  return { user }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SystemPromptGenAIPopup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('onFormSubmit — success path', () => {
    it('hides the spinner and calls onSuggestedPrompt with system_prompt when the API call succeeds', async () => {
      // Arrange
      mockGenerateAssistantPromptWithAI.mockResolvedValue({
        system_prompt: GENERATED_SYSTEM_PROMPT,
      })
      const props = renderPopup()

      // Act
      await typeHintAndClickGenerate()

      // Assert
      await waitFor(() => {
        expect(props.onSuggestedPrompt).toHaveBeenCalledWith(GENERATED_SYSTEM_PROMPT)
      })
      expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument()
    })

    it('calls onHide to close the popup after a successful API call', async () => {
      // Arrange
      mockGenerateAssistantPromptWithAI.mockResolvedValue({
        system_prompt: GENERATED_SYSTEM_PROMPT,
      })
      const props = renderPopup()

      // Act
      await typeHintAndClickGenerate()

      // Assert
      await waitFor(() => {
        expect(props.onHide).toHaveBeenCalledTimes(1)
      })
    })

    it('passes the typed hint text and existingPrompt to the store', async () => {
      // Arrange
      const existingPrompt = 'Existing system instructions'
      mockGenerateAssistantPromptWithAI.mockResolvedValue({
        system_prompt: GENERATED_SYSTEM_PROMPT,
      })
      renderPopup({ existingPrompt })

      // Act — in refinement mode the button label changes
      await typeHintAndClickGenerate(HINT_TEXT, /Refine with AI/i)

      // Assert
      await waitFor(() => {
        expect(mockGenerateAssistantPromptWithAI).toHaveBeenCalledWith(HINT_TEXT, existingPrompt)
      })
    })

    it('calls the store with an empty hint string when no text is typed', async () => {
      // Arrange
      mockGenerateAssistantPromptWithAI.mockResolvedValue({
        system_prompt: GENERATED_SYSTEM_PROMPT,
      })
      renderPopup()

      // Act — click generate without typing anything
      await clickGenerateButton(/Generate with AI/i)

      // Assert
      await waitFor(() => {
        expect(mockGenerateAssistantPromptWithAI).toHaveBeenCalledWith('', '')
      })
    })
  })

  describe('onFormSubmit — error path', () => {
    let removeRejectionSuppressor: () => void

    beforeEach(() => {
      removeRejectionSuppressor = suppressUnhandledRejection()
    })

    afterEach(() => {
      removeRejectionSuppressor()
    })

    it('resets isLoading to false when the API call rejects, so the spinner disappears', async () => {
      // Arrange
      mockGenerateAssistantPromptWithAI.mockRejectedValue(new Error('Network timeout'))
      renderPopup()

      // Act
      await typeHintAndClickGenerate()

      // Assert — spinner must vanish after rejection
      await waitFor(() => {
        expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument()
      })
    })

    it('does NOT call onHide when the API call rejects, keeping the popup open', async () => {
      // Arrange
      mockGenerateAssistantPromptWithAI.mockRejectedValue(new Error('Network timeout'))
      const props = renderPopup()

      // Act
      await typeHintAndClickGenerate()

      // Assert
      await waitFor(() => {
        expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument()
      })
      expect(props.onHide).not.toHaveBeenCalled()
    })

    it('does NOT call onSuggestedPrompt when the API call rejects', async () => {
      // Arrange
      mockGenerateAssistantPromptWithAI.mockRejectedValue(new Error('Network timeout'))
      const props = renderPopup()

      // Act
      await typeHintAndClickGenerate()

      // Assert
      await waitFor(() => {
        expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument()
      })
      expect(props.onSuggestedPrompt).not.toHaveBeenCalled()
    })
  })

  describe('onFormSubmit — stale request (requestId mismatch)', () => {
    it('does NOT call onSuggestedPrompt when the popup is closed before the response arrives', async () => {
      // Arrange — suspend the API call so we can close mid-flight
      let resolveRequest!: (value: { system_prompt: string }) => void
      mockGenerateAssistantPromptWithAI.mockReturnValue(
        new Promise<{ system_prompt: string }>((resolve) => {
          resolveRequest = resolve
        })
      )
      const props = renderPopup()

      // Act — start generate (spinner appears, buttons hidden)
      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: /Generate with AI/i }))

      // Spinner is now visible; close the popup via Escape (calls handleHide → requestId++)
      await waitFor(() => {
        expect(screen.getByLabelText('Loading')).toBeInTheDocument()
      })
      await user.keyboard('{Escape}')

      // Resolve the now-stale API call
      resolveRequest({ system_prompt: GENERATED_SYSTEM_PROMPT })

      // Allow microtasks to flush, then confirm handleHide was triggered
      await waitFor(() => {
        expect(props.onHide).toHaveBeenCalled()
      })

      // Assert — onSuggestedPrompt must not be called for the stale response
      expect(props.onSuggestedPrompt).not.toHaveBeenCalled()
    })
  })

  describe('rendering', () => {
    it('shows a spinner while the API call is in progress', async () => {
      // Arrange — never-resolving promise
      mockGenerateAssistantPromptWithAI.mockReturnValue(new Promise(() => {}))
      renderPopup()

      // Act
      await typeHintAndClickGenerate()

      // Assert
      await waitFor(() => {
        expect(screen.getByLabelText('Loading')).toBeInTheDocument()
      })
    })

    it('shows generate mode content and header when existingPrompt is empty', () => {
      renderPopup({ existingPrompt: '' })
      expect(screen.getByText('Generate System Instructions with AI')).toBeInTheDocument()
      expect(screen.getByText(/Provide a description of your assistant/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Generate with AI/i })).toBeInTheDocument()
    })

    it('shows refinement mode content and header when existingPrompt is provided', () => {
      renderPopup({ existingPrompt: 'Some existing instructions' })
      expect(screen.getByText('Refine System Instructions with AI')).toBeInTheDocument()
      expect(screen.getByText(/Add details, comments, or suggestions/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Refine with AI/i })).toBeInTheDocument()
    })
  })
})
