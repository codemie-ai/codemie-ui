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
import { getAssistantLink } from '@/pages/assistants/utils/getAssistantLink'
import type { EntityReviewDetail } from '@/types/generated/marketplaceManagement'
import { cn } from '@/utils/utils'

export interface AuditSectionProps {
  title: string
  subtitle?: ReactNode
  verdict?: boolean | 'warning' | null
  verdictLabel?: string
  children: ReactNode
}

export const GateVerdict: FC<{ passed: boolean | 'warning'; label?: string }> = ({
  passed,
  label,
}) => {
  if (passed === 'warning') {
    return (
      <span className="shrink-0 rounded-full bg-aborted-primary/15 px-3 py-0.5 text-xs font-semibold uppercase tracking-wide text-aborted-primary ring-1 ring-aborted-primary/40">
        {label ?? 'Warning'}
      </span>
    )
  }
  return passed ? (
    <span className="shrink-0 rounded-full bg-success-primary/15 px-3 py-0.5 text-xs font-semibold uppercase tracking-wide text-success-primary ring-1 ring-success-primary/40">
      {label ?? 'Passed'}
    </span>
  ) : (
    <span className="shrink-0 rounded-full bg-failed-secondary/15 px-3 py-0.5 text-xs font-semibold uppercase tracking-wide text-failed-secondary ring-1 ring-failed-secondary/40">
      {label ?? 'Failed'}
    </span>
  )
}

export const AuditSection: FC<AuditSectionProps> = ({
  title,
  subtitle,
  verdict,
  verdictLabel,
  children,
}) => (
  <section className="flex flex-col gap-3 border-t border-border-structural mt-4 pt-4 first:border-t-0 first:mt-0 first:pt-0">
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
          {title}
        </h3>
        {verdict != null && <GateVerdict passed={verdict} label={verdictLabel} />}
      </div>
      {subtitle && <span className="text-xs text-text-tertiary">{subtitle}</span>}
    </div>
    {children}
  </section>
)

export interface GateBadgeProps {
  label: string
  passed: boolean | 'unavailable'
  testId: string
}

export const GateBadge: FC<GateBadgeProps> = ({ label, passed, testId }) => {
  if (passed === 'unavailable') {
    return (
      <span
        data-testid={testId}
        data-passed="unavailable"
        className="inline-flex items-center gap-1.5 rounded-md border border-border-structural px-2.5 py-1 text-xs text-text-tertiary"
      >
        <span aria-hidden="true">—</span>
        {label}
      </span>
    )
  }
  if (passed) {
    return (
      <span
        data-testid={testId}
        data-passed="true"
        className="inline-flex items-center gap-1.5 rounded-md border border-border-structural px-2.5 py-1 text-xs text-text-primary"
      >
        <CheckSvg aria-label="pass" className={cn('size-3.5 shrink-0 text-success-primary')} />
        {label}
      </span>
    )
  }
  return (
    <span
      data-testid={testId}
      data-passed="false"
      className="inline-flex items-center gap-1.5 rounded-md border border-border-structural px-2.5 py-1 text-xs"
    >
      <CrossSvg aria-label="fail" className={cn('size-3 shrink-0 text-failed-secondary')} />
      {label}
    </span>
  )
}

export function renderSimilaritySubtitle(
  topSimilarScore: number | null,
  topSimilar: EntityReviewDetail['top_similar'],
  matchFlagged = false
): ReactNode {
  if (topSimilarScore != null && topSimilar?.b_name != null) {
    return (
      <span>
        <a
          href={getAssistantLink({
            id: topSimilar.b_id,
            slug: topSimilar.b_slug ?? '',
            project: topSimilar.b_project ?? '',
          })}
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-primary underline-offset-2 hover:underline"
        >
          {topSimilar.b_name}
        </a>
        {` · ${Math.floor(topSimilarScore * 100)}% overlap`}
        {matchFlagged && ' (flagged for cleanup)'}
        {!matchFlagged && topSimilar.reason === 'exact_name_match' && ' (same name)'}
      </span>
    )
  }
  if (topSimilar?.b_name == null && topSimilar != null) {
    return <span className="text-text-primary">Closest match no longer exists</span>
  }
  return <span className="text-text-primary">No similar entity found</span>
}
