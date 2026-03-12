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

import Avatar from '@/components/Avatar/Avatar'
import Button from '@/components/Button/Button'
import ConfirmationModal from '@/components/ConfirmationModal'
import Popup from '@/components/Popup'
import Spinner from '@/components/Spinner'
import { ButtonType } from '@/constants'
import { AvatarType } from '@/constants/avatar'
import {
  CategorySelector,
  InlineCredentialsContent,
  PromptVariablesReview,
} from '@/pages/assistants/components'
import { assistantsStore } from '@/store'
import {
  Assistant,
  PublishValidationResponse,
  SubAssistantPublishSettings,
  SubAssistantInfo,
  QualityValidation,
} from '@/types/entity/assistant'
import toaster from '@/utils/toaster'

import QualityValidationModal from './QualityValidationModal'
import SubAssistantSettings from './SubAssistantSettings'

interface PublishToMarketplaceModalProps {
  isOpen: boolean
  assistant: Assistant
  onClose: () => void
  onSuccess: () => void
}

const getCategoryIds = (categories: any) => {
  if (!categories || !Array.isArray(categories)) return []

  return categories.map((cat) => {
    if (typeof cat === 'string') return cat
    if (typeof cat === 'object' && cat.id) return cat.id
    return cat
  })
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
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    getCategoryIds(assistant.categories) || []
  )
  const [categoriesError, setCategoriesError] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [validationData, setValidationData] = useState<PublishValidationResponse | null>(null)
  const [subAssistantsSettings, setSubAssistantsSettings] = useState<SubAssistantPublishSettings[]>(
    []
  )
  const [showCategoriesConfirmation, setShowCategoriesConfirmation] = useState(false)
  const [subAssistantsWithoutCategories, setSubAssistantsWithoutCategories] = useState<
    SubAssistantInfo[]
  >([])
  const [showQualityValidationModal, setShowQualityValidationModal] = useState(false)
  const [qualityValidationError, setQualityValidationError] = useState<QualityValidation | null>(
    null
  )

  useEffect(() => {
    if (isOpen && !showQualityValidationModal) {
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
    }
  }, [isOpen, assistant.id])

  const handleValidate = async () => {
    try {
      const response = await assistantsStore.validatePublishToMarketplace(assistant.id)
      setValidationData(response)

      // Initialize sub-assistants settings with default values from validation response
      if (response.sub_assistants && response.sub_assistants.length > 0) {
        const initialSettings: SubAssistantPublishSettings[] = response.sub_assistants.map(
          (sa) => ({
            assistant_id: sa.id,
            is_global: sa.is_global,
          })
        )
        setSubAssistantsSettings(initialSettings)
      }
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

  const performPublish = async (ignoreRecommendations: boolean = false) => {
    setCategoriesError('')
    setIsLoading(true)

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
        ignoreRecommendations
      )

      // Check if result contains an error
      if (result.error) {
        // Special handling for quality validation errors (422 with quality_validation)
        if (result.error.details?.quality_validation) {
          const qualityValidation = result.error.details.quality_validation
          setQualityValidationError(qualityValidation)
          setShowQualityValidationModal(true)
        } else {
          // Handle all other errors uniformly (400, 404, 500, etc.)
          displayError(result.error, 'Failed to publish assistant to marketplace')
        }
      } else {
        // Success
        toaster.info('Assistant has been published to marketplace successfully!')

        // Close quality validation modal if it's open
        if (showQualityValidationModal) {
          setShowQualityValidationModal(false)
          setQualityValidationError(null)
        }

        onSuccess()
        onClose()
      }
    } catch (error: any) {
      console.error('Failed to publish assistant:', error)
      displayError(error?.error, 'Failed to publish assistant to marketplace')
    } finally {
      setIsLoading(false)
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

  const handleQualityValidationModalHide = () => {
    setShowQualityValidationModal(false)
    // Clear quality validation state when hiding
    setQualityValidationError(null)
    // Close the entire publish modal
    onClose()
  }

  const handlePublishAnyway = async () => {
    await performPublish(true)
  }

  const footerContent = (
    <div className="flex justify-end gap-3">
      <Button variant={ButtonType.BASE} onClick={onClose} disabled={isLoading}>
        Cancel
      </Button>
      <Button variant={ButtonType.PRIMARY} onClick={handlePublish} disabled={isLoading}>
        {isLoading ? 'Validating...' : 'Publish'}
      </Button>
    </div>
  )

  const hasInlineCredentials =
    validationData?.inline_credentials && validationData.inline_credentials.length > 0
  const hasSubAssistants =
    validationData?.sub_assistants && validationData.sub_assistants.length > 0
  const hasPromptVariables =
    validationData?.prompt_variables && validationData.prompt_variables.length > 0

  return (
    <>
      <Popup
        className="w-[650px]"
        hideClose
        header="Publish to Marketplace"
        visible={isOpen && !showQualityValidationModal}
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

              {hasSubAssistants && validationData && (
                <SubAssistantSettings
                  subAssistants={validationData.sub_assistants || []}
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

      <QualityValidationModal
        visible={showQualityValidationModal}
        qualityValidation={qualityValidationError}
        assistant={assistant}
        onHide={handleQualityValidationModalHide}
        onPublishAnyway={handlePublishAnyway}
      />
    </>
  )
}

export default PublishToMarketplaceModal
