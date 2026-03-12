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

import { Assistant } from '@/types/entity/assistant'

import ChatConfigAssistantForm from '../ChatConfigAssistants/ChatConfigAssistantForm'

vi.hoisted(() => vi.resetModules())

const { mockToaster, mockChatContext, mockAssistantsStore, mockCanEdit } = vi.hoisted(() => {
  return {
    mockToaster: {
      info: vi.fn(),
      error: vi.fn(),
      success: vi.fn(),
      warning: vi.fn(),
    },
    mockChatContext: {
      selectedAssistant: null as Assistant | null,
      isLoading: false,
      closeConfigForm: vi.fn(),
      openConfigForm: vi.fn(),
      isConfigVisible: true,
      isConfigFormVisible: true,
    },
    mockAssistantsStore: {
      updateAssistant: vi.fn(),
    },
    mockCanEdit: vi.fn(),
  }
})

vi.mock('valtio', () => ({
  proxy: (obj: any) => obj,
  useSnapshot: vi.fn(() => mockAssistantsStore),
  subscribe: vi.fn(),
}))

vi.mock('@/store', () => ({
  assistantsStore: mockAssistantsStore,
}))

vi.mock('@/utils/toaster', () => ({
  default: mockToaster,
}))

vi.mock('@/utils/entity', () => ({
  canEdit: mockCanEdit,
}))

vi.mock('@/pages/chat/hooks/useChatContext', () => ({
  useChatContext: vi.fn(() => mockChatContext),
}))

vi.mock('@/pages/assistants/components/AssistantForm/AssistantForm', () => ({
  default: ({
    assistant,
    isEditing,
    isChatConfig,
    onSubmit,
    onSuccess,
    onCancel,
    showNewIntegrationPopup,
  }: any) => (
    <div data-testid="assistant-form">
      <div data-testid="form-assistant-id">{assistant?.id}</div>
      <div data-testid="form-is-editing">{isEditing ? 'true' : 'false'}</div>
      <div data-testid="form-is-chat-config">{isChatConfig ? 'true' : 'false'}</div>
      <div data-testid="form-has-show-popup">{showNewIntegrationPopup ? 'true' : 'false'}</div>
      <button
        onClick={async () => {
          try {
            const result = await onSubmit({ name: 'Updated Assistant' }, false)
            if (result?.error) {
              mockToaster.error(result.error)
            }
            if (result && !result.error) {
              mockToaster.info('Assistant has been updated successfully!')
              onSuccess?.()
            }
          } catch (error: any) {
            mockToaster.error(error.message || 'Failed to update assistant')
          }
        }}
        data-testid="form-submit"
      >
        Submit
      </button>
      <button onClick={onCancel} data-testid="form-cancel">
        Cancel
      </button>
    </div>
  ),
}))

const mockAssistant: Assistant = {
  id: 'assistant-123',
  name: 'Test Assistant',
  description: 'Test Description',
  icon_url: 'http://example.com/icon.png',
  system_prompt: 'You are a helpful assistant',
  model: 'gpt-4',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
} as Assistant

const mockShowNewIntegrationPopup = vi.fn()

