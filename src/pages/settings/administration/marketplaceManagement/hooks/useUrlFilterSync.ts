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

import { useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router'

/** A value to write for an owned key; null, undefined, '' and false mean "omit". */
export type UrlParamValue = string | null | undefined | false

/**
 * Build the next query string from the current one: delete every owned key,
 * then set the ones with a value. Params owned by other features survive.
 * Callers pass `undefined`/`false` for default values so a pristine URL stays clean.
 */
export const buildSearch = (
  current: string,
  ownedKeys: readonly string[],
  values: Record<string, UrlParamValue>
): string => {
  const next = new URLSearchParams(current)
  ownedKeys.forEach((key) => next.delete(key))
  Object.entries(values).forEach(([key, value]) => {
    if (value) next.set(key, value)
  })
  return next.toString()
}

/**
 * The mechanics shared by the URL-backed filter hooks: an echo guard holding
 * the last query string read or written (so URL → state → URL cannot loop),
 * a `replace` write, and a debounced variant that is cancelled on unmount.
 */
export const useUrlFilterSync = () => {
  const [, setSearchParams] = useSearchParams()
  const lastSyncedRef = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Record a URL just read. Returns false when it is the one we already synced. */
  const acceptUrl = useCallback((search: string): boolean => {
    if (lastSyncedRef.current === search) return false
    lastSyncedRef.current = search
    return true
  }, [])

  /** Write `next` unless it equals the last synced query. `replace`: no history entry per change. */
  const write = useCallback(
    (next: string) => {
      if (next === lastSyncedRef.current) return
      lastSyncedRef.current = next
      setSearchParams(next, { replace: true })
    },
    [setSearchParams]
  )

  const cancel = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
  }, [])

  /** Like `write`, but coalesces rapid calls; `compute` runs when the timer fires. */
  const writeDebounced = useCallback(
    (compute: () => string, delayMs: number) => {
      cancel()
      timerRef.current = setTimeout(() => write(compute()), delayMs)
    },
    [cancel, write]
  )

  useEffect(() => cancel, [cancel])

  return { acceptUrl, write, writeDebounced }
}
