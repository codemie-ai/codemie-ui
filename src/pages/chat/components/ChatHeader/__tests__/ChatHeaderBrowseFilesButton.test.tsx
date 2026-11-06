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

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent, { UserEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AgentWorkspaceFile, AgentWorkspaceFileContent } from '@/types/entity/agentWorkspace'
import { Conversation } from '@/types/entity/conversation'

import ChatHeaderBrowseFilesButton from '../ChatHeaderBrowseFilesButton'

vi.hoisted(() => vi.resetModules())

const { mockChatsStore, mockAgentWorkspaceStore } = vi.hoisted(() => ({
  mockChatsStore: {
    currentChat: {
      id: 'chat-123',
      name: 'Test Chat',
      isGroup: false,
      assistantData: [],
    } as unknown as Conversation,
  },
  mockAgentWorkspaceStore: {
    workspace: null,
    files: [] as AgentWorkspaceFile[],
    selectedFilePath: null as string | null,
    selectedFile: null as AgentWorkspaceFileContent | null,
    selectedFilePreviewUrl: null as string | null,
    currentConversationId: null,
    isWorkspaceLoading: false,
    isFilesLoading: false,
    isPreviewLoading: false,
    isDownloading: false,
    error: null,
    openForConversation: vi.fn(),
    listFiles: vi.fn(),
    selectFile: vi.fn(),
    downloadSelectedFile: vi.fn(),
    reset: vi.fn(),
  },
}))

vi.mock('valtio', () => ({
  proxy: (obj: any) => obj,
  useSnapshot: vi.fn((store) => store),
  subscribe: vi.fn(),
}))

vi.mock('@/store/chats', () => ({
  chatsStore: mockChatsStore,
}))

vi.mock('@/store/agentWorkspace', () => ({
  agentWorkspaceStore: mockAgentWorkspaceStore,
}))

vi.mock('@/components/Popup', () => ({
  default: ({ visible, header, headerContent, onHide, footerContent, children }: any) =>
    visible ? (
      <div>
        <div>{header}</div>
        {headerContent}
        <button type="button" aria-label="Close popup" onClick={onHide}>
          x
        </button>
        {children}
        {footerContent}
      </div>
    ) : null,
}))

vi.mock('@/components/markdown/Markdown', () => ({
  default: ({ content }: { content: string }) => (
    <div data-testid="markdown-mock">
      {content.startsWith('# ') ? <h1>{content.slice(2)}</h1> : content}
    </div>
  ),
}))

vi.mock('@/components/Spinner/Spinner', () => ({
  default: () => <div>Loading</div>,
}))

// Text and JSON render through CodeBlock; its <code> holds the shown text
const getCodeText = () => screen.getByTestId('workspace-preview').querySelector('code')?.textContent

