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

import StatusChip from './StatusChip'

interface BucketChipProps {
  // `CleanupRow.bucket` is nullable in the API contract: a row whose verdict
  // never got a bucket assigned carries `null`. Indexing the style map with
  // that value threw before the generated types made it visible.
  bucket?: Bucket | null
  className?: string
  /**
   * Selector hook. The AI verdict the assessment panel renders is a bucket
   * chip; the numeric score beside it already had `assess-overall-score` while
   * the verdict it implies was addressable only by its copy (F-92).
   */
  'data-testid'?: string
  /** When provided, the chip itself becomes the hover/focus target for the
   * shared `react-tooltip` provider — no separate icon. */
  tooltip?: string
}

// Filled pastel + coloured border + coloured text — legible at row scale
// (the earlier thin-outline pill clipped descenders on "Verified" at some
// zoom levels). A tiny status dot on the left doubles as a colour-blind cue.
// Single source of truth for bucket presentation. The KPI cards previously
// carried their own hand-copied colour list, so the two surfaces could drift
// (and did — the Community card and chip were both painted with a token that
// did not exist).
export const bucketStyles: Record<
  Bucket,
  { chip: string; dot: string; accent: string; surface: string }
> = {
  VERIFIED: {
    chip: 'bg-success-primary/15 text-success-primary border border-success-primary/40',
    dot: 'bg-success-primary',
    accent: 'text-success-primary',
    surface: 'border-success-primary bg-success-secondary focus:ring-success-primary',
  },
  COMMUNITY: {
    chip: 'bg-in-progress-primary/20 text-in-progress-primary border border-in-progress-primary/60',
    dot: 'bg-in-progress-primary',
    accent: 'text-in-progress-primary',
    surface: 'border-in-progress-primary bg-in-progress-primary/20 focus:ring-in-progress-primary',
  },
  DELETE: {
    chip: 'bg-failed-secondary/15 text-failed-secondary border border-failed-secondary/40',
    dot: 'bg-failed-secondary',
    accent: 'text-failed-secondary',
    surface: 'border-failed-secondary bg-failed-tertiary focus:ring-failed-secondary',
  },
}

export const bucketLabel: Record<Bucket, string> = {
  VERIFIED: 'Qualified',
  COMMUNITY: 'Community',
  DELETE: 'Delete',
}

/** Card-sized wording; the chip stays short because it sits inside a table row. */
export const bucketCardLabel: Record<Bucket, string> = {
  VERIFIED: 'Qualified',
  COMMUNITY: 'Community',
  DELETE: 'Flagged for removal',
}

const BucketChip: FC<BucketChipProps> = ({
  bucket,
  className,
  'data-testid': dataTestId,
  tooltip,
}) => {
  if (!bucket) return <StatusChip label={null} data-testid={dataTestId} />

  const styles = bucketStyles[bucket]
  return (
    <span data-testid={dataTestId}>
      <StatusChip
        label={bucketLabel[bucket]}
        chipClass={styles.chip}
        dot={styles.dot}
        tooltip={tooltip}
        className={className}
      />
    </span>
  )
}

export default BucketChip
