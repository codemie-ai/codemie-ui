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

import React, { useId } from 'react'

import Tooltip from '@/components/Tooltip'
import { MARKETPLACE_STATUS } from '@/constants/assistants'

export type AssistantBadgeStatus = 'verified' | 'rejected' | 'pending'

/** Derives the badge status for an assistant card or details profile. */
export function getAssistantBadgeStatus(
  isMarketplaceManagementEnabled: boolean,
  assistant: { is_verified?: boolean | null; marketplace_status?: string | null },
  visibility: { isOwned?: boolean; isAdmin?: boolean; isShared?: boolean }
): AssistantBadgeStatus | null {
  if (!isMarketplaceManagementEnabled) return null
  if (assistant.is_verified) return 'verified'
  const s = assistant.marketplace_status?.toUpperCase()
  if (!s) return null
  if (s === MARKETPLACE_STATUS.PENDING_REVIEW)
    return visibility.isOwned || visibility.isAdmin || visibility.isShared ? 'pending' : null
  if (s === MARKETPLACE_STATUS.REJECTED)
    return visibility.isOwned || visibility.isAdmin ? 'rejected' : null
  return null
}

interface Props {
  status: AssistantBadgeStatus
  reason?: string
}

const CONFIG: Record<AssistantBadgeStatus, { icon: string; label: string; className: string }> = {
  verified: {
    icon: '✓',
    label: 'VERIFIED',
    className: 'bg-success-primary/15 text-success-primary border-success-primary/40',
  },
  rejected: {
    icon: '✕',
    label: 'REJECTED',
    className: 'bg-failed-primary/15 text-failed-primary border-failed-primary/40',
  },
  pending: {
    icon: '●',
    label: 'REVIEW',
    className: 'bg-text-secondary/15 text-text-secondary border-text-secondary/40',
  },
}

export const AssistantStatusBadge: React.FC<Props> = ({ status, reason }) => {
  const id = useId()
  const targetClass = `asb-${id.replace(/:/g, '')}`
  const { icon, label, className } = CONFIG[status]

  return (
    <>
      {status === 'rejected' && reason && (
        <Tooltip
          target={`.${targetClass}`}
          appendTo={document.body}
          position="bottom"
          showDelay={200}
        />
      )}
      <span
        data-testid="assistant-status-badge"
        data-status={status}
        className={`${targetClass} inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold leading-none whitespace-nowrap border ${className}`}
        data-pr-tooltip={status === 'rejected' && reason ? reason : undefined}
      >
        {icon} {label}
        {status === 'rejected' && reason && <span className="sr-only">: {reason}</span>}
      </span>
    </>
  )
}

/**
 * The full rejection reason as visible text, so the submitter does not need a
 * hover tooltip (touch devices have none). Detail header only, not the card.
 */
export const RejectionReason: React.FC<{ reason: string }> = ({ reason }) => (
  <p
    data-testid="assistant-rejection-reason"
    className="text-xs text-failed-primary whitespace-pre-wrap break-words"
  >
    {reason}
  </p>
)