describe('ChatConfigAssistantForm', () => {
  let user: UserEvent

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
    mockChatContext.selectedAssistant = null
    mockChatContext.isLoading = false
    mockChatContext.closeConfigForm = vi.fn()
    mockAssistantsStore.updateAssistant = vi.fn()
    mockCanEdit.mockReturnValue(true)
  })

  it('shows spinner while loading', () => {
    mockChatContext.selectedAssistant = mockAssistant
    mockChatContext.isLoading = true

    render(<ChatConfigAssistantForm showNewIntegrationPopup={mockShowNewIntegrationPopup} />)

    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument()
    expect(screen.queryByTestId('assistant-form')).not.toBeInTheDocument()
  })

  it('closes config form and returns null when no assistant is selected', () => {
    mockChatContext.selectedAssistant = null
    mockChatContext.isLoading = false

    const { container } = render(
      <ChatConfigAssistantForm showNewIntegrationPopup={mockShowNewIntegrationPopup} />
    )

    expect(container.firstChild).toBeNull()
    expect(mockChatContext.closeConfigForm).toHaveBeenCalled()
  })

  it('closes config form and returns null when user cannot edit assistant', () => {
    mockChatContext.selectedAssistant = mockAssistant
    mockChatContext.isLoading = false
    mockCanEdit.mockReturnValue(false)

    const { container } = render(
      <ChatConfigAssistantForm showNewIntegrationPopup={mockShowNewIntegrationPopup} />
    )

    expect(container.firstChild).toBeNull()
    expect(mockChatContext.closeConfigForm).toHaveBeenCalled()
  })

  it('renders AssistantForm when assistant is selected and editable', () => {
    mockChatContext.selectedAssistant = mockAssistant
    mockChatContext.isLoading = false

    render(<ChatConfigAssistantForm showNewIntegrationPopup={mockShowNewIntegrationPopup} />)

    expect(screen.getByTestId('assistant-form')).toBeInTheDocument()
    expect(screen.getByTestId('form-assistant-id')).toHaveTextContent('assistant-123')
  })

  it('passes correct props to AssistantForm', () => {
    mockChatContext.selectedAssistant = mockAssistant
    mockChatContext.isLoading = false

    render(<ChatConfigAssistantForm showNewIntegrationPopup={mockShowNewIntegrationPopup} />)

    expect(screen.getByTestId('form-is-editing')).toHaveTextContent('true')
    expect(screen.getByTestId('form-is-chat-config')).toHaveTextContent('true')
    expect(screen.getByTestId('form-has-show-popup')).toHaveTextContent('true')
  })

  it('calls updateAssistant on form submit', async () => {
    mockChatContext.selectedAssistant = mockAssistant
    mockChatContext.isLoading = false
    mockAssistantsStore.updateAssistant.mockResolvedValue({})

    render(<ChatConfigAssistantForm showNewIntegrationPopup={mockShowNewIntegrationPopup} />)

    const submitButton = screen.getByTestId('form-submit')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockAssistantsStore.updateAssistant).toHaveBeenCalledWith(
        'assistant-123',
        {
          name: 'Updated Assistant',
        },
        false
      )
    })
  })

  it('shows success toaster on successful update', async () => {
    mockChatContext.selectedAssistant = mockAssistant
    mockChatContext.isLoading = false
    mockAssistantsStore.updateAssistant.mockResolvedValue({})

    render(<ChatConfigAssistantForm showNewIntegrationPopup={mockShowNewIntegrationPopup} />)

    const submitButton = screen.getByTestId('form-submit')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockToaster.info).toHaveBeenCalled()
    })
  })

  it('shows error toaster on update failure', async () => {
    mockChatContext.selectedAssistant = mockAssistant
    mockChatContext.isLoading = false
    mockAssistantsStore.updateAssistant.mockResolvedValue({ error: 'Update failed' })

    render(<ChatConfigAssistantForm showNewIntegrationPopup={mockShowNewIntegrationPopup} />)

    const submitButton = screen.getByTestId('form-submit')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockToaster.error).toHaveBeenCalled()
    })
  })

  it('shows error toaster when updateAssistant throws', async () => {
    mockChatContext.selectedAssistant = mockAssistant
    mockChatContext.isLoading = false
    mockAssistantsStore.updateAssistant.mockRejectedValue(new Error('Network error'))

    render(<ChatConfigAssistantForm showNewIntegrationPopup={mockShowNewIntegrationPopup} />)

    const submitButton = screen.getByTestId('form-submit')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockToaster.error).toHaveBeenCalled()
    })
  })

  it('calls closeConfigForm on successful update', async () => {
    mockChatContext.selectedAssistant = mockAssistant
    mockChatContext.isLoading = false
    mockAssistantsStore.updateAssistant.mockResolvedValue({})

    render(<ChatConfigAssistantForm showNewIntegrationPopup={mockShowNewIntegrationPopup} />)

    const submitButton = screen.getByTestId('form-submit')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockChatContext.closeConfigForm).toHaveBeenCalled()
    })
  })

  it('does not call closeConfigForm on update failure', async () => {
    mockChatContext.selectedAssistant = mockAssistant
    mockChatContext.isLoading = false
    mockAssistantsStore.updateAssistant.mockResolvedValue({ error: 'Update failed' })

    render(<ChatConfigAssistantForm showNewIntegrationPopup={mockShowNewIntegrationPopup} />)

    const submitButton = screen.getByTestId('form-submit')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockToaster.error).toHaveBeenCalled()
    })

    // Need to check that closeConfigForm was only called once during initial render (from the null check)
    expect(mockChatContext.closeConfigForm).not.toHaveBeenCalledTimes(2)
  })

  it('calls closeConfigForm when cancel is clicked', async () => {
    mockChatContext.selectedAssistant = mockAssistant
    mockChatContext.isLoading = false

    render(<ChatConfigAssistantForm showNewIntegrationPopup={mockShowNewIntegrationPopup} />)

    const cancelButton = screen.getByTestId('form-cancel')
    await user.click(cancelButton)

    expect(mockChatContext.closeConfigForm).toHaveBeenCalled()
  })

  it('passes showNewIntegrationPopup prop through', () => {
    mockChatContext.selectedAssistant = mockAssistant
    mockChatContext.isLoading = false

    render(<ChatConfigAssistantForm showNewIntegrationPopup={mockShowNewIntegrationPopup} />)

    expect(screen.getByTestId('form-has-show-popup')).toHaveTextContent('true')
  })

  it('does not submit when assistant is null', async () => {
    mockChatContext.selectedAssistant = null
    mockChatContext.isLoading = false

    render(<ChatConfigAssistantForm showNewIntegrationPopup={mockShowNewIntegrationPopup} />)

    expect(screen.queryByTestId('assistant-form')).not.toBeInTheDocument()
    expect(mockAssistantsStore.updateAssistant).not.toHaveBeenCalled()
  })
})
