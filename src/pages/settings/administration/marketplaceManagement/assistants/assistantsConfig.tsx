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

import { FC, ReactNode } from 'react'

import CheckSvg from '@/assets/icons/check.svg?react'
import CrossSvg from '@/assets/icons/cross.svg?react'
import PublishSvg from '@/assets/icons/publish.svg?react'
import UnpublishSvg from '@/assets/icons/unpublish.svg?react'
import NavigationMore from '@/components/NavigationMore/NavigationMore'
import type { AssistantRow } from '@/store/marketplaceManagement'
import { ColumnDefinition, DefinitionTypes } from '@/types/table'
import { formatDateTime } from '@/utils/helpers'

import {
  getAssistantActions,
  toAssistantStatusBadgeStatus,
  type AssistantActionId,
} from '../assistantActions'

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

export const COLUMN_DEFINITIONS: ColumnDefinition[] = [
  { key: 'select', type: DefinitionTypes.Selection, headClassNames: '!w-[4%]' },
  {
    key: 'name',
    label: 'Assistant',
    type: DefinitionTypes.Custom,
    headClassNames: 'w-[18%]',
    headerNoWrap: false,
  },
  {
    key: 'submitted_by',
    label: 'Submitted by',
    type: DefinitionTypes.Custom,
    headClassNames: 'w-[14%]',
    headerNoWrap: false,
  },
  {
    key: 'submitted_at',
    label: 'Submitted at',
    type: DefinitionTypes.Custom,
    headClassNames: 'w-[14%]',
    headerNoWrap: false,
  },
  {
    key: 'categories',
    label: 'Category',
    type: DefinitionTypes.Custom,
    headClassNames: 'w-[18%]',
    headerNoWrap: false,
  },
  { key: 'actions', label: 'Actions', type: DefinitionTypes.Custom, headClassNames: 'w-[6%]' },
]

// ---------------------------------------------------------------------------
// Row action configuration
// ---------------------------------------------------------------------------

export type ActivePopup = 'reject' | 'forcePublish'

/**
 * Maps each action id to its display label and icon so the column renderer
 * can build the menu items without a switch statement.
 */
export const ACTION_CONFIG: Record<AssistantActionId, { title: string; icon: ReactNode }> = {
  publish: { title: 'Publish', icon: <CheckSvg /> },
  'force-publish': { title: 'Force-publish', icon: <PublishSvg /> },
  reject: { title: 'Reject', icon: <CrossSvg /> },
  withdraw: { title: 'Withdraw', icon: <UnpublishSvg /> },
}

export const withdrawLabel = (row: AssistantRow): string =>
  toAssistantStatusBadgeStatus(row) === 'verified' ? 'Unpublish' : 'Withdraw'

export const pendingWithdrawCopy = (
  row: AssistantRow | null
): { header: string; confirmText: string } => {
  if (!row) return { header: 'Withdraw assistant?', confirmText: 'Withdraw' }
  const label = withdrawLabel(row)
  return {
    header: label === 'Unpublish' ? 'Unpublish assistant?' : 'Withdraw assistant?',
    confirmText: label,
  }
}

export const UNPUBLISH_DRAWER_COPY = {
  buttonLabel: 'Unpublish',
  confirmHeader: 'Unpublish assistant?',
  confirmMessage: 'This assistant will be removed from the marketplace.',
  confirmButtonText: 'Unpublish',
  successMessage: 'Assistant unpublished from the marketplace.',
}

export const drawerWithdrawCopy = (row: AssistantRow | null) =>
  row && withdrawLabel(row) === 'Unpublish' ? UNPUBLISH_DRAWER_COPY : undefined

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const AssistantsEmptyState: FC<{ searchTerm: string }> = ({ searchTerm }) => (
  <span data-testid="marketplace-assistants-empty-state">
    {searchTerm
      ? 'No assistants match this search.'
      : 'No assistants found for the selected filters.'}
  </span>
)

// ---------------------------------------------------------------------------
// Column render helpers (module-level to avoid component-in-component Sonar warnings)
// ---------------------------------------------------------------------------

export const renderSubmittedBy = (item: AssistantRow) => (
  <span
    data-testid="assistants-creator"
    className="block truncate text-xs font-medium"
    title={item.submitted_by ?? undefined}
  >
    {item.submitted_by || '—'}
  </span>
)

export const renderSubmittedAt = (item: AssistantRow) => (
  <span
    data-testid="assistants-submitted-at"
    data-value={item.submitted_at ?? undefined}
    className="text-xs text-text-secondary tabular-nums"
    title={
      item.submitted_at != null
        ? formatDateTime(new Date(item.submitted_at * 1000).toISOString())
        : undefined
    }
  >
    {item.submitted_at != null
      ? formatDateTime(new Date(item.submitted_at * 1000).toISOString(), 'relative')
      : '—'}
  </span>
)

export const renderCategories = (item: AssistantRow) => {
  const cats = item.categories ?? []
  if (cats.length === 0) {
    return (
      <span data-testid="assistants-categories" className="text-xs text-text-tertiary">
        —
      </span>
    )
  }
  return (
    <div data-testid="assistants-categories" className="flex flex-wrap gap-1">
      {cats.slice(0, 3).map((cat) => (
        <span
          key={cat}
          className="inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-none bg-surface-base-secondary text-text-tertiary border-border-structural"
        >
          {cat}
        </span>
      ))}
      {cats.length > 3 && (
        <span className="text-[10px] text-text-tertiary">+{cats.length - 3}</span>
      )}
    </div>
  )
}

export const makeNameRenderer = (onSelect: (id: string) => void) => (item: AssistantRow) =>
  (
    <button
      data-testid="marketplace-assistants-assistant-name"
      className="text-xs font-medium text-left hover:opacity-75 cursor-pointer break-words min-w-0 max-w-full rounded focus:outline-none focus:ring-1 focus:ring-text-accent"
      onClick={() => onSelect(item.assistant_id)}
    >
      {item.name || '—'}
    </button>
  )

export const makeActionsRenderer =
  (
    onPublish: (item: AssistantRow) => void,
    onWithdraw: (item: AssistantRow) => void,
    onOpenPopup: (id: string, kind: 'reject' | 'forcePublish') => void
  ) =>
  (item: AssistantRow) => {
    const actionIds = getAssistantActions(item)
    if (actionIds.length === 0) return null
    const handleClick = (id: AssistantActionId) => {
      if (id === 'publish') return onPublish(item)
      if (id === 'withdraw') return onWithdraw(item)
      return onOpenPopup(item.assistant_id, id === 'reject' ? 'reject' : 'forcePublish')
    }
    return (
      <NavigationMore
        hideOnClickInside
        className="justify-end"
        buttonClassName="ml-auto"
        contextId={`assistants-row-${item.assistant_id}`}
        triggerTestId={`assistants-row-actions-${item.assistant_id}`}
        items={actionIds.map((id) => ({
          title: id === 'withdraw' ? withdrawLabel(item) : ACTION_CONFIG[id].title,
          icon: ACTION_CONFIG[id].icon,
          testId: `assistants-action-${id}-${item.assistant_id}`,
          onClick: () => handleClick(id),
        }))}
      />
    )
  }
