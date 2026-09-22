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

import storage from '@/utils/storage'

import { userStore } from './user'

const PIN_ORDER_STORAGE_KEY = 'pinned_chats_order'

export interface PinOrderStoreType {
  getPinOrder(): Record<string, string>
  recordPin(chatId: string): void
  clearPin(chatId: string): void
  ensurePinOrder(chatId: string, fallbackIso: string | undefined): void
}

/**
 * Tracks when each chat was last pinned, independent of `chat.updateDate`. The Pinned section
 * sorts by this map instead of recency so that real activity inside a pinned chat (which does
 * legitimately bump `updateDate`) never reorders the Pinned section — only an explicit pin/unpin
 * action does (EPMCDME-15009 reopened AC).
 */
export const pinOrderStore = proxy<PinOrderStoreType>({
  getPinOrder(): Record<string, string> {
    try {
      const userId = userStore.user?.userId
      if (!userId) return {}
      return storage.getObject<Record<string, string>>(userId, PIN_ORDER_STORAGE_KEY, {})
    } catch (error) {
      console.error('Error loading pin order:', error)
      return {}
    }
  },

  recordPin(chatId: string) {
    try {
      const userId = userStore.user?.userId
      if (!userId) return
      const order = pinOrderStore.getPinOrder()
      order[chatId] = new Date().toISOString()
      storage.put(userId, PIN_ORDER_STORAGE_KEY, order)
    } catch (error) {
      console.error('Error recording pin order:', error)
    }
  },

  clearPin(chatId: string) {
    try {
      const userId = userStore.user?.userId
      if (!userId) return
      const order = pinOrderStore.getPinOrder()
      if (!(chatId in order)) return
      delete order[chatId]
      storage.put(userId, PIN_ORDER_STORAGE_KEY, order)
    } catch (error) {
      console.error('Error clearing pin order:', error)
    }
  },

  ensurePinOrder(chatId: string, fallbackIso: string | undefined) {
    try {
      const userId = userStore.user?.userId
      if (!userId || !fallbackIso) return
      const order = pinOrderStore.getPinOrder()
      if (chatId in order) return
      order[chatId] = fallbackIso
      storage.put(userId, PIN_ORDER_STORAGE_KEY, order)
    } catch (error) {
      console.error('Error backfilling pin order:', error)
    }
  },
})
