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

import { useCallback, useEffect, useRef, useState } from 'react'

const DEFAULT_GAP_MS = 1000
const DEFAULT_MAX_QUEUE_SIZE = 5

type UseAnnouncementQueueOptions = {
  gapMs?: number
  maxQueueSize?: number
}

/**
 * Serializes screen reader announcements for a single `aria-live` region.
 *
 * Messages are played one at a time, `gapMs` apart, so a burst of updates is not collapsed into
 * whatever text happened to land last. Each message is written as an empty string first: a repeated
 * identical message would otherwise render unchanged text, and a region whose content did not change
 * is not re-announced.
 */
export function useAnnouncementQueue({
  gapMs = DEFAULT_GAP_MS,
  maxQueueSize = DEFAULT_MAX_QUEUE_SIZE,
}: UseAnnouncementQueueOptions = {}) {
  const [announcement, setAnnouncement] = useState('')
  const queueRef = useRef<string[]>([])
  const isProcessingRef = useRef(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const frameRef = useRef<number | undefined>(undefined)

  useEffect(
    () => () => {
      if (timeoutRef.current !== undefined) clearTimeout(timeoutRef.current)
      if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current)
    },
    []
  )

  const processNext = useCallback(() => {
    const next = queueRef.current.shift()

    if (next === undefined) {
      isProcessingRef.current = false

      return
    }

    setAnnouncement('')
    frameRef.current = requestAnimationFrame(() => setAnnouncement(next))
    timeoutRef.current = setTimeout(processNext, gapMs)
  }, [gapMs])

  const announce = useCallback(
    (message: string) => {
      if (!message) return

      queueRef.current = [...queueRef.current, message].slice(-maxQueueSize)

      if (!isProcessingRef.current) {
        isProcessingRef.current = true
        processNext()
      }
    },
    [maxQueueSize, processNext]
  )

  return { announcement, announce }
}
