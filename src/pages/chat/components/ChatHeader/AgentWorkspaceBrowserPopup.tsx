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

import { FC, useEffect, useMemo, useState } from 'react'
import { useSnapshot } from 'valtio'

import DownloadSvg from '@/assets/icons/download.svg?react'
import ExpandSvg from '@/assets/icons/expand.svg?react'
import FileSvg from '@/assets/icons/file.svg?react'
import Button from '@/components/Button'
import CodeBlock from '@/components/CodeBlock'
import { FileExtension } from '@/components/CodeBlock/fileExtensions'
import ExpandedYamlShell from '@/components/ExpandedYaml/ExpandedYamlShell'
import Markdown from '@/components/markdown/Markdown'
import Popup from '@/components/Popup'
import Spinner from '@/components/Spinner/Spinner'
import { agentWorkspaceStore } from '@/store/agentWorkspace'
import { AgentWorkspaceFileContent } from '@/types/entity/agentWorkspace'
import { cn } from '@/utils/utils'

import {
  buildTextPreview,
  canPreviewAsImage,
  formatFileSize,
  getImagePreviewSrc,
  getPathExtension,
  getPreviewKind,
  PreviewKind,
} from './workspacePreview'

interface AgentWorkspaceBrowserPopupProps {
  visible: boolean
  conversationId: string
  onHide: () => void
}

interface MarkdownPreviewProps {
  frontMatter: string | null
  body: string
  // Fill the expanded popup instead of the inline minimum height
  fill?: boolean
}

const MarkdownPreview: FC<MarkdownPreviewProps> = ({ frontMatter, body, fill }) => (
  <div
    data-testid="workspace-preview"
    className={cn(
      'overflow-auto rounded-lg border border-border-specific-panel-outline bg-surface-base-secondary p-4 shadow-block',
      fill ? 'min-h-0 flex-1' : 'min-h-[240px]'
    )}
  >
    {frontMatter !== null && (
      <pre
        data-testid="workspace-preview-frontmatter"
        className="m-0 mb-4 whitespace-pre-wrap break-words border-b border-border-structural pb-4 font-mono text-xs leading-5 text-text-primary"
      >
        {frontMatter}
      </pre>
    )}
    <div data-testid="workspace-preview-markdown">
      <Markdown content={body} />
    </div>
  </div>
)

interface ImagePreviewProps {
  path: string
  file: AgentWorkspaceFileContent | null
  previewUrl: string | null
  // Fill the expanded popup instead of the inline 60vh cap
  fill?: boolean
}

const ImagePreview: FC<ImagePreviewProps> = ({ path, file, previewUrl, fill }) => (
  <div
    data-testid="workspace-preview"
    className={cn(
      'flex items-center justify-center overflow-auto rounded-lg border border-border-specific-panel-outline bg-surface-base-secondary p-4 shadow-block',
      fill ? 'min-h-0 flex-1' : 'min-h-[240px]'
    )}
  >
    <img
      data-testid="workspace-preview-image"
      src={
        previewUrl ||
        getImagePreviewSrc({
          path,
          content: file?.content ?? '',
          mimeType: file?.mime_type,
          isBinary: file?.is_binary ?? true,
        })
      }
      alt={path.split('/').pop() ?? 'Selected workspace file preview'}
      className={cn('max-w-full rounded-md object-contain', fill ? 'max-h-full' : 'max-h-[60vh]')}
    />
  </div>
)

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

  const selectedContent = selectedFile?.content
  const previewKind =
    !!selectedFilePath && !selectedFile?.is_binary && typeof selectedContent === 'string'
      ? getPreviewKind(selectedFilePath)
      : null

  const textPreview = useMemo(
    () => buildTextPreview(previewKind, selectedContent),
    [previewKind, selectedContent]
  )

  const isImagePreviewAvailable = canPreviewAsImage({
    path: selectedFilePath,
    hasData: !!selectedFilePreviewUrl || typeof selectedContent === 'string',
    mimeType: selectedFile?.mime_type,
  })

  const hasImagePreview = isImagePreviewAvailable && !!(selectedFilePreviewUrl || selectedContent)

  // Markdown and images expand here; text and JSON expand through their CodeBlock
  const canExpand =
    !isPreviewLoading && (textPreview ? textPreview.kind === PreviewKind.MARKDOWN : hasImagePreview)

  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    if (!canExpand || !visible) setIsExpanded(false)
  }, [canExpand, visible])

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

    if (textPreview?.kind === PreviewKind.MARKDOWN) {
      return <MarkdownPreview frontMatter={textPreview.frontMatter} body={textPreview.body} />
    }

    if (textPreview) {
      return (
        <div data-testid="workspace-preview">
          <CodeBlock
            text={textPreview.body}
            // Text and JSON kinds are only given to FILE_EXTENSIONS values
            language={getPathExtension(selectedFilePath) as FileExtension}
            expandable
            expandLabel={selectedFilePath}
            hideDownload
          />
        </div>
      )
    }

    if (hasImagePreview) {
      return (
        <ImagePreview
          path={selectedFilePath}
          file={selectedFile}
          previewUrl={selectedFilePreviewUrl}
        />
      )
    }

    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-dashed border-border-structural px-6 text-center text-sm text-text-quaternary">
        Preview is available for Markdown, JSON, text and source code files, and common image
        formats.
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
        <div
          data-testid="workspace-file-panel"
          className="flex min-h-0 flex-col rounded-lg border border-border-structural bg-surface-base-primary"
        >
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

            <div className="flex shrink-0 items-center gap-2">
              {canExpand && (
                <Button
                  variant="secondary"
                  data-testid="workspace-preview-expand"
                  onClick={() => setIsExpanded(true)}
                >
                  <ExpandSvg aria-hidden="true" />
                  Expand
                </Button>
              )}
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
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {error && (
              <div className="mb-4 shrink-0 rounded-lg border border-failed-secondary bg-failed-secondary/10 px-4 py-3 text-sm text-failed-secondary">
                {error}
              </div>
            )}

            {selectedFile && (
              <div className="mb-4 grid shrink-0 grid-cols-1 gap-2 rounded-lg border border-border-structural bg-surface-base-secondary px-4 py-3 text-xs text-text-quaternary md:grid-cols-2">
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

      {/* The same popup CodeBlock's Expand opens, for previews that are not code */}
      {selectedFilePath && (
        <ExpandedYamlShell
          visible={isExpanded && canExpand && visible}
          onCollapse={() => setIsExpanded(false)}
          label={selectedFilePath}
        >
          {textPreview ? (
            <MarkdownPreview frontMatter={textPreview.frontMatter} body={textPreview.body} fill />
          ) : (
            <ImagePreview
              path={selectedFilePath}
              file={selectedFile}
              previewUrl={selectedFilePreviewUrl}
              fill
            />
          )}
        </ExpandedYamlShell>
      )}
    </Popup>
  )
}

export default AgentWorkspaceBrowserPopup
