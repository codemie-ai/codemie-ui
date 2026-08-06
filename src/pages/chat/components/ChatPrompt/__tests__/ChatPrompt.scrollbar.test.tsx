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

import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import ChatPrompt from '../ChatPrompt'

vi.mock('valtio', () => ({
  proxy: <T extends object>(obj: T): T => obj,
  useSnapshot: vi.fn((store) => store),
  subscribe: vi.fn(),
  ref: vi.fn((v) => v),
}))

vi.mock('@/store/chats', () => ({
  chatsStore: {
    currentChat: {
      id: 'chat-1',
      history: [[{ inProgress: false }]],
      isInterrupted: false,
      isWorkflow: false,
      assistantIds: ['assistant-1'],
    },
  },
}))

vi.mock('@/store/chatGeneration', () => ({
  chatGenerationStore: { createChatGeneration: vi.fn() },
}))

vi.mock('@/store', () => ({
  assistantsStore: { defaultAssistant: { id: 'assistant-1' } },
  userStore: { userData: { stt_support: false }, user: { userId: 'user-1' } },
}))

vi.mock('../../../hooks/useChatPromptDraft', () => ({
  useChatPromptDraft: () => ({
    initial: { message: '', messageRaw: '' },
    saveDraft: vi.fn(),
    clearDraft: vi.fn(),
  }),
}))

vi.mock('@/hooks/useTheme', () => ({ useTheme: () => ({ isDark: false }) }))

vi.mock('@/hooks/useFileUpload', () => ({
  useFileUpload: () => ({ addFiles: vi.fn(), hasActiveUploads: false }),
}))

vi.mock('../../../hooks/useChatContext', () => ({
  useChatContext: () => ({
    selectedSkills: [],
    isSharedPage: false,
    dynamicToolsConfig: null,
  }),
}))

vi.mock('../../../hooks/useFilePaste', () => ({
  useFilePaste: () => ({ setupPasteHandler: vi.fn() }),
}))

vi.mock('../../../hooks/useAssistantFeatures', () => ({
  useAssistantFeatures: () => ({
    fileAttachment: false,
    modelSelector: false,
    tools: false,
    skills: false,
  }),
}))

vi.mock('../ChatPromptStarters', () => ({ default: () => null }))
vi.mock('../ChatPromptVoiceRecorder', () => ({ default: () => null }))
vi.mock('../ChatPromptFileUpload', () => ({ default: () => null }))
vi.mock('../ChatPromptLlmSelector', () => ({ default: () => null }))
vi.mock('../ChatPromptSkillsButton', () => ({ default: () => null }))
vi.mock('../DynamicToolsSettings', () => ({ default: () => null }))
vi.mock('../../../components/ChatControls', () => ({ default: () => null }))

describe('ChatPrompt scrollbar classes in resizable mode', () => {
  it('does not apply scrollbar-gutter to any overflow-y-auto container when resizable=true', () => {
    const { container } = render(<ChatPrompt resizable />)
    const scrollDivs = container.querySelectorAll('.overflow-y-auto')

    scrollDivs.forEach((div) => {
      expect(div.classList.contains('scrollbar-gutter')).toBe(false)
    })
  })
})
