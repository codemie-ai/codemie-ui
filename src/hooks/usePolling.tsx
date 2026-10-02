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

import { useRef, useCallback, useEffect, useMemo, type RefObject } from 'react'

interface IdleBackoffOptions {
  threshold: number
  multiplier: number
  maxInterval: number
}

interface UsePollingOptions {
  // Resolving `false` reports "no progress" to idleBackoff; any other result resets it.
  fetchFn: () => Promise<unknown>
  enabled: boolean
  interval?: number
  maxInterval?: number
  intervalIncrement?: number
  idleBackoff?: IdleBackoffOptions
  pauseWhenHidden?: boolean
}

const isTabHidden = (pauseWhenHidden: boolean | undefined): boolean =>
  Boolean(pauseWhenHidden) && document.visibilityState === 'hidden'

const isFetchDue = (lastFetchAt: number | null, interval: number): boolean =>
  lastFetchAt === null || Date.now() - lastFetchAt >= interval

const resolveIdleInterval = (
  result: unknown,
  idleBackoff: IdleBackoffOptions | undefined,
  currentInterval: number,
  baseInterval: number,
  idleCountRef: RefObject<number>
): number => {
  if (!idleBackoff) return baseInterval

  if (result !== false) {
    idleCountRef.current = 0
    return baseInterval
  }

  idleCountRef.current += 1
  return idleCountRef.current >= idleBackoff.threshold
    ? Math.min(currentInterval * idleBackoff.multiplier, idleBackoff.maxInterval)
    : currentInterval
}

const stopTimer = (intervalIdRef: RefObject<NodeJS.Timeout | null>): void => {
  if (intervalIdRef.current) {
    clearInterval(intervalIdRef.current)
    intervalIdRef.current = null
  }
}

const rescheduleInterval = (
  intervalIdRef: RefObject<NodeJS.Timeout | null>,
  currentIntervalRef: RefObject<number>,
  nextInterval: number,
  callback: () => void
): void => {
  if (currentIntervalRef.current === nextInterval) return

  currentIntervalRef.current = nextInterval
  if (intervalIdRef.current) {
    clearInterval(intervalIdRef.current)
    intervalIdRef.current = setInterval(callback, nextInterval)
  }
}

export const usePolling = ({
  fetchFn,
  enabled,
  interval = 5000,
  maxInterval = 30000,
  intervalIncrement = 2000,
  idleBackoff,
  pauseWhenHidden,
}: UsePollingOptions): void => {
  // Keyed on the values so an inline options object doesn't restart polling every render.
  const { threshold, multiplier, maxInterval: idleMaxInterval } = idleBackoff ?? {}
  const stableIdleBackoff = useMemo<IdleBackoffOptions | undefined>(
    () =>
      threshold !== undefined && multiplier !== undefined && idleMaxInterval !== undefined
        ? { threshold, multiplier, maxInterval: idleMaxInterval }
        : undefined,
    [threshold, multiplier, idleMaxInterval]
  )
  const isFetchingRef = useRef(false)
  const currentIntervalRef = useRef(interval)
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null)
  const idleCountRef = useRef(0)
  const lastFetchAtRef = useRef<number | null>(null)
  const pendingRefetchRef = useRef(false)
  // Bumped per effect run so a fetch from an older run (e.g. previous chat) can't reschedule.
  const generationRef = useRef(0)
  // Queued refetches fire through this ref so they target the current generation.
  const latestExecuteFetchRef = useRef<() => void>(() => {})

  const executeFetch = useCallback(async () => {
    if (isFetchingRef.current) return

    const generation = generationRef.current
    isFetchingRef.current = true
    try {
      const result = await fetchFn()
      if (generation !== generationRef.current) return
      const nextInterval = resolveIdleInterval(
        result,
        stableIdleBackoff,
        currentIntervalRef.current,
        interval,
        idleCountRef
      )
      rescheduleInterval(intervalIdRef, currentIntervalRef, nextInterval, executeFetch)
    } catch (error) {
      console.error('Polling error:', error)
      if (generation !== generationRef.current) return

      const nextInterval = Math.min(currentIntervalRef.current + intervalIncrement, maxInterval)
      rescheduleInterval(intervalIdRef, currentIntervalRef, nextInterval, executeFetch)
    } finally {
      isFetchingRef.current = false
      if (generation === generationRef.current) {
        lastFetchAtRef.current = Date.now()
      }

      if (pendingRefetchRef.current) {
        pendingRefetchRef.current = false
        latestExecuteFetchRef.current()
      }
    }
  }, [fetchFn, interval, maxInterval, intervalIncrement, stableIdleBackoff])

  latestExecuteFetchRef.current = () => {
    executeFetch().catch(() => {})
  }

  const requestImmediateFetch = useCallback(() => {
    if (isFetchingRef.current) {
      pendingRefetchRef.current = true
      return
    }
    executeFetch()
  }, [executeFetch])

  useEffect(() => {
    // New generation (e.g. chat switch): reset per-target state. isFetchingRef is left alone so a
    // previous generation's in-flight fetch still blocks overlapping fetches until it settles.
    generationRef.current += 1
    currentIntervalRef.current = interval
    idleCountRef.current = 0
    lastFetchAtRef.current = null
    pendingRefetchRef.current = false

    if (!enabled) {
      stopTimer(intervalIdRef)
      return
    }

    const startTimer = (): void => {
      if (intervalIdRef.current) clearInterval(intervalIdRef.current)
      intervalIdRef.current = setInterval(executeFetch, currentIntervalRef.current)
    }

    if (!isTabHidden(pauseWhenHidden)) {
      startTimer()
    }

    const handleVisibilityChange = (): void => {
      if (document.visibilityState === 'hidden') {
        stopTimer(intervalIdRef)
        pendingRefetchRef.current = false
        return
      }

      // New generation: a fetch still in flight from before the tab hid must not undo this reset.
      generationRef.current += 1
      currentIntervalRef.current = interval
      idleCountRef.current = 0
      startTimer()

      if (isFetchDue(lastFetchAtRef.current, interval)) {
        requestImmediateFetch()
      }
    }

    if (pauseWhenHidden) {
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }

    // eslint-disable-next-line consistent-return
    return () => {
      stopTimer(intervalIdRef)
      pendingRefetchRef.current = false
      if (pauseWhenHidden) {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }
  }, [enabled, interval, executeFetch, requestImmediateFetch, pauseWhenHidden])
}
