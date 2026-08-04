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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { chatsStore } from '@/store/chats'
import api from '@/utils/api'

// setupTests.unit.ts already mocks @/utils/api globally. We spy on the shared
// mock object so downloadFileStream can be intercepted without triggering real
// HTTP requests, while sanitizeFileName remains the real implementation.

describe('chatsStore export methods', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    chatsStore.currentChat = null
  })

  describe('exportChat', () => {
    it('passes sanitized chat name + format as fileName', async () => {
      const downloadSpy = vi.spyOn(api, 'downloadFileStream').mockResolvedValue(true)
      chatsStore.currentChat = {
        id: 'chat-123',
        name: 'Sprint 39 Release Notes',
        assistantIds: [],
        assistantData: [],
        history: [],
      }

      await chatsStore.exportChat('docx')

      expect(downloadSpy).toHaveBeenCalledWith(
        'v1/conversations/chat-123/export?export_format=docx',
        undefined,
        'Sprint 39 Release Notes.docx'
      )
    })

    it('uses fallback name when chat.name is undefined', async () => {
      const downloadSpy = vi.spyOn(api, 'downloadFileStream').mockResolvedValue(true)
      chatsStore.currentChat = {
        id: 'chat-456',
        name: undefined,
        assistantIds: [],
        assistantData: [],
        history: [],
      }

      await chatsStore.exportChat('pdf')

      expect(downloadSpy).toHaveBeenCalledWith(
        'v1/conversations/chat-456/export?export_format=pdf',
        undefined,
        'chat_export.pdf'
      )
    })
  })

  describe('exportConversationAIMessage', () => {
    it('passes a generic derived filename', async () => {
      const downloadSpy = vi.spyOn(api, 'downloadFileStream').mockResolvedValue(true)

      await chatsStore.exportConversationAIMessage('chat-789', 0, 2, 'pptx')

      expect(downloadSpy).toHaveBeenCalledWith(
        'v1/conversations/chat-789/history/0/2/export?export_format=pptx',
        undefined,
        'message_export.pptx'
      )
    })
  })
})
