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

import { type FC, useEffect, useMemo, useState } from 'react'

import type { DispatchRow } from '@/types/cliAnalytics'
import { formatTokens } from '@/utils/analyticsFormatters'
import { adjustLightness, getStatusColors } from '@/utils/chartColors'
import { formatCliAnalyticsCost } from '@/utils/currency'
import { cn } from '@/utils/utils'

import { formatDuration } from '../format'

const generateNonSessionChartColors = (count: number): string[] => {
  if (count === 0) {
    return []
  }

  const statusColors = getStatusColors()
  const nonSessionBaseColors = statusColors.slice(0, -1)

  if (nonSessionBaseColors.length === 0) {
    return []
  }

  return Array.from({ length: count }, (_, index) => {
    if (index < nonSessionBaseColors.length) {
      return nonSessionBaseColors[index]
    }

    const baseColorIndex = (index - nonSessionBaseColors.length) % nonSessionBaseColors.length
    const baseColor = nonSessionBaseColors[baseColorIndex]
    const cycle = Math.floor((index - nonSessionBaseColors.length) / nonSessionBaseColors.length)
    const adjustment = cycle % 2 === 0 ? -30 - cycle * 10 : 30 + cycle * 10

    return adjustLightness(baseColor, adjustment)
  })
}

interface SessionTimelineProps {
  dispatches: DispatchRow[]
  sessionDurationMs: number
}

