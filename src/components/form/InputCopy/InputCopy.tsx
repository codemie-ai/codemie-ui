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

import React from 'react'

import CopySvg from '@/assets/icons/copy.svg?react'
import Input from '@/components/form/Input'
import { copyToClipboard, cn } from '@/utils/utils'

interface InputCopyProps {
  text: string
  notification: string
  className?: string
}

const InputCopy: React.FC<InputCopyProps> = ({ text, notification, className }) => {
  const handleCopy = () => {
    copyToClipboard(text, notification)
  }

  return (
    <Input
      value={text}
      name="copy-input"
      readOnly
      className={cn('m-0 overflow-hidden text-ellipsis text-text-primary', className)}
      rightIcon={
        <button
          className={cn(
            'flex justify-center items-center h-8',
            'w-7 mr-[-8px] rounded-r-lg',
            'min-h-full border border-border-quaternary text-border-accent',
            'hover:bg-surface-interactive-hover transition'
          )}
          onClick={handleCopy}
          type="button"
        >
          <CopySvg className="min-w-[12px] min-h-[12px] mx-2" />
        </button>
      }
    />
  )
}

export default InputCopy
