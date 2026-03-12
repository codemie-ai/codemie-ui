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

import React, { useState } from 'react'

import Button from '@/components/Button'
import { ButtonType, ButtonSize } from '@/constants'
import { TransformMapping, TransformMappingType } from '@/types/workflowEditor/configuration'

import MappingRow from './MappingRow'

interface MappingBuilderProps {
  value: TransformMapping[]
  onChange: (mappings: TransformMapping[]) => void
  id?: string
  error?: string
  errors?: Array<Record<string, { message?: string }>>
  onClearMappingErrors?: (index: number) => void
}

const createNewMapping = (): TransformMapping => ({
  output_field: '',
  type: TransformMappingType.EXTRACT,
  source_path: '',
})

const MappingBuilder: React.FC<MappingBuilderProps> = ({
  id,
  value,
  onChange,
  error,
  errors,
  onClearMappingErrors,
}) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const handleAddMapping = () => {
    const newIndex = value.length
    onChange([...value, createNewMapping()])
    setTimeout(() => onClearMappingErrors?.(newIndex), 0)
    setExpandedIndex(newIndex)
  }

  const handleUpdateMapping = (index: number, mapping: TransformMapping) => {
    const newMappings = [...value]
    newMappings[index] = mapping
    onChange(newMappings)
  }

  const handleDeleteMapping = (index: number) => {
    const newMappings = value.filter((_, i) => i !== index)
    onChange(newMappings)
    if (expandedIndex === index) {
      setExpandedIndex(null)
    } else if (expandedIndex !== null && expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1)
    }
  }

  const toggleExpanded = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index)
  }

  return (
    <div id={id} className="flex flex-col gap-2">
      {value.length === 0 ? (
        <div className="p-4 border border-border-specific-panel-outline rounded-lg text-center text-text-quaternary text-sm">
          No mappings defined. Add a mapping to transform data.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {value.map((mapping, index) => (
            <MappingRow
              key={index}
              mapping={mapping}
              index={index}
              isExpanded={expandedIndex === index}
              onToggle={() => toggleExpanded(index)}
              onUpdate={(updated) => handleUpdateMapping(index, updated)}
              onDelete={() => handleDeleteMapping(index)}
              errors={errors?.[index]}
              onClearErrors={() => onClearMappingErrors?.(index)}
            />
          ))}
        </div>
      )}

      <Button
        variant={ButtonType.SECONDARY}
        size={ButtonSize.SMALL}
        onClick={handleAddMapping}
        type={ButtonType.SECONDARY}
      >
        + Add Mapping
      </Button>

      {error && <div className="text-xs text-failed-secondary">{error}</div>}
    </div>
  )
}

export default MappingBuilder
