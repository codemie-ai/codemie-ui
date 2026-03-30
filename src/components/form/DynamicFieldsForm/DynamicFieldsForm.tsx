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

import { type MultiSelect as MultiSelectType } from 'primereact/multiselect'
import { Ref, useContext } from 'react'

import { Checkbox } from '@/components/form/Checkbox'
import ExpandableTextarea from '@/components/form/ExpandableTextarea/ExpandableTextarea'
import Input from '@/components/form/Input'
import MultiSelect from '@/components/form/MultiSelect'
import { WorkflowContext } from '@/pages/workflows/editor/hooks/useWorkflowContext'
import { FIELD_TYPES, FieldType, DynamicFormFieldSchema } from '@/types/dynamicForm'
import { humanize } from '@/utils/helpers'

import { TextareaRef } from '../Textarea'

interface DynamicFieldsFormProps {
  schema: Record<string, DynamicFormFieldSchema>
  value: Record<string, unknown>
  onChange: (value: Record<string, unknown>) => void
  errors?: Record<string, string>
  issuePathPrefix?: string
}

const DynamicFieldsForm: React.FC<DynamicFieldsFormProps> = ({
  schema,
  value,
  onChange,
  errors = {},
  issuePathPrefix = '',
}) => {
  const workflowContext = useContext(WorkflowContext)
  const getIssueField = workflowContext?.getIssueField
  const markIssueDirty = workflowContext?.markIssueDirty

  const handleFieldChange = (fieldName: string, fieldValue: unknown) => {
    if (getIssueField && markIssueDirty) {
      const issuePath = issuePathPrefix ? `${issuePathPrefix}.${fieldName}` : fieldName
      const issueField = getIssueField(issuePath)
      if (issueField.issue) markIssueDirty(issueField.issue)
    }

    onChange({
      ...value,
      [fieldName]: fieldValue,
    })
  }

  const getFieldValue = (fieldName: string, fieldType: FieldType): any => {
    const fieldValue = value[fieldName]

    if (fieldType === FIELD_TYPES.BOOLEAN) {
      return fieldValue === true
    }

    if (fieldType === FIELD_TYPES.INTEGER || fieldType === FIELD_TYPES.FLOAT) {
      return fieldValue ?? ''
    }

    if (fieldType === FIELD_TYPES.LIST) {
      return Array.isArray(fieldValue) ? fieldValue : []
    }

    return fieldValue ?? ''
  }

  const renderField = (fieldName: string, fieldSchema: DynamicFormFieldSchema) => {
    const { type, required, values } = fieldSchema
    const fieldValue = getFieldValue(fieldName, type)
    const label = humanize(fieldName)

    const issuePath = issuePathPrefix ? `${issuePathPrefix}.${fieldName}` : fieldName
    const issueField = getIssueField ? getIssueField(issuePath) : null

    const error = errors[fieldName] || issueField?.fieldError

    switch (type) {
      case FIELD_TYPES.BOOLEAN:
        return (
          <Checkbox
            key={fieldName}
            label={label}
            checked={fieldValue}
            onChange={(checked) => handleFieldChange(fieldName, checked)}
            error={issueField?.fieldError}
            ref={issueField?.ref}
          />
        )

      case FIELD_TYPES.INTEGER:
        return (
          <Input
            key={fieldName}
            label={label}
            type="number"
            value={fieldValue}
            onChange={(e) => {
              const numValue =
                e.target.value === '' ? undefined : Number.parseInt(e.target.value, 10)
              handleFieldChange(fieldName, numValue)
            }}
            placeholder={`Enter ${label}`}
            error={error}
            required={required}
            ref={issueField?.ref}
          />
        )

      case FIELD_TYPES.FLOAT:
        return (
          <Input
            key={fieldName}
            label={label}
            type="number"
            step="0.01"
            value={fieldValue}
            onChange={(e) => {
              const numValue = e.target.value === '' ? undefined : Number.parseFloat(e.target.value)
              handleFieldChange(fieldName, numValue)
            }}
            placeholder={`Enter ${label}`}
            error={error}
            required={required}
            ref={issueField?.ref}
          />
        )

      case FIELD_TYPES.LIST:
        if (values && values.length > 0) {
          const options = values.map((val) => ({
            label: humanize(val),
            value: val,
          }))
          return (
            <MultiSelect
              key={fieldName}
              label={label}
              placeholder={`Select ${label}`}
              value={fieldValue}
              options={options}
              onChange={(e) => handleFieldChange(fieldName, e.value)}
              showCheckbox
              error={error}
              required={required}
              ref={issueField?.ref as Ref<MultiSelectType>}
            />
          )
        }
        return null

      case FIELD_TYPES.TEXT:
        return (
          <ExpandableTextarea
            key={fieldName}
            label={label}
            value={fieldValue}
            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
            placeholder={`Enter ${label}`}
            rows={5}
            error={error}
            required={required}
            ref={issueField?.ref as Ref<TextareaRef>}
          />
        )

      case FIELD_TYPES.STRING:
      default:
        return (
          <Input
            key={fieldName}
            label={label}
            type="text"
            value={fieldValue}
            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
            placeholder={`Enter ${label}`}
            error={error}
            required={required}
            ref={issueField?.ref}
          />
        )
    }
  }

  if (!schema || Object.keys(schema).length === 0) return null

  return (
    <div className="flex flex-col gap-4">
      {Object.entries(schema).map(([fieldName, fieldSchema]) =>
        renderField(fieldName, fieldSchema)
      )}
    </div>
  )
}

export default DynamicFieldsForm
