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

import { cn } from '@/utils/utils'

interface StatusChipProps {
  /** Chip text. A missing value renders the shared `—` placeholder instead of a chip. */
  label: string | null | undefined
  /** Pre-resolved color + border classes (background, text, border-color). */
  chipClass?: string
  /** Optional dot color class. When provided the chip uses larger padding and a gap. */
  dot?: string
  tooltip?: string
  className?: string
  'data-testid'?: string
}

/** Shared pill markup, tooltip wiring and empty-state fallback used by every marketplace chip. */
const StatusChip: FC<StatusChipProps> = ({
  label,
  chipClass,
  dot,
  tooltip,
  className,
  'data-testid': dataTestId,
}) => {
  if (!label) {
    return (
      <span className="text-text-tertiary text-xs" data-testid={dataTestId}>
        —
      </span>
    )
  }

  return (
    <span
      data-tooltip-id={tooltip ? 'react-tooltip' : undefined}
      data-tooltip-content={tooltip}
      className={cn(
        'inline-flex items-center rounded-full border leading-none whitespace-nowrap text-[11px] font-semibold',
        dot ? 'gap-1.5 px-2.5 py-1' : 'px-2 py-0.5',
        chipClass,
        className
      )}
    >
      {dot && <span className={cn('size-1.5 rounded-full', dot)} />}
      {label}
    </span>
  )
}

export default StatusChip
