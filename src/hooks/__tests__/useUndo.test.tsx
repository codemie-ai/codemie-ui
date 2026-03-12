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

/* eslint-disable no-await-in-loop */
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import useUndo from '../useUndo'

// Test helpers to reduce duplication
const setupUndoHook = (initialConfig = 'initial', onConfigRestore = vi.fn()) => {
  const { result, rerender } = renderHook(({ config, callback }) => useUndo(config, callback), {
    initialProps: { config: initialConfig, callback: onConfigRestore },
  })
  return { result, rerender, onConfigRestore }
}

const trackChange = (result: ReturnType<typeof setupUndoHook>['result'], config: string) => {
  act(() => {
    result.current.trackChange(config)
  })
}

const advanceTimers = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

const performUndo = (result: ReturnType<typeof setupUndoHook>['result']) => {
  act(() => {
    result.current.undo()
  })
}

const trackChangeWithCooldown = async (
  result: ReturnType<typeof setupUndoHook>['result'],
  config: string,
  cooldownMs = 150
) => {
  trackChange(result, config)
  await advanceTimers(cooldownMs)
}

describe('useUndo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  describe('Initial state', () => {
    it('should initialize with canUndo as false', () => {
      const { result } = setupUndoHook()

      expect(result.current.canUndo).toBe(false)
    })

    it('should not call onConfigRestore on mount', () => {
      const { onConfigRestore } = setupUndoHook()

      expect(onConfigRestore).not.toHaveBeenCalled()
    })
  })

  describe('trackChange functionality', () => {
    it('should track first change and enable undo', () => {
      const { result } = setupUndoHook()

      trackChange(result, 'change1')

      expect(result.current.canUndo).toBe(true)
    })

    it('should ignore duplicate changes', () => {
      const { result, onConfigRestore } = setupUndoHook()

      trackChange(result, 'change1')
      expect(result.current.canUndo).toBe(true)

      trackChange(result, 'change1')

      // Should still be able to undo, but only one change tracked
      performUndo(result)
      expect(onConfigRestore).toHaveBeenCalledWith('initial')
      expect(result.current.canUndo).toBe(false)
    })

    it('should track multiple changes after cooldown', async () => {
      const { result, onConfigRestore } = setupUndoHook()

      await trackChangeWithCooldown(result, 'change1')
      await trackChangeWithCooldown(result, 'change2')
      trackChange(result, 'change3')

      // Should have 3 changes + initial
      performUndo(result)
      expect(onConfigRestore).toHaveBeenCalledWith('change2')

      performUndo(result)
      expect(onConfigRestore).toHaveBeenCalledWith('change1')

      performUndo(result)
      expect(onConfigRestore).toHaveBeenCalledWith('initial')
    })

    it('should update last entry when tracking within cooldown', async () => {
      const { result, onConfigRestore } = setupUndoHook()

      await trackChangeWithCooldown(result, 'change1', 50)
      await trackChangeWithCooldown(result, 'change2', 50)
      trackChange(result, 'change3')

      // Should only have change3 (updated from change1 and change2)
      performUndo(result)
      expect(onConfigRestore).toHaveBeenCalledWith('initial')
      expect(result.current.canUndo).toBe(false)
    })

    it('should track initial change even if it happens within cooldown period', () => {
      const { result, onConfigRestore } = setupUndoHook()

      // First change should always be tracked even if within cooldown period
      trackChange(result, 'change1')

      expect(result.current.canUndo).toBe(true)

      performUndo(result)
      expect(onConfigRestore).toHaveBeenCalledWith('initial')
    })
  })

  describe('undo functionality', () => {
    it('should restore previous config when undo is called', () => {
      const { result, onConfigRestore } = setupUndoHook()

      trackChange(result, 'change1')
      performUndo(result)

      expect(onConfigRestore).toHaveBeenCalledWith('initial')
      expect(onConfigRestore).toHaveBeenCalledTimes(1)
    })

    it('should update canUndo state after undo', () => {
      const { result } = setupUndoHook()

      trackChange(result, 'change1')
      expect(result.current.canUndo).toBe(true)

      performUndo(result)
      expect(result.current.canUndo).toBe(false)
    })

    it('should not call onConfigRestore when undo is called with no history', () => {
      const { result, onConfigRestore } = setupUndoHook()

      performUndo(result)

      expect(onConfigRestore).not.toHaveBeenCalled()
    })

    it('should handle multiple undos correctly', async () => {
      const { result, onConfigRestore } = setupUndoHook()

      await trackChangeWithCooldown(result, 'change1')
      await trackChangeWithCooldown(result, 'change2')
      trackChange(result, 'change3')

      // First undo
      performUndo(result)
      expect(onConfigRestore).toHaveBeenCalledWith('change2')
      expect(result.current.canUndo).toBe(true)

      // Second undo
      performUndo(result)
      expect(onConfigRestore).toHaveBeenCalledWith('change1')
      expect(result.current.canUndo).toBe(true)

      // Third undo
      performUndo(result)
      expect(onConfigRestore).toHaveBeenCalledWith('initial')
      expect(result.current.canUndo).toBe(false)

      // Fourth undo should do nothing
      performUndo(result)
      expect(onConfigRestore).toHaveBeenCalledTimes(3)
    })
  })

  describe('isUndoingRef behavior', () => {
    it('should not track changes during undo operation', async () => {
      let resultRef: ReturnType<typeof setupUndoHook>['result']

      const onConfigRestore = vi.fn((config) => {
        // Simulate component updating which might trigger trackChange
        resultRef.current.trackChange(config)
      })

      const { result } = setupUndoHook('initial', onConfigRestore)
      resultRef = result

      await trackChangeWithCooldown(result, 'change1')
      trackChange(result, 'change2')

      // Undo will trigger onConfigRestore which calls trackChange
      // but it should be ignored due to isUndoingRef
      performUndo(result)

      expect(onConfigRestore).toHaveBeenCalledWith('change1')
      expect(result.current.canUndo).toBe(true)

      // Another undo should go back to initial, not stay at change1
      performUndo(result)
      expect(onConfigRestore).toHaveBeenCalledWith('initial')
      expect(result.current.canUndo).toBe(false)
    })

    it('should track changes normally after undo', async () => {
      const { result, onConfigRestore } = setupUndoHook()

      trackChange(result, 'change1')
      performUndo(result)

      await advanceTimers(150)

      // Should be able to track new changes after undo
      trackChange(result, 'change2')

      expect(result.current.canUndo).toBe(true)

      performUndo(result)
      expect(onConfigRestore).toHaveBeenCalledWith('initial')
    })
  })

  describe('MAX_HISTORY_SIZE limit', () => {
    it('should maintain history size within limit', async () => {
      const { result } = setupUndoHook()

      // Add 55 changes (more than MAX_HISTORY_SIZE of 50)
      for (let i = 1; i <= 55; i += 1) {
        await trackChangeWithCooldown(result, `change${i}`)
      }

      // Undo 50 times (should reach oldest kept entry)
      for (let i = 0; i < 50; i += 1) {
        performUndo(result)
      }

      // Should not be able to undo anymore (initial was dropped)
      expect(result.current.canUndo).toBe(false)
    })

    it('should remove oldest entry when exceeding limit', async () => {
      const { result } = setupUndoHook()

      // Add exactly 51 changes (will exceed MAX_HISTORY_SIZE of 50)
      for (let i = 1; i <= 51; i += 1) {
        await trackChangeWithCooldown(result, `change${i}`)
      }

      // Undo all the way back
      for (let i = 0; i < 50; i += 1) {
        performUndo(result)
      }

      // The oldest entry (initial or change1) should have been dropped
      // Last restore should be to change1 (initial was dropped)
      expect(result.current.canUndo).toBe(false)
    })
  })

  describe('cooldown behavior', () => {
    it('should update last entry for rapid changes within cooldown', async () => {
      const { result, onConfigRestore } = setupUndoHook()

      await trackChangeWithCooldown(result, 'change1', 30)
      await trackChangeWithCooldown(result, 'change2', 30)
      await trackChangeWithCooldown(result, 'change3', 30)
      trackChange(result, 'change4')

      // Only the last change should be in history
      performUndo(result)
      expect(onConfigRestore).toHaveBeenCalledWith('initial')
      expect(result.current.canUndo).toBe(false)
    })

    it('should create new entry after cooldown period', async () => {
      const { result, onConfigRestore } = setupUndoHook()

      await trackChangeWithCooldown(result, 'change1')
      trackChange(result, 'change2')

      // Should have two separate entries
      performUndo(result)
      expect(onConfigRestore).toHaveBeenCalledWith('change1')

      performUndo(result)
      expect(onConfigRestore).toHaveBeenCalledWith('initial')
    })

    it('should handle mixed rapid and slow changes correctly', async () => {
      const { result, onConfigRestore } = setupUndoHook()

      // First change + rapid change (should update to change2)
      await trackChangeWithCooldown(result, 'change1', 50)
      trackChange(result, 'change2')

      // Wait beyond cooldown + new entry + rapid change (should update to change4)
      await advanceTimers(150)
      await trackChangeWithCooldown(result, 'change3', 50)
      trackChange(result, 'change4')

      // Should have: initial, change2, change4
      performUndo(result)
      expect(onConfigRestore).toHaveBeenCalledWith('change2')

      performUndo(result)
      expect(onConfigRestore).toHaveBeenCalledWith('initial')

      expect(result.current.canUndo).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle tracking the same config as initial', () => {
      const { result } = setupUndoHook()

      trackChange(result, 'initial')

      expect(result.current.canUndo).toBe(false)
    })

    it('should handle empty string configs', () => {
      const { result, onConfigRestore } = setupUndoHook('')

      trackChange(result, 'change1')

      expect(result.current.canUndo).toBe(true)

      performUndo(result)
      expect(onConfigRestore).toHaveBeenCalledWith('')
    })

    it('should handle very long config strings', async () => {
      const longConfig = 'x'.repeat(10000)
      const { result, onConfigRestore } = setupUndoHook()

      await trackChangeWithCooldown(result, longConfig)
      trackChange(result, 'change2')

      performUndo(result)
      expect(onConfigRestore).toHaveBeenCalledWith(longConfig)
    })

    it('should handle onConfigRestore prop changes', () => {
      const onConfigRestore1 = vi.fn()
      const onConfigRestore2 = vi.fn()

      const { result, rerender } = setupUndoHook('initial', onConfigRestore1)

      trackChange(result, 'change1')

      // Change the callback
      rerender({ config: 'initial', callback: onConfigRestore2 })

      performUndo(result)

      expect(onConfigRestore1).not.toHaveBeenCalled()
      expect(onConfigRestore2).toHaveBeenCalledWith('initial')
    })
  })
})
