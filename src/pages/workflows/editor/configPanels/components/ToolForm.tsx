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

import { yupResolver } from '@hookform/resolvers/yup'
import isEmpty from 'lodash/isEmpty'
import { forwardRef, useImperativeHandle, useEffect, useRef, useState, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useSnapshot } from 'valtio'
import * as Yup from 'yup'

import Input from '@/components/form/Input'
import Switch from '@/components/form/Switch'
import YamlEditor from '@/components/form/YamlEditor/YamlEditor'
import Spinner from '@/components/Spinner'
import { assistantsStore } from '@/store'
import { settingsStore } from '@/store/settings'
import { AssistantToolkit } from '@/types/entity/assistant'
import { MCPServerDetails } from '@/types/entity/mcp'
import { NodeTypes } from '@/types/workflowEditor/base'
import { ToolConfiguration } from '@/types/workflowEditor/configuration'
import { extractToolkitSettings } from '@/utils/toolkit'
import {
  getMCPServersFromConfiguration,
  getToolkitsFromConfiguration,
  normalizeToolkitSettingsForToolForm,
} from '@/utils/workflows'

import FieldController from './FieldController'
import ToolArgumentsForm from './ToolArgumentsForm'
import ToolSelector from './ToolSelector'
import { useWorkflowContext } from '../../hooks/useWorkflowContext'
import { registerFields } from '../../utils/visualEditorFieldRegistry'

registerFields(
  [
    'tool_result_json_pointer',
    'tool',
    'trace',
    'integration_alias',
    'resolve_dynamic_values_in_response',
    /^tool_args\./,
    /^mcp_server\./,
  ],
  NodeTypes.TOOL
)

const TOOL_ARGS_MODE = {
  FORM: 'form',
  YAML: 'yaml',
} as const

type ToolArgsMode = (typeof TOOL_ARGS_MODE)[keyof typeof TOOL_ARGS_MODE]

interface ToolFormProps {
  project: string
  toolConfig: ToolConfiguration
  showNewIntegrationPopup: (project: string, credentialType: string) => void
}

export interface ToolFormValues {
  toolkits: AssistantToolkit[]
  mcpServers: MCPServerDetails[]
  tool_args?: Record<string, unknown>
  trace?: boolean
  tool_result_json_pointer?: string
  resolve_dynamic_values_in_response?: boolean
}

export interface ToolFormRef {
  getValues: () => ToolFormValues
  validate: () => Promise<boolean>
  isDirty: () => boolean
  reset: () => void
}

const getValidationSchema = (requiredFields: string[]) => {
  const toolArgsValidation =
    requiredFields.length > 0
      ? Yup.mixed<Record<string, unknown>>().test(
          'required-fields',
          'Required fields are missing',
          function (value) {
            if (!value) return requiredFields.length === 0

            const argsObj = value as Record<string, unknown>
            const missingFields = requiredFields.filter((fieldName) => {
              const fieldValue = argsObj[fieldName]
              return (
                !fieldValue ||
                (Array.isArray(fieldValue) && fieldValue.length === 0) ||
                fieldValue === ''
              )
            })

            if (missingFields.length > 0) {
              return this.createError({
                message: `Required fields: ${missingFields.join(', ')}`,
                path: 'tool_args',
              })
            }

            return true
          }
        )
      : Yup.mixed<Record<string, unknown>>().optional()

  return Yup.object().shape({
    toolkits: Yup.array().of(Yup.object()).default([]),
    mcpServers: Yup.array().of(Yup.object()).default([]),
    tool_args: toolArgsValidation,
    trace: Yup.boolean().optional(),
    tool_result_json_pointer: Yup.string().optional(),
    resolve_dynamic_values_in_response: Yup.boolean().optional(),
  })
}

const getDefaultValues = (config?: ToolConfiguration): ToolFormValues => {
  return {
    toolkits: [],
    mcpServers: [],
    tool_args: config?.tool_args || {},
    trace: config?.trace || false,
    tool_result_json_pointer: config?.tool_result_json_pointer || '',
    resolve_dynamic_values_in_response: config?.resolve_dynamic_values_in_response || false,
  }
}

