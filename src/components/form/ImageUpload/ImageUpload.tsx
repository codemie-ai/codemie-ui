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

import { cn } from '@/utils/utils'

import ImageDropZone from './components/ImageDropZone'
import ImageLoader from './components/ImageLoader'
import ImagePreview from './components/ImagePreview'
import { useDragAndDrop } from './hooks/useDragAndDrop'
import { useFileUpload } from './hooks/useFileUpload'

interface ImageUploadProps {
  error?: string
  rootClass?: string
  disabled?: boolean
  value?: string | null
  onChange?: (value: string) => void
  maxSizeMB?: number
  isCompactView?: boolean
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  error,
  rootClass = '',
  disabled,
  value,
  onChange,
  maxSizeMB = 0.5,
  isCompactView = false,
}) => {
  const {
    isUploading,
    uploadError,
    setUploadError,
    fileInputRef,
    handleFileUpload,
    handleFileSelect,
    openFilePicker,
  } = useFileUpload({ maxSizeMB, onChange })

  const { isDragging, handleDragEnter, handleDragLeave, handleDragOver, handleDrop } =
    useDragAndDrop({ onFileDrop: handleFileUpload })

  const handleRemoveImage = () => {
    onChange?.('')
    setUploadError('')
  }

  const hasImage = value && value.length > 0 && !isUploading

  return (
    <div className={cn('flex flex-col items-center gap-y-2 w-full min-w-0', rootClass)}>
      <div
        role="region"
        aria-label="Image upload area"
        className={cn('relative flex flex-col gap-2', isDragging && 'opacity-50')}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {isUploading && <ImageLoader />}
        {!isUploading && hasImage && (
          <ImagePreview
            imageUrl={value}
            disabled={disabled}
            onUploadClick={openFilePicker}
            onRemoveClick={handleRemoveImage}
            onImageError={() => setUploadError('Failed to load image')}
            uploadError={uploadError}
            isCompactView={isCompactView}
          />
        )}
        {!isUploading && !hasImage && (
          <ImageDropZone
            disabled={disabled}
            onUploadClick={openFilePicker}
            uploadError={uploadError}
            isCompactView={isCompactView}
          />
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || isUploading}
        />
      </div>

      {/* Error Messages - only show external validation errors (uploadError is shown inline) */}
      {error && <div className="text-sm text-failed-secondary">{error}</div>}
    </div>
  )
}

export default ImageUpload
