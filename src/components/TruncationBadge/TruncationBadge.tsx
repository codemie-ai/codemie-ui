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

import StatusWarningSvg from '@/assets/icons/status-warning.svg?react'
import { TRUNCATION_TOOLTIP_PREFIX } from '@/constants/workflows'
import { cn } from '@/utils/utils'

interface TruncationBadgeProps {
  truncated?: boolean
  className?: string
}

/**
 * Marks output the backend cut short at a token limit. Renders nothing when the
 * output is complete, so callers can pass the flag straight through instead of
 * guarding at every site.
 *
 * Sized to 14px to sit alongside the `naked` StatusIndicator in a Thought
 * header; the workflow drawer passes `size-4` to match the larger indicator
 * used there.
 */
const TruncationBadge: FC<TruncationBadgeProps> = ({ truncated, className }) => {
  if (!truncated) return null

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center"
      data-tooltip-id="react-tooltip"
      data-tooltip-content={TRUNCATION_TOOLTIP_PREFIX}
    >
      <StatusWarningSvg className={cn('size-3.5 text-feedback-warning', className)} />
    </span>
  )
}

export default TruncationBadge
