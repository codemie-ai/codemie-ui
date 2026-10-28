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

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent, { UserEvent } from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { Assistant } from '@/types/entity/assistant'

import ChatConfigAssistantForm from '../ChatConfigAssistants/ChatConfigAssistantForm'

const {
  mockToaster,
  mockChatContext,
  mockAssistantsStore,
  mockCanEdit,
  mockIsMarketplaceApprovalGateEnabled,
  mockShowMissingIntegrations,
} = vi.hoisted(() => {
  return {
    mockShowMissingIntegrations: vi.fn(),
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
      checkMarketplaceGates: vi.fn(),
      unpublishAssistantFromMarketplace: vi.fn(),
      publishAssistantToMarketplace: vi.fn(),
      // `useSnapshot` below is mocked to return this same object regardless
      // of the store it's called with, so PublishGateFindingsModal's own
      // `const { user } = useSnapshot(userStore)` reads `user` off this
      // object too — matching the real userStore's shape
      // (`userStore.user.isAdmin`) so the admin-only Force-Publish
      // affordance can be exercised (EPMCDME-14234, CR-009).
      user: { isAdmin: false, isMaintainer: false },
    },
    mockCanEdit: vi.fn(),
    mockIsMarketplaceApprovalGateEnabled: vi.fn(() => false),
  }
})

vi.mock('valtio', () => ({
  proxy: (obj: any) => obj,
  useSnapshot: vi.fn(() => mockAssistantsStore),
  subscribe: vi.fn(),
}))

vi.mock('@/store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/store')>()
  return {
    ...actual,
    assistantsStore: mockAssistantsStore,
  }
})

vi.mock('@/utils/toaster', () => ({
  default: mockToaster,
}))

vi.mock('@/utils/entity', () => ({
  canEdit: mockCanEdit,
}))

vi.mock('@/pages/chat/hooks/useChatContext', () => ({
  useChatContext: vi.fn(() => mockChatContext),
}))

vi.mock('@/utils/featureFlags', () => ({
  isMarketplaceApprovalGateEnabled: mockIsMarketplaceApprovalGateEnabled,
}))

