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

import { AssistantAIGeneratedFields } from '@/types/entity/assistant'

import FormGenAIPopup from '../FormGenAIPopup'

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/assets/icons/cross.svg?react', () => ({ default: () => null }))
vi.mock('@/assets/icons/loader.svg?react', () => ({
  default: () => <span data-testid="spinner-icon" />,
}))
vi.mock('@/assets/images/gradient-modal.png', () => ({ default: '' }))

const mockGenerateAssistantWithAI = vi.fn()
const mockSetShowNewAssistantAIPopup = vi.fn()

vi.mock('@/store', () => ({
  assistantsStore: {
    generateAssistantWithAI: (...args: unknown[]) => mockGenerateAssistantWithAI(...args),
    setShowNewAssistantAIPopup: (...args: unknown[]) => mockSetShowNewAssistantAIPopup(...args),
  },
}))

// ─── Unhandled rejection suppressor ──────────────────────────────────────────
//
// The component's handleGenerateClick uses try/finally (no catch), so a rejected
// API promise propagates out of react-hook-form's handleSubmit as an unhandled
// rejection. We suppress these in tests that deliberately exercise the error
// path so Vitest does not treat them as test failures.
//
// React Hook Form v7 re-throws errors from the submit callback (see its
// handleSubmit implementation: `catch(e){i=e}` ... `if(i) throw i`). The
// resulting rejected promise is unhandled because Button's onClick does not
// await it. We intercept at the process level before Vitest's error handler.
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

const MOCK_GENERATED_FIELDS: AssistantAIGeneratedFields = {
  name: 'Project Assistant',
  description: 'Helps track deadlines',
  conversation_starters: ['What is the deadline?'],
  system_prompt: 'You are a project assistant.',
  toolkits: [],
  categories: ['Productivity'],
}

const PROMPT_TEXT = 'I need a project assistant that helps track deadlines'

interface RenderProps {
  isVisible?: boolean
  onHide?: () => void
  onGenerated?: (fields: AssistantAIGeneratedFields) => void
}

const renderPopup = (overrides: RenderProps = {}) => {
  const props = {
    isVisible: true,
    onHide: vi.fn(),
    onGenerated: vi.fn(),
    ...overrides,
  }
  render(<FormGenAIPopup {...props} />)
  return props
}

