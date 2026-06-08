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

import { FC, useCallback, useMemo } from 'react'

import FileListItem from '@/components/form/FilesDropzone/components/FileListItem'

type FileListProps = {
  files: File[]
  onChange: (updatedFiles: File[]) => void
  uploadedFiles: string[]
  onUploadedFileRemove?: (name: string, itemIndex: number) => void
}
export const FileList: FC<FileListProps> = ({
  files,
  onChange,
  uploadedFiles,
  onUploadedFileRemove,
}) => {
  const removeFile = useCallback(
    (index: number) => {
      const updated = [...files]
      updated.splice(index, 1)
      onChange(updated)
    },
    [files, onChange]
  )

  const displayableFiles = useMemo(
    () => files.map((file, index) => ({ key: `[${index}] ${file.name}`, fileName: file.name })),
    [files]
  )

  const displayableUploadedFiles = useMemo(
    () =>
      uploadedFiles.map((uploadedFileName, index) => ({
        key: `[${index}] ${uploadedFileName}`,
        fileName: uploadedFileName,
      })),
    [uploadedFiles]
  )

  return (
    <>
      {Boolean(files.length || uploadedFiles.length) && (
        <div className="flex flex-col gap-1.5">
          {displayableUploadedFiles.map((displayableUploadedFile, index) => (
            <FileListItem
              key={displayableUploadedFile.key}
              fileName={displayableUploadedFile.fileName}
              onRemove={() => {
                onUploadedFileRemove?.(displayableUploadedFile.fileName, index)
              }}
            />
          ))}

          {displayableFiles.map((displayableFile, index) => (
            <FileListItem
              key={displayableFile.key}
              fileName={displayableFile.fileName}
              onRemove={() => {
                removeFile(index)
              }}
            />
          ))}
        </div>
      )}
    </>
  )
}
