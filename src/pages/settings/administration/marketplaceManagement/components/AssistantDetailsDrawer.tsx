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

import { FC, ReactNode, useEffect, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'

import CheckSvg from '@/assets/icons/check.svg?react'
import CrossSvg from '@/assets/icons/cross.svg?react'
import Button from '@/components/Button'
import Popup from '@/components/Popup'
import Spinner from '@/components/Spinner'
import Tabs from '@/components/Tabs/Tabs'
import type { Tab } from '@/components/Tabs/Tabs'
import { ButtonType } from '@/constants'
import { errorMessage, marketplaceManagementStore } from '@/store/marketplaceManagement'
import type {
  AuditConfigResponse,
  Bucket,
  EntityReviewDetail,
} from '@/types/generated/marketplaceManagement'

import { AssistantAITab } from './AssistantAITab'
import { AssistantDrawerModals } from './AssistantDrawerModals'
import AuditResultsTab from './AuditResultsTab'
import EntityReviewPane from './EntityReviewPane'
import { DEFAULT_WITHDRAW_COPY, useDrawerActions } from './useDrawerActions'
import { getDrawerActions } from '../assistantActions'

import type { AssessmentResult } from './AssistantAITab'
import type { WithdrawCopy } from './useDrawerActions'
import type { AssistantActionId } from '../assistantActions'

type DrawerTabId = 'audit' | 'details' | 'ai'

interface AssistantDetailsDrawerProps {
  assistantId: string | null
  bucket?: Bucket | null
  isCleanupQueue?: boolean
  auditConfig?: AuditConfigResponse | null
  onClose: () => void
  onActionSuccess?: () => void
  withdrawCopy?: Partial<WithdrawCopy>
}

const AssistantDetailsDrawer: FC<AssistantDetailsDrawerProps> = ({
  assistantId,
  bucket,
  isCleanupQueue = false,
  auditConfig = null,
  onClose,
  onActionSuccess,
  withdrawCopy: withdrawCopyOverride,
}) => {
  const withdrawCopy: WithdrawCopy = { ...DEFAULT_WITHDRAW_COPY, ...withdrawCopyOverride }

  const { assessments } = useSnapshot(marketplaceManagementStore)
  const [detail, setDetail] = useState<EntityReviewDetail | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const isOpen = assistantId != null
  // Keyed by id, so a running or finished assessment survives closing the
  // drawer and never shows under a different assistant's name.
  const assessmentEntry = assistantId ? assessments[assistantId] : undefined
  const assessment = (assessmentEntry?.assessment ?? null) as AssessmentResult | null
  const isAssessing = assessmentEntry?.isAssessing ?? false
  const assessmentError = assessmentEntry?.error ?? null

  const drawerActions = useDrawerActions({
    assistantId,
    bucket,
    withdrawCopy,
    onActionSuccess,
    onClose,
  })

  useEffect(() => {
    // Reset action state to prevent stale busy/popup state when the drawer
    // reopens on a different assistant.
    drawerActions.resetActionState()

    setDetail(null)
    setDetailError(null)

    const controller = new AbortController()

    if (assistantId) {
      setIsLoadingDetail(true)
      marketplaceManagementStore
        .getAssistantDetail(assistantId, controller.signal)
        .then((data) => setDetail(data))
        .catch((err: unknown) => {
          if ((err as { name?: string } | null)?.name !== 'AbortError') {
            // Surface an inline error inside the drawer instead of a blank
            // panel when the detail lookup fails (deleted/hidden assistants,
            // 5xx, etc.). The review pane is skipped when detailError is set.
            setDetailError(errorMessage(err, 'Could not load assistant details.'))
            setDetail(null)
          }
        })
        .finally(() => setIsLoadingDetail(false))
    }

    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assistantId])

  // Focus the results container when a new assessment lands so keyboard
  // users land on the new content rather than having to Tab through the
  // whole left column. The aria-live region announces it for screen readers.
  useEffect(() => {
    if (!isAssessing && assessment && resultsRef.current) {
      resultsRef.current.focus()
    }
  }, [isAssessing, assessment])

  const handleAssessWithAI = () => {
    if (!assistantId) return
    marketplaceManagementStore.assessWithAI(assistantId)
  }

  const actions: AssistantActionId[] = detail ? getDrawerActions(detail) : []

  // Flat renderer rather than a nested ternary in JSX (no-nested-ternary).
  const renderDetailPane = (): ReactNode => {
    if (isLoadingDetail) {
      return (
        <div className="flex flex-1 items-center justify-center">
          <Spinner inline className="size-8" />
        </div>
      )
    }
    if (detailError) {
      return (
        <div
          role="alert"
          data-testid="assistant-detail-error"
          className="flex flex-col gap-2 rounded-md border border-failed-secondary/40 bg-failed-secondary/10 p-4 text-sm text-failed-secondary"
        >
          <span className="font-semibold">Could not load assistant details.</span>
          <span className="text-xs opacity-80">{detailError}</span>
        </div>
      )
    }
    if (detail) {
      return <EntityReviewPane detail={detail} isCleanupQueue={isCleanupQueue} />
    }
    return <p className="text-sm text-text-secondary">Could not load assistant details.</p>
  }

  const aiTab = (
    <AssistantAITab
      isAssessing={isAssessing}
      assessment={assessment}
      assessmentError={assessmentError}
      assistantId={assistantId}
      resultsRef={resultsRef}
      onAssessWithAI={handleAssessWithAI}
    />
  )

  // Build the tabs array based on context (EPMCDME-15352). Audit Results
  // tab is only shown in the Cleanup queue.
  const tabs: Tab<DrawerTabId>[] = isCleanupQueue
    ? [
        {
          id: 'audit',
          label: 'Audit results',
          element: detail ? (
            <AuditResultsTab detail={detail} auditConfig={auditConfig} />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <Spinner inline className="size-8" />
            </div>
          ),
        },
        {
          id: 'details',
          label: 'Assistant details',
          element: <div className="overflow-y-auto px-6 py-4 h-full">{renderDetailPane()}</div>,
        },
        { id: 'ai', label: 'AI Assessment', element: aiTab },
      ]
    : [
        {
          id: 'details',
          label: 'Assistant details',
          element: <div className="overflow-y-auto px-6 py-4 h-full">{renderDetailPane()}</div>,
        },
        { id: 'ai', label: 'AI Assessment', element: aiTab },
      ]

  // Action footer — rendered via Popup footerContent so it stays outside
  // the tab content area and remains visible on all active tabs.
  const actionFooter: ReactNode =
    actions.length > 0 ? (
      <div className="flex gap-2 justify-end">
        {actions.includes('reject') && (
          <Button
            variant={ButtonType.DELETE}
            onClick={() => drawerActions.setShowRejectPopup(true)}
            disabled={drawerActions.isActionBusy}
            className="h-8 text-xs"
            data-testid="drawer-reject-button"
          >
            <CrossSvg />
            Reject
          </Button>
        )}
        {actions.includes('withdraw') && (
          <Button
            variant={ButtonType.SECONDARY}
            onClick={() => drawerActions.setShowWithdrawConfirm(true)}
            disabled={drawerActions.isActionBusy}
            className="h-8 text-xs"
            data-testid="drawer-withdraw-button"
          >
            {withdrawCopy.buttonLabel}
          </Button>
        )}
        {actions.includes('publish') && (
          <Button
            variant={ButtonType.PRIMARY}
            onClick={() => drawerActions.setShowApproveConfirm(true)}
            disabled={drawerActions.isActionBusy}
            className="h-8 text-xs"
            data-testid="drawer-approve-button"
          >
            <CheckSvg />
            Publish
          </Button>
        )}
        {actions.includes('force-publish') && (
          <Button
            variant={ButtonType.PRIMARY}
            onClick={() => drawerActions.setShowForcePublishPopup(true)}
            disabled={drawerActions.isActionBusy}
            className="h-8 text-xs"
            data-testid="drawer-force-publish-button"
          >
            <CheckSvg />
            Force-publish
          </Button>
        )}
      </div>
    ) : null

  return (
    <>
      <Popup
        visible={isOpen}
        onHide={onClose}
        header={detail?.name ?? 'Assistant details'}
        hideFooter={actionFooter == null}
        footerContent={actionFooter ?? undefined}
        isFullWidth
        bodyClassName="p-0"
      >
        <div className="h-[75vh] min-h-[min(500px,80vh)] overflow-hidden">
          <Tabs
            tabs={tabs}
            isEmbedded={false}
            alwaysShowTabs
            className="h-full flex flex-col py-2"
            headerClassName="border-b border-border-structural px-4"
            tabClassName="flex-1 overflow-y-auto"
          />
        </div>
      </Popup>

      <AssistantDrawerModals
        isActionBusy={drawerActions.isActionBusy}
        withdrawCopy={withdrawCopy}
        showApproveConfirm={drawerActions.showApproveConfirm}
        onCancelApprove={() => drawerActions.setShowApproveConfirm(false)}
        onConfirmApprove={drawerActions.handleApproveConfirm}
        showRejectPopup={drawerActions.showRejectPopup}
        rejectReason={drawerActions.rejectReason}
        onRejectReasonChange={drawerActions.setRejectReason}
        onHideReject={() => {
          drawerActions.setShowRejectPopup(false)
          drawerActions.setRejectReason('')
        }}
        onSubmitReject={drawerActions.handleRejectSubmit}
        showForcePublishPopup={drawerActions.showForcePublishPopup}
        forcePublishReason={drawerActions.forcePublishReason}
        onForcePublishReasonChange={drawerActions.setForcePublishReason}
        onHideForcePublish={() => {
          drawerActions.setShowForcePublishPopup(false)
          drawerActions.setForcePublishReason('')
        }}
        onSubmitForcePublish={drawerActions.handleForcePublishSubmit}
        showWithdrawConfirm={drawerActions.showWithdrawConfirm}
        onCancelWithdraw={() => drawerActions.setShowWithdrawConfirm(false)}
        onConfirmWithdraw={drawerActions.handleWithdrawConfirm}
      />
    </>
  )
}

export default AssistantDetailsDrawer
