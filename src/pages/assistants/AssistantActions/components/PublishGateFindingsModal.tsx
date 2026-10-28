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
import { useSnapshot } from 'valtio'

import Button from '@/components/Button'
import Popup from '@/components/Popup'
import { ButtonType } from '@/constants'
import { MARKETPLACE_STATUS } from '@/constants/assistants'
import { useVueRouter } from '@/hooks/useVueRouter'
import { getAssistantEditRoute } from '@/pages/assistants/utils/getAssistantLink'
import { userStore } from '@/store'
import { Assistant, QualityValidation } from '@/types/entity/assistant'
import type { MarketplaceStatus } from '@/types/generated/marketplaceManagement'
import { isAdvisoryOnlyQualityValidation } from '@/utils/assistants'
import { formatLabelSentenceCase } from '@/utils/formatLabel'

import QualityValidationSummary from './QualityValidationSummary'

/** Same 20-2000 char rule the backend enforces on `override_notice`. */
const MIN_OVERRIDE_NOTICE_LENGTH = 20
const MAX_OVERRIDE_NOTICE_LENGTH = 2000

/**
 * One deterministic gate finding, exactly as `POST
 * /v1/assistants/{id}/marketplace/publish` reports it.
 *
 * Measured live against the running backend:
 *
 *   422 {"error":{
 *     "message":"Assistant cannot be published: system_prompt_length: System
 *                prompt is 21 chars, minimum is 200.; substance: …",
 *     "details":{
 *       "assistant_id":"…",
 *       "requires_confirmation":false,
 *       "failed_rules":["system_prompt_length","substance"],
 *       "gate_findings":[{"rule":"system_prompt_length","severity":"CRITICAL",
 *                         "message":"System prompt is 21 chars, minimum is 200.",
 *                         "detail":{"length":21,"min":200}}]},
 *     "help":"Fix each rule listed in details.gate_findings and publish again."}}
 */
export interface GateFinding {
  rule: string
  severity: string
  message: string
  detail?: Record<string, unknown>
}

export interface PublishGateError {
  message?: string
  help?: string
  details?: {
    failed_rules?: string[]
    gate_findings?: GateFinding[]
    quality_validation?: QualityValidation
  }
}

interface PublishGateFindingsModalProps {
  visible: boolean
  assistant: Assistant
  error: PublishGateError | null
  onHide: () => void
  /** Admins/maintainers only — bypasses the gate findings and publishes
   * straight to APPROVED/Verified, same as the marketplace-management
   * queue's Force-Publish action. */
  onForcePublish?: (overrideNotice: string) => void
  isForcing?: boolean
  /** Live-edit scenario, any user: save and publish while waiving advisory-only (non-CRITICAL) recommendations. */
  onPublishAnyway?: () => void
  /** Live-edit scenario: primary action (e.g. "Send for manual review" or "Save & Unpublish"). */
  onSendForReview?: () => Promise<void>
  /** Label override for the primary live-edit action button. Defaults to "Send for manual review". */
  sendForReviewLabel?: string
  /** Live-edit scenario: secondary action — keep the edit session open without saving. */
  onUnpublishAndEdit?: () => Promise<void>
  isSendingForReview?: boolean
  isUnpublishing?: boolean
  /** Override the popup header. Defaults to "Assistant Verification Failed". */
  headerText?: string
  /** Override the live-edit description paragraph. */
  descriptionText?: string
  /** Current marketplace status of the assistant. When 'APPROVED' or 'PENDING_REVIEW',
   * an informational banner is rendered inside the modal body to explain why the user
   * is seeing this dialog (assistant is already in the Marketplace, or in the pending
   * review queue). Case-insensitive; other values render no banner. */
  marketplaceStatus?: MarketplaceStatus | null
  /** Override the status banner text. When set, replaces the default text derived from marketplaceStatus. */
  statusBannerOverride?: string | null
}

const getStatusBannerText = (normalizedStatus: string | undefined): string | null => {
  if (normalizedStatus === MARKETPLACE_STATUS.APPROVED) {
    return 'This assistant is already in the Marketplace. Fix the checks below to keep it published.'
  }
  if (normalizedStatus === MARKETPLACE_STATUS.PENDING_REVIEW) {
    return 'This assistant is currently pending Marketplace review. Fix the checks below to keep it in the queue.'
  }
  if (normalizedStatus === MARKETPLACE_STATUS.DRAFT) {
    return 'This assistant is currently in Marketplace Draft. Fix the checks below before submitting it for review.'
  }
  return null
}