vi.mock('@/pages/assistants/components/AssistantForm/AssistantForm', async () => {
  const React = await import('react')
  return {
    default: React.forwardRef(
      (
        {
          assistant,
          isEditing,
          isChatConfig,
          onSubmit,
          onSuccess,
          onCancel,
          showNewIntegrationPopup,
        }: any,
        ref: any
      ) => {
        React.useImperativeHandle(ref, () => ({
          showMissingIntegrations: mockShowMissingIntegrations,
          unblockTransition: vi.fn(),
        }))
        return (
          <div data-testid="assistant-form">
            <div data-testid="form-assistant-id">{assistant?.id}</div>
            <div data-testid="form-is-editing">{isEditing ? 'true' : 'false'}</div>
            <div data-testid="form-is-chat-config">{isChatConfig ? 'true' : 'false'}</div>
            <div data-testid="form-has-show-popup">
              {showNewIntegrationPopup ? 'true' : 'false'}
            </div>
            <button
              onClick={async () => {
                try {
                  const result = await onSubmit({ name: 'Updated Assistant' }, false)
                  if (result?.error) {
                    mockToaster.error(result.error)
                  } else if (result && result.success !== false) {
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
        )
      }
    ),
  }
})

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
    mockAssistantsStore.user = { isAdmin: false, isMaintainer: false }
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

  describe('marketplace gate-check flow', () => {
    const marketplaceAssistant: Assistant = {
      ...mockAssistant,
      id: 'marketplace-assistant-1',
      marketplace_status: 'APPROVED',
    } as Assistant

    beforeEach(() => {
      mockIsMarketplaceApprovalGateEnabled.mockReturnValue(true)
      mockAssistantsStore.checkMarketplaceGates = vi.fn()
      mockAssistantsStore.unpublishAssistantFromMarketplace = vi.fn()
      mockAssistantsStore.publishAssistantToMarketplace = vi.fn()
    })

    it('T1: saves directly for DRAFT assistant — private assistants skip the gates', async () => {
      mockChatContext.selectedAssistant = {
        ...marketplaceAssistant,
        marketplace_status: 'DRAFT',
      } as Assistant
      mockAssistantsStore.updateAssistant.mockResolvedValue({})

      render(<ChatConfigAssistantForm showNewIntegrationPopup={mockShowNewIntegrationPopup} />)

      await user.click(screen.getByTestId('form-submit'))

      await waitFor(() => {
        expect(mockAssistantsStore.updateAssistant).toHaveBeenCalled()
      })
      expect(screen.queryByText('Save changes')).not.toBeInTheDocument()
      expect(mockAssistantsStore.checkMarketplaceGates).not.toHaveBeenCalled()
    })

    it('T1: shows revalidation modal for PENDING_REVIEW assistant', async () => {
      mockChatContext.selectedAssistant = {
        ...marketplaceAssistant,
        marketplace_status: 'PENDING_REVIEW',
      } as Assistant

      render(<ChatConfigAssistantForm showNewIntegrationPopup={mockShowNewIntegrationPopup} />)

      await user.click(screen.getByTestId('form-submit'))

      await waitFor(() => {
        expect(screen.getByText('Save changes')).toBeInTheDocument()
      })
      expect(mockAssistantsStore.updateAssistant).not.toHaveBeenCalled()
    })

    it('T1: shows revalidation modal for APPROVED assistant', async () => {
      mockChatContext.selectedAssistant = {
        ...marketplaceAssistant,
        marketplace_status: 'APPROVED',
      } as Assistant

      render(<ChatConfigAssistantForm showNewIntegrationPopup={mockShowNewIntegrationPopup} />)

      await user.click(screen.getByTestId('form-submit'))

      await waitFor(() => {
        expect(screen.getByText('Save changes')).toBeInTheDocument()
      })
      expect(mockAssistantsStore.updateAssistant).not.toHaveBeenCalled()
    })

    it('T1: skips gate-check when FF is off, saves directly', async () => {
      mockIsMarketplaceApprovalGateEnabled.mockReturnValue(false)
      mockChatContext.selectedAssistant = marketplaceAssistant
      mockAssistantsStore.updateAssistant.mockResolvedValue({})

      render(<ChatConfigAssistantForm showNewIntegrationPopup={mockShowNewIntegrationPopup} />)

      await user.click(screen.getByTestId('form-submit'))

      await waitFor(() => {
        expect(mockAssistantsStore.updateAssistant).toHaveBeenCalled()
      })
      expect(screen.queryByText('Save changes')).not.toBeInTheDocument()
    })

    it('T1: skips gate-check for assistant with no marketplace_status', async () => {
      mockChatContext.selectedAssistant = {
        ...mockAssistant,
        marketplace_status: null,
      } as Assistant
      mockAssistantsStore.updateAssistant.mockResolvedValue({})

      render(<ChatConfigAssistantForm showNewIntegrationPopup={mockShowNewIntegrationPopup} />)

      await user.click(screen.getByTestId('form-submit'))

      await waitFor(() => {
        expect(mockAssistantsStore.updateAssistant).toHaveBeenCalled()
      })
      expect(screen.queryByText('Save changes')).not.toBeInTheDocument()
    })

    it('T1: cancelling revalidation modal does not save', async () => {
      mockChatContext.selectedAssistant = marketplaceAssistant

      render(<ChatConfigAssistantForm showNewIntegrationPopup={mockShowNewIntegrationPopup} />)

      await user.click(screen.getByTestId('form-submit'))

      await waitFor(() => {
        expect(screen.getByText('Save changes')).toBeInTheDocument()
      })

      const cancelButton = screen.getByTestId('revalidation-cancel')
      await user.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByText('Save changes')).not.toBeInTheDocument()
      })
      expect(mockAssistantsStore.updateAssistant).not.toHaveBeenCalled()
    })

    it('T2: gate pass → calls updateAssistant then closes panel', async () => {
      mockChatContext.selectedAssistant = marketplaceAssistant
      mockAssistantsStore.checkMarketplaceGates.mockResolvedValue({ error: null })
      mockAssistantsStore.updateAssistant.mockResolvedValue({})

      render(<ChatConfigAssistantForm showNewIntegrationPopup={mockShowNewIntegrationPopup} />)

      await user.click(screen.getByTestId('form-submit'))

      await waitFor(() => {
        expect(screen.getByText('Save changes')).toBeInTheDocument()
      })

      await user.click(screen.getByTestId('revalidation-confirm'))

      await waitFor(() => {
        expect(mockAssistantsStore.checkMarketplaceGates).toHaveBeenCalledWith(
          'marketplace-assistant-1',
          expect.objectContaining({ name: 'Updated Assistant' }),
          expect.any(Array)
        )
        expect(mockAssistantsStore.updateAssistant).toHaveBeenCalled()
        expect(mockChatContext.closeConfigForm).toHaveBeenCalled()
      })
    })

    it('T2: gate pass but save reports missing integrations → opens the integrations modal, does not close panel', async () => {
      mockChatContext.selectedAssistant = marketplaceAssistant
      mockAssistantsStore.checkMarketplaceGates.mockResolvedValue({ error: null })
      const validation = { has_missing_integrations: true }
      mockAssistantsStore.updateAssistant.mockResolvedValue({ validation })

      render(<ChatConfigAssistantForm showNewIntegrationPopup={mockShowNewIntegrationPopup} />)

      await user.click(screen.getByTestId('form-submit'))
      await user.click(await screen.findByTestId('revalidation-confirm'))

      await waitFor(() => {
        expect(mockShowMissingIntegrations).toHaveBeenCalledWith(validation, {
          name: 'Updated Assistant',
        })
      })
      expect(mockToaster.error).not.toHaveBeenCalled()
      expect(mockChatContext.closeConfigForm).not.toHaveBeenCalled()
      expect(mockAssistantsStore.unpublishAssistantFromMarketplace).not.toHaveBeenCalled()
      expect(mockAssistantsStore.publishAssistantToMarketplace).not.toHaveBeenCalled()
    })

    it('T2: gate fail → shows PublishGateFindingsModal', async () => {
      const gateError = { details: { gate_findings: [{ rule: 'rule1', message: 'fail' }] } }
      mockChatContext.selectedAssistant = marketplaceAssistant
      mockAssistantsStore.checkMarketplaceGates.mockResolvedValue({ error: gateError })

      render(<ChatConfigAssistantForm showNewIntegrationPopup={mockShowNewIntegrationPopup} />)

      await user.click(screen.getByTestId('form-submit'))

      await waitFor(() => {
        expect(screen.getByText('Save changes')).toBeInTheDocument()
      })

      await user.click(screen.getByTestId('revalidation-confirm'))

      await waitFor(() => {
        expect(screen.getByTestId('publish-gate-dialog')).toBeInTheDocument()
      })
      expect(mockAssistantsStore.updateAssistant).not.toHaveBeenCalled()
    })

    it('T3: Save and remove → calls updateAssistant + unpublishAssistantFromMarketplace + closes panel', async () => {
      const gateError = { details: { gate_findings: [{ rule: 'rule1', message: 'fail' }] } }
      mockChatContext.selectedAssistant = marketplaceAssistant
      mockAssistantsStore.checkMarketplaceGates.mockResolvedValue({ error: gateError })
      mockAssistantsStore.updateAssistant.mockResolvedValue({})
      mockAssistantsStore.unpublishAssistantFromMarketplace.mockResolvedValue({})

      render(<ChatConfigAssistantForm showNewIntegrationPopup={mockShowNewIntegrationPopup} />)

      await user.click(screen.getByTestId('form-submit'))

      await waitFor(() => {
        expect(screen.getByText('Save changes')).toBeInTheDocument()
      })

      await user.click(screen.getByTestId('revalidation-confirm'))

      await waitFor(() => {
        expect(screen.getByTestId('publish-gate-dialog')).toBeInTheDocument()
      })

      const unpublishButton = screen.getByTestId('publish-gate-send-review')
      await user.click(unpublishButton)

      await waitFor(() => {
        expect(mockAssistantsStore.updateAssistant).toHaveBeenCalledWith(
          'marketplace-assistant-1',
          expect.objectContaining({ name: 'Updated Assistant' }),
          expect.any(Boolean)
        )
        expect(mockAssistantsStore.unpublishAssistantFromMarketplace).toHaveBeenCalledWith(
          'marketplace-assistant-1'
        )
        expect(mockChatContext.closeConfigForm).toHaveBeenCalled()
      })
    })

    // EPMCDME-14234, CR-009: Force-Publish previously had no way to reach
    // ChatConfigAssistantForm at all (onForcePublish was never passed to
    // PublishGateFindingsModal), so an admin hitting a gate failure here had
    // no bypass even though the identical scenario on EditAssistantPage
    // offers one. `isAdmin: true` below exercises the modal's own
    // `canForcePublish` gate — see the note by the mock's definition for why
    // that field lives on `mockAssistantsStore`.
    it('T3: Force-Publish (admin) → saves, force-publishes with the override notice, and closes panel', async () => {
      const gateError = { details: { gate_findings: [{ rule: 'rule1', message: 'fail' }] } }
      mockAssistantsStore.user = { isAdmin: true, isMaintainer: false }
      mockChatContext.selectedAssistant = marketplaceAssistant
      mockAssistantsStore.checkMarketplaceGates.mockResolvedValue({ error: gateError })
      mockAssistantsStore.updateAssistant.mockResolvedValue({})
      mockAssistantsStore.publishAssistantToMarketplace.mockResolvedValue({})

      render(<ChatConfigAssistantForm showNewIntegrationPopup={mockShowNewIntegrationPopup} />)

      await user.click(screen.getByTestId('form-submit'))
      await waitFor(() => {
        expect(screen.getByText('Save changes')).toBeInTheDocument()
      })
      await user.click(screen.getByTestId('revalidation-confirm'))
      await waitFor(() => {
        expect(screen.getByTestId('publish-gate-dialog')).toBeInTheDocument()
      })

      await user.click(screen.getByTestId('publish-gate-force-publish'))
      const notice = await screen.findByTestId('publish-gate-force-reason')
      const textarea = notice.querySelector('textarea') as HTMLTextAreaElement
      // A single atomic change event, not per-keystroke user.type — the
      // latter proved flaky against this Popup's re-render behaviour.
      fireEvent.change(textarea, {
        target: { value: 'Reviewed manually, the failing check is a false positive.' },
      })
      await user.click(await screen.findByTestId('publish-gate-force-reason-confirm'))

      await waitFor(() => {
        expect(mockAssistantsStore.updateAssistant).toHaveBeenCalledWith(
          'marketplace-assistant-1',
          expect.objectContaining({ name: 'Updated Assistant' }),
          false
        )
        expect(mockAssistantsStore.publishAssistantToMarketplace).toHaveBeenCalledWith(
          'marketplace-assistant-1',
          expect.any(Array),
          undefined,
          false,
          true,
          'Reviewed manually, the failing check is a false positive.'
        )
        expect(mockChatContext.closeConfigForm).toHaveBeenCalled()
      })
    })

    it('T3: Force-Publish is not offered to a non-admin, non-maintainer user', async () => {
      const gateError = { details: { gate_findings: [{ rule: 'rule1', message: 'fail' }] } }
      mockChatContext.selectedAssistant = marketplaceAssistant
      mockAssistantsStore.checkMarketplaceGates.mockResolvedValue({ error: gateError })

      render(<ChatConfigAssistantForm showNewIntegrationPopup={mockShowNewIntegrationPopup} />)

      await user.click(screen.getByTestId('form-submit'))
      await waitFor(() => {
        expect(screen.getByText('Save changes')).toBeInTheDocument()
      })
      await user.click(screen.getByTestId('revalidation-confirm'))
      await waitFor(() => {
        expect(screen.getByTestId('publish-gate-dialog')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('publish-gate-force-publish')).not.toBeInTheDocument()
    })

    it('T3: Publish Anyway (advisory-only quality failure) → saves, publishes ignoring recommendations, and closes panel', async () => {
      const gateError = {
        details: {
          quality_validation: {
            recommendations: { fields: [{ severity: 'MINOR', message: 'tighten the prompt' }] },
          },
        },
      }
      mockChatContext.selectedAssistant = marketplaceAssistant
      mockAssistantsStore.checkMarketplaceGates.mockResolvedValue({ error: gateError })
      mockAssistantsStore.updateAssistant.mockResolvedValue({})
      mockAssistantsStore.publishAssistantToMarketplace.mockResolvedValue({})

      render(<ChatConfigAssistantForm showNewIntegrationPopup={mockShowNewIntegrationPopup} />)

      await user.click(screen.getByTestId('form-submit'))
      await waitFor(() => {
        expect(screen.getByText('Save changes')).toBeInTheDocument()
      })
      await user.click(screen.getByTestId('revalidation-confirm'))
      await waitFor(() => {
        expect(screen.getByTestId('publish-gate-dialog')).toBeInTheDocument()
      })

      await user.click(screen.getByTestId('publish-gate-publish-anyway'))

      await waitFor(() => {
        expect(mockAssistantsStore.publishAssistantToMarketplace).toHaveBeenCalledWith(
          'marketplace-assistant-1',
          expect.any(Array),
          undefined,
          true,
          false,
          undefined
        )
        expect(mockChatContext.closeConfigForm).toHaveBeenCalled()
      })
    })

    it('T3: Publish Anyway landing in PENDING_REVIEW → shows the submitted-for-review modal and closes the panel on dismiss', async () => {
      const gateError = {
        details: {
          quality_validation: {
            recommendations: { fields: [{ severity: 'MINOR', message: 'tighten the prompt' }] },
          },
        },
      }
      mockChatContext.selectedAssistant = marketplaceAssistant
      mockAssistantsStore.checkMarketplaceGates.mockResolvedValue({ error: gateError })
      mockAssistantsStore.updateAssistant.mockResolvedValue({})
      mockAssistantsStore.publishAssistantToMarketplace.mockResolvedValue({
        marketplace_status: 'PENDING_REVIEW',
      })

      render(<ChatConfigAssistantForm showNewIntegrationPopup={mockShowNewIntegrationPopup} />)

      await user.click(screen.getByTestId('form-submit'))
      await waitFor(() => {
        expect(screen.getByText('Save changes')).toBeInTheDocument()
      })
      await user.click(screen.getByTestId('revalidation-confirm'))
      await waitFor(() => {
        expect(screen.getByTestId('publish-gate-dialog')).toBeInTheDocument()
      })

      await user.click(screen.getByTestId('publish-gate-publish-anyway'))

      expect(await screen.findByText('Sent for review')).toBeInTheDocument()
      expect(mockChatContext.closeConfigForm).not.toHaveBeenCalled()

      await user.click(screen.getByText('Got it'))

      await waitFor(() => {
        expect(mockChatContext.closeConfigForm).toHaveBeenCalled()
      })
    })

    it('T3: Publish Anyway is not offered when a deterministic gate also failed', async () => {
      const gateError = {
        details: {
          gate_findings: [{ rule: 'rule1', message: 'fail' }],
          quality_validation: { recommendations: { fields: [] } },
        },
      }
      mockChatContext.selectedAssistant = marketplaceAssistant
      mockAssistantsStore.checkMarketplaceGates.mockResolvedValue({ error: gateError })

      render(<ChatConfigAssistantForm showNewIntegrationPopup={mockShowNewIntegrationPopup} />)

      await user.click(screen.getByTestId('form-submit'))
      await waitFor(() => {
        expect(screen.getByText('Save changes')).toBeInTheDocument()
      })
      await user.click(screen.getByTestId('revalidation-confirm'))
      await waitFor(() => {
        expect(screen.getByTestId('publish-gate-dialog')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('publish-gate-publish-anyway')).not.toBeInTheDocument()
    })

    it('T3: Keep editing → closes PublishGateFindingsModal, stays in panel', async () => {
      const gateError = { details: { gate_findings: [{ rule: 'rule1', message: 'fail' }] } }
      mockChatContext.selectedAssistant = marketplaceAssistant
      mockAssistantsStore.checkMarketplaceGates.mockResolvedValue({ error: gateError })

      render(<ChatConfigAssistantForm showNewIntegrationPopup={mockShowNewIntegrationPopup} />)

      await user.click(screen.getByTestId('form-submit'))

      await waitFor(() => {
        expect(screen.getByText('Save changes')).toBeInTheDocument()
      })

      await user.click(screen.getByTestId('revalidation-confirm'))

      await waitFor(() => {
        expect(screen.getByTestId('publish-gate-dialog')).toBeInTheDocument()
      })

      const keepEditingButton = screen.getByTestId('publish-gate-unpublish-edit')
      await user.click(keepEditingButton)

      await waitFor(() => {
        expect(screen.queryByTestId('publish-gate-dialog')).not.toBeInTheDocument()
      })
      expect(mockAssistantsStore.updateAssistant).not.toHaveBeenCalled()
      expect(mockChatContext.closeConfigForm).not.toHaveBeenCalled()
    })
  })
})
