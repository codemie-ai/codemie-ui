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

import AiGenerateSvg from '@/assets/icons/ai-generate.svg?react'
import InfoSvg from '@/assets/icons/info.svg?react'
import UnpublishSvg from '@/assets/icons/unpublish.svg?react'
import NavigationMore from '@/components/NavigationMore/NavigationMore'
import TooltipButton from '@/components/TooltipButton/TooltipButton'
import { marketplaceManagementStore } from '@/store/marketplaceManagement'
import type { AuditConfigResponse, CleanupRow } from '@/types/generated/marketplaceManagement'

import { getBucketTooltip, getTierTooltip } from './cleanupColumns'
import BucketChip from '../components/BucketChip'
import { verdictKindLabel } from '../components/ReasonChip'
import TierChip from '../components/TierChip'

const CleanupLikesCell = ({ item }: { item: CleanupRow }) => (
  <span className="text-xs font-medium tabular-nums">{item.unique_likes_count ?? '—'}</span>
)

const CleanupTierCell = ({
  item,
  auditConfig,
}: {
  item: CleanupRow
  auditConfig: AuditConfigResponse | null
}) => (
  <TierChip
    tier={item.usage_tier}
    tooltip={item.usage_tier ? getTierTooltip(item.usage_tier, auditConfig) : undefined}
  />
)

const CleanupBucketCell = ({ item }: { item: CleanupRow }) => (
  <BucketChip
    bucket={item.bucket}
    tooltip={item.bucket ? getBucketTooltip(item.bucket) : undefined}
  />
)

const CleanupDecisionCell = ({ item }: { item: CleanupRow }) =>
  item.verdict_kind ? (
    <span
      className="flex items-center justify-between text-xs font-medium text-text-primary"
      data-value={item.verdict_kind}
    >
      {verdictKindLabel(item.verdict_kind)}
      {item.detail && <TooltipButton content={item.detail} />}
    </span>
  ) : (
    <span className="text-text-tertiary text-xs">—</span>
  )

const CleanupOpenCell = ({
  item,
  onView,
  onUnpublish,
}: {
  item: CleanupRow
  onView: (id: string) => void
  onUnpublish: (item: CleanupRow) => void
}) => {
  const rowId = item.id
  return (
    <NavigationMore
      hideOnClickInside
      className="justify-end"
      buttonClassName="ml-auto"
      contextId={`mm-cleanup-${rowId}`}
      items={[
        {
          title: 'View details',
          icon: <InfoSvg />,
          onClick: () => onView(rowId),
        },
        {
          title: 'Assess with AI',
          icon: <AiGenerateSvg />,
          onClick: () => {
            onView(rowId)
            marketplaceManagementStore.assessWithAI(rowId)
          },
        },
        {
          title: 'Unpublish',
          testId: `cleanup-action-unpublish-${rowId}`,
          icon: <UnpublishSvg />,
          onClick: () => onUnpublish(item),
        },
      ]}
    />
  )
}

export const renderCleanupCreator = (item: CleanupRow) => {
  const raw = item.creator?.trim()
  if (!raw) return <span className="text-xs text-text-tertiary">—</span>
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)
  const display = isUuid ? `${raw.slice(0, 6)}…` : raw
  return (
    <span className="block truncate text-xs text-text-secondary" title={raw}>
      {display}
    </span>
  )
}

export const renderCleanupUsers = (item: CleanupRow) => (
  <span className="text-xs font-medium tabular-nums">{item.unique_users_count}</span>
)

export const renderCleanupLikes = (item: CleanupRow) => <CleanupLikesCell item={item} />

export const renderCleanupBucket = (item: CleanupRow) => <CleanupBucketCell item={item} />

export const renderCleanupDecision = (item: CleanupRow) => <CleanupDecisionCell item={item} />

export const makeCleanupAssistantRenderer =
  (setSelectedAssistantId: (id: string | null) => void) => (item: CleanupRow) => {
    const rowId = item.id
    const canonicalName = item.canonical_name
    const cats = item.categories ?? []
    return (
      <div className="flex flex-col gap-1 min-w-0 min-h-[64px] justify-center">
        <button
          className="text-xs font-medium text-left hover:opacity-75 cursor-pointer truncate max-w-full"
          data-testid="cleanup-assistant-name"
          onClick={() => setSelectedAssistantId(rowId)}
        >
          {item.name}
        </button>

        {cats.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {cats.slice(0, 3).map((cat) => (
              <span
                key={cat}
                className="inline-flex items-center rounded-full px-1.5 py-0 text-[10px] font-medium bg-surface-base-secondary text-text-secondary border border-border-structural whitespace-nowrap"
              >
                {cat}
              </span>
            ))}
            {cats.length > 3 && (
              <span className="text-[10px] text-text-tertiary">+{cats.length - 3}</span>
            )}
          </div>
        )}

        {canonicalName && (
          <span className="text-[10px] text-text-tertiary truncate">
            ↳ canonical: {canonicalName}
          </span>
        )}
      </div>
    )
  }

export const makeCleanupTierRenderer =
  (auditConfig: typeof marketplaceManagementStore.auditConfig) => (item: CleanupRow) =>
    <CleanupTierCell item={item} auditConfig={auditConfig} />

export const makeCleanupOpenRenderer =
  (onView: (id: string | null) => void, onUnpublish: (item: CleanupRow) => void) =>
  (item: CleanupRow) =>
    <CleanupOpenCell item={item} onView={onView} onUnpublish={onUnpublish} />
