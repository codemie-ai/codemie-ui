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
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { UnsavedChangesProvider } from '@/hooks/useUnsavedChangesWarning'

import AssistantForm from '../AssistantForm'

vi.hoisted(() => vi.resetModules())

const { mockToaster, mockHandleMissingIntegrationsSubmit } = vi.hoisted(() => ({
  mockToaster: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
  mockHandleMissingIntegrationsSubmit: vi.fn(),
}))

vi.mock('@/utils/toaster', () => ({
  __esModule: true,
  default: mockToaster,
}))

vi.mock('@/store', () => ({
  assistantsStore: {
    getHedgeableToolkits: vi.fn().mockResolvedValue([]),
    getAssistantContext: vi.fn().mockResolvedValue([]),
    getBuiltinSubagentsCatalog: vi.fn(),
    builtinSubagentsCatalog: [],
  },
  userStore: {
    user: { userId: 'user-1' },
  },
}))

vi.mock('@/store/providers', () => ({
  providersStore: {
    indexProviders: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('@/pages/assistants/hooks/useMissingIntegrationsModal', () => ({
  useMissingIntegrationsModal: () => ({
    isSubmitting: false,
    missingIntegrationsState: {
      isModalVisible: false,
      missingByCredentialType: [],
      subAssistantsMissing: [],
      validationMessage: '',
      pendingAssistantValues: null,
    },
    handleSubmit: mockHandleMissingIntegrationsSubmit,
    handleSaveWithValidation: vi.fn(),
    handleSkipValidation: vi.fn(),
    handleCancelValidationModal: vi.fn(),
  }),
}))

// Heavy child sections are not under test here; stub them so the form can
// render without pulling in their own deep dependency trees.
vi.mock('../components/AssistantSetup', () => ({
  AssistantSetupSection: () => null,
}))
vi.mock('../components/InteractiveFeaturesAccordion', () => ({ default: () => null }))
vi.mock('../components/Toolkits/ToolsConfiguration', () => ({ default: () => null }))
vi.mock('../components/ContextSelector', () => ({ default: () => null }))
vi.mock('../../AssistantSelector', () => ({ default: () => null }))
vi.mock('@/components/guardrails/GuardrailAssignmentPanel/GuardrailAssignmentPanel', () => ({
  default: () => null,
}))
vi.mock('@/components/SkillSelector', () => ({ default: () => null }))
vi.mock('../components/HedgingConfig', () => ({ default: () => null }))
vi.mock('../components/RefineWithAIPromptPopup', () => ({ default: () => null }))
vi.mock('../../RefineAssistantModal/RefineAssistantModal', () => ({ default: () => null }))
vi.mock('@/pages/assistants/components/MissingIntegrationsModal', () => ({ default: () => null }))

// Satisfies the form's required-field schema (project/name/description/system_prompt)
// via defaultValues, since the fields that collect them are mocked out above.
const validAssistant = {
  project: 'project-1',
  name: 'Test Assistant',
  description: 'Test description',
  system_prompt: 'You are a helpful assistant',
} as React.ComponentProps<typeof AssistantForm>['assistant']

const renderForm = (props: Partial<React.ComponentProps<typeof AssistantForm>> = {}) => {
  const onSubmit = props.onSubmit ?? vi.fn()
  const showNewIntegrationPopup = props.showNewIntegrationPopup ?? vi.fn()
  return render(
    <UnsavedChangesProvider>
      <AssistantForm
        assistant={validAssistant}
        onSubmit={onSubmit}
        showNewIntegrationPopup={showNewIntegrationPopup}
        {...props}
      />
    </UnsavedChangesProvider>
  )
}

describe('AssistantForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the form', () => {
    const { container } = renderForm()
    expect(container.querySelector('form')).toBeInTheDocument()
  })

  it('shows the backend rejection message inline and still toasts it on submit failure', async () => {
    mockHandleMissingIntegrationsSubmit.mockResolvedValue({
      success: false,
      error: 'Personal integrations cannot be used in a shared assistant.',
    })

    const { container } = renderForm()
    const form = container.querySelector('form') as HTMLFormElement

    fireEvent.submit(form)

    await waitFor(() => {
      expect(
        screen.getByText('Personal integrations cannot be used in a shared assistant.')
      ).toBeInTheDocument()
    })

    expect(mockToaster.error).toHaveBeenCalledWith(
      'Personal integrations cannot be used in a shared assistant.'
    )
  })

  it('toasts the formatted error and shows the plain-text message inline', async () => {
    mockHandleMissingIntegrationsSubmit.mockResolvedValue({
      success: false,
      error: 'Failed to update assistant<br> Category is required',
      message: 'Failed to update assistant. Category is required',
    })

    const { container } = renderForm()
    fireEvent.submit(container.querySelector('form') as HTMLFormElement)

    expect(
      await screen.findByText('Failed to update assistant. Category is required')
    ).toBeInTheDocument()
    expect(mockToaster.error).toHaveBeenCalledWith(
      'Failed to update assistant<br> Category is required'
    )
  })

  it('does not show an inline error before any submit attempt', () => {
    renderForm()
    expect(
      screen.queryByText('Personal integrations cannot be used in a shared assistant.')
    ).not.toBeInTheDocument()
  })
})
