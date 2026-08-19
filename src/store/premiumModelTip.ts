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

/**
 * Stand-in chat id for a chat that has been started but not yet persisted
 * (`chatsStore.currentChat.id === ''`). Dismissals recorded against it are
 * either cleared by the next `startNewChat` or promoted to the real chat id
 * once `createChat` resolves.
 */
export const PENDING_CHAT_KEY = 'pending-new-chat'

interface PremiumModelTipStoreType {
  /** `${chatId}:${modelValue}` -> dismissed. Session-scoped, never persisted. */
  dismissedKeys: Record<string, boolean>
  buildKey(chatId: string | null | undefined, modelValue: string | null | undefined): string | null
  isDismissed(key: string | null): boolean
  dismiss(key: string | null): void
  clearPendingDismissals(): void
  promotePendingDismissals(chatId: string): void
}

/**
 * Tracks which premium-model tips the user has dismissed, keyed by
 * (chat, model) pair.
 *
 * Lives in a store rather than in `ChatHistory` component state because
 * `ChatPage` remounts its subtree on `currentChat?.id` and on the
 * history/empty transition; component state died with those remounts, which
 * made the tip reappear where it had been dismissed and stay hidden where it
 * should have re-armed.
 *
 * Deliberately session-scoped — no `localStorage`, no `chatStorageUtils`. A
 * logout is a full document navigation, so module state is wiped for free.
 */
export const premiumModelTipStore = proxy<PremiumModelTipStoreType>({
  dismissedKeys: {},

  buildKey(chatId, modelValue) {
    if (!modelValue) return null
    return `${chatId || PENDING_CHAT_KEY}:${modelValue}`
  },

  isDismissed(key) {
    if (!key) return false
    return this.dismissedKeys[key] === true
  },

  dismiss(key) {
    // A null key means "no model resolved yet" — recording it would dismiss a
    // tip that was never keyed to anything (CR-002).
    if (!key) return
    this.dismissedKeys[key] = true
  },

  /**
   * Re-arms the tip for the next unsaved chat. Dismissals belonging to real
   * chats are untouched, so returning to a saved conversation keeps its tip
   * hidden.
   */
  clearPendingDismissals() {
    Object.keys(this.dismissedKeys)
      .filter((key) => key.startsWith(`${PENDING_CHAT_KEY}:`))
      .forEach((key) => {
        delete this.dismissedKeys[key]
      })
  },

  /**
   * Carries a dismissal made on the unsaved chat over to the id the backend
   * assigned, so sending the first message does not make the tip pop back.
   */
  promotePendingDismissals(chatId) {
    if (!chatId) return

    Object.keys(this.dismissedKeys)
      .filter((key) => key.startsWith(`${PENDING_CHAT_KEY}:`))
      .forEach((key) => {
        const modelValue = key.slice(PENDING_CHAT_KEY.length + 1)
        this.dismissedKeys[`${chatId}:${modelValue}`] = true
        delete this.dismissedKeys[key]
      })
  },
})
