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

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'

import { UnsavedChangesProvider } from '@/hooks/useUnsavedChangesWarning'
import { Assistant, AgentCard } from '@/types/entity/assistant'

import RemoteAssistantForm from '../RemoteAssistantForm'

vi.hoisted(() => vi.resetModules())

beforeAll(() => {
  const originalError = console.error
  vi.spyOn(console, 'error').mockImplementation((...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Could not parse CSS stylesheet') ||
        args[0].includes('Error: Could not parse CSS') ||
        args[0].includes('Warning: Function components cannot be given refs'))
    ) {
      return
    }
    originalError.call(console, ...args)
  })
})

const mockGetRemoteAssistant = vi.fn()
const mockIndexSettings = vi.fn()

vi.mock('@/utils/toaster', () => ({
  __esModule: true,
  default: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('@/store', () => ({
  assistantsStore: {
    getRemoteAssistant: (...args: any[]) => mockGetRemoteAssistant(...args),
  },
}))

vi.mock('@/store/settings', () => ({
  settingsStore: {
    indexSettings: (...args: any[]) => mockIndexSettings(...args),
  },
}))

const renderWithProvider = (ui: React.ReactElement) => {
  return render(<UnsavedChangesProvider>{ui}</UnsavedChangesProvider>)
}

describe('RemoteAssistantForm', () => {
  const mockOnSubmit = vi.fn()
  const mockOnValidityChange = vi.fn()
  const mockOnCancel = vi.fn()

  const mockAgentCard: AgentCard = {
    name: 'Test Remote Agent',
    description: 'Test description',
    version: '1.0.0',
    url: 'https://example.com',
    capabilities: {
      streaming: true,
      pushNotifications: false,
      stateTransitionHistory: true,
    },
    defaultInputModes: ['text', 'voice'],
    defaultOutputModes: ['text', 'json'],
  }

  const mockAssistant: Assistant = {
    id: 'assistant-1',
    name: 'Test Assistant',
    slug: 'test-assistant',
    description: 'Test description',
    is_global: false,
    shared: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    system_prompt: 'Test prompt',
    llm_model_type: 'gpt-4',
    project: 'project1',
    agent_card: mockAgentCard,
    integration_id: 'integration-1',
    mcp_servers: [],
    system_prompt_history: [],
    guardrail_assignments: [],
  } as Assistant

  beforeEach(() => {
    vi.clearAllMocks()
    mockIndexSettings.mockResolvedValue({})
    mockGetRemoteAssistant.mockResolvedValue(mockAgentCard)
  })

  describe('Rendering - Create Mode', () => {
    it('renders the form in create mode', () => {
      renderWithProvider(<RemoteAssistantForm onSubmit={mockOnSubmit} />)

      expect(screen.getByText('Assistant Setup')).toBeInTheDocument()
      expect(
        screen.getByText("Define the assistant's name, project, and visibility.")
      ).toBeInTheDocument()
    })

    it('renders all form fields', () => {
      renderWithProvider(<RemoteAssistantForm onSubmit={mockOnSubmit} />)

      expect(screen.getByText('Project name:')).toBeInTheDocument()
      expect(screen.getByText('Shared with project')).toBeInTheDocument()
      expect(screen.getByText('Integration (Optional)')).toBeInTheDocument()
      expect(screen.getByText('Assistant URL')).toBeInTheDocument()
    })

    it('renders fetch button in create mode', () => {
      renderWithProvider(<RemoteAssistantForm onSubmit={mockOnSubmit} />)

      expect(screen.getByText('Fetch')).toBeInTheDocument()
    })

    it('does not render assistant name field initially', () => {
      renderWithProvider(<RemoteAssistantForm onSubmit={mockOnSubmit} />)

      expect(screen.queryByText('Assistant Name')).not.toBeInTheDocument()
    })

    it('shows URL helper text', () => {
      renderWithProvider(<RemoteAssistantForm onSubmit={mockOnSubmit} />)

      expect(screen.getByText(/URL will be appended with/)).toBeInTheDocument()
      expect(screen.getByText('/.well-known/agent.json', { exact: false })).toBeInTheDocument()
    })

    it('shows integration helper text', () => {
      renderWithProvider(<RemoteAssistantForm onSubmit={mockOnSubmit} />)

      expect(screen.getByText(/Select an A2A integration to use/)).toBeInTheDocument()
    })
  })

  describe('Rendering - Edit Mode', () => {
    it('renders the form in edit mode with assistant data', () => {
      renderWithProvider(
        <RemoteAssistantForm assistant={mockAssistant} isEditing onSubmit={mockOnSubmit} />
      )

      expect(screen.getByText('Assistant Setup')).toBeInTheDocument()
    })

    it('pre-fills URL field with assistant data', () => {
      renderWithProvider(
        <RemoteAssistantForm assistant={mockAssistant} isEditing onSubmit={mockOnSubmit} />
      )

      const urlInput = screen.getByLabelText(/Assistant URL/) as HTMLInputElement
      expect(urlInput.value).toBe('https://example.com')
    })

    it('disables URL field in edit mode', () => {
      renderWithProvider(
        <RemoteAssistantForm assistant={mockAssistant} isEditing onSubmit={mockOnSubmit} />
      )

      const urlInput = screen.getByLabelText(/Assistant URL/)
      expect(urlInput).toBeDisabled()
    })

    it('does not render fetch button in edit mode', () => {
      renderWithProvider(
        <RemoteAssistantForm assistant={mockAssistant} isEditing onSubmit={mockOnSubmit} />
      )

      expect(screen.queryByText('Fetch')).not.toBeInTheDocument()
    })

    it('shows fetched assistant card in edit mode', async () => {
      renderWithProvider(
        <RemoteAssistantForm assistant={mockAssistant} isEditing onSubmit={mockOnSubmit} />
      )

      await waitFor(() => {
        expect(screen.getByText('Assistant Card')).toBeInTheDocument()
      })
    })

    it('shows assistant name field in edit mode', () => {
      renderWithProvider(
        <RemoteAssistantForm assistant={mockAssistant} isEditing onSubmit={mockOnSubmit} />
      )

      expect(screen.getByText('Assistant Name')).toBeInTheDocument()
      const nameInput = screen.getByPlaceholderText(
        'Enter a name for the assistant'
      ) as HTMLInputElement
      expect(nameInput.value).toBe('Test Assistant')
    })

    it('shows read-only label for URL in edit mode', () => {
      renderWithProvider(
        <RemoteAssistantForm assistant={mockAssistant} isEditing onSubmit={mockOnSubmit} />
      )

      expect(screen.getByText(/read-only in edit mode/)).toBeInTheDocument()
    })
  })

  describe('Rendering - Chat Config Mode', () => {
    it('renders in chat config mode with different layout', () => {
      renderWithProvider(
        <RemoteAssistantForm isChatConfig onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      )

      expect(screen.getByText('Configure & Test')).toBeInTheDocument()
      expect(screen.queryByText('Assistant Setup')).not.toBeInTheDocument()
    })

    it('renders Save and Cancel buttons in chat config mode', () => {
      renderWithProvider(
        <RemoteAssistantForm isChatConfig onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      )

      expect(screen.getByText('Save')).toBeInTheDocument()
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    it('calls onCancel when Cancel button is clicked in chat config mode', async () => {
      renderWithProvider(
        <RemoteAssistantForm isChatConfig onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      )

      const cancelButton = screen.getByText('Cancel')
      fireEvent.click(cancelButton)

      expect(mockOnCancel).toHaveBeenCalledTimes(1)
    })
  })

  describe('Form Validation', () => {
    it('shows invalid URL error for malformed URL', async () => {
      const user = userEvent.setup()
      renderWithProvider(<RemoteAssistantForm onSubmit={mockOnSubmit} />)

      const urlInput = screen.getByPlaceholderText('e.g., example.com or localhost:8080')
      await user.type(urlInput, 'not-a-valid-url')
      await user.tab()

      await waitFor(
        () => {
          expect(screen.getByText('Please enter a valid URL')).toBeInTheDocument()
        },
        { timeout: 2000 }
      )
    })

    it('accepts valid URL formats', async () => {
      const user = userEvent.setup()
      renderWithProvider(<RemoteAssistantForm onSubmit={mockOnSubmit} />)

      const urlInput = screen.getByPlaceholderText('e.g., example.com or localhost:8080')
      await user.type(urlInput, 'https://example.com')
      await user.tab()

      await waitFor(() => {
        expect(screen.queryByText('Please enter a valid URL')).not.toBeInTheDocument()
      })
    })

    it('shows assistant name required error after fetching', async () => {
      const user = userEvent.setup()
      renderWithProvider(
        <RemoteAssistantForm assistant={mockAssistant} isEditing onSubmit={mockOnSubmit} />
      )

      const nameInput = screen.getByPlaceholderText('Enter a name for the assistant')
      await user.clear(nameInput)
      await user.tab()

      await waitFor(
        () => {
          expect(screen.getByText('Assistant name is required')).toBeInTheDocument()
        },
        { timeout: 2000 }
      )
    })
  })

  it('calls getRemoteAssistant when fetch button is clicked', async () => {
    const user = userEvent.setup()
    renderWithProvider(<RemoteAssistantForm onSubmit={mockOnSubmit} />)

    const urlInput = screen.getByPlaceholderText('e.g., example.com or localhost:8080')
    await user.type(urlInput, 'https://example.com')

    const fetchButton = screen.getByText('Fetch')
    fireEvent.click(fetchButton)

    await waitFor(() => {
      expect(mockGetRemoteAssistant).toHaveBeenCalledWith('https://example.com', '', undefined)
    })
  })

  it('shows loading state while fetching', async () => {
    const mockPromise = new Promise((resolve) => {
      setTimeout(() => resolve(mockAgentCard), 100)
    })
    mockGetRemoteAssistant.mockImplementation(() => mockPromise)

    const user = userEvent.setup()
    renderWithProvider(<RemoteAssistantForm onSubmit={mockOnSubmit} />)

    const urlInput = screen.getByPlaceholderText('e.g., example.com or localhost:8080')
    await user.type(urlInput, 'https://example.com')

    const fetchButton = screen.getByText('Fetch')
    fireEvent.click(fetchButton)

    // Check for loading spinner (RingSvg with animate-spin class)
    await waitFor(() => {
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })
  })

  it('displays RemoteAssistantFormCard after successful fetch', async () => {
    const user = userEvent.setup()
    renderWithProvider(<RemoteAssistantForm onSubmit={mockOnSubmit} />)

    const urlInput = screen.getByPlaceholderText('e.g., example.com or localhost:8080')
    await user.type(urlInput, 'https://example.com')

    const fetchButton = screen.getByText('Fetch')
    fireEvent.click(fetchButton)

    await waitFor(() => {
      expect(screen.getByText('Assistant Card')).toBeInTheDocument()
    })
  })

  it('auto-fills assistant name from fetched data', async () => {
    const user = userEvent.setup()
    renderWithProvider(<RemoteAssistantForm onSubmit={mockOnSubmit} />)

    const urlInput = screen.getByPlaceholderText('e.g., example.com or localhost:8080')
    await user.type(urlInput, 'https://example.com')

    const fetchButton = screen.getByText('Fetch')
    fireEvent.click(fetchButton)

    await waitFor(() => {
      const nameInput = screen.getByPlaceholderText(
        'Enter a name for the assistant'
      ) as HTMLInputElement
      expect(nameInput.value).toBe(mockAgentCard.name)
    })
  })

  it('does not auto-fill assistant name in edit mode', async () => {
    mockGetRemoteAssistant.mockResolvedValue({
      ...mockAgentCard,
      name: 'New Name From Fetch',
    })

    renderWithProvider(
      <RemoteAssistantForm assistant={mockAssistant} isEditing={false} onSubmit={mockOnSubmit} />
    )

    const urlInput = screen.getByPlaceholderText('e.g., example.com or localhost:8080')
    const user = userEvent.setup()
    await user.clear(urlInput)
    await user.type(urlInput, 'https://example.com')

    const fetchButton = screen.getByText('Fetch')
    fireEvent.click(fetchButton)

    await waitFor(() => {
      const nameInput = screen.getByPlaceholderText(
        'Enter a name for the assistant'
      ) as HTMLInputElement
      expect(nameInput.value).toBe('New Name From Fetch')
    })
  })

  it('handles fetch error gracefully', async () => {
    const toaster = await import('@/utils/toaster')
    mockGetRemoteAssistant.mockRejectedValue(new Error('Network error'))

    const user = userEvent.setup()
    renderWithProvider(<RemoteAssistantForm onSubmit={mockOnSubmit} />)

    const urlInput = screen.getByPlaceholderText('e.g., example.com or localhost:8080')
    await user.type(urlInput, 'https://example.com')

    const fetchButton = screen.getByText('Fetch')
    fireEvent.click(fetchButton)

    await waitFor(() => {
      expect(toaster.default.error).toHaveBeenCalledWith('Network error')
    })
  })

  it('disables fetch button when URL is invalid', async () => {
    const user = userEvent.setup()
    renderWithProvider(<RemoteAssistantForm onSubmit={mockOnSubmit} />)

    const urlInput = screen.getByPlaceholderText('e.g., example.com or localhost:8080')
    await user.type(urlInput, 'invalid-url')

    const fetchButton = screen.getByText('Fetch')
    expect(fetchButton).toBeDisabled()
  })

  it('can fetch on Enter key press', async () => {
    const user = userEvent.setup()
    renderWithProvider(<RemoteAssistantForm onSubmit={mockOnSubmit} />)

    const urlInput = screen.getByPlaceholderText('e.g., example.com or localhost:8080')
    await user.type(urlInput, 'https://example.com{Enter}')

    await waitFor(() => {
      expect(mockGetRemoteAssistant).toHaveBeenCalled()
    })
  })

  it('does not fetch on Enter in edit mode', async () => {
    renderWithProvider(
      <RemoteAssistantForm assistant={mockAssistant} isEditing onSubmit={mockOnSubmit} />
    )

    const urlInput = screen.getByPlaceholderText('e.g., example.com or localhost:8080')
    fireEvent.keyDown(urlInput, { key: 'Enter', code: 'Enter' })

    // Wait a bit to ensure no call was made
    await new Promise((resolve) => {
      setTimeout(resolve, 100)
    })
    expect(mockGetRemoteAssistant).not.toHaveBeenCalled()
  })

  it('shows refresh icon after assistant is fetched', async () => {
    const user = userEvent.setup()
    renderWithProvider(<RemoteAssistantForm onSubmit={mockOnSubmit} />)

    const urlInput = screen.getByPlaceholderText('e.g., example.com or localhost:8080')
    await user.type(urlInput, 'https://example.com')

    const fetchButton = screen.getByText('Fetch')
    fireEvent.click(fetchButton)

    await waitFor(() => {
      expect(screen.getByText('Assistant Card')).toBeInTheDocument()
    })

    // After fetch, button should show refresh icon (not "Fetch" text)
    expect(screen.queryByText('Fetch')).not.toBeInTheDocument()
  })

  describe('Validity Change Callback', () => {
    it('calls onValidityChange with false when no assistant is fetched', () => {
      renderWithProvider(
        <RemoteAssistantForm onSubmit={mockOnSubmit} onValidityChange={mockOnValidityChange} />
      )

      expect(mockOnValidityChange).toHaveBeenCalledWith(false)
    })

    it('calls onValidityChange with true when assistant is fetched', async () => {
      const user = userEvent.setup()
      renderWithProvider(
        <RemoteAssistantForm onSubmit={mockOnSubmit} onValidityChange={mockOnValidityChange} />
      )

      const urlInput = screen.getByLabelText('Assistant URL')
      await user.type(urlInput, 'https://example.com')

      const fetchButton = screen.getByText('Fetch')
      fireEvent.click(fetchButton)

      await waitFor(() => {
        expect(mockOnValidityChange).toHaveBeenCalledWith(true)
      })
    })

    it('calls onValidityChange with true in edit mode with existing agent_card', () => {
      renderWithProvider(
        <RemoteAssistantForm
          assistant={mockAssistant}
          isEditing
          onSubmit={mockOnSubmit}
          onValidityChange={mockOnValidityChange}
        />
      )

      expect(mockOnValidityChange).toHaveBeenCalledWith(true)
    })
  })

  describe('Imperative Handle (ref)', () => {
    it('exposes submit method through ref', async () => {
      const ref = { current: null as any }
      renderWithProvider(
        <RemoteAssistantForm
          ref={ref}
          assistant={mockAssistant}
          isEditing
          onSubmit={mockOnSubmit}
        />
      )

      await waitFor(() => {
        expect(ref.current).toBeDefined()
        expect(ref.current.submit).toBeDefined()
        expect(typeof ref.current.submit).toBe('function')
      })
    })

    it('exposes isValid property through ref', async () => {
      const ref = { current: null as any }
      renderWithProvider(
        <RemoteAssistantForm
          ref={ref}
          assistant={mockAssistant}
          isEditing
          onSubmit={mockOnSubmit}
        />
      )

      await waitFor(() => {
        expect(ref.current).toBeDefined()
        expect(ref.current.isValid).toBe(true)
      })
    })

    it('isValid is false when no assistant is fetched', async () => {
      const ref = { current: null as any }
      renderWithProvider(<RemoteAssistantForm ref={ref} onSubmit={mockOnSubmit} />)

      await waitFor(() => {
        expect(ref.current).toBeDefined()
        expect(ref.current.isValid).toBe(false)
      })
    })
  })

  describe('UI Interactions', () => {
    it('renders switch for shared with project', () => {
      renderWithProvider(<RemoteAssistantForm onSubmit={mockOnSubmit} />)

      const switchLabel = screen.getByText('Shared with project')
      expect(switchLabel).toBeInTheDocument()
    })

    it('shows placeholder for integration select', () => {
      renderWithProvider(<RemoteAssistantForm onSubmit={mockOnSubmit} />)

      expect(screen.getByPlaceholderText('Select an A2A integration')).toBeInTheDocument()
    })

    it('shows correct label for URL in create mode', () => {
      renderWithProvider(<RemoteAssistantForm onSubmit={mockOnSubmit} />)

      expect(screen.getByText('Assistant URL')).toBeInTheDocument()
      expect(screen.queryByText(/read-only/)).not.toBeInTheDocument()
    })

    it('applies correct styling in chat config mode', () => {
      const { container } = renderWithProvider(
        <RemoteAssistantForm isChatConfig onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      )

      const mainDiv = container.firstChild as HTMLElement
      expect(mainDiv).toHaveClass('overflow-y-auto')
    })
  })
})
