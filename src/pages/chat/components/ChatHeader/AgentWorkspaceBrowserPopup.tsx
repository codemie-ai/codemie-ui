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

import { FC, useEffect } from 'react'
import { useSnapshot } from 'valtio'

import DownloadSvg from '@/assets/icons/download.svg?react'
import FileSvg from '@/assets/icons/file.svg?react'
import Button from '@/components/Button'
import Popup from '@/components/Popup'
import Spinner from '@/components/Spinner/Spinner'
import { agentWorkspaceStore } from '@/store/agentWorkspace'
import { cn } from '@/utils/utils'

interface AgentWorkspaceBrowserPopupProps {
  visible: boolean
  conversationId: string
  onHide: () => void
}

const TEXT_PREVIEWABLE_EXTENSIONS = ['txt', 'py', 'js'] as const
const IMAGE_PREVIEWABLE_EXTENSIONS = [
  'apng',
  'avif',
  'bmp',
  'gif',
  'ico',
  'jpeg',
  'jpg',
  'png',
  'svg',
  'webp',
] as const

const IMAGE_MIME_TYPES_BY_EXTENSION: Record<(typeof IMAGE_PREVIEWABLE_EXTENSIONS)[number], string> =
  {
    apng: 'image/apng',
    avif: 'image/avif',
    bmp: 'image/bmp',
    gif: 'image/gif',
    ico: 'image/x-icon',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    svg: 'image/svg+xml',
    webp: 'image/webp',
  }

const getFileExtension = (path: string) => {
  return path.split('.').pop()?.toLowerCase() ?? ''
}

const isImageMimeType = (mimeType?: string | null) => {
  return mimeType?.toLowerCase().startsWith('image/') ?? false
}

const getNormalizedImageMimeType = (path: string, mimeType?: string | null) => {
  const normalizedMimeType = mimeType?.toLowerCase()

  if (normalizedMimeType?.startsWith('image/')) return normalizedMimeType

  const extension = getFileExtension(path) as keyof typeof IMAGE_MIME_TYPES_BY_EXTENSION

  return IMAGE_MIME_TYPES_BY_EXTENSION[extension] ?? 'image/*'
}

const getImagePreviewSrc = ({
  path,
  content,
  mimeType,
  isBinary,
}: {
  path: string
  content: string
  mimeType?: string | null
  isBinary: boolean
}) => {
  if (content.startsWith('data:')) return content

  const normalizedMimeType = getNormalizedImageMimeType(path, mimeType)
  const normalizedContent = isBinary ? content.replace(/\s+/g, '') : content

  if (normalizedMimeType === 'image/svg+xml' && !isBinary) {
    return `data:${normalizedMimeType};charset=utf-8,${encodeURIComponent(normalizedContent)}`
  }

  return `data:${normalizedMimeType};base64,${normalizedContent}`
}

const formatFileSize = (size?: number) => {
  if (size == null) return 'Unknown size'
  return `${size.toLocaleString()} bytes`
}

