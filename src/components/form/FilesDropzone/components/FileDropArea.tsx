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

import { FC, useCallback, useRef } from 'react'

import ImportSvg from '@/assets/icons/export.svg?react'
import DropzoneArea from '@/components/form/DropzoneArea'
import { MAX_FILE_SIZE_BYTES } from '@/components/form/FilesDropzone/constants'
import toaster from '@/utils/toaster'

const DEFAULT_LABEL = 'Files'
const DEFAULT_INPUT_LABEL = 'Select files to upload'
const DROP_AREA_LABEL = 'Upload or drop files'

const toMegabytes = (bytes: number) => Math.round((bytes / (1024 * 1024)) * 10) / 10

type FileDropArea = {
  name: string
  uploadedFilesCount: number
  files: File[]
  onChange: (updatedFiles: File[]) => void
  errorId?: string
  maxFiles: number
  accept?: string
  disabled?: boolean
  label?: string
  /** Largest accepted file; bigger files are reported and skipped. */
  maxFileSizeBytes?: number
}
export const FileDropArea: FC<FileDropArea> = ({
  name,
  files,
  uploadedFilesCount,
  onChange,
  errorId,
  maxFiles,
  accept,
  disabled = false,
  label,
  maxFileSizeBytes = MAX_FILE_SIZE_BYTES,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  // A consumer's own label also names the drop target, so several dropzones stay distinguishable.
  const customLabel = label && label !== DEFAULT_LABEL ? label : undefined
  const addFiles = useCallback(
    (newFiles: File[]) => {
      if (disabled) return
      const oversized = newFiles.filter((f) => f.size > maxFileSizeBytes)
      const validFiles = newFiles.filter((f) => f.size <= maxFileSizeBytes)

      if (oversized.length > 0) {
        toaster.error(
          `${oversized.length} file${
            oversized.length > 1 ? 's exceed' : ' exceeds'
          } the ${toMegabytes(maxFileSizeBytes)}MB size limit and ${
            oversized.length > 1 ? 'were' : 'was'
          } not added`
        )
      }

      const remaining = maxFiles - files.length - uploadedFilesCount
      const skipped = validFiles.slice(remaining)
      const filesToAdd = validFiles.slice(0, remaining)

      if (skipped.length > 0) {
        toaster.error(
          `Max ${maxFiles} files allowed. ${skipped.length} file${
            skipped.length > 1 ? 's were' : ' was'
          } not added`
        )
      }

      if (filesToAdd.length > 0) {
        onChange([...files, ...filesToAdd])
      }
    },
    [files, uploadedFilesCount, onChange, maxFiles, disabled, maxFileSizeBytes]
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files ?? [])
    addFiles(newFiles)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }
  const filesNumber = files.length + uploadedFilesCount
  const isAtLimit = filesNumber >= maxFiles

  return (
    <>
      <label htmlFor={name} className="text-xs text-text-quaternary">
        {label ?? DEFAULT_LABEL}
      </label>
      <input
        ref={fileInputRef}
        id={name}
        type="file"
        multiple={maxFiles !== 1}
        accept={accept}
        disabled={disabled}
        className="hidden"
        onChange={handleInputChange}
        aria-label={customLabel ?? DEFAULT_INPUT_LABEL}
        aria-describedby={errorId}
        aria-invalid={errorId ? true : undefined}
      />
      <DropzoneArea
        onFilesDrop={addFiles}
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || isAtLimit}
        ariaLabel={customLabel ? `${DROP_AREA_LABEL}: ${customLabel}` : DROP_AREA_LABEL}
      >
        {(isDragging) => (
          <>
            <ImportSvg className="w-4.5 h-4.5" />
            <span className="text-text-primary text-sm underline">
              {isDragging ? 'Drop files here' : DROP_AREA_LABEL}
            </span>
            {(files.length > 0 || Boolean(uploadedFilesCount)) && (
              <span className="text-xs text-text-quaternary">
                {files.length + uploadedFilesCount} / {maxFiles} files selected
              </span>
            )}
          </>
        )}
      </DropzoneArea>
    </>
  )
}
