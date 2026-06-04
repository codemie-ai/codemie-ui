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

import Popup from '../Popup'
import CodeBlock from './CodeBlock'
import { FileExtension } from './fileExtensions'

interface CodeBlockExpandPopupProps {
  isVisible: boolean
  onHide: () => void
  header?: string
  title?: string
  language?: FileExtension
  text: string
  downloadFilename?: string
}

const CodeBlockExpandPopup: FC<CodeBlockExpandPopupProps> = ({
  isVisible,
  onHide,
  header,
  title,
  language,
  text,
  downloadFilename,
}) => (
  <Popup
    hideFooter
    isFullWidth
    header={header ?? title ?? (language ? language.toUpperCase() : 'Code')}
    visible={isVisible}
    onHide={onHide}
    className="h-full"
    bodyClassName="!pt-0"
  >
    <CodeBlock
      language={language}
      text={text}
      title={title}
      downloadFilename={downloadFilename}
    />
  </Popup>
)

export default CodeBlockExpandPopup
