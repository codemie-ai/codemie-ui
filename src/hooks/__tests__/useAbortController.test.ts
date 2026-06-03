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

import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { useAbortController } from '../useAbortController'

describe('useAbortController', () => {
  describe('execute', () => {
    it('should cancel previous request when a new one starts', async () => {
      const { result } = renderHook(() => useAbortController())

      const firstRequest = vi.fn((signal: AbortSignal): Promise<string> => {
        return new Promise<string>((resolve, reject) => {
          signal.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'))
          })
          setTimeout(() => resolve('first'), 2000)
        })
      })

      const secondRequest = vi.fn((_signal: AbortSignal): Promise<string> => {
        return new Promise<string>((resolve) => {
          setTimeout(() => resolve('second'), 100)
        })
      })

      let firstResult: string | null | undefined
      let secondResult: string | null | undefined

      await act(async () => {
        const firstPromise = result.current.execute(firstRequest)
        const secondPromise = result.current.execute(secondRequest)
        const [r1, r2] = await Promise.all([firstPromise, secondPromise])
        firstResult = r1
        secondResult = r2
      })

      expect(firstResult).toBe(null)
      expect(secondResult).toBe('second')
      expect(firstRequest).toHaveBeenCalledTimes(1)
      expect(secondRequest).toHaveBeenCalledTimes(1)
    })

    it('should ignore stale responses based on generation', async () => {
      const { result } = renderHook(() => useAbortController())

      let resolveFirst!: (value: string) => void
      let resolveSecond!: (value: string) => void

      const firstRequest = vi.fn((_signal: AbortSignal) => {
        return new Promise<string>((resolve) => {
          resolveFirst = resolve
        })
      })

      const secondRequest = vi.fn((_signal: AbortSignal) => {
        return new Promise<string>((resolve) => {
          resolveSecond = resolve
        })
      })

      let firstResult: string | null | undefined
      let secondResult: string | null | undefined

      await act(async () => {
        const firstPromise = result.current.execute(firstRequest)
        const secondPromise = result.current.execute(secondRequest)

        // Complete second request first
        resolveSecond('second')
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 0)
        })

        // Complete first request after (stale)
        resolveFirst('first')
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 0)
        })

        const [r1, r2] = await Promise.all([firstPromise, secondPromise])
        firstResult = r1
        secondResult = r2
      })

      expect(firstResult).toBe(null)
      expect(secondResult).toBe('second')
    })
  })

  describe('error handling', () => {
    it('should return null for AbortError without throwing', async () => {
      const { result } = renderHook(() => useAbortController())

      const mockRequest = vi.fn((_signal: AbortSignal) => {
        return Promise.reject(new DOMException('Aborted', 'AbortError'))
      })

      const executeResult = await act(() => result.current.execute(mockRequest))

      expect(executeResult).toBe(null)
      expect(mockRequest).toHaveBeenCalledTimes(1)
    })

    it('should rethrow non-AbortError errors', async () => {
      const { result } = renderHook(() => useAbortController())

      const networkError = new Error('Network error')
      const mockRequest = vi.fn((_signal: AbortSignal) => {
        return Promise.reject(networkError)
      })

      await expect(act(() => result.current.execute(mockRequest))).rejects.toThrow('Network error')

      expect(mockRequest).toHaveBeenCalledTimes(1)
    })
  })

  describe('cleanup', () => {
    it('should cancel request on component unmount', async () => {
      const { result, unmount } = renderHook(() => useAbortController())

      const mockRequest = vi.fn((signal: AbortSignal) => {
        return new Promise((resolve, reject) => {
          signal.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'))
          })
          setTimeout(() => resolve('data'), 1000)
        })
      })

      const executePromise = act(() => result.current.execute(mockRequest))

      unmount()

      const executeResult = await executePromise

      expect(executeResult).toBe(null)
      expect(mockRequest).toHaveBeenCalledTimes(1)
    })
  })

  describe('isActive flag', () => {
    it('should track active state correctly', async () => {
      const { result } = renderHook(() => useAbortController())

      expect(result.current.isActive).toBe(false)

      const mockRequest = vi.fn((_signal: AbortSignal) => {
        return new Promise((resolve) => {
          setTimeout(() => resolve('data'), 100)
        })
      })

      // Note: isActive is a ref, so we need to check it during execution
      // This is a limitation of the current implementation

      await act(async () => {
        await result.current.execute(mockRequest)
      })

      expect(result.current.isActive).toBe(false)
    })
  })

  describe('cancel', () => {
    it('should abort the current request when cancel is called', async () => {
      const { result } = renderHook(() => useAbortController())

      const mockRequest = vi.fn((signal: AbortSignal) => {
        return new Promise((resolve, reject) => {
          signal.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'))
          })
          setTimeout(() => resolve('data'), 1000)
        })
      })

      const executePromise = act(() => result.current.execute(mockRequest))

      act(() => {
        result.current.cancel()
      })

      const executeResult = await executePromise

      expect(executeResult).toBe(null)
      expect(mockRequest).toHaveBeenCalledTimes(1)
    })

    it('should set isActive to false after cancel', async () => {
      const { result } = renderHook(() => useAbortController())

      const mockRequest = vi.fn((_signal: AbortSignal) => {
        return new Promise((resolve) => {
          setTimeout(() => resolve('data'), 1000)
        })
      })

      act(() => {
        result.current.execute(mockRequest)
      })

      expect(result.current.isActive).toBe(true)

      act(() => {
        result.current.cancel()
      })

      expect(result.current.isActive).toBe(false)
    })
  })
})
