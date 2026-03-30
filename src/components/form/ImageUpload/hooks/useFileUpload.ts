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

const MINIMUM_LOADER_DISPLAY_MS = 1000

interface UseFileUploadProps {
  maxSizeMB: number
  onChange?: (value: string) => void
}

export const useFileUpload = ({ maxSizeMB, onChange }: UseFileUploadProps) => {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError(
        'Your logo cannot be uploaded. Make sure it meets the requirements and try again.'
      )
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
    setIsUploading(true)

    try {
      // Minimum delay for loader visibility
      const [uploadResult] = await Promise.all([
        filesStore.uploadFiles([file]),
        new Promise((resolve) => {
          setTimeout(resolve, MINIMUM_LOADER_DISPLAY_MS)
        }),
      ])

      if (uploadResult.files && uploadResult.files.length > 0) {
        const fileUrl = filesStore.getFileURL(uploadResult.files[0].file_url)
        onChange?.(fileUrl)
      }
    } catch (err) {
      setUploadError(
        'Your logo cannot be uploaded. Make sure it meets the requirements and try again.'
      )
      console.error('Upload error:', err)
    } finally {
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
