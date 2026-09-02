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

import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ChatPrompt from '../ChatPrompt'

const mockAddFiles = vi.fn()
const mockUseFilePaste = vi.fn()
const mockUseAssistantFeatures = vi.fn()
const mockUseChatContext = vi.fn()
const mockEditorProps = vi.hoisted(() => ({ current: null as any }))

vi.hoisted(() => vi.resetModules())

const { mockChatsStore, mockUseChatPromptDraft } = vi.hoisted(() => ({
  mockChatsStore: {
    currentChat: {
      id: 'chat-1',
      history: [[{ inProgress: false }]],
      isInterrupted: false,
      isWorkflow: false,
      assistantIds: ['assistant-1'],
      assistantData: [{ id: 'assistant-1', name: 'A1', type: 'codemie' }],
    },
  },
  mockUseChatPromptDraft: {
    initial: { message: '', messageRaw: '' },
    saveDraft: vi.fn(),
    clearDraft: vi.fn(),
  },
}))

vi.mock('valtio', () => ({
  proxy: <T extends object>(obj: T): T => obj,
  useSnapshot: vi.fn((store) => store),
  subscribe: vi.fn(),
  ref: vi.fn((v) => v),
}))

vi.mock('@/store/chats', () => ({ chatsStore: mockChatsStore }))
vi.mock('@/store/chatGeneration', () => ({
  chatGenerationStore: {
    stopChatGeneration: vi.fn(),
    createChatGeneration: vi.fn(),
    resumeWorkflowExecution: vi.fn(),
  },
}))
vi.mock('@/store', () => ({
  assistantsStore: {
    defaultAssistant: { id: 'assistant-1' },
  },
  userStore: { userData: { stt_support: false }, user: { userId: 'user-1' } },
}))

vi.mock('../../../hooks/useChatPromptDraft', () => ({
  useChatPromptDraft: () => mockUseChatPromptDraft,
}))
vi.mock('@/hooks/useTheme', () => ({ useTheme: () => ({ isDark: false }) }))
vi.mock('@/hooks/useFileUpload', () => ({
  useFileUpload: ({
    files,
    setFiles,
  }: {
    files: Array<{ fileName: string; fileId: string }>
    setFiles: (files: Array<{ fileName: string; fileId: string }>) => void
  }) => ({
    addFiles: (incoming: File[]) => {
      mockAddFiles(incoming)
      setFiles([
        ...files,
        ...incoming.map((f) => ({
          fileName: f.name,
          fileId: `id-${f.name}`,
        })),
      ])
    },
    hasActiveUploads: false,
    inputProps: {},
    removeFile: vi.fn(),
    openFilePicker: vi.fn(),
  }),
}))
vi.mock('../../../hooks/useChatContext', () => ({
  useChatContext: () => mockUseChatContext(),
}))
vi.mock('../../../hooks/useFilePaste', () => ({
  useFilePaste: (args: { onFilePaste: (files: File[]) => void }) => {
    mockUseFilePaste(args)
    return { setupPasteHandler: vi.fn() }
  },
}))
vi.mock('../../../hooks/useAssistantFeatures', () => ({
  useAssistantFeatures: (...args: unknown[]) => mockUseAssistantFeatures(...args),
}))

vi.mock('@/components/Editor/Editor', async () => {
  const { forwardRef, useImperativeHandle } = await import('react')
  return {
    default: forwardRef((props: any, ref) => {
      mockEditorProps.current = props
      useImperativeHandle(ref, () => ({ focus: vi.fn() }))
      return <div data-testid="editor" />
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
vi.mock('../ChatPromptFileUpload', () => ({
  default: ({ files }: { files: Array<{ fileName: string }> }) => (
    <div>
      <button type="button" aria-label="Attach files" />
      <span data-testid="file-count">{files.length}</span>
    </div>
  ),
}))
vi.mock('../ChatPromptLlmSelector', () => ({ default: () => null }))
vi.mock('../ChatPromptSkillsButton', () => ({ default: () => null }))
vi.mock('../ChatPromptVoiceRecorder', () => ({ default: () => null }))
vi.mock('../DynamicToolsSettings', () => ({ default: () => null }))
vi.mock('../../ChatControls', () => ({ default: () => null }))
vi.mock('@/assets/icons/stop.svg?react', () => ({ default: () => null }))
vi.mock('@/assets/icons/play.svg?react', () => ({ default: () => null }))
vi.mock('@/utils/toaster', () => ({ default: { error: vi.fn(), info: vi.fn() } }))

const ALL_FEATURES = {
  fileAttachment: true,
  modelSelector: true,
  skills: true,
  tools: true,
  usageDetails: true,
  workspace: true,
  clone: true,
}

describe('ChatPrompt file attachment gating', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAssistantFeatures.mockReturnValue(ALL_FEATURES)
    mockUseChatContext.mockReturnValue({
      selectedSkills: [],
      isSharedPage: false,
      dynamicToolsConfig: null,
      canAttachFiles: true,
    })
    mockChatsStore.currentChat.history = [[{ inProgress: false }]]
  })

  it('shows Attach files when fileAttachment is enabled', () => {
    render(<ChatPrompt />)
    expect(screen.getByLabelText('Attach files')).toBeInTheDocument()
    expect(mockUseFilePaste).toHaveBeenCalledWith(
      expect.objectContaining({ onFilePaste: expect.any(Function) })
    )
    const pasteArg = mockUseFilePaste.mock.calls[0][0]
    pasteArg.onFilePaste([new File(['x'], 'a.txt')])
    expect(mockAddFiles).toHaveBeenCalled()
    mockAddFiles.mockClear()
    mockEditorProps.current.onAddFiles([new File(['x'], 'b.txt')])
    expect(mockAddFiles).toHaveBeenCalled()
  })

  it('hides Attach files and blocks paste/drop when fileAttachment is disabled', () => {
    mockUseChatContext.mockReturnValue({
      selectedSkills: [],
      isSharedPage: false,
      dynamicToolsConfig: null,
      canAttachFiles: false,
    })

    render(<ChatPrompt />)

    expect(screen.queryByLabelText('Attach files')).not.toBeInTheDocument()
    expect(mockUseFilePaste).toHaveBeenCalledWith(
      expect.objectContaining({
        onFilePaste: expect.any(Function),
      })
    )
    const pasteArg = mockUseFilePaste.mock.calls[0][0]
    expect(pasteArg.onFilePaste).not.toBe(mockAddFiles)
    pasteArg.onFilePaste([new File(['x'], 'a.txt')])
    expect(mockAddFiles).not.toHaveBeenCalled()
    expect(mockEditorProps.current.onAddFiles).not.toBe(mockAddFiles)
    mockEditorProps.current.onAddFiles([new File(['x'], 'b.txt')])
    expect(mockAddFiles).not.toHaveBeenCalled()
  })

  it('clears queued files when fileAttachment becomes disabled', () => {
    const { rerender } = render(<ChatPrompt />)

    act(() => {
      mockEditorProps.current.onAddFiles([new File(['x'], 'a.txt')])
    })
    expect(screen.getByTestId('file-count')).toHaveTextContent('1')

    mockUseChatContext.mockReturnValue({
      selectedSkills: [],
      isSharedPage: false,
      dynamicToolsConfig: null,
      canAttachFiles: false,
    })
    rerender(<ChatPrompt />)

    mockUseChatContext.mockReturnValue({
      selectedSkills: [],
      isSharedPage: false,
      dynamicToolsConfig: null,
      canAttachFiles: true,
    })
    rerender(<ChatPrompt />)

    expect(screen.getByTestId('file-count')).toHaveTextContent('0')
  })
})
