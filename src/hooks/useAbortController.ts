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

export interface UseAbortControllerResult {
  execute: <T>(requestFn: (signal: AbortSignal) => Promise<T>) => Promise<T | null>
  cancel: () => void
  isActive: boolean
}

/**
 * Hook for managing AbortController lifecycle and preventing race conditions in async requests.
 *
 * Features:
 * - Cancels previous request when a new one starts
 * - Tracks request generations to ignore stale responses
 * - Automatic cleanup on component unmount
 * - Returns null for canceled/stale requests
 *
 * @example
 * const { execute } = useAbortController()
 *
 * const fetchData = async () => {
 *   const result = await execute((signal) =>
 *     api.get('/endpoint', { signal })
 *   )
 *   if (result === null) return // Canceled or stale
 *   setState(result)
 * }
 */
export const useAbortController = (): UseAbortControllerResult => {
  const abortControllerRef = useRef<AbortController | null>(null)
  const generationRef = useRef<number>(0)
  const [isActive, setIsActive] = useState<boolean>(false)

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsActive(false)
  }, [])

  const execute = useCallback(
    async <T>(requestFn: (signal: AbortSignal) => Promise<T>): Promise<T | null> => {
      // Cancel any in-flight request before starting a new one
      cancel()

      const controller = new AbortController()
      abortControllerRef.current = controller
      generationRef.current += 1
      const generation = generationRef.current
      setIsActive(true)

      try {
        const result = await requestFn(controller.signal)

        // Ignore stale responses (a newer request was started)
        if (generation !== generationRef.current) {
          return null
        }

        return result
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return null
        }
        throw error
      } finally {
        if (generation === generationRef.current) {
          abortControllerRef.current = null
          setIsActive(false)
        }
      }
    },
    [cancel]
  )

  useEffect(() => {
    return () => {
      cancel()
    }
  }, [cancel])

  return {
    execute,
    cancel,
    isActive,
  }
}
