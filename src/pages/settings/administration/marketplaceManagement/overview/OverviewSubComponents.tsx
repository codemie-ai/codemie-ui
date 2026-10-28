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

import Button from '@/components/Button'

// ── Compact empty-state message ─────────────────────────────────────────────

// Renders in place of a `<Table>` when there are zero items — the Table's
// default empty row leaves a ragged, top-aligned "No data available" cell
// inside a card that would otherwise be much shorter, wasting a large
// amount of vertical space. Keeps the card compact and centres the message.
interface EmptyStateProps {
  message: string
  hint?: string
}
export const EmptyState: FC<EmptyStateProps> = ({ message, hint }) => (
  <div className="flex flex-col items-center justify-center gap-1 py-8 text-center">
    <span className="text-sm text-text-secondary">{message}</span>
    {hint && <span className="text-xs text-text-tertiary">{hint}</span>}
  </div>
)

// ── Small diagnostic KPI tile ───────────────────────────────────────────────

interface DiagnosticKpiProps {
  label: string
  value: number | null | undefined
  valueClassName?: string
}

export const DiagnosticKpi: FC<DiagnosticKpiProps> = ({ label, value, valueClassName }) => (
  // Diagnostic tiles are read-only labels — no border (which would
  // signal a clickable card the way the KPI bucket cards above do), and
  // flex-1 so the four tiles share width evenly rather than each sizing
  // to its label length (making the strip look ragged).
  <div className="flex flex-1 flex-col gap-0.5 rounded-md bg-surface-base-secondary px-4 py-3 min-w-[120px]">
    <span className="text-[10px] font-semibold tracking-wider text-text-tertiary">{label}</span>
    <span className={`text-xl font-bold tabular-nums text-text-primary ${valueClassName ?? ''}`}>
      {value != null ? value.toLocaleString() : '—'}
    </span>
  </div>
)

// ── "How this works" explainer card ─────────────────────────────────────────

interface OverviewExplainerProps {
  isRunningAudit: boolean
  onRunAudit: () => void
}

export const OverviewExplainer: FC<OverviewExplainerProps> = ({ isRunningAudit, onRunAudit }) => (
  <div
    data-testid="mm-explainer"
    className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-border-structural bg-surface-base-secondary p-4"
  >
    <div className="flex flex-col gap-1 max-w-3xl">
      <h3 className="text-sm font-semibold text-text-primary">How this works</h3>
      <p className="text-xs text-text-secondary leading-relaxed">
        Every assistant published to the marketplace is sorted automatically into{' '}
        <span className="font-semibold text-success-primary">Qualified</span>,{' '}
        <span className="font-semibold text-in-progress-primary">Community</span>, or{' '}
        <span className="font-semibold text-failed-secondary">Delete</span>. Sorting is based on two
        things: whether the assistant&apos;s name, description and category are complete, and how
        much it is actually used. Run the audit after new assistants are published or edited to sort
        them again. To get an AI quality score for a single assistant, open its row in the Cleanup
        queue.
      </p>
      <p className="text-xs leading-relaxed text-text-tertiary">
        The audit runs in the background and can take several minutes on a large marketplace. You
        can leave this page — the numbers update once it finishes, and everyone sees the same run.
      </p>
    </div>
    <Button
      onClick={onRunAudit}
      isLoading={isRunningAudit}
      disabled={isRunningAudit}
      className="h-9 flex-shrink-0"
      data-testid="run-audit-button"
    >
      {isRunningAudit ? 'Running audit…' : 'Run audit'}
    </Button>
  </div>
)
