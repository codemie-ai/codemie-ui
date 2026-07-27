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
import { PanelImperativeHandle, PanelSize } from 'react-resizable-panels'
import { useSnapshot } from 'valtio'

import { appInfoStore } from '@/store/appInfo'
import { userStore } from '@/store/user'

import {
  CHAT_SIDEBAR_DEFAULT_WIDTH,
  getStoredChatSidebarWidth,
  markChatSidebarReady,
  unmarkChatSidebarReady,
  startChatSidebarResizing,
  stopChatSidebarResizing,
  setChatSidebarWidthCssVar,
  setStoredChatSidebarWidth,
} from './chatSidebarWidth'

export const useChatSidebarResize = () => {
  const { user } = useSnapshot(userStore)
  const userId = user?.userId ?? 'default'
  const { sidebarExpanded } = useSnapshot(appInfoStore)

  const panelRef = useRef<PanelImperativeHandle>(null)
  const initialWidth = getStoredChatSidebarWidth(userId)

  // Whether a pointer is currently pressed anywhere. react-resizable-panels
  // starts a drag from a document-level pointerdown hit-test over a region wider
  // than the 7px separator element, so a per-separator handler misses many
  // drags. Tracking the pointer globally is the reliable signal for "this
  // onResize is a user drag" vs a programmatic collapse/expand.
  const pointerDownRef = useRef(false)

  useEffect(() => {
    // The --chat-sidebar-width var is global (read app-wide by the sidebar
    // toggle offset and gradient). Only the chat page has a variable width, so
    // set it while ChatPage is mounted and reset it to the fixed default on
    // unmount — otherwise a dragged width would leak onto every other page,
    // whose sidebar is a fixed 308px, and strand the toggle at the drag offset.
    setChatSidebarWidthCssVar(initialWidth)

    // Enable the collapse/expand flex transition only after the panels have
    // painted at the stored width. On first mount the transition is off, so
    // entering /chat from a page with a differently-sized sidebar snaps to the
    // stored width instead of animating from the previous layout; a frame later
    // the transition is on and Ctrl+B / drag still animate normally.
    const raf = requestAnimationFrame(() => markChatSidebarReady())

    return () => {
      cancelAnimationFrame(raf)
      unmarkChatSidebarReady()
      setChatSidebarWidthCssVar(CHAT_SIDEBAR_DEFAULT_WIDTH)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onPointerDown = () => {
      pointerDownRef.current = true
    }
    const endDrag = () => {
      pointerDownRef.current = false
      // Restore the collapse/expand transitions once the drag is released.
      stopChatSidebarResizing()
    }

    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('pointerup', endDrag, true)
    window.addEventListener('pointercancel', endDrag, true)

    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('pointerup', endDrag, true)
      window.removeEventListener('pointercancel', endDrag, true)
      stopChatSidebarResizing()
    }
  }, [])

  const handleResize = useCallback(
    (panelSize: PanelSize) => {
      // Only react to a user drag, identified by a currently-pressed pointer.
      // A programmatic collapse/expand animates the panel width via CSS, and the
      // library's ResizeObserver reports every intermediate frame here too;
      // treating those as user input would persist a half-collapsed width, drag
      // the CSS var around, and — worst — flip the collapse store on a >0 frame,
      // bouncing the panel straight back open. A toggle click's onClick fires
      // after pointerup, so the pointer is already released during that
      // animation and these frames are correctly ignored.
      if (!pointerDownRef.current) return

      // Drag: drop the transitions so the edge/toggle track the pointer instantly.
      startChatSidebarResizing()

      if (panelSize.inPixels > 0) {
        setStoredChatSidebarWidth(userId, panelSize.inPixels)
        setChatSidebarWidthCssVar(panelSize.inPixels)
      }

      // Keep the collapse/expand store in step with the panel's real state (drag
      // to 0 collapses, drag back out re-expands) so the toggle chevron/offset
      // recover. Guard on a real change so a width drag doesn't rewrite
      // localStorage every frame.
      const nextExpanded = panelSize.inPixels > 0
      if (appInfoStore.sidebarExpanded !== nextExpanded) {
        appInfoStore.setSidebarExpanded(nextExpanded)
      }
    },
    [userId]
  )

  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return

    // Only act when the store and the panel actually disagree. During a drag the
    // panel already matches the store we just synced, so isCollapsed() short-
    // circuits this and we never fight the user's drag.
    if (sidebarExpanded && panel.isCollapsed()) {
      panel.expand()
    } else if (!sidebarExpanded && !panel.isCollapsed()) {
      panel.collapse()
    }
  }, [sidebarExpanded])

  return { panelRef, initialWidth, handleResize }
}
