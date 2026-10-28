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

import React, { useState, useEffect } from 'react'
import { useSnapshot } from 'valtio'

import Avatar from '@/components/Avatar/Avatar'
import Button from '@/components/Button/Button'
import ConfirmationModal from '@/components/ConfirmationModal'
import Popup from '@/components/Popup'
import Spinner from '@/components/Spinner'
import { ButtonType } from '@/constants'
import { MARKETPLACE_STATUS } from '@/constants/assistants'
import { AvatarType } from '@/constants/avatar'
import {
  CategorySelector,
  InlineCredentialsContent,
  PromptVariablesReview,
} from '@/pages/assistants/components'
import { assistantsStore } from '@/store'
import { userStore } from '@/store/user'
import {
  Assistant,
  PublishValidationResponse,
  SubAssistantPublishSettings,
  SubAssistantInfo,
  QualityValidation,
} from '@/types/entity/assistant'
import type { MarketplaceStatus } from '@/types/generated/marketplaceManagement'
import { getCategoryIds, isAdvisoryOnlyQualityValidation } from '@/utils/assistants'
import { isMarketplaceManagementEnabled } from '@/utils/featureFlags'
import toaster from '@/utils/toaster'

import PublishGateFindingsModal, { type PublishGateError } from './PublishGateFindingsModal'
import QualityValidationModal from './QualityValidationModal'
import SubAssistantSettings from './SubAssistantSettings'
import SubmittedForReviewModal from './SubmittedForReviewModal'

interface PublishToMarketplaceModalProps {
  isOpen: boolean
  assistant: Assistant
  onClose: () => void
  onSuccess: () => void
}

/**
 * Unified error display utility
 * Formats and shows error message via toaster (single source of truth)
 * @param error - Error object with message and optional details
 * @param defaultMessage - Fallback message if no error message found
 */
const displayError = (error: any, defaultMessage: string): void => {
  const message = error?.message || defaultMessage
  const details = error?.details
  const errorMessage = details ? `${message}<br>${details}` : message
  toaster.error(errorMessage)
}

