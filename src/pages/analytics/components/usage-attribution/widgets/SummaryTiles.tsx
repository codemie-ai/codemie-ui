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

import type { UaCliSummary, UaError, UaTotals } from '@/types/usageAttribution'

import { formatMoney, formatMoneyShort, formatPct } from '../utils'
import Tile, { AnalysingText } from './Tile'

interface Props {
  totals: UaTotals | null
  totalsError: UaError | null
  summary: UaCliSummary | null
  summaryError: UaError | null
  /** Shown while the analysis runs. */
  pendingText?: ReactNode
}

const UNAVAILABLE = 'Not available'

/** The eight amounts of the Summary: fast totals first, the analysis-backed ones when the analysis is ready. */
const SummaryTiles: FC<Props> = ({
  totals,
  totalsError,
  summary,
  summaryError,
  pendingText = <AnalysingText />,
}) => {
  const t = summary?.tiles
  const totalPending = !totals && !totalsError
  // The full message is shown once, on the analysis status line above; the tiles only say the value is missing.
  const totalError = !totals && totalsError ? UNAVAILABLE : null
  const summaryFailed = !t && summaryError ? UNAVAILABLE : null
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 max-sm:gap-2">
      <Tile
        label="Total Spend"
        pending={totalPending}
        pendingText="Loading…"
        error={totalError}
        value={totals ? formatMoney(totals.total) : undefined}
        description={
          totals &&
          `Web Platform ${formatMoneyShort(totals.web.total)} · CLI ${formatMoneyShort(
            totals.cli.total
          )}`
        }
      />
      <Tile
        label="Web Platform"
        pending={totalPending}
        pendingText="Loading…"
        error={totalError}
        value={totals ? formatMoney(totals.web.total) : undefined}
        description={
          totals &&
          `Assistants ${formatMoneyShort(totals.web.assistant)} · Workflows ${formatMoneyShort(
            totals.web.workflow
          )} · Datasources ${formatMoneyShort(totals.web.datasource)}`
        }
      />
      <Tile
        label="CLI"
        pending={totalPending}
        pendingText="Loading…"
        error={totalError}
        value={totals ? formatMoney(totals.cli.total) : undefined}
        description={
          totals &&
          `${formatPct(
            totals.cli.total,
            totals.total
          )} of spend · Claude Code, Codex and other clients via CodeMie`
        }
      />
      <Tile
        label="Charged Back"
        pending={totalPending}
        pendingText="Loading…"
        error={totalError}
        value={totals ? formatMoney(totals.charged_back) : undefined}
        description={
          totals &&
          `${formatPct(totals.charged_back, totals.total)} of spend · billed to project budgets`
        }
      />
      <Tile
        label="CLI Production"
        pending={!t}
        pendingText={pendingText}
        error={summaryFailed}
        value={t && formatMoney(t.prod)}
        description={
          t &&
          `${formatPct(t.prod, t.cli)} of CLI · ${formatMoneyShort(
            t.prod_cb
          )} of it charged back · ${formatMoneyShort(
            t.prod_alloc
          )} allocated by people's classified work` +
            (t.likely_prod > 0
              ? ` · plus ${formatMoneyShort(
                  t.likely_prod
                )} likely production, counted in Unclassified`
              : '')
        }
      />
      <Tile
        label="CLI Experiments"
        pending={!t}
        pendingText={pendingText}
        error={summaryFailed}
        value={t && formatMoney(t.exp)}
        description={
          t &&
          `Learning ${formatMoneyShort(t.exp_parts.learning)} · Testing ${formatMoneyShort(
            t.exp_parts.testing
          )} · Pet projects ${formatMoneyShort(
            t.exp_parts.pet_project
          )} · Experimental ${formatMoneyShort(t.exp_parts.experimental)} · ${formatMoneyShort(
            t.exp_alloc
          )} allocated`
        }
      />
      <Tile
        label="Chargeback Potential"
        highlight
        pending={!t}
        pendingText={pendingText}
        error={summaryFailed}
        value={t && formatMoney(t.ncb)}
        description={
          t &&
          `Potential chargeback, paid from personal budgets: CLI in shared projects ${formatMoneyShort(
            t.ncb_cli_shared
          )} · production CLI in personal projects ${formatMoneyShort(
            t.ncb_cli_personal
          )} · Web Platform in shared projects ${formatMoneyShort(t.ncb_web)}`
        }
      />
      <Tile
        label="CLI Unclassified"
        pending={!t}
        pendingText={pendingText}
        error={summaryFailed}
        value={t && formatMoney(t.uncl)}
        description={
          t &&
          `${formatPct(t.uncl, t.cli)} of CLI · likely production ${formatMoneyShort(
            t.uncl_parts.likely_production ?? 0
          )} · no repository (desktop and IDE clients) ${formatMoneyShort(
            t.uncl_parts.no_repository
          )} · too little evidence ${formatMoneyShort(
            t.uncl_parts.too_little_evidence
          )} · outside the limits ${formatMoneyShort(
            t.uncl_parts.outside_limits
          )} · after ${formatMoneyShort(t.allocated)} was allocated`
        }
      />
    </div>
  )
}

export default SummaryTiles
