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

import { useCallback, useRef, useState } from 'react'

const MAX_HISTORY_SIZE = 50 // Maximum number of history entries to keep
const TRACK_COOLDOWN_MS = 100 // Cooldown period for tracking changes

export interface UseUndoReturn {
  canUndo: boolean
  undo: () => void
  trackChange: (config: string) => void
}

/**
 * Hook for tracking configuration changes and providing undo functionality
 * Maintains a history stack of configuration strings
 * Uses cooldown to update last item instead of adding new one for rapid changes
 */
const useUndo = (
  initialConfig: string,
  onConfigRestore: (config: string) => void
): UseUndoReturn => {
  const historyRef = useRef<string[]>([initialConfig])
  const [canUndo, setCanUndo] = useState(false)
  const isUndoingRef = useRef(false)
  const lastChangeTimeRef = useRef<number>(0)

  /* Tracks a configuration change with cooldown */
  const trackChange = useCallback((config: string) => {
    if (isUndoingRef.current) {
      isUndoingRef.current = false
      return
    }

    const lastConfig = historyRef.current.at(-1)
    if (config === lastConfig) return

    const now = Date.now()
    const timeSinceLastChange = now - lastChangeTimeRef.current
    const withinCooldown = timeSinceLastChange < TRACK_COOLDOWN_MS

    if (withinCooldown && historyRef.current.length > 1) {
      historyRef.current[historyRef.current.length - 1] = config
    } else {
      historyRef.current.push(config)
      if (historyRef.current.length > MAX_HISTORY_SIZE) historyRef.current.shift()
      setCanUndo(historyRef.current.length > 1)
    }

    lastChangeTimeRef.current = now
  }, [])

  /* Undo the last configuration change; Removes the current config and restores the previous one */
  const undo = useCallback(() => {
    if (historyRef.current.length <= 1) {
      return
    }

    historyRef.current.pop()
    const previousConfig = historyRef.current.at(-1)
    isUndoingRef.current = true

    if (previousConfig !== undefined) onConfigRestore(previousConfig)

    isUndoingRef.current = false
    setCanUndo(historyRef.current.length > 1)
  }, [onConfigRestore, historyRef.current])

  return {
    canUndo,
    undo,
    trackChange,
  }
}

export default useUndo
