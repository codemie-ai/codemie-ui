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

const MOVE_ORDER_STORAGE_KEY = 'moved_chats_order'

export interface MoveOrderStoreType {
  getMoveOrder(): Record<string, string>
  recordMove(chatId: string): void
  clearMove(chatId: string): void
}

/**
 * Tracks when each chat was last moved into a folder, independent of `chat.updateDate`. Moving a
 * chat must not bump its activity timestamp (EPMCDME-15009 reopened AC), yet it must still land at
 * the top of the target folder regardless of its actual last activity — so recency-based sorts for
 * folder chat lists take `max(updateDate, moveOrder)` instead of `updateDate` alone. Because the
 * recorded value is a real timestamp (not a flag), it only wins the sort until something
 * legitimately newer happens — after that, normal recency sorting resumes on its own, without
 * permanently pinning the chat to the top.
 */
export const moveOrderStore = proxy<MoveOrderStoreType>({
  getMoveOrder(): Record<string, string> {
    try {
      const userId = userStore.user?.userId
      if (!userId) return {}
      return storage.getObject<Record<string, string>>(userId, MOVE_ORDER_STORAGE_KEY, {})
    } catch (error) {
      console.error('Error loading move order:', error)
      return {}
    }
  },

  recordMove(chatId: string) {
    try {
      const userId = userStore.user?.userId
      if (!userId) return
      const order = moveOrderStore.getMoveOrder()
      order[chatId] = new Date().toISOString()
      storage.put(userId, MOVE_ORDER_STORAGE_KEY, order)
    } catch (error) {
      console.error('Error recording move order:', error)
    }
  },

  clearMove(chatId: string) {
    try {
      const userId = userStore.user?.userId
      if (!userId) return
      const order = moveOrderStore.getMoveOrder()
      if (!(chatId in order)) return
      delete order[chatId]
      storage.put(userId, MOVE_ORDER_STORAGE_KEY, order)
    } catch (error) {
      console.error('Error clearing move order:', error)
    }
  },
})
