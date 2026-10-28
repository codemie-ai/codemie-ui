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

import { useRef, useState } from 'react'

import { isMarketplaceGatedEdit, MARKETPLACE_STATUS } from '@/constants/assistants'
import type { PublishGateError } from '@/pages/assistants/AssistantActions/components/PublishGateFindingsModal'
import type { SubmitResponse } from '@/pages/assistants/hooks/useMissingIntegrationsModal'
import {
  getAssistantSaveFailureMessage,
  getCategoryIds,
  isAssistantSaveFailed,
} from '@/utils/assistants'
import { isMarketplaceApprovalGateEnabled } from '@/utils/featureFlags'
import toaster from '@/utils/toaster'

export interface UseMarketplaceEditGateOptions {
  assistantId: string | undefined | null
  assistantStatus: string | undefined | null
  /** `is_global` of the assistant; a global DRAFT is gated on save like a live one. */
  assistantIsGlobal?: boolean
  /** Read the current form values. Called lazily when the confirmation runs. */
  getFormValues: () => Record<string, any> | undefined
  /** Run the marketplace gate-check API call. */
  onGateCheck: (
    assistantId: string,
    values: Record<string, any>,
    categories: string[]
  ) => Promise<any>
  /** Unpublish the assistant from the marketplace. */
  onUnpublish: (assistantId: string) => Promise<any>
  /**
   * Perform the actual save after gate passes or during save-and-unpublish.
   * Page-specific: may include a post-save assistant refresh (EditAssistantPage).
   */
  onSave: (
    assistantId: string,
    values: Record<string, any>,
    skipValidation?: boolean
  ) => Promise<any>
  /**
   * Perform the marketplace publish after the save. With an override notice it is the admin
   * force-publish; without one it is "Publish Anyway" waiving advisory-only recommendations.
   */
  onPublish: (assistantId: string, categories: string[], overrideNotice?: string) => Promise<any>
  /** Called on every successful completion of the flow. */
  onSuccess: () => void
  /**
   * Called when a force-publish lands in PENDING_REVIEW status (EditAssistantPage
   * shows a "Submitted for review" confirmation modal here).
   */
  onSubmittedForReview?: () => void
  /**
   * Called when force-publish returns another gate error (EditAssistantPage
   * refreshes its local assistant copy so the status badge is accurate).
   */
  onRefreshForGateError?: (assistantId: string) => Promise<void>
  /** Unblock the form's navigation guard on save-and-unpublish. */
  unblockTransition?: () => void
  /**
   * Called when a save the gate ran was not applied because toolkit integrations are
   * missing. The page opens the form's missing-integrations modal with the values; the
   * modal's own Save / Skip then re-submits through the gate (with `skipValidation`).
   */
  onMissingIntegrations?: (
    validation: NonNullable<SubmitResponse['validation']>,
    values: Record<string, any>
  ) => void
}

