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

import { proxy } from 'valtio'

export enum ChatOrganizeMode {
  UNIFIED = 'unified',
  FOCUSED = 'focused',
}

export enum ChatListDensity {
  DETAILED = 'detailed',
  COMPACT = 'compact',
}

export interface ChatViewSettings {
  organizeBy: ChatOrganizeMode
  density: ChatListDensity
  showRecentAssistants: boolean
  showWorkflowRunsSeparately: boolean
}

interface ChatViewSettingsStoreType extends ChatViewSettings {
  setOrganizeBy: (value: ChatOrganizeMode) => void
  setDensity: (value: ChatListDensity) => void
  setShowRecentAssistants: (value: boolean) => void
  setShowWorkflowRunsSeparately: (value: boolean) => void
  /** Session-only: assistant IDs hidden via "Remove from Recent Assistants". Not persisted. */
  hiddenRecentAssistantIds: string[]
  hideRecentAssistant: (id: string) => void
  /** Re-reads this user's persisted settings. Call once the current user is known (see App.tsx). */
  loadFromLocalStorage: () => void
}

const CHAT_VIEW_SETTINGS_STORAGE_KEY = 'chat-view-settings'

export const DEFAULT_CHAT_VIEW_SETTINGS: ChatViewSettings = {
  organizeBy: ChatOrganizeMode.UNIFIED,
  density: ChatListDensity.COMPACT,
  showRecentAssistants: true,
  showWorkflowRunsSeparately: false,
}

// Set externally (see App.tsx) once the current user is known. Kept as a plain module
// variable rather than importing the user store directly, to avoid a circular import:
// user.ts's own dependency chain (utils/helpers -> useHistoryStack -> useVueRouter ->
// router.tsx) transitively reaches back into the chat sidebar files that import this module.
let currentUserId = ''

export const setChatViewSettingsUserId = (userId: string) => {
  currentUserId = userId
}

const getStorageKey = (userId: string) => `${userId}_${CHAT_VIEW_SETTINGS_STORAGE_KEY}`

const readStoredSettings = (userId: string): ChatViewSettings => {
  if (typeof window === 'undefined') return DEFAULT_CHAT_VIEW_SETTINGS

  try {
    const serializedSettings = window.localStorage.getItem(getStorageKey(userId))
    if (!serializedSettings) return DEFAULT_CHAT_VIEW_SETTINGS

    const storedSettings = JSON.parse(serializedSettings) as Partial<ChatViewSettings> & {
      showPinnedChats?: boolean
    }

    return {
      organizeBy:
        storedSettings.organizeBy === ChatOrganizeMode.FOCUSED
          ? ChatOrganizeMode.FOCUSED
          : DEFAULT_CHAT_VIEW_SETTINGS.organizeBy,
      density:
        storedSettings.density === ChatListDensity.DETAILED ||
        storedSettings.density === ChatListDensity.COMPACT
          ? storedSettings.density
          : DEFAULT_CHAT_VIEW_SETTINGS.density,
      showRecentAssistants:
        typeof storedSettings.showRecentAssistants === 'boolean'
          ? storedSettings.showRecentAssistants
          : DEFAULT_CHAT_VIEW_SETTINGS.showRecentAssistants,
      showWorkflowRunsSeparately:
        typeof storedSettings.showWorkflowRunsSeparately === 'boolean'
          ? storedSettings.showWorkflowRunsSeparately
          : DEFAULT_CHAT_VIEW_SETTINGS.showWorkflowRunsSeparately,
    }
  } catch {
    return DEFAULT_CHAT_VIEW_SETTINGS
  }
}

const persistSettings = (userId: string, settings: ChatViewSettings) => {
  if (typeof window === 'undefined' || !userId) return

  try {
    window.localStorage.setItem(getStorageKey(userId), JSON.stringify(settings))
  } catch {
    // The selected settings still remain active in memory when storage is unavailable.
  }
}

const getSettingsSnapshot = (store: ChatViewSettingsStoreType): ChatViewSettings => ({
  organizeBy: store.organizeBy,
  density: store.density,
  showRecentAssistants: store.showRecentAssistants,
  showWorkflowRunsSeparately: store.showWorkflowRunsSeparately,
})

export const chatViewSettingsStore = proxy<ChatViewSettingsStoreType>({
  ...DEFAULT_CHAT_VIEW_SETTINGS,
  hiddenRecentAssistantIds: [],

  loadFromLocalStorage() {
    if (!currentUserId) return
    Object.assign(this, readStoredSettings(currentUserId))
  },

  setOrganizeBy(value) {
    this.organizeBy = value
    persistSettings(currentUserId, getSettingsSnapshot(this))
  },

  setDensity(value) {
    this.density = value
    persistSettings(currentUserId, getSettingsSnapshot(this))
  },

  setShowRecentAssistants(value) {
    this.showRecentAssistants = value
    persistSettings(currentUserId, getSettingsSnapshot(this))
  },

  setShowWorkflowRunsSeparately(value) {
    this.showWorkflowRunsSeparately = value
    persistSettings(currentUserId, getSettingsSnapshot(this))
  },

  hideRecentAssistant(id) {
    if (!this.hiddenRecentAssistantIds.includes(id)) {
      this.hiddenRecentAssistantIds.push(id)
    }
  },
})