const PublishToMarketplaceModal: React.FC<PublishToMarketplaceModalProps> = ({
  isOpen,
  assistant,
  onClose,
  onSuccess,
}) => {
  const { user } = useSnapshot(userStore)
  // With marketplace management on, waiving a CRITICAL quality failure is an admin/maintainer
  // override that needs a reason (force_publish). With it off, anyone may waive the verdict
  // (ignore_recommendations), as before.
  const managementEnabled = isMarketplaceManagementEnabled()
  const isPrivilegedUser = Boolean(user?.isAdmin || user?.isMaintainer)

  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    getCategoryIds(assistant.categories) || []
  )
  const [categoriesError, setCategoriesError] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [isForcing, setIsForcing] = useState(false)
  const [validationData, setValidationData] = useState<PublishValidationResponse | null>(null)
  const [subAssistantsSettings, setSubAssistantsSettings] = useState<SubAssistantPublishSettings[]>(
    []
  )
  const [showCategoriesConfirmation, setShowCategoriesConfirmation] = useState(false)
  const [subAssistantsWithoutCategories, setSubAssistantsWithoutCategories] = useState<
    SubAssistantInfo[]
  >([])
  const [showQualityValidationModal, setShowQualityValidationModal] = useState(false)
  // A CRITICAL deterministic-gate failure is a different thing from the
  // advisory LLM verdict and needs its own dialog — see
  // PublishGateFindingsModal for why "Publish Anyway" must not be offered here.
  const [gateError, setGateError] = useState<PublishGateError | null>(null)
  const [qualityValidationError, setQualityValidationError] = useState<QualityValidation | null>(
    null
  )
  const [showPendingReviewConfirm, setShowPendingReviewConfirm] = useState(false)

  useEffect(() => {
    if (isOpen && !showQualityValidationModal && !gateError) {
      handleValidate()
      setSelectedCategories(getCategoryIds(assistant.categories) || [])
    }

    if (!isOpen) {
      // Reset state only when parent modal closes completely
      setValidationData(null)
      setSubAssistantsSettings([])
      setCategoriesError('')
      setShowQualityValidationModal(false)
      setQualityValidationError(null)
      setGateError(null)
      setShowPendingReviewConfirm(false)
    }
  }, [isOpen, assistant.id])

  const handleValidate = async () => {
    try {
      const response = await assistantsStore.validatePublishToMarketplace(assistant.id)
      setValidationData(response)

      // Initialize sub-assistants settings with default values from validation response
      // Only unpublished ones are offered; they start unchecked (is_global: false) as before
      const initialSettings: SubAssistantPublishSettings[] = (response.sub_assistants ?? [])
        .filter((sa) => !sa.is_global)
        .map((sa) => ({ assistant_id: sa.id, is_global: false }))
      if (initialSettings.length > 0) setSubAssistantsSettings(initialSettings)
    } catch (error: any) {
      console.error('Failed to validate assistant:', error)
      displayError(error?.error, 'Failed to validate assistant for publishing')
      onClose()
    }
  }

  const handlePublish = async () => {
    if (selectedCategories.length === 0) {
      setCategoriesError('Please select at least one category')
      return
    }

    // Check if any sub-assistants marked for marketplace don't have categories
    if (subAssistantsSettings.length > 0) {
      const subsWithoutCategories = subAssistantsSettings
        .filter((s) => {
          if (!s.is_global) return false

          // Get the effective categories
          let effectiveCategories: string[] = []

          // If categories property exists in settings (even if empty), use it
          // This respects user's manual clearing of categories
          if (s.categories !== undefined) {
            effectiveCategories = s.categories
          } else {
            // Only fall back to validation data if categories were never set in settings
            const subAssistant = validationData?.sub_assistants?.find(
              (sa) => sa.id === s.assistant_id
            )
            effectiveCategories = subAssistant?.categories || []
          }

          // Return true if no categories found
          return effectiveCategories.length === 0
        })
        .map((s) => {
          return validationData?.sub_assistants?.find((sa) => sa.id === s.assistant_id)
        })
        .filter((sa): sa is SubAssistantInfo => sa !== undefined)

      if (subsWithoutCategories.length > 0) {
        // Show confirmation modal instead of blocking
        setSubAssistantsWithoutCategories(subsWithoutCategories)
        setShowCategoriesConfirmation(true)
        return
      }
    }

    // Proceed with publishing
    await performPublish()
  }

  const handlePublishSuccess = (marketplaceStatus?: MarketplaceStatus) => {
    if (showQualityValidationModal) {
      setShowQualityValidationModal(false)
      setQualityValidationError(null)
    }
    if (marketplaceStatus?.toUpperCase() === MARKETPLACE_STATUS.PENDING_REVIEW) {
      setShowPendingReviewConfirm(true)
    } else {
      toaster.info('Assistant has been published to marketplace successfully!')
      onSuccess()
      onClose()
    }
  }

  const performPublish = async (
    ignoreRecommendations: boolean = false,
    forcePublish: boolean = false,
    overrideNotice: string | undefined = undefined
  ) => {
    setCategoriesError('')
    if (forcePublish) {
      setIsForcing(true)
    } else {
      setIsLoading(true)
    }

    try {
      // Populate missing categories from parent assistant
      const settingsWithCategories = subAssistantsSettings.map((setting) => {
        if (setting.is_global && (!setting.categories || setting.categories.length === 0)) {
          return {
            ...setting,
            categories: selectedCategories,
          }
        }
        return setting
      })

      const result = await assistantsStore.publishAssistantToMarketplace(
        assistant.id,
        selectedCategories,
        settingsWithCategories.length > 0 ? settingsWithCategories : undefined,
        ignoreRecommendations,
        forcePublish,
        overrideNotice
      )

      // Check if result contains an error
      if (result.error) {
        // Special handling for quality validation errors (422 with quality_validation)
        if (result.error.details?.quality_validation) {
          const qualityValidation = result.error.details.quality_validation
          setQualityValidationError(qualityValidation)
          setShowQualityValidationModal(true)
        } else if (result.error.details?.gate_findings || result.error.details?.failed_rules) {
          // The eight deterministic gates run at publish and a CRITICAL finding
          // is a 422 naming every failing rule. Routed to a dialog rather than
          // `displayError`, which interpolates `details` — an object — into a
          // toast and showed the author "[object Object]" under a message that
          // then vanished.
          setGateError(result.error as PublishGateError)
          // Publish Anyway can land here with the quality dialog still open
          setShowQualityValidationModal(false)
          setQualityValidationError(null)
        } else {
          // Handle all other errors uniformly (400, 404, 500, etc.)
          displayError(result.error, 'Failed to publish assistant to marketplace')
        }
      } else {
        handlePublishSuccess(result.marketplace_status)
      }
    } catch (error: any) {
      console.error('Failed to publish assistant:', error)
      displayError(error?.error, 'Failed to publish assistant to marketplace')
    } finally {
      setIsLoading(false)
      setIsForcing(false)
    }
  }

  const handleConfirmPublish = () => {
    setShowCategoriesConfirmation(false)
    performPublish()
  }

  const handleCancelConfirmation = () => {
    setShowCategoriesConfirmation(false)
    setSubAssistantsWithoutCategories([])
  }

  const handleSelectCategories = (categories: string[]) => {
    setCategoriesError('')
    setSelectedCategories(categories)
  }

  const handlePendingReviewConfirmClose = () => {
    setShowPendingReviewConfirm(false)
    onSuccess()
    onClose()
  }

  const handleQualityValidationModalHide = () => {
    setShowQualityValidationModal(false)
    // Clear quality validation state when hiding
    setQualityValidationError(null)
    // Close the entire publish modal
    onClose()
  }

  // Advisory-only verdicts (no CRITICAL recommendation) never block the owner: anyone may
  // waive them without a reason. A CRITICAL failure still needs the admin override when
  // marketplace management is on.
  const isAdvisoryOnly = isAdvisoryOnlyQualityValidation(qualityValidationError)
  const canPublishAnyway = isAdvisoryOnly || !managementEnabled || isPrivilegedUser

  const handlePublishAnyway = async (reason?: string) => {
    if (reason) await performPublish(false, true, reason)
    else await performPublish(true, false)
  }

  const handleForcePublish = async (overrideNotice: string) => {
    await performPublish(false, true, overrideNotice)
  }

  const footerContent = (
    <div className="flex justify-end gap-4">
      <Button variant={ButtonType.SECONDARY} onClick={onClose} disabled={isLoading}>
        Cancel
      </Button>
      <Button variant={ButtonType.PRIMARY} onClick={handlePublish} disabled={isLoading}>
        {isLoading ? 'Validating...' : 'Publish'}
      </Button>
    </div>
  )

  const hasInlineCredentials =
    validationData?.inline_credentials && validationData.inline_credentials.length > 0
  const unpublishedSubAssistants =
    validationData?.sub_assistants?.filter((sa) => !sa.is_global) ?? []
  const publishedSubAssistants = validationData?.sub_assistants?.filter((sa) => sa.is_global) ?? []
  const hasSubAssistants = unpublishedSubAssistants.length > 0
  const hasPromptVariables =
    validationData?.prompt_variables && validationData.prompt_variables.length > 0

  return (
    <>
      <Popup
        className="w-[650px]"
        hideClose
        header="Publish to Marketplace"
        visible={
          isOpen && !showQualityValidationModal && gateError == null && !showPendingReviewConfirm
        }
        onHide={onClose}
        withBorder
        footerContent={isLoading ? <></> : footerContent}
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center pb-12 pt-6">
            <Spinner inline className="w-8 h-8" />
            <p className="mt-4 text-sm text-text-quaternary">
              Validating your Assistant configuration...
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <p className="text-sm text-text-quaternary">
                This will make your assistant available in the marketplace for all users. Please
                review the details below before continuing.
              </p>

              <CategorySelector
                selectedCategories={selectedCategories}
                onCategoriesChange={handleSelectCategories}
                error={categoriesError}
                disabled={isLoading}
                hint="Choose up to 3 categories that best describe what your assistant does. This will help users find your assistant more easily in the marketplace."
              />

              {publishedSubAssistants.length > 0 && (
                <p className="text-sm text-text-quaternary">
                  Already on Marketplace, no action needed:{' '}
                  {publishedSubAssistants.map((sa) => sa.name).join(', ')}
                </p>
              )}

              {hasSubAssistants && validationData && (
                <SubAssistantSettings
                  subAssistants={unpublishedSubAssistants}
                  settings={subAssistantsSettings}
                  onSettingsChange={setSubAssistantsSettings}
                />
              )}

              {hasPromptVariables && validationData && (
                <PromptVariablesReview promptVariables={validationData.prompt_variables || []} />
              )}

              {hasInlineCredentials && validationData && (
                <InlineCredentialsContent credentials={validationData.inline_credentials} />
              )}
            </div>

            <ConfirmationModal
              visible={showCategoriesConfirmation}
              header="Auto-populate Categories for Sub-Assistants"
              message={`The following sub-assistant${
                subAssistantsWithoutCategories.length > 1 ? "s don't" : " doesn't"
              } have categories specified:`}
              confirmText="Continue"
              confirmButtonType={ButtonType.PRIMARY}
              onConfirm={handleConfirmPublish}
              onCancel={handleCancelConfirmation}
            >
              <div className="mb-3 space-y-2">
                {subAssistantsWithoutCategories.map((subAssistant) => (
                  <div
                    key={subAssistant.id}
                    className="flex items-center gap-3 p-3 border border-border-structural rounded-lg bg-surface-elevated"
                  >
                    <Avatar
                      iconUrl={subAssistant.icon_url}
                      name={subAssistant.name}
                      type={AvatarType.SMALL}
                      className="flex-shrink-0"
                    />
                    <span className="text-sm text-text-primary font-medium">
                      {subAssistant.name}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-text-quaternary">
                Categories will be automatically populated from the parent assistant categories. Do
                you want to continue?
              </p>
            </ConfirmationModal>
          </>
        )}
      </Popup>

      <PublishGateFindingsModal
        visible={gateError != null}
        assistant={assistant}
        marketplaceStatus={assistant.marketplace_status}
        error={gateError}
        onHide={() => {
          setGateError(null)
          onClose()
        }}
        onForcePublish={handleForcePublish}
        isForcing={isForcing}
      />

      <QualityValidationModal
        visible={showQualityValidationModal}
        qualityValidation={qualityValidationError}
        assistant={assistant}
        onHide={handleQualityValidationModalHide}
        canPublishAnyway={canPublishAnyway}
        requireReason={managementEnabled && !isAdvisoryOnly}
        onPublishAnyway={handlePublishAnyway}
      />

      <SubmittedForReviewModal
        isOpen={showPendingReviewConfirm}
        onClose={handlePendingReviewConfirmClose}
      />
    </>
  )
}

export default PublishToMarketplaceModal
