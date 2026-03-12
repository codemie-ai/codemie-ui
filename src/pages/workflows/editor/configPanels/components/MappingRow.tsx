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

import React from 'react'

import ChevronUpSvg from '@/assets/icons/chevron-up.svg?react'
import DeleteSvg from '@/assets/icons/delete.svg?react'
import Button from '@/components/Button'
import Input from '@/components/form/Input'
import Select from '@/components/form/Select'
import Textarea from '@/components/form/Textarea'
import TooltipButton from '@/components/TooltipButton'
import { ButtonType, ButtonSize } from '@/constants'
import { TransformMapping, TransformMappingType } from '@/types/workflowEditor/configuration'
import { cleanObject } from '@/utils/helpers'
import { cn } from '@/utils/utils'

interface MappingRowProps {
  mapping: TransformMapping
  index: number
  isExpanded: boolean
  onToggle: () => void
  onUpdate: (mapping: TransformMapping) => void
  onDelete: () => void
  errors?: Record<string, { message?: string }>
  onClearErrors?: () => void
}

const MAPPING_TYPE_OPTIONS = [
  { label: 'Extract (JSONPath)', value: TransformMappingType.EXTRACT },
  { label: 'Condition (if-then-else)', value: TransformMappingType.CONDITION },
  { label: 'Template (Jinja2)', value: TransformMappingType.TEMPLATE },
  { label: 'Constant (static value)', value: TransformMappingType.CONSTANT },
  { label: 'Script (Python)', value: TransformMappingType.SCRIPT },
  { label: 'Array Map (extract from array)', value: TransformMappingType.ARRAY_MAP },
]

const MAPPING_TYPE_DESCRIPTIONS: Record<TransformMappingType, string> = {
  [TransformMappingType.EXTRACT]:
    'Extract field using JSONPath or dot notation (e.g., user.profile.email)',
  [TransformMappingType.CONDITION]:
    'If-then-else logic based on expression (e.g., status == "open" ? "active" : "closed")',
  [TransformMappingType.TEMPLATE]: 'Jinja2 template rendering (e.g., "Hello {{ user.name }}")',
  [TransformMappingType.CONSTANT]: 'Static constant value',
  [TransformMappingType.SCRIPT]: 'Python expression for complex calculations',
  [TransformMappingType.ARRAY_MAP]:
    'Extract specific fields from array items with optional filtering',
}

const TYPE_FIELD = 'type' as const satisfies keyof TransformMapping

