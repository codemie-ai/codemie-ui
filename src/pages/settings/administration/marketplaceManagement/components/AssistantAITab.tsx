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

import { FC, RefObject } from 'react'

import Button from '@/components/Button'
import Spinner from '@/components/Spinner'
import { ButtonType } from '@/constants'
import type { Bucket } from '@/types/generated/marketplaceManagement'

import { DIMENSIONS, ScoreBar } from './AssistantScoreBar'
import BucketChip from './BucketChip'

interface AssessmentDimension {
  score: number
  justification?: string
}

export interface AssessmentResult {
  overall_score: number
  verdict_recommendation: Bucket
  fields?: Record<string, AssessmentDimension | null | undefined>
  suggested_fixes?: string[]
}

export interface AssistantAITabProps {
  isAssessing: boolean
  assessment: AssessmentResult | null
  assessmentError: string | null
  assistantId: string | null
  resultsRef: RefObject<HTMLDivElement | null>
  onAssessWithAI: () => void
}

const getAssessButtonLabel = (isAssessing: boolean, hasAssessment: boolean): string => {
  if (isAssessing) return 'Assessing…'
  return hasAssessment ? 'Re-assess' : 'Assess with AI'
}

export const AssistantAITab: FC<AssistantAITabProps> = ({
  isAssessing,
  assessment,
  assessmentError,
  assistantId,
  resultsRef,
  onAssessWithAI,
}) => (
  <section aria-label="AI Assessment" className="flex flex-col h-full bg-surface-base-secondary">
    {/* Sticky header — button always visible */}
    <header className="flex shrink-0 items-center justify-between gap-4 px-6 py-2">
      {!isAssessing && assessment ? (
        // Overall score + verdict replace the description once a result exists.
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Overall
          </span>
          <span
            className="text-lg font-bold text-text-primary tabular-nums"
            data-testid="assess-overall-score"
          >
            {assessment.overall_score.toFixed(1)}
          </span>
          <BucketChip
            bucket={assessment.verdict_recommendation}
            data-testid="assess-verdict-chip"
          />
        </div>
      ) : (
        <p className="min-w-0 text-xs font-semibold uppercase tracking-wider text-text-secondary">
          Quality score &amp; suggested fixes
        </p>
      )}
      <Button
        variant={ButtonType.MAGICAL}
        onClick={onAssessWithAI}
        disabled={isAssessing || !assistantId}
        isLoading={isAssessing}
        className="h-8 text-xs"
        aria-label={isAssessing ? 'Assessment running, please wait' : undefined}
        data-testid="assess-with-ai-button"
      >
        {getAssessButtonLabel(isAssessing, assessment != null)}
      </Button>
    </header>

    {/* Result body — scrolls independently */}
    <div
      ref={resultsRef}
      tabIndex={-1}
      aria-live="polite"
      aria-atomic="false"
      className="flex-1 min-h-0 overflow-y-auto px-6 focus:outline-none"
      data-testid="assess-panel-body"
    >
      {isAssessing && (
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Spinner inline rootClassName="pt-0" className="size-4" />
          <span>Scoring assistant…</span>
        </div>
      )}

      {!isAssessing && assessmentError && (
        <div
          role="alert"
          data-testid="assess-error"
          className="mb-3 rounded-md border border-failed-secondary/40 bg-failed-secondary/10 p-3 text-xs text-failed-secondary"
        >
          <span className="font-semibold">Assessment failed.</span> Please try again in a moment.
        </div>
      )}

      {!isAssessing && !assessment && (
        <ul className="flex flex-col gap-1 text-xs text-text-tertiary">
          {DIMENSIONS.map(({ key, label }) => (
            <li key={key}>• {label}</li>
          ))}
        </ul>
      )}

      {!isAssessing && assessment && (
        <div className="flex flex-col gap-5" data-testid="assess-result">
          {/* Per-dimension bars */}
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-semibold tracking-wider text-text-secondary">
              Quality scores
            </h4>
            {DIMENSIONS.map(({ key, label }) => {
              const dim = assessment.fields?.[key]
              return dim ? (
                <ScoreBar
                  key={key}
                  dimension={key}
                  label={label}
                  score={dim.score}
                  justification={dim.justification}
                />
              ) : null
            })}
          </div>

          {/* Suggested fixes */}
          {assessment.suggested_fixes && assessment.suggested_fixes.length > 0 && (
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-semibold tracking-wider text-text-secondary">
                Suggested fixes
              </h4>
              <ul className="flex flex-col gap-2">
                {assessment.suggested_fixes.map((fix) => (
                  <li
                    key={fix}
                    className="rounded-md border border-border-structural bg-surface-base-primary p-2 text-xs text-text-primary"
                  >
                    {fix}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  </section>
)
