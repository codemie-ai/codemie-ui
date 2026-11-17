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

import { useState, useRef } from 'react'

import { filesStore } from '@/store/files'
import { registerLocalIconPreview } from '@/utils/iconUrl'

const MINIMUM_LOADER_DISPLAY_MS = 1000
const UPLOAD_TIMEOUT_MS = 60_000
const GENERIC_UPLOAD_ERROR =
  'Your logo cannot be uploaded. Make sure it meets the requirements and try again.'

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('The upload timed out. Try again.')), ms)
    promise.then(resolve, reject).finally(() => clearTimeout(timer))
  })

interface UseFileUploadProps {
  maxSizeMB: number
  onChange?: (value: string) => void
  uploadFile?: (file: File) => Promise<string>
  accept?: string
}

const EXTENSION_MIME_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
}

const mimeTypeOf = (file: File): string =>
  file.type.startsWith('image/')
    ? file.type
    : EXTENSION_MIME_TYPES[file.name.split('.').pop()?.toLowerCase() ?? ''] || file.type

const matchesAccept = (file: File, accept: string): boolean => {
  const types = accept.split(',').map((type) => type.trim())
  if (types.includes('image/*')) return file.type.startsWith('image/')
  return types.includes(mimeTypeOf(file))
}

const defaultUploadFile = async (file: File): Promise<string> => {
  const uploadResult = await filesStore.uploadFiles([file])
  return uploadResult.files && uploadResult.files.length > 0
    ? filesStore.getFileURL(uploadResult.files[0].file_url)
    : ''
}

const failureMessage = (err: unknown, countsAsIconUpload: boolean): string =>
  countsAsIconUpload && err instanceof Error && err.message ? err.message : GENERIC_UPLOAD_ERROR

export const useFileUpload = ({
  maxSizeMB,
  onChange,
  uploadFile,
  accept = 'image/*',
}: UseFileUploadProps) => {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadInFlightRef = useRef(false)

  const handleFileUpload = async (file: File) => {
    if (uploadInFlightRef.current) return
    if (!matchesAccept(file, accept)) {
      setUploadError(GENERIC_UPLOAD_ERROR)
      return
    }

    // Validate file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxSizeBytes) {
      const sizeLabel = maxSizeMB < 1 ? `${maxSizeMB * 1024}KB` : `${maxSizeMB}MB`
      setUploadError(`File size exceeds ${sizeLabel} limit`)
      return
    }

    setUploadError('')
    const countsAsIconUpload = Boolean(uploadFile)
    if (countsAsIconUpload) {
      uploadInFlightRef.current = true
      filesStore.pendingIconUploads += 1
    }
    setIsUploading(true)

    try {
      const request = (uploadFile ?? defaultUploadFile)(file)
      // Minimum delay for loader visibility
      const [fileUrl] = await Promise.all([
        countsAsIconUpload ? withTimeout(request, UPLOAD_TIMEOUT_MS) : request,
        new Promise((resolve) => {
          setTimeout(resolve, MINIMUM_LOADER_DISPLAY_MS)
        }),
      ])

      if (fileUrl) {
        if (countsAsIconUpload) await registerLocalIconPreview(fileUrl, file)
        onChange?.(fileUrl)
      } else if (countsAsIconUpload) {
        throw new Error('upload returned no file URL')
      }
    } catch (err) {
      setUploadError(failureMessage(err, countsAsIconUpload))
      console.error('Upload error:', err)
    } finally {
      if (countsAsIconUpload) {
        uploadInFlightRef.current = false
        filesStore.pendingIconUploads -= 1
      }
      setIsUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  return {
    isUploading,
    uploadError,
    setUploadError,
    fileInputRef,
    handleFileUpload,
    handleFileSelect,
    openFilePicker,
  }
}
