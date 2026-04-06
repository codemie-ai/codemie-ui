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

import { FC, ReactNode } from 'react'

import { useDragAndDrop } from '@/hooks/useDragAndDrop'
import { cn } from '@/utils/utils'

interface DropzoneAreaProps {
  onFilesDrop: (files: File[]) => void
  onClick?: () => void
  disabled?: boolean
  children: (isDragging: boolean) => ReactNode
  className?: string
}

const DropzoneArea: FC<DropzoneAreaProps> = ({
  onFilesDrop,
  onClick,
  disabled = false,
  children,
  className = '',
}) => {
  const { isDragging, handleDragEnter, handleDragLeave, handleDragOver, handleDrop } =
    useDragAndDrop({ onFilesDrop })

  return (
    <div
      onDragEnter={disabled ? undefined : handleDragEnter}
      onDragOver={disabled ? undefined : handleDragOver}
      onDragLeave={disabled ? undefined : handleDragLeave}
      onDrop={disabled ? undefined : handleDrop}
      onClick={disabled ? undefined : onClick}
      className={cn(
        'relative overflow-hidden flex flex-col items-center justify-center gap-2.5 p-5 rounded-lg transition-colors',
        isDragging ? 'bg-surface-base-dropzone-hover' : 'bg-surface-base-dropzone',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        className
      )}
    >
      <svg className="absolute inset-0 w-full h-full pointer-events-none" fill="none">
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          rx="8"
          stroke="rgb(var(--colors-border-specific-dropzone))"
          strokeDasharray="6 6"
        />
      </svg>

      {children(isDragging)}
    </div>
  )
}

export default DropzoneArea
