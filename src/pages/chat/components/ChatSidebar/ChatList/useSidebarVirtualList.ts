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

import { useVirtualizer } from '@tanstack/react-virtual'
import { useCallback, useContext, useLayoutEffect, useRef, useState } from 'react'

import { ChatListScrollElementContext } from './chatListVirtualization'

const OVERSCAN_ROWS = 10

export const getRootFontSizePx = () =>
  parseFloat(getComputedStyle(document.documentElement).fontSize) || 16

// getBoundingClientRect excludes margins, and sidebar rows are spaced with margin-bottom.
const measureWithMargin = (element: Element) =>
  element.getBoundingClientRect().height + parseFloat(getComputedStyle(element).marginBottom)

interface UseSidebarVirtualListParams {
  count: number
  estimateSize: (index: number) => number
  getItemKey: (index: number) => string
}

/**
 * Virtualizes a sidebar list inside the scroll element of its enclosing ChatSidebarAccordion:
 * only the rows in view (plus overscan) are rendered, the rest is replaced by two spacers.
 * `listRef` goes on the element that holds the spacers and rows.
 */
export const useSidebarVirtualList = ({
  count,
  estimateSize,
  getItemKey,
}: UseSidebarVirtualListParams) => {
  const scrollElement = useContext(ChatListScrollElementContext)
  const listRef = useRef<HTMLElement | null>(null)
  const [scrollMargin, setScrollMargin] = useState(0)
  const isVirtual = !!scrollElement
  // On expand the scroll element arrives one commit after the list mounts; rendering every row in
  // that first pass is exactly the freeze virtualization avoids.
  const isAwaitingScrollElement = scrollElement === null

  const virtualizer = useVirtualizer({
    count,
    enabled: isVirtual,
    getScrollElement: () => scrollElement ?? null,
    // The virtualizer scrolls to this offset when it attaches; the scroll element is shared, so
    // it must be where the user already is, not the top (e.g. opening a folder far down).
    initialOffset: () => scrollElement?.scrollTop ?? 0,
    estimateSize,
    getItemKey,
    measureElement: measureWithMargin,
    overscan: OVERSCAN_ROWS,
    scrollMargin,
  })

  // The list may sit below other content in the scroll element (e.g. a folder's chats under the
  // folders above it), and that content can change height, so the offset is re-measured.
  useLayoutEffect(() => {
    const list = listRef.current
    let observer: ResizeObserver | undefined
    if (isVirtual && scrollElement && list) {
      const updateScrollMargin = () => {
        const offset =
          list.getBoundingClientRect().top -
          scrollElement.getBoundingClientRect().top +
          scrollElement.scrollTop
        setScrollMargin((previous) => (Math.abs(previous - offset) < 0.5 ? previous : offset))
      }
      updateScrollMargin()
      const resizeObserver = new ResizeObserver(updateScrollMargin)
      Array.from(scrollElement.children).forEach((child) => resizeObserver.observe(child))
      observer = resizeObserver
    }
    return () => observer?.disconnect()
  }, [isVirtual, scrollElement])

  const measureRow = useCallback(
    (element: Element | null) => {
      if (isVirtual) virtualizer.measureElement(element)
    },
    [isVirtual, virtualizer]
  )

  let virtualItems = virtualizer.getVirtualItems()
  let paddingTop = 0
  let paddingBottom = 0
  if (isVirtual) {
    const totalSize = virtualizer.getTotalSize()
    const first = virtualItems[0]
    const last = virtualItems[virtualItems.length - 1]
    paddingTop = first ? first.start - scrollMargin : 0
    paddingBottom = last ? totalSize - (last.end - scrollMargin) : totalSize
  } else {
    virtualItems = []
  }

  return {
    listRef,
    isVirtual,
    isAwaitingScrollElement,
    virtualizer,
    virtualItems,
    paddingTop,
    paddingBottom,
    measureRow,
  }
}
