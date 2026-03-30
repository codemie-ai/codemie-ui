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

import React, { useState } from 'react'

import Button from '@/components/Button'
import CustomerSupportMessage from '@/components/CustomerSupportMessage'
import Popup from '@/components/Popup'
import Spinner from '@/components/Spinner'
import { ButtonType } from '@/constants'
import { useVueRouter } from '@/hooks/useVueRouter'
import { QualityValidation, Assistant } from '@/types/entity/assistant'

import QualityValidationSummary from './QualityValidationSummary'

interface QualityValidationModalProps {
  visible: boolean
  qualityValidation: QualityValidation | null
  assistant: Assistant
  onHide: () => void
  onPublishAnyway: () => Promise<void>
}

const QualityValidationModal: React.FC<QualityValidationModalProps> = ({
  visible,
  qualityValidation,
  assistant,
  onHide,
  onPublishAnyway,
}) => {
  const router = useVueRouter()
  const [publishing, setPublishing] = useState(false)

  // Handle manual edit navigation
  const handleManualEdit = () => {
    // Navigate to edit assistant page
    const routeName = assistant.integration_id ? 'edit-remote-assistant' : 'edit-assistant'
    router.push({
      name: routeName,
      params: { id: assistant.id },
    })

    // Close modal
    onHide()
  }

  // Handle publish anyway
  const handlePublishAnyway = async () => {
    setPublishing(true)
    try {
      await onPublishAnyway()
      onHide()
    } catch (error) {
      console.error('Failed to publish assistant:', error)
    } finally {
      setPublishing(false)
    }
  }

  const footerContent = (
    <div className="flex justify-end gap-4">
      <Button variant={ButtonType.SECONDARY} onClick={onHide} disabled={publishing}>
        Cancel
      </Button>
      <Button variant={ButtonType.PRIMARY} onClick={handlePublishAnyway} disabled={publishing}>
        Publish Anyway
      </Button>
      <Button variant={ButtonType.PRIMARY} onClick={handleManualEdit} disabled={publishing}>
        Manual Edit
      </Button>
    </div>
  )

  // Return null after all hooks have been called
  if (!qualityValidation) return null

  return (
    <Popup
      className="max-w-2xl w-full"
      header={publishing ? 'Publishing to Marketplace' : 'Assistant Quality Validation Failed'}
      visible={visible}
      onHide={onHide}
      withBorder
      footerContent={publishing ? <></> : footerContent}
    >
      {publishing ? (
        <div className="flex flex-col items-center justify-center pb-12 pt-6">
          <Spinner inline className="w-8 h-8" />
          <p className="mt-4 text-sm text-text-secondary">Publishing your assistant...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-text-quaternary">
            Please review the AI analysis below,
            <br />
            then click &ldquo;Manual Edit&rdquo; and apply the suggested changes.
          </p>

          {qualityValidation.recommendations && (
            <QualityValidationSummary recommendations={qualityValidation.recommendations} />
          )}

          <CustomerSupportMessage message="for assistance with marketplace publishing" />
        </div>
      )}
    </Popup>
  )
}

export default QualityValidationModal