const MappingRow: React.FC<MappingRowProps> = ({
  mapping,
  index,
  isExpanded,
  onToggle,
  onUpdate,
  onDelete,
  errors,
  onClearErrors,
}) => {
  const handleFieldChange = (field: keyof TransformMapping, value: any) => {
    if (field === TYPE_FIELD) {
      setTimeout(() => onClearErrors?.(), 0)
      onUpdate({
        output_field: mapping.output_field,
        type: value as TransformMappingType,
      })
      return
    }

    const updated = cleanObject({ ...mapping, [field]: value }) // nosonar
    onUpdate(updated as TransformMapping)
  }

  const renderTypeSpecificFields = () => {
    switch (mapping.type) {
      case TransformMappingType.EXTRACT:
        return (
          <>
            <Input
              name="source_path"
              label="Source Path"
              value={mapping.source_path ?? ''}
              onChange={(e) => handleFieldChange('source_path', e.target.value)}
              placeholder="e.g., user.profile.email"
              hint="JSONPath or dot notation to extract field"
              error={errors?.source_path?.message}
              required
            />
            <Input
              name="default"
              label="Default Value"
              value={mapping.default ?? ''}
              onChange={(e) => handleFieldChange('default', e.target.value)}
              placeholder="Optional: fallback value if path not found"
            />
          </>
        )

      case TransformMappingType.CONDITION:
        return (
          <>
            <Input
              name="condition"
              label="Condition Expression"
              value={mapping.condition ?? ''}
              onChange={(e) => handleFieldChange('condition', e.target.value)}
              placeholder='e.g., status == "open"'
              hint="Python expression that evaluates to boolean"
              error={errors?.condition?.message}
              required
            />
            <Input
              name="then_value"
              label="Then Value"
              value={mapping.then_value ?? ''}
              onChange={(e) => handleFieldChange('then_value', e.target.value)}
              placeholder="Value if condition is true"
              error={errors?.then_value?.message}
              required
            />
            <Input
              name="else_value"
              label="Else Value"
              value={mapping.else_value ?? ''}
              onChange={(e) => handleFieldChange('else_value', e.target.value)}
              placeholder="Value if condition is false"
              error={errors?.else_value?.message}
              required
            />
          </>
        )

      case TransformMappingType.TEMPLATE:
        return (
          <Textarea
            name="template"
            label="Template"
            value={mapping.template ?? ''}
            onChange={(e) => handleFieldChange('template', e.target.value)}
            placeholder="Hello {{ user.name }}, you have {{ count }} items"
            rows={3}
            hint="Jinja2 template syntax"
            error={errors?.template?.message}
            required
          />
        )

      case TransformMappingType.CONSTANT:
        return (
          <Input
            name="value"
            label="Constant Value"
            value={mapping.value ?? ''}
            onChange={(e) => handleFieldChange('value', e.target.value)}
            placeholder="e.g., high, active, 42"
            error={errors?.value?.message}
            required
          />
        )

      case TransformMappingType.SCRIPT:
        return (
          <Textarea
            name="script"
            label="Python Script"
            value={mapping.script ?? ''}
            onChange={(e) => handleFieldChange('script', e.target.value)}
            placeholder="sum([item.price * item.quantity for item in cart])"
            rows={3}
            hint="Python expression (safe eval with restricted namespace)"
            error={errors?.script?.message}
            required
          />
        )

      case TransformMappingType.ARRAY_MAP:
        return (
          <>
            <Input
              name="source_path"
              label="Source Path (Array)"
              value={mapping.source_path ?? ''}
              onChange={(e) => handleFieldChange('source_path', e.target.value)}
              placeholder="e.g., pull_request.labels"
              hint="Path to array in input data"
              error={errors?.source_path?.message}
              required
            />
            <Input
              name="item_field"
              label="Item Field"
              value={mapping.item_field ?? ''}
              onChange={(e) => handleFieldChange('item_field', e.target.value)}
              placeholder="e.g., name"
              hint="Field to extract from each array item"
              error={errors?.item_field?.message}
              required
            />
            <Input
              name="filter_condition"
              label="Filter Condition"
              value={mapping.filter_condition ?? ''}
              onChange={(e) => handleFieldChange('filter_condition', e.target.value)}
              placeholder='Optional: item.status == "active"'
              hint="Optional: filter items before extracting field"
            />
          </>
        )

      default:
        return null
    }
  }

  const hasErrors = errors && Object.keys(errors).length > 0

  return (
    <div
      className={cn(
        'border rounded-lg overflow-hidden border-border-specific-panel-outline transition-colors',
        {
          '!border-failed-secondary': hasErrors,
        }
      )}
    >
      {/* Header */}
      <div // nosonar
        className="flex items-center gap-2 p-3 bg-surface-base-chat cursor-pointer hover:bg-surface-elevated"
        onClick={onToggle}
      >
        <ChevronUpSvg
          className={cn('w-4 h-4 text-text-quaternary transition-transform', {
            'transform rotate-180': !isExpanded,
          })}
        />
        <span className="text-sm font-medium text-text-primary flex-1">
          {mapping.output_field || `Mapping #${index + 1}`}
          <span className="ml-2 text-xs text-text-quaternary">
            ({MAPPING_TYPE_OPTIONS.find((o) => o.value === mapping.type)?.label ?? mapping.type})
          </span>
        </span>
        <Button
          type={ButtonType.DELETE}
          size={ButtonSize.SMALL}
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          aria-label="Delete mapping"
        >
          <DeleteSvg className="w-4 h-4" />
        </Button>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="p-4 flex flex-col gap-3 border-t border-border-specific-panel-outline">
          <Input
            name="output_field"
            label="Output Field Name"
            value={mapping.output_field}
            onChange={(e) => handleFieldChange('output_field', e.target.value)}
            placeholder="e.g., user_email, status, total_price"
            required
            error={errors?.output_field?.message}
          />

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <label htmlFor="#mapping_type_select" className="text-xs text-text-quaternary">
                Mapping Type
              </label>
              <TooltipButton content={MAPPING_TYPE_DESCRIPTIONS[mapping.type]} />
            </div>
            <Select
              id="mapping_type_select"
              value={mapping.type}
              onChange={(e) => handleFieldChange('type', e.value)}
              options={MAPPING_TYPE_OPTIONS}
              allowCustom
            />
          </div>

          {renderTypeSpecificFields()}
        </div>
      )}
    </div>
  )
}

export default MappingRow
