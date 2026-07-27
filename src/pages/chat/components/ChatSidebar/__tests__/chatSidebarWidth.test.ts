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

import { describe, it, expect, beforeEach } from 'vitest'

import {
  CHAT_SIDEBAR_MIN_WIDTH,
  CHAT_SIDEBAR_MAX_WIDTH,
  CHAT_SIDEBAR_DEFAULT_WIDTH,
  CHAT_SIDEBAR_WIDTH_CSS_VAR,
  CHAT_SIDEBAR_RESIZING_ATTR,
  CHAT_SIDEBAR_READY_ATTR,
  getStoredChatSidebarWidth,
  setStoredChatSidebarWidth,
  setChatSidebarWidthCssVar,
  startChatSidebarResizing,
  stopChatSidebarResizing,
  markChatSidebarReady,
  unmarkChatSidebarReady,
} from '../chatSidebarWidth'

describe('chatSidebarWidth', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.style.removeProperty(CHAT_SIDEBAR_WIDTH_CSS_VAR)
    document.documentElement.removeAttribute(CHAT_SIDEBAR_RESIZING_ATTR)
    document.documentElement.removeAttribute(CHAT_SIDEBAR_READY_ATTR)
  })

  describe('getStoredChatSidebarWidth', () => {
    it('returns the default width when nothing is stored', () => {
      expect(getStoredChatSidebarWidth('user-1')).toBe(CHAT_SIDEBAR_DEFAULT_WIDTH)
    })

    it('returns the stored width when present and within bounds', () => {
      localStorage.setItem('chat-sidebar-width-user-1', '400')
      expect(getStoredChatSidebarWidth('user-1')).toBe(400)
    })

    it('clamps a stored width below the minimum', () => {
      localStorage.setItem('chat-sidebar-width-user-1', '10')
      expect(getStoredChatSidebarWidth('user-1')).toBe(CHAT_SIDEBAR_MIN_WIDTH)
    })

    it('clamps a stored width above the maximum', () => {
      localStorage.setItem('chat-sidebar-width-user-1', '9999')
      expect(getStoredChatSidebarWidth('user-1')).toBe(CHAT_SIDEBAR_MAX_WIDTH)
    })

    it('returns the default width for a non-numeric stored value', () => {
      localStorage.setItem('chat-sidebar-width-user-1', 'not-a-number')
      expect(getStoredChatSidebarWidth('user-1')).toBe(CHAT_SIDEBAR_DEFAULT_WIDTH)
    })

    it('scopes the storage key by userId', () => {
      localStorage.setItem('chat-sidebar-width-user-1', '400')
      expect(getStoredChatSidebarWidth('user-2')).toBe(CHAT_SIDEBAR_DEFAULT_WIDTH)
    })
  })

  describe('setStoredChatSidebarWidth', () => {
    it('persists a width at or above the minimum', () => {
      setStoredChatSidebarWidth('user-1', 350)
      expect(localStorage.getItem('chat-sidebar-width-user-1')).toBe('350')
    })

    it('does not persist a width below the minimum', () => {
      setStoredChatSidebarWidth('user-1', 0)
      expect(localStorage.getItem('chat-sidebar-width-user-1')).toBeNull()
    })
  })

  describe('setChatSidebarWidthCssVar', () => {
    it('sets the CSS custom property on the document root', () => {
      setChatSidebarWidthCssVar(340)
      expect(document.documentElement.style.getPropertyValue(CHAT_SIDEBAR_WIDTH_CSS_VAR)).toBe(
        '340px'
      )
    })
  })

  describe('startChatSidebarResizing', () => {
    it('marks the document root as resizing', () => {
      startChatSidebarResizing()
      expect(document.documentElement.hasAttribute(CHAT_SIDEBAR_RESIZING_ATTR)).toBe(true)
    })
  })

  describe('stopChatSidebarResizing', () => {
    it('clears the resizing marker', () => {
      startChatSidebarResizing()
      stopChatSidebarResizing()
      expect(document.documentElement.hasAttribute(CHAT_SIDEBAR_RESIZING_ATTR)).toBe(false)
    })
  })

  describe('markChatSidebarReady', () => {
    it('marks the document root as ready', () => {
      markChatSidebarReady()
      expect(document.documentElement.hasAttribute(CHAT_SIDEBAR_READY_ATTR)).toBe(true)
    })
  })

  describe('unmarkChatSidebarReady', () => {
    it('clears the ready marker', () => {
      markChatSidebarReady()
      unmarkChatSidebarReady()
      expect(document.documentElement.hasAttribute(CHAT_SIDEBAR_READY_ATTR)).toBe(false)
    })
  })
})
