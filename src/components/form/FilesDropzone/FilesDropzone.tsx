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

import { FC, useCallback, useMemo, useRef } from 'react'

import XMarkSvg from '@/assets/icons/cross.svg?react'
import ImportSvg from '@/assets/icons/export.svg?react'
import FileSvg from '@/assets/icons/file.svg?react'
import DropzoneArea from '@/components/form/DropzoneArea'
import InfoBox from '@/components/form/InfoBox'
import { SUPPORTED_FILE_FORMATS_MESSAGE_BASE } from '@/constants/common'
import toaster from '@/utils/toaster'

const MAX_FILES = 10
const MAX_FILE_SIZE_MB = 100
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

type Props = {
  name: string
  files: File[]
  onChange: (updatedFiles: File[]) => void
  errors?: Array<{ message: string } | undefined>
  showErrors?: boolean
}

const FilesDropzone: FC<Props> = ({ name, files, onChange, errors = [], showErrors = false }) => {
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

      const remaining = MAX_FILES - files.length
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
    [files, onChange]
  )

  const removeFile = useCallback(
    (index: number) => {
      const updated = [...files]
      updated.splice(index, 1)
      onChange(updated)
    },
    [files, onChange]
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files ?? [])
    addFiles(newFiles)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const errorsMessages = useMemo(
    () =>
      Array.from(
        new Set(
          (errors ?? [])
            .filter(
              (e): e is { message: string } => !!e?.message && (showErrors || files.length > 0)
            )
            .map((e) => e.message)
        )
      ),
    [errors, files, showErrors]
  )

  const isAtLimit = files.length >= MAX_FILES

  return (
    <div className="flex flex-col gap-3">
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
            {files.length > 0 && (
              <span className="text-xs text-text-quaternary">
                {files.length} / {MAX_FILES} files selected
              </span>
            )}
          </>
        )}
      </DropzoneArea>

      {files.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {files.map((file, index) => (
            <div
              key={`${file.name}_${index}`}
              className="flex items-center justify-between gap-2 px-3 py-2 bg-surface-base-content rounded-lg border border-border-primary"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileSvg className="size-4 flex-shrink-0 text-text-quaternary" />
                <span className="text-sm text-text-primary truncate">{file.name}</span>
              </div>
              <XMarkSvg
                className="cursor-pointer size-4 flex-shrink-0 text-text-quaternary hover:text-text-primary"
                onClick={(e) => {
                  e.stopPropagation()
                  removeFile(index)
                }}
              />
            </div>
          ))}
        </div>
      )}

      <InfoBox text={`Max size: ${MAX_FILE_SIZE_MB}Mb. ${SUPPORTED_FILE_FORMATS_MESSAGE_BASE}`} />

      {errorsMessages.map((errorMessage) => (
        <div className="text-text-error text-sm" key={errorMessage} role="alert">
          {errorMessage}
        </div>
      ))}
    </div>
  )
}

export default FilesDropzone
