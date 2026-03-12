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

import yaml from 'js-yaml'
import React, { useState } from 'react'

import AceEditor from '@/components/AceEditor/AceEditor'

interface YamlEditorProps {
  value?: Record<string, any>
  onChange: (value: Record<string, any>) => void
  onValidationChange?: (hasError: boolean) => void
  label?: string
  placeholder?: string
  height?: string
  error?: string
  helperText?: string
  exampleYaml?: string
}

const YamlEditor: React.FC<YamlEditorProps> = ({
  value,
  onChange,
  onValidationChange,
  label,
  placeholder,
  height = 'h-64',
  error: externalError,
  helperText,
  exampleYaml,
}) => {
  const [yamlText, setYamlText] = useState(() => {
    // Initialize from value only on mount
    if (value && Object.keys(value).length > 0) {
      try {
        return yaml.dump(value, {
          indent: 2,
          lineWidth: -1,
          noRefs: true,
        })
      } catch {
        return ''
      }
    }
    return ''
  })
  const [internalError, setInternalError] = useState<string | null>(null)

  const error = externalError || internalError

  const handleYamlChange = (newYaml: string) => {
    setYamlText(newYaml)

    // Try to parse YAML
    try {
      if (!newYaml.trim()) {
        // Empty is valid
        onChange({})
        setInternalError(null)
        onValidationChange?.(false)
        return
      }

      const parsed = yaml.load(newYaml) as any

      // Ensure it's an object
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        setInternalError('Must be a YAML object (key-value pairs)')
        onValidationChange?.(true)
        return
      }

      onChange(parsed)
      setInternalError(null)
      onValidationChange?.(false)
    } catch (err: any) {
      setInternalError(`YAML Error: ${err.message}`)
      onValidationChange?.(true)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-sm font-medium text-text-primary">{label}</label>}

      <div className={`${height} rounded-lg overflow-hidden border border-border-structural`}>
        <AceEditor
          name="yaml_editor"
          value={yamlText}
          onChange={handleYamlChange}
          lang="yaml"
          placeholder={placeholder}
        />
      </div>

      {error && (
        <div className="text-xs text-failed-secondary p-2 bg-failed-secondary/10 rounded border border-failed-secondary">
          {error}
        </div>
      )}

      {helperText && !error && <div className="text-xs text-text-quaternary">{helperText}</div>}

      {exampleYaml && !error && (
        <div className="text-xs text-text-quaternary">
          Example:
          <pre className="mt-1 p-2 bg-surface-base-primary rounded border border-border-structural font-mono">
            {exampleYaml}
          </pre>
        </div>
      )}
    </div>
  )
}

export default YamlEditor
