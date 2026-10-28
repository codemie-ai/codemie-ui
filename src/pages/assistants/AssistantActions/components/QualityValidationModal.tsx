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
import {
  REASON_MAX_LENGTH,
  REASON_MIN_LENGTH,
  isReasonWithinBounds,
  reasonLength,
} from '@/pages/settings/administration/marketplaceManagement/reasonValidation'
import { QualityValidation, Assistant } from '@/types/entity/assistant'

import QualityValidationSummary from './QualityValidationSummary'

interface QualityValidationModalProps {
  visible: boolean
  qualityValidation: QualityValidation | null
  assistant: Assistant
  onHide: () => void
  /** Whether the current user may waive the advisory verdict. */
  canPublishAnyway?: boolean
  /** Ask for an override reason first (marketplace management on); it is passed to onPublishAnyway. */
  requireReason?: boolean
  onPublishAnyway: (reason?: string) => Promise<void>
}

const QualityValidationModal: React.FC<QualityValidationModalProps> = ({
  visible,
  qualityValidation,
  assistant,
  onHide,
  canPublishAnyway = false,
  requireReason = false,
  onPublishAnyway,
}) => {
  const router = useVueRouter()
  const [publishing, setPublishing] = useState(false)
  const [showReason, setShowReason] = useState(false)
  const [reason, setReason] = useState('')

  const reasonIsValid = isReasonWithinBounds(reason)

  const handleHide = () => {
    setShowReason(false)
    setReason('')
    onHide()
  }

  // Handle manual edit navigation
  const handleManualEdit = () => {
    // Navigate to edit assistant page
    const routeName = assistant.integration_id ? 'edit-remote-assistant' : 'edit-assistant'
    router.push({
      name: routeName,
      params: { id: assistant.id },
    })

    // Close modal
    handleHide()
  }

  const handlePublishAnyway = async () => {
    if (requireReason && !reasonIsValid) return
    setPublishing(true)
    try {
      await onPublishAnyway(requireReason ? reason.trim() : undefined)
      // Completion (close, confirmation, reload) belongs to the parent: calling onHide here
      // would close the whole publish flow and drop a PENDING_REVIEW confirmation or gate error.
      setShowReason(false)
      setReason('')
    } catch (error) {
      console.error('Failed to publish assistant:', error)
    } finally {
      setPublishing(false)
    }
  }

  const footerContent = (
    <div className="flex justify-end gap-4">
      <Button variant={ButtonType.SECONDARY} onClick={handleHide} disabled={publishing}>
        Cancel
      </Button>
      {canPublishAnyway && !(requireReason && showReason) && (
        <Button
          variant={ButtonType.PRIMARY}
          onClick={requireReason ? () => setShowReason(true) : handlePublishAnyway}
          disabled={publishing}
          data-testid="quality-validation-publish-anyway"
        >
          Publish Anyway
        </Button>
      )}
      {canPublishAnyway && requireReason && showReason && (
        <Button
          variant={ButtonType.DELETE}
          onClick={handlePublishAnyway}
          disabled={!reasonIsValid || publishing}
          data-testid="quality-validation-reason-confirm"
        >
          Confirm Publish Anyway
        </Button>
      )}
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
      onHide={handleHide}
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

          {canPublishAnyway && requireReason && showReason && (
            <div
              className="flex flex-col gap-2 rounded-md border border-failed-secondary/40 bg-failed-secondary/5 p-3"
              data-testid="quality-validation-reason"
            >
              <label
                htmlFor="publish-anyway-reason"
                className="text-xs font-semibold text-text-primary"
              >
                Why is it safe to publish anyway?
              </label>
              <textarea
                id="publish-anyway-reason"
                className="min-h-[72px] w-full rounded-md border border-border-structural bg-surface-elevated p-2 text-xs text-text-primary"
                value={reason}
                maxLength={REASON_MAX_LENGTH}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe why the checks above should be overridden (at least 20 characters)."
                data-testid="quality-validation-reason-input"
              />
              <span className="text-xs text-text-tertiary">
                {reasonLength(reason)}/{REASON_MIN_LENGTH} min characters
              </span>
            </div>
          )}

          <CustomerSupportMessage message="for assistance with marketplace publishing" />
        </div>
      )}
    </Popup>
  )
}

export default QualityValidationModal
