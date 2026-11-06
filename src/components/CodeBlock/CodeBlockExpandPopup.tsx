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

import { FC } from 'react'

import CopySvg from '@/assets/icons/copy.svg?react'
import DownloadSvg from '@/assets/icons/download.svg?react'
import ExpandedYamlShell from '@/components/ExpandedYaml/ExpandedYamlShell'
import ExpandedYamlView from '@/components/ExpandedYaml/ExpandedYamlView'
import toaster from '@/utils/toaster'

import { copyToClipboard } from '../../utils/utils'
import Button from '../Button'
import CodeBlock from './CodeBlock'
import { downloadCodeAsFile, FileExtension } from './fileExtensions'
import { unSanitizeMessage } from '../markdown/Markdown.utils'

interface CodeBlockExpandPopupProps {
  isVisible: boolean
  onHide: () => void
  label?: string
  title?: string
  language?: FileExtension
  text: string
  downloadFilename?: string
  expandWithEditor?: boolean
  hideDownload?: boolean
}

const CodeBlockExpandPopup: FC<CodeBlockExpandPopupProps> = ({
  isVisible,
  onHide,
  label,
  title,
  language,
  text,
  downloadFilename,
  expandWithEditor,
  hideDownload,
}) => {
  const popupLabel = label ?? title ?? (language ? language.toUpperCase() : 'Code')

  if (expandWithEditor) {
    const fileLanguage = language ?? 'txt'
    const outputText = unSanitizeMessage(text).trim()

    const downloadCode = () => {
      const fileName = downloadCodeAsFile(outputText, fileLanguage, downloadFilename)
      toaster.info(`Code downloaded as ${fileName}`)
    }

    return (
      <ExpandedYamlView
        visible={isVisible}
        onCollapse={onHide}
        label={popupLabel}
        title={title ?? fileLanguage.toLowerCase()}
        value={outputText}
        readonly
        wrap
        actions={
          <>
            <Button
              variant="secondary"
              className="!px-2"
              data-tooltip-id="react-tooltip"
              data-tooltip-content="Copy to buffer"
              onClick={() => copyToClipboard(outputText, 'Copied to clipboard')}
            >
              <CopySvg className="mr-0.5" />{' '}
              <span className="code-block-header-btn-label">Copy</span>
            </Button>
            {!hideDownload && (
              <Button
                variant="secondary"
                className="!px-2"
                data-tooltip-id="react-tooltip"
                data-tooltip-place="bottom"
                data-tooltip-content={`Download as ${fileLanguage.toLowerCase()}`}
                onClick={downloadCode}
              >
                <DownloadSvg /> <span className="code-block-header-btn-label">Download</span>
              </Button>
            )}
          </>
        }
      />
    )
  }

  return (
    <ExpandedYamlShell visible={isVisible} onCollapse={onHide} label={popupLabel}>
      <CodeBlock
        language={language}
        text={text}
        title={title}
        downloadFilename={downloadFilename}
        isInExpandPopup
        hideDownload={hideDownload}
      />
    </ExpandedYamlShell>
  )
}

export default CodeBlockExpandPopup
