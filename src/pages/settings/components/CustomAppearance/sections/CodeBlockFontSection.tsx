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

import { DropdownChangeEvent } from 'primereact/dropdown'

import Select from '@/components/form/Select/Select'
import { useCustomAppearance } from '@/hooks/useCustomAppearance'
import { FilterOption } from '@/types/filters'

const CODE_BLOCK_FONT_OPTIONS: FilterOption[] = [
  { label: 'GeistMono', value: 'geist-mono' },
  { label: 'JetBrains Mono', value: 'jetbrains-mono' },
  { label: 'IBM Plex Mono', value: 'ibm-plex-mono' },
]

type CodeBlockFont = 'geist-mono' | 'jetbrains-mono' | 'ibm-plex-mono'

const isValidCodeBlockFont = (value: unknown): value is CodeBlockFont => {
  return typeof value === 'string' && CODE_BLOCK_FONT_OPTIONS.some((opt) => opt.value === value)
}

const CodeBlockFontSection = () => {
  const { appearance, setAppearance } = useCustomAppearance()

  const handleFontChange = (event: DropdownChangeEvent) => {
    if (!event || event.value === undefined) return
    if (!isValidCodeBlockFont(event.value)) return
    setAppearance({
      codeBlockFontStack: event.value,
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <Select
        id="code-block-font"
        label="Code block font"
        value={appearance.codeBlockFontStack}
        options={CODE_BLOCK_FONT_OPTIONS}
        onChange={handleFontChange}
      />
    </div>
  )
}

export default CodeBlockFontSection
