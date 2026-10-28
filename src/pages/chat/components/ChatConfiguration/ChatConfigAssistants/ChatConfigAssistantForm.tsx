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

import { FC, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'

import ConfirmationModal from '@/components/ConfirmationModal'
import Popup from '@/components/Popup'
import Spinner from '@/components/Spinner'
import { AssistantType, isMarketplaceGatedEdit } from '@/constants/assistants'
import PublishGateFindingsModal from '@/pages/assistants/AssistantActions/components/PublishGateFindingsModal'
import SubmittedForReviewModal from '@/pages/assistants/AssistantActions/components/SubmittedForReviewModal'
import AssistantForm, {
  AssistantFormRef,
} from '@/pages/assistants/components/AssistantForm/AssistantForm'
import RemoteAssistantForm, {
  RemoteAssistantFormRef,
} from '@/pages/assistants/components/RemoteAssistantForm/RemoteAssistantForm'
import { useMarketplaceEditGate } from '@/pages/assistants/hooks/useMarketplaceEditGate'
import { assistantsStore } from '@/store'
import { canEdit } from '@/utils/entity'
import { isMarketplaceApprovalGateEnabled } from '@/utils/featureFlags'
import toaster from '@/utils/toaster'

import { useChatContext } from '../../../hooks/useChatContext'

interface ChatConfigAssistantFormProps {
  showNewIntegrationPopup: (project: string, credentialType: string) => void
}

const ChatConfigAssistantForm: FC<ChatConfigAssistantFormProps> = ({ showNewIntegrationPopup }) => {
  const formRef = useRef<AssistantFormRef>(null)
  const remoteFormRef = useRef<RemoteAssistantFormRef>(null)
  // Captured form values from handleSubmit — getFormValues reads them at confirmation time.
  const capturedFormValues = useRef<Record<string, any> | null>(null)

  const { updateAssistant, updateRemoteAssistant } = useSnapshot(assistantsStore)
  const { selectedAssistant, isLoading, closeConfigForm } = useChatContext()

  const isRemoteAssistant =
    selectedAssistant?.type === AssistantType.A2A ||
    selectedAssistant?.type === AssistantType.REMOTE

  const [showPendingReviewConfirm, setShowPendingReviewConfirm] = useState(false)

  const handleSuccess = () => {
    toaster.info('Assistant has been updated successfully!')
    closeConfigForm()
  }

  const handlePendingReviewClose = () => {
    setShowPendingReviewConfirm(false)
    closeConfigForm()
  }

  const gate = useMarketplaceEditGate({
    assistantId: selectedAssistant?.id,
    assistantStatus: selectedAssistant?.marketplace_status,
    assistantIsGlobal: selectedAssistant?.is_global,
    getFormValues: () => capturedFormValues.current ?? undefined,
    onGateCheck: (id, values, cats) =>
      assistantsStore.checkMarketplaceGates(id, values as any, cats),
    onUnpublish: (id) => assistantsStore.unpublishAssistantFromMarketplace(id),
    onSave: async (assistantId, values, skipValidation) =>
      assistantsStore.updateAssistant(assistantId, values as any, skipValidation ?? false),
    onPublish: async (assistantId, categories, overrideNotice) =>
      assistantsStore.publishAssistantToMarketplace(
        assistantId,
        categories,
        undefined,
        !overrideNotice,
        Boolean(overrideNotice),
        overrideNotice
      ),
    onSuccess: handleSuccess,
    onSubmittedForReview: () => setShowPendingReviewConfirm(true),
    onMissingIntegrations: (validation, values) =>
      formRef.current?.showMissingIntegrations(validation, values as any),
  })

  const handleSubmit = async (values: any, skipValidation = false) => {
    if (!selectedAssistant) return { error: 'No assistant selected' }

    if (isRemoteAssistant) {
      return updateRemoteAssistant(selectedAssistant.id, values)
    }

    if (
      isMarketplaceApprovalGateEnabled() &&
      isMarketplaceGatedEdit(selectedAssistant.marketplace_status, selectedAssistant.is_global)
    ) {
      capturedFormValues.current = values
      gate.handleSaveClickForLive(skipValidation)
      return { success: false }
    }

    return updateAssistant(selectedAssistant.id, values, skipValidation)
  }

  if (isLoading) return <Spinner inline className="mx-auto my-auto" rootClassName="h-full" />

  if (!selectedAssistant || !canEdit(selectedAssistant)) {
    closeConfigForm()
    return null
  }

  if (isRemoteAssistant) {
    return (
      <RemoteAssistantForm
        isEditing
        isChatConfig
        ref={remoteFormRef}
        key={selectedAssistant.id}
        assistant={selectedAssistant}
        onSubmit={handleSubmit}
        onSuccess={handleSuccess}
        onCancel={closeConfigForm}
      />
    )
  }

  return (
    <>
      <AssistantForm
        isEditing
        isChatConfig
        ref={formRef}
        key={selectedAssistant.id}
        assistant={selectedAssistant}
        onSubmit={handleSubmit}
        onSuccess={handleSuccess}
        onCancel={closeConfigForm}
        showNewIntegrationPopup={showNewIntegrationPopup}
      />

      <ConfirmationModal
        className="w-[480px]"
        visible={gate.revalidationWarningVisible}
        header="Save changes"
        message={gate.revalidationWarningMessage}
        confirmText="Save"
        cancelText="Cancel"
        confirmTestId="revalidation-confirm"
        cancelTestId="revalidation-cancel"
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

      {selectedAssistant && (
        <PublishGateFindingsModal
          visible={gate.gateError != null}
          assistant={selectedAssistant}
          marketplaceStatus={selectedAssistant.marketplace_status}
          error={gate.gateError}
          onHide={gate.handleGateKeepEditing}
          onForcePublish={gate.handleGateForcePublish}
          onPublishAnyway={gate.handleGatePublishAnyway}
          onSendForReview={gate.handleGateSaveAndUnpublish}
          sendForReviewLabel={gate.gateSendForReviewLabel}
          statusBannerOverride={gate.gateBannerText}
          onUnpublishAndEdit={gate.handleGateKeepEditing}
          isSendingForReview={gate.isSavingAndUnpublishing}
        />
      )}

      <SubmittedForReviewModal
        isOpen={showPendingReviewConfirm}
        onClose={handlePendingReviewClose}
      />
    </>
  )
}

export default ChatConfigAssistantForm
