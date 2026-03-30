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

import ActionDeleteSvg from '@/assets/icons/delete.svg?react'
import PlusSvg from '@/assets/icons/plus.svg?react'
import Button from '@/components/Button'
import { cn } from '@/utils/utils'

interface ImagePreviewProps {
  imageUrl: string
  disabled?: boolean
  onUploadClick: () => void
  onRemoveClick: () => void
  onImageError: () => void
  uploadError?: string
  className?: string
  isCompactView?: boolean
}

const ImagePreview = ({
  imageUrl,
  disabled,
  onUploadClick,
  onRemoveClick,
  onImageError,
  uploadError,
  className = '',
  isCompactView = false,
}: ImagePreviewProps) => (
  <div
    className={cn(
      'flex gap-4',
      isCompactView ? 'flex-col items-center w-full' : 'flex-row items-center h-16',
      className
    )}
  >
    {/* Avatar with Image */}
    <div className="relative w-16 h-16 rounded-full overflow-hidden border border-border-primary bg-white/90 flex-shrink-0">
      <img
        src={imageUrl}
        alt="Preview"
        className="w-full h-full object-contain"
        onError={onImageError}
      />
    </div>

    {/* Buttons Container */}
    {!disabled && (
      <div className="flex flex-col gap-3">
        <div className="flex flex-row items-center gap-2 h-7">
          {/* Upload Button */}
          <Button
            variant="secondary"
            size="small"
            onClick={onUploadClick}
            className="font-mono text-xs font-semibold h-7 px-2 gap-2 flex-shrink-0 w-32"
          >
            <PlusSvg className="w-[18px] h-[18px] shrink-0" />
            Upload logo
          </Button>

          {/* Delete Button */}
          <Button
            variant="secondary"
            size="small"
            onClick={onRemoveClick}
            className="font-mono text-xs font-semibold h-7 px-2 gap-1.5 flex-shrink-0 !border-failed-secondary !text-failed-secondary hover:!bg-failed-secondary/10 w-32"
          >
            <ActionDeleteSvg className="w-[18px] h-[18px] shrink-0" />
            Delete logo
          </Button>
        </div>
        {uploadError && (
          <p className="font-mono text-xs leading-4 text-failed-secondary">{uploadError}</p>
        )}
      </div>
    )}
  </div>
)

export default ImagePreview
