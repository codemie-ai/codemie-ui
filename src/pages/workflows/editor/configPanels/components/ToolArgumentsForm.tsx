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

import { useEffect, useState } from 'react'

import DynamicFieldsForm from '@/components/form/DynamicFieldsForm'
import Spinner from '@/components/Spinner'
import { assistantsStore } from '@/store'
import { DynamicFormFieldSchema } from '@/types/dynamicForm'
import { AssistantToolSchemaResponse } from '@/types/entity/assistant'
import { NodeTypes } from '@/types/workflowEditor'

import { registerFields } from '../../utils/visualEditorFieldRegistry'

registerFields([/^tool_args\./], NodeTypes.TOOL)

interface ToolArgumentsFormProps {
  toolName: string | null
  settingId?: string
  value: Record<string, unknown>
  onChange: (value: Record<string, unknown>) => void
  onSchemaEmpty?: () => void
  onSchemaLoaded?: (requiredFields: string[]) => void
  errors?: Record<string, string>
  issuePathPrefix?: string
}

const ToolArgumentsForm: React.FC<ToolArgumentsFormProps> = ({
  toolName,
  settingId,
  value,
  onChange,
  onSchemaEmpty,
  onSchemaLoaded,
  errors = {},
  issuePathPrefix = 'tool_args',
}) => {
  const [schema, setSchema] = useState<AssistantToolSchemaResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)

  useEffect(() => {
    if (!toolName) {
      setSchema(null)
      setHasFetched(false)
      return
    }

    const fetchSchema = async () => {
      setLoading(true)
      try {
        const schemaResponse = await assistantsStore.getToolSchema(toolName, settingId)
        setSchema(schemaResponse)

        const requiredFields = Object.entries(schemaResponse?.args_schema || {})
          .filter(([_, fieldSchema]) => (fieldSchema as DynamicFormFieldSchema).required)
          .map(([fieldName]) => fieldName)

        onSchemaLoaded?.(requiredFields)
      } catch (err) {
        console.error(`Failed to fetch schema for tool "${toolName}":`, err)
        setSchema(null)
        onSchemaLoaded?.([])
      } finally {
        setLoading(false)
        setHasFetched(true)
      }
    }

    fetchSchema()
  }, [toolName, settingId, onSchemaLoaded])

  useEffect(() => {
    const hasNoFields = !schema?.args_schema || Object.keys(schema.args_schema).length === 0

    if (!loading && hasFetched && hasNoFields) {
      onSchemaEmpty?.()
    }
  }, [schema, loading, hasFetched, onSchemaEmpty])

  if (!toolName) return null

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Spinner inline rootClassName="pt-0" />
      </div>
    )
  }

  const hasNoFields = !schema?.args_schema || Object.keys(schema.args_schema).length === 0
  if (hasNoFields) return null

  return (
    <DynamicFieldsForm
      schema={schema.args_schema}
      value={value}
      onChange={onChange}
      errors={errors}
      issuePathPrefix={issuePathPrefix}
    />
  )
}

export default ToolArgumentsForm
