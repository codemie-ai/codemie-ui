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

import { ChangeEvent, FC, useCallback, useMemo } from 'react'

import XMarkSvg from '@/assets/icons/cross.svg?react'
import PlusSvg from '@/assets/icons/plus.svg?react'
import Button from '@/components/Button'
import InfoBox from '@/components/form/InfoBox'
import { SUPPORTED_FILE_FORMATS_MESSAGE_BASE } from '@/constants/common'

import FileInput from '../File'

const MAX_FILES = 10

type Props = {
  name: string
  properties?: Record<string, any>[]
  files: File[] | any[]
  onChange: (updatedFiles: File[]) => void
  errors?: Array<{ message: string } | undefined>
  showErrors?: boolean
}

const FilesListInput: FC<Props> = ({
  name,
  properties = [],
  files,
  onChange,
  errors = [],
  showErrors = false,
}) => {
  const addFile = useCallback(() => {
    if (files.length >= MAX_FILES) return
    onChange([...files, {}])
  }, [files, onChange])

  const removeFile = useCallback(
    (index: number) => {
      const updated = [...files]
      updated.splice(index, 1)
      onChange(updated)
    },
    [files, onChange]
  )

  const setFile = useCallback(
    (index: number, e: ChangeEvent<HTMLInputElement>) => {
      const updated = [...files]
      updated[index] = e.target.files?.[0]
      onChange(updated)
    },
    [files, onChange]
  )

  const errorsMessages = useMemo(
    () =>
      Array.from(
        new Set(
          errors
            ?.filter((e, index) => {
              if (!e?.message) return false
              return showErrors || files[index] instanceof File
            })
            .map((e) => e?.message ?? '') ?? []
        )
      ),
    [errors, files, showErrors]
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col">
        <label htmlFor={name} className="text-xs text-text-quaternary mb-2">
          Files
        </label>

        {files.map((file, index) => {
          const hasFile = file instanceof File
          const shouldShowError = !!(
            errors?.length &&
            errors[index]?.message &&
            (showErrors || hasFile)
          )

          return (
            <div
              key={file?.name ? `${file.name}_${index}` : index}
              className="flex gap-2 items-center mb-2"
            >
              <FileInput
                {...properties[index]}
                name={file?.name}
                onChange={(e) => setFile(index, e)}
                error={shouldShowError}
              />

              <XMarkSvg className="cursor-pointer size-4" onClick={() => removeFile(index)} />
            </div>
          )
        })}

        <div className="mt-1 mb-2">
          <Button variant="primary" onClick={addFile} disabled={files.length >= MAX_FILES}>
            <PlusSvg className="w-5 h-5" />
            Add file
          </Button>
        </div>

        <InfoBox text={`Max size: 100Mb. ${SUPPORTED_FILE_FORMATS_MESSAGE_BASE}`} />

        {errorsMessages.map((errorMessage) => (
          <div className="text-text-error text-sm" key={errorMessage} role="alert">
            {errorMessage}
          </div>
        ))}
      </div>
    </div>
  )
}

export default FilesListInput
