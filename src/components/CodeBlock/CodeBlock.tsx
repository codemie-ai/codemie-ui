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

import './CodeBlock.scss'
import Prism from 'prismjs'
import { FC, ReactNode, useEffect, useMemo, useState } from 'react'

import CopySvg from '@/assets/icons/copy.svg?react'
import DownloadSvg from '@/assets/icons/download.svg?react'
import EyeSvg from '@/assets/icons/view.svg?react'
import toaster from '@/utils/toaster'

import { cn, copyToClipboard } from '../../utils/utils'
import Button from '../Button'
import { downloadCodeAsFile, FileExtension } from './fileExtensions'
import HtmlPreviewPopup from './HtmlPreviewPopup'
import { unSanitizeMessage } from '../markdown/Markdown.utils'

const HTML_REGEX = /^(<!DOCTYPE html>|<html>)/

interface CodeBlockProps {
  isInChat?: boolean
  title?: string
  language?: FileExtension
  text: string
  downloadFilename?: string
  className?: string
  headerClassName?: string
  contentClassName?: string
  headerActionsLast?: boolean
  headerActionsTemplate?: ReactNode
}

const CodeBlock: FC<CodeBlockProps> = ({
  isInChat,
  title,
  language = 'txt',
  text,
  downloadFilename,
  className,
  headerClassName,
  contentClassName,
  headerActionsLast,
  headerActionsTemplate,
}) => {
  const [isHtmlPopupVisible, setIsHtmlPopupVisible] = useState(false)

  const isHTML = useMemo(() => language === 'html' || HTML_REGEX.exec(text), [language, text])

  const displayLanguage = language.toLowerCase()
  const outputText = useMemo(() => unSanitizeMessage(text).trim(), [text])

  const downloadCode = () => {
    const fileName = downloadCodeAsFile(outputText, language, downloadFilename)
    toaster.info(`Code downloaded as ${fileName}`)
  }

  useEffect(() => {
    Prism.highlightAll()
  }, [text, language])

  return (
    <div
      className={cn(
        'code-block shadow-block w-full',
        '!border-none !bg-transparent !rounded-lg',
        isInChat && 'chat-code-block',
        className
      )}
    >
      <div
        className={cn(
          'flex justify-between code-block-header items-center gap-x-4 gap-y-2 flex-wrap py-2 !pl-4 !pr-2 !m-0 bg-surface-base-tertiary shadow-block border border-border-specific-panel-outline rounded-t-lg',
          headerClassName
        )}
      >
        <p className="text-sm">{title ?? language.toLowerCase()}</p>

        <div className="flex flex-wrap gap-2">
          {isHTML && (
            <Button
              variant="secondary"
              className="!px-2"
              data-tooltip-id="react-tooltip"
              data-tooltip-content="Preview HTML document"
              onClick={() => setIsHtmlPopupVisible(!isHtmlPopupVisible)}
            >
              <EyeSvg /> <span className="code-block-header-btn-label">Preview</span>
            </Button>
          )}

          {!headerActionsLast && headerActionsTemplate}

          <Button
            variant="secondary"
            className="!px-2"
            data-tooltip-id="react-tooltip"
            data-tooltip-content="Copy to buffer"
            onClick={() => copyToClipboard(outputText, 'Copied to clipboard')}
          >
            <CopySvg className="mr-0.5" /> <span className="code-block-header-btn-label">Copy</span>
          </Button>

          <Button
            type="secondary"
            className="!px-2"
            data-tooltip-id="react-tooltip"
            data-tooltip-place="top"
            data-tooltip-content={`Download as ${displayLanguage}`}
            onClick={downloadCode}
          >
            <DownloadSvg /> <span className="code-block-header-btn-label">Download</span>
          </Button>

          {headerActionsLast && headerActionsTemplate}
        </div>
      </div>

      <pre
        className={cn(
          'p-4 rounded-b-lg border !border-t-0 !border-border-specific-panel-outline !bg-surface-base-secondary flex',
          contentClassName
        )}
      >
        <code className={`language-${language} break-words w-0 flex-1`}>{outputText}</code>
      </pre>

      <HtmlPreviewPopup
        html={outputText}
        isVisible={isHtmlPopupVisible}
        onHide={() => setIsHtmlPopupVisible(!isHtmlPopupVisible)}
      />
    </div>
  )
}

export default CodeBlock
