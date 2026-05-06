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

const mockGet = vi.fn()
const mockPost = vi.fn()
const mockDownloadFileStream = vi.fn()

vi.mock('@/utils/api', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    downloadFileStream: (...args: unknown[]) => mockDownloadFileStream(...args),
  },
}))

vi.mock('@/utils/toaster', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}))

describe('agentWorkspaceStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    URL.createObjectURL = vi.fn().mockReturnValue('blob:workspace-preview')
    URL.revokeObjectURL = vi.fn()
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    const { agentWorkspaceStore } = await import('@/store/agentWorkspace')
    agentWorkspaceStore.reset()
  })

  it('opens existing workspace and lists files', async () => {
    mockGet
      .mockResolvedValueOnce({
        json: async () => ({
          id: 'workspace-1',
          conversation_id: 'chat-123',
          user_id: 'user-1',
          name: 'Chat workspace',
          status: 'active',
          date: '2026-04-23T10:00:00',
          update_date: '2026-04-23T10:00:00',
        }),
      })
      .mockResolvedValueOnce({
        json: async () => [
          {
            path: 'README.txt',
            mime_type: 'text/plain',
            checksum: 'hash',
            size: 12,
            version: 1,
            update_date: '2026-04-23T10:05:00',
          },
        ],
      })

    const { agentWorkspaceStore } = await import('@/store/agentWorkspace')
    await agentWorkspaceStore.openForConversation('chat-123')

    expect(mockGet).toHaveBeenNthCalledWith(1, 'v1/workspaces/conversations/chat-123', {
      skipErrorHandling: true,
    })
    expect(mockGet).toHaveBeenNthCalledWith(2, 'v1/workspaces/workspace-1/files', {
      params: { recursive: true },
      skipErrorHandling: true,
    })
    expect(agentWorkspaceStore.workspace?.id).toBe('workspace-1')
    expect(agentWorkspaceStore.files).toHaveLength(1)
  })

  it('creates workspace when conversation lookup misses', async () => {
    mockGet
      .mockRejectedValueOnce({ status: 400, parsedError: { message: 'Workspace not found' } })
      .mockResolvedValueOnce({
        json: async () => [],
      })
    mockPost.mockResolvedValueOnce({
      json: async () => ({
        id: 'workspace-created',
        conversation_id: 'chat-123',
        user_id: 'user-1',
        name: null,
        status: 'active',
        date: '2026-04-23T10:00:00',
        update_date: '2026-04-23T10:00:00',
      }),
    })

    const { agentWorkspaceStore } = await import('@/store/agentWorkspace')
    await agentWorkspaceStore.openForConversation('chat-123')

    expect(mockPost).toHaveBeenCalledWith(
      'v1/workspaces',
      {
        conversation_id: 'chat-123',
        name: undefined,
      },
      { skipErrorHandling: true }
    )
    expect(agentWorkspaceStore.workspace?.id).toBe('workspace-created')
  })

  it('loads selected file preview', async () => {
    mockGet.mockResolvedValueOnce({
      json: async () => ({
        path: 'notes/todo.txt',
        mime_type: 'text/plain',
        checksum: 'hash',
        size: 10,
        version: 1,
        is_binary: false,
        content: 'hello\nworld',
      }),
    })

    const { agentWorkspaceStore } = await import('@/store/agentWorkspace')
    agentWorkspaceStore.workspace = {
      id: 'workspace-1',
      conversation_id: 'chat-123',
      user_id: 'user-1',
      name: null,
      status: 'active',
      date: '2026-04-23T10:00:00',
      update_date: '2026-04-23T10:00:00',
    }

    await agentWorkspaceStore.selectFile('notes/todo.txt')

    expect(mockGet).toHaveBeenCalledWith('v1/workspaces/workspace-1/files/content', {
      params: { file_path: 'notes/todo.txt' },
      skipErrorHandling: true,
    })
    expect(agentWorkspaceStore.selectedFile?.content).toBe('hello\nworld')
    expect(agentWorkspaceStore.selectedFilePreviewUrl).toBeNull()
  })

  it('loads image preview blob url when binary image content is absent', async () => {
    mockGet
      .mockResolvedValueOnce({
        json: async () => ({
          path: 'images/example.png',
          mime_type: 'image/png',
          checksum: 'hash',
          size: 15260,
          version: 0,
          is_binary: true,
          content: null,
        }),
      })
      .mockResolvedValueOnce({
        blob: async () => new Blob(['png-bytes'], { type: 'image/png' }),
      })

    const { agentWorkspaceStore } = await import('@/store/agentWorkspace')
    agentWorkspaceStore.workspace = {
      id: 'workspace-1',
      conversation_id: 'chat-123',
      user_id: 'user-1',
      name: null,
      status: 'active',
      date: '2026-04-23T10:00:00',
      update_date: '2026-04-23T10:00:00',
    }

    await agentWorkspaceStore.selectFile('images/example.png')

    expect(mockGet).toHaveBeenNthCalledWith(1, 'v1/workspaces/workspace-1/files/content', {
      params: { file_path: 'images/example.png' },
      skipErrorHandling: true,
    })
    expect(mockGet).toHaveBeenNthCalledWith(2, 'v1/workspaces/workspace-1/files/download', {
      params: { file_path: 'images/example.png' },
      skipErrorHandling: true,
    })
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    expect(agentWorkspaceStore.selectedFilePreviewUrl).toBe('blob:workspace-preview')
  })

  it('downloads selected file through the download endpoint', async () => {
    mockDownloadFileStream.mockResolvedValue(true)

    const { agentWorkspaceStore } = await import('@/store/agentWorkspace')
    agentWorkspaceStore.workspace = {
      id: 'workspace-1',
      conversation_id: 'chat-123',
      user_id: 'user-1',
      name: null,
      status: 'active',
      date: '2026-04-23T10:00:00',
      update_date: '2026-04-23T10:00:00',
    }
    agentWorkspaceStore.selectedFilePath = 'scripts/example.py'

    const result = await agentWorkspaceStore.downloadSelectedFile()

    expect(result).toBe(true)
    expect(mockDownloadFileStream).toHaveBeenCalledWith(
      'v1/workspaces/workspace-1/files/download?file_path=scripts%2Fexample.py'
    )
  })
})
