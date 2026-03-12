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

import { useState, useCallback } from 'react'

import { AssistantToolkit, MissingIntegrationByCredentialType } from '@/types/entity/assistant'
import { Setting } from '@/types/entity/setting'

import { buildAssistantMaps, applySettingsToToolkits } from '../utils/missingIntegrationHelpers'

export interface SubmitResponse {
  error?: string
  validation?: {
    has_missing_integrations: boolean
    missing_by_credential_type: MissingIntegrationByCredentialType[]
    sub_assistants_missing: MissingIntegrationByCredentialType[]
    message: string
  }
}

export interface MissingIntegrationsState {
  isModalVisible: boolean
  missingByCredentialType: MissingIntegrationByCredentialType[]
  subAssistantsMissing: MissingIntegrationByCredentialType[]
  validationMessage: string
  pendingAssistantValues: any
}

interface UseMissingIntegrationsModalOptions<T = any> {
  onSubmit: (values: T, skipValidation?: boolean) => Promise<SubmitResponse>
  onSuccess?: () => void
  unblockTransition?: () => void
  onToolkitsUpdate?: (toolkits: AssistantToolkit[]) => void
}

export const useMissingIntegrationsModal = <T = any>({
  onSubmit,
  onSuccess,
  unblockTransition,
  onToolkitsUpdate,
}: UseMissingIntegrationsModalOptions<T>) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [missingIntegrationsState, setMissingIntegrationsState] =
    useState<MissingIntegrationsState>({
      isModalVisible: false,
      missingByCredentialType: [],
      subAssistantsMissing: [],
      validationMessage: '',
      pendingAssistantValues: null,
    })

  const handleSubmit = useCallback(
    async (values: T, skipValidation = false) => {
      setIsSubmitting(true)
      try {
        const response = await onSubmit(values, skipValidation)

        if (response.error) {
          return { success: false, error: response.error }
        }

        if (response.validation?.has_missing_integrations) {
          setMissingIntegrationsState({
            isModalVisible: true,
            missingByCredentialType: response.validation.missing_by_credential_type,
            subAssistantsMissing: response.validation.sub_assistants_missing,
            validationMessage: response.validation.message,
            pendingAssistantValues: values,
          })
          return { success: false }
        }

        unblockTransition?.()
        onSuccess?.()
        return { success: true }
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to update assistant' }
      } finally {
        setIsSubmitting(false)
      }
    },
    [onSubmit, onSuccess, unblockTransition]
  )

  const handleSaveWithValidation = useCallback(
    async (selectedIntegrations: Record<string, Setting | undefined>) => {
      if (!missingIntegrationsState.pendingAssistantValues) return
      setMissingIntegrationsState((prev) => ({ ...prev, isModalVisible: false }))

      const maps = buildAssistantMaps(missingIntegrationsState.missingByCredentialType)
      const pendingToolkits = missingIntegrationsState.pendingAssistantValues.toolkits || []

      // Apply selected integrations to toolkits
      const updatedToolkits = applySettingsToToolkits(pendingToolkits, maps, selectedIntegrations)

      // Notify parent component of toolkit updates
      if (onToolkitsUpdate) {
        onToolkitsUpdate(updatedToolkits)
      }

      // Submit with updated toolkits
      const valuesWithIntegrations = {
        ...missingIntegrationsState.pendingAssistantValues,
        toolkits: updatedToolkits,
      }

      await handleSubmit(valuesWithIntegrations, false)
    },
    [
      missingIntegrationsState.pendingAssistantValues,
      missingIntegrationsState.missingByCredentialType,
      handleSubmit,
      onToolkitsUpdate,
    ]
  )

  const handleSkipValidation = useCallback(async () => {
    if (!missingIntegrationsState.pendingAssistantValues) {
      return { success: true }
    }
    setMissingIntegrationsState((prev) => ({ ...prev, isModalVisible: false }))
    setIsSubmitting(true)
    try {
      const response = await onSubmit(missingIntegrationsState.pendingAssistantValues, true)
      if (response.error) {
        return { success: false, error: response.error }
      }
      unblockTransition?.()
      onSuccess?.()
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to update assistant' }
    } finally {
      setIsSubmitting(false)
      setMissingIntegrationsState((prev) => ({ ...prev, pendingAssistantValues: null }))
    }
  }, [missingIntegrationsState.pendingAssistantValues, onSubmit, onSuccess, unblockTransition])

  const handleCancelValidationModal = useCallback(() => {
    setMissingIntegrationsState((prev) => ({
      ...prev,
      isModalVisible: false,
      pendingAssistantValues: null,
    }))
  }, [])

  return {
    isSubmitting,
    missingIntegrationsState,
    handleSubmit,
    handleSaveWithValidation,
    handleSkipValidation,
    handleCancelValidationModal,
  }
}
