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
import Textarea, { TextareaRef } from '@/components/form/Textarea'
import { ButtonType, ButtonSize } from '@/constants'
import { WorkflowIssue } from '@/types/entity'
import { TransformMapping, TransformMappingType } from '@/types/workflowEditor/configuration'
import { cleanObject } from '@/utils/helpers'
import { cn } from '@/utils/utils'

import { useWorkflowContext } from '../../hooks/useWorkflowContext'
import { FieldElement } from '../../hooks/useWorkflowFieldIssues'

interface MappingRowProps {
  mapping: TransformMapping
  index: number
  isExpanded: boolean
  onToggle: () => void
  onUpdate: (mapping: TransformMapping) => void
  onDelete: () => void
  invalid: boolean
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
  invalid,
  errors,
  onClearErrors,
}) => {
  const {
    getIssueField,
    tempIssues,
    selectedStateId,
    markIssueDirty,
    isIssueDirty,
    isIssueResolved,
  } = useWorkflowContext()

  const getFieldIssue = <T extends FieldElement = HTMLInputElement>(fieldName: string) => {
    return getIssueField<T>(`config.mappings.${index}.${fieldName}`)
  }

  const isIssueBelongsToMapping = (issue: WorkflowIssue) => {
    const mappingPath = `config.mappings.${index}`
    return (
      issue.stateId === selectedStateId &&
      issue.path.startsWith(mappingPath) &&
      !issue.path.startsWith(`config.mappings.${index + 1}`)
    )
  }

  const markAllMappingIssuesDirty = () => {
    if (!tempIssues) return
    tempIssues.forEach((issue) => {
      if (isIssueBelongsToMapping(issue)) {
        markIssueDirty(issue)
      }
    })
  }

  const hasMappingIssues = () => {
    if (!tempIssues) return false
    return tempIssues.some(
      (issue) => isIssueBelongsToMapping(issue) && !isIssueDirty(issue) && !isIssueResolved(issue)
    )
  }

  const handleFieldChange = (field: keyof TransformMapping, value: any) => {
    if (field === TYPE_FIELD) {
      setTimeout(() => onClearErrors?.(), 0)
      markAllMappingIssuesDirty()

      onUpdate({ output_field: mapping.output_field, type: value })
      return
    }

    const updated = cleanObject({ ...mapping, [field]: value })
    onUpdate(updated as TransformMapping)
  }

  const handleDelete = () => {
    markAllMappingIssuesDirty()
    onDelete()
  }

  const renderTypeSpecificFields = () => {
    switch (mapping.type) {
      case TransformMappingType.EXTRACT: {
        const sourcePathIssue = getFieldIssue('source_path')
        const defaultIssue = getFieldIssue('default')
        return (
          <>
            <Input
              name="source_path"
              label="Source Path"
              value={mapping.source_path ?? ''}
              onChange={(e) => {
                sourcePathIssue.onChange()
                handleFieldChange('source_path', e.target.value)
              }}
              placeholder="e.g., user.profile.email"
              hint="JSONPath or dot notation to extract field"
              ref={sourcePathIssue.ref}
              error={errors?.source_path?.message || sourcePathIssue.fieldError}
              required
            />
            <Input
              name="default"
              label="Default Value"
              value={mapping.default ?? ''}
              onChange={(e) => {
                defaultIssue.onChange()
                handleFieldChange('default', e.target.value)
              }}
              placeholder="Optional: fallback value if path not found"
              ref={defaultIssue.ref}
              error={defaultIssue.fieldError}
            />
          </>
        )
      }

      case TransformMappingType.CONDITION: {
        const conditionIssue = getFieldIssue('condition')
        const thenValueIssue = getFieldIssue('then_value')
        const elseValueIssue = getFieldIssue('else_value')
        return (
          <>
            <Input
              name="condition"
              label="Condition Expression"
              value={mapping.condition ?? ''}
              onChange={(e) => {
                conditionIssue.onChange()
                handleFieldChange('condition', e.target.value)
              }}
              placeholder='e.g., status == "open"'
              hint="Python expression that evaluates to boolean"
              ref={conditionIssue.ref}
              error={errors?.condition?.message || conditionIssue.fieldError}
              required
            />
            <Input
              name="then_value"
              label="Then Value"
              value={mapping.then_value ?? ''}
              onChange={(e) => {
                thenValueIssue.onChange()
                handleFieldChange('then_value', e.target.value)
              }}
              placeholder="Value if condition is true"
              ref={thenValueIssue.ref}
              error={errors?.then_value?.message || thenValueIssue.fieldError}
              required
            />
            <Input
              name="else_value"
              label="Else Value"
              value={mapping.else_value ?? ''}
              onChange={(e) => {
                elseValueIssue.onChange()
                handleFieldChange('else_value', e.target.value)
              }}
              placeholder="Value if condition is false"
              ref={elseValueIssue.ref}
              error={errors?.else_value?.message || elseValueIssue.fieldError}
              required
            />
          </>
        )
      }

      case TransformMappingType.TEMPLATE: {
        const templateIssue = getIssueField<TextareaRef>(`config.mappings.${index}.template`)
        return (
          <Textarea
            name="template"
            label="Template"
            value={mapping.template ?? ''}
            onChange={(e) => {
              templateIssue.onChange()
              handleFieldChange('template', e.target.value)
            }}
            placeholder="Hello {{ user.name }}, you have {{ count }} items"
            rows={3}
            hint="Jinja2 template syntax"
            ref={templateIssue.ref}
            error={errors?.template?.message || templateIssue.fieldError}
            required
          />
        )
      }

      case TransformMappingType.CONSTANT: {
        const valueIssue = getFieldIssue('value')
        return (
          <Input
            name="value"
            label="Constant Value"
            value={mapping.value ?? ''}
            onChange={(e) => {
              valueIssue.onChange()
              handleFieldChange('value', e.target.value)
            }}
            placeholder="e.g., high, active, 42"
            ref={valueIssue.ref}
            error={errors?.value?.message || valueIssue.fieldError}
            required
          />
        )
      }

      case TransformMappingType.SCRIPT: {
        const scriptIssue = getIssueField<TextareaRef>(`config.mappings.${index}.script`)
        return (
          <Textarea
            name="script"
            label="Python Script"
            value={mapping.script ?? ''}
            onChange={(e) => {
              scriptIssue.onChange()
              handleFieldChange('script', e.target.value)
            }}
            placeholder="sum([item.price * item.quantity for item in cart])"
            rows={3}
            hint="Python expression (safe eval with restricted namespace)"
            ref={scriptIssue.ref}
            error={errors?.script?.message || scriptIssue.fieldError}
            required
          />
        )
      }

      case TransformMappingType.ARRAY_MAP: {
        const sourcePathIssue = getFieldIssue('source_path')
        const itemFieldIssue = getFieldIssue('item_field')
        const filterConditionIssue = getFieldIssue('filter_condition')
        return (
          <>
            <Input
              name="source_path"
              label="Source Path (Array)"
              value={mapping.source_path ?? ''}
              onChange={(e) => {
                sourcePathIssue.onChange()
                handleFieldChange('source_path', e.target.value)
              }}
              placeholder="e.g., pull_request.labels"
              hint="Path to array in input data"
              ref={sourcePathIssue.ref}
              error={errors?.source_path?.message || sourcePathIssue.fieldError}
              required
            />
            <Input
              name="item_field"
              label="Item Field"
              value={mapping.item_field ?? ''}
              onChange={(e) => {
                itemFieldIssue.onChange()
                handleFieldChange('item_field', e.target.value)
              }}
              placeholder="e.g., name"
              hint="Field to extract from each array item"
              ref={itemFieldIssue.ref}
              error={errors?.item_field?.message || itemFieldIssue.fieldError}
              required
            />
            <Input
              name="filter_condition"
              label="Filter Condition"
              value={mapping.filter_condition ?? ''}
              onChange={(e) => {
                filterConditionIssue.onChange()
                handleFieldChange('filter_condition', e.target.value)
              }}
              placeholder='Optional: item.status == "active"'
              hint="Optional: filter items before extracting field"
              ref={filterConditionIssue.ref}
              error={filterConditionIssue.fieldError}
            />
          </>
        )
      }

      default:
        return null
    }
  }

  const hasErrors = (errors && Object.keys(errors).length > 0) || invalid || hasMappingIssues()

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
            handleDelete()
          }}
          aria-label="Delete mapping"
        >
          <DeleteSvg className="w-4 h-4" />
        </Button>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="p-4 flex flex-col gap-3 border-t border-border-specific-panel-outline">
          {(() => {
            const outputFieldIssue = getFieldIssue('output_field')
            return (
              <Input
                name="output_field"
                label="Output Field Name"
                value={mapping.output_field}
                onChange={(e) => {
                  outputFieldIssue.onChange()
                  handleFieldChange('output_field', e.target.value)
                }}
                placeholder="e.g., user_email, status, total_price"
                required
                ref={outputFieldIssue.ref}
                error={errors?.output_field?.message || outputFieldIssue.fieldError}
              />
            )
          })()}

          <Select
            id="mapping_type_select"
            value={mapping.type}
            label="Mapping Type"
            hint={MAPPING_TYPE_DESCRIPTIONS[mapping.type]}
            onChange={(e) => handleFieldChange('type', e.value)}
            options={MAPPING_TYPE_OPTIONS}
            inputRef={getFieldIssue<HTMLSelectElement>('type').ref}
            error={errors?.output_field?.message || getFieldIssue('type').fieldError}
            allowCustom
          />

          {renderTypeSpecificFields()}
        </div>
      )}
    </div>
  )
}

export default MappingRow
