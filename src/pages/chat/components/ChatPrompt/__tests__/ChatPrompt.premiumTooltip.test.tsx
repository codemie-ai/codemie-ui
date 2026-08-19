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
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PREMIUM_MODEL_TOOLTIP } from '@/components/PremiumModelBadge'
import type { ModelOption } from '@/types/entity/configuration'

import ChatPrompt from '../ChatPrompt'

vi.hoisted(() => vi.resetModules())

const { mockChatsStore, mockAppInfoStore, mockChatGenerationStore } = vi.hoisted(() => ({
  mockChatsStore: {
    currentChat: {
      id: 'chat-1',
      llmModel: 'gpt-5',
      history: [],
      isInterrupted: false,
      isWorkflow: false,
      assistantIds: ['assistant-1'],
    } as any,
    updateChat: vi.fn(),
  },
  mockAppInfoStore: {
    llmModels: [] as ModelOption[],
    getLLMModels: vi.fn(),
  },
  mockChatGenerationStore: {
    stopChatGeneration: vi.fn(),
    createChatGeneration: vi.fn(),
    resumeWorkflowExecution: vi.fn(),
  },
}))

vi.mock('valtio', () => ({
  proxy: <T extends object>(obj: T): T => obj,
  useSnapshot: vi.fn((store) => store),
  subscribe: vi.fn(),
  ref: vi.fn((v) => v),
}))

vi.mock('@/store/chats', () => ({ chatsStore: mockChatsStore }))
vi.mock('@/store/appInfo', () => ({ appInfoStore: mockAppInfoStore }))
vi.mock('@/store/premiumModelTip', async (importOriginal) => importOriginal())
vi.mock('@/store/chatGeneration', () => ({ chatGenerationStore: mockChatGenerationStore }))
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
  useChatContext: () => ({ selectedSkills: [], isSharedPage: false, dynamicToolsConfig: null }),
}))
vi.mock('../../../hooks/useFilePaste', () => ({
  useFilePaste: () => ({ setupPasteHandler: vi.fn() }),
}))
vi.mock('@/components/Editor/Editor', async () => {
  const { forwardRef, useImperativeHandle } = await import('react')
  return {
    default: forwardRef<{ focus: () => void }, object>((_props, ref) => {
      useImperativeHandle(ref, () => ({ focus: vi.fn() }))
      return null
    }),
  }
})
vi.mock('@/components/Editor/quillModules', () => ({
  getAnyMentions: vi.fn(() => []),
  getAssistantMentions: vi.fn(() => []),
  getMessageTextWithMentions: vi.fn((_, msg) => msg),
}))
vi.mock('@/components/markdown/Markdown.utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/markdown/Markdown.utils')>()
  return { ...actual, sanitizeMessage: vi.fn((m) => m) }
})
// ChatPromptLlmSelector is deliberately NOT mocked — it renders the premium
// badge, which is the anchor that must remain the only one.
// The panel is closed in the state under test, so it renders nothing — the
// option rows carry their own premium badges and would otherwise be counted.
vi.mock('primereact/overlaypanel', () => ({
  OverlayPanel: React.forwardRef<any, any>((_props, ref) => {
    React.useImperativeHandle(ref, () => ({ toggle: vi.fn(), show: vi.fn(), hide: vi.fn() }))
    return null
  }),
}))
vi.mock('../ChatPromptFileUpload', () => ({ default: () => null }))
vi.mock('../ChatPromptSkillsButton', () => ({ default: () => null }))
vi.mock('../ChatPromptStarters', () => ({ default: () => null }))
vi.mock('../ChatPromptVoiceRecorder', () => ({ default: () => null }))
vi.mock('../DynamicToolsSettings', () => ({ default: () => null }))
vi.mock('../../ChatControls', () => ({ default: () => null }))
vi.mock('@/assets/icons/stop.svg?react', () => ({ default: () => null }))
vi.mock('@/assets/icons/play.svg?react', () => ({ default: () => null }))

const PREMIUM: ModelOption = { value: 'gpt-5', label: 'GPT-5', isDefault: false, isPremium: true }
const STANDARD: ModelOption = { value: 'gpt-4o', label: 'GPT-4o', isDefault: true }

beforeEach(() => {
  mockAppInfoStore.llmModels = [PREMIUM, STANDARD]
  mockChatsStore.currentChat = {
    id: 'chat-1',
    llmModel: 'gpt-5',
    history: [],
    isInterrupted: false,
    isWorkflow: false,
    assistantIds: ['assistant-1'],
  }
  Element.prototype.scrollIntoView = vi.fn()
})

describe('ChatPrompt premium tooltip anchors', () => {
  it('leaves exactly one premium hover anchor in the prompt subtree', () => {
    const { container } = render(<ChatPrompt />)

    const anchors = container.querySelectorAll(`[data-tooltip-content="${PREMIUM_MODEL_TOOLTIP}"]`)

    expect(anchors).toHaveLength(1)
  })

  it('does not put a tooltip on the prompt container itself', () => {
    const { container } = render(<ChatPrompt />)

    const promptContainer = container.querySelector('[data-onboarding="chat-input"]')

    expect(promptContainer).not.toBeNull()
    expect(promptContainer?.hasAttribute('data-tooltip-content')).toBe(false)
    expect(promptContainer?.hasAttribute('data-tooltip-id')).toBe(false)
  })

  it('keeps the premium ring on the prompt container', () => {
    const { container } = render(<ChatPrompt />)

    const promptContainer = container.querySelector('[data-onboarding="chat-input"]')

    expect(promptContainer?.className).toContain('ring-aborted-primary/60')
  })

  it('leaves no premium anchor at all for a standard model', () => {
    mockChatsStore.currentChat = { ...mockChatsStore.currentChat, llmModel: 'gpt-4o' }

    const { container } = render(<ChatPrompt />)

    expect(
      container.querySelectorAll(`[data-tooltip-content="${PREMIUM_MODEL_TOOLTIP}"]`)
    ).toHaveLength(0)
  })
})
