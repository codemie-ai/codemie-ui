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

import { FC, useState } from 'react'
import { useSnapshot } from 'valtio'

import ChevronDownIcon from '@/assets/icons/chevron-down.svg?react'
import ChevronUpIcon from '@/assets/icons/chevron-up.svg?react'
import BasketSvg from '@/assets/icons/delete.svg?react'
import DownloadSvg from '@/assets/icons/download.svg?react'
import FileSvg from '@/assets/icons/file.svg?react'
import Spinner from '@/components/Spinner'
import { filesStore } from '@/store/files'
import { cn } from '@/utils/utils'

const IMG_MIME_PREFIX = 'image'

export interface FileMetadata {
  fileId?: string
  fileName: string
  mimeType?: string
  user?: string
  isUploading?: boolean
}

interface FileProps {
  file: FileMetadata
  withDelete?: boolean
  withPreview?: boolean
  withDownload?: boolean
  onRemove?: () => void
}

const File: FC<FileProps> = ({
  file,
  withDelete,
  withPreview = false,
  withDownload = false,
  onRemove,
}) => {
  const { downloadFile, getFileURL } = useSnapshot(filesStore)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [isImageLoading, setIsImageLoading] = useState<boolean>(false)

  const isImage = file.mimeType?.startsWith(IMG_MIME_PREFIX)
  const isPreviewVisible = !!imageSrc
  const canTogglePreview = isImage && withPreview && !!file.fileId

  const togglePreview = () => {
    if (!canTogglePreview) return

    if (imageSrc) {
      setImageSrc(null)
      return
    }

    setIsImageLoading(true)
    setImageSrc(getFileURL(file.fileId!))
  }

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!file.fileId) return
    downloadFile(file.fileId)
  }

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onRemove?.()
  }

  const handleContainerClick = () => {
    if (canTogglePreview) {
      togglePreview()
    }
  }

  const iconButtonClasses =
    'flex items-center justify-center px-1.5 h-full text-text-quaternary transition hover:text-text-primary'

  const containerBaseClasses = cn(
    'h-8 border border-border-structural rounded-lg text-xs bg-surface-base-primary transition flex items-center max-w-60',
    isPreviewVisible && 'rounded-b-none max-w-full',
    canTogglePreview && 'cursor-pointer hover:border-border-specific-interactive-outline',
    file.isUploading && 'pr-1'
  )

  const fileIcon = file.isUploading ? (
    <Spinner inline rootClassName="size-5 max-w-5 shrink-0 p-0" />
  ) : (
    <div className="size-5 max-w-5 flex shrink-0 items-center justify-center bg-surface-specific-dropdown-hover rounded">
      <FileSvg />
    </div>
  )

  const fileContent = (
    <div className="flex gap-2 min-w-0 items-center">
      {fileIcon}
      <div className="min-w-0 truncate">{file.fileName}</div>
    </div>
  )

  const actionButtons = !file.isUploading && (
    <div className="flex items-center shrink-0 ml-auto h-full [&>*:first-child]:pl-1.5 [&>*:last-child]:pr-2.5">
      {withDelete && (
        <button
          type="button"
          aria-label="Remove attached file"
          className={iconButtonClasses}
          onClick={handleRemoveClick}
        >
          <BasketSvg />
        </button>
      )}

      {withDownload && (
        <button
          type="button"
          aria-label="Download file"
          className={iconButtonClasses}
          onClick={handleDownloadClick}
        >
          <DownloadSvg className="max-w-4" />
        </button>
      )}

      {withPreview && isImage && (
        <button
          type="button"
          className={iconButtonClasses}
          aria-label="Show preview"
          onClick={handleContainerClick}
        >
          {isPreviewVisible ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </button>
      )}
    </div>
  )

  return (
    <div className="flex flex-col">
      <div className={containerBaseClasses}>
        {isImage && !file.isUploading && withPreview ? (
          <button
            type="button"
            tabIndex={-1}
            onClick={handleContainerClick}
            className="grow pl-1.5 pr-1 h-full min-w-0"
          >
            {fileContent}
          </button>
        ) : (
          <div className="grow flex items-center pl-1.5 pr-1 h-full min-w-0">{fileContent}</div>
        )}
        {actionButtons}
      </div>

      {isPreviewVisible && (
        <div className="w-full border-l border-b border-r border-border-structural rounded-lg rounded-t-none overflow-hidden bg-surface-base-secondary p-2 flex justify-center items-center">
          {isImageLoading && <Spinner inline rootClassName="size-10 py-6" />}
          <img
            src={imageSrc}
            alt={file.fileName}
            className={cn(
              'w-full h-auto object-contain max-h-80 bg-transparent',
              isImageLoading && 'hidden'
            )}
            onLoad={() => setIsImageLoading(false)}
            onError={() => setIsImageLoading(false)}
          />
        </div>
      )}
    </div>
  )
}

export default File
