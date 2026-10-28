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

import { FC } from 'react'

import ConfirmationModal from '@/components/ConfirmationModal'
import Textarea from '@/components/form/Textarea/Textarea'
import Popup from '@/components/Popup'
import { ButtonType } from '@/constants'

import { isReasonWithinBounds, reasonBoundHint } from '../reasonValidation'

import type { WithdrawCopy } from './useDrawerActions'

export interface AssistantDrawerModalsProps {
  isActionBusy: boolean
  withdrawCopy: WithdrawCopy
  // Approve confirm
  showApproveConfirm: boolean
  onCancelApprove: () => void
  onConfirmApprove: () => void
  // Reject popup
  showRejectPopup: boolean
  rejectReason: string
  onRejectReasonChange: (value: string) => void
  onHideReject: () => void
  onSubmitReject: () => void
  // Force-publish popup
  showForcePublishPopup: boolean
  forcePublishReason: string
  onForcePublishReasonChange: (value: string) => void
  onHideForcePublish: () => void
  onSubmitForcePublish: () => void
  // Withdraw confirm
  showWithdrawConfirm: boolean
  onCancelWithdraw: () => void
  onConfirmWithdraw: () => void
}

export const AssistantDrawerModals: FC<AssistantDrawerModalsProps> = ({
  isActionBusy,
  withdrawCopy,
  showApproveConfirm,
  onCancelApprove,
  onConfirmApprove,
  showRejectPopup,
  rejectReason,
  onRejectReasonChange,
  onHideReject,
  onSubmitReject,
  showForcePublishPopup,
  forcePublishReason,
  onForcePublishReasonChange,
  onHideForcePublish,
  onSubmitForcePublish,
  showWithdrawConfirm,
  onCancelWithdraw,
  onConfirmWithdraw,
}) => (
  <>
    <ConfirmationModal
      confirmTestId="drawer-approve-confirm"
      cancelTestId="drawer-approve-cancel"
      visible={showApproveConfirm}
      onCancel={onCancelApprove}
      onConfirm={onConfirmApprove}
      confirmDisabled={isActionBusy}
      header="Publish to the marketplace?"
      message="This assistant will become visible to every user in the marketplace."
      confirmText="Publish"
      confirmButtonType={ButtonType.PRIMARY}
    />

    <Popup
      visible={showRejectPopup}
      onHide={onHideReject}
      header="Reject assistant"
      submitText="Reject"
      onSubmit={onSubmitReject}
      submitDisabled={!isReasonWithinBounds(rejectReason) || isActionBusy}
      submitTestId="drawer-reject-submit"
      submitButtonType={ButtonType.DELETE}
      className="w-[480px]"
      withBorderBottom={false}
    >
      <div className="flex flex-col gap-4">
        <Textarea
          data-testid="drawer-reject-reason"
          label="Reason"
          placeholder="Enter rejection reason visible to the creator…"
          value={rejectReason}
          onChange={(e) => onRejectReasonChange(e.target.value)}
          rows={4}
        />
        <p
          className={
            isReasonWithinBounds(rejectReason) || rejectReason.length === 0
              ? 'text-xs text-text-tertiary'
              : 'text-xs text-failed-secondary'
          }
        >
          {reasonBoundHint(rejectReason, 'Reason')}
        </p>
      </div>
    </Popup>

    <Popup
      visible={showForcePublishPopup}
      onHide={onHideForcePublish}
      header="Force-publish assistant"
      submitText="Force-publish"
      onSubmit={onSubmitForcePublish}
      submitDisabled={!isReasonWithinBounds(forcePublishReason) || isActionBusy}
      submitTestId="drawer-force-publish-submit"
      submitButtonType={ButtonType.PRIMARY}
      className="w-[480px]"
      withBorderBottom={false}
    >
      <div className="flex flex-col gap-4">
        <Textarea
          data-testid="drawer-force-publish-reason"
          label="Override notice"
          placeholder="Enter the reason for bypassing the gate findings…"
          value={forcePublishReason}
          onChange={(e) => onForcePublishReasonChange(e.target.value)}
          rows={4}
        />
        <p
          className={
            isReasonWithinBounds(forcePublishReason) || forcePublishReason.length === 0
              ? 'text-xs text-text-tertiary'
              : 'text-xs text-failed-secondary'
          }
        >
          {reasonBoundHint(forcePublishReason, 'Override notice')}
        </p>
      </div>
    </Popup>

    <ConfirmationModal
      confirmTestId="drawer-withdraw-confirm"
      cancelTestId="drawer-withdraw-cancel"
      visible={showWithdrawConfirm}
      onCancel={onCancelWithdraw}
      onConfirm={onConfirmWithdraw}
      confirmDisabled={isActionBusy}
      header={withdrawCopy.confirmHeader}
      message={withdrawCopy.confirmMessage}
      confirmText={withdrawCopy.confirmButtonText}
      confirmButtonType={ButtonType.DELETE}
    />
  </>
)
