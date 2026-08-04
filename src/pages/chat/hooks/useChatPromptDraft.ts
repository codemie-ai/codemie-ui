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

import { useCallback, useRef } from 'react'

import type { EditorValue } from '@/components/Editor/Editor'
import storage from '@/utils/storage'

export type PromptDraft = EditorValue

const DRAFT_KEY = 'chat-prompt-draft'
const DEFAULT_PROMPT: PromptDraft = { message: '', messageRaw: '' }

export const readPromptDraft = (userId: string, chatId: string): PromptDraft | null => {
  try {
    return storage.getObject<PromptDraft | null>(userId, `${DRAFT_KEY}-${chatId}`, null)
  } catch {
    return null
  }
}

export const useChatPromptDraft = (chatId: string | undefined, userId: string | undefined) => {
  const initialRef = useRef<PromptDraft | undefined>(undefined)
  if (initialRef.current === undefined) {
    initialRef.current =
      chatId && userId ? readPromptDraft(userId, chatId) ?? DEFAULT_PROMPT : DEFAULT_PROMPT
  }

  const saveDraft = useCallback(
    (draft: PromptDraft) => {
      if (!chatId || !userId) return
      if (draft.messageRaw === '') {
        storage.remove(userId, `${DRAFT_KEY}-${chatId}`)
      } else {
        storage.put(userId, `${DRAFT_KEY}-${chatId}`, draft)
      }
    },
    [chatId, userId]
  )

  const clearDraft = useCallback(() => {
    if (!chatId || !userId) return
    storage.remove(userId, `${DRAFT_KEY}-${chatId}`)
  }, [chatId, userId])

  return { initial: initialRef.current, saveDraft, clearDraft }
}
