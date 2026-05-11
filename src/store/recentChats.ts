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

import { MAX_RECENT_CHATS, getRecentChatStorageKey } from '@/constants/chats'
import { RecentChat } from '@/types/chats'

import { userStore } from './user'

export interface RecentChatsStoreType {
  getRecentChats(): RecentChat[]
  addRecentChat(chat: Omit<RecentChat, 'openedAt'>): void
  updateRecentChatName(id: string, name: string): void
  removeRecentChat(id: string): void
  removeRecentChatsByFolder(folder: string): void
}

export const recentChatsStore = proxy<RecentChatsStoreType>({
  getRecentChats(): RecentChat[] {
    try {
      const userId = userStore.user?.userId
      if (!userId) return []

      const storageKey = getRecentChatStorageKey(userId)
      const stored = localStorage.getItem(storageKey)
      if (!stored) return []

      const chats: RecentChat[] = JSON.parse(stored)
      return chats.sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime())
    } catch (error) {
      console.error('Error loading recent chats:', error)
      return []
    }
  },

  addRecentChat(chat: Omit<RecentChat, 'openedAt'>) {
    try {
      const userId = userStore.user?.userId
      if (!userId) return

      const existingChats = recentChatsStore.getRecentChats()
      const filteredChats = existingChats.filter((c) => c.id !== chat.id)

      const updatedChats = [
        {
          ...chat,
          openedAt: new Date().toISOString(),
        },
        ...filteredChats,
      ].slice(0, MAX_RECENT_CHATS)

      const storageKey = getRecentChatStorageKey(userId)
      localStorage.setItem(storageKey, JSON.stringify(updatedChats))
    } catch (error) {
      console.error('Error adding recent chat:', error)
    }
  },

  updateRecentChatName(id: string, name: string) {
    try {
      const userId = userStore.user?.userId
      if (!userId) return

      const recentChats = recentChatsStore.getRecentChats()
      const recentChat = recentChats.find((c) => c.id === id)
      if (recentChat) {
        recentChat.name = name
        const storageKey = getRecentChatStorageKey(userId)
        localStorage.setItem(storageKey, JSON.stringify(recentChats))
      }
    } catch (error) {
      console.error('Error updating recent chat name:', error)
    }
  },

  removeRecentChat(id: string) {
    try {
      const userId = userStore.user?.userId
      if (!userId) return

      const recentChats = recentChatsStore.getRecentChats()
      const updatedChats = recentChats.filter((c) => c.id !== id)
      const storageKey = getRecentChatStorageKey(userId)
      localStorage.setItem(storageKey, JSON.stringify(updatedChats))
    } catch (error) {
      console.error('Error removing recent chat:', error)
    }
  },

  removeRecentChatsByFolder(folder: string) {
    try {
      const userId = userStore.user?.userId
      if (!userId) return

      const recentChats = recentChatsStore.getRecentChats()
      const updatedChats = recentChats.filter((c) => c.folder !== folder)
      const storageKey = getRecentChatStorageKey(userId)
      localStorage.setItem(storageKey, JSON.stringify(updatedChats))
    } catch (error) {
      console.error('Error removing recent chats by folder:', error)
    }
  },
})
