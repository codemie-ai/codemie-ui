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

import type { VerdictKind } from '@/types/generated/marketplaceManagement'

import { verdictKindLabel } from './ReasonChip'
import StatusChip from './StatusChip'

interface VerdictChipProps {
  kind: string | null | undefined
  className?: string
  tooltip?: string
}

const verdictStyles: Record<VerdictKind, string> = {
  CANDIDATE_FOR_CLEANUP: 'bg-failed-secondary/15 text-failed-secondary border-failed-secondary/40',
  KEEP: 'bg-success-primary/15 text-success-primary border-success-primary/40',
  REVIEW: 'bg-surface-base-secondary text-text-tertiary border-border-structural',
}

const VerdictChip: FC<VerdictChipProps> = ({ kind, className, tooltip }) => {
  if (!kind) return <StatusChip label={null} />

  const key = kind.toUpperCase() as VerdictKind
  const chipClass = (verdictStyles[key] ?? verdictStyles.REVIEW) + ' tracking-wide'

  return (
    <StatusChip
      label={verdictKindLabel(kind)}
      chipClass={chipClass}
      tooltip={tooltip}
      className={className}
    />
  )
}

export default VerdictChip