describe('ChatHeaderBrowseFilesButton', () => {
  let user: UserEvent

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()

    mockChatsStore.currentChat = {
      id: 'chat-123',
      name: 'Test Chat',
      isGroup: false,
      assistantData: [],
    } as unknown as Conversation

    Object.assign(mockAgentWorkspaceStore, {
      workspace: null,
      files: [],
      selectedFilePath: null,
      selectedFile: null,
      selectedFilePreviewUrl: null,
      currentConversationId: null,
      isWorkspaceLoading: false,
      isFilesLoading: false,
      isPreviewLoading: false,
      isDownloading: false,
      error: null,
    })
  })

  it('renders browse files button', () => {
    render(<ChatHeaderBrowseFilesButton />)

    expect(screen.getByRole('button', { name: 'Browse files' })).toBeInTheDocument()
  })

  it('opens popup and loads workspace for current conversation', async () => {
    render(<ChatHeaderBrowseFilesButton />)

    await user.click(screen.getByRole('button', { name: 'Browse files' }))

    expect(screen.getByText('Agent workspace')).toBeInTheDocument()
    await waitFor(() => {
      expect(mockAgentWorkspaceStore.openForConversation).toHaveBeenCalledWith('chat-123')
    })
  })

  it('renders file list with vertical scrolling container', async () => {
    mockAgentWorkspaceStore.files = [
      {
        path: 'src/app.py',
        mime_type: 'text/x-python',
        checksum: 'hash',
        size: 123,
        version: 1,
        update_date: '2026-04-23T10:05:00',
      },
    ]

    render(<ChatHeaderBrowseFilesButton />)
    await user.click(screen.getByRole('button', { name: 'Browse files' }))

    expect(screen.getByTestId('workspace-file-list')).toHaveClass('overflow-y-auto')
    expect(screen.getByRole('button', { name: /src\/app.py/i })).toBeInTheDocument()
  })

  it('calls selectFile when a file is clicked', async () => {
    mockAgentWorkspaceStore.files = [
      {
        path: 'notes/todo.txt',
        mime_type: 'text/plain',
        checksum: 'hash',
        size: 123,
        version: 1,
        update_date: '2026-04-23T10:05:00',
      },
    ]

    render(<ChatHeaderBrowseFilesButton />)
    await user.click(screen.getByRole('button', { name: 'Browse files' }))
    await user.click(screen.getByRole('button', { name: /notes\/todo.txt/i }))

    expect(mockAgentWorkspaceStore.selectFile).toHaveBeenCalledWith('notes/todo.txt')
  })

  it('renders multiline preview for supported text files', async () => {
    mockAgentWorkspaceStore.selectedFilePath = 'scripts/example.py'
    mockAgentWorkspaceStore.selectedFile = {
      path: 'scripts/example.py',
      mime_type: 'text/x-python',
      checksum: 'hash',
      size: 100,
      version: 2,
      update_date: '2026-04-23T10:05:00',
      is_binary: false,
      content: 'def main():\n    return 1\n\nprint(main())',
    }

    render(<ChatHeaderBrowseFilesButton />)
    await user.click(screen.getByRole('button', { name: 'Browse files' }))

    expect(getCodeText()).toBe('def main():\n    return 1\n\nprint(main())')
    expect(screen.getByTestId('workspace-preview').querySelector('code')).toHaveClass('language-py')
  })

  it('renders image preview for supported image files', async () => {
    mockAgentWorkspaceStore.selectedFilePath = 'images/example.png'
    mockAgentWorkspaceStore.selectedFile = {
      path: 'images/example.png',
      mime_type: 'image/png',
      checksum: 'hash',
      size: 100,
      version: 2,
      update_date: '2026-04-23T10:05:00',
      is_binary: true,
      content:
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Zl2QAAAAASUVORK5CYII=',
    }

    render(<ChatHeaderBrowseFilesButton />)
    await user.click(screen.getByRole('button', { name: 'Browse files' }))

    expect(screen.getByTestId('workspace-preview-image')).toHaveAttribute(
      'src',
      expect.stringContaining('data:image/png;base64,')
    )
  })

  it('renders image preview when image extension is present but mime type is generic', async () => {
    mockAgentWorkspaceStore.selectedFilePath = 'images/example.png'
    mockAgentWorkspaceStore.selectedFile = {
      path: 'images/example.png',
      mime_type: 'application/octet-stream',
      checksum: 'hash',
      size: 100,
      version: 2,
      update_date: '2026-04-23T10:05:00',
      is_binary: true,
      content:
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwC\nAAAAC0lEQVR42mP8/x8AAwMCAO7Zl2QAAAAASUVORK5CYII=',
    }

    render(<ChatHeaderBrowseFilesButton />)
    await user.click(screen.getByRole('button', { name: 'Browse files' }))

    expect(screen.getByTestId('workspace-preview-image')).toHaveAttribute(
      'src',
      expect.stringContaining(
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Zl2QAAAAASUVORK5CYII='
      )
    )
  })

  it('renders image preview from blob url when inline content is missing', async () => {
    mockAgentWorkspaceStore.selectedFilePath = 'images/example.png'
    mockAgentWorkspaceStore.selectedFile = {
      path: 'images/example.png',
      mime_type: 'image/png',
      checksum: 'hash',
      size: 15260,
      version: 0,
      update_date: '2026-04-23T10:05:00',
      is_binary: true,
      content: null,
    }
    mockAgentWorkspaceStore.selectedFilePreviewUrl = 'blob:workspace-preview'

    render(<ChatHeaderBrowseFilesButton />)
    await user.click(screen.getByRole('button', { name: 'Browse files' }))

    expect(screen.getByTestId('workspace-preview-image')).toHaveAttribute(
      'src',
      'blob:workspace-preview'
    )
  })

  it('disables download until a file is selected', async () => {
    render(<ChatHeaderBrowseFilesButton />)
    await user.click(screen.getByRole('button', { name: 'Browse files' }))

    expect(screen.getByRole('button', { name: 'Download selected file' })).toBeDisabled()
  })

  it('downloads selected file when download button is clicked', async () => {
    mockAgentWorkspaceStore.selectedFilePath = 'notes/readme.txt'
    mockAgentWorkspaceStore.selectedFile = {
      path: 'notes/readme.txt',
      mime_type: 'text/plain',
      checksum: 'hash',
      size: 100,
      version: 1,
      update_date: '2026-04-23T10:05:00',
      is_binary: false,
      content: 'hello\nworld',
    }

    render(<ChatHeaderBrowseFilesButton />)
    await user.click(screen.getByRole('button', { name: 'Browse files' }))
    await user.click(screen.getByRole('button', { name: 'Download selected file' }))

    expect(mockAgentWorkspaceStore.downloadSelectedFile).toHaveBeenCalled()
  })

  it('resets store when closed from footer', async () => {
    render(<ChatHeaderBrowseFilesButton />)
    await user.click(screen.getByRole('button', { name: 'Browse files' }))
    await user.click(screen.getByRole('button', { name: 'Close' }))

    await waitFor(() => {
      expect(screen.queryByText('Agent workspace')).not.toBeInTheDocument()
    })
    expect(mockAgentWorkspaceStore.reset).toHaveBeenCalled()
  })

  it('resets store when closed from top-right icon', async () => {
    render(<ChatHeaderBrowseFilesButton />)
    await user.click(screen.getByRole('button', { name: 'Browse files' }))
    await user.click(screen.getByRole('button', { name: 'Close popup' }))

    await waitFor(() => {
      expect(screen.queryByText('Agent workspace')).not.toBeInTheDocument()
    })
    expect(mockAgentWorkspaceStore.reset).toHaveBeenCalled()
  })

  const selectTextFile = (path: string, content: string, mime = 'text/plain') => {
    mockAgentWorkspaceStore.selectedFilePath = path
    mockAgentWorkspaceStore.selectedFile = {
      path,
      mime_type: mime,
      checksum: 'hash',
      size: 100,
      version: 1,
      update_date: '2026-04-23T10:05:00',
      is_binary: false,
      content,
    }
  }

  const openBrowser = async () => {
    render(<ChatHeaderBrowseFilesButton />)
    await user.click(screen.getByRole('button', { name: 'Browse files' }))
  }

  it('renders markdown with front matter separately', async () => {
    selectTextFile('docs/a.md', '---\ntitle: x\n---\n# Heading')
    await openBrowser()

    expect(screen.getByTestId('workspace-preview-frontmatter').textContent).toBe('title: x')
    expect(screen.getByRole('heading', { name: 'Heading' })).toBeInTheDocument()
    expect(screen.getByTestId('workspace-preview-markdown')).toContainElement(
      screen.getByRole('heading', { name: 'Heading' })
    )
  })

  it('renders markdown without front matter block', async () => {
    selectTextFile('docs/a.md', '# Heading')
    await openBrowser()

    expect(screen.queryByTestId('workspace-preview-frontmatter')).not.toBeInTheDocument()
  })

  it('pretty prints json with two spaces', async () => {
    selectTextFile('a.json', '{"a":1}', 'application/json')
    await openBrowser()

    expect(getCodeText()).toBe('{\n  "a": 1\n}')
  })

  it('shows invalid json unchanged', async () => {
    selectTextFile('a.json', '{bad', 'application/json')
    await openBrowser()

    expect(getCodeText()).toBe('{bad')
  })

  it('previews yaml as text', async () => {
    selectTextFile('a.yaml', 'k: v')
    await openBrowser()

    expect(getCodeText()).toBe('k: v')
  })

  it('previews an empty text file', async () => {
    selectTextFile('empty.txt', '')
    await openBrowser()

    expect(getCodeText()).toBe('')
  })

  it('renders text in a code block with its own expand and no second download', async () => {
    selectTextFile('infra/Dockerfile', 'FROM node:20')
    await openBrowser()

    expect(screen.getByTestId('workspace-preview').querySelector('code')).toHaveClass(
      'language-dockerfile'
    )
    expect(screen.queryByTestId('workspace-preview-expand')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /download/i })).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Expand' }))

    expect(document.querySelector('span.font-mono')).toHaveTextContent('infra/Dockerfile')
    expect(screen.getAllByRole('button', { name: /download/i })).toHaveLength(1)
  })

  it('shows the updated hint for unsupported files', async () => {
    selectTextFile('a.bin', 'xx', 'application/octet-stream')
    await openBrowser()

    expect(screen.getByText(/Markdown/)).toHaveTextContent(/JSON/)
  })

  describe('expand toggle', () => {
    it('is absent with no selection', async () => {
      await openBrowser()
      expect(screen.queryByTestId('workspace-preview-expand')).not.toBeInTheDocument()
    })

    it('is absent for an unknown file', async () => {
      selectTextFile('a.bin', 'xx', 'application/octet-stream')
      await openBrowser()
      expect(screen.queryByTestId('workspace-preview-expand')).not.toBeInTheDocument()
    })

    it('is present for markdown', async () => {
      selectTextFile('a.md', '# T')
      await openBrowser()
      expect(screen.getByTestId('workspace-preview-expand')).toBeInTheDocument()
    })

    it.each([
      ['a.json', '{}'],
      ['a.py', 'x = 1'],
    ])('is absent for %s, which expands through its code block', async (path, content) => {
      selectTextFile(path, content)
      await openBrowser()
      expect(screen.queryByTestId('workspace-preview-expand')).not.toBeInTheDocument()
    })

    it('is present for an image', async () => {
      mockAgentWorkspaceStore.selectedFilePath = 'i.png'
      mockAgentWorkspaceStore.selectedFile = {
        path: 'i.png',
        mime_type: 'image/png',
        checksum: 'h',
        size: 1,
        version: 1,
        update_date: '2026-04-23T10:05:00',
        is_binary: true,
        content: 'AAAA',
      }
      await openBrowser()
      expect(screen.getByTestId('workspace-preview-expand')).toBeInTheDocument()
    })

    it('opens markdown in the shared expanded popup and collapses back', async () => {
      selectTextFile('docs/a.md', '# T')
      await openBrowser()

      await user.click(screen.getByTestId('workspace-preview-expand'))

      expect(document.querySelector('span.font-mono')).toHaveTextContent('docs/a.md')
      expect(screen.getAllByTestId('workspace-preview-markdown')).toHaveLength(2)

      await user.click(screen.getByRole('button', { name: 'Collapse' }))

      expect(screen.getAllByTestId('workspace-preview-markdown')).toHaveLength(1)
      expect(screen.getByText('Agent workspace')).toBeInTheDocument()
      expect(mockAgentWorkspaceStore.reset).not.toHaveBeenCalled()
    })

    it('opens an image in the shared expanded popup', async () => {
      mockAgentWorkspaceStore.selectedFilePath = 'i.png'
      mockAgentWorkspaceStore.selectedFile = {
        path: 'i.png',
        mime_type: 'image/png',
        checksum: 'h',
        size: 1,
        version: 1,
        update_date: '2026-04-23T10:05:00',
        is_binary: true,
        content: 'AAAA',
      }
      await openBrowser()

      await user.click(screen.getByTestId('workspace-preview-expand'))

      expect(screen.getAllByTestId('workspace-preview-image')).toHaveLength(2)
    })

    it('Esc reaches document handlers when collapsed', async () => {
      selectTextFile('a.md', '# T')
      await openBrowser()
      const spy = vi.fn()
      document.addEventListener('keydown', spy)

      fireEvent(
        document.body,
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
      )

      document.removeEventListener('keydown', spy)
      expect(spy).toHaveBeenCalledTimes(1)
    })
  })
})