const ToolForm = forwardRef<ToolFormRef, ToolFormProps>(
  ({ toolConfig, project, showNewIntegrationPopup }, ref) => {
    const { availableToolkits, getAssistantToolkits } = useSnapshot(assistantsStore)
    const { settings, indexSettings } = useSnapshot(settingsStore)
    const { tempIssues, markIssueDirty, getIssueField, selectedStateId } = useWorkflowContext()
    const [dynamicSchema, setDynamicSchema] = useState(() => getValidationSchema([]))

    const {
      control,
      getValues,
      trigger,
      setValue,
      watch,
      formState: { isDirty },
      reset,
      setError,
      clearErrors,
    } = useForm<ToolFormValues>({
      resolver: yupResolver(dynamicSchema) as any,
      mode: 'onChange',
      defaultValues: getDefaultValues(toolConfig),
    })

    const toolkits = watch('toolkits')
    const mcpServers = watch('mcpServers')
    const toolArgs = watch('tool_args')
    const hasInitialized = useRef(false)
    const yamlHasError = useRef(false)
    const yamlWasEdited = useRef(false)
    const [argsMode, setArgsMode] = useState<ToolArgsMode>(TOOL_ARGS_MODE.YAML)
    const [schemaRequiredFields, setSchemaRequiredFields] = useState<string[]>([])
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

    useImperativeHandle(
      ref,
      () => ({
        getValues,
        validate: async () => {
          const isValid = await trigger()
          const errors: Record<string, string> = {}

          if (schemaRequiredFields.length > 0 && toolArgs) {
            const argsObj = toolArgs as Record<string, unknown>
            schemaRequiredFields.forEach((fieldName) => {
              const fieldValue = argsObj[fieldName]
              const isEmpty =
                !fieldValue ||
                (Array.isArray(fieldValue) && fieldValue.length === 0) ||
                fieldValue === ''

              if (isEmpty) errors[fieldName] = 'Field is required'
            })
          }

          setValidationErrors(errors)

          return isValid && !yamlHasError.current && Object.keys(errors).length === 0
        },
        isDirty: () => isDirty || yamlWasEdited.current,
        reset: () => {
          reset(getValues())
          yamlWasEdited.current = false
        },
      }),
      [getValues, trigger, isDirty, reset, schemaRequiredFields, toolArgs]
    )

    const resolveToolArgsIssues = () => {
      const toolArgsIssues = tempIssues?.filter(
        (issue) =>
          (issue.stateId === selectedStateId || !issue.stateId) &&
          issue.path.startsWith('tool_args.')
      )

      toolArgsIssues?.forEach((issue) => markIssueDirty(issue))
    }

    const handleToolkitsChange = (newToolkits: AssistantToolkit[]) => {
      setValue('toolkits', newToolkits, { shouldValidate: true, shouldDirty: true })
      setValue('tool_args', {}, { shouldValidate: true, shouldDirty: true })
      setArgsMode(TOOL_ARGS_MODE.FORM)
      setSchemaRequiredFields([])
      resolveToolArgsIssues()
    }

    const handleMcpServersChange = (newMcpServers: MCPServerDetails[]) => {
      setValue('mcpServers', newMcpServers, { shouldValidate: true, shouldDirty: true })
      setValue('tool_args', {}, { shouldValidate: true, shouldDirty: true })
      setArgsMode(TOOL_ARGS_MODE.FORM)
      setSchemaRequiredFields([])
      resolveToolArgsIssues()
    }

    const handleToolArgsChange = (value: Record<string, any>) => {
      setValue('tool_args', value, { shouldValidate: true, shouldDirty: true })
      yamlHasError.current = false
      clearErrors('tool_args')
    }

    const handleYamlError = (hasError: boolean) => {
      yamlHasError.current = hasError
      yamlWasEdited.current = true
      if (hasError) {
        setError('tool_args', { type: 'manual', message: 'Invalid YAML' })
      } else {
        clearErrors('tool_args')
      }
    }

    const handleDynamicFormChange = (value: Record<string, unknown>) => {
      setValue('tool_args', value, { shouldValidate: true, shouldDirty: true })
      setValidationErrors({})
    }

    const handleSchemaEmpty = () => {
      setArgsMode(TOOL_ARGS_MODE.YAML)
      setSchemaRequiredFields([])
    }

    const getSelectedToolName = (): string | null => {
      if (mcpServers?.length && mcpServers[0]?.tools?.length) {
        return mcpServers[0].tools?.[0] ?? null
      }
      if (toolkits?.length && toolkits[0]?.tools?.length) {
        return toolkits[0].tools?.[0]?.name ?? null
      }
      return null
    }

    const selectedToolSettingId = useMemo((): string | undefined => {
      let settingId: string | undefined
      if (toolkits?.length) {
        const toolkit = toolkits[0]
        const firstTool = toolkit?.tools?.[0]

        const { id } = extractToolkitSettings(toolkit, firstTool)
        settingId = id
      }
      return settingId
    }, [toolkits])

    useEffect(() => {
      hasInitialized.current = false
      setArgsMode(TOOL_ARGS_MODE.FORM)
      setSchemaRequiredFields([])
    }, [toolConfig?.id])

    useEffect(() => {
      setDynamicSchema(getValidationSchema(schemaRequiredFields))
    }, [schemaRequiredFields])

    useEffect(() => {
      if (!availableToolkits?.length) return
      if (hasInitialized.current) return

      hasInitialized.current = true

      if (toolConfig?.tool) {
        const tools = [
          {
            name: toolConfig.tool,
            integration_alias: toolConfig.integration_alias,
          },
        ]

        const settingsObj = Object.fromEntries(
          Object.entries(settings).map(([key, value]) => [key, value as any])
        )

        const toolkitsFromConfig = getToolkitsFromConfiguration(
          tools,
          availableToolkits as AssistantToolkit[],
          settingsObj
        )

        const normalizedToolkits = normalizeToolkitSettingsForToolForm(toolkitsFromConfig)

        setValue('toolkits', normalizedToolkits, { shouldValidate: true, shouldDirty: false })
      }

      if (toolConfig?.mcp_server) {
        const mcpServers = getMCPServersFromConfiguration([toolConfig.mcp_server], settings as any)

        if (mcpServers.length > 0 && toolConfig.tool) {
          mcpServers[0].tools = [toolConfig.tool]
        }

        setValue('mcpServers', mcpServers, { shouldValidate: true, shouldDirty: false })
      }
    }, [availableToolkits?.length])

    useEffect(() => {
      if (!availableToolkits.length) {
        getAssistantToolkits()
      }
      if (isEmpty(settings)) {
        indexSettings()
      }
    }, [])

    if (!toolConfig || !availableToolkits.length) {
      return <Spinner inline rootClassName="pt-0" />
    }

    const toolField =
      getIssueField('tool') ||
      getIssueField('integration_alias') ||
      getIssueField('mcp_server.description')

    return (
      <div className="flex flex-col gap-4">
        <ToolSelector
          toolkits={toolkits || []}
          project={project}
          mcpServers={mcpServers || []}
          onToolkitsChange={(toolkits) => {
            handleToolkitsChange(toolkits)
            toolField.onChange()
          }}
          onMcpServersChange={(servers) => {
            handleMcpServersChange(servers)
            toolField.onChange()
          }}
          showNewIntegrationPopup={(project, credentialType) => {
            showNewIntegrationPopup(project, credentialType)
            toolField.onChange()
          }}
        />

        {toolField?.fieldError && <p className="text-text-error text-sm">{toolField.fieldError}</p>}

        {getSelectedToolName() && (
          <div className="flex flex-col gap-4">
            <div className="text-sm text-text-primary">Tool Arguments:</div>

            <Controller
              name="tool_args"
              control={control}
              render={({ field }) => (
                <>
                  {argsMode === TOOL_ARGS_MODE.FORM && (
                    <ToolArgumentsForm
                      toolName={getSelectedToolName()}
                      settingId={selectedToolSettingId}
                      value={field.value as Record<string, unknown>}
                      onChange={handleDynamicFormChange}
                      onSchemaEmpty={handleSchemaEmpty}
                      onSchemaLoaded={setSchemaRequiredFields}
                      errors={validationErrors}
                    />
                  )}

                  {argsMode === TOOL_ARGS_MODE.YAML && (
                    <YamlEditor
                      value={field.value as Record<string, any>}
                      onChange={handleToolArgsChange}
                      onValidationChange={handleYamlError}
                      helperText="Enter tool arguments as YAML key-value pairs."
                      placeholder={`some_option: "value"`}
                    />
                  )}
                </>
              )}
            />
          </div>
        )}

        <FieldController
          name="tool_result_json_pointer"
          control={control}
          render={({ field, fieldState }) => (
            <Input
              label="Tool Result JSON Pointer:"
              placeholder="path"
              error={fieldState.error?.message}
              {...field}
            />
          )}
        />

        <FieldController
          name="trace"
          control={control}
          render={({ field, fieldState }) => (
            <Switch
              {...field}
              label="Enable Tracing"
              value={field.value}
              error={fieldState.error?.message}
            />
          )}
        />

        <FieldController
          name="resolve_dynamic_values_in_response"
          control={control}
          render={({ field, fieldState }) => (
            <Switch
              {...field}
              label="Resolve Dynamic Values in Response"
              value={field.value}
              error={fieldState.error?.message}
            />
          )}
        />
      </div>
    )
  }
)

export default ToolForm