const typePromptAndClickGenerate = async (promptText = PROMPT_TEXT) => {
  const user = userEvent.setup()
  const textarea = screen.getByRole('textbox', { name: 'What should your assistant do?' })
  await user.type(textarea, promptText)
  const generateButton = screen.getByRole('button', { name: /Generate with AI/i })
  await user.click(generateButton)
  return { user }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('FormGenAIPopup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('handleGenerateClick — success path', () => {
    it('hides the spinner and calls onGenerated with the returned data when the API call succeeds', async () => {
      // Arrange
      mockGenerateAssistantWithAI.mockResolvedValue(MOCK_GENERATED_FIELDS)
      const props = renderPopup()

      // Act
      await typePromptAndClickGenerate()

      // Assert
      await waitFor(() => {
        expect(props.onGenerated).toHaveBeenCalledWith(MOCK_GENERATED_FIELDS)
      })

      // Spinner must not remain after completion
      expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument()
    })

    it('calls onHide to close the popup after a successful API call', async () => {
      // Arrange
      mockGenerateAssistantWithAI.mockResolvedValue(MOCK_GENERATED_FIELDS)
      const props = renderPopup()

      // Act
      await typePromptAndClickGenerate()

      // Assert
      await waitFor(() => {
        expect(props.onHide).toHaveBeenCalledTimes(1)
      })
    })

    it('passes the typed prompt and shouldIncludeTools flag to the store', async () => {
      // Arrange
      mockGenerateAssistantWithAI.mockResolvedValue(MOCK_GENERATED_FIELDS)
      renderPopup()

      // Act
      await typePromptAndClickGenerate(PROMPT_TEXT)

      // Assert
      await waitFor(() => {
        expect(mockGenerateAssistantWithAI).toHaveBeenCalledWith(PROMPT_TEXT, true)
      })
    })
  })

  describe('handleGenerateClick — error path', () => {
    let removeRejectionSuppressor: () => void

    beforeEach(() => {
      removeRejectionSuppressor = suppressUnhandledRejection()
    })

    afterEach(() => {
      removeRejectionSuppressor()
    })

    it('resets isLoading to false when the API call rejects, so the spinner disappears', async () => {
      // Arrange
      mockGenerateAssistantWithAI.mockRejectedValue(new Error('Network timeout'))
      renderPopup()

      // Act
      await typePromptAndClickGenerate()

      // Assert — spinner must be gone after the rejection is handled
      await waitFor(() => {
        expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument()
      })
    })

    it('does NOT call onHide when the API call rejects, keeping the popup open', async () => {
      // Arrange
      mockGenerateAssistantWithAI.mockRejectedValue(new Error('Network timeout'))
      const props = renderPopup()

      // Act
      await typePromptAndClickGenerate()

      // Assert
      await waitFor(() => {
        // Wait for the rejection to be handled (spinner gone = rejection processed)
        expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument()
      })
      expect(props.onHide).not.toHaveBeenCalled()
    })

    it('does NOT call onGenerated when the API call rejects', async () => {
      // Arrange
      mockGenerateAssistantWithAI.mockRejectedValue(new Error('Network timeout'))
      const props = renderPopup()

      // Act
      await typePromptAndClickGenerate()

      // Assert
      await waitFor(() => {
        expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument()
      })
      expect(props.onGenerated).not.toHaveBeenCalled()
    })
  })

  describe('handleGenerateClick — stale request (requestId mismatch)', () => {
    it('does NOT call onGenerated when the popup is closed before the response arrives', async () => {
      // Arrange — suspend the API call so we can close mid-flight
      let resolveRequest!: (value: AssistantAIGeneratedFields) => void
      mockGenerateAssistantWithAI.mockReturnValue(
        new Promise<AssistantAIGeneratedFields>((resolve) => {
          resolveRequest = resolve
        })
      )
      const props = renderPopup()

      // Act — start generate (spinner appears, buttons hidden)
      const user = userEvent.setup()
      const textarea = screen.getByRole('textbox', { name: 'What should your assistant do?' })
      await user.type(textarea, PROMPT_TEXT)
      await user.click(screen.getByRole('button', { name: /Generate with AI/i }))

      // Spinner is now visible; close the popup via Escape (calls handleHide → requestId++)
      await waitFor(() => {
        expect(screen.getByLabelText('Loading')).toBeInTheDocument()
      })
      await user.keyboard('{Escape}')

      // Resolve the now-stale API call
      resolveRequest(MOCK_GENERATED_FIELDS)

      // Allow microtasks to flush
      await waitFor(() => {
        expect(props.onHide).toHaveBeenCalled()
      })

      // Assert — onGenerated must not be called for the stale response
      expect(props.onGenerated).not.toHaveBeenCalled()
    })
  })

  describe('rendering', () => {
    it('shows a spinner while the API call is in progress', async () => {
      // Arrange — never-resolving promise so spinner stays visible
      mockGenerateAssistantWithAI.mockReturnValue(new Promise(() => {}))
      renderPopup()

      // Act
      await typePromptAndClickGenerate()

      // Assert
      await waitFor(() => {
        expect(screen.getByLabelText('Loading')).toBeInTheDocument()
      })
    })

    it('shows the form content when not loading', () => {
      renderPopup()
      expect(screen.getByText(/Describe your ideal assistant/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Generate with AI/i })).toBeInTheDocument()
    })

    it('shows the Generate assistant header', () => {
      renderPopup()
      expect(screen.getByText('Generate Assistant with AI')).toBeInTheDocument()
    })
  })
})
