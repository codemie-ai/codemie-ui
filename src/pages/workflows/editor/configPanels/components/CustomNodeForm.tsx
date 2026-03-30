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
import { forwardRef, useImperativeHandle, useEffect, useRef, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import * as Yup from 'yup'

import ExpandableTextarea from '@/components/form/ExpandableTextarea/ExpandableTextarea'
import Input from '@/components/form/Input'
import YamlEditor from '@/components/form/YamlEditor/YamlEditor'
import LLMSelector from '@/pages/assistants/components/AssistantForm/components/LLMSelector'
import { NodeTypes } from '@/types/workflowEditor/base'
import {
  CustomNodeConfiguration,
  CustomNodeConfigurationValues,
  CustomNodeType,
} from '@/types/workflowEditor/configuration'

import CustomNodeArgumentsForm from './CustomNodeForm/CustomNodeArgumentsForm'
import {
  useCustomNodeSchema,
  convertConfigToTypedValues,
} from './CustomNodeForm/useCustomNodeSchema'
import CustomNodeSelector from './CustomNodeSelector'
import FieldController from './FieldController'
import { registerFields } from '../../utils/visualEditorFieldRegistry'

registerFields(['name', 'custom_node_id', 'model', 'system_prompt', /^config\./], NodeTypes.CUSTOM)

interface CustomNodeFormProps {
  project: string
  customNodeConfig: CustomNodeConfiguration
}

export interface CustomNodeFormValues {
  custom_node_id: CustomNodeType
  name?: string
  model?: string
  system_prompt?: string
  config?: CustomNodeConfigurationValues
}

export interface CustomNodeFormRef {
  getValues: () => CustomNodeFormValues
  validate: () => Promise<boolean>
  isDirty: () => boolean
  reset: () => void
}

const getValidationSchema = (requiredFields: string[]) => {
  const configValidation =
    requiredFields.length > 0
      ? Yup.mixed<CustomNodeConfigurationValues>().test(
          'required-fields',
          'Required fields are missing',
          function (value) {
            if (!value) return requiredFields.length === 0

            const configObj = value as Record<string, unknown>
            const missingFields = requiredFields.filter((fieldName) => {
              const fieldValue = configObj[fieldName]
              return (
                !fieldValue ||
                (Array.isArray(fieldValue) && fieldValue.length === 0) ||
                fieldValue === ''
              )
            })

            if (missingFields.length > 0) {
              return this.createError({
                message: `Required fields: ${missingFields.join(', ')}`,
                path: 'config',
              })
            }

            return true
          }
        )
      : Yup.mixed<CustomNodeConfigurationValues>().optional()

  return Yup.object().shape({
    custom_node_id: Yup.string().required('Custom node type is required'),
    name: Yup.string().trim().optional(),
    system_prompt: Yup.string().optional(),
    model: Yup.string().optional(),
    config: configValidation,
  })
}

const getDefaultValues = (config?: CustomNodeConfiguration): Partial<CustomNodeFormValues> => ({
  custom_node_id: config?.custom_node_id,
  name: config?.name || '',
  system_prompt: config?.system_prompt || '',
  model: config?.model || '',
  config: (config?.config as CustomNodeConfigurationValues) || {},
})

const CustomNodeForm = forwardRef<CustomNodeFormRef, CustomNodeFormProps>(
  ({ customNodeConfig }, ref) => {
    const [dynamicSchema, setDynamicSchema] = useState(() => getValidationSchema([]))
    const isInitialLoad = useRef(true)

    const {
      control,
      getValues,
      trigger,
      setValue,
      watch,
      formState: { isDirty },
      reset,
    } = useForm<CustomNodeFormValues>({
      resolver: yupResolver(dynamicSchema) as any,
      mode: 'onChange',
      defaultValues: getDefaultValues(customNodeConfig),
    })

    const customNodeId = watch('custom_node_id')
    const config = watch('config')
    const yamlHasError = useRef(false)
    const yamlWasEdited = useRef(false)
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

    const { schema, argsMode, schemaRequiredFields, CONFIG_ARGS_MODE } =
      useCustomNodeSchema(customNodeId)

    useImperativeHandle(
      ref,
      () => ({
        getValues: () => {
          return getValues()
        },
        validate: async () => {
          const isValid = await trigger()
          const errors: Record<string, string> = {}

          if (schemaRequiredFields.length > 0 && config) {
            const configObj = config as Record<string, unknown>
            schemaRequiredFields.forEach((fieldName) => {
              const fieldValue = configObj[fieldName]
              const isEmpty =
                !fieldValue ||
                (Array.isArray(fieldValue) && fieldValue.length === 0) ||
                fieldValue === ''

              if (isEmpty) errors[fieldName] = 'Field is required'
            })
          }

          setValidationErrors(errors)

          return isValid && !yamlHasError.current
        },
        isDirty: () => isDirty || yamlWasEdited.current,
        reset: () => {
          reset(getValues())
          yamlWasEdited.current = false
        },
      }),
      [getValues, trigger, isDirty, reset, schemaRequiredFields, config]
    )

    useEffect(() => {
      reset(getValues())
    }, [])

    useEffect(() => {
      if (!schema || !isInitialLoad.current) return

      const currentConfig = getValues('config')
      if (currentConfig && Object.keys(currentConfig).length > 0) {
        const typedConfig = convertConfigToTypedValues(currentConfig, schema)
        setValue('config', typedConfig as CustomNodeConfigurationValues, { shouldValidate: false })
        isInitialLoad.current = false
      }
    }, [schema, setValue, getValues])

    useEffect(() => {
      if (!customNodeId) return

      setDynamicSchema(getValidationSchema(schemaRequiredFields))
    }, [schemaRequiredFields])

    useEffect(() => {
      if (!customNodeId || isInitialLoad.current) return

      setValue('config', {}, { shouldValidate: true })
    }, [customNodeId, setValue])

    const handleCustomNodeTypeChange = (updatedConfig: CustomNodeConfiguration) => {
      setValue('custom_node_id', updatedConfig.custom_node_id!, { shouldValidate: true })
    }

    const handleConfigChange = (value: Record<string, any>) => {
      const configValues: CustomNodeConfigurationValues = {}
      for (const key of Object.keys(value)) {
        configValues[key] = String(value[key])
      }
      setValue('config', configValues, { shouldValidate: true })
      yamlWasEdited.current = true
    }

    const handleDynamicFormChange = (value: Record<string, unknown>) => {
      setValue('config', value as CustomNodeConfigurationValues, { shouldValidate: true })
      setValidationErrors({})
    }

    const handleYamlError = (hasError: boolean) => {
      yamlHasError.current = hasError
    }

    return (
      <div className="flex flex-col gap-4">
        <FieldController
          name="name"
          control={control}
          render={({ field, fieldState }) => (
            <Input
              label="Name:"
              placeholder="Custom node name (optional)"
              error={fieldState.error?.message}
              {...field}
            />
          )}
        />

        <FieldController
          name="custom_node_id"
          control={control}
          render={({ field, fieldState }) => (
            <CustomNodeSelector
              error={fieldState.error?.message}
              customNodeConfig={{
                ...customNodeConfig,
                custom_node_id: field.value,
              }}
              onCustomNodeConfigUpdate={(config) => {
                field.markIssueDirty()
                handleCustomNodeTypeChange(config)
              }}
            />
          )}
        />

        {customNodeId && argsMode !== CONFIG_ARGS_MODE.NONE && (
          <div className="flex flex-col gap-4">
            <div className="text-sm text-text-primary">Configuration:</div>

            <Controller
              name="config"
              control={control}
              render={({ field }) => (
                <>
                  {argsMode === CONFIG_ARGS_MODE.FORM && schema && (
                    <CustomNodeArgumentsForm
                      schema={schema}
                      value={field.value as Record<string, unknown>}
                      onChange={handleDynamicFormChange}
                      errors={validationErrors}
                    />
                  )}

                  {argsMode === CONFIG_ARGS_MODE.YAML && (
                    <YamlEditor
                      value={field.value}
                      onChange={handleConfigChange}
                      onValidationChange={handleYamlError}
                      helperText="Enter configuration as YAML key-value pairs."
                      placeholder={`some_option: "value"`}
                    />
                  )}
                </>
              )}
            />
          </div>
        )}

        <FieldController
          name="model"
          control={control}
          render={({ field, fieldState }) => (
            <LLMSelector
              label="LLM model:"
              placeholder="Select model (optional)"
              className="w-full"
              error={fieldState.error?.message}
              {...field}
            />
          )}
        />

        <FieldController
          name="system_prompt"
          control={control}
          render={({ field, fieldState }) => (
            <ExpandableTextarea
              label="System Instructions:"
              placeholder="Enter system instructions (optional)"
              rows={8}
              error={fieldState.error?.message}
              {...field}
            />
          )}
        />
      </div>
    )
  }
)

export default CustomNodeForm
