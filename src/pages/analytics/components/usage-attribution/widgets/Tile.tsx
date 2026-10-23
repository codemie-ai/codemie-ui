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

import Spinner from '@/components/Spinner'
import { cn } from '@/utils/utils'

import { analysingText, useElapsedSeconds } from '../utils'

interface TileProps {
  label: string
  value?: ReactNode
  description?: ReactNode
  /** The value is not known yet: the shared analysis is still running. */
  pending?: boolean
  pendingText?: ReactNode
  /** The value could not be loaded: shown instead of the value, without a spinner. */
  error?: string | null
  highlight?: boolean
  className?: string
}

/** "Analysing repositories…" with the time so far; only this text re-renders every second. */
export const AnalysingText: FC = () => <>{analysingText(useElapsedSeconds(true))}</>

const TileBody: FC<Pick<TileProps, 'value' | 'pending' | 'pendingText' | 'error'>> = ({
  value,
  pending,
  pendingText,
  error,
}) => {
  if (error) {
    return <output className="py-1 text-xs leading-5 text-failed-secondary block">{error}</output>
  }
  if (pending) {
    return (
      <div className="flex items-center gap-2 py-1" aria-live="polite">
        <Spinner inline className="w-4 h-4" />
        <span className="text-xs text-text-quaternary">
          {pendingText ?? 'Analysing repositories…'}
        </span>
      </div>
    )
  }
  return (
    <p className="text-lg sm:text-xl font-semibold leading-snug tracking-tight text-text-primary [font-variant-numeric:tabular-nums] break-all">
      {value ?? '—'}
    </p>
  )
}

/** A metric tile with the same anatomy as MetricCard, with pending and error states for analysis-backed values. */
const Tile: FC<TileProps> = ({
  label,
  value,
  description,
  pending,
  pendingText,
  error,
  highlight,
  className,
}) => (
  <div
    className={cn(
      'bg-surface-elevated rounded-md p-3 border border-border-specific-panel-outline shadow-sm min-w-0',
      highlight && 'border-l-4 border-l-in-progress-primary',
      className
    )}
  >
    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.03em] leading-4 text-text-quaternary">
      {label}
    </p>
    <TileBody value={value} pending={pending} pendingText={pendingText} error={error} />
    {!pending && !error && description && (
      <div className="mt-1 text-[11px] leading-5 text-text-quaternary">{description}</div>
    )}
  </div>
)

export default Tile
