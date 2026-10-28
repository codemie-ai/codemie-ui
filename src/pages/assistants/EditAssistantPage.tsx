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

import { useEffect, useRef, useState } from 'react'

import AIGenerateSVG from '@/assets/icons/ai-generate.svg?react'
import Button from '@/components/Button'
import ConfirmationModal from '@/components/ConfirmationModal'
import PageLayout from '@/components/Layouts/Layout'
import Popup from '@/components/Popup'
import Sidebar from '@/components/Sidebar'
import Spinner from '@/components/Spinner'
import { isMarketplaceGatedEdit } from '@/constants/assistants'
import { ASSISTANT_DETAILS } from '@/constants/routes'
import { useNewIntegrationPopup } from '@/hooks/useNewIntegrationPopup'
import { useVueRouter } from '@/hooks/useVueRouter'
import { goBackAssistants } from '@/pages/assistants/utils/goBackAssistants'
import NewIntegrationPopup from '@/pages/integrations/components/NewIntegrationPopup'
import { assistantsStore } from '@/store'
import { settingsStore } from '@/store/settings'
import { Assistant } from '@/types/entity/assistant'
import toaster from '@/utils/toaster'

import PublishGateFindingsModal from './AssistantActions/components/PublishGateFindingsModal'
import SubmittedForReviewModal from './AssistantActions/components/SubmittedForReviewModal'
import AssistantForm, { AssistantFormRef } from './components/AssistantForm/AssistantForm'
import AssistantsNavigation from './components/AssistantsNavigation'
import { useMarketplaceEditGate } from './hooks/useMarketplaceEditGate'

