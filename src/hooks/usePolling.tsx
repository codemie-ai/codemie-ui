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

import { useRef, useCallback, useEffect } from 'react'

interface UsePollingOptions {
  fetchFn: () => Promise<any>
  enabled: boolean
  interval?: number
  maxInterval?: number
  intervalIncrement?: number
}

export const usePolling = ({
  fetchFn,
  enabled,
  interval = 5000,
  maxInterval = 30000,
  intervalIncrement = 2000,
}: UsePollingOptions): void => {
  const isFetchingRef = useRef(false)
  const currentIntervalRef = useRef(interval)
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null)

  const executeFetch = useCallback(async () => {
    if (isFetchingRef.current) return

    isFetchingRef.current = true
    try {
      await fetchFn()

      if (currentIntervalRef.current !== interval) {
        currentIntervalRef.current = interval

        if (intervalIdRef.current) {
          clearInterval(intervalIdRef.current)
          intervalIdRef.current = setInterval(executeFetch, currentIntervalRef.current)
        }
      }
    } catch (error) {
      console.error('Polling error:', error)

      const nextInterval = Math.min(currentIntervalRef.current + intervalIncrement, maxInterval)
      if (nextInterval !== currentIntervalRef.current) {
        currentIntervalRef.current = nextInterval

        if (intervalIdRef.current) {
          clearInterval(intervalIdRef.current)
          intervalIdRef.current = setInterval(executeFetch, nextInterval)
        }
      }
    } finally {
      isFetchingRef.current = false
    }
  }, [fetchFn, interval, maxInterval, intervalIncrement])

  useEffect(() => {
    if (!enabled) {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current)
        intervalIdRef.current = null
      }
      currentIntervalRef.current = interval
      return
    }

    currentIntervalRef.current = interval
    intervalIdRef.current = setInterval(executeFetch, currentIntervalRef.current)

    // eslint-disable-next-line consistent-return
    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current)
        intervalIdRef.current = null
      }
    }
  }, [enabled, interval, executeFetch])
}
