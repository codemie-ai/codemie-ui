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

import api from '@/utils/api'
import { decodeFileName } from '@/utils/helpers'
import toaster from '@/utils/toaster'
import { hash } from '@/utils/utils'

const UPLOAD_ERROR = 'An error occured while uploading file:'

const mermaidCache = {
  cache: new Map<string | number, string>(),
  maxSize: 100,

  get(key: string | number) {
    return this.cache.get(key)
  },

  set(key: string | number, value: string) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value!
      this.cache.delete(firstKey)
    }
    this.cache.set(key, value)
  },

  has(key: string | number) {
    return this.cache.has(key)
  },

  clear() {
    this.cache.clear()
  },
}

interface FilesStoreType {
  uploadFiles: (
    files: File[]
  ) => Promise<{ files: { file_url: string }[]; failed_files: Record<string, string> | null }>
  downloadFile: (fileId: string) => Promise<void>
  getFileURL: (fileId: string) => string
  getMermaidFile: (code: string) => Promise<string>
  clearMermaidCache: () => void
}

export const filesStore = proxy<FilesStoreType>({
  async uploadFiles(files) {
    const body = new FormData()

    files.forEach((file) => {
      body.append('files', file)
    })

    try {
      const response = await api.postMultipart('v1/files/bulk', body)
      return response.json()
    } catch (error: any) {
      if (error.json) {
        const body = await error.json()
        const errorMsg = `${UPLOAD_ERROR} ${body.detail || body.message}`
        toaster.error(errorMsg)

        throw new Error(errorMsg)
      } else {
        const errorMsg = `${UPLOAD_ERROR} ${error.message || 'Unknown error'}`
        toaster.error(errorMsg)

        throw new Error(errorMsg)
      }
    }
  },

  async downloadFile(fileUrl) {
    const [_mimeType, _user, originalFileName] = decodeFileName(fileUrl)
    const response = await api.get(`v1/files/${fileUrl}`)
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = originalFileName
    a.click()
    window.URL.revokeObjectURL(url)
  },

  async getMermaidFile(code) {
    const cacheKey = hash(code)
    if (mermaidCache.has(cacheKey)) {
      return mermaidCache.get(cacheKey)!
    }
    const response = await api.post(
      'v1/files/diagram/mermaid',
      { code, theme: 'dark' },
      { skipErrorHandling: true }
    )
    const { file_url } = await response.json()
    const svgResponse = await fetch(file_url)
    const svgText = await svgResponse.text()
    mermaidCache.set(cacheKey, svgText)
    return svgText
  },

  clearMermaidCache() {
    mermaidCache.clear()
  },

  getFileURL(fileName: string): string {
    return `${api.BASE_URL}/v1/files/${fileName}`
  },
})
