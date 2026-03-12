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

interface UseInfiniteScrollOptions {
  enabled: boolean
  isLoading: boolean
  hasMore: boolean
  onLoadMore: () => void
  threshold?: number
}

/**
 * Custom hook for infinite scroll using IntersectionObserver
 *
 * @param options - Configuration options
 * @param options.enabled - Whether infinite scroll is enabled
 * @param options.isLoading - Whether data is currently being loaded
 * @param options.hasMore - Whether there is more data to load
 * @param options.onLoadMore - Callback to load more data
 * @param options.threshold - Distance from bottom to trigger load (0-1, default: 1.0)
 * @returns ref - Ref to attach to the sentinel element
 */
export const useInfiniteScroll = ({
  enabled,
  isLoading,
  hasMore,
  onLoadMore,
  threshold = 1.0,
}: UseInfiniteScrollOptions) => {
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!enabled || !sentinelRef.current) {
      return undefined
    }

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries

      if (entry.isIntersecting && !isLoading && hasMore) {
        onLoadMore()
      }
    }

    const observer = new IntersectionObserver(handleIntersection, {
      root: null,
      rootMargin: '0px',
      threshold,
    })

    observer.observe(sentinelRef.current)

    // eslint-disable-next-line consistent-return
    return () => {
      observer.disconnect()
    }
  }, [enabled, isLoading, hasMore, onLoadMore, threshold])

  return sentinelRef
}
