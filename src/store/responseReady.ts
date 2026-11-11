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

import { proxy } from 'valtio'

import {
  notificationSupported,
  PERMISSION_HINT_DELAY_MS,
  PERMISSION_HINT_TEXT,
  showResponseReadyNotification,
} from '@/utils/responseReady'
import toaster from '@/utils/toaster'

export interface ResponseReadyStoreType {
  pending: boolean
  markResponseReady: () => void
  clearResponseReady: () => void
  requestNotificationPermission: () => Promise<void>
}

// A permission result other than "granted" (dismissed or denied) is remembered for this page session.
let notificationDeclinedThisSession = false
let notificationHintShown = false

/**
 * Flags the tab when an AI response completes while the document is hidden.
 * The indicator is a document.title prefix; an optional browser notification
 * is shown only when permission was already granted.
 */
export const responseReadyStore = proxy<ResponseReadyStoreType>({
  pending: false,

  markResponseReady(): void {
    if (!document.hidden) return
    this.pending = true
    if (notificationSupported() && window.Notification.permission === 'granted') {
      try {
        showResponseReadyNotification()
      } catch {
        // Must never escape into stream completion, which has already written the response.
      }
    }
  },

  clearResponseReady(): void {
    this.pending = false
  },

  async requestNotificationPermission(): Promise<void> {
    if (
      !notificationSupported() ||
      window.Notification.permission !== 'default' ||
      notificationDeclinedThisSession
    )
      return
    // Some browsers (seen in Edge) leave the request pending without ever showing a prompt.
    const hintTimer = setTimeout(() => {
      if (notificationHintShown || window.Notification.permission !== 'default') return
      notificationHintShown = true
      toaster.info(PERMISSION_HINT_TEXT, { duration: PERMISSION_HINT_DELAY_MS })
    }, PERMISSION_HINT_DELAY_MS)
    try {
      const result = await window.Notification.requestPermission()
      if (result !== 'granted') notificationDeclinedThisSession = true
    } catch {
      // Permission prompts can reject in some browsers; the title indicator still works.
    } finally {
      clearTimeout(hintTimer)
    }
  },
})
