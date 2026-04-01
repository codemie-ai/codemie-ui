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

import PlusSvg from '@/assets/icons/plus.svg?react'
import ImagePlaceholder from '@/assets/images/image-placeholder.svg?react'
import Button from '@/components/Button'
import { cn } from '@/utils/utils'

interface ImageDropZoneProps {
  disabled?: boolean
  onUploadClick: () => void
  uploadError?: string
  className?: string
  isCompactView?: boolean
}

const ImageDropZone = ({
  disabled,
  onUploadClick,
  uploadError,
  className = '',
  isCompactView = false,
}: ImageDropZoneProps) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault()
      onUploadClick()
    }
  }

  return (
    <div
      className={cn(
        'flex gap-4',
        isCompactView ? 'flex-col items-center w-full' : 'flex-row items-center h-16',
        className
      )}
    >
      {/* Avatar Drop Zone */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={onUploadClick}
        onKeyDown={handleKeyDown}
        aria-label="Upload image"
        aria-disabled={disabled}
        className={cn(
          'w-16 h-16 rounded-full border flex-shrink-0',
          'flex items-center justify-center cursor-pointer transition-colors',
          'border-border-primary hover:border-border-secondary bg-input-fill',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {/* Image Placeholder */}
        <ImagePlaceholder className="w-9 h-10 text-text-primary" />
      </div>

      {/* Upload Button and Error */}
      <div
        className={cn(
          'flex gap-2',
          isCompactView ? 'flex-col items-center mx-auto' : 'flex-row items-center h-12'
        )}
      >
        <Button
          type="primary"
          size="small"
          onClick={(e) => {
            e.stopPropagation()
            onUploadClick()
          }}
          disabled={disabled}
          className="font-mono text-xs font-semibold h-7 px-2 gap-2 flex-shrink-0 w-32"
        >
          <PlusSvg className="w-[18px] h-[18px] shrink-0" />
          Upload logo
        </Button>
        {uploadError && (
          <p className="font-mono text-xs leading-4 text-failed-secondary">{uploadError}</p>
        )}
      </div>
    </div>
  )
}

export default ImageDropZone
