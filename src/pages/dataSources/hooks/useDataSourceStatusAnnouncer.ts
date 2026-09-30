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

import { useEffect, useRef } from 'react'

import { useAnnouncementQueue } from '@/hooks/useAnnouncementQueue'
import {
  DataSourceStatusTitle,
  getDataSourceStatusInfo,
} from '@/pages/dataSources/utils/dataSourceStatus'
import { DatasetResponse } from '@/types/entity/dataSource'

interface TrackedRow {
  repoName: string
  // Status title only (no percentage) - what the change check compares against,
  // so a 5s poll re-reading the same title with a moved percentage stays silent.
  statusKey: string
}

interface StatusChange {
  text: string
  title: DataSourceStatusTitle
}

// Above this many events in one poll, individual per-row messages would either exceed the
// announcement queue's cap (silently dropping the earliest ones) or bury the screen reader user
// in a burst of reads. Below or at it, individual messages still read better.
const SUMMARY_THRESHOLD = 3

// One-word form used inside a grouped summary, e.g. "6 completed, 2 failed".
// "Error" -> "failed" is the only non-literal mapping; the rest are the title lowercased.
const SUMMARY_WORD: Record<DataSourceStatusTitle, string> = {
  Queued: 'queued',
  Fetching: 'fetching',
  Processing: 'processing',
  Completed: 'completed',
  Error: 'failed',
}

// Fixed pipeline order for listing groups in a summary, independent of which row changed first.
const TITLE_ORDER: DataSourceStatusTitle[] = [
  'Queued',
  'Fetching',
  'Processing',
  'Completed',
  'Error',
]

function summarizeStatusChanges(changes: StatusChange[]): string {
  const counts = new Map<DataSourceStatusTitle, number>()
  changes.forEach(({ title }) => counts.set(title, (counts.get(title) ?? 0) + 1))

  const parts = TITLE_ORDER.filter((title) => counts.has(title)).map(
    (title) => `${counts.get(title)} ${SUMMARY_WORD[title]}`
  )

  return `${changes.length} data sources updated: ${parts.join(', ')}`
}

function emitStatusChanges(changes: StatusChange[], announce: (message: string) => void) {
  if (changes.length === 0) return

  if (changes.length <= SUMMARY_THRESHOLD) {
    changes.forEach(({ text }) => announce(text))

    return
  }

  announce(summarizeStatusChanges(changes))
}

function emitRemovals(repoNames: string[], announce: (message: string) => void) {
  if (repoNames.length === 0) return

  if (repoNames.length <= SUMMARY_THRESHOLD) {
    repoNames.forEach((repoName) => announce(`${repoName} removed`))

    return
  }

  announce(`${repoNames.length} data sources removed`)
}

export function useDataSourceStatusAnnouncer(items: DatasetResponse['data'], viewKey: string) {
  const { announcement, announce } = useAnnouncementQueue()
  const previousRef = useRef<Map<string, TrackedRow>>(new Map())
  const previousViewKeyRef = useRef<string | null>(null)

  useEffect(() => {
    const previous = previousRef.current
    const isSameView = previousViewKeyRef.current === viewKey
    const next = new Map<string, TrackedRow>()
    const statusChanges: StatusChange[] = []

    items.forEach((item) => {
      const info = getDataSourceStatusInfo(item)

      // Calculate percentage with guards for edge cases
      let percentage = ''
      if (info.isInProgress && !info.isProviderInProgress && item.complete_state > 0) {
        const rawPercentage = (item.current_state / item.complete_state) * 100
        // Clamp percentage to 0-100 range
        const clampedPercentage = Math.max(0, Math.min(100, Math.round(rawPercentage)))
        percentage = ` ${clampedPercentage}%`
      }

      // Handle null/undefined repo_name gracefully, and trim whitespace
      const trimmedName = item.repo_name ? item.repo_name.trim() : ''
      const safeName = trimmedName || `Datasource ${item.id}`
      const statusKey = `${safeName}: ${info.title}`.trim()
      const text = `${statusKey}${percentage}`.trim()

      next.set(item.id, { repoName: safeName, statusKey })

      // Only announce a status change for a row already tracked in this same view.
      // Compare on the title only - a percentage-only change must not re-announce.
      if (isSameView && text && previous.get(item.id)?.statusKey !== statusKey) {
        statusChanges.push({ text, title: info.title })
      }
    })

    // A missing id only means "deleted" when it disappeared from the same
    // page/filter/sort query - otherwise it just scrolled off-view.
    const removals: string[] = []

    if (isSameView) {
      previous.forEach((row, itemId) => {
        if (!next.has(itemId)) {
          removals.push(row.repoName)
        }
      })
    }

    // Above SUMMARY_THRESHOLD, each bucket collapses into a single grouped message instead of
    // one announce() per row - bounds what reaches useAnnouncementQueue regardless of burst size.
    emitStatusChanges(statusChanges, announce)
    emitRemovals(removals, announce)

    previousRef.current = next
    previousViewKeyRef.current = viewKey
  }, [items, viewKey, announce])

  return { announcement }
}
