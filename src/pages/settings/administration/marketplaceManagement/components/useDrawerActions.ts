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

import { useState } from 'react'

import { marketplaceManagementStore } from '@/store/marketplaceManagement'
import type { Bucket } from '@/types/generated/marketplaceManagement'
import toaster from '@/utils/toaster'

import { isReasonWithinBounds } from '../reasonValidation'

export interface WithdrawCopy {
  buttonLabel: string
  confirmHeader: string
  confirmMessage: string
  confirmButtonText: string
  successMessage: string
}

// Default wording matches the Pending queue, where "withdraw" pulls a
// submission out of review. The Cleanup queue overrides this via
// `withdrawCopy` — there the same action removes an already-published
// assistant, which reads to an admin as "unpublish", not "withdraw".
export const DEFAULT_WITHDRAW_COPY: WithdrawCopy = {
  buttonLabel: 'Withdraw',
  confirmHeader: 'Withdraw from the marketplace?',
  confirmMessage: 'This assistant will be removed from the marketplace.',
  confirmButtonText: 'Withdraw',
  successMessage: 'Assistant withdrawn from the marketplace.',
}

interface DrawerActionsConfig {
  assistantId: string | null
  bucket?: Bucket | null
  withdrawCopy: WithdrawCopy
  onActionSuccess?: () => void
  onClose: () => void
}

export function useDrawerActions({
  assistantId,
  bucket,
  withdrawCopy,
  onActionSuccess,
  onClose,
}: DrawerActionsConfig) {
  const [showApproveConfirm, setShowApproveConfirm] = useState(false)
  const [showRejectPopup, setShowRejectPopup] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showForcePublishPopup, setShowForcePublishPopup] = useState(false)
  const [forcePublishReason, setForcePublishReason] = useState('')
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false)
  const [isActionBusy, setIsActionBusy] = useState(false)

  const resetActionState = () => {
    setShowApproveConfirm(false)
    setShowRejectPopup(false)
    setRejectReason('')
    setShowForcePublishPopup(false)
    setForcePublishReason('')
    setShowWithdrawConfirm(false)
    setIsActionBusy(false)
  }

  const handleApproveConfirm = async () => {
    if (!assistantId || isActionBusy) return
    setIsActionBusy(true)
    try {
      await marketplaceManagementStore.approve(assistantId)
      toaster.success('Assistant published to the marketplace.')
      setShowApproveConfirm(false)
      onActionSuccess?.()
      onClose()
    } catch {
      // api.handleError already raised a toast with the server's message
    } finally {
      setIsActionBusy(false)
    }
  }

  const handleRejectSubmit = async () => {
    if (!assistantId || !isReasonWithinBounds(rejectReason) || isActionBusy) return
    setIsActionBusy(true)
    try {
      await marketplaceManagementStore.reject(assistantId, rejectReason.trim())
      toaster.success('Assistant rejected.')
      setShowRejectPopup(false)
      setRejectReason('')
      onActionSuccess?.()
      onClose()
    } catch {
      // api.handleError already raised a toast with the server's message
    } finally {
      setIsActionBusy(false)
    }
  }

  const handleForcePublishSubmit = async () => {
    if (!assistantId || !isReasonWithinBounds(forcePublishReason) || isActionBusy) return
    setIsActionBusy(true)
    try {
      await marketplaceManagementStore.forcePublish(assistantId, forcePublishReason.trim())
      toaster.success('Assistant force-published to the marketplace.')
      setShowForcePublishPopup(false)
      setForcePublishReason('')
      onActionSuccess?.()
      onClose()
    } catch {
      // api.handleError already raised a toast with the server's message
    } finally {
      setIsActionBusy(false)
    }
  }

  const handleWithdrawConfirm = async () => {
    if (!assistantId || isActionBusy) return
    setIsActionBusy(true)
    try {
      await marketplaceManagementStore.withdraw(assistantId, bucket)
      toaster.success(withdrawCopy.successMessage)
      setShowWithdrawConfirm(false)
      onActionSuccess?.()
      onClose()
    } catch {
      // api.handleError already raised a toast with the server's message
    } finally {
      setIsActionBusy(false)
    }
  }

  return {
    showApproveConfirm,
    setShowApproveConfirm,
    showRejectPopup,
    setShowRejectPopup,
    rejectReason,
    setRejectReason,
    showForcePublishPopup,
    setShowForcePublishPopup,
    forcePublishReason,
    setForcePublishReason,
    showWithdrawConfirm,
    setShowWithdrawConfirm,
    isActionBusy,
    resetActionState,
    handleApproveConfirm,
    handleRejectSubmit,
    handleForcePublishSubmit,
    handleWithdrawConfirm,
  }
}
