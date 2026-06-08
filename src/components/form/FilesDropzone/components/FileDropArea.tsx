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
import {
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  MAX_FILES,
} from '@/components/form/FilesDropzone/constants'
import toaster from '@/utils/toaster'

type FileDropArea = {
  name: string
  uploadedFilesCount: number
  files: File[]
  onChange: (updatedFiles: File[]) => void
}
export const FileDropArea: FC<FileDropArea> = ({ name, files, uploadedFilesCount, onChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const addFiles = useCallback(
    (newFiles: File[]) => {
      const oversized = newFiles.filter((f) => f.size > MAX_FILE_SIZE_BYTES)
      const validFiles = newFiles.filter((f) => f.size <= MAX_FILE_SIZE_BYTES)

      if (oversized.length > 0) {
        toaster.error(
          `${oversized.length} file${
            oversized.length > 1 ? 's exceed' : ' exceeds'
          } the ${MAX_FILE_SIZE_MB}MB size limit and ${
            oversized.length > 1 ? 'were' : 'was'
          } not added`
        )
      }

      const remaining = MAX_FILES - files.length - uploadedFilesCount
      const skipped = validFiles.slice(remaining)
      const filesToAdd = validFiles.slice(0, remaining)

      if (skipped.length > 0) {
        toaster.error(
          `Max ${MAX_FILES} files allowed. ${skipped.length} file${
            skipped.length > 1 ? 's were' : ' was'
          } not added`
        )
      }

      if (filesToAdd.length > 0) {
        onChange([...files, ...filesToAdd])
      }
    },
    [files, uploadedFilesCount, onChange]
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files ?? [])
    addFiles(newFiles)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }
  const filesNumber = files.length + uploadedFilesCount
  const isAtLimit = filesNumber >= MAX_FILES

  return (
    <>
      <label htmlFor={name} className="text-xs text-text-quaternary">
        Files
      </label>
      <input
        ref={fileInputRef}
        id={name}
        type="file"
        multiple
        className="hidden"
        onChange={handleInputChange}
        aria-label="Select files to upload"
      />
      <DropzoneArea
        onFilesDrop={addFiles}
        onClick={() => fileInputRef.current?.click()}
        disabled={isAtLimit}
      >
        {(isDragging) => (
          <>
            <ImportSvg className="w-4.5 h-4.5" />
            <span className="text-text-primary text-sm underline">
              {isDragging ? 'Drop files here' : 'Upload or drop files'}
            </span>
            {(files.length > 0 || Boolean(uploadedFilesCount)) && (
              <span className="text-xs text-text-quaternary">
                {files.length + uploadedFilesCount} / {MAX_FILES} files selected
              </span>
            )}
          </>
        )}
      </DropzoneArea>
    </>
  )
}
