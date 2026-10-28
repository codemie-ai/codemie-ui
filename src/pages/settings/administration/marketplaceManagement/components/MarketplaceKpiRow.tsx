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

import type { Bucket } from '@/types/generated/marketplaceManagement'
import { cn } from '@/utils/utils'

import { bucketCardLabel, bucketStyles } from './BucketChip'

const BUCKET_ORDER: readonly Bucket[] = ['VERIFIED', 'COMMUNITY', 'DELETE']

interface KpiCardConfig {
  bucket: Bucket
  isLoading?: boolean
  label: string
  count: number
  usage: number | undefined
  cardClass: string
  labelClass: string
  valueClass: string
}

interface MarketplaceKpiRowProps {
  // `OverviewResponse.buckets` / `.bucket_usage` are open maps on the wire
  // (`dict[str, int]` / `dict[str, float]`, default `{}`), not a record with
  // the three bucket keys guaranteed. Declaring the fixed shape here made an
  // absent bucket look like a number to the compiler while it was `undefined`
  // at runtime; `Partial` is what the contract actually promises.
  buckets: Partial<Record<Bucket, number>>
  bucketUsage: Partial<Record<Bucket, number>>
  onCardClick: (bucket: Bucket) => void
  /** True while the overview payload is still loading and counts are unknown. */
  isLoading?: boolean
  className?: string
}

const KpiCard: FC<KpiCardConfig & { onClick: () => void }> = ({
  bucket,
  label,
  count,
  usage,
  cardClass,
  labelClass,
  valueClass,
  isLoading,
  onClick,
}) => {
  // "12.4% of usage" did not say usage of what, and a bare em dash gave the
  // admin no way to tell "zero" from "not measured".
  const usageLabel =
    usage != null ? `${usage.toFixed(1)}% of all marketplace usage` : 'Usage data not available'

  return (
    <button
      type="button"
      data-testid={`marketplace-kpi-${bucket}`}
      onClick={onClick}
      title={`Open the cleanup queue filtered to ${label}`}
      aria-label={`${label}: ${count.toLocaleString()} assistants, ${usageLabel}. Opens the cleanup queue filtered to ${label}.`}
      className={cn(
        'flex min-w-[180px] flex-1 flex-col gap-2 rounded-lg border p-4 text-left',
        'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-surface-base-primary',
        'cursor-pointer transition-opacity hover:opacity-80',
        cardClass
      )}
    >
      <span className={cn('text-xs font-semibold tracking-wider', labelClass)}>{label}</span>
      <span className={cn('text-3xl font-bold tabular-nums', valueClass)}>
        {isLoading ? '—' : count.toLocaleString()}
      </span>
      <span className={cn('text-xs', labelClass)}>{usageLabel}</span>
    </button>
  )
}

const MarketplaceKpiRow: FC<MarketplaceKpiRowProps> = ({
  buckets,
  bucketUsage,
  onCardClick,
  isLoading,
  className,
}) => {
  // Built from the shared bucket mapping in BucketChip so the cards and the
  // in-table chips can never disagree about a bucket's colour or name.
  const cards: KpiCardConfig[] = BUCKET_ORDER.map((bucket) => ({
    bucket,
    isLoading,
    label: bucketCardLabel[bucket],
    count: buckets?.[bucket] ?? 0,
    usage: bucketUsage?.[bucket],
    cardClass: bucketStyles[bucket].surface,
    labelClass: bucketStyles[bucket].accent,
    valueClass: bucketStyles[bucket].accent,
  }))

  return (
    <div className={cn('flex flex-wrap gap-4', className)}>
      {cards.map((card) => (
        <KpiCard key={card.bucket} {...card} onClick={() => onCardClick(card.bucket)} />
      ))}
    </div>
  )
}

export default MarketplaceKpiRow
