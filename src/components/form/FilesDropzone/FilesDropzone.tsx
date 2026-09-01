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

import { FC, useEffect, useId, useMemo, useRef } from 'react'

import Announcement from '@/components/Announcement'
import { FileDropArea } from '@/components/form/FilesDropzone/components/FileDropArea'
import { FileDropzoneErrors } from '@/components/form/FilesDropzone/components/FileDropzoneErrors'
import { FileList } from '@/components/form/FilesDropzone/components/FileList'
import { MAX_FILES } from '@/components/form/FilesDropzone/constants'
import InfoBox from '@/components/form/InfoBox'
import { SUPPORTED_FILE_FORMATS_MESSAGE_BASE } from '@/constants/common'
import { useAnnouncementQueue } from '@/hooks/useAnnouncementQueue'

const MAX_FILE_SIZE_MB = 100
const MAX_IMAGE_FILE_SIZE_MB = 10

type Props = {
  name: string
  files: File[]
  onChange: (updatedFiles: File[]) => void
  errors?: Array<{ message: string } | undefined>
  showErrors?: boolean
  uploadedFiles?: string[]
  onUploadedFileRemove?: (name: string, itemIndex: number) => void
  maxFiles?: number
}

const FilesDropzone: FC<Props> = ({
  name,
  files,
  onChange,
  errors = [],
  showErrors = false,
  uploadedFiles = [],
  onUploadedFileRemove,
  maxFiles = MAX_FILES,
}) => {
  const reactId = useId()
  const errorId = `${name}-${reactId}-errors`

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
    [errors, files.length, showErrors]
  )

  const hasErrors = errorsMessages.length > 0

  const filesCount = files.length + uploadedFiles.length
  const previousFilesCount = useRef<number | null>(null)
  const { announcement, announce } = useAnnouncementQueue()

  useEffect(() => {
    if (previousFilesCount.current === null) {
      previousFilesCount.current = filesCount

      return
    }

    if (previousFilesCount.current !== filesCount) {
      previousFilesCount.current = filesCount
      announce(
        filesCount === 0 ? 'No files selected' : `${filesCount} of ${maxFiles} files selected`
      )
    }
  }, [announce, filesCount, maxFiles])

  return (
    <div className="flex flex-col gap-3">
      <FileDropArea
        name={name}
        files={files}
        uploadedFilesCount={uploadedFiles.length}
        onChange={onChange}
        errorId={hasErrors ? errorId : undefined}
        maxFiles={maxFiles}
      />
      <FileList
        files={files}
        onChange={onChange}
        uploadedFiles={uploadedFiles}
        onUploadedFileRemove={onUploadedFileRemove}
      />
      <InfoBox
        text={`${SUPPORTED_FILE_FORMATS_MESSAGE_BASE} Maximum files: ${maxFiles}. Max file size: ${MAX_FILE_SIZE_MB}Mb (images: ${MAX_IMAGE_FILE_SIZE_MB}Mb).`}
      />
      <FileDropzoneErrors errorId={errorId} messages={errorsMessages} />
      <Announcement announcement={announcement} />
    </div>
  )
}

export default FilesDropzone
