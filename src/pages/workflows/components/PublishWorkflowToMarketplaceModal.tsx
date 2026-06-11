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

import React, { useState, useEffect, useCallback } from 'react'

import Button from '@/components/Button/Button'
import Popup from '@/components/Popup'
import Spinner from '@/components/Spinner'
import { ButtonType } from '@/constants'
import { useAbortController } from '@/hooks/useAbortController'
import { CategorySelector, InlineCredentialsContent } from '@/pages/assistants/components'
import { workflowsStore } from '@/store/workflows'
import { WorkflowPublishValidationResponse } from '@/types/entity/workflow'
import toaster from '@/utils/toaster'

interface PublishWorkflowToMarketplaceModalProps {
  workflowId: string
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const PublishWorkflowToMarketplaceModal: React.FC<PublishWorkflowToMarketplaceModalProps> = ({
  workflowId,
  open,
  onClose,
  onSuccess,
}) => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [categoriesError, setCategoriesError] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isValidating, setIsValidating] = useState<boolean>(false)
  const [validationData, setValidationData] = useState<WorkflowPublishValidationResponse | null>(
    null
  )
  const { execute: executeValidation } = useAbortController()

  const validate = useCallback(async () => {
    if (!open) return
    setIsValidating(true)
    try {
      const result = await executeValidation((signal) =>
        workflowsStore.validateWorkflowForMarketplace(workflowId, signal)
      )
      if (result === null) return
      if (result.error) {
        const message = result.error.message || 'Failed to validate workflow for publishing'
        const { details } = result.error
        toaster.error(details ? `${message}<br>${details}` : message)
        onClose()
      } else if (result.data) {
        setValidationData(result.data)
      }
    } catch {
      toaster.error('Failed to validate workflow for publishing')
      onClose()
    } finally {
      setIsValidating(false)
    }
  }, [open, workflowId, onClose, executeValidation])

  useEffect(() => {
    validate()
  }, [validate])

  useEffect(() => {
    if (open) return
    setSelectedCategories([])
    setCategoriesError('')
    setIsLoading(false)
    setIsValidating(false)
    setValidationData(null)
  }, [open])

  const handleSelectCategories = (categories: string[]) => {
    setCategoriesError('')
    setSelectedCategories(categories)
  }

  const handlePublish = async () => {
    if (selectedCategories.length === 0) {
      setCategoriesError('Please select at least one category')
      return
    }

    setIsLoading(true)
    try {
      const result = await workflowsStore.publishWorkflowToMarketplace(
        workflowId,
        selectedCategories
      )

      if (result.error) {
        const message = result.error.message || 'Failed to publish workflow to marketplace'
        const { details } = result.error
        toaster.error(details ? `${message}<br>${details}` : message)
      } else {
        toaster.info('Workflow has been published to marketplace successfully!')
        onSuccess()
        onClose()
      }
    } catch {
      toaster.error('Failed to publish workflow to marketplace')
    } finally {
      setIsLoading(false)
    }
  }

  const hasInlineCredentials = (validationData?.inline_credentials?.length ?? 0) > 0

  const footerContent = (
    <div className="flex justify-end gap-4">
      <Button variant={ButtonType.SECONDARY} onClick={onClose} disabled={isLoading}>
        Cancel
      </Button>
      <Button variant={ButtonType.PRIMARY} onClick={handlePublish} disabled={isLoading}>
        {isLoading ? 'Publishing...' : 'Publish'}
      </Button>
    </div>
  )

  return (
    <Popup
      className="w-[500px]"
      hideClose
      header="Publish to Marketplace"
      visible={open}
      onHide={onClose}
      withBorder
      footerContent={isValidating ? <></> : footerContent}
    >
      {isValidating ? (
        <div className="flex flex-col items-center justify-center pb-12 pt-6">
          <Spinner inline className="w-8 h-8" />
          <p className="mt-4 text-sm text-text-quaternary">
            Validating your workflow configuration...
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-text-quaternary">
            This will make your workflow available in the marketplace for all users. Please select
            categories to help users find your workflow.
          </p>

          <CategorySelector
            selectedCategories={selectedCategories}
            onCategoriesChange={handleSelectCategories}
            error={categoriesError}
            disabled={isLoading}
            hint="Choose categories that best describe what your workflow does."
          />

          {hasInlineCredentials && validationData && (
            <InlineCredentialsContent
              credentials={validationData.inline_credentials ?? []}
              message="This workflow contains inline credentials that will be used by users."
              showMcpEnvVarsWarning
            />
          )}
        </div>
      )}
    </Popup>
  )
}

export { PublishWorkflowToMarketplaceModal }
export default PublishWorkflowToMarketplaceModal