const SessionTimeline: FC<SessionTimelineProps> = ({ dispatches, sessionDurationMs }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const sortedDispatches = useMemo(
    () => [...dispatches].sort((a, b) => a.start_offset_ms - b.start_offset_ms),
    [dispatches]
  )

  useEffect(() => {
    const firstNonSessionIdx = sortedDispatches.findIndex((d) => d.kind !== 'session')
    setSelectedIndex(firstNonSessionIdx >= 0 ? firstNonSessionIdx : null)
  }, [sortedDispatches])

  const nonSessionDispatchCount = useMemo(
    () => sortedDispatches.filter((dispatch) => dispatch.kind !== 'session').length,
    [sortedDispatches]
  )
  const palette = useMemo(
    () => generateNonSessionChartColors(nonSessionDispatchCount),
    [nonSessionDispatchCount]
  )

  if (dispatches.length === 0) {
    return <p className="text-text-secondary text-sm">No dispatches recorded for this session.</p>
  }
  const durationSafe = sessionDurationMs > 0 ? sessionDurationMs : 1
  const hasSubDispatches = sortedDispatches.some((d) => d.kind !== 'session')

  const handleRowClick = (index: number) => {
    setSelectedIndex((prev) => (prev === index ? null : index))
  }

  const getBarColor = (dispatch: DispatchRow, index: number): string => {
    if (dispatch.kind === 'session') {
      return ''
    }

    const nonSessionIndex = sortedDispatches
      .slice(0, index)
      .filter((dispatch) => dispatch.kind !== 'session').length
    return palette[nonSessionIndex % palette.length]
  }

  return (
    <div className="flex gap-4">
      {/* Gantt list */}
      <div className="flex-1 flex flex-col gap-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-text-primary">Timeline</span>
          {hasSubDispatches && (
            <span className="text-xs text-text-secondary">click a step for details</span>
          )}
        </div>
        {sortedDispatches.map((dispatch, index) => {
          const left = Math.min((dispatch.start_offset_ms / durationSafe) * 100, 97)
          const rawWidth = (dispatch.duration_ms / durationSafe) * 100
          const width = Math.min(Math.max(3, rawWidth), 100 - left)
          const isSelected = selectedIndex === index
          const barColor = getBarColor(dispatch, index)
          const isSession = dispatch.kind === 'session'
          const dispatchTokens =
            dispatch.input_tokens != null && dispatch.output_tokens != null
              ? formatTokens(
                  dispatch.input_tokens +
                    dispatch.output_tokens +
                    (dispatch.cache_read_tokens ?? 0) +
                    (dispatch.cache_creation_tokens ?? 0)
                )
              : null
          const rowTooltip = [
            dispatch.label,
            `Duration: ${formatDuration(dispatch.duration_ms)}`,
            dispatch.cost_usd != null ? `Cost: ${formatCliAnalyticsCost(dispatch.cost_usd)}` : null,
            dispatchTokens ? `Tokens: ${dispatchTokens}` : null,
          ]
            .filter(Boolean)
            .join(' • ')

          return (
            <button
              key={`${dispatch.label}-${index}`}
              type="button"
              aria-pressed={isSelected}
              title={rowTooltip}
              className={cn(
                'grid grid-cols-[180px_1fr_70px] items-center gap-2 rounded px-2 py-1 cursor-pointer transition-colors text-left w-full',
                isSelected && 'bg-surface-accent'
              )}
              onClick={() => handleRowClick(index)}
            >
              <span className="text-xs text-text-primary truncate">{dispatch.label}</span>
              <div className="relative h-4 rounded overflow-hidden bg-surface-base-secondary">
                <div
                  className={cn('absolute h-full rounded', isSession && 'bg-success-primary')}
                  style={
                    isSession
                      ? { left: `${left}%`, width: `${width}%` }
                      : { left: `${left}%`, width: `${width}%`, backgroundColor: barColor }
                  }
                />
              </div>
              <span className="text-xs text-text-secondary text-right tabular-nums">
                {formatDuration(dispatch.duration_ms)}
              </span>
            </button>
          )
        })}
      </div>

      {/* Detail panel */}
      {selectedIndex !== null &&
        (() => {
          const dispatch = sortedDispatches[selectedIndex]
          const isSession = dispatch.kind === 'session'
          const dotColor = getBarColor(dispatch, selectedIndex)
          const totalTokens =
            dispatch.input_tokens != null && dispatch.output_tokens != null
              ? formatTokens(
                  dispatch.input_tokens +
                    dispatch.output_tokens +
                    (dispatch.cache_read_tokens ?? 0) +
                    (dispatch.cache_creation_tokens ?? 0)
                )
              : '—'
          const costLabel =
            dispatch.cost_usd != null ? formatCliAnalyticsCost(dispatch.cost_usd) : '—'
          const hasBreakdown =
            dispatch.input_tokens != null ||
            dispatch.output_tokens != null ||
            dispatch.cache_read_tokens != null ||
            dispatch.cache_creation_tokens != null

          return (
            <div className="w-52 shrink-0 bg-surface-elevated rounded-md p-3 border border-border-specific-panel-outline text-sm flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={cn('w-2 h-2 rounded-full shrink-0', isSession && 'bg-success-primary')}
                  // backgroundColor for palette dot matches bar color
                  style={!isSession ? { backgroundColor: dotColor } : undefined}
                />
                <span
                  className="text-text-primary font-medium text-xs truncate"
                  title={dispatch.label}
                >
                  {dispatch.label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Cost
                  </p>
                  <p className="text-sm font-semibold text-text-primary tabular-nums">
                    {costLabel}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Tokens
                  </p>
                  <p className="text-sm font-semibold text-text-primary tabular-nums">
                    {totalTokens}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Duration
                  </p>
                  <p className="text-sm font-semibold text-text-primary tabular-nums">
                    {formatDuration(dispatch.duration_ms)}
                  </p>
                </div>
                {!isSession && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                      Started
                    </p>
                    <p className="text-sm font-semibold text-text-primary tabular-nums">
                      {formatDuration(dispatch.start_offset_ms)} into session
                    </p>
                  </div>
                )}
              </div>
              {hasBreakdown && (
                <div className="border-t border-border-specific-panel-outline pt-2 flex flex-col gap-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-1">
                    Token Breakdown
                  </p>
                  {dispatch.input_tokens != null && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-secondary">Input</span>
                      <span className="text-xs text-text-primary tabular-nums">
                        {formatTokens(dispatch.input_tokens)}
                      </span>
                    </div>
                  )}
                  {dispatch.output_tokens != null && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-secondary">Output</span>
                      <span className="text-xs text-text-primary tabular-nums">
                        {formatTokens(dispatch.output_tokens)}
                      </span>
                    </div>
                  )}
                  {(dispatch.cache_read_tokens ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-secondary">Cache read</span>
                      <span className="text-xs text-text-primary tabular-nums">
                        {formatTokens(dispatch.cache_read_tokens!)}
                      </span>
                    </div>
                  )}
                  {(dispatch.cache_creation_tokens ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-secondary">Cache write</span>
                      <span className="text-xs text-text-primary tabular-nums">
                        {formatTokens(dispatch.cache_creation_tokens!)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })()}
    </div>
  )
}

export default SessionTimeline
