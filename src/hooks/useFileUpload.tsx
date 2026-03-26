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

import { type ChangeEvent, ComponentProps, Dispatch, SetStateAction, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'

import { userStore } from '@/store'
import { filesStore } from '@/store/files'
import { decodeFileName } from '@/utils/utils'

export type FileUploadErrorType = 'SIZE_EXCEEDED_ERROR' | 'LIMIT_EXCEEDED_ERROR' | 'UPLOAD_ERROR'

export interface FileUploadError {
  message: string
  fileNames: string[]
  type: FileUploadErrorType
}

export interface FileMetadata {
  fileName: string
  fileId?: string
  mimeType: string
  user: string
  isUploading: boolean
}

export interface UseFileUploadConfig {
  files: FileMetadata[]
  setFiles: Dispatch<SetStateAction<FileMetadata[]>>
  handleErrors?: (errors: FileUploadError[]) => void
  maxFiles?: number
  maxFileSize?: number
  maxFileSizeHumanized?: string
  maxFilesDisplayedInError?: number
}

export interface UseFileUploadReturn {
  hasActiveUploads: boolean
  errors: FileUploadError[]
  inputProps: ComponentProps<'input'>
  addFiles: (files: File[]) => void
  removeFile: (fileIndex: number) => void
  openFilePicker: () => void
}

export const createFileMetadata = (fileInput: File | string): FileMetadata => {
  if (fileInput instanceof File) {
    return {
      fileName: fileInput.name,
      mimeType: fileInput.type,
      user: userStore.user?.user_id ?? '',
      isUploading: false,
    }
  }

  const fileData = decodeFileName(fileInput)
  return {
    fileId: fileInput,
    fileName: fileData.originalFileName,
    user: fileData.user,
    mimeType: fileData.mimeType,
    isUploading: false,
  }
}

const createErrorMessage = (
  fileNames: string[],
  errorMessage: string,
  maxFilesDisplayedInError: number
) => {
  const displayedFiles = fileNames.slice(0, maxFilesDisplayedInError)
  const remainingFiles = Math.max(0, fileNames.length - maxFilesDisplayedInError)

  return `${errorMessage}. File${fileNames.length > 1 ? 's' : ''} ${displayedFiles.join(',')}${
    remainingFiles ? ` (+${remainingFiles})` : ''
  } ${fileNames.length > 1 ? 'were' : 'was'} not uploaded`
}

export const useFileUpload = ({
  files,
  setFiles,
  handleErrors,
  maxFiles = 10,
  maxFileSize = 104_857_600,
  maxFileSizeHumanized = '100MB',
  maxFilesDisplayedInError = 4,
}: UseFileUploadConfig): UseFileUploadReturn => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uploadFiles } = useSnapshot(filesStore)
  const [errors, setErrors] = useState<FileUploadError[]>([])

  const handleFilesUpload = async (newFiles: File[]) => {
    const newFilesMetadata = newFiles.map((f) => ({ ...createFileMetadata(f), isUploading: true }))
    setFiles((prev) => [...prev, ...newFilesMetadata])

    try {
      const { files: uploadedFileIds = [], failed_files } = await uploadFiles(newFiles)

      setFiles((prev) => {
        const existingFiles = prev.filter((f) => !f.isUploading)

        const uploadedFiles = uploadedFileIds.map((f) => ({
          ...createFileMetadata(f.file_url),
          isUploading: false,
        }))

        return [...existingFiles, ...uploadedFiles]
      })

      if (!failed_files) return
      const uploadErrors: Map<string, string[]> = new Map()

      Object.entries(failed_files).forEach(([fileName, errorMessage]) => {
        uploadErrors.set(errorMessage, [...(uploadErrors.get(errorMessage) ?? []), fileName])
      })

      const newErrors: FileUploadError[] = Array.from(uploadErrors.entries()).map(
        ([errorMessage, fileNames]) => ({
          fileNames,
          type: 'UPLOAD_ERROR' as const,
          message: createErrorMessage(fileNames, errorMessage, maxFilesDisplayedInError),
        })
      )

      setErrors((prev) => [...prev, ...newErrors])
      handleErrors?.(newErrors)
    } catch (e) {
      const error: FileUploadError = {
        fileNames: [],
        type: 'UPLOAD_ERROR',
        message: `Upload failed: ${(e as Error)?.message ?? 'An unexpected error occurred'}`,
      }
      setErrors((prev) => [...prev, error])
      handleErrors?.([error])
    }
  }

  const addFiles = (attachedFiles: File[]) => {
    if (attachedFiles.length === 0) return

    const validFiles: File[] = []
    const overSizeFiles: string[] = []
    const overLimitFiles: string[] = []
    const currentFilesCount = files.length

    attachedFiles.forEach((f) => {
      if (f.size > maxFileSize) {
        overSizeFiles.push(f.name)
        return
      }

      const totalFilesCount = currentFilesCount + validFiles.length
      if (totalFilesCount >= maxFiles) {
        overLimitFiles.push(f.name)
        return
      }

      validFiles.push(f)
    })

    const newErrors: FileUploadError[] = []

    if (overSizeFiles.length) {
      newErrors.push({
        fileNames: overSizeFiles,
        type: 'SIZE_EXCEEDED_ERROR',
        message: createErrorMessage(
          overSizeFiles,
          `Exceeded file size limit, max ${maxFileSizeHumanized} are allowed`,
          maxFilesDisplayedInError
        ),
      })
    }

    if (overLimitFiles.length) {
      newErrors.push({
        fileNames: overLimitFiles,
        type: 'LIMIT_EXCEEDED_ERROR',
        message: createErrorMessage(
          overLimitFiles,
          `Max ${maxFiles} files are allowed`,
          maxFilesDisplayedInError
        ),
      })
    }

    if (newErrors.length) {
      setErrors((prev) => [...prev, ...newErrors])
      handleErrors?.(newErrors)
    }
    if (validFiles.length) handleFilesUpload(validFiles)
  }

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const attachedFiles = Array.from(e.target.files ?? [])
    addFiles(attachedFiles)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  const removeFile = (fileIndex: number) => {
    let removedFileName = ''
    setFiles((prevFiles) => {
      const fileToRemove = prevFiles[fileIndex]
      if (fileToRemove) {
        removedFileName = fileToRemove.fileName
      }
      return prevFiles.filter((_, index) => index !== fileIndex)
    })

    if (removedFileName) {
      const removeFileNameFromError = (e: FileUploadError) => ({
        ...e,
        fileNames: e.fileNames.filter((f) => f !== removedFileName),
      })
      setErrors((prevErrors) => prevErrors.map(removeFileNameFromError))
    }
  }
  const hasActiveUploads = files.some((f) => f.isUploading)

  return {
    errors,
    hasActiveUploads,
    addFiles,
    removeFile,
    openFilePicker,
    inputProps: {
      ref: fileInputRef,
      type: 'file',
      multiple: true,
      className: 'hidden',
      onChange: handleFileInputChange,
      'aria-label': 'Select files to upload',
    },
  }
}
