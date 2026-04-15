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

import Select from '@/components/form/Select'
import type { LeaderboardSeason, LeaderboardView } from '@/types/analytics'
import { formatDateTime } from '@/utils/helpers'
import { cn } from '@/utils/utils'

import { LEADERBOARD_VIEW_OPTIONS } from './constants'

interface LeaderboardControlsProps {
  view: LeaderboardView
  seasonKey?: string
  seasons: LeaderboardSeason[]
  seasonsLoading: boolean
  onViewChange: (view: LeaderboardView) => void
  onSeasonChange: (seasonKey: string) => void
}

const LeaderboardControls: FC<LeaderboardControlsProps> = ({
  view,
  seasonKey,
  seasons,
  seasonsLoading,
  onViewChange,
  onSeasonChange,
}) => {
  const isSeasonal = view !== 'current'
  const selectedSeason = seasons.find((season) => season.season_key === seasonKey)

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="inline-flex overflow-hidden rounded-lg border border-border-structural">
        {LEADERBOARD_VIEW_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onViewChange(option.value)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              view === option.value
                ? 'bg-surface-interactive-active text-text-primary'
                : 'bg-surface-base-secondary text-text-secondary hover:bg-surface-base-tertiary'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {isSeasonal && seasonsLoading && (
        <span className="text-sm text-text-quaternary">Loading seasons...</span>
      )}

      {isSeasonal && !seasonsLoading && seasons.length > 0 && (
        <Select
          value={seasonKey ?? ''}
          onChange={(e) => onSeasonChange(e.value as string)}
          options={seasons.map((s) => ({ value: s.season_key, label: s.period_label }))}
          className="min-w-[200px]"
        />
      )}

      {isSeasonal && !seasonsLoading && seasons.length === 0 && (
        <span className="text-sm italic text-text-quaternary">
          No archived seasons available yet
        </span>
      )}

      {isSeasonal && selectedSeason && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-base-tertiary px-3 py-1 text-xs text-text-secondary">
          Archived &middot; {formatDateTime(selectedSeason.completed_at, 'day')}
        </span>
      )}

      {!isSeasonal && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-base-tertiary px-3 py-1 text-xs text-text-secondary">
          Live &middot; Rolling 30 days
        </span>
      )}
    </div>
  )
}

export default LeaderboardControls
