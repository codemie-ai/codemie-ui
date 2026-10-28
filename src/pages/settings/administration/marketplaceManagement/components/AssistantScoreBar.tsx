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

// "Metadata polish" / "Prompt substance" are the assessment engine's own
// field names. Admins score assistants, not prompts, so each dimension is
// named for what the admin is being asked to judge.
export const DIMENSIONS = [
  { key: 'metadata_polish', label: 'Name, description and category' },
  { key: 'description_quality', label: 'Description quality' },
  { key: 'prompt_substance', label: 'Instruction quality' },
  { key: 'category_fit', label: 'Category fit' },
  { key: 'uniqueness', label: 'Uniqueness' },
] as const

export interface ScoreBarProps {
  label: string
  score: number
  justification?: string
  dimension?: string
}

export const ScoreBar: FC<ScoreBarProps> = ({ label, score, justification, dimension }) => {
  // Backend scores each dimension on a 0–100 scale. The earlier *10
  // multiplier assumed a 0–10 scale and pushed every real assessment
  // (typically 60–95) past the 100% clamp, making every bar identical.
  const pct = Math.min(100, Math.max(0, score))

  let barColor = 'bg-failed-secondary'
  if (score >= 70) barColor = 'bg-success-primary'
  else if (score >= 40) barColor = 'bg-aborted-primary'

  return (
    <div
      className="flex flex-col gap-1"
      data-testid={dimension ? `assessment-scorebar-${dimension}` : undefined}
    >
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-text-primary">{label}</span>
        <span className="font-semibold text-text-primary tabular-nums">{Math.round(score)}</span>
      </div>
      <progress
        className="block h-1.5 w-full appearance-none overflow-hidden rounded-full bg-border-structural"
        value={score}
        max={100}
        data-testid={dimension ? `assessment-scorebar-${dimension}-track` : undefined}
      >
        <div
          aria-hidden="true"
          className={cn('h-1.5 rounded-full transition-all', barColor)}
          style={{ width: pct > 0 ? `${pct}%` : '4px', minWidth: '4px' }}
        />
      </progress>
      {justification && <p className="text-xs text-text-secondary">{justification}</p>}
    </div>
  )
}
