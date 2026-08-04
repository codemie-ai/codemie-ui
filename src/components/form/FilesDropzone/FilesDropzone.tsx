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

import { FC, useId, useMemo } from 'react'

import { FileDropArea } from '@/components/form/FilesDropzone/components/FileDropArea'
import { FileDropzoneErrors } from '@/components/form/FilesDropzone/components/FileDropzoneErrors'
import { FileList } from '@/components/form/FilesDropzone/components/FileList'
import InfoBox from '@/components/form/InfoBox'
import { SUPPORTED_FILE_FORMATS_MESSAGE_BASE } from '@/constants/common'

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
}

const FilesDropzone: FC<Props> = ({
  name,
  files,
  onChange,
  errors = [],
  showErrors = false,
  uploadedFiles = [],
  onUploadedFileRemove,
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

  return (
    <div className="flex flex-col gap-3">
      <FileDropArea
        name={name}
        files={files}
        uploadedFilesCount={uploadedFiles.length}
        onChange={onChange}
        errorId={hasErrors ? errorId : undefined}
      />
      <FileList
        files={files}
        onChange={onChange}
        uploadedFiles={uploadedFiles}
        onUploadedFileRemove={onUploadedFileRemove}
      />
      <InfoBox
        text={`${SUPPORTED_FILE_FORMATS_MESSAGE_BASE} Max file size: ${MAX_FILE_SIZE_MB}Mb (images: ${MAX_IMAGE_FILE_SIZE_MB}Mb).`}
      />
      <FileDropzoneErrors errorId={errorId} messages={errorsMessages} />
    </div>
  )
}

export default FilesDropzone
