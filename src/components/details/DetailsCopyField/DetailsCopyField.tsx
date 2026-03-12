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

import CopySvg from '@/assets/icons/copy.svg?react'
import { cn, copyToClipboard } from '@/utils/utils'

interface DetailsCopyFieldProps {
  label?: string
  value?: string | null
  className?: string
  notification?: string
}

const DetailsCopyField = ({ label, value, className, notification }: DetailsCopyFieldProps) => {
  if (!value) return null

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <p className="text-xs text-text-primary">{label}</p>
      <div className="h-8 pl-2 items-center flex bg-surface-base-primary border border-border-primary y rounded-lg overflow-hidden">
        <input
          readOnly
          value={value}
          className="w-full pr-2 text-ellipsis bg-transparent text-xs text-text-quaternary focus:outline-none"
        />
        <button
          className="h-full px-2 transition codemieLight:rounded-r-lg codemieLight:border codemieLight:border-border-quaternary text-text-accent hover:bg-surface-specific-secondary-button-hover"
          onClick={() => copyToClipboard(value, notification ?? 'Value copied to clipboard')}
          aria-label="Copy"
        >
          <CopySvg />
        </button>
      </div>
    </div>
  )
}

export default DetailsCopyField
