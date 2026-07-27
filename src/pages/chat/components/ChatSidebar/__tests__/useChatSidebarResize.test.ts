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
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { appInfoStore } from '@/store/appInfo'

import {
  CHAT_SIDEBAR_WIDTH_CSS_VAR,
  CHAT_SIDEBAR_RESIZING_ATTR,
  CHAT_SIDEBAR_READY_ATTR,
  CHAT_SIDEBAR_DEFAULT_WIDTH,
} from '../chatSidebarWidth'
import { useChatSidebarResize } from '../useChatSidebarResize'

vi.mock('@/store/user', () => ({
  userStore: {
    user: { userId: 'test-user-123' },
  },
}))

// A real drag = pointer pressed (window pointerdown) while onResize fires.
const startDrag = () => window.dispatchEvent(new Event('pointerdown'))
const endDrag = () => window.dispatchEvent(new Event('pointerup'))

describe('useChatSidebarResize', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.style.removeProperty(CHAT_SIDEBAR_WIDTH_CSS_VAR)
    document.documentElement.removeAttribute(CHAT_SIDEBAR_RESIZING_ATTR)
    document.documentElement.removeAttribute(CHAT_SIDEBAR_READY_ATTR)
    appInfoStore.sidebarExpanded = true
  })

  afterEach(() => {
    endDrag()
  })

  it('returns the stored width as the initial width', () => {
    localStorage.setItem('chat-sidebar-width-test-user-123', '400')
    const { result } = renderHook(() => useChatSidebarResize())

    expect(result.current.initialWidth).toBe(400)
  })

  it('returns the default width when nothing is stored', () => {
    const { result } = renderHook(() => useChatSidebarResize())

    expect(result.current.initialWidth).toBe(308)
  })

  it('resets the CSS var to the default width on unmount so non-chat pages use the fixed sidebar offset', () => {
    localStorage.setItem('chat-sidebar-width-test-user-123', '500')
    const { unmount } = renderHook(() => useChatSidebarResize())

    // Mounted on /chat: the var carries the live chat sidebar width.
    expect(document.documentElement.style.getPropertyValue(CHAT_SIDEBAR_WIDTH_CSS_VAR)).toBe(
      '500px'
    )

    unmount()

    // Left /chat: the var falls back to the fixed default, so the shared
    // sidebar's toggle offset on other pages is not stuck at the dragged width.
    expect(document.documentElement.style.getPropertyValue(CHAT_SIDEBAR_WIDTH_CSS_VAR)).toBe(
      `${CHAT_SIDEBAR_DEFAULT_WIDTH}px`
    )
  })

  it('enables the flex transition a frame after mount and clears it on unmount', () => {
    const rafSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        cb(0)
        return 1
      })

    const { unmount } = renderHook(() => useChatSidebarResize())

    // The ready marker gates the collapse/expand flex transition; it is set only
    // after the first paint so entering /chat snaps to the stored width.
    expect(document.documentElement.hasAttribute(CHAT_SIDEBAR_READY_ATTR)).toBe(true)

    unmount()

    // Leaving /chat clears it, so a later re-entry snaps again instead of easing.
    expect(document.documentElement.hasAttribute(CHAT_SIDEBAR_READY_ATTR)).toBe(false)

    rafSpy.mockRestore()
  })

  it('persists width and updates the CSS var on drag resize while expanded', () => {
    const { result } = renderHook(() => useChatSidebarResize())

    act(() => {
      startDrag()
      result.current.handleResize({ inPixels: 450, asPercentage: 40 })
    })

    expect(localStorage.getItem('chat-sidebar-width-test-user-123')).toBe('450')
    expect(document.documentElement.style.getPropertyValue(CHAT_SIDEBAR_WIDTH_CSS_VAR)).toBe(
      '450px'
    )
  })

  it('ignores resize frames when no pointer is pressed (collapse/expand animation)', () => {
    localStorage.setItem('chat-sidebar-width-test-user-123', '400')
    const { result } = renderHook(() => useChatSidebarResize())

    // A programmatic collapse animates through intermediate widths; those frames
    // must not persist a half-collapsed width nor re-expand the panel.
    act(() => {
      result.current.handleResize({ inPixels: 280, asPercentage: 26 })
    })

    expect(localStorage.getItem('chat-sidebar-width-test-user-123')).toBe('400')
    expect(appInfoStore.sidebarExpanded).toBe(true)
  })

  it('does not persist width when drag reports a collapsed (0px) panel', () => {
    localStorage.setItem('chat-sidebar-width-test-user-123', '400')
    const { result } = renderHook(() => useChatSidebarResize())

    act(() => {
      startDrag()
      result.current.handleResize({ inPixels: 0, asPercentage: 0 })
    })

    expect(localStorage.getItem('chat-sidebar-width-test-user-123')).toBe('400')
  })

  it('syncs appInfoStore.sidebarExpanded to false when drag-collapsed to 0px', () => {
    const { result } = renderHook(() => useChatSidebarResize())

    act(() => {
      startDrag()
      result.current.handleResize({ inPixels: 0, asPercentage: 0 })
    })

    expect(appInfoStore.sidebarExpanded).toBe(false)
  })

  it('syncs appInfoStore.sidebarExpanded to true when drag-expanded from collapsed', () => {
    appInfoStore.sidebarExpanded = false
    const { result } = renderHook(() => useChatSidebarResize())

    act(() => {
      startDrag()
      result.current.handleResize({ inPixels: 320, asPercentage: 30 })
    })

    expect(appInfoStore.sidebarExpanded).toBe(true)
  })

  it('does not touch appInfoStore.sidebarExpanded on a non-drag resize', () => {
    appInfoStore.sidebarExpanded = false
    const { result } = renderHook(() => useChatSidebarResize())

    // onResize fires on mount / during programmatic animation with no pointer
    // pressed; it must not clobber the stored collapsed preference.
    act(() => {
      result.current.handleResize({ inPixels: 308, asPercentage: 30 })
    })

    expect(appInfoStore.sidebarExpanded).toBe(false)
  })

  it('does not fight the drag: skips panelRef.expand when the panel is already open', () => {
    appInfoStore.sidebarExpanded = false
    const { result, rerender } = renderHook(() => useChatSidebarResize())
    const expand = vi.fn()
    // panel already open (isCollapsed false) because the user just dragged it out
    // @ts-expect-error -- assigning a partial imperative handle for the test double
    result.current.panelRef.current = { collapse: vi.fn(), expand, isCollapsed: () => false }

    act(() => {
      startDrag()
      // drag re-opens the panel -> handleResize flips the store to expanded
      result.current.handleResize({ inPixels: 320, asPercentage: 30 })
    })
    rerender()

    expect(expand).not.toHaveBeenCalled()
  })

  it('calls panelRef.collapse() when sidebarExpanded becomes false and the panel is open', () => {
    const { result, rerender } = renderHook(() => useChatSidebarResize())
    const collapse = vi.fn()
    // @ts-expect-error -- assigning a partial imperative handle for the test double
    result.current.panelRef.current = { collapse, expand: vi.fn(), isCollapsed: () => false }

    act(() => {
      appInfoStore.sidebarExpanded = false
    })
    rerender()

    expect(collapse).toHaveBeenCalledTimes(1)
  })

  it('calls panelRef.expand() when sidebarExpanded becomes true and the panel is collapsed', () => {
    appInfoStore.sidebarExpanded = false
    const { result, rerender } = renderHook(() => useChatSidebarResize())
    const expand = vi.fn()
    // @ts-expect-error -- assigning a partial imperative handle for the test double
    result.current.panelRef.current = { collapse: vi.fn(), expand, isCollapsed: () => true }

    act(() => {
      appInfoStore.sidebarExpanded = true
    })
    rerender()

    expect(expand).toHaveBeenCalledTimes(1)
  })

  it('marks the document root as resizing on a resize while a pointer is pressed', () => {
    const { result } = renderHook(() => useChatSidebarResize())

    act(() => {
      startDrag()
      result.current.handleResize({ inPixels: 320, asPercentage: 30 })
    })

    expect(document.documentElement.hasAttribute(CHAT_SIDEBAR_RESIZING_ATTR)).toBe(true)
  })

  it('does not mark resizing on a programmatic resize (no pointer pressed)', () => {
    const { result } = renderHook(() => useChatSidebarResize())

    act(() => {
      result.current.handleResize({ inPixels: 320, asPercentage: 30 })
    })

    expect(document.documentElement.hasAttribute(CHAT_SIDEBAR_RESIZING_ATTR)).toBe(false)
  })

  it('clears the resizing marker when the drag ends (pointerup)', () => {
    const { result } = renderHook(() => useChatSidebarResize())

    act(() => {
      startDrag()
      result.current.handleResize({ inPixels: 320, asPercentage: 30 })
    })
    act(() => {
      endDrag()
    })

    expect(document.documentElement.hasAttribute(CHAT_SIDEBAR_RESIZING_ATTR)).toBe(false)
  })

  it('clears the resizing marker on unmount', () => {
    const { result, unmount } = renderHook(() => useChatSidebarResize())

    act(() => {
      startDrag()
      result.current.handleResize({ inPixels: 320, asPercentage: 30 })
    })
    unmount()

    expect(document.documentElement.hasAttribute(CHAT_SIDEBAR_RESIZING_ATTR)).toBe(false)
  })
})