const AgentWorkspaceBrowserPopup: FC<AgentWorkspaceBrowserPopupProps> = ({
  visible,
  conversationId,
  onHide,
}) => {
  const {
    workspace,
    files,
    selectedFilePath,
    selectedFile,
    selectedFilePreviewUrl,
    isWorkspaceLoading,
    isFilesLoading,
    isPreviewLoading,
    isDownloading,
    error,
  } = useSnapshot(agentWorkspaceStore)

  useEffect(() => {
    if (!visible || !conversationId) return

    agentWorkspaceStore.openForConversation(conversationId)
  }, [conversationId, visible])

  const isTextPreviewAvailable =
    !!selectedFilePath &&
    !selectedFile?.is_binary &&
    typeof selectedFile?.content === 'string' &&
    TEXT_PREVIEWABLE_EXTENSIONS.includes(
      getFileExtension(selectedFilePath) as (typeof TEXT_PREVIEWABLE_EXTENSIONS)[number]
    )

  const isImagePreviewAvailable =
    !!selectedFilePath &&
    (!!selectedFilePreviewUrl || typeof selectedFile?.content === 'string') &&
    (isImageMimeType(selectedFile?.mime_type) ||
      IMAGE_PREVIEWABLE_EXTENSIONS.includes(
        getFileExtension(selectedFilePath) as (typeof IMAGE_PREVIEWABLE_EXTENSIONS)[number]
      ))

  const footerContent = (
    <div className="flex w-full justify-end">
      <Button variant="secondary" onClick={onHide}>
        Close
      </Button>
    </div>
  )

  const renderPreview = () => {
    if (isPreviewLoading) {
      return <Spinner inline rootClassName="min-h-[240px]" className="h-5 w-5" />
    }

    if (!selectedFilePath) {
      return (
        <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-dashed border-border-structural px-6 text-center text-sm text-text-quaternary">
          Select a file from the list to see its preview.
        </div>
      )
    }

    if (isTextPreviewAvailable) {
      return (
        <div
          data-testid="workspace-preview"
          className="min-h-[240px] overflow-auto rounded-lg border border-border-structural bg-surface-base-primary p-4"
        >
          <pre
            data-testid="workspace-preview-text"
            className="m-0 whitespace-pre-wrap break-words font-mono text-xs leading-5 text-text-primary"
          >
            {selectedFile?.content}
          </pre>
        </div>
      )
    }

    if (isImagePreviewAvailable && (selectedFilePreviewUrl || selectedFile?.content)) {
      return (
        <div
          data-testid="workspace-preview"
          className="flex min-h-[240px] items-center justify-center overflow-auto rounded-lg border border-border-structural bg-surface-base-primary p-4"
        >
          <img
            data-testid="workspace-preview-image"
            src={
              selectedFilePreviewUrl ||
              getImagePreviewSrc({
                path: selectedFilePath,
                content: selectedFile?.content ?? '',
                mimeType: selectedFile?.mime_type,
                isBinary: selectedFile?.is_binary ?? true,
              })
            }
            alt={selectedFilePath.split('/').pop() ?? 'Selected workspace file preview'}
            className="max-h-[60vh] max-w-full rounded-md object-contain"
          />
        </div>
      )
    }

    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-dashed border-border-structural px-6 text-center text-sm text-text-quaternary">
        Preview is currently available for .txt, .py, and .js text files, plus common image formats
        supported by modern browsers.
      </div>
    )
  }

  return (
    <Popup
      visible={visible}
      onHide={onHide}
      header="Agent workspace"
      footerContent={footerContent}
      isFullWidth
      className="max-w-[1100px]"
      bodyClassName="overflow-hidden"
    >
      <div className="grid h-[65vh] min-h-[420px] grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="flex min-h-0 flex-col rounded-lg border border-border-structural bg-surface-base-primary">
          <div className="border-b border-border-structural px-4 py-3 text-sm font-semibold text-text-primary">
            Files
          </div>

          <div
            data-testid="workspace-file-list"
            className="min-h-0 flex-1 overflow-y-auto px-2 py-2"
          >
            {(isWorkspaceLoading || isFilesLoading) && (
              <Spinner inline rootClassName="min-h-[160px]" className="h-5 w-5" />
            )}

            {!isWorkspaceLoading && !isFilesLoading && files.length === 0 && (
              <div className="px-2 py-4 text-sm text-text-quaternary">No files found.</div>
            )}

            {!isWorkspaceLoading &&
              !isFilesLoading &&
              files.map((file) => {
                const isSelected = selectedFilePath === file.path

                return (
                  <button
                    key={file.path}
                    type="button"
                    className={cn(
                      'mb-1 flex w-full items-start gap-2 rounded-md border px-3 py-2 text-left text-sm transition',
                      isSelected
                        ? 'border-border-tertiary bg-surface-specific-secondary-button-hover text-text-primary'
                        : 'border-transparent bg-transparent text-text-quaternary hover:border-border-structural hover:bg-surface-base-secondary hover:text-text-primary'
                    )}
                    onClick={() => agentWorkspaceStore.selectFile(file.path)}
                    title={file.path}
                  >
                    <FileSvg className="mt-0.5 shrink-0 text-text-accent" aria-hidden="true" />
                    <span className="break-all">{file.path}</span>
                  </button>
                )
              })}
          </div>
        </div>

        <div className="flex min-h-0 flex-col rounded-lg border border-border-structural bg-surface-base-primary">
          <div className="flex items-center justify-between gap-4 border-b border-border-structural px-4 py-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-text-primary">Preview</div>
              <div className="truncate text-xs text-text-quaternary">
                {selectedFilePath ?? workspace?.name ?? 'No file selected'}
              </div>
            </div>

            <Button
              variant="secondary"
              aria-label="Download selected file"
              disabled={!selectedFilePath || isDownloading}
              isLoading={isDownloading}
              onClick={() => agentWorkspaceStore.downloadSelectedFile()}
            >
              <DownloadSvg aria-hidden="true" />
              Download
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {error && (
              <div className="mb-4 rounded-lg border border-failed-secondary bg-failed-secondary/10 px-4 py-3 text-sm text-failed-secondary">
                {error}
              </div>
            )}

            {selectedFile && (
              <div className="mb-4 grid grid-cols-1 gap-2 rounded-lg border border-border-structural bg-surface-base-secondary px-4 py-3 text-xs text-text-quaternary md:grid-cols-2">
                <div>Type: {selectedFile.mime_type}</div>
                <div>Version: {selectedFile.version}</div>
                <div>Size: {formatFileSize(selectedFile.size)}</div>
                <div>{selectedFile.is_binary ? 'Binary file' : 'Text file'}</div>
              </div>
            )}

            {renderPreview()}
          </div>
        </div>
      </div>
    </Popup>
  )
}

export default AgentWorkspaceBrowserPopup
