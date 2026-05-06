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

import { proxy } from 'valtio'

import { AgentWorkspace, AgentWorkspaceFile, AgentWorkspaceFileContent } from '@/types/entity'
import api from '@/utils/api'
import toaster from '@/utils/toaster'

interface AgentWorkspaceStoreType {
  workspace: AgentWorkspace | null
  files: AgentWorkspaceFile[]
  selectedFilePath: string | null
  selectedFile: AgentWorkspaceFileContent | null
  selectedFilePreviewUrl: string | null
  currentConversationId: string | null
  isWorkspaceLoading: boolean
  isFilesLoading: boolean
  isPreviewLoading: boolean
  isDownloading: boolean
  error: string | null
  openForConversation: (conversationId: string, name?: string) => Promise<void>
  listFiles: (workspaceId: string) => Promise<AgentWorkspaceFile[]>
  selectFile: (filePath: string) => Promise<void>
  downloadSelectedFile: () => Promise<boolean>
  reset: () => void
}

const isWorkspaceLookupMiss = (error: any) => {
  return error?.status === 400 || error?.status === 404
}

const getErrorMessage = (error: any, fallback: string) => {
  return error?.parsedError?.message ?? error?.message ?? fallback
}

const IMAGE_PREVIEWABLE_EXTENSIONS = [
  'apng',
  'avif',
  'bmp',
  'gif',
  'ico',
  'jpeg',
  'jpg',
  'png',
  'svg',
  'webp',
] as const

const getFileExtension = (path: string) => {
  return path.split('.').pop()?.toLowerCase() ?? ''
}

const isPreviewableImage = (filePath: string, mimeType?: string | null) => {
  return (
    mimeType?.toLowerCase().startsWith('image/') ??
    IMAGE_PREVIEWABLE_EXTENSIONS.includes(
      getFileExtension(filePath) as (typeof IMAGE_PREVIEWABLE_EXTENSIONS)[number]
    )
  )
}

const revokePreviewUrl = (previewUrl: string | null) => {
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl)
  }
}

export const agentWorkspaceStore = proxy<AgentWorkspaceStoreType>({
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

  async openForConversation(conversationId: string, name?: string) {
    this.isWorkspaceLoading = true
    this.error = null
    this.currentConversationId = conversationId
    this.selectedFilePath = null
    this.selectedFile = null
    revokePreviewUrl(this.selectedFilePreviewUrl)
    this.selectedFilePreviewUrl = null

    try {
      let workspace: AgentWorkspace

      try {
        const response = await api.get(`v1/workspaces/conversations/${conversationId}`, {
          skipErrorHandling: true,
        })
        workspace = (await response.json()) as AgentWorkspace
      } catch (error: any) {
        if (!isWorkspaceLookupMiss(error)) {
          throw error
        }

        const response = await api.post(
          'v1/workspaces',
          {
            conversation_id: conversationId,
            name,
          },
          { skipErrorHandling: true }
        )
        workspace = (await response.json()) as AgentWorkspace
      }

      this.workspace = workspace
      await this.listFiles(workspace.id)
    } catch (error: any) {
      const message = getErrorMessage(error, 'Failed to open agent workspace')
      this.error = message
      toaster.error(message)
      throw error
    } finally {
      this.isWorkspaceLoading = false
    }
  },

  async listFiles(workspaceId: string) {
    this.isFilesLoading = true
    this.error = null

    try {
      const response = await api.get(`v1/workspaces/${workspaceId}/files`, {
        params: {
          recursive: true,
        },
        skipErrorHandling: true,
      })
      const files = (await response.json()) as AgentWorkspaceFile[]
      this.files = files
      return files
    } catch (error: any) {
      const message = getErrorMessage(error, 'Failed to load workspace files')
      this.error = message
      toaster.error(message)
      throw error
    } finally {
      this.isFilesLoading = false
    }
  },

  async selectFile(filePath: string) {
    if (!this.workspace) return

    this.selectedFilePath = filePath
    this.selectedFile = null
    revokePreviewUrl(this.selectedFilePreviewUrl)
    this.selectedFilePreviewUrl = null
    this.isPreviewLoading = true
    this.error = null

    try {
      const response = await api.get(`v1/workspaces/${this.workspace.id}/files/content`, {
        params: {
          file_path: filePath,
        },
        skipErrorHandling: true,
      })
      this.selectedFile = (await response.json()) as AgentWorkspaceFileContent

      if (
        !this.selectedFile?.content &&
        isPreviewableImage(filePath, this.selectedFile?.mime_type)
      ) {
        const previewResponse = await api.get(`v1/workspaces/${this.workspace.id}/files/download`, {
          params: {
            file_path: filePath,
          },
          skipErrorHandling: true,
        })
        const previewBlob = await previewResponse.blob()
        this.selectedFilePreviewUrl = URL.createObjectURL(previewBlob)
      }
    } catch (error: any) {
      const message = getErrorMessage(error, 'Failed to load file preview')
      this.error = message
      toaster.error(message)
      throw error
    } finally {
      this.isPreviewLoading = false
    }
  },

  async downloadSelectedFile() {
    if (!this.workspace || !this.selectedFilePath) return false

    this.isDownloading = true

    try {
      return await api.downloadFileStream(
        `v1/workspaces/${this.workspace.id}/files/download?file_path=${encodeURIComponent(
          this.selectedFilePath
        )}`
      )
    } finally {
      this.isDownloading = false
    }
  },

  reset() {
    revokePreviewUrl(this.selectedFilePreviewUrl)
    this.workspace = null
    this.files = []
    this.selectedFilePath = null
    this.selectedFile = null
    this.selectedFilePreviewUrl = null
    this.currentConversationId = null
    this.isWorkspaceLoading = false
    this.isFilesLoading = false
    this.isPreviewLoading = false
    this.isDownloading = false
    this.error = null
  },
})
