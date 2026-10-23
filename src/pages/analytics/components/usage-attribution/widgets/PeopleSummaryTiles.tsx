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

import type { UaPeopleSummary, UaResponse } from '@/types/usageAttribution'

import Tile from './Tile'
import { useUaQuery } from '../hooks/useUaQuery'
import { errorText, formatMoney, formatNumber, formatPct, productionDaysWhen } from '../utils'

interface Props {
  params: Record<string, string | number>
  /** Groups the candidates by common condition and keeps the groups over the tile's threshold, per 30 days. */
  onShowBigGroups: (per30: number) => void
}

const PENDING_LABELS = [
  'Chargeback candidates',
  'Their production on personal budgets',
  'Shared with other candidates',
  'Groups over the threshold',
]

/** Chargeback candidates at a glance: how many, how much production they pay personally, and how much they share. */
const PeopleSummaryTiles: FC<Props> = ({ params, onShowBigGroups }) => {
  const { data, error, loading } = useUaQuery<UaResponse<UaPeopleSummary>>(
    'people-summary',
    'people-summary',
    params
  )
  const summary = data?.data
  if (!summary?.tiles) {
    if (!loading && !error) return null
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {PENDING_LABELS.map((label) => (
          <Tile
            key={label}
            label={label}
            pending={loading && !error}
            error={error ? errorText(error) : null}
          />
        ))}
      </div>
    )
  }
  const { tiles, threshold, display } = summary
  const per30 = threshold / (display?.scale || 1)
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile
          label="Chargeback candidates"
          value={formatNumber(tiles.candidates)}
          description={`of ${formatNumber(
            tiles.people_with_production
          )} people with production on a personal budget`}
          highlight
        />
        <Tile
          label="Their production on personal budgets"
          value={formatMoney(tiles.candidates_production)}
          description={`${formatPct(
            tiles.candidates_production,
            tiles.production
          )} of all production on personal budgets`}
        />
        <Tile
          label="Shared with other candidates"
          value={formatMoney(tiles.in_groups)}
          description={`${formatPct(
            tiles.in_groups,
            tiles.candidates_production
          )} in ${formatNumber(tiles.groups)} groups by common condition`}
        />
        <Tile
          label={`Groups over ${formatMoney(per30)}`}
          value={formatNumber(tiles.groups_over)}
          description={
            <>
              {formatMoney(tiles.groups_over_amount)} together
              {tiles.groups_over > 0 && (
                <>
                  {' · '}
                  <button
                    type="button"
                    className="font-semibold text-text-accent hover:underline"
                    onClick={() => onShowBigGroups(Math.round(per30))}
                  >
                    show them
                  </button>
                </>
              )}
            </>
          }
        />
      </div>
      <p className="text-xs text-text-quaternary">
        A chargeback candidate does production work from a personal budget on{' '}
        {display?.candidate_production_days ?? '…'} or more days {productionDaysWhen(data?.range)}.
        Change it in Analysis Settings.
      </p>
    </div>
  )
}

export default PeopleSummaryTiles
