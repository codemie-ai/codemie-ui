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

import { FC, ReactNode } from 'react'

import ExportToDocxSvg from '@/assets/icons/export-to-docx.svg?react'
import ExportToJsonSvg from '@/assets/icons/export-to-json.svg?react'
import ExportToPdfSvg from '@/assets/icons/export-to-pdf.svg?react'
import { RadioButton } from '@/components/form/RadioButton'
import { ChatExportFormat } from '@/types/chats'

import { FormatOption } from './constants'

const FORMAT_ICONS: Partial<Record<ChatExportFormat, ReactNode>> = {
  json: <ExportToJsonSvg />,
  docx: <ExportToDocxSvg />,
  pdf: <ExportToPdfSvg />,
}

interface ExportFormatOptionProps {
  option: FormatOption
  checked: boolean
  onChange: () => void
}

const ExportFormatOption: FC<ExportFormatOptionProps> = ({ option, checked, onChange }) => {
  const inputId = `export-format-${option.value}`

  return (
    <div>
      <div className="flex items-center gap-2">
        <RadioButton
          inputId={inputId}
          name="exportFormat"
          value={option.value}
          checked={checked}
          onChange={onChange}
        />
        <label
          htmlFor={inputId}
          className="flex items-center gap-2 cursor-pointer text-sm text-text-primary hover:text-border-accent transition"
        >
          <span className="w-[18px] h-[18px] flex items-center justify-center" aria-hidden="true">
            {FORMAT_ICONS[option.value]}
          </span>
          {option.label}
        </label>
      </div>
      <p className="ml-7 mt-1 text-xs leading-5 text-text-tertiary">{option.description}</p>
    </div>
  )
}

export default ExportFormatOption