const EditAssistantPage = () => {
  const {
    showNewIntegration,
    selectedCredentialType,
    selectedProject,
    showNewIntegrationPopup,
    hideNewIntegrationPopup,
    onIntegrationSuccess,
  } = useNewIntegrationPopup(async () => {
    await settingsStore.indexSettings()
  })
  const [assistant, setAssistant] = useState<Assistant | null>(null)
  const [showPendingReviewConfirm, setShowPendingReviewConfirm] = useState(false)
  const router = useVueRouter()
  const {
    currentRoute: { value: route },
  } = router

  const { id, slug, projectName } = route.params

  const formRef = useRef<AssistantFormRef>(null)
  const capturedFormValues = useRef<Record<string, any> | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const handleBack = () => {
    goBackAssistants(ASSISTANT_DETAILS)
  }

  const performSave = async (
    assistantId: string,
    values: Record<string, any>,
    skipValidation?: boolean
  ) => {
    const preSaveStatus = assistant?.marketplace_status
    const preSaveIsGlobal = assistant?.is_global
    const result = await assistantsStore.updateAssistant(assistantId, values as any, skipValidation)
    if (isMarketplaceGatedEdit(preSaveStatus, preSaveIsGlobal)) {
      const refreshed = await assistantsStore.getAssistant(assistantId)
      setAssistant(refreshed)
    }
    return result
  }

  const performPublish = async (
    assistantId: string,
    categories: string[],
    overrideNotice?: string
  ) => {
    return assistantsStore.publishAssistantToMarketplace(
      assistantId,
      categories,
      undefined,
      !overrideNotice,
      Boolean(overrideNotice),
      overrideNotice
    )
  }

  const gate = useMarketplaceEditGate({
    assistantId: (id as string) || assistant?.id,
    assistantStatus: assistant?.marketplace_status,
    assistantIsGlobal: assistant?.is_global,
    getFormValues: () => capturedFormValues.current ?? undefined,
    onGateCheck: (assistantId, values, cats) =>
      assistantsStore.checkMarketplaceGates(assistantId, values as any, cats),
    onUnpublish: (assistantId) => assistantsStore.unpublishAssistantFromMarketplace(assistantId),
    onSave: performSave,
    onPublish: performPublish,
    onSuccess: handleBack,
    onSubmittedForReview: () => setShowPendingReviewConfirm(true),
    onRefreshForGateError: async (assistantId) => {
      const refreshed = await assistantsStore.getAssistant(assistantId)
      setAssistant(refreshed)
    },
    unblockTransition: () => formRef.current?.unblockTransition(),
    onMissingIntegrations: (validation, values) =>
      formRef.current?.showMissingIntegrations(validation, values as any),
  })

  const handleSubmit = async (values: any, skipValidation = false) => {
    const assistantId = (id as string) || assistant?.id
    if (!assistantId) {
      toaster.error('Assistant is not loaded — cannot save. Please reload and try again.')
      throw new Error('Cannot update assistant: id is missing')
    }
    // Route live-marketplace saves through the gate so the form schema has already
    // run before the revalidation modal opens — same pattern as ChatConfigAssistantForm.
    // `skipValidation` travels with the gate so "Skip Validation & Save" is honoured.
    if (gate.handleSaveClickForLive(skipValidation)) {
      capturedFormValues.current = values
      return { success: false }
    }
    return performSave(assistantId, values, skipValidation)
  }

  const handleSuccess = () => {
    toaster.info('Assistant has been updated successfully!')
    handleBack()
  }

  const handleSaveClick = () => {
    formRef.current?.submit()
  }

  const handlePendingReviewClose = () => {
    setShowPendingReviewConfirm(false)
    handleBack()
  }

  useEffect(() => {
    const fetchAssistantData = async () => {
      setIsLoading(true)
      try {
        const loaded = id
          ? await assistantsStore.getAssistant(id as string)
          : await assistantsStore.getAssistantBySlug(slug as string, false, projectName as string)
        setAssistant(loaded)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAssistantData()
  }, [id, slug, projectName])

  return (
    <div className="flex h-full">
      <Sidebar title="Assistants" description="Browse and chat with available AI assistants">
        <AssistantsNavigation />
      </Sidebar>

      <PageLayout
        showBack
        limitWidth
        isLoading={isLoading}
        title="Edit Assistant"
        subtitle={assistant?.name}
        onBack={handleBack}
        rightContent={
          <div className="flex gap-4">
            <Button
              type="magical"
              disabled={isLoading}
              onClick={() => formRef.current?.handleRefineWithAI()}
            >
              <AIGenerateSVG /> Refine with AI
            </Button>
            <Button type="secondary" onClick={handleBack}>
              Cancel
            </Button>
            <Button type="primary" disabled={isLoading} onClick={handleSaveClick}>
              Save
            </Button>
          </div>
        }
      >
        {!isLoading && assistant && (
          <AssistantForm
            isEditing
            ref={formRef}
            assistant={assistant}
            onSubmit={handleSubmit}
            onSuccess={handleSuccess}
            showNewIntegrationPopup={showNewIntegrationPopup}
          />
        )}

        <NewIntegrationPopup
          visible={showNewIntegration}
          onHide={hideNewIntegrationPopup}
          onSuccess={onIntegrationSuccess}
          project={selectedProject}
          credentialType={selectedCredentialType}
        />
      </PageLayout>

      <ConfirmationModal
        className="w-[480px]"
        visible={gate.revalidationWarningVisible}
        header="Save changes"
        message={gate.revalidationWarningMessage}
        confirmText="Save"
        cancelText="Cancel"
        onConfirm={gate.handleRevalidationConfirm}
        onCancel={gate.handleRevalidationCancel}
      />

      <Popup
        className="w-[650px]"
        hideClose
        header="Publish to Marketplace"
        visible={gate.isValidating}
        onHide={() => {}}
        withBorder
        footerContent={<></>}
      >
        <div className="flex flex-col items-center justify-center pb-12 pt-6">
          <Spinner inline className="w-8 h-8" />
          <p className="mt-4 text-sm text-text-quaternary">{gate.validatingMessage}</p>
        </div>
      </Popup>

      {assistant && (
        <PublishGateFindingsModal
          visible={gate.gateError != null}
          assistant={assistant}
          marketplaceStatus={assistant.marketplace_status}
          error={gate.gateError}
          onHide={gate.handleGateKeepEditing}
          onSendForReview={gate.handleGateSaveAndUnpublish}
          sendForReviewLabel={gate.gateSendForReviewLabel}
          statusBannerOverride={gate.gateBannerText}
          onUnpublishAndEdit={gate.handleGateKeepEditing}
          isSendingForReview={gate.isSavingAndUnpublishing}
          onForcePublish={gate.handleGateForcePublish}
          onPublishAnyway={gate.handleGatePublishAnyway}
        />
      )}

      <SubmittedForReviewModal
        isOpen={showPendingReviewConfirm}
        onClose={handlePendingReviewClose}
      />
    </div>
  )
}

export default EditAssistantPage
