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

import { FC, useCallback, useState } from 'react'

import Button from '@/components/Button'
import ConfirmationModal from '@/components/ConfirmationModal'
import Textarea from '@/components/form/Textarea/Textarea'
import Popup from '@/components/Popup'
import BulkActions from '@/components/Table/BulkActions'
import { ButtonType } from '@/constants'
import { BulkResult, marketplaceManagementStore } from '@/store/marketplaceManagement'
import { PendingRow } from '@/types/generated/marketplaceManagement'
import toaster from '@/utils/toaster'

import { isReasonWithinBounds, reasonBoundHint } from '../reasonValidation'

/**
 * Both forms of the verb, stated rather than derived.
 *
 * The all-failed branch used to build the infinitive with
 * `verb.replace(/e?d$/, '')`, which turns "approved" into "approv" — the admin
 * read "Could not approv any of the 5 selected assistant(s)." English
 * inflection is not a regex, and the only branch that needed the infinitive was
 * also the one nobody saw during development.
 */
interface BulkVerb {
  past: string
  infinitive: string
}

const APPROVE: BulkVerb = { past: 'approved', infinitive: 'approve' }
const REJECT: BulkVerb = { past: 'rejected', infinitive: 'reject' }

/**
 * One summary per bulk action instead of N independent toasts. A partial
 * failure has to say how many of each, or the admin cannot tell whether to
 * retry the whole selection or only part of it.
 */
const reportBulkResult = (result: BulkResult, verb: BulkVerb): void => {
  const { succeeded, failed } = result
  if (failed.length === 0) {
    toaster.success(`${succeeded.length} assistant(s) ${verb.past}.`)
    return
  }
  if (succeeded.length === 0) {
    toaster.error(`Could not ${verb.infinitive} any of the ${failed.length} selected assistant(s).`)
    return
  }
  toaster.error(
    `${succeeded.length} assistant(s) ${verb.past}, ${failed.length} failed. The failed ones are still pending.`
  )
}

interface MarketplacePendingBulkActionsProps {
  selectedItems: PendingRow[]
  onClearSelection: () => void
  onRefresh: () => void
}

const MarketplacePendingBulkActions: FC<MarketplacePendingBulkActionsProps> = ({
  selectedItems,
  onClearSelection,
  onRefresh,
}) => {
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false)
  const [rejectPopupOpen, setRejectPopupOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  // Publishing N assistants to the marketplace at once is as consequential
  // as the single-item approve in AssistantDetailsDrawer (which does confirm)
  // — it used to fire straight from the button's onClick with no "are you
  // sure" step, the only bulk/single action in this slice that didn't
  // (EPMCDME-14234, CR-002).
  const openApproveConfirm = useCallback(() => {
    setApproveConfirmOpen(true)
  }, [])

  const handleApproveSelected = useCallback(async () => {
    if (isBusy) return
    setIsBusy(true)
    try {
      const ids = selectedItems.map((r) => r.assistant_id)
      const result = await marketplaceManagementStore.approveBulk(ids)
      reportBulkResult(result, APPROVE)
      // Always clear and refresh, even on partial failure: the rows that did
      // succeed are no longer pending, and leaving them selected let the admin
      // re-approve them by pressing the button again.
      setApproveConfirmOpen(false)
      onClearSelection()
      onRefresh()
    } finally {
      setIsBusy(false)
    }
  }, [isBusy, selectedItems, onClearSelection, onRefresh])

  const openRejectPopup = useCallback(() => {
    setRejectReason('')
    setRejectPopupOpen(true)
  }, [])

  const handleRejectSubmit = useCallback(async () => {
    // Mirrors the server's `_validate_reason` bound, re-checked here because
    // the disabled button is not the only path into this handler.
    if (!isReasonWithinBounds(rejectReason) || isBusy) return
    setIsBusy(true)
    try {
      const ids = selectedItems.map((r) => r.assistant_id)
      const result = await marketplaceManagementStore.rejectBulk(ids, rejectReason.trim())
      reportBulkResult(result, REJECT)
      setRejectPopupOpen(false)
      onClearSelection()
      onRefresh()
    } finally {
      setIsBusy(false)
    }
  }, [rejectReason, isBusy, selectedItems, onClearSelection, onRefresh])

  if (selectedItems.length === 0) return null

  return (
    <>
      <BulkActions selected={selectedItems.length} onUnselect={onClearSelection}>
        <Button
          size="medium"
          variant="primary"
          data-testid="pending-bulk-approve"
          onClick={openApproveConfirm}
          disabled={isBusy}
          isLoading={isBusy}
        >
          Approve selected
        </Button>
        <Button
          size="medium"
          variant="secondary"
          data-testid="pending-bulk-reject"
          onClick={openRejectPopup}
          disabled={isBusy}
        >
          Reject selected
        </Button>
      </BulkActions>

      <ConfirmationModal
        confirmTestId="pending-bulk-approve-confirm"
        cancelTestId="pending-bulk-approve-cancel"
        visible={approveConfirmOpen}
        onCancel={() => setApproveConfirmOpen(false)}
        onConfirm={handleApproveSelected}
        confirmDisabled={isBusy}
        header={`Publish ${selectedItems.length} assistant(s) to the marketplace?`}
        message="They will become visible to every user in the marketplace."
        confirmText="Publish"
        confirmButtonType={ButtonType.PRIMARY}
      />

      <Popup
        visible={rejectPopupOpen}
        onHide={() => setRejectPopupOpen(false)}
        header={`Reject ${selectedItems.length} assistant(s)`}
        submitText="Reject"
        onSubmit={handleRejectSubmit}
        submitDisabled={!isReasonWithinBounds(rejectReason) || isBusy}
        submitTestId="pending-bulk-submit"
        submitButtonType={ButtonType.DELETE}
        className="w-[480px]"
        withBorderBottom={false}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-primary">
            Provide a reason that will be shared with the submitters.
          </p>
          <Textarea
            data-testid="pending-bulk-reason-input"
            label="Reason"
            placeholder="Enter rejection reason…"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
          />
          <p
            data-testid="bulk-reason-hint"
            className={
              isReasonWithinBounds(rejectReason) || rejectReason.length === 0
                ? 'text-xs text-text-tertiary'
                : 'text-xs text-failed-secondary'
            }
          >
            {reasonBoundHint(rejectReason)}
          </p>
        </div>
      </Popup>
    </>
  )
}

export default MarketplacePendingBulkActions
