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

export const CHAT_SIDEBAR_MIN_WIDTH = 260
export const CHAT_SIDEBAR_MAX_WIDTH = 520
export const CHAT_SIDEBAR_DEFAULT_WIDTH = 308
export const CHAT_SIDEBAR_WIDTH_CSS_VAR = '--chat-sidebar-width'

// Present on <html> only while the user is actively dragging the chat sidebar
// separator. Global CSS (main.scss) keys off it to suppress the collapse/expand
// width + toggle transitions during drag so the panel edge and toggle button
// track the pointer instantly instead of easing behind it.
export const CHAT_SIDEBAR_RESIZING_ATTR = 'data-chat-sidebar-resizing'

// Present on <html> only once the chat page has painted its panels at the
// stored width. The flex collapse/expand transition (main.scss) is gated on
// this attr so that entering /chat from a page with a differently-sized sidebar
// snaps to the stored width instead of animating from the previous layout; the
// transition is enabled a frame later, once the initial size is on screen.
export const CHAT_SIDEBAR_READY_ATTR = 'data-chat-sidebar-ready'

const STORAGE_KEY_PREFIX = 'chat-sidebar-width'

const clamp = (width: number): number =>
  Math.min(CHAT_SIDEBAR_MAX_WIDTH, Math.max(CHAT_SIDEBAR_MIN_WIDTH, width))

export const getStoredChatSidebarWidth = (userId: string): number => {
  const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}-${userId}`)
  const parsed = stored ? parseInt(stored, 10) : NaN

  return Number.isFinite(parsed) ? clamp(parsed) : CHAT_SIDEBAR_DEFAULT_WIDTH
}

export const setStoredChatSidebarWidth = (userId: string, width: number): void => {
  if (width >= CHAT_SIDEBAR_MIN_WIDTH) {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}-${userId}`, width.toString())
  }
}

export const setChatSidebarWidthCssVar = (width: number): void => {
  document.documentElement.style.setProperty(CHAT_SIDEBAR_WIDTH_CSS_VAR, `${width}px`)
}

export const startChatSidebarResizing = (): void => {
  document.documentElement.setAttribute(CHAT_SIDEBAR_RESIZING_ATTR, 'true')
}

export const stopChatSidebarResizing = (): void => {
  document.documentElement.removeAttribute(CHAT_SIDEBAR_RESIZING_ATTR)
}

export const markChatSidebarReady = (): void => {
  document.documentElement.setAttribute(CHAT_SIDEBAR_READY_ATTR, 'true')
}

export const unmarkChatSidebarReady = (): void => {
  document.documentElement.removeAttribute(CHAT_SIDEBAR_READY_ATTR)
}
