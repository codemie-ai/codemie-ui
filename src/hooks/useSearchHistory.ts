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

import { useState, useEffect } from 'react'
import { useSnapshot } from 'valtio'

import { userStore } from '@/store/user'
import { SearchHistoryItem } from '@/types/chats'

const MAX_HISTORY_ITEMS = 5

const useSearchHistory = () => {
  const { user } = useSnapshot(userStore)
  const [history, setHistory] = useState<SearchHistoryItem[]>([])

  const storageKey = `${user?.userId ?? 'guest'}_chat_search_history`

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setHistory(parsed)
        }
      }
    } catch (err) {
      console.error('Failed to load search history:', err)
      setHistory([])
    }
  }, [storageKey])

  const addToHistory = (query: string) => {
    if (!query || query.length < 3) return

    const newItem: SearchHistoryItem = {
      value: query.trim(),
      searchedAt: new Date().toISOString(),
    }

    setHistory((prev) => {
      const filtered = prev.filter((item) => item.value.toLowerCase() !== query.toLowerCase())

      const updated = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS)

      try {
        localStorage.setItem(storageKey, JSON.stringify(updated))
      } catch (err) {
        console.error('Failed to save search history:', err)
      }

      return updated
    })
  }

  const clearHistory = () => {
    setHistory([])
    try {
      localStorage.removeItem(storageKey)
    } catch (err) {
      console.error('Failed to clear search history:', err)
    }
  }

  return { history, addToHistory, clearHistory }
}

export default useSearchHistory
