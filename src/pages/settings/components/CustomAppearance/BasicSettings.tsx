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

import { ChangeEvent, useMemo, useRef, useState } from 'react'

import Button from '@/components/Button'
import Input from '@/components/form/Input/Input'
import Select from '@/components/form/Select/Select'
import Popup from '@/components/Popup'
import { ButtonSize, ButtonType } from '@/constants'
import { useCustomAppearance } from '@/hooks/useCustomAppearance'
import { FilterOption } from '@/types/filters'

const MAX_PRESET_NAME_LENGTH = 255

const sanitizePresetName = (name: string): string => name.trim().replace(/\s+/g, ' ')

const toExportFilename = (name: string): string =>
  sanitizePresetName(name).toLowerCase().replace(/\s+/g, '-') + '.json'

const BasicSettings = () => {
  const { activePreset, presets, selectPreset, resetActivePreset, importPreset } =
    useCustomAppearance()
  const [importError, setImportError] = useState('')
  const importInputRef = useRef<HTMLInputElement>(null)

  const [isExporting, setIsExporting] = useState(false)
  const [exportName, setExportName] = useState('')

  const isUserPreset = activePreset.type === 'user'

  const options = useMemo<FilterOption[]>(
    () => presets.map((p) => ({ label: p.name, value: p.name })),
    [presets]
  )

  const handleSelectChange = (value: unknown) => {
    if (typeof value !== 'string') return
    selectPreset(value)
  }

  const handleExportClick = () => {
    setExportName(activePreset.name)
    setIsExporting(true)
  }

  const handleDownload = () => {
    const sanitizedName = sanitizePresetName(exportName) || sanitizePresetName(activePreset.name)
    const presetToExport = { ...activePreset, name: sanitizedName }
    const blob = new Blob([JSON.stringify(presetToExport, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = toExportFilename(sanitizedName)
    a.click()
    URL.revokeObjectURL(url)
    setIsExporting(false)
    setExportName('')
  }

  const handleImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(reader.result as string)
        if (importPreset(parsed)) {
          setImportError('')
        } else {
          setImportError('The theme file could not be read. Make sure it is a valid JSON export.')
        }
      } catch {
        setImportError('The theme file could not be read. Make sure it is a valid JSON export.')
      }
    }
    reader.onerror = () => {
      setImportError('The theme file could not be read. Make sure it is a valid JSON export.')
    }
    reader.readAsText(file)
  }

  return (
    <div className="flex flex-col gap-3">
      <Select
        label="Preset"
        value={activePreset.name}
        options={options}
        onChange={(event) => handleSelectChange(event.value)}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type={ButtonType.SECONDARY}
          size={ButtonSize.SMALL}
          onClick={() => importInputRef.current?.click()}
        >
          Import preset
        </Button>
        {isUserPreset && (
          <>
            <Button size={ButtonSize.SMALL} onClick={handleExportClick}>
              Export preset
            </Button>
            <Button type={ButtonType.DELETE} size={ButtonSize.SMALL} onClick={resetActivePreset}>
              Drop preset
            </Button>
          </>
        )}
      </div>
      <Popup
        visible={isExporting}
        onHide={() => setIsExporting(false)}
        onSubmit={handleDownload}
        header="Export preset"
        submitText="Download"
        limitWidth
      >
        <Input
          label="Export name"
          value={exportName}
          maxLength={MAX_PRESET_NAME_LENGTH}
          onChange={(e) => setExportName(e.target.value)}
        />
      </Popup>
      <input
        ref={importInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleImport}
      />
      {importError && <p className="text-xs text-text-error">{importError}</p>}
    </div>
  )
}

export default BasicSettings
