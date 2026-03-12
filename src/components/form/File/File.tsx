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

import { classNames } from 'primereact/utils'
import { useRef } from 'react'

import AttachmentSvg from '@/assets/icons/attachment.svg?react'

import Button from '../../Button'

type Props = {
  name?: string
  error?: boolean
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
} & React.InputHTMLAttributes<HTMLInputElement>

const FileInput = ({ name = '', error = false, onChange, onBlur, ...rest }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClick = () => {
    inputRef.current?.click()
  }

  return (
    <>
      <input
        {...rest}
        type="file"
        ref={inputRef}
        className="hidden"
        onChange={onChange}
        onBlur={onBlur}
      />

      <div
        className={classNames(
          'w-full flex flex-row bg-surface-base-content items-center border rounded-lg p-2',
          error ? 'border-border-error' : 'border-border-primary'
        )}
      >
        <Button
          variant="secondary"
          className="min-w-[105px] px-2 h-7 gap-1 text-sm font-normal"
          onClick={handleClick}
        >
          <AttachmentSvg className="size-4 !fill-none" />
          Select file
        </Button>

        <div className="text-text-quaternary ml-2 break-all">{name}</div>
      </div>
    </>
  )
}

export default FileInput
