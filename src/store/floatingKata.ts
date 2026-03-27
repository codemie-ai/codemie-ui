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

const FLOATING_KATA_STATE_KEY = 'codemie-floating-kata-state'

interface FloatingKataState {
  kataId: string | null
  kataTitle: string
  markdownContent: string
  currentStepIndex: number
  isVisible: boolean
  isCollapsed: boolean
  position: { x: number; y: number }
}

interface FloatingKataStoreType extends FloatingKataState {
  minimizeKataSteps: (kataId: string, title: string, content: string, stepIndex: number) => void
  restoreToPage: () => void
  toggleCollapsed: () => void
  updatePosition: (x: number, y: number) => void
  updateStepIndex: (index: number) => void
  closeFloatingKata: () => void
  isKataMinimized: (kataId: string) => boolean
  loadFromLocalStorage: () => void
  saveToLocalStorage: () => void
}

const getDefaultPosition = (): { x: number; y: number } => {
  if (typeof window === 'undefined') {
    return { x: 0, y: 0 }
  }
  return {
    x: Math.max(0, window.innerWidth - 520),
    y: Math.max(0, window.innerHeight - 670),
  }
}

export const floatingKataStore = proxy<FloatingKataStoreType>({
  kataId: null,
  kataTitle: '',
  markdownContent: '',
  currentStepIndex: 0,
  isVisible: false,
  isCollapsed: false,
  position: getDefaultPosition(),

  minimizeKataSteps(kataId: string, title: string, content: string, stepIndex: number) {
    floatingKataStore.kataId = kataId
    floatingKataStore.kataTitle = title
    floatingKataStore.markdownContent = content
    floatingKataStore.currentStepIndex = stepIndex
    floatingKataStore.isVisible = true
    floatingKataStore.isCollapsed = false
    floatingKataStore.position = getDefaultPosition()

    floatingKataStore.saveToLocalStorage()
  },

  restoreToPage() {
    floatingKataStore.isVisible = false
    floatingKataStore.saveToLocalStorage()
  },

  toggleCollapsed() {
    floatingKataStore.isCollapsed = !floatingKataStore.isCollapsed
    floatingKataStore.saveToLocalStorage()
  },

  updatePosition(x: number, y: number) {
    floatingKataStore.position = { x, y }
    floatingKataStore.saveToLocalStorage()
  },

  updateStepIndex(index: number) {
    floatingKataStore.currentStepIndex = index
    floatingKataStore.saveToLocalStorage()
  },

  closeFloatingKata() {
    floatingKataStore.kataId = null
    floatingKataStore.kataTitle = ''
    floatingKataStore.markdownContent = ''
    floatingKataStore.currentStepIndex = 0
    floatingKataStore.isVisible = false
    floatingKataStore.isCollapsed = false
    floatingKataStore.position = getDefaultPosition()

    floatingKataStore.saveToLocalStorage()
  },

  isKataMinimized(kataId: string) {
    return floatingKataStore.isVisible && floatingKataStore.kataId === kataId
  },

  loadFromLocalStorage() {
    try {
      const userId = userStore.user?.userId ?? ''
      if (!userId) {
        return
      }

      const defaultState: FloatingKataState = {
        kataId: null,
        kataTitle: '',
        markdownContent: '',
        currentStepIndex: 0,
        isVisible: false,
        isCollapsed: false,
        position: getDefaultPosition(),
      }

      // Try to migrate old localStorage data (without userId) to new format
      const oldStorageKey = FLOATING_KATA_STATE_KEY
      const oldData = localStorage.getItem(oldStorageKey)
      if (oldData) {
        try {
          const parsedOldData = JSON.parse(oldData) as FloatingKataState
          // Save to new user-scoped storage
          storage.put(userId, FLOATING_KATA_STATE_KEY, parsedOldData)
          // Remove old key
          localStorage.removeItem(oldStorageKey)
        } catch (migrationError) {
          console.error('Error migrating old floating kata state:', migrationError)
        }
      }

      const parsed = storage.getObject<FloatingKataState>(
        userId,
        FLOATING_KATA_STATE_KEY,
        defaultState
      )

      floatingKataStore.kataId = parsed.kataId ?? null
      floatingKataStore.kataTitle = parsed.kataTitle ?? ''
      floatingKataStore.markdownContent = parsed.markdownContent ?? ''
      floatingKataStore.currentStepIndex = parsed.currentStepIndex ?? 0
      floatingKataStore.isVisible = parsed.isVisible ?? false
      floatingKataStore.isCollapsed = parsed.isCollapsed ?? false
      floatingKataStore.position = parsed.position ?? getDefaultPosition()
    } catch (error) {
      console.error('Error loading floating kata state from localStorage:', error)
    }
  },

  saveToLocalStorage() {
    try {
      const userId = userStore.user?.userId ?? ''
      if (!userId) {
        return
      }

      const state: FloatingKataState = {
        kataId: floatingKataStore.kataId,
        kataTitle: floatingKataStore.kataTitle,
        markdownContent: floatingKataStore.markdownContent,
        currentStepIndex: floatingKataStore.currentStepIndex,
        isVisible: floatingKataStore.isVisible,
        isCollapsed: floatingKataStore.isCollapsed,
        position: floatingKataStore.position,
      }

      storage.put(userId, FLOATING_KATA_STATE_KEY, state)
    } catch (error) {
      console.error('Error saving floating kata state to localStorage:', error)
    }
  },
})
