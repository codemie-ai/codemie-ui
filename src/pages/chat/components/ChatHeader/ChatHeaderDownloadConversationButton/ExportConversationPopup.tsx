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

import Button from '@/components/Button'
import { Checkbox } from '@/components/form/Checkbox'
import Popup from '@/components/Popup'
import { chatsStore } from '@/store/chats'
import { ChatExportFormat } from '@/types/chats'
import toaster from '@/utils/toaster'

import { FORMAT_OPTIONS } from './constants'
import ExportFormatOption from './ExportFormatOption'

export interface ExportConversationPopupProps {
  isVisible: boolean
  onHide: () => void
}

const ExportConversationPopup: FC<ExportConversationPopupProps> = ({ isVisible, onHide }) => {
  const [format, setFormat] = useState<ChatExportFormat>('json')
  const [includeToolOutputs, setIncludeToolOutputs] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const canIncludeToolOutputs = format === 'docx' || format === 'pdf'
  const toolOutputsChecked = !canIncludeToolOutputs || includeToolOutputs

  const handleClose = () => {
    if (isExporting) return
    onHide()
  }

  const handleFormatChange = (value: ChatExportFormat) => {
    setFormat(value)
    if (value === 'json') setIncludeToolOutputs(false)
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const success = await chatsStore.exportChat(
        format,
        canIncludeToolOutputs && includeToolOutputs
      )
      onHide()

      if (success) {
        const formatUpper = format.toUpperCase()
        const toolOutputsSuffix =
          canIncludeToolOutputs && includeToolOutputs ? ' (with tool outputs)' : ''
        toaster.info(
          `Your conversation has been successfully exported as ${formatUpper}${toolOutputsSuffix}. The file is now ready in your downloads folder.`
        )
      }
    } finally {
      setIsExporting(false)
    }
  }

  const footerContent = (
    <div className="flex justify-end gap-3">
      <Button type="secondary" onClick={handleClose} disabled={isExporting}>
        Cancel
      </Button>
      <Button type="primary" onClick={handleExport} disabled={isExporting} isLoading={isExporting}>
        Export
      </Button>
    </div>
  )

  return (
    <Popup
      limitWidth
      visible={isVisible}
      header="Export Conversation"
      onHide={handleClose}
      footerContent={footerContent}
    >
      <h2 className="text-sm font-semibold mb-2">Format</h2>
      <div className="flex flex-col gap-2 mb-5">
        {FORMAT_OPTIONS.map((option) => (
          <ExportFormatOption
            key={option.value}
            option={option}
            checked={format === option.value}
            onChange={() => handleFormatChange(option.value)}
          />
        ))}
      </div>
      <Checkbox
        id="export-include-tool-outputs"
        name="includeToolOutputs"
        checked={toolOutputsChecked}
        disabled={!canIncludeToolOutputs}
        onChange={setIncludeToolOutputs}
        label="Include tool outputs"
        hint={
          canIncludeToolOutputs ? undefined : 'Tool outputs are always included in JSON exports.'
        }
      />
    </Popup>
  )
}

export default ExportConversationPopup