/**
 * The eight deterministic gates run **at publish** since EXECUTION-PLAN 7.6,
 * and a CRITICAL finding is a 422 for everyone — waiver or not. Before this
 * component existed the whole payload went to `displayError`, which does
 * `${message}<br>${details}` over an *object*: the author saw the rule names
 * once in a toast, "[object Object]" underneath, and then nothing, because a
 * toast disappears. There was no way to read the list a second time and no
 * route to fixing any of it.
 *
 * This is deliberately **not** `QualityValidationModal`. That one renders the
 * advisory LLM opinion, which an admin may override with "Publish Anyway".
 * A CRITICAL gate finding is not advisory and offering the same escape hatch
 * here would promise something the server refuses — so the only actions are
 * "fix it" and "cancel".
 */
const PublishGateFindingsModal: React.FC<PublishGateFindingsModalProps> = ({
  visible,
  assistant,
  error,
  onHide,
  onForcePublish,
  isForcing = false,
  onPublishAnyway,
  onSendForReview,
  sendForReviewLabel = 'Send for manual review',
  onUnpublishAndEdit,
  isSendingForReview = false,
  isUnpublishing = false,
  headerText = 'Assistant Verification Failed',
  descriptionText,
  marketplaceStatus,
  statusBannerOverride,
}) => {
  const router = useVueRouter()
  const { user } = useSnapshot(userStore)
  const canForcePublish = Boolean(onForcePublish) && Boolean(user?.isAdmin || user?.isMaintainer)
  // Show the live-edit two-action footer when the assistant is currently live
  // and the caller has wired the review/unpublish callbacks.
  // The caller decides whether to pass these callbacks — when both are present,
  // swap to the two-button live-edit footer regardless of current assistant status
  // (the status may already have changed, e.g. auto-unpublished before modal opens).
  const isLiveEditScenario = Boolean(onSendForReview) && Boolean(onUnpublishAndEdit)

  const [showForceReason, setShowForceReason] = useState(false)
  const [overrideNotice, setOverrideNotice] = useState('')

  const findings = error?.details?.gate_findings ?? []
  // A payload that named the rules but carried no findings array would still
  // have to say something useful, so the failed-rule list is the fallback.
  const failedRules = error?.details?.failed_rules ?? []
  const rows: GateFinding[] = findings.length
    ? findings
    : failedRules.map((rule) => ({ rule, severity: 'CRITICAL', message: '' }))
  const qualityValidation = error?.details?.quality_validation ?? null

  // Only an LLM-advisory failure can be waived: any gate finding is a hard failure.
  const canPublishAnyway =
    Boolean(onPublishAnyway) &&
    isLiveEditScenario &&
    qualityValidation != null &&
    rows.length === 0 &&
    isAdvisoryOnlyQualityValidation(qualityValidation)

  const normalizedStatus = marketplaceStatus?.toUpperCase()
  const statusBannerText = statusBannerOverride ?? getStatusBannerText(normalizedStatus)

  // In the live-edit scenario, the primary button copy for PENDING_REVIEW
  // reads "Save and remove from marketplace review queue" — so the description paragraph must
  // match, not the APPROVED "save and unpublish" wording.
  const liveEditDescriptionFallback =
    normalizedStatus === MARKETPLACE_STATUS.PENDING_REVIEW
      ? 'Your changes did not pass the marketplace checks below. Keep editing to fix the issues, or save and remove from the review queue to continue editing outside the marketplace.'
      : 'Your changes did not pass the marketplace checks below. Keep editing to fix the issues, or save and unpublish to continue editing the saved version outside the marketplace.'

  const handleEdit = (): void => {
    const routeName = assistant.integration_id ? 'edit-remote-assistant' : 'edit-assistant'
    if (assistant.integration_id) {
      router.push({ name: routeName, params: { id: assistant.id } })
    } else {
      router.push(getAssistantEditRoute(assistant))
    }
    onHide()
  }

  const handleHide = (): void => {
    setShowForceReason(false)
    setOverrideNotice('')
    onHide()
  }

  const trimmedNotice = overrideNotice.trim()
  const noticeIsValid =
    trimmedNotice.length >= MIN_OVERRIDE_NOTICE_LENGTH &&
    trimmedNotice.length <= MAX_OVERRIDE_NOTICE_LENGTH

  const handleConfirmForcePublish = (): void => {
    if (!noticeIsValid || !onForcePublish) return
    onForcePublish(trimmedNotice)
  }

  const isBusy = isForcing || isSendingForReview || isUnpublishing

  const footerContent = (
    <div className="flex justify-end gap-4">
      {!isLiveEditScenario && (
        <Button
          variant={ButtonType.SECONDARY}
          onClick={handleHide}
          disabled={isBusy}
          data-testid="publish-gate-cancel"
        >
          Cancel
        </Button>
      )}
      {isLiveEditScenario ? (
        <>
          <Button
            variant={ButtonType.SECONDARY}
            onClick={onUnpublishAndEdit}
            disabled={isBusy}
            data-testid="publish-gate-unpublish-edit"
          >
            {isUnpublishing ? 'Unpublishing...' : 'Keep editing'}
          </Button>
          <Button
            variant={ButtonType.PRIMARY}
            onClick={onSendForReview}
            disabled={isBusy}
            data-testid="publish-gate-send-review"
          >
            {isSendingForReview ? 'Sending...' : sendForReviewLabel}
          </Button>
        </>
      ) : (
        <Button
          variant={ButtonType.PRIMARY}
          onClick={handleEdit}
          disabled={isBusy}
          data-testid="publish-gate-edit"
        >
          Edit assistant
        </Button>
      )}
      {canPublishAnyway && (
        <Button
          variant={ButtonType.PRIMARY}
          onClick={onPublishAnyway}
          disabled={isBusy}
          data-testid="publish-gate-publish-anyway"
        >
          Publish Anyway
        </Button>
      )}
      {canForcePublish && !showForceReason && (
        <Button
          variant={ButtonType.DELETE}
          onClick={() => setShowForceReason(true)}
          data-testid="publish-gate-force-publish"
        >
          Force-Publish
        </Button>
      )}
      {canForcePublish && showForceReason && (
        <Button
          variant={ButtonType.DELETE}
          onClick={handleConfirmForcePublish}
          disabled={!noticeIsValid || isForcing}
          data-testid="publish-gate-force-reason-confirm"
        >
          {isForcing ? 'Publishing...' : 'Confirm Force-Publish'}
        </Button>
      )}
    </div>
  )

  if (!error) return null

  return (
    <Popup
      className="w-[560px]"
      header={headerText}
      visible={visible}
      onHide={handleHide}
      withBorder
      footerContent={footerContent}
    >
      <div className="flex flex-col gap-4" data-testid="publish-gate-dialog">
        <p className="text-sm text-text-quaternary">
          {isLiveEditScenario
            ? descriptionText ?? liveEditDescriptionFallback
            : 'The marketplace checks below did not pass. Fix each one and publish again.'}
        </p>

        {rows.length > 0 && (
          <ul className="flex flex-col gap-3">
            {rows.map((finding) => (
              <li
                key={finding.rule}
                data-testid={`publish-gate-finding-${finding.rule}`}
                data-severity={finding.severity}
                className="rounded-md border border-failed-secondary/40 bg-failed-secondary/10 px-3 py-2"
              >
                <span className="block text-xs font-semibold text-text-primary">
                  {formatLabelSentenceCase(finding.rule)}
                </span>
                {finding.message && (
                  <span className="block text-xs text-text-secondary">{finding.message}</span>
                )}
              </li>
            ))}
          </ul>
        )}

        {qualityValidation?.recommendations && (
          <QualityValidationSummary recommendations={qualityValidation.recommendations} />
        )}

        {canForcePublish && showForceReason && (
          <div
            className="flex flex-col gap-2 rounded-md border border-failed-secondary/40 bg-failed-secondary/5 p-3"
            data-testid="publish-gate-force-reason"
          >
            <label
              htmlFor="force-publish-notice"
              className="text-xs font-semibold text-text-primary"
            >
              Why is it safe to publish anyway?
            </label>
            <textarea
              id="force-publish-notice"
              className="min-h-[72px] w-full rounded-md border border-border-structural bg-surface-elevated p-2 text-xs text-text-primary"
              value={overrideNotice}
              maxLength={MAX_OVERRIDE_NOTICE_LENGTH}
              disabled={isForcing}
              onChange={(e) => setOverrideNotice(e.target.value)}
              placeholder="Describe why the checks above should be overridden (at least 20 characters)."
              data-testid="publish-gate-force-reason-input"
            />
            <span className="text-xs text-text-tertiary">
              {trimmedNotice.length}/{MIN_OVERRIDE_NOTICE_LENGTH} min characters
            </span>
          </div>
        )}

        {statusBannerText && !showForceReason && (
          <div
            className="rounded-md border border-in-progress-primary/40 bg-in-progress-primary/10 px-3 py-2 text-xs text-text-primary"
            data-testid="publish-gate-status-banner"
            role="note"
          >
            {statusBannerText}
          </div>
        )}
      </div>
    </Popup>
  )
}

export default PublishGateFindingsModal
