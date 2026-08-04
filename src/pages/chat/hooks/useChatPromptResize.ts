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

import { useCallback, useEffect, useRef } from 'react'
import { useDefaultLayout } from 'react-resizable-panels'
import { useSnapshot } from 'valtio'

import { userStore } from '@/store'

const STORAGE_KEY = 'chat-prompt-height'
const DEBOUNCE_MS = 300

export const useChatPromptResize = () => {
  const { user } = useSnapshot(userStore)
  const userId = user?.userId ?? 'default'

  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: `${STORAGE_KEY}-${userId}`,
    storage: localStorage,
  })

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const debouncedOnLayoutChanged = useCallback(
    (layout: Parameters<typeof onLayoutChanged>[0]) => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
      debounceTimer.current = setTimeout(() => {
        onLayoutChanged(layout)
      }, DEBOUNCE_MS)
    },
    [onLayoutChanged]
  )

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [])

  return { defaultLayout, debouncedOnLayoutChanged, userId }
}
