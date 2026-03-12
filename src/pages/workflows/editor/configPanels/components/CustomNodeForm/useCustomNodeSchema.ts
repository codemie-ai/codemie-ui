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

import { useState, useEffect } from 'react'

import { workflowsStore } from '@/store/workflows'
import {
  CustomNodeSchemaResponse,
  CustomNodeType,
  CustomNodeConfigurationValues,
} from '@/types/workflowEditor/configuration'

import { FIELD_TYPES } from './constants'

const CONFIG_ARGS_MODE = {
  NONE: 'none',
  FORM: 'form',
  YAML: 'yaml',
} as const

type ConfigArgsMode = (typeof CONFIG_ARGS_MODE)[keyof typeof CONFIG_ARGS_MODE]

const isFieldRenderable = (field: { type: string; values?: string[] | null }) => {
  return !(field.type === FIELD_TYPES.LIST && (!field.values || field.values.length === 0))
}

const getRequiredFields = (configSchema: Record<string, any>) => {
  return Object.entries(configSchema)
    .filter(([_, fieldSchema]) => fieldSchema.required && isFieldRenderable(fieldSchema))
    .map(([fieldName]) => fieldName)
}

const convertFieldValue = (fieldValue: string, fieldType: string): unknown => {
  const stringValue = String(fieldValue)

  switch (fieldType) {
    case FIELD_TYPES.BOOLEAN:
      return stringValue === 'true' || stringValue === 'True'

    case FIELD_TYPES.INTEGER:
      return stringValue ? Number.parseInt(stringValue, 10) : undefined

    case FIELD_TYPES.FLOAT:
      return stringValue ? Number.parseFloat(stringValue) : undefined

    case FIELD_TYPES.LIST:
      if (Array.isArray(fieldValue)) {
        return fieldValue
      }
      if (stringValue) {
        try {
          const parsed = JSON.parse(stringValue)
          return Array.isArray(parsed) ? parsed : [stringValue]
        } catch {
          return [stringValue]
        }
      }
      return []

    case FIELD_TYPES.TEXT:
    case FIELD_TYPES.STRING:
    default:
      return stringValue
  }
}

export const convertConfigToTypedValues = (
  config: CustomNodeConfigurationValues,
  schema: CustomNodeSchemaResponse
): Record<string, unknown> => {
  if (!config || !schema?.config_schema) return config

  const typedConfig: Record<string, unknown> = {}

  Object.entries(config).forEach(([fieldName, fieldValue]) => {
    const fieldSchema = schema.config_schema[fieldName]

    if (!fieldSchema) {
      typedConfig[fieldName] = fieldValue
      return
    }

    typedConfig[fieldName] = convertFieldValue(fieldValue, fieldSchema.type)
  })

  return typedConfig
}

export const useCustomNodeSchema = (customNodeId?: CustomNodeType) => {
  const [schema, setSchema] = useState<CustomNodeSchemaResponse | null>(null)
  const [argsMode, setArgsMode] = useState<ConfigArgsMode>(CONFIG_ARGS_MODE.NONE)
  const [schemaLoading, setSchemaLoading] = useState(false)
  const [schemaRequiredFields, setSchemaRequiredFields] = useState<string[]>([])

  useEffect(() => {
    if (!customNodeId) {
      setSchema(null)
      setArgsMode(CONFIG_ARGS_MODE.NONE)
      setSchemaRequiredFields([])
      return
    }

    const fetchSchema = async () => {
      setArgsMode(CONFIG_ARGS_MODE.NONE)
      setSchemaLoading(true)

      try {
        const schemaResponse = await workflowsStore.getCustomNodeSchema(customNodeId)
        setSchema(schemaResponse)

        const hasFields =
          schemaResponse?.config_schema && Object.keys(schemaResponse.config_schema).length > 0
        if (!hasFields) {
          setArgsMode(CONFIG_ARGS_MODE.NONE)
          setSchemaRequiredFields([])
          return
        }

        const hasRenderableFields = Object.values(schemaResponse.config_schema).some(
          isFieldRenderable
        )
        if (hasRenderableFields) {
          const requiredFields = getRequiredFields(schemaResponse.config_schema)
          setArgsMode(CONFIG_ARGS_MODE.FORM)
          setSchemaRequiredFields(requiredFields)
        } else {
          setArgsMode(CONFIG_ARGS_MODE.YAML)
          setSchemaRequiredFields([])
        }
      } catch (error) {
        console.error('Failed to fetch schema:', error)
        setArgsMode(CONFIG_ARGS_MODE.YAML)
        setSchemaRequiredFields([])
      } finally {
        setSchemaLoading(false)
      }
    }

    fetchSchema()
  }, [customNodeId])

  return {
    schema,
    argsMode,
    schemaLoading,
    schemaRequiredFields,
    CONFIG_ARGS_MODE,
  }
}
