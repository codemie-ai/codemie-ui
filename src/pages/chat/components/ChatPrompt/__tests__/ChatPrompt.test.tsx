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

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import ChatPrompt from '../ChatPrompt'

vi.hoisted(() => vi.resetModules())

const { mockChatGenerationStore, mockChatsStore } = vi.hoisted(() => ({
  mockChatGenerationStore: {
    stopChatGeneration: vi.fn(),
    createChatGeneration: vi.fn(),
    resumeWorkflowExecution: vi.fn(),
  },
  mockChatsStore: {
    currentChat: {
      id: 'chat-1',
      history: [[{ inProgress: true }]],
      isInterrupted: false,
      isWorkflow: false,
      assistantIds: ['assistant-1'],
    },
  },
}))

vi.mock('valtio', () => ({
  proxy: <T extends object>(obj: T): T => obj,
  useSnapshot: vi.fn((store) => store),
  subscribe: vi.fn(),
  ref: vi.fn((v) => v),
}))

vi.mock('@/store/chats', () => ({ chatsStore: mockChatsStore }))
vi.mock('@/store/chatGeneration', () => ({ chatGenerationStore: mockChatGenerationStore }))
vi.mock('@/store', () => ({
  assistantsStore: { defaultAssistant: { id: 'assistant-1' } },
  userStore: { userData: { stt_support: false } },
}))
vi.mock('@/hooks/useTheme', () => ({ useTheme: () => ({ isDark: false }) }))
vi.mock('@/hooks/useFileUpload', () => ({
  useFileUpload: () => ({ addFiles: vi.fn(), hasActiveUploads: false }),
}))
vi.mock('../../../hooks/useChatContext', () => ({
  useChatContext: () => ({ selectedSkills: [], isSharedPage: false, dynamicToolsConfig: null }),
}))
vi.mock('../../../hooks/useFilePaste', () => ({
  useFilePaste: () => ({ setupPasteHandler: vi.fn() }),
}))
vi.mock('@/components/Editor/Editor', () => ({ default: () => null }))
vi.mock('@/components/Editor/quillModules', () => ({
  getAnyMentions: vi.fn(() => []),
  getAssistantMentions: vi.fn(() => []),
  getMessageTextWithMentions: vi.fn((_, msg) => msg),
}))
vi.mock('@/components/markdown/Markdown.utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/markdown/Markdown.utils')>()
  return { ...actual, sanitizeMessage: vi.fn((m) => m) }
})
vi.mock('../ChatPromptFileUpload', () => ({ default: () => null }))
vi.mock('../ChatPromptLlmSelector', () => ({ default: () => null }))
vi.mock('../ChatPromptSkillsButton', () => ({ default: () => null }))
vi.mock('../ChatPromptStarters', () => ({ default: () => null }))
vi.mock('../ChatPromptVoiceRecorder', () => ({ default: () => null }))
vi.mock('../DynamicToolsSettings', () => ({ default: () => null }))
vi.mock('../../ChatControls', () => ({ default: () => null }))
vi.mock('@/assets/icons/stop.svg?react', () => ({ default: () => null }))
vi.mock('@/assets/icons/play.svg?react', () => ({ default: () => null }))

describe('ChatPrompt', () => {
  describe('handleStopGeneration', () => {
    it('calls stopChatGeneration on the live chatGenerationStore proxy (not snapshot) when stop button is clicked', () => {
      render(<ChatPrompt />)

      fireEvent.click(screen.getByRole('button', { name: /stop generation/i }))

      expect(mockChatGenerationStore.stopChatGeneration).toHaveBeenCalledOnce()
      expect(mockChatGenerationStore.stopChatGeneration).toHaveBeenCalledWith('chat-1')
    })
  })
})