export const useMarketplaceEditGate = ({
  assistantId,
  assistantStatus,
  assistantIsGlobal,
  getFormValues,
  onGateCheck,
  onUnpublish,
  onSave,
  onPublish,
  onSuccess,
  onSubmittedForReview,
  onRefreshForGateError,
  unblockTransition,
  onMissingIntegrations,
}: UseMarketplaceEditGateOptions) => {
  const [revalidationWarningVisible, setRevalidationWarningVisible] = useState(false)
  const [gateError, setGateError] = useState<PublishGateError | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [validatingMessage, setValidatingMessage] = useState(
    'Validating your Assistant configuration...'
  )
  const [isSavingAndUnpublishing, setIsSavingAndUnpublishing] = useState(false)

  const pendingFormValues = useRef<Record<string, any> | null>(null)
  const categoriesAtSave = useRef<string[]>([])
  // The form's "Skip Validation & Save" choice, kept for every save the gate runs.
  const skipValidationRef = useRef(false)

  /**
   * Run the page's save. When it was not applied because integrations are missing, hand
   * the values back to the form's modal (if the page supports it) and report that the
   * flow stopped there, instead of reporting a failed save.
   */
  const saveOrPromptIntegrations = async (
    id: string,
    values: Record<string, any>
  ): Promise<{ result: any; promptedForIntegrations: boolean }> => {
    const result = await onSave(id, values, skipValidationRef.current)
    const validation = result?.validation
    if (onMissingIntegrations && validation?.has_missing_integrations) {
      pendingFormValues.current = null
      categoriesAtSave.current = []
      setGateError(null)
      onMissingIntegrations(validation, values)
      return { result, promptedForIntegrations: true }
    }
    return { result, promptedForIntegrations: false }
  }

  /**
   * Call from any "Save" entry point. Sets the revalidation-warning modal when
   * the assistant is live in the marketplace and the approval gate is armed.
   * Returns true when it intercepted the action (caller should NOT also submit).
   */
  const handleSaveClickForLive = (skipValidation = false): boolean => {
    if (
      !isMarketplaceApprovalGateEnabled() ||
      !isMarketplaceGatedEdit(assistantStatus, assistantIsGlobal)
    )
      return false
    skipValidationRef.current = skipValidation
    setRevalidationWarningVisible(true)
    return true
  }

  const handleRevalidationConfirm = async () => {
    setRevalidationWarningVisible(false)
    if (!assistantId) return

    const formValues = getFormValues()
    if (!formValues) return

    categoriesAtSave.current = getCategoryIds(formValues.categories)

    setValidatingMessage('Validating your Assistant configuration...')
    setIsValidating(true)
    try {
      const result = await onGateCheck(assistantId, formValues, categoriesAtSave.current)

      if (
        result.error?.details?.gate_findings ||
        result.error?.details?.failed_rules ||
        result.error?.details?.quality_validation
      ) {
        // Real gate failure — capture values for save-and-unpublish / force-publish.
        pendingFormValues.current = formValues
        setGateError(result.error as PublishGateError)
      } else if (result.error) {
        // Network or server error — do not open the findings modal.
        toaster.error('Failed to validate assistant. Please try again.')
      } else {
        // Gate passed — save now.
        const { result: saveResult, promptedForIntegrations } = await saveOrPromptIntegrations(
          assistantId,
          formValues
        )
        if (promptedForIntegrations) return
        if (isAssistantSaveFailed(saveResult)) {
          toaster.error(getAssistantSaveFailureMessage(saveResult))
        } else {
          toaster.info('Assistant has been updated successfully!')
          unblockTransition?.()
          onSuccess()
        }
      }
    } catch {
      toaster.error('Failed to validate assistant. Please try again.')
    } finally {
      setIsValidating(false)
    }
  }

  const handleRevalidationCancel = () => {
    setRevalidationWarningVisible(false)
    pendingFormValues.current = null
  }

  const handleGateKeepEditing = async () => {
    pendingFormValues.current = null
    categoriesAtSave.current = []
    setGateError(null)
  }

  const handleGateSaveAndUnpublish = async () => {
    if (!assistantId) return
    setIsSavingAndUnpublishing(true)
    let keepTransitionBlocked = false
    try {
      if (pendingFormValues.current) {
        const { result: saveResult, promptedForIntegrations } = await saveOrPromptIntegrations(
          assistantId,
          pendingFormValues.current
        )
        if (promptedForIntegrations) {
          keepTransitionBlocked = true
          return
        }
        if (isAssistantSaveFailed(saveResult)) {
          toaster.error(getAssistantSaveFailureMessage(saveResult))
          return
        }
      }
      try {
        await onUnpublish(assistantId)
      } catch {
        toaster.error(
          'Assistant saved but could not be unpublished. Please try unpublishing manually.'
        )
        return
      }
      toaster.info(
        assistantStatus?.toUpperCase() === MARKETPLACE_STATUS.PENDING_REVIEW
          ? 'Assistant saved and removed from the review queue.'
          : 'Assistant saved and unpublished from the Marketplace.'
      )
      pendingFormValues.current = null
      setGateError(null)
      // Unblock before navigating away, or the unsaved-changes guard fires on the saved form.
      unblockTransition?.()
      onSuccess()
    } finally {
      if (!keepTransitionBlocked) unblockTransition?.()
      setIsSavingAndUnpublishing(false)
    }
  }

  const handleGateForcePublish = async (overrideNotice?: string) => {
    if (!assistantId) return

    const values = pendingFormValues.current
    const categories = categoriesAtSave.current
    if (!values) return

    // Clear the modal immediately so the spinner overlay shows during save + publish.
    pendingFormValues.current = null
    setGateError(null)

    setValidatingMessage('Publishing to Marketplace...')
    setIsValidating(true)
    try {
      const { result: saveResult, promptedForIntegrations } = await saveOrPromptIntegrations(
        assistantId,
        values
      )
      if (promptedForIntegrations) return
      if (isAssistantSaveFailed(saveResult)) {
        toaster.error(getAssistantSaveFailureMessage(saveResult))
        return
      }

      const publishResult = await onPublish(assistantId, categories, overrideNotice)

      if (
        publishResult?.error?.details?.gate_findings ||
        publishResult?.error?.details?.failed_rules
      ) {
        if (onRefreshForGateError) {
          await onRefreshForGateError(assistantId)
        }
        setGateError(publishResult.error as PublishGateError)
      } else if (publishResult?.error) {
        toaster.error('Failed to publish assistant to Marketplace. Please try again.')
      } else if (
        publishResult?.marketplace_status?.toUpperCase() === MARKETPLACE_STATUS.PENDING_REVIEW
      ) {
        unblockTransition?.()
        onSubmittedForReview?.()
      } else {
        categoriesAtSave.current = []
        toaster.info('Assistant has been updated successfully!')
        unblockTransition?.()
        onSuccess()
      }
    } catch {
      toaster.error('Failed to force-publish assistant. Please try again.')
    } finally {
      setIsValidating(false)
    }
  }

  const gateSendForReviewLabel =
    assistantStatus?.toUpperCase() === MARKETPLACE_STATUS.PENDING_REVIEW ||
    assistantStatus?.toUpperCase() === MARKETPLACE_STATUS.DRAFT
      ? 'Save and remove'
      : 'Save & Unpublish'

  // A pending assistant was never published, so it is not "unpublished" by an edit: the
  // backend re-submits it and it keeps its place in the review queue.
  const revalidationWarningMessage = (() => {
    const status = assistantStatus?.toUpperCase()
    if (status === MARKETPLACE_STATUS.PENDING_REVIEW)
      return 'Saving this edit will send your assistant back for re-validation. It stays in the review queue and keeps its place.'
    if (status === MARKETPLACE_STATUS.DRAFT)
      return 'Saving this edit will validate your assistant against the Marketplace checks and send it for review.'
    return 'Saving this edit will unpublish your assistant and send it for re-validation. It will be unavailable in the Marketplace until the review is complete.'
  })()

  const gateBannerText = (() => {
    const status = assistantStatus?.toUpperCase()
    if (status === MARKETPLACE_STATUS.PENDING_REVIEW)
      return 'This assistant is currently pending Marketplace review. Fix the checks below to keep it in the queue, or save without fixing to remove it from the review queue.'
    if (status === MARKETPLACE_STATUS.APPROVED)
      return 'This assistant is already in the Marketplace. Fix the checks below to keep it published, or save without fixing to unpublish it.'
    if (status === MARKETPLACE_STATUS.DRAFT)
      return 'This assistant is in Marketplace Draft. Fix the checks below before submitting it for review, or save without fixing to keep it out of the Marketplace.'
    return null
  })()

  return {
    revalidationWarningVisible,
    revalidationWarningMessage,
    gateError,
    isValidating,
    validatingMessage,
    isSavingAndUnpublishing,
    handleSaveClickForLive,
    handleRevalidationConfirm,
    handleRevalidationCancel,
    handleGateKeepEditing,
    handleGateSaveAndUnpublish,
    handleGateForcePublish,
    handleGatePublishAnyway: () => handleGateForcePublish(),
    gateSendForReviewLabel,
    gateBannerText,
  }
}
